// Regression test for the browser bug: when Buffer polyfill doesn't support
// "base64url" encoding (e.g. buffer@5.x), @chainsafe/enr's decodeTxt throws
// "Unknown encoding: base64url". Our decoder must bypass that path.
//
// We monkey-patch Buffer.from / Buffer.prototype.toString to throw if anyone
// tries to use base64url, then run decodeENR. If it works, the decoder is
// independent of Buffer's base64url support.

const origFrom = Buffer.from.bind(Buffer) as typeof Buffer.from;
const origProtoToString = Buffer.prototype.toString;

(Buffer as unknown as { from: unknown }).from = function patched(
  ...args: Parameters<typeof Buffer.from>
) {
  if (args[1] === "base64url") {
    throw new TypeError("Unknown encoding: base64url");
  }
  return origFrom(...(args as [never]));
};

Buffer.prototype.toString = function patched(
  this: Buffer,
  encoding?: BufferEncoding,
  ...rest: number[]
) {
  if (encoding === "base64url") {
    throw new TypeError("Unknown encoding: base64url");
  }
  return origProtoToString.call(this, encoding, ...rest);
} as typeof Buffer.prototype.toString;

// Now load the decoder and run it
const { decodeENR, SAMPLES } = await import("./src/decoder");

const userENR =
  "enr:-JW4QGnQNoq9yzxMTz-M6EZY9nMjkxm7jo9qzE0reB4GaZPyQ5AMuMr6BkNBcYTi03sWbR_tUjF0ZCBvTX1RoCCm1IyGAZ3_jCCVgmlkgnY0h29wc3RhY2uDj04AiXNlY3AyNTZrMaECEx4dsvLw3rQ_0kpZi58fNSARne4jU75lz_Me9MTPA4iDdGNwgiQGg3VkcIKRlw";

let failed = 0;
function ok(cond: unknown, msg: string) {
  console.log((cond ? "  ok:" : "  FAIL:") + " " + msg);
  if (!cond) failed++;
}

console.log("--- Buffer base64url is trapped ---");
try {
  Buffer.from("AA", "base64url");
  ok(false, "trap should fire");
} catch (e) {
  ok(
    e instanceof TypeError && /base64url/.test(e.message),
    "trap fires on Buffer.from(.., 'base64url')",
  );
}

console.log("\n--- decodeENR(SAMPLES.enr) under trap ---");
try {
  const r = decodeENR(SAMPLES.enr);
  ok(r.details.ip === "18.223.219.100", "sample enr decodes ip");
  ok(r.details.tcp === 9000, "sample enr decodes tcp");
  ok(!!r.enode && !!r.multiaddr, "sample enr produces enode + multiaddr");
} catch (e) {
  ok(false, "sample enr threw: " + (e instanceof Error ? e.message : String(e)));
}

console.log("\n--- decodeENR(user ENR, addressless) under trap ---");
try {
  const r = decodeENR(userENR);
  ok(r.details.tcp === 9222, "user enr tcp parsed");
  ok(r.details.udp === 37271, "user enr udp parsed");
  ok(!!r.notes.enode, "user enr has explanatory note");
} catch (e) {
  ok(false, "user enr threw: " + (e instanceof Error ? e.message : String(e)));
}

console.log(`\n${failed === 0 ? "ALL PASSED" : `${failed} FAILED`}`);
process.exit(failed === 0 ? 0 : 1);
