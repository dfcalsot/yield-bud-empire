// Security primitives for the Yield Bud Empire account service. No third-party dependencies: Node's crypto, sqlite and http only.
import crypto from 'node:crypto';
import dns from 'node:dns/promises';

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const rand = (n = 32) => crypto.randomBytes(n).toString('base64url');
export const hashToken = sha256;
export const safeEqual = (a, b) => {
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};

/* ───────────────────────────── identity normalisation (anti duplicates) ───────────────────────────── */

const DISPOSABLE = new Set(`mailinator.com guerrillamail.com guerrillamail.net guerrillamail.org 10minutemail.com 10minutemail.net tempmail.com temp-mail.org temp-mail.io yopmail.com yopmail.fr
trashmail.com trashmail.net getnada.com sharklasers.com maildrop.cc dispostable.com fakeinbox.com throwawaymail.com mintemail.com emailondeck.com mohmal.com tempr.email discard.email
mailnesia.com mailcatch.com spamgourmet.com burnermail.io moakt.com tmpmail.org tempinbox.com grr.la guerrillamailblock.com spam4.me tempail.com inboxkitten.com mail.tm mailpoof.com
fakemailgenerator.com emkei.cz nada.email tmail.ws e4ward.com getairmail.com harakirimail.com jetable.org mytemp.email owlymail.com tempmailo.com trbvm.com wegwerfmail.de zzrgg.com`.split(/\s+/));

/** Canonical key of an e-mail: NFKC, lower-case, `+tag` removed, and dots removed for Gmail — one person, one key. */
export function emailKey(raw) {
  const s = String(raw).normalize('NFKC').trim().toLowerCase();
  const at = s.lastIndexOf('@');
  if (at < 1) return null;
  let local = s.slice(0, at), domain = s.slice(at + 1);
  try { domain = new URL(`http://${domain}`).hostname; } catch { return null; }
  if (domain === 'googlemail.com') domain = 'gmail.com';
  local = local.split('+')[0];
  if (domain === 'gmail.com') local = local.replace(/\./g, '');
  if (!local) return null;
  return `${local}@${domain}`;
}

export function validEmail(raw) {
  const s = String(raw).normalize('NFKC').trim();
  return s.length <= 254 && /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/.test(s);
}

export const isDisposable = (email) => DISPOSABLE.has(String(email).split('@').pop().toLowerCase());

/** The domain must be able to receive mail (MX or A record). Skipped when DNS is unavailable in tests. */
export async function domainReceivesMail(email, skip = false) {
  if (skip) return true;
  const domain = String(email).split('@').pop();
  try {
    const mx = await Promise.race([dns.resolveMx(domain), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000))]);
    if (mx?.length) return true;
  } catch (e) { if (e.message === 'timeout') return true; /* do not lock people out on a slow resolver */ }
  try { return (await dns.resolve4(domain)).length > 0; } catch { return false; }
}

