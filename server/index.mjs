// Yield Bud Empire account service: e-mail sign-up with verification, Google / X login, sessions, anti-bot and abuse protection.
// Zero runtime dependencies (Node ≥ 22: http, crypto, sqlite, dns). Optional: nodemailer for real e-mail delivery.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  Limiter, SECURITY_HEADERS, checkPow, cookie, dummyVerifyAsync, domainReceivesMail, emailKey, hashPasswordAsync, hashToken, hmac, isDisposable,
  makeChallenge, parseCookies, passwordProblem, pkcePair, rand, readJson, reservedUsername, safeEqual, usernameKey, validEmail, validUsername, verifyPasswordAsync,
} from './lib.mjs';
import { installEconomy } from './economy.mjs';

const env = process.env;
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const cfg = {
  port: Number(env.PORT ?? 3020),
  host: env.HOST ?? '127.0.0.1',
  publicUrl: (env.PUBLIC_URL ?? 'http://localhost:3012').replace(/\/$/, ''),
  dataDir: env.DATA_DIR ?? path.join(HERE, 'data'),
  trustProxy: env.TRUST_PROXY === '1',
  powBits: Number(env.POW_BITS ?? 18),
  maxAccountsPerIp: Number(env.MAX_ACCOUNTS_PER_IP ?? 3),
  skipMx: env.SKIP_MX === '1',
  devLinks: env.DEV_EXPOSE_LINKS === '1',
  xMinAgeDays: Number(env.X_MIN_AGE_DAYS ?? 60),
  xMinFollowers: Number(env.X_MIN_FOLLOWERS ?? 0),
  smtpUrl: env.SMTP_URL ?? '',
  mailFrom: env.MAIL_FROM ?? 'Yield Bud Empire <no-reply@yieldbudempire.local>',
};
const secure = cfg.publicUrl.startsWith('https://');
const allowedOrigins = new Set((env.ALLOWED_ORIGINS ?? cfg.publicUrl).split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean));

/** Is this host on a private network? localhost, RFC 1918 LAN ranges, Tailscale (100.64/10 and *.ts.net), link-local and .local names. */
export function isPrivateHost(host) {
  const h = String(host).toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h === '::1') return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (m.slice(1).some((x) => Number(x) > 255)) return false;
    return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254);
  }
  if (h.includes(':')) return h.startsWith('fd') || h.startsWith('fe80') || h.startsWith('fc');   // ULA (Tailscale's fd7a:...) and link-local IPv6
  return h.endsWith('.ts.net') || h.endsWith('.local') || h.endsWith('.lan') || !h.includes('.');   // MagicDNS / mDNS / single-label LAN names
}
/** Exact allow-list first; otherwise any private-network origin (set ALLOW_PRIVATE_ORIGINS=0 on a public HTTPS deployment). */
export function originAllowed(origin) {
  const o = String(origin).replace(/\/$/, '');
  if (allowedOrigins.has(o)) return true;
  if (env.ALLOW_PRIVATE_ORIGINS === '0') return false;
  try { const u = new URL(o); return (u.protocol === 'http:' || u.protocol === 'https:') && isPrivateHost(u.hostname); } catch { return false; }
}

fs.mkdirSync(cfg.dataDir, { recursive: true, mode: 0o700 });
// the signing secret and the password pepper live outside the database, in a file only this user can read
const keyFile = path.join(cfg.dataDir, 'secret.key');
if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, crypto.randomBytes(64).toString('base64'), { mode: 0o600 });
const MASTER = env.SECRET ?? fs.readFileSync(keyFile, 'utf8').trim();
const SECRET = crypto.createHmac('sha256', MASTER).update('signing').digest('base64');
const PEPPER = crypto.createHmac('sha256', MASTER).update('pepper').digest('base64');
const ipSalt = crypto.createHmac('sha256', MASTER).update('ip').digest();

