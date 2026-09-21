// Integration tests for the account service: run with `node server/test.mjs` (Node ≥ 22).
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-auth-'));
const PORT = 30000 + Math.floor(Math.random() * 2000), MOCK = PORT + 1;
Object.assign(process.env, {
  PORT: String(PORT), HOST: '127.0.0.1', DATA_DIR: dir, PUBLIC_URL: `http://localhost:${PORT}`, TRUST_PROXY: '1', SKIP_MX: '1', DEV_EXPOSE_LINKS: '1', POW_BITS: '8', MAX_ACCOUNTS_PER_IP: '3',
  GOOGLE_CLIENT_ID: 'gid', GOOGLE_CLIENT_SECRET: 'gsec', GOOGLE_AUTH_URL: `http://127.0.0.1:${MOCK}/auth`, GOOGLE_TOKEN_URL: `http://127.0.0.1:${MOCK}/token`, GOOGLE_USER_URL: `http://127.0.0.1:${MOCK}/user/google`,
  X_CLIENT_ID: 'xid', X_CLIENT_SECRET: 'xsec', X_AUTH_URL: `http://127.0.0.1:${MOCK}/auth`, X_TOKEN_URL: `http://127.0.0.1:${MOCK}/token`, X_USER_URL: `http://127.0.0.1:${MOCK}/user/x`,
});
const { createServer, cfg, db, limiter } = await import('./index.mjs');

// mock identity provider (NOT Google or X: it only proves that our OAuth code paths behave)
const profiles = { google: {}, x: {} };
const mock = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://m');
  if (u.pathname === '/token') { req.resume(); res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ access_token: 'tok-' + Math.random() })); }
  const m = /^\/user\/(google|x)$/.exec(u.pathname);
  if (m) { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify(profiles[m[1]])); }
  res.statusCode = 404; res.end();
});
await new Promise((r) => mock.listen(MOCK, '127.0.0.1', r));
const server = createServer();
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

let failed = 0; const ok = (n, c, x = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${n} ${x}`); if (!c) failed++; };
let ipN = 10;
const newIp = () => `10.9.${Math.floor(ipN / 250)}.${ipN++ % 250}`;
const base = `http://127.0.0.1:${PORT}`;
async function call(method, p, { body, ip = '10.0.0.1', jar, headers = {}, raw } = {}) {
  const h = { 'x-forwarded-for': ip, 'user-agent': 'test', ...headers };
  if (method === 'POST' && !('x-cf-csrf' in headers)) h['x-cf-csrf'] = '1';
  if (body !== undefined && !raw) h['content-type'] = 'application/json';
  if (jar?.c) h.cookie = jar.c;
  const r = await fetch(base + p, { method, headers: h, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined), redirect: 'manual' });
  const set = r.headers.getSetCookie?.() ?? [];
  if (jar && set.length) { const m = new Map((jar.c ?? '').split('; ').filter(Boolean).map((x) => x.split(/=(.*)/s).slice(0, 2))); for (const s of set) { const [kv] = s.split(';'); const [k, v] = kv.split(/=(.*)/s); if (/Max-Age=0/i.test(s)) m.delete(k); else m.set(k, v); } jar.c = [...m].map(([k, v]) => `${k}=${v}`).join('; '); }
  let json = null; try { json = await r.json(); } catch { /* redirect */ }
  return { status: r.status, json, loc: r.headers.get('location'), set };
}
const solve = (ch) => { for (let n = 0; ; n++) { const d = crypto.createHash('sha256').update(`${ch.salt}${n}`).digest(); let bits = 0; for (const b of d) { if (b === 0) { bits += 8; continue; } bits += Math.clz32(b) - 24; break; } if (bits >= ch.bits) return { ...ch, nonce: n }; } };
const captcha = async (ip, purpose = 'register') => solve((await call('GET', `/api/auth/challenge?purpose=${purpose}`, { ip })).json);
const reg = async (o = {}) => {
  const ip = o.ip ?? newIp();
  return { ip, ...(await call('POST', '/api/auth/register', { ip, jar: o.jar, body: { email: 'a@example.com', username: 'Alpha Grower', password: 'Correct-Horse-Battery-9', t: Date.now() - 4000, hp: '', captcha: o.noCaptcha ? undefined : (o.captcha ?? await captcha(ip)), ...o.body } })) };
};
const count = () => db.prepare('SELECT COUNT(*) n FROM accounts').get().n;

