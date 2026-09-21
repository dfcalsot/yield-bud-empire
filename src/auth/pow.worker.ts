import { hasZeroBits, sha256Words } from './sha256';

/** Proof-of-work search (runs off the main thread so the page stays responsive).
 *  With `step` workers, worker i tries nonces i, i+step, i+2*step… so together they cover every nonce once. */
self.onmessage = (e: MessageEvent<{ salt: string; bits: number; start?: number; step?: number }>) => {
  const { salt, bits, start = 0, step = 1 } = e.data;
  const prefix = new TextEncoder().encode(salt);
  const buf = new Uint8Array(prefix.length + 16);
  buf.set(prefix);
  const out = new Uint32Array(8);
  const expected = 2 ** bits;
  let tick = 0;
  for (let nonce = start; ; nonce += step) {
    let len = prefix.length;
    let n = nonce;
    if (n === 0) buf[len++] = 48;
    else { const s0 = len; while (n > 0) { buf[len++] = 48 + (n % 10); n = Math.floor(n / 10); } buf.subarray(s0, len).reverse(); }
    sha256Words(buf, len, out);
    if (hasZeroBits(out, bits)) { (self as unknown as Worker).postMessage({ nonce }); return; }
    if ((++tick & 0x1ffff) === 0) (self as unknown as Worker).postMessage({ progress: Math.min(0.97, nonce / expected) });
  }
};
