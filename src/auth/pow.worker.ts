import { hasZeroBits, sha256Words } from './sha256';

/** Proof-of-work search (runs off the main thread so the page stays responsive). */
self.onmessage = (e: MessageEvent<{ salt: string; bits: number }>) => {
  const { salt, bits } = e.data;
  const prefix = new TextEncoder().encode(salt);
  const buf = new Uint8Array(prefix.length + 12);
  buf.set(prefix);
  const out = new Uint32Array(8);
  const expected = 2 ** bits;
  for (let nonce = 0; ; nonce++) {
    let len = prefix.length;
    let n = nonce;
    if (n === 0) buf[len++] = 48;
    else { const start = len; while (n > 0) { buf[len++] = 48 + (n % 10); n = (n / 10) | 0; } buf.subarray(start, len).reverse(); }
    sha256Words(buf, len, out);
    if (hasZeroBits(out, bits)) { (self as unknown as Worker).postMessage({ nonce }); return; }
    if ((nonce & 0x3ffff) === 0x3ffff) (self as unknown as Worker).postMessage({ progress: Math.min(0.97, nonce / expected) });
  }
};