const CONFUSABLE = { а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', у: 'y', х: 'x', і: 'i', ј: 'j', ѕ: 's', ԁ: 'd', ɡ: 'g', ο: 'o', ν: 'v', α: 'a', ρ: 'p', ι: 'i', κ: 'k', τ: 't', ѵ: 'v', һ: 'h', ԛ: 'q', ԝ: 'w', 'ı': 'i' };
/** Visual skeleton of a username: "Adm1n", "Аdmin" (Cyrillic А) and "admin" all collapse to the same key. */
export function usernameKey(raw) {
  let s = String(raw).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  s = [...s].map((c) => CONFUSABLE[c] ?? c).join('');
  s = s.replace(/[\s._-]+/g, '').replace(/0/g, 'o').replace(/[1i]/g, 'l').replace(/5/g, 's');
  return s;
}
const RESERVED = ['admin', 'administrator', 'root', 'soporte', 'support', 'staff', 'moderator', 'mod', 'chrono', 'chronoflora', 'flora', 'system', 'sistema', 'oficial', 'official', 'help', 'ayuda', 'null', 'undefined', 'wolicbd', 'satoshi'];
export const reservedUsername = (raw) => RESERVED.some((r) => usernameKey(raw) === usernameKey(r));
export const validUsername = (raw) => /^[\p{L}\p{N}][\p{L}\p{N} ._-]{1,18}[\p{L}\p{N}]$/u.test(String(raw).normalize('NFKC').trim());

/* ───────────────────────────── passwords ───────────────────────────── */

const COMMON = new Set(`password 123456 12345678 123456789 1234567890 qwerty qwertyuiop abc123 111111 000000 password1 iloveyou admin letmein welcome monkey dragon football baseball master
sunshine princess passw0rd contraseña contrasena 123123 654321 hola1234 chronoflora cannabis marihuana marijuana weed420 420420 blockchain solana bitcoin`.split(/\s+/));

/** Returns an error message, or null when the password is acceptable. */
export function passwordProblem(pw, { username = '', email = '' } = {}) {
  if (typeof pw !== 'string' || pw.length < 10) return 'La contraseña necesita al menos 10 caracteres.';
  if (pw.length > 128) return 'La contraseña es demasiado larga (máx. 128).';
  const low = pw.toLowerCase();
  if (COMMON.has(low) || /^(.)\1+$/.test(pw) || /^(0123456789|abcdefghij|qwertyuiop)/i.test(pw)) return 'Esa contraseña es demasiado común.';
  const local = String(email).split('@')[0].toLowerCase();
  if ((username && low.includes(usernameKey(username)) && usernameKey(username).length >= 4) || (local.length >= 4 && low.includes(local))) return 'La contraseña no puede contener tu usuario o tu correo.';
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (classes < 3 && pw.length < 16) return 'Mezcla mayúsculas, minúsculas, números o símbolos (o usa una frase de 16+ caracteres).';
  return null;
}

const N = 2 ** 15, R = 8, P = 1;
/** scrypt (memory-hard) with a per-user salt, keyed with a server-side pepper. */
export function hashPassword(pw, pepper) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(crypto.createHmac('sha256', pepper).update(pw).digest(), salt, 32, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}
export function verifyPassword(pw, stored, pepper) {
  const [, n, r, p, salt, key] = String(stored).split('$');
  if (!salt || !key) return false;
  const k = crypto.scryptSync(crypto.createHmac('sha256', pepper).update(pw).digest(), Buffer.from(salt, 'base64'), 32, { N: +n, r: +r, p: +p, maxmem: 64 * 1024 * 1024 });
  return crypto.timingSafeEqual(k, Buffer.from(key, 'base64'));
}
// scrypt is memory-hard: run it off the event loop and never more than 3 at a time (a flood of logins must not freeze the server)
import { promisify } from 'node:util';
const scryptAsync = promisify(crypto.scrypt);
let active = 0; const waiters = [];
async function withSlot(fn) { if (active >= 3) await new Promise((r) => waiters.push(r)); active++; try { return await fn(); } finally { active--; waiters.shift()?.(); } }
export const hashPasswordAsync = (pw, pepper) => withSlot(async () => {
  const salt = crypto.randomBytes(16);
  const key = await scryptAsync(crypto.createHmac('sha256', pepper).update(pw).digest(), salt, 32, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
});
export const verifyPasswordAsync = (pw, stored, pepper) => withSlot(async () => {
  const [, n, r, p, salt, key] = String(stored).split('$');
  if (!salt || !key) return false;
  const k = await scryptAsync(crypto.createHmac('sha256', pepper).update(pw).digest(), Buffer.from(salt, 'base64'), 32, { N: +n, r: +r, p: +p, maxmem: 64 * 1024 * 1024 });
  return crypto.timingSafeEqual(k, Buffer.from(key, 'base64'));
});
let DUMMY_A = null;
export async function dummyVerifyAsync(pw, pepper) { DUMMY_A ??= await hashPasswordAsync('dummy-password-for-timing', pepper); await verifyPasswordAsync(pw, DUMMY_A, pepper).catch(() => {}); }

/** Run when the account does not exist so that "unknown user" costs the same as "wrong password" (no enumeration by timing). */
let DUMMY = null;
export function dummyVerify(pw, pepper) { DUMMY ??= hashPassword('dummy-password-for-timing', pepper); try { verifyPassword(pw, DUMMY, pepper); } catch { /* */ } }

/* ───────────────────────────── proof-of-work captcha (self-hosted, free, no tracking) ───────────────────────────── */

const POW_TTL = 5 * 60 * 1000;
const hmac = (secret, s) => crypto.createHmac('sha256', secret).update(s).digest('base64url');

/** Challenge: find a nonce so that sha256(salt + nonce) starts with `bits` zero bits. Cost grows exponentially with `bits`. */
export function makeChallenge(secret, bits) {
  const id = rand(12), salt = rand(12), exp = Date.now() + POW_TTL;
  return { id, salt, bits, exp, sig: hmac(secret, `${id}|${salt}|${bits}|${exp}`) };
}
export function leadingZeroBits(buf) {
  let n = 0;
  for (const b of buf) { if (b === 0) { n += 8; continue; } n += Math.clz32(b) - 24; break; }
  return n;
}
/** Verifies signature, expiry and work. The caller must also burn the id (one use only). */
export function checkPow(secret, sol, minBits) {
  if (!sol || typeof sol !== 'object') return 'captcha_missing';
  const { id, salt, bits, exp, sig, nonce } = sol;
  if (![id, salt, sig].every((v) => typeof v === 'string') || !Number.isInteger(bits) || !Number.isInteger(exp) || !Number.isInteger(nonce)) return 'captcha_invalid';
  if (!safeEqual(sig, hmac(secret, `${id}|${salt}|${bits}|${exp}`))) return 'captcha_invalid';
  if (Date.now() > exp) return 'captcha_expired';
  if (bits < minBits) return 'captcha_weak';
  const digest = crypto.createHash('sha256').update(`${salt}${nonce}`).digest();
  return leadingZeroBits(digest) >= bits ? null : 'captcha_wrong';
}

/* ───────────────────────────── rate limiting ───────────────────────────── */

/** Sliding-window counter per key. `hit()` returns the seconds to wait (0 = allowed). In-memory, swept periodically. */
export class Limiter {
  constructor() { this.m = new Map(); setInterval(() => this.sweep(), 60_000).unref(); }
  hit(key, max, windowMs) {
    const now = Date.now();
    const arr = (this.m.get(key) ?? []).filter((t) => now - t < windowMs);
    if (arr.length >= max) { this.m.set(key, arr); return Math.ceil((windowMs - (now - arr[0])) / 1000); }
    arr.push(now);
    this.m.set(key, arr);
    return 0;
  }
  count(key, windowMs) { const now = Date.now(); return (this.m.get(key) ?? []).filter((t) => now - t < windowMs).length; }
  sweep() { const now = Date.now(); for (const [k, v] of this.m) { const f = v.filter((t) => now - t < 3_600_000 * 24); if (f.length) this.m.set(k, f); else this.m.delete(k); } }
}

/* ───────────────────────────── http helpers ───────────────────────────── */

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

export function parseCookies(header) {
  const out = {};
  for (const part of String(header ?? '').split(';')) { const i = part.indexOf('='); if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim()); }
  return out;
}
export function cookie(name, value, { maxAge, secure, httpOnly = true, sameSite = 'Lax', path = '/' } = {}) {
  return `${name}=${encodeURIComponent(value)}; Path=${path}; ${httpOnly ? 'HttpOnly; ' : ''}SameSite=${sameSite};${secure ? ' Secure;' : ''}${maxAge !== undefined ? ` Max-Age=${maxAge}` : ''}`;
}

export async function readJson(req, limit = 8 * 1024) {
  const type = String(req.headers['content-type'] ?? '');
  if (!type.toLowerCase().startsWith('application/json')) throw Object.assign(new Error('json_required'), { status: 415 });
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw Object.assign(new Error('too_large'), { status: 413 }); chunks.push(c); }
  try { const v = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); if (v === null || typeof v !== 'object' || Array.isArray(v)) throw 0; return v; }
  catch { throw Object.assign(new Error('bad_json'), { status: 400 }); }
}

export const pkcePair = () => { const verifier = rand(48); return { verifier, challenge: crypto.createHash('sha256').update(verifier).digest('base64url') }; };
export { sha256, hmac };