const db = new DatabaseSync(path.join(cfg.dataDir, 'accounts.db'));
db.exec(`
PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 4000;
CREATE TABLE IF NOT EXISTS accounts (id INTEGER PRIMARY KEY, email TEXT, email_key TEXT UNIQUE, username TEXT NOT NULL, username_key TEXT NOT NULL UNIQUE, pass_hash TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, ip_hash TEXT, ua_hash TEXT, flags TEXT NOT NULL DEFAULT '', failed INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0, source TEXT NOT NULL DEFAULT 'email');
CREATE TABLE IF NOT EXISTS identities (provider TEXT NOT NULL, subject TEXT NOT NULL, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, PRIMARY KEY (provider, subject));
CREATE TABLE IF NOT EXISTS sessions (id_hash TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, created_at INTEGER NOT NULL, last_seen INTEGER NOT NULL, expires_at INTEGER NOT NULL, ip_hash TEXT, ua_hash TEXT);
CREATE TABLE IF NOT EXISTS tokens (id_hash TEXT PRIMARY KEY, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, kind TEXT NOT NULL, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS pow_used (id TEXT PRIMARY KEY, exp INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS audit (ts INTEGER NOT NULL, event TEXT NOT NULL, account_id INTEGER, ip_hash TEXT, detail TEXT);
CREATE INDEX IF NOT EXISTS idx_accounts_ip ON accounts(ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_acc ON sessions(account_id);
`);
for (const f of ['accounts.db', 'accounts.db-wal', 'accounts.db-shm']) { try { fs.chmodSync(path.join(cfg.dataDir, f), 0o600); } catch { /* not created yet */ } }
const q = {
  byEmailKey: db.prepare('SELECT * FROM accounts WHERE email_key = ?'),
  byUserKey: db.prepare('SELECT * FROM accounts WHERE username_key = ?'),
  byId: db.prepare('SELECT * FROM accounts WHERE id = ?'),
  insertAccount: db.prepare('INSERT INTO accounts (email, email_key, username, username_key, pass_hash, email_verified, created_at, ip_hash, ua_hash, source) VALUES (?,?,?,?,?,?,?,?,?,?)'),
  identity: db.prepare('SELECT account_id FROM identities WHERE provider = ? AND subject = ?'),
  addIdentity: db.prepare('INSERT OR IGNORE INTO identities (provider, subject, account_id, created_at) VALUES (?,?,?,?)'),
  identitiesOf: db.prepare('SELECT provider FROM identities WHERE account_id = ?'),
  session: db.prepare('SELECT * FROM sessions WHERE id_hash = ?'),
  addSession: db.prepare('INSERT INTO sessions (id_hash, account_id, created_at, last_seen, expires_at, ip_hash, ua_hash) VALUES (?,?,?,?,?,?,?)'),
  touchSession: db.prepare('UPDATE sessions SET last_seen = ?, expires_at = ? WHERE id_hash = ?'),
  delSession: db.prepare('DELETE FROM sessions WHERE id_hash = ?'),
  delSessionsOf: db.prepare('DELETE FROM sessions WHERE account_id = ?'),
  trimSessions: db.prepare('DELETE FROM sessions WHERE id_hash IN (SELECT id_hash FROM sessions WHERE account_id = ? ORDER BY created_at DESC LIMIT -1 OFFSET 4)'),
  addToken: db.prepare('INSERT INTO tokens (id_hash, account_id, kind, expires_at) VALUES (?,?,?,?)'),
  token: db.prepare('SELECT * FROM tokens WHERE id_hash = ? AND kind = ?'),
  useToken: db.prepare('UPDATE tokens SET used = 1 WHERE id_hash = ?'),
  burnPow: db.prepare('INSERT INTO pow_used (id, exp) VALUES (?, ?)'),
  sweepPow: db.prepare('DELETE FROM pow_used WHERE exp < ?'),
  sweepSessions: db.prepare('DELETE FROM sessions WHERE expires_at < ?'),
  sweepTokens: db.prepare('DELETE FROM tokens WHERE expires_at < ?'),
  audit: db.prepare('INSERT INTO audit (ts, event, account_id, ip_hash, detail) VALUES (?,?,?,?,?)'),
  countByIp: db.prepare('SELECT COUNT(*) AS n FROM accounts WHERE ip_hash = ? AND created_at > ?'),
  fail: db.prepare('UPDATE accounts SET failed = ?, locked_until = ? WHERE id = ?'),
  clearFail: db.prepare('UPDATE accounts SET failed = 0, locked_until = 0 WHERE id = ?'),
  verify: db.prepare('UPDATE accounts SET email_verified = 1 WHERE id = ?'),
  setPass: db.prepare('UPDATE accounts SET pass_hash = ?, failed = 0, locked_until = 0 WHERE id = ?'),
  flag: db.prepare("UPDATE accounts SET flags = CASE WHEN instr(flags, ?) THEN flags ELSE flags || ? || ',' END WHERE id = ?"),
  hijackGuard: db.prepare('UPDATE accounts SET pass_hash = NULL, email_verified = 1 WHERE id = ?'),
};
setInterval(() => { const now = Date.now(); try { q.sweepPow.run(now); q.sweepSessions.run(now); q.sweepTokens.run(now); } catch { /* */ } }, 10 * 60_000).unref();

