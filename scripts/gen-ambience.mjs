// The game's ambience loops, synthesized from scratch (no samples, no third-party licences): the outdoor plots, the indoor grow room,
// the lab and the shop. Each renders LOOP seconds plus a tail cross-faded into the start, so the file loops without a seam, and
// keeps its energy in the mid range, where laptop and phone speakers can play it.
//   node scripts/gen-ambience.mjs <outdoor|indoor|lab|shop> out.wav      (then: ffmpeg loudnorm → mp3, see scripts/build-audio.sh)
import fs from 'node:fs';

const SR = 44100, LOOP = 75, TAIL = 4;
const N = (LOOP + TAIL) * SR;
const L = new Float32Array(N), R = new Float32Array(N);
const kind = process.argv[2] ?? 'outdoor';

let seed = { outdoor: 1234567, indoor: 7654321, lab: 2468013, shop: 1357911 }[kind] ?? 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const rr = (a, b) => a + rnd() * (b - a);
const put = (i, s, pan) => { if (i >= 0 && i < N) { L[i] += s * (1 - pan); R[i] += s * pan; } };

/** band-limited noise bed: `lo`/`hi` one-pole coefficients, level following `lfo(t)` */
function noiseBed({ lo = 0.02, hi = 0.25, level = 0.3, lfo = () => 1, width = 0.15 }) {
  let hpL = 0, pL = 0, lpL = 0, lp2L = 0, hpR = 0, pR = 0, lpR = 0, lp2R = 0;
  for (let i = 0; i < N; i++) {
    const g = lfo(i / SR) * level;
    const a = rnd() * 2 - 1, b = a * (1 - width) + (rnd() * 2 - 1) * width;
    hpL = (1 - lo) * (hpL + a - pL); pL = a; lpL += hi * (hpL - lpL); lp2L += hi * (lpL - lp2L);   // two poles: a soft whoosh, not a hiss
    hpR = (1 - lo) * (hpR + b - pR); pR = b; lpR += hi * (hpR - lpR); lp2R += hi * (lpR - lp2R);
    L[i] += lp2L * g; R[i] += lp2R * g;
  }
}
/** a steady tone with a few harmonics (a hum, a buzz) */
function hum(freq, amp, harmonics = [1, 0.5, 0.25], pan = 0.5, wobble = 0) {
  for (let i = 0; i < N; i++) {
    const t = i / SR, w = 1 + wobble * Math.sin(2 * Math.PI * 0.13 * t);
    let s = 0; harmonics.forEach((h, k) => { s += h * Math.sin(2 * Math.PI * freq * (k + 1) * t); });
    put(i, s * amp * w, pan);
  }
}
/** a short percussive grain: `tone` Hz (or noise when 0), exponential decay */
function blip(at, { tone = 0, decay = 30, amp = 0.05, len = 0.25, pan = 0.5, sweep = 0 }) {
  const start = Math.floor(at * SR), n = Math.floor(len * SR);
  let ph = 0, lp = 0;
  for (let j = 0; j < n; j++) {
    const tt = j / SR, env = Math.exp(-tt * decay) * Math.min(1, tt * 400);
    let s;
    if (tone) { ph += 2 * Math.PI * (tone + sweep * tt) / SR; s = Math.sin(ph); }
    else { lp += 0.35 * ((rnd() * 2 - 1) - lp); s = lp; }
    put(start + j, s * env * amp, pan);
  }
}
/** a bell / glass ring: inharmonic partials, long decay */
function ring(at, f, amp, pan, decay = 1.8) {
  const start = Math.floor(at * SR), n = Math.floor(3 * SR);
  for (let j = 0; j < n; j++) {
    const tt = j / SR, env = Math.exp(-tt * decay);
    put(start + j, (Math.sin(2 * Math.PI * f * tt) + 0.45 * Math.sin(2 * Math.PI * f * 2.76 * tt) * Math.exp(-tt * 3) + 0.2 * Math.sin(2 * Math.PI * f * 5.4 * tt) * Math.exp(-tt * 6)) * env * amp, pan);
  }
}

