// Yield Bud Empire account service: e-mail sign-up with verification, Google login, sessions, anti-bot and abuse protection.
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
import { installGame } from './game.mjs';
import { installBridge } from './bridge.mjs';
import { installFounder } from './founder.mjs';
import { installPanel } from './panel.mjs';
import { installChainPanel } from './panel-chain.mjs';
import { installSupport } from './support.mjs';
import { createAlerts } from './alerts.mjs';
import { createPrereg } from './prereg.mjs';
import { installWallet } from './wallet.mjs';

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
  /** alfa cerrada: crear una cuenta nueva (correo o proveedor) exige un código de invitación; las cuentas existentes entran igual */
  inviteOnly: env.INVITE_ONLY === '1',
  /** cupos de la alfa que se reparten solos al pre-registrarse (después se suben con admin.mjs seats) */
  alphaSeats: Math.max(0, Number(env.ALPHA_SEATS ?? 30) || 0),
  /** el sitio de promoción (otro dominio) puede llamar a /api/public/* */
  siteOrigins: new Set(String(env.SITE_ORIGINS ?? 'https://yieldbudempire.com,https://www.yieldbudempire.com').split(',').map((x) => x.trim().replace(/\/$/, '')).filter(Boolean)),
  /** base vieja del pre-registro del sitio, para migrarla una vez */
  preregDb: env.PREREG_DB ?? '',
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
CREATE TABLE IF NOT EXISTS invites (code TEXT PRIMARY KEY, note TEXT NOT NULL DEFAULT '', max_uses INTEGER NOT NULL DEFAULT 1, uses INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, expires_at INTEGER, revoked INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS invite_uses (code TEXT NOT NULL, account_id INTEGER NOT NULL, used_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_accounts_ip ON accounts(ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_acc ON sessions(account_id);
`);
for (const f of ['accounts.db', 'accounts.db-wal', 'accounts.db-shm']) { try { fs.chmodSync(path.join(cfg.dataDir, f), 0o600); } catch { /* not created yet */ } }
// qué versión de los Términos y la Política de Privacidad aceptó cada cuenta al crearse, y cuándo
for (const col of ['terms_version TEXT', 'terms_accepted_at INTEGER', 'lang TEXT']) { try { db.exec(`ALTER TABLE accounts ADD COLUMN ${col}`); } catch { /* ya existe */ } }
// los códigos de la alfa pueden quedar atados al correo del pre-registro (bases creadas antes no tienen la columna)
try { db.exec('ALTER TABLE invites ADD COLUMN email_key TEXT'); } catch { /* ya existe */ }

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
  // códigos de invitación: reservar es atómico (dos personas no pueden gastar el mismo uso a la vez)
  reserveInvite: db.prepare('UPDATE invites SET uses = uses + 1 WHERE code = ? AND revoked = 0 AND uses < max_uses AND (expires_at IS NULL OR expires_at > ?) AND (email_key IS NULL OR email_key = ?)'),
  inviteRow: db.prepare('SELECT email_key FROM invites WHERE code = ?'),
  refundInvite: db.prepare('UPDATE invites SET uses = uses - 1 WHERE code = ? AND uses > 0'),
  logInviteUse: db.prepare('INSERT INTO invite_uses (code, account_id, used_at) VALUES (?,?,?)'),
  setTerms: db.prepare('UPDATE accounts SET terms_version = ?, terms_accepted_at = ? WHERE id = ?'),
};

const termsOf = (raw) => String(raw ?? '').replace(/[^0-9a-zA-Z._-]/g, '').slice(0, 20);

/** YBE-ABCD-2345: mayúsculas, sin espacios; acepta que el jugador lo pegue en minúsculas o sin guiones */
const normInvite = (raw) => {
  const c = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!c) return '';
  const body = c.startsWith('YBE') ? c.slice(3) : c;
  return body.length === 8 ? `YBE-${body.slice(0, 4)}-${body.slice(4)}` : c.slice(0, 20);
};
/** reserva un uso del código para ese correo, o devuelve el motivo del rechazo */
const reserveInvite = (code, eKey) => {
  if (!cfg.inviteOnly) return null;
  if (!code) return 'invite_required';
  if (q.reserveInvite.run(code, Date.now(), eKey ?? '').changes === 1) return null;
  const row = q.inviteRow.get(code);
  return row?.email_key && row.email_key !== eKey ? 'invite_email_mismatch' : 'invite_invalid';
};
setInterval(() => { const now = Date.now(); try { q.sweepPow.run(now); q.sweepSessions.run(now); q.sweepTokens.run(now); } catch { /* */ } }, 10 * 60_000).unref();

const limiter = new Limiter();
const ipHashOf = (ip) => crypto.createHmac('sha256', ipSalt).update(String(ip)).digest('hex').slice(0, 24);
// the operators' Telegram chat (server/alerts.mjs): off unless TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set
export const alerts = createAlerts({ db });
const audit = (event, accountId, ipHash, detail = '') => { try { q.audit.run(Date.now(), event, accountId ?? null, ipHash ?? null, String(detail).slice(0, 200)); } catch { /* */ } alerts.onAudit(event, accountId, detail); };

/**
 * A welcome chest for every new account (it shows up in the game and credits the $FLORA when opened). WELCOME_FLORA sets the
 * amount (0 turns it off). An account flagged as one of several from the same network gets none, so nobody farms it.
 */
const WELCOME_FLORA = Math.max(0, Math.floor(Number(process.env.WELCOME_FLORA ?? 50000)) || 0);
const WELCOME_NOTE = JSON.stringify({ es: 'Regalo de bienvenida del equipo de Yield Bud Empire. ¡Gracias por jugar la alfa!', en: 'A welcome gift from the Yield Bud Empire team. Thanks for playing the alpha!' });
function welcomeGift(accountId) {
  if (!WELCOME_FLORA || !accountId) return;
  try {
    if (/multi_account_ip/.test(q.byId.get(accountId)?.flags ?? '')) return;
    db.prepare('INSERT INTO gifts (account_id, amount, note, created_at) VALUES (?,?,?,?)').run(accountId, WELCOME_FLORA, WELCOME_NOTE, Date.now());
    audit('welcome_gift', accountId, null, String(WELCOME_FLORA));
  } catch (e) { console.error('welcome gift:', e.message); }
}
/* ───────────────────────────── mail ───────────────────────────── */

let transporter = null;
/** `opts.replyTo`: where the player's answer goes if they reply to the email (support answers point to the support inbox) */
async function sendMail(to, subject, text, opts = {}) {
  try {
    if (cfg.smtpUrl) {
      if (!transporter) { const nm = await import('nodemailer'); transporter = nm.default.createTransport(cfg.smtpUrl); }
      await transporter.sendMail({ from: cfg.mailFrom, to, subject, text, ...(opts.replyTo ? { replyTo: opts.replyTo } : {}) });
      return true;
    }
  } catch (e) { console.error('mail error:', e.message); }
  // no SMTP configured (development): the message lands in a local outbox file instead of the internet
  fs.appendFileSync(path.join(cfg.dataDir, 'outbox.log'), `--- ${new Date().toISOString()} → ${to}\n${subject}\n${text}\n\n`, { mode: 0o600 });
  return false;
}
const linkFor = (kind, token) => `${cfg.publicUrl}/#${kind}=${token}`;

// pre-registro de la alfa: cola por orden de llegada, N cupos, código personal por correo
export const prereg = createPrereg({ db, sendMail, mustDeliver: !!cfg.smtpUrl, publicUrl: cfg.publicUrl, defaultSeats: cfg.alphaSeats });
{ const moved = prereg.migrateFrom(cfg.preregDb, emailKey); if (moved) console.log(`pre-registro: ${moved} persona(s) migradas desde ${cfg.preregDb}`); }

/* ───────────────────────────── helpers ───────────────────────────── */

class HttpError extends Error { constructor(status, code, extra = {}) { super(code); this.status = status; this.code = code; this.extra = extra; } }
const publicAccount = (a) => ({ id: a.id, username: a.username, email: a.email ?? null, verified: !!a.email_verified, providers: q.identitiesOf.all(a.id).map((r) => r.provider), source: a.source, createdAt: a.created_at, lang: a.lang ?? null });

/* idioma de la cuenta (es/en): lo elige el juego (el del navegador o el que el jugador toca) y decide el idioma de los correos */
const langOf = (v) => (v === 'es' || v === 'en' ? v : null);
const setLangStmt = db.prepare('UPDATE accounts SET lang = ? WHERE id = ?');
const MAIL = {
  existing: {
    es: (u) => ['Ya tienes una cuenta en Yield Bud Empire', `Alguien intentó crear una cuenta con este correo, pero ya tienes una (usuario: ${u}).\nSi fuiste tú, entra con tu contraseña o usa «Olvidé mi contraseña». Si no, ignora este mensaje.`],
    en: (u) => ['You already have a Yield Bud Empire account', `Someone tried to create an account with this email, but you already have one (username: ${u}).\nIf it was you, sign in with your password or use "Forgot my password". If not, ignore this message.`],
  },
  verify: {
    es: (u, link) => ['Confirma tu cuenta de Yield Bud Empire', `${u ? `¡Bienvenido, ${u}!\n\n` : ''}Confirma tu correo para empezar a jugar (el enlace vale 24 h):\n${link}\n\nSi no creaste esta cuenta, ignora este mensaje.`],
    en: (u, link) => ['Confirm your Yield Bud Empire account', `${u ? `Welcome, ${u}!\n\n` : ''}Confirm your email to start playing (the link is valid for 24 h):\n${link}\n\nIf you did not create this account, ignore this message.`],
  },
  reset: {
    es: (link) => ['Restablece tu contraseña de Yield Bud Empire', `Usa este enlace para elegir una contraseña nueva (vale 1 hora):\n${link}\n\nSi no lo pediste, ignóralo: tu cuenta sigue segura.`],
    en: (link) => ['Reset your Yield Bud Empire password', `Use this link to choose a new password (valid for 1 hour):\n${link}\n\nIf you did not ask for it, ignore this email: your account is still safe.`],
  },
};
const mailIn = (kind, lang, ...a) => (MAIL[kind][langOf(lang) ?? 'es'])(...a);

function issueSession(ctx, accountId) {
  const token = rand(32), now = Date.now();
  q.addSession.run(hashToken(token), accountId, now, now, now + 30 * 86400_000, ctx.ipHash, ctx.uaHash);
  q.trimSessions.run(accountId);   // at most 5 live sessions per account
  ctx.setCookies.push(cookie('cf_session', token, { maxAge: 30 * 86400, secure }));
}
/** when each account last made a request (for «online now» in the operators' panel; memory only) */
const seenAt = new Map();
function sessionAccount(ctx) {
  const token = parseCookies(ctx.req.headers.cookie).cf_session;
  if (!token) return null;
  const s = q.session.get(hashToken(token));
  if (!s || s.expires_at < Date.now()) return null;
  const now = Date.now();
  if (now - s.last_seen > 3600_000) q.touchSession.run(now, now + 30 * 86400_000, s.id_hash);   // sliding expiry
  seenAt.set(s.account_id, now);
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
};
const redirectUri = (name) => `${cfg.publicUrl}/api/auth/${name}/callback`;

route('GET', '/api/health', () => ({ ok: true, uptime: Math.round(process.uptime()) }));

route('GET', '/api/auth/config', () => ({
  google: !!(providers.google.id && providers.google.secret),
  emailDelivery: !!cfg.smtpUrl,
  inviteOnly: cfg.inviteOnly,
  devLinks: cfg.devLinks,
  captcha: { type: 'pow', bits: cfg.powBits },
  telemetry: process.env.TELEMETRY_ENABLED === '1',
}));

route('GET', '/api/auth/challenge', (ctx) => {
  const purpose = String(ctx.url.searchParams.get('purpose') ?? 'register').replace(/[^a-z]/g, '').slice(0, 12) || 'register';
  limit(ctx, `chal:${ctx.ip}`, 40, 60_000);
  return makeChallenge(SECRET, requiredBits(ctx, purpose));
});

/* ───────────── rutas públicas que usa el sitio de promoción (yieldbudempire.com, otro dominio) ───────────── */

route('GET', '/api/public/challenge', (ctx) => {
  limit(ctx, `chal:${ctx.ip}`, 40, 60_000);
  return makeChallenge(SECRET, requiredBits(ctx, 'prereg'));
});

route('POST', '/api/public/prereg', async (ctx) => {
  const b = await readJson(ctx.req);
  // bots: campo trampa o envío instantáneo → se contesta como si hubiera funcionado, pero no se guarda nada
  const elapsed = Date.now() - Number(b.t);
  if (b.hp || !(elapsed >= 2500 && elapsed < 6 * 3600_000)) { audit('prereg_bot', null, ctx.ipHash, b.hp ? 'honeypot' : `timing:${elapsed}`); return { ok: true, status: 'waiting', position: 0 }; }
  limit(ctx, `prereg:${ctx.ip}`, 5, 3600_000);
  limit(ctx, 'prereg:global', 60, 60_000, 'busy');
  requireCaptcha(ctx, 'prereg', b.captcha);
  if (b.consent !== true) throw new HttpError(400, 'consent_required');
  const email = String(b.email ?? '').normalize('NFKC').trim();
  if (!validEmail(email)) throw new HttpError(400, 'email_invalid');
  const eKey = emailKey(email);
  if (!eKey) throw new HttpError(400, 'email_invalid');
  if (isDisposable(eKey)) { audit('prereg_disposable', null, ctx.ipHash, eKey.split('@')[1]); throw new HttpError(400, 'email_disposable'); }
  if (!(await domainReceivesMail(eKey, cfg.skipMx))) throw new HttpError(400, 'email_domain');
  const alias = String(b.alias ?? '').normalize('NFKC').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 30);
  const r = await prereg.signUp({ email, eKey, alias, lang: b.lang, ipHash: ctx.ipHash, termsVersion: termsOf(b.termsVersion) || 'sin-version' });
  audit('prereg', null, ctx.ipHash, r.status);
  return { ok: true, ...r };
});

route('GET', '/api/public/stats', () => {
  const st = prereg.stats();
  const pick = (r) => { let d = {}; try { d = JSON.parse(r.data); } catch { /* sin datos */ } return { kind: r.kind, rarity: r.rarity, price: r.price, name: typeof d.name === 'string' ? d.name.slice(0, 40) : null, nftId: r.nft_id }; };
  const active = db.prepare("SELECT kind, rarity, price, data, nft_id FROM listings WHERE status = 'active' ORDER BY id DESC LIMIT 12").all().map(pick);
  const t = db.prepare("SELECT SUM(status = 'active') AS active, SUM(status = 'sold') AS sold, COALESCE(SUM(CASE WHEN status = 'sold' THEN fee END), 0) AS burned FROM listings").get();
  return { prereg: { total: st.total, seats: st.seats, invited: st.invited, waiting: st.waiting }, market: { active, totals: { active: t.active ?? 0, sold: t.sold ?? 0, burned: t.burned ?? 0 }, feeRate: 0.05 } };
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
    await sendMail(email, ...mailIn('existing', existing.lang ?? b.lang, existing.username));
    audit('signup_existing_email', existing.id, ctx.ipHash);
    return { ok: true, pending: true };
  }
  if (b.acceptTerms !== true) throw new HttpError(400, 'terms_required');
  const invite = normInvite(b.invite);
  if (cfg.inviteOnly && !invite) throw new HttpError(403, 'invite_required');
  const hash = await hashPasswordAsync(password, PEPPER);
  const inviteErr = reserveInvite(invite, eKey);
  if (inviteErr) { audit('invite_rejected', null, ctx.ipHash, invite.slice(0, 20)); throw new HttpError(403, inviteErr); }
  let id;
  try { id = q.insertAccount.run(email, eKey, username, usernameKey(username), hash, 0, Date.now(), ctx.ipHash, ctx.uaHash, 'email').lastInsertRowid; }
  catch { if (cfg.inviteOnly) q.refundInvite.run(invite); throw new HttpError(409, 'username_taken'); }   // lost a race on the unique keys
  if (cfg.inviteOnly) q.logInviteUse.run(invite, id, Date.now());
  q.setTerms.run(termsOf(b.termsVersion) || 'sin-version', Date.now(), id);
  if (langOf(b.lang)) setLangStmt.run(b.lang, id);
  suspicious(ctx, id);
  welcomeGift(id);
  const token = rand(32);
  q.addToken.run(hashToken(token), id, 'verify', Date.now() + 24 * 3600_000);
  const sent = await sendMail(email, ...mailIn('verify', b.lang, username, linkFor('verify', token)));
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
    await sendMail(a.email, ...mailIn('verify', a.lang ?? b.lang, '', linkFor('verify', token)));
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

route('POST', '/api/auth/lang', async (ctx) => {
  const a = sessionAccount(ctx);
  if (!a) throw new HttpError(401, 'unauthenticated');
  const b = await readJson(ctx.req);
  const l = langOf(b.lang);
  if (!l) throw new HttpError(400, 'bad_request');
  limit(ctx, `lang:${a.id}`, 20, 60_000);
  setLangStmt.run(l, a.id);
  return { ok: true, lang: l };
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
    await sendMail(a.email, ...mailIn('reset', a.lang ?? b.lang, linkFor('reset', token)));
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
    const invite = normInvite(ctx.url.searchParams.get('invite'));
    const terms = ctx.url.searchParams.get('terms') ? termsOf(ctx.url.searchParams.get('terms')) : '';
    const blob = Buffer.from(JSON.stringify({ state, verifier, name, ts: Date.now(), invite, terms })).toString('base64url');
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
      return finishOAuth(ctx, name, raw2, fail, st.invite, st.terms);
    } catch (e) { console.error('oauth error:', e.message); return fail('provider_error'); }
  });
}

function finishOAuth(ctx, name, data, fail, rawInvite, terms) {
  let subject, email = null, display = '', verifiedEmail = false;
  subject = String(data.sub ?? ''); email = data.email ? String(data.email) : null; verifiedEmail = data.email_verified === true; display = data.name ?? data.given_name ?? '';
  if (!subject || !email || !verifiedEmail) return fail('email_not_verified');
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
    if (!terms) return fail('terms_required');   // cuenta nueva: hay que aceptar Términos y Privacidad (y ser mayor de 18)
    const invite = normInvite(rawInvite);
    const inviteErr = reserveInvite(invite, eKey);
    if (inviteErr) { audit('invite_rejected', null, ctx.ipHash, `${name}:${invite.slice(0, 20)}`); return fail(inviteErr); }
    const uname = uniqueUsername(display || (email ? email.split('@')[0] : 'Grower'));
    try { accountId = q.insertAccount.run(email, eKey, uname, usernameKey(uname), null, name === 'google' ? 1 : 0, Date.now(), ctx.ipHash, ctx.uaHash, name).lastInsertRowid; }
    catch { if (cfg.inviteOnly) q.refundInvite.run(invite); return fail('signup_race'); }
    if (cfg.inviteOnly) q.logInviteUse.run(invite, accountId, Date.now());
    q.setTerms.run(terms, Date.now(), accountId);
    q.addIdentity.run(name, subject, accountId, Date.now());
    suspicious(ctx, accountId);
    welcomeGift(accountId);
    audit(`signup_${name}`, accountId, ctx.ipHash);
  }
  issueSession(ctx, accountId);
  audit(`login_${name}`, accountId, ctx.ipHash);
  return { redirect: `${cfg.publicUrl}/#auth=ok` };
}