const limiter = new Limiter();
const ipHashOf = (ip) => crypto.createHmac('sha256', ipSalt).update(String(ip)).digest('hex').slice(0, 24);
const audit = (event, accountId, ipHash, detail = '') => { try { q.audit.run(Date.now(), event, accountId ?? null, ipHash ?? null, String(detail).slice(0, 200)); } catch { /* */ } };

/* ───────────────────────────── mail ───────────────────────────── */

let transporter = null;
async function sendMail(to, subject, text) {
  try {
    if (cfg.smtpUrl) {
      if (!transporter) { const nm = await import('nodemailer'); transporter = nm.default.createTransport(cfg.smtpUrl); }
      await transporter.sendMail({ from: cfg.mailFrom, to, subject, text });
      return true;
    }
  } catch (e) { console.error('mail error:', e.message); }
  // no SMTP configured (development): the message lands in a local outbox file instead of the internet
  fs.appendFileSync(path.join(cfg.dataDir, 'outbox.log'), `--- ${new Date().toISOString()} → ${to}\n${subject}\n${text}\n\n`, { mode: 0o600 });
  return false;
}
const linkFor = (kind, token) => `${cfg.publicUrl}/#${kind}=${token}`;

/* ───────────────────────────── helpers ───────────────────────────── */

class HttpError extends Error { constructor(status, code, extra = {}) { super(code); this.status = status; this.code = code; this.extra = extra; } }
const publicAccount = (a) => ({ id: a.id, username: a.username, email: a.email ?? null, verified: !!a.email_verified, providers: q.identitiesOf.all(a.id).map((r) => r.provider), source: a.source, createdAt: a.created_at });

function issueSession(ctx, accountId) {
  const token = rand(32), now = Date.now();
  q.addSession.run(hashToken(token), accountId, now, now, now + 30 * 86400_000, ctx.ipHash, ctx.uaHash);
  q.trimSessions.run(accountId);   // at most 5 live sessions per account
  ctx.setCookies.push(cookie('cf_session', token, { maxAge: 30 * 86400, secure }));
}
function sessionAccount(ctx) {
  const token = parseCookies(ctx.req.headers.cookie).cf_session;
  if (!token) return null;
  const s = q.session.get(hashToken(token));
  if (!s || s.expires_at < Date.now()) return null;
  const now = Date.now();
  if (now - s.last_seen > 3600_000) q.touchSession.run(now, now + 30 * 86400_000, s.id_hash);   // sliding expiry
  return q.byId.get(s.account_id) ?? null;
}

/** Proof-of-work. The base cost is small on purpose (a real browser solves it in a couple of seconds); it only rises, by at most
 *  two bits, for a network that keeps FAILING the check. A successful check never makes the next one harder (it used to,
 *  up to 26 bits, which locked out people who simply logged in a few times from the same address). */
function requiredBits(ctx, purpose) {
  const failures = limiter.count(`powfail:${purpose}:${ctx.ip}`, 3600_000);
  return cfg.powBits + Math.min(2, Math.floor(failures / 3));
}
function requireCaptcha(ctx, purpose, sol) {
  const err = checkPow(SECRET, sol, cfg.powBits);
  if (err) { limiter.hit(`powfail:${purpose}:${ctx.ip}`, 1e9, 3600_000); throw new HttpError(400, err, { bits: requiredBits(ctx, purpose) }); }
  try { q.burnPow.run(sol.id, sol.exp); } catch { throw new HttpError(400, 'captcha_replayed'); }   // one use only
}
function limit(ctx, key, max, windowMs, code = 'rate_limited') {
  const wait = limiter.hit(key, max, windowMs);
  if (wait) throw new HttpError(429, code, { retryAfter: wait });
}