// ── config / basics
const cfgRes = await call('GET', '/api/auth/config');
ok('config: Google y X configurados, captcha PoW', cfgRes.json.google && cfgRes.json.x && cfgRes.json.captcha.type === 'pow');
const hdr = await fetch(base + '/api/health');
ok('cabeceras de seguridad presentes', hdr.headers.get('x-content-type-options') === 'nosniff' && hdr.headers.get('x-frame-options') === 'DENY' && /frame-ancestors 'none'/.test(hdr.headers.get('content-security-policy') ?? '') && hdr.headers.get('cache-control') === 'no-store');

// ── sign-up + anti-bot
const jar = {};
let r = await reg({ jar, body: { email: 'alpha@example.com', username: 'Alpha Grower' } });
ok('registro correcto → pendiente de verificación', r.status === 200 && r.json.pending && !!r.json.devLink, JSON.stringify(r.json).slice(0, 80));
const alphaLink = r.json.devLink;
ok('registro: la cookie de sesión es HttpOnly + SameSite', r.set.some((s) => /cf_session=/.test(s) && /HttpOnly/i.test(s) && /SameSite=Lax/i.test(s)));
let me = await call('GET', '/api/auth/me', { jar });
ok('/me devuelve la cuenta sin verificar', me.status === 200 && me.json.account.verified === false && me.json.account.username === 'Alpha Grower');
const before = count();
r = await reg({ body: { email: 'bot@example.com', username: 'BotOne', hp: 'http://spam' } });
ok('honeypot: responde "ok" pero NO crea la cuenta', r.status === 200 && count() === before);
r = await reg({ body: { email: 'fast@example.com', username: 'FastOne', t: Date.now() - 300 } });
ok('formulario enviado en 0,3 s (bot): no crea cuenta', r.status === 200 && count() === before);
r = await reg({ noCaptcha: true, body: { email: 'nocap@example.com', username: 'NoCap' } });
ok('sin captcha: rechazado', r.status === 400 && r.json.error === 'captcha_missing');
const ipR = newIp(); const solved = await captcha(ipR);
await reg({ ip: ipR, captcha: solved, body: { email: 'replay1@example.com', username: 'Replay One' } });
r = await reg({ ip: ipR, captcha: solved, body: { email: 'replay2@example.com', username: 'Replay Two' } });
ok('captcha reutilizado: rechazado (un solo uso)', r.status === 400 && r.json.error === 'captcha_replayed');
const wrong = { ...(await call('GET', '/api/auth/challenge', { ip: ipR })).json, nonce: 1 };
r = await reg({ ip: ipR, captcha: { ...wrong, bits: 1 }, body: { email: 'w@example.com', username: 'Wrongo' } });
ok('captcha con firma manipulada o trabajo falso: rechazado', r.status === 400 && /captcha_(invalid|wrong|weak)/.test(r.json.error), r.json.error);
r = await reg({ body: { email: 'weak@example.com', username: 'Weakling', password: 'password123' } });
ok('contraseña débil rechazada', r.status === 400 && r.json.error === 'password_weak');
r = await reg({ body: { email: 'x@mailinator.com', username: 'Tempo Mail' } });
ok('correo desechable rechazado', r.status === 400 && r.json.error === 'email_disposable');
r = await reg({ body: { email: 'bad-email', username: 'Nomail' } });
ok('correo inválido rechazado', r.status === 400 && r.json.error === 'email_invalid');

// ── duplicates
const n1 = count();
r = await reg({ body: { email: 'John.Doe+spam@gmail.com', username: 'John Doe' } });
r = await reg({ body: { email: 'johndoe@googlemail.com', username: 'Otro Nombre' } });
ok('alias de Gmail (puntos, +tag, googlemail) = misma cuenta: no se duplica', count() === n1 + 1 && r.json.pending === true);
r = await reg({ body: { email: 'carlos@example.com', username: 'Pedro' } });
r = await reg({ body: { email: 'carlos2@example.com', username: 'Pеdro' } });   // Cyrillic е
ok('usuario con letras cirílicas parecidas: detectado como duplicado', r.status === 409 && r.json.error === 'username_taken');
r = await reg({ body: { email: 'z@example.com', username: 'Аdmin' } });          // Cyrillic А
ok('nombre reservado (Admin con homoglifo) bloqueado', r.status === 400 && r.json.error === 'username_reserved');
r = await reg({ body: { email: 'alpha@example.com', username: 'Alpha Otro' } });
ok('correo ya registrado: misma respuesta (no revela que existe)', r.status === 200 && r.json.pending === true);