/* ───────────────────────────── economy (wallet, ledger, NFTs owned by the server) ───────────────────────────── */

export const economy = installEconomy({ db, route, HttpError, sessionAccount, audit, limit, readJson });
export const wallet = installWallet({ db, route, HttpError, sessionAccount, audit, limit, readJson });
export const game = installGame({ db, route, HttpError, sessionAccount, audit, limit, readJson, econ: economy, sendMail, sign: (s) => hmac(SECRET, s), publicUrl: cfg.publicUrl, harvestMail: process.env.HARVEST_MAIL !== '0' });
export const bridge = await installBridge({ db, route, HttpError, sessionAccount, audit, limit, readJson, econ: economy, cfg, env: process.env });
export const panel = installPanel({ db, route, HttpError, sessionAccount, limit, seenAt, dbFile: path.join(cfg.dataDir, 'accounts.db'), readJson, telemetry: process.env.TELEMETRY_ENABLED === '1', alerts, audit, publicUrl: cfg.publicUrl });
export const founder = await installFounder({ db, route, HttpError, sessionAccount, audit, limit, readJson, env: process.env, sendMail });
// the panel's Solana section: read-only questions to the chain (wallets, payments, a transaction, where a relic is)
installChainPanel({ db, route, HttpError, guard: panel.guard, limit, bridge, founder });
// player support: «Ayuda» in the game, «Soporte» in the panel (server/support.mjs)
export const support = installSupport({ db, route, HttpError, sessionAccount, guard: panel.guard, limit, readJson, audit, alerts, sendMail, publicUrl: cfg.publicUrl });

