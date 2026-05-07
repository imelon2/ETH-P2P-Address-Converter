import { ENR } from "@chainsafe/enr";
import { multiaddr, type Multiaddr } from "@multiformats/multiaddr";
import { secp256k1 } from "@noble/curves/secp256k1";
import { keccak_256 } from "@noble/hashes/sha3";
import bs58 from "bs58";

export type InputFormat = "enr" | "enode" | "multiaddr" | "unknown" | "empty";

export interface DecodedNode {
  enr: string;
  enode: string;
  multiaddr: string;
  notes: {
    enr?: string;
    enode?: string;
    multiaddr?: string;
  };
  details: {
    ip?: string;
    tcp?: number;
    udp?: number;
    publicKey?: string;
    nodeId?: string;
    peerId?: string;
    enrItems?: Record<string, string>;
  };
}

export function detectFormat(raw: string): InputFormat {
  const s = raw.trim();
  if (!s) return "empty";
  if (s.startsWith("enr:")) return "enr";
  if (s.startsWith("enode://")) return "enode";
  if (s.startsWith("/")) return "multiaddr";
  return "unknown";
}

const HEX_CHARS = "0123456789abcdef";
function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    out += HEX_CHARS[b >> 4] + HEX_CHARS[b & 0x0f];
  }
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error("invalid hex length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function decompressPubKey(compressed: Uint8Array): Uint8Array {
  // Returns 64 raw bytes (no 0x04 prefix), as expected by enode://
  const point = secp256k1.ProjectivePoint.fromHex(compressed);
  const uncompressed = point.toRawBytes(false); // 65 bytes with 0x04
  return uncompressed.slice(1);
}

function compressPubKey(uncompressed64OrRaw: Uint8Array): Uint8Array {
  // Accept 64-byte raw (no prefix) or 65-byte (with 0x04 prefix)
  let buf = uncompressed64OrRaw;
  if (buf.length === 64) {
    const prefixed = new Uint8Array(65);
    prefixed[0] = 0x04;
    prefixed.set(buf, 1);
    buf = prefixed;
  }
  const point = secp256k1.ProjectivePoint.fromHex(buf);
  return point.toRawBytes(true);
}

// Libp2p PeerId from secp256k1 compressed pubkey.
// Wraps in PublicKey protobuf, then identity-multihash + base58btc encode
// (secp256k1 keys are short enough to use identity multihash per libp2p spec).
function pubkeyToPeerId(compressed: Uint8Array): string {
  if (compressed.length !== 33) throw new Error("expected 33-byte compressed pubkey");
  const proto = new Uint8Array(4 + compressed.length);
  proto[0] = 0x08;
  proto[1] = 0x02;
  proto[2] = 0x12;
  proto[3] = compressed.length;
  proto.set(compressed, 4);
  const mh = new Uint8Array(2 + proto.length);
  mh[0] = 0x00;
  mh[1] = proto.length;
  mh.set(proto, 2);
  return bs58.encode(mh);
}

// Ethereum ENR node ID = keccak256 of uncompressed pubkey (no 0x04 prefix).
function ethNodeId(compressed: Uint8Array): Uint8Array {
  return keccak_256(decompressPubKey(compressed));
}

function blank(): DecodedNode {
  return { enr: "", enode: "", multiaddr: "", notes: {}, details: {} };
}

// base64url decode without Buffer — some browser Buffer polyfills don't
// support the "base64url" encoding name, which is what @chainsafe/enr's
// decodeTxt internally relies on. Doing it ourselves with atob avoids that.
function base64UrlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function decodeENR(input: string): DecodedNode {
  const trimmed = input.trim();
  if (!trimmed.startsWith("enr:")) throw new Error('missing "enr:" prefix');
  const enr = ENR.decode(base64UrlToBytes(trimmed.slice(4)));
  const compressed = enr.publicKey;
  const ip = enr.ip;
  const tcp = enr.tcp;
  const udp = enr.udp;

  const out = blank();
  out.enr = trimmed;

  const peerId = pubkeyToPeerId(compressed);
  const nodeIdBytes = ethNodeId(compressed);

  out.details.publicKey = "0x" + bytesToHex(compressed);
  out.details.nodeId = "0x" + bytesToHex(nodeIdBytes);
  out.details.peerId = peerId;
  if (ip) out.details.ip = ip;
  if (tcp != null) out.details.tcp = tcp;
  if (udp != null) out.details.udp = udp;

  if (ip && tcp != null) {
    const enodePub = bytesToHex(decompressPubKey(compressed));
    out.enode = `enode://${enodePub}@${ip}:${tcp}`;
    out.multiaddr = `/ip4/${ip}/tcp/${tcp}/p2p/${peerId}`;
  } else if (!ip) {
    const reason =
      "ENR has no ip / ip6 field — addressless ENR (e.g. opstack metadata). " +
      "Cannot construct a self-contained URI without an IP.";
    out.notes.enode = reason;
    out.notes.multiaddr = reason;
  } else {
    // ip present but tcp missing
    out.notes.enode = "ENR has no tcp port — enode URIs require a TCP port.";
    out.notes.multiaddr = "ENR has no tcp port — cannot build /tcp/ multiaddr segment.";
  }

  // Capture all ENR k/v pairs as strings for inspection.
  const items: Record<string, string> = {};
  for (const [k, v] of enr.kvs.entries()) {
    items[k] = "0x" + bytesToHex(v);
  }
  out.details.enrItems = items;

  return out;
}

