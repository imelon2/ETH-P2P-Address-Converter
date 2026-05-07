import {
  decodeENR,
  decodeEnode,
  decodeMultiaddr,
  detectFormat,
  SAMPLES,
} from "./src/decoder";

let failed = 0;
function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("  FAIL:", msg);
    failed++;
  } else {
    console.log("  ok:", msg);
  }
}

console.log("--- format detection ---");
assert(detectFormat(SAMPLES.enr) === "enr", "enr sample → enr");
assert(detectFormat(SAMPLES.enode) === "enode", "enode sample → enode");
assert(detectFormat(SAMPLES.multiaddr) === "multiaddr", "multiaddr sample → multiaddr");
assert(detectFormat("") === "empty", "empty → empty");
assert(detectFormat("garbage") === "unknown", "garbage → unknown");

console.log("\n--- ENR decode ---");
const enrR = decodeENR(SAMPLES.enr);
console.log("  enode    :", enrR.enode);
console.log("  multiaddr:", enrR.multiaddr);
console.log("  ip       :", enrR.details.ip);
console.log("  tcp      :", enrR.details.tcp);
console.log("  udp      :", enrR.details.udp);
console.log("  pubkey   :", enrR.details.publicKey);
console.log("  peerId   :", enrR.details.peerId);
console.log("  nodeId   :", enrR.details.nodeId);
// Lighthouse mainnet bootnode ENR: 18.223.219.100 / tcp 9000 / udp 9000
assert(enrR.details.ip === "18.223.219.100", "enr ip");
assert(enrR.details.tcp === 9000, "enr tcp");
assert(enrR.details.udp === 9000, "enr udp");
assert(enrR.enode.startsWith("enode://") && enrR.enode.includes("@18.223.219.100:9000"), "enr → enode shape");
assert(enrR.multiaddr.startsWith("/ip4/18.223.219.100/tcp/9000/p2p/"), "enr → multiaddr shape");
assert(enrR.details.publicKey?.length === 2 + 33 * 2, "enr pubkey 33 bytes hex");

console.log("\n--- Enode decode ---");
const enR = decodeEnode(SAMPLES.enode);
console.log("  multiaddr:", enR.multiaddr);
console.log("  ip       :", enR.details.ip);
console.log("  tcp      :", enR.details.tcp);
console.log("  peerId   :", enR.details.peerId);
console.log("  pubkey   :", enR.details.publicKey);
assert(enR.details.ip === "18.138.108.67", "enode ip");
assert(enR.details.tcp === 30303, "enode port");
assert(enR.multiaddr.startsWith("/ip4/18.138.108.67/tcp/30303/p2p/"), "enode → multiaddr shape");

console.log("\n--- MultiAddr decode ---");
const mR = decodeMultiaddr(SAMPLES.multiaddr);
console.log("  ip       :", mR.details.ip);
console.log("  tcp      :", mR.details.tcp);
console.log("  peerId   :", mR.details.peerId);
assert(mR.details.ip === "104.131.131.82", "ma ip");
assert(mR.details.tcp === 4001, "ma tcp");
assert(mR.details.peerId === "QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ", "ma peerId");

console.log("\n--- error path ---");
try {
  decodeEnode("enode://bogus@host:80");
  assert(false, "should reject short pubkey");
} catch (e) {
  assert(e instanceof Error, "enode rejects bogus input");
}

console.log("\n--- addressless ENR (no ip; opstack metadata) ---");
const addrlessENR =
  "enr:-JW4QGnQNoq9yzxMTz-M6EZY9nMjkxm7jo9qzE0reB4GaZPyQ5AMuMr6BkNBcYTi03sWbR_tUjF0ZCBvTX1RoCCm1IyGAZ3_jCCVgmlkgnY0h29wc3RhY2uDj04AiXNlY3AyNTZrMaECEx4dsvLw3rQ_0kpZi58fNSARne4jU75lz_Me9MTPA4iDdGNwgiQGg3VkcIKRlw";
const addr = decodeENR(addrlessENR);
console.log("  enode    :", JSON.stringify(addr.enode));
console.log("  multiaddr:", JSON.stringify(addr.multiaddr));
console.log("  note.enode:", addr.notes.enode);
assert(addr.enode === "", "addressless: enode empty");
assert(addr.multiaddr === "", "addressless: multiaddr empty");
assert(
  typeof addr.notes.enode === "string" && addr.notes.enode.includes("ip"),
  "addressless: enode note explains missing ip",
);
assert(
  typeof addr.notes.multiaddr === "string" && addr.notes.multiaddr.includes("ip"),
  "addressless: multiaddr note explains missing ip",
);
assert(addr.details.tcp === 9222, "addressless: tcp still parsed");
assert(addr.details.udp === 37271, "addressless: udp still parsed");
assert(addr.details.peerId?.startsWith("16Uiu2HAk"), "addressless: peerId derived");

console.log("\n--- enode → notes.enr explains why ENR is empty ---");
const enRich = decodeEnode(SAMPLES.enode);
assert(
  typeof enRich.notes.enr === "string" && enRich.notes.enr.includes("signature"),
  "enode result explains missing ENR",
);

console.log("\n--- multiaddr → notes for both enr and enode ---");
const maRich = decodeMultiaddr(SAMPLES.multiaddr);
assert(typeof maRich.notes.enr === "string", "ma result explains missing ENR");
assert(typeof maRich.notes.enode === "string", "ma result explains missing enode");

console.log(`\n${failed === 0 ? "ALL PASSED" : `${failed} FAILED`}`);
process.exit(failed === 0 ? 0 : 1);