// ── rate limits and per-IP caps
const ipCap = newIp(); let last;
for (let i = 0; i < 4; i++) last = await reg({ ip: ipCap, body: { email: `cap${i}@example.com`, username: `Cap Grower ${i}` } });
ok('máximo de cuentas por IP (3 en 24 h): la cuarta se bloquea', last.status === 429 && last.json.error === 'ip_account_limit', last.json.error);
const ipFlood = newIp(); let codes = [];
for (let i = 0; i < 7; i++) codes.push((await reg({ ip: ipFlood, body: { email: `flood${i}@example.com`, username: `Flood ${i}x` } })).status);
ok('inundación de registros desde una IP: limitada (429)', codes.includes(429), codes.join(','));
const powBase = (await call('GET', '/api/auth/challenge', { ip: newIp() })).json.bits;
const ipBad = newIp();
for (let i = 0; i < 6; i++) await reg({ ip: ipBad, captcha: { ...wrong, bits: 1 }, body: { email: `bad${i}@example.com`, username: `Bad Actor ${i}` } });
const powBits = (await call('GET', '/api/auth/challenge', { ip: ipBad })).json.bits;
ok('el captcha solo se encarece para una IP que FALLA la verificación (hasta +2 bits)', powBits > powBase && powBits <= powBase + 2, `(${powBits} bits vs ${powBase} base)`);
const powOk = (await call('GET', '/api/auth/challenge', { ip: ipFlood })).json.bits;
ok('acceder varias veces con éxito NO encarece la verificación', powOk === powBase, `(${powOk} vs ${powBase})`);

// ── e-mail verification
const token = new URL(alphaLink).hash.replace('#verify=', '');
r = await call('POST', '/api/auth/verify', { body: { token: 'nope' } });
ok('verificación: token falso rechazado', r.status === 400);
r = await call('POST', '/api/auth/verify', { body: { token } });
me = await call('GET', '/api/auth/me', { jar });
ok('verificación: el token válido confirma la cuenta', r.status === 200 && me.json.account.verified === true);
r = await call('POST', '/api/auth/verify', { body: { token } });
ok('verificación: el token no se puede reutilizar', r.status === 400);

// ── login, lockout, sessions
const jar2 = {};
r = await call('POST', '/api/auth/login', { jar: jar2, ip: newIp(), body: { identifier: 'alpha@example.com', password: 'Correct-Horse-Battery-9' } });
ok('login con correo correcto', r.status === 200 && r.json.account.username === 'Alpha Grower');
r = await call('POST', '/api/auth/login', { ip: newIp(), body: { identifier: 'alpha grower', password: 'Correct-Horse-Battery-9' } });
ok('login con nombre de usuario (sin distinguir mayúsculas)', r.status === 200);
const ipL = newIp();
const e1 = await call('POST', '/api/auth/login', { ip: ipL, body: { identifier: 'nadie@example.com', password: 'Wrong-Password-1' } });
const e2 = await call('POST', '/api/auth/login', { ip: ipL, body: { identifier: 'alpha@example.com', password: 'Wrong-Password-1' } });
ok('error genérico: no revela si el usuario existe', e1.status === 401 && e2.status === 401 && e1.json.error === 'bad_credentials' && e2.json.error === 'bad_credentials');
await call('POST', '/api/auth/login', { ip: ipL, body: { identifier: 'alpha@example.com', password: 'Wrong-Password-2' } });
await call('POST', '/api/auth/login', { ip: ipL, body: { identifier: 'alpha@example.com', password: 'Wrong-Password-3' } });
r = await call('POST', '/api/auth/login', { ip: newIp(), body: { identifier: 'alpha@example.com', password: 'Correct-Horse-Battery-9' } });
ok('tras 3 fallos la cuenta se bloquea un rato (fuerza bruta), aun con la contraseña correcta', r.status === 429 && r.json.error === 'account_locked' && r.json.retryAfter > 0, `${r.status} ${r.json.error}`);
db.prepare("UPDATE accounts SET locked_until = 0 WHERE email_key = 'alpha@example.com'").run();
r = await call('POST', '/api/auth/login', { ip: newIp(), body: { identifier: 'alpha@example.com', password: 'Correct-Horse-Battery-9' } });
ok('con 3+ fallos previos el login exige captcha', r.status === 400 && r.json.error === 'captcha_missing', r.json.error);
const ipC = newIp();
r = await call('POST', '/api/auth/login', { ip: ipC, body: { identifier: 'alpha@example.com', password: 'Correct-Horse-Battery-9', captcha: await captcha(ipC, 'login') } });
ok('con captcha resuelto el login correcto entra y limpia los fallos', r.status === 200);
await call('POST', '/api/auth/logout', { jar: jar2 });
me = await call('GET', '/api/auth/me', { jar: jar2 });
ok('logout invalida la sesión', me.status === 401);