function uniqueUsername(base) {
  let name = String(base).normalize('NFKC').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 14) || 'Grower';
  if (!validUsername(name) || reservedUsername(name)) name = 'Grower';
  for (let i = 0; i < 50; i++) {
    const cand = i === 0 ? name : `${name}${1000 + Math.floor(crypto.randomInt(9000))}`;
    if (!q.byUserKey.get(usernameKey(cand)) && !reservedUsername(cand)) return cand;
  }
  return `Grower${Date.now().toString(36)}`;
}

function suspicious(ctx, accountId) {
  const since = Date.now() - 7 * 86400_000;
  if (q.countByIp.get(ctx.ipHash, since).n >= cfg.maxAccountsPerIp) { q.flag.run('multi_account_ip', 'multi_account_ip', accountId); audit('flag_multi_ip', accountId, ctx.ipHash); }
}
function accountCapReached(ctx) {
  return q.countByIp.get(ctx.ipHash, Date.now() - 86400_000).n >= cfg.maxAccountsPerIp;
}

/* ───────────────────────────── routes ───────────────────────────── */

const routes = new Map();
const route = (method, p, fn) => routes.set(`${method} ${p}`, fn);

const providers = {
  google: { id: env.GOOGLE_CLIENT_ID, secret: env.GOOGLE_CLIENT_SECRET, authUrl: env.GOOGLE_AUTH_URL ?? 'https://accounts.google.com/o/oauth2/v2/auth', tokenUrl: env.GOOGLE_TOKEN_URL ?? 'https://oauth2.googleapis.com/token', userUrl: env.GOOGLE_USER_URL ?? 'https://openidconnect.googleapis.com/v1/userinfo', scope: 'openid email profile', basic: false, extra: { access_type: 'online', prompt: 'select_account' } },
  x: { id: env.X_CLIENT_ID, secret: env.X_CLIENT_SECRET, authUrl: env.X_AUTH_URL ?? 'https://x.com/i/oauth2/authorize', tokenUrl: env.X_TOKEN_URL ?? 'https://api.x.com/2/oauth2/token', userUrl: env.X_USER_URL ?? 'https://api.x.com/2/users/me?user.fields=created_at,public_metrics', scope: 'users.read tweet.read', basic: true, extra: {} },
};
const redirectUri = (name) => `${cfg.publicUrl}/api/auth/${name}/callback`;

route('GET', '/api/health', () => ({ ok: true, uptime: Math.round(process.uptime()) }));

route('GET', '/api/auth/config', () => ({
  google: !!(providers.google.id && providers.google.secret),
  x: !!(providers.x.id && providers.x.secret),
  emailDelivery: !!cfg.smtpUrl,
  devLinks: cfg.devLinks,
  captcha: { type: 'pow', bits: cfg.powBits },
}));

route('GET', '/api/auth/challenge', (ctx) => {
  const purpose = String(ctx.url.searchParams.get('purpose') ?? 'register').replace(/[^a-z]/g, '').slice(0, 12) || 'register';
  limit(ctx, `chal:${ctx.ip}`, 40, 60_000);
  return makeChallenge(SECRET, requiredBits(ctx, purpose));
});

route('GET', '/api/auth/me', (ctx) => {
  const a = sessionAccount(ctx);
  if (!a) throw new HttpError(401, 'unauthenticated');
  return { account: publicAccount(a) };
});