if (kind === 'outdoor') {
  noiseBed({ lo: 0.02, hi: 0.16, level: 1.1, lfo: (t) => 0.55 + 0.3 * Math.sin(2 * Math.PI * t / 13.7) + 0.15 * Math.sin(2 * Math.PI * t / 5.3 + 1.1) });      // wind
  for (let t = 0; t < LOOP + TAIL; t += rr(0.05, 0.35)) { const g = 0.55 + 0.3 * Math.sin(2 * Math.PI * t / 13.7); if (rnd() < g) blip(t, { amp: rr(0.03, 0.07) * g, decay: rr(6, 14), len: rr(0.25, 0.9), pan: rr(0.2, 0.8) }); }  // leaves
  const SP = [[3200, 4400, 0.09, 0.07, 3, 6], [2400, 1900, 0.22, 0.12, 2, 3], [2800, 3600, 0.05, 0.04, 6, 10]];
  for (let t = rr(0.5, 2); t < LOOP + TAIL - 2; t += rr(2.2, 6.5)) {      // birds
    const [f0, f1, d, gap, c0, c1] = SP[Math.floor(rnd() * SP.length)], pan = rr(0.1, 0.9), amp = rr(0.06, 0.12), sh = rr(0.9, 1.12);
    let at = t; for (let c = 0; c < Math.floor(rr(c0, c1 + 1)); c++) { blip(at, { tone: f0 * sh, sweep: (f1 - f0) * sh / d, decay: 8, len: d, amp, pan }); at += d + gap * rr(0.8, 1.3); }
  }
  for (const [f, rate, pan, amp] of [[4600, 29, 0.25, 0.012], [4950, 33, 0.78, 0.01]]) for (let i = 0; i < N; i++) { const t = i / SR; if (Math.sin(2 * Math.PI * t / 7 + f) > -0.3) put(i, Math.sin(2 * Math.PI * f * t) * Math.max(0, Math.sin(2 * Math.PI * rate * t)) ** 6 * amp, pan); }  // crickets
  for (let t = rr(6, 10); t < LOOP; t += rr(15, 25)) for (let k = 0; k < 3; k++) ring(t + k * rr(0.15, 0.5), [1046.5, 1318.5, 1568, 1760, 2093][Math.floor(rnd() * 5)], 0.03, rr(0.3, 0.7), 1.6);  // wind chime
}

if (kind === 'indoor') {
  noiseBed({ lo: 0.03, hi: 0.1, level: 0.5, lfo: (t) => 0.9 + 0.1 * Math.sin(2 * Math.PI * t / 9.1) });                                       // inline fan whoosh
  hum(120, 0.05, [0.35, 1, 0.5, 0.3, 0.15], 0.5, 0.05);                                                                                          // LED driver buzz (120 Hz and harmonics)
  hum(310, 0.012, [1, 0.3], 0.4, 0.2);                                                                                                            // fan motor
  noiseBed({ lo: 0.25, hi: 0.5, level: 0.04, lfo: (t) => 0.6 + 0.4 * Math.sin(2 * Math.PI * t / 4.7) ** 2 });                                  // water trickling in the lines
  for (let t = rr(1, 3); t < LOOP + TAIL; t += rr(1.2, 4.5)) blip(t, { tone: rr(900, 1500), sweep: rr(900, 2000), decay: 40, len: 0.12, amp: rr(0.04, 0.08), pan: rr(0.3, 0.7) });   // drips
  for (let t = rr(10, 20); t < LOOP; t += rr(18, 30)) blip(t, { amp: 0.06, decay: 5, len: 0.8, pan: rr(0.35, 0.65) });                       // a pump cycling
}