/* ───────────────────────────── server ───────────────────────────── */

const globalHits = new Limiter();
function clientIp(req) {
  const remote = req.socket.remoteAddress ?? '';
  const v4 = remote.replace(/^::ffff:/, '');
  // detrás de un proxy propio: el mismo equipo, la red de Docker (10/8, 172.16/12, 192.168/16) o Tailscale (100.64/10)
  const loop = remote === '::1' || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(v4);
  if (cfg.trustProxy && loop) { const x = String(req.headers['x-forwarded-for'] ?? '').split(',')[0].trim(); if (x) return x; }
  return remote;
}

function send(res, status, body, ctx) {
  const headers = { ...SECURITY_HEADERS, ...(secure ? { 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains' } : {}) };
  if (ctx?.setCookies?.length) headers['Set-Cookie'] = ctx.setCookies;
  if (ctx?.cors) Object.assign(headers, { 'Access-Control-Allow-Origin': ctx.cors, Vary: 'Origin', 'Cross-Origin-Resource-Policy': 'cross-origin' });
  if (body?.redirect) { res.writeHead(302, { ...headers, Location: body.redirect }); return res.end(); }
  if (body?.__raw) { res.writeHead(status, { ...headers, 'Content-Type': body.__raw.type, 'Cache-Control': body.__raw.cache ?? 'public, max-age=300' }); return res.end(body.__raw.body); }
  headers['Content-Type'] = 'application/json; charset=utf-8';
  if (body?.retryAfter) headers['Retry-After'] = String(body.retryAfter);
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

export function createServer() {
  const server = http.createServer(async (req, res) => {
    const ctx = { req, res, setCookies: [], ip: clientIp(req), url: new URL(req.url ?? '/', 'http://x') };
    const t0 = performance.now();
    res.on('finish', () => panel.observe(ctx.url.pathname, res.statusCode, performance.now() - t0));
    ctx.ipHash = ipHashOf(ctx.ip);
    ctx.uaHash = crypto.createHash('sha256').update(`${req.headers['user-agent'] ?? ''}|${req.headers['accept-language'] ?? ''}`).digest('hex').slice(0, 16);
    try {
      if (globalHits.hit(`g:${ctx.ip}`, 300, 60_000)) throw new HttpError(429, 'rate_limited', { retryAfter: 30 });
      // el sitio de promoción vive en otro dominio: CORS solo para /api/public/* y solo para ese dominio
      const isPublic = ctx.url.pathname.startsWith('/api/public/');
      const siteOrigin = isPublic && cfg.siteOrigins.has(String(req.headers.origin ?? '')) ? String(req.headers.origin) : null;
      if (siteOrigin) ctx.cors = siteOrigin;
      if (req.method === 'OPTIONS' && isPublic) {
        if (!siteOrigin) throw new HttpError(403, 'bad_origin');
        res.writeHead(204, { 'Access-Control-Allow-Origin': siteOrigin, 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'content-type, x-cf-csrf', 'Access-Control-Max-Age': '600', Vary: 'Origin' });
        return res.end();
      }
      const handler = routes.get(`${req.method} ${ctx.url.pathname}`);
      if (!handler) throw new HttpError(404, 'not_found');
      if (req.method === 'POST') {
        const origin = req.headers.origin;
        if (origin && !originAllowed(origin) && !siteOrigin) throw new HttpError(403, 'bad_origin');
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
  if (alerts.on) void alerts.send('start', '🔄 El servidor del juego arrancó (despliegue o reinicio).');
  createServer().listen(cfg.port, cfg.host, () => console.log(`Yield Bud Empire accounts on http://${cfg.host}:${cfg.port} (public ${cfg.publicUrl}) · google=${!!providers.google.id} smtp=${!!cfg.smtpUrl}`));
}
export { db, q, limiter };
