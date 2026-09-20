import crypto from 'node:crypto';
import { sha256Words, hasZeroBits } from '../src/auth/sha256.ts';
let bad = 0;
for (let i = 0; i < 3000; i++) {
  const s = crypto.randomBytes(1 + (i % 40)).toString('base64url') + String(i * 7919);
  const b = Buffer.from(s.slice(0, 54));
  const out = new Uint32Array(8); sha256Words(new Uint8Array(b), b.length, out);
  const ref = crypto.createHash('sha256').update(b).digest();
  const mine = Buffer.alloc(32); out.forEach((w, k) => mine.writeUInt32BE(w >>> 0, k * 4));
  if (!mine.equals(ref)) bad++;
  let z = 0; for (const x of ref) { if (x === 0) { z += 8; continue; } z += Math.clz32(x) - 24; break; }
  for (const bits of [1, 5, 8, 17, 20, 26, 33]) if (hasZeroBits(out, bits) !== (z >= bits)) bad++;
}
console.log(bad ? `FAIL ${bad}` : 'sha256 + zero-bits OK (3000 random messages vs node:crypto)');
process.exit(bad ? 1 : 0);