route('POST', '/api/auth/register', async (ctx) => {
  const b = await readJson(ctx.req);
  // bots fill hidden fields and submit instantly: answer as if it worked, but do nothing
  const elapsed = Date.now() - Number(b.t);
  if (b.hp || !(elapsed >= 2500 && elapsed < 6 * 3600_000)) { audit('bot_signal', null, ctx.ipHash, b.hp ? 'honeypot' : `timing:${elapsed}`); return { ok: true, pending: true }; }
  limit(ctx, `reg:${ctx.ip}`, 5, 3600_000);
  limit(ctx, 'reg:global', 60, 60_000, 'busy');
  if (accountCapReached(ctx)) { audit('ip_cap', null, ctx.ipHash); throw new HttpError(429, 'ip_account_limit'); }
  requireCaptcha(ctx, 'register', b.captcha);

  const email = String(b.email ?? '').normalize('NFKC').trim();
  const username = String(b.username ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
  const password = b.password;
  if (!validEmail(email)) throw new HttpError(400, 'email_invalid');
  const eKey = emailKey(email);
  if (!eKey) throw new HttpError(400, 'email_invalid');
  if (isDisposable(eKey)) { audit('disposable', null, ctx.ipHash, eKey.split('@')[1]); throw new HttpError(400, 'email_disposable'); }
  if (!validUsername(username)) throw new HttpError(400, 'username_invalid');
  if (reservedUsername(username)) throw new HttpError(400, 'username_reserved');
  const pwErr = passwordProblem(password, { username, email });
  if (pwErr) throw new HttpError(400, 'password_weak', { message: pwErr });
  if (!(await domainReceivesMail(eKey, cfg.skipMx))) throw new HttpError(400, 'email_domain');
  if (q.byUserKey.get(usernameKey(username))) throw new HttpError(409, 'username_taken');

  const existing = q.byEmailKey.get(eKey);
  if (existing) {
    // never reveal that the address is registered: same answer, and the owner gets a notice
    await sendMail(email, 'Ya tienes una cuenta en Yield Bud Empire', `Alguien intentó crear una cuenta con este correo, pero ya tienes una (usuario: ${existing.username}).\nSi fuiste tú, entra con tu contraseña o usa «Olvidé mi contraseña». Si no, ignora este mensaje.`);
    audit('signup_existing_email', existing.id, ctx.ipHash);
    return { ok: true, pending: true };
  }
  const hash = await hashPasswordAsync(password, PEPPER);
  let id;
  try { id = q.insertAccount.run(email, eKey, username, usernameKey(username), hash, 0, Date.now(), ctx.ipHash, ctx.uaHash, 'email').lastInsertRowid; }
  catch { throw new HttpError(409, 'username_taken'); }   // lost a race on the unique keys
  suspicious(ctx, id);
  const token = rand(32);
  q.addToken.run(hashToken(token), id, 'verify', Date.now() + 24 * 3600_000);
  const sent = await sendMail(email, 'Confirma tu cuenta de Yield Bud Empire', `¡Bienvenido, ${username}!\n\nConfirma tu correo para empezar a jugar (el enlace vale 24 h):\n${linkFor('verify', token)}\n\nSi no creaste esta cuenta, ignora este mensaje.`);
  audit('signup', id, ctx.ipHash);
  issueSession(ctx, id);
  return { ok: true, pending: true, emailSent: sent, ...(cfg.devLinks ? { devLink: linkFor('verify', token) } : {}) };
});

route('POST', '/api/auth/verify', async (ctx) => {
  const b = await readJson(ctx.req);
  limit(ctx, `verify:${ctx.ip}`, 20, 900_000);
  const t = typeof b.token === 'string' ? q.token.get(hashToken(b.token), 'verify') : null;
  if (!t || t.used || t.expires_at < Date.now()) throw new HttpError(400, 'token_invalid');
  q.useToken.run(t.id_hash);
  q.verify.run(t.account_id);
  audit('email_verified', t.account_id, ctx.ipHash);
  return { ok: true };
});

route('POST', '/api/auth/resend', async (ctx) => {
  const b = await readJson(ctx.req);
  limit(ctx, `resend:${ctx.ip}`, 5, 3600_000);
  requireCaptcha(ctx, 'resend', b.captcha);
  const a = q.byEmailKey.get(emailKey(String(b.email ?? '')) ?? '');
  if (a && !a.email_verified) {
    limit(ctx, `resend:acc:${a.id}`, 1, 60_000);
    const token = rand(32);
    q.addToken.run(hashToken(token), a.id, 'verify', Date.now() + 24 * 3600_000);
    await sendMail(a.email, 'Confirma tu cuenta de Yield Bud Empire', `Confirma tu correo (vale 24 h):\n${linkFor('verify', token)}`);
    if (cfg.devLinks) return { ok: true, devLink: linkFor('verify', token) };
  }
  return { ok: true };   // same answer whether or not the address exists
});

route('POST', '/api/auth/login', async (ctx) => {
  const b = await readJson(ctx.req);
  const identifier = String(b.identifier ?? '').normalize('NFKC').trim();
  const password = typeof b.password === 'string' ? b.password : '';
  if (!identifier || !password || password.length > 128) throw new HttpError(400, 'bad_request');
  limit(ctx, `login:${ctx.ip}`, 20, 900_000);
  limit(ctx, `login:id:${identifier.toLowerCase()}`, 8, 900_000);
  const a = identifier.includes('@') ? q.byEmailKey.get(emailKey(identifier) ?? '') : q.byUserKey.get(usernameKey(identifier));
  const needCaptcha = (a && a.failed >= 3) || limiter.count(`loginfail:${ctx.ip}`, 900_000) >= 5;
  if (a && a.locked_until > Date.now()) throw new HttpError(429, 'account_locked', { retryAfter: Math.ceil((a.locked_until - Date.now()) / 1000) });
  if (needCaptcha) requireCaptcha(ctx, 'login', b.captcha);
  let ok = false;
  if (a?.pass_hash) ok = await verifyPasswordAsync(password, a.pass_hash, PEPPER);
  else await dummyVerifyAsync(password, PEPPER);
  if (!ok) {
    limiter.hit(`loginfail:${ctx.ip}`, 1e9, 900_000);
    if (a) { const n = a.failed + 1; q.fail.run(n, n >= 3 ? Date.now() + Math.min(900_000, 2 ** n * 1000) : 0, a.id); }
    audit('login_fail', a?.id, ctx.ipHash);
    throw new HttpError(401, 'bad_credentials', needCaptcha ? {} : { captchaSoon: !!a && a.failed + 1 >= 3 });
  }
  q.clearFail.run(a.id);
  issueSession(ctx, a.id);
  audit('login', a.id, ctx.ipHash);
  return { account: publicAccount(a) };
});

route('POST', '/api/auth/logout', (ctx) => {
  const token = parseCookies(ctx.req.headers.cookie).cf_session;
  if (token) q.delSession.run(hashToken(token));
  ctx.setCookies.push(cookie('cf_session', '', { maxAge: 0, secure }));
  return { ok: true };
});

route('POST', '/api/auth/reset/request', async (ctx) => {
  const b = await readJson(ctx.req);
  limit(ctx, `reset:${ctx.ip}`, 5, 3600_000);
  requireCaptcha(ctx, 'reset', b.captcha);
  const a = q.byEmailKey.get(emailKey(String(b.email ?? '')) ?? '');
  if (a?.email && a.email_verified) {
    limit(ctx, `reset:acc:${a.id}`, 3, 3600_000);
    const token = rand(32);
    q.addToken.run(hashToken(token), a.id, 'reset', Date.now() + 3600_000);
    await sendMail(a.email, 'Restablece tu contraseña de Yield Bud Empire', `Usa este enlace para elegir una contraseña nueva (vale 1 hora):\n${linkFor('reset', token)}\n\nSi no lo pediste, ignóralo: tu cuenta sigue segura.`);
    audit('reset_request', a.id, ctx.ipHash);
    if (cfg.devLinks) return { ok: true, devLink: linkFor('reset', token) };
  }
  return { ok: true };
});

route('POST', '/api/auth/reset/confirm', async (ctx) => {
  const b = await readJson(ctx.req);
  limit(ctx, `resetc:${ctx.ip}`, 10, 900_000);
  const t = typeof b.token === 'string' ? q.token.get(hashToken(b.token), 'reset') : null;
  if (!t || t.used || t.expires_at < Date.now()) throw new HttpError(400, 'token_invalid');
  const a = q.byId.get(t.account_id);
  const pwErr = passwordProblem(b.password, { username: a.username, email: a.email ?? '' });
  if (pwErr) throw new HttpError(400, 'password_weak', { message: pwErr });
  q.useToken.run(t.id_hash);
  q.setPass.run(await hashPasswordAsync(b.password, PEPPER), a.id);
  q.delSessionsOf.run(a.id);                 // everyone is signed out after a reset
  audit('reset_done', a.id, ctx.ipHash);
  return { ok: true };
});

/* ── OAuth (authorization code + PKCE + state) ── */

for (const name of Object.keys(providers)) {
  route('GET', `/api/auth/${name}/start`, (ctx) => {
    const p = providers[name];
    if (!p.id || !p.secret) throw new HttpError(503, 'provider_not_configured');
    limit(ctx, `oauth:${ctx.ip}`, 20, 900_000);
    const state = rand(24), { verifier, challenge } = pkcePair();
    const blob = Buffer.from(JSON.stringify({ state, verifier, name, ts: Date.now() })).toString('base64url');
    ctx.setCookies.push(cookie('cf_oauth', `${blob}.${hmac(SECRET, blob)}`, { maxAge: 600, secure }));
    const u = new URL(p.authUrl);
    const params = { response_type: 'code', client_id: p.id, redirect_uri: redirectUri(name), scope: p.scope, state, code_challenge: challenge, code_challenge_method: 'S256', ...p.extra };
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    return { redirect: u.toString() };
  });

  route('GET', `/api/auth/${name}/callback`, async (ctx) => {
    const fail = (code) => ({ redirect: `${cfg.publicUrl}/#auth_error=${code}` });
    const p = providers[name];
    if (!p.id || !p.secret) return fail('provider_not_configured');
    ctx.setCookies.push(cookie('cf_oauth', '', { maxAge: 0, secure }));
    const raw = parseCookies(ctx.req.headers.cookie).cf_oauth ?? '';
    const [blob, sig] = raw.split('.');
    if (!blob || !sig || !safeEqual(sig, hmac(SECRET, blob))) return fail('state_invalid');
    let st; try { st = JSON.parse(Buffer.from(blob, 'base64url').toString()); } catch { return fail('state_invalid'); }
    const qs = ctx.url.searchParams;
    if (st.name !== name || Date.now() - st.ts > 600_000 || !safeEqual(String(qs.get('state') ?? ''), st.state)) return fail('state_invalid');
    if (qs.get('error') || !qs.get('code')) return fail('denied');
    limit(ctx, `oauthcb:${ctx.ip}`, 20, 900_000);
    try {
      const body = new URLSearchParams({ grant_type: 'authorization_code', code: qs.get('code'), redirect_uri: redirectUri(name), code_verifier: st.verifier, client_id: p.id });
      const headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
      if (p.basic) headers.Authorization = `Basic ${Buffer.from(`${p.id}:${p.secret}`).toString('base64')}`; else body.set('client_secret', p.secret);
      const tr = await fetch(p.tokenUrl, { method: 'POST', headers, body, signal: AbortSignal.timeout(8000) });
      const tok = await tr.json();
      if (!tr.ok || !tok.access_token) return fail('token_exchange');
      const ur = await fetch(p.userUrl, { headers: { Authorization: `Bearer ${tok.access_token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      const raw2 = await ur.json();
      if (!ur.ok) return fail('profile');
      return finishOAuth(ctx, name, raw2, fail);
    } catch (e) { console.error('oauth error:', e.message); return fail('provider_error'); }
  });
}

function finishOAuth(ctx, name, data, fail) {
  let subject, email = null, display = '', verifiedEmail = false;
  if (name === 'google') {
    subject = String(data.sub ?? ''); email = data.email ? String(data.email) : null; verifiedEmail = data.email_verified === true; display = data.name ?? data.given_name ?? '';
    if (!subject || !email || !verifiedEmail) return fail('email_not_verified');
  } else {
    const u = data.data ?? data;
    subject = String(u.id ?? ''); display = u.username ?? u.name ?? '';
    if (!subject) return fail('profile');
    // X gives no e-mail: the only sybil signals are the age and reach of the X account
    const ageDays = u.created_at ? (Date.now() - Date.parse(u.created_at)) / 86400_000 : 0;
    if (ageDays < cfg.xMinAgeDays) { audit('x_too_new', null, ctx.ipHash, `${Math.round(ageDays)}d`); return fail('x_account_too_new'); }
    if ((u.public_metrics?.followers_count ?? 0) < cfg.xMinFollowers) return fail('x_account_too_small');
  }
  const eKey = email ? emailKey(email) : null;
  if (eKey && isDisposable(eKey)) return fail('email_disposable');
  let accountId = q.identity.get(name, subject)?.account_id;
  if (!accountId && eKey) {
    const ex = q.byEmailKey.get(eKey);
    if (ex) {
      // link to the existing account; if it was never verified, wipe its password (the provider just proved who owns the address)
      if (!ex.email_verified) { q.hijackGuard.run(ex.id); q.delSessionsOf.run(ex.id); }
      q.addIdentity.run(name, subject, ex.id, Date.now());
      accountId = ex.id;
    }
  }
  if (!accountId) {
    if (accountCapReached(ctx)) return fail('ip_account_limit');
    limit(ctx, `reg:${ctx.ip}`, 5, 3600_000);
    const uname = uniqueUsername(display || (email ? email.split('@')[0] : 'Grower'));
    try { accountId = q.insertAccount.run(email, eKey, uname, usernameKey(uname), null, name === 'google' ? 1 : 0, Date.now(), ctx.ipHash, ctx.uaHash, name).lastInsertRowid; }
    catch { return fail('signup_race'); }
    q.addIdentity.run(name, subject, accountId, Date.now());
    suspicious(ctx, accountId);
    audit(`signup_${name}`, accountId, ctx.ipHash);
  }
  issueSession(ctx, accountId);
  audit(`login_${name}`, accountId, ctx.ipHash);
  return { redirect: `${cfg.publicUrl}/#auth=ok` };
}

/* ───────────────────────────── economy (wallet, ledger, NFTs owned by the server) ───────────────────────────── */

export const economy = installEconomy({ db, route, HttpError, sessionAccount, audit, limit, readJson });

/* ───────────────────────────── server ───────────────────────────── */

const globalHits = new Limiter();
function clientIp(req) {
  const remote = req.socket.remoteAddress ?? '';
  const loop = remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1';
  if (cfg.trustProxy && loop) { const x = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim(); if (x) return x; }
  return remote;
}

function send(res, status, body, ctx) {
  const headers = { ...SECURITY_HEADERS, ...(secure ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}) };
  if (ctx?.setCookies?.length) headers['Set-Cookie'] = ctx.setCookies;
  if (body?.redirect) { res.writeHead(302, { ...headers, Location: body.redirect }); return res.end(); }
  headers['Content-Type'] = 'application/json; charset=utf-8';
  if (body?.retryAfter) headers['Retry-After'] = String(body.retryAfter);
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

export function createServer() {
  const server = http.createServer(async (req, res) => {
    const ctx = { req, res, setCookies: [], ip: clientIp(req), url: new URL(req.url ?? '/', 'http://x') };
    ctx.ipHash = ipHashOf(ctx.ip);
    ctx.uaHash = crypto.createHash('sha256').update(`${req.headers['user-agent'] ?? ''}|${req.headers['accept-language'] ?? ''}`).digest('hex').slice(0, 16);
    try {
      if (globalHits.hit(`g:${ctx.ip}`, 300, 60_000)) throw new HttpError(429, 'rate_limited', { retryAfter: 30 });
      const handler = routes.get(`${req.method} ${ctx.url.pathname}`);
      if (!handler) throw new HttpError(404, 'not_found');
      if (req.method === 'POST') {
        const origin = req.headers.origin;
        if (origin && !originAllowed(origin)) throw new HttpError(403, 'bad_origin');
        if (req.headers['x-cf-csrf'] !== '1') throw new HttpError(403, 'csrf');
      }
      const out = await handler(ctx);
      send(res, 200, out, ctx);
    } catch (e) {
      if (e instanceof HttpError) send(res, e.status, { error: e.code, ...e.extra }, ctx);
      else if (e?.status) send(res, e.status, { error: e.message }, ctx);
      else { console.error('unhandled:', e); send(res, 500, { error: 'server_error' }, ctx); }
    }
  });
  // slow-loris / connection-exhaustion protection
  server.headersTimeout = 10_000;
  server.requestTimeout = 15_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 50;
  server.maxRequestsPerSocket = 200;
  server.maxConnections = 2000;
  server.on('clientError', (_e, socket) => { if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); else socket.destroy(); });
  return server;
}

process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e));
process.on('uncaughtException', (e) => console.error('uncaughtException:', e));

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (cfg.devLinks) console.warn('⚠  DEV_EXPOSE_LINKS=1: los enlaces de verificación se devuelven a la web. La verificación de correo NO protege nada. Solo para desarrollo.');
  if (!cfg.smtpUrl) console.warn('⚠  SMTP_URL sin configurar: los correos se guardan en data/outbox.log y no llegan a nadie.');
  if (!secure) console.warn('⚠  PUBLIC_URL sin HTTPS: las cookies de sesión no llevan el atributo Secure. Ponlo detrás de HTTPS en producción.');
  createServer().listen(cfg.port, cfg.host, () => console.log(`Yield Bud Empire accounts on http://${cfg.host}:${cfg.port} (public ${cfg.publicUrl}) · google=${!!providers.google.id} x=${!!providers.x.id} smtp=${!!cfg.smtpUrl}`));
}
export { db, q, limiter };