// ── CSRF / origin / body checks
r = await call('POST', '/api/auth/logout', { headers: { 'x-cf-csrf': '0' } });
ok('CSRF: POST sin la cabecera personalizada → 403', r.status === 403);
r = await call('POST', '/api/auth/logout', { headers: { origin: 'https://evil.example' } });
ok('CSRF: origen no permitido → 403', r.status === 403);
r = await call('POST', '/api/auth/verify', { raw: 'x'.repeat(20000), headers: { 'content-type': 'application/json' } });
ok('cuerpo enorme → 413 (no se lee entero)', r.status === 413, String(r.status));
r = await call('POST', '/api/auth/verify', { raw: 'token=abc', headers: { 'content-type': 'text/plain' } });
ok('tipo de contenido distinto de JSON → 415', r.status === 415);
r = await call('GET', '/api/nada');
ok('ruta desconocida → 404 sin detalles internos', r.status === 404 && r.json.error === 'not_found');

// ── password reset revokes sessions
const jar3 = {}; await call('POST', '/api/auth/login', { jar: jar3, ip: newIp(), body: { identifier: 'alpha@example.com', password: 'Correct-Horse-Battery-9', captcha: await captcha('10.7.7.7', 'login') } }).catch(() => {});
limiter.m.clear();   // the test has used up the per-identifier login budget on purpose
const ipRs = newIp();
r = await call('POST', '/api/auth/reset/request', { ip: ipRs, body: { email: 'alpha@example.com', captcha: await captcha(ipRs, 'reset') } });
const rt = new URL(r.json.devLink).hash.replace('#reset=', '');
r = await call('POST', '/api/auth/reset/confirm', { body: { token: rt, password: '123456' } });
ok('restablecer: la contraseña nueva también debe ser fuerte', r.status === 400 && r.json.error === 'password_weak');
r = await call('POST', '/api/auth/reset/confirm', { body: { token: rt, password: 'Brand-New-Passphrase-77' } });
me = await call('GET', '/api/auth/me', { jar });
ok('restablecer: cambia la contraseña y cierra TODAS las sesiones', r.status === 200 && me.status === 401);
r = await call('POST', '/api/auth/login', { ip: newIp(), body: { identifier: 'alpha@example.com', password: 'Brand-New-Passphrase-77', captcha: await captcha('10.7.7.8', 'login') } });
ok('restablecer: la contraseña nueva funciona', r.status === 200, r.json?.error);
const ipRs2 = newIp();
r = await call('POST', '/api/auth/reset/request', { ip: ipRs2, body: { email: 'no-existe@example.com', captcha: await captcha(ipRs2, 'reset') } });
ok('restablecer: misma respuesta si el correo no existe', r.status === 200 && r.json.ok === true && !r.json.devLink);