export function decodeEnode(input: string): DecodedNode {
  const trimmed = input.trim();
  // enode://<128-hex>@<host>:<port>
  const m = /^enode:\/\/([0-9a-fA-F]{128})@([^:?#/\s]+):(\d+)/.exec(trimmed);
  if (!m) throw new Error("invalid enode URI format");
  const pubkeyHex = m[1].toLowerCase();
  const ip = m[2];
  const port = parseInt(m[3], 10);
  if (Number.isNaN(port) || port < 0 || port > 65535) {
    throw new Error("invalid port");
  }

  const uncompressed = hexToBytes(pubkeyHex);
  const compressed = compressPubKey(uncompressed);
  const peerId = pubkeyToPeerId(compressed);
  const nodeIdBytes = ethNodeId(compressed);

  const out = blank();
  out.enode = `enode://${pubkeyHex}@${ip}:${port}`;
  out.multiaddr = `/ip4/${ip}/tcp/${port}/p2p/${peerId}`;
  out.notes.enr =
    "Cannot reconstruct ENR from enode — ENRs require a private-key signature.";
  out.details = {
    ip,
    tcp: port,
    publicKey: "0x" + bytesToHex(compressed),
    nodeId: "0x" + bytesToHex(nodeIdBytes),
    peerId,
  };
  return out;
}

export function decodeMultiaddr(input: string): DecodedNode {
  const trimmed = input.trim();
  const ma: Multiaddr = multiaddr(trimmed);
  const tuples = ma.stringTuples();

  let ip: string | undefined;
  let tcp: number | undefined;
  let udp: number | undefined;
  let peerId: string | undefined;

  for (const [code, value] of tuples) {
    // 4 = ip4, 41 = ip6, 6 = tcp, 273 = udp, 421 = p2p
    if ((code === 4 || code === 41) && value) ip = value;
    else if (code === 6 && value) tcp = parseInt(value, 10);
    else if (code === 273 && value) udp = parseInt(value, 10);
    else if (code === 421 && value) peerId = value;
  }

  const out = blank();
  out.multiaddr = ma.toString();
  out.notes.enr =
    "Cannot reconstruct ENR from multiaddr — ENRs require a private-key signature.";
  out.notes.enode =
    "Cannot reconstruct enode — multiaddr peer ID hides the raw secp256k1 public key.";
  out.details = { ip, tcp, udp, peerId };
  return out;
}

export function decode(input: string): { format: InputFormat; result: DecodedNode } {
  const format = detectFormat(input);
  switch (format) {
    case "enr":
      return { format, result: decodeENR(input) };
    case "enode":
      return { format, result: decodeEnode(input) };
    case "multiaddr":
      return { format, result: decodeMultiaddr(input) };
    case "empty":
    case "unknown":
    default:
      return { format, result: blank() };
  }
}

// Real ENR / enode samples from public Ethereum bootnodes. Multiaddr is the
// IPFS bootstrap node — useful as a libp2p multiaddr example with Qm-style
// peer ID.
export const SAMPLES: Record<Exclude<InputFormat, "empty" | "unknown">, string> = {
  enr: "enr:-Iu4QHLwUUEeJ3VBewZblkTG8Q_o2hXB_8nrQhZ2uEKz28C7W8upUUSMABPPg7t8j71lZ3W7uO6s7fubc_rlZUaTgEcEgmlkgnY0gmlwhBLf22SJc2VjcDI1NmsxoQKEv3ViJiu9aUAIV0jzvmr6Uq4xcVUYHs4xtmNRzP-ksIN0Y3CCIyiDdWRwgiMo",
  enode:
    "enode://d860a01f9722d78051619d1e2351aba3f43f943f6f00718d1b9baa4101932a1f5011f16bb2b1bb35db20d6fe28fa0bf09636d26a87d31de9ec6203eeedb1f666@18.138.108.67:30303",
  multiaddr:
    "/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ",
};