if (kind === 'lab') {
  hum(60, 0.03, [0.2, 1, 0.6, 0.4], 0.5, 0.02);                                                                                                   // fume hood / fridge
  noiseBed({ lo: 0.05, hi: 0.09, level: 0.22, lfo: () => 1 });                                                                                      // ventilation
  for (let t = 0; t < LOOP + TAIL; t += rr(0.04, 0.25)) blip(t, { tone: rr(500, 1400), sweep: rr(1500, 4000), decay: rr(35, 70), len: 0.09, amp: rr(0.02, 0.05), pan: rr(0.2, 0.55) });   // bubbling flask
  for (let t = rr(3, 6); t < LOOP; t += rr(6, 12)) { const f = [1760, 2093, 2349][Math.floor(rnd() * 3)]; blip(t, { tone: f, decay: 18, len: 0.14, amp: 0.035, pan: 0.75 }); if (rnd() < 0.5) blip(t + 0.18, { tone: f * 1.26, decay: 18, len: 0.14, amp: 0.03, pan: 0.75 }); }  // instrument beeps
  for (let t = rr(12, 20); t < LOOP; t += rr(20, 30)) for (let i = 0; i < 4 * SR; i++) { const tt = i / SR, e = Math.sin(Math.PI * tt / 4); put(Math.floor(t * SR) + i, Math.sin(2 * Math.PI * (380 + 60 * tt) * tt) * e * 0.02, 0.3); }   // a centrifuge spinning
  for (let t = rr(8, 14); t < LOOP; t += rr(14, 24)) ring(t, rr(2600, 3400), 0.018, rr(0.4, 0.8), 4);                                           // glass clink
}

if (kind === 'shop') {
  noiseBed({ lo: 0.04, hi: 0.07, level: 0.4, lfo: (t) => 0.7 + 0.3 * Math.sin(2 * Math.PI * t / 6.3) * Math.sin(2 * Math.PI * t / 2.9) });  // room tone / far murmur
  // muffled voices: formant-ish blips in the speech range, in short phrases
  for (let t = rr(0.5, 2); t < LOOP + TAIL - 3; t += rr(2.5, 6)) { const pan = rr(0.2, 0.8), base = rr(160, 240); let at = t; for (let s = 0; s < Math.floor(rr(4, 10)); s++) { blip(at, { tone: base * rr(0.9, 1.3), sweep: rr(-80, 80), decay: 9, len: rr(0.12, 0.25), amp: rr(0.025, 0.045), pan }); at += rr(0.12, 0.3); } }
  for (let t = rr(4, 8); t < LOOP; t += rr(7, 14)) { ring(t, rr(2200, 2900), 0.02, rr(0.3, 0.7), 5); if (rnd() < 0.6) ring(t + 0.09, rr(2500, 3100), 0.015, rr(0.3, 0.7), 6); }   // glass jars clinking
  for (let t = rr(18, 25); t < LOOP; t += rr(28, 40)) { ring(t, 1318.5, 0.04, 0.2, 1.2); ring(t + 0.12, 1760, 0.035, 0.2, 1.2); }             // door bell
  for (let t = rr(12, 20); t < LOOP; t += rr(22, 35)) { blip(t, { tone: 1900, decay: 25, len: 0.18, amp: 0.03, pan: 0.8 }); blip(t + 0.2, { amp: 0.05, decay: 12, len: 0.3, pan: 0.8 }); }  // register + drawer
}

// a little air: two cross-fed delays
for (const [d, g] of [[0.047, 0.28], [0.083, 0.22]]) { const D = Math.floor(d * SR); for (let i = D; i < N; i++) { L[i] += R[i - D] * g * 0.5; R[i] += L[i - D] * g * 0.5; } }
// seamless loop
const out = LOOP * SR, T = TAIL * SR;
for (let j = 0; j < T; j++) { const a = j / T; L[j] = L[j] * a + L[out + j] * (1 - a); R[j] = R[j] * a + R[out + j] * (1 - a); }
let peak = 0; for (let i = 0; i < out; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const gain = 0.89 / peak, buf = Buffer.alloc(44 + out * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + out * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(out * 4, 40);
for (let i = 0; i < out; i++) { buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * gain * 32767))), 44 + i * 4); buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * gain * 32767))), 46 + i * 4); }
fs.writeFileSync(process.argv[3] ?? `${kind}.wav`, buf);
console.log(`${kind}: ${LOOP} s`);