// ── OAuth (Google) against the mock provider
async function oauth(name, profile, ip = newIp(), jarO = {}) {
  profiles[name] = profile;
  const s = await call('GET', `/api/auth/${name}/start`, { ip, jar: jarO });
  const loc = new URL(s.loc ?? 'http://x/');
  const cb = await call('GET', `/api/auth/${name}/callback?code=abc&state=${loc.searchParams.get('state')}`, { ip, jar: jarO });
  return { s, loc, cb, jar: jarO };
}
let g = await oauth('google', { sub: 'g-1', email: 'gina@gmail.com', email_verified: true, name: 'Gina Verde' });
ok('Google: start redirige con PKCE S256 + state', g.s.status === 302 && g.loc.searchParams.get('code_challenge_method') === 'S256' && !!g.loc.searchParams.get('state') && g.loc.searchParams.get('client_id') === 'gid');
ok('Google: alta nueva con sesión y cuenta verificada', g.cb.status === 302 && /#auth=ok$/.test(g.cb.loc) && (await call('GET', '/api/auth/me', { jar: g.jar })).json.account.verified === true);
const ga = db.prepare("SELECT * FROM accounts WHERE email_key = 'gina@gmail.com'").get();
g = await oauth('google', { sub: 'g-1', email: 'gina@gmail.com', email_verified: true, name: 'Gina Verde' });
ok('Google: segundo login = misma cuenta (no duplica)', db.prepare("SELECT COUNT(*) n FROM accounts WHERE email_key = 'gina@gmail.com'").get().n === 1 && g.cb.status === 302);
// state forged
const forged = await call('GET', '/api/auth/google/callback?code=abc&state=forged', { ip: newIp(), jar: {} });
ok('OAuth: state falso o sin cookie → error (protección CSRF/login-CSRF)', /auth_error=state_invalid/.test(forged.loc ?? ''));
g = await oauth('google', { sub: 'g-2', email: 'sin-verificar@gmail.com', email_verified: false, name: 'X' });
ok('Google: correo sin verificar por Google → rechazado', /auth_error=email_not_verified/.test(g.cb.loc ?? ''));
// pre-hijack: attacker registered victim@example.com with a password, victim later signs in with Google
await reg({ body: { email: 'victima@gmail.com', username: 'Atacante Hijack', password: 'Attacker-Password-12' } });
g = await oauth('google', { sub: 'g-3', email: 'victima@gmail.com', email_verified: true, name: 'Víctima' });
const vict = db.prepare("SELECT * FROM accounts WHERE email_key = 'victima@gmail.com'").get();
ok('anti pre-hijack: al vincular Google se anula la contraseña del atacante', vict.pass_hash === null && vict.email_verified === 1);
r = await call('POST', '/api/auth/login', { ip: newIp(), body: { identifier: 'victima@gmail.com', password: 'Attacker-Password-12' } });
ok('anti pre-hijack: el atacante ya no puede entrar', r.status === 401 || r.status === 400);
// X
let xo = await oauth('x', { data: { id: 'x-9', username: 'nuevita', name: 'Nuevita', created_at: new Date(Date.now() - 5 * 86400_000).toISOString(), public_metrics: { followers_count: 50 } } });
ok('X: cuenta de 5 días → rechazada (filtro anti-bots)', /auth_error=x_account_too_new/.test(xo.cb.loc ?? ''));
xo = await oauth('x', { data: { id: 'x-10', username: 'veterana', name: 'Veterana', created_at: new Date(Date.now() - 900 * 86400_000).toISOString(), public_metrics: { followers_count: 120 } } });
ok('X: cuenta antigua → alta sin correo y con sesión', /#auth=ok$/.test(xo.cb.loc ?? '') && db.prepare("SELECT source, email FROM accounts WHERE source = 'x'").get()?.email === null);
// provider not configured
// bad callback params
r = await call('GET', '/api/auth/google/callback?error=access_denied&state=x', { ip: newIp() });
ok('OAuth: callback con error del proveedor no crea nada', /auth_error=/.test(r.loc ?? ''));

// ── resilience
const sockets = await Promise.all(Array.from({ length: 30 }, () => call('GET', '/api/health', { ip: '10.5.5.5' })));
ok('carga: 30 peticiones simultáneas responden bien', sockets.every((x) => x.status === 200 || x.status === 429));
const flood = []; for (let i = 0; i < 320; i++) flood.push((await call('GET', '/api/health', { ip: '10.6.6.6' })).status);
ok('límite global por IP: pasadas 300 peticiones/min responde 429', flood.includes(429), `(${flood.filter((s) => s === 429).length} bloqueadas)`);
r = await call('GET', '/api/health', { ip: '10.4.4.4' });
ok('el servidor sigue sano tras el abuso', r.status === 200);
const flagged = db.prepare("SELECT COUNT(*) n FROM accounts WHERE flags LIKE '%multi_account_ip%'").get().n;
ok('cuentas sospechosas (varias por IP) quedan marcadas para revisión', flagged >= 1, `(${flagged} marcadas)`);
const stored = db.prepare("SELECT pass_hash FROM accounts WHERE pass_hash IS NOT NULL LIMIT 1").get().pass_hash;
ok('contraseñas guardadas con scrypt + sal + pepper (nunca en claro)', stored.startsWith('scrypt$') && !stored.includes('Correct-Horse'));
const sess = db.prepare('SELECT id_hash FROM sessions LIMIT 1').get().id_hash;
ok('tokens de sesión guardados solo como hash SHA-256', /^[0-9a-f]{64}$/.test(sess));

console.log(failed ? `\n${failed} FALLOS` : '\nTodo OK');
server.close(); mock.close();
fs.rmSync(dir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
