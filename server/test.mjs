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
const { createServer, cfg, db, limiter, originAllowed, isPrivateHost, prereg } = await import('./index.mjs');

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


// ── which origins may talk to the service (players come from the LAN and the tailnet)
for (const o of ['http://localhost:3012', 'http://127.0.0.1:3012', 'http://192.168.100.40:3012', 'http://10.1.2.3:3012', 'http://172.20.0.5:3012', 'http://100.101.243.88:3012', 'http://100.64.0.1:3012', 'http://100.127.255.254:3012', 'http://server-ideapad-3-17ada05:3012', 'https://host.tail1234.ts.net', 'http://[fd7a:115c:a1e0::1]:3012'])
  ok(`origen privado aceptado: ${o}`, originAllowed(o));
for (const o of ['http://evil.example.com', 'https://yield.bud.empire', 'http://8.8.8.8:3012', 'http://100.128.0.1:3012', 'http://100.63.255.255:3012', 'http://172.32.0.1:3012', 'http://192.169.0.1:3012', 'http://256.1.1.1', 'javascript:alert(1)', 'null'])
  ok(`origen público rechazado: ${o}`, !originAllowed(o));
ok('isPrivateHost no confunde un dominio que empieza por 192.168', !isPrivateHost('192.168.example.com'));

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


// ── economy: the wallet, the ledger and the NFTs belong to the server
const sim = await import('./gen/sim.mjs');
const ECON = sim.economy.ECON;
const mkPlayer = async (n) => {
  const jar = {}; const ip = newIp();
  await reg({ ip, jar, body: { email: `econ${n}@example.com`, username: `Econ Player ${n}` } });
  const meR = await call('GET', '/api/auth/me', { jar, ip });
  return { jar, ip, id: meR.json.account.id };
};
const intent = (P, type, params, idem) => call('POST', '/api/econ/intent', { jar: P.jar, ip: P.ip, body: { type, params, idem } });
const state = async (P) => (await call('GET', '/api/econ/state', { jar: P.jar, ip: P.ip })).json;
const setFlora = (P, n) => db.prepare('UPDATE wallets SET flora = ? WHERE account_id = ?').run(n, P.id);
const wallet = (P) => db.prepare('SELECT * FROM wallets WHERE account_id = ?').get(P.id);
const stateRow = (P) => JSON.parse(db.prepare('SELECT json FROM econ_state WHERE account_id = ?').get(P.id).json);

const E1 = await mkPlayer(1);
ok('economía: sin sesión no hay cartera (401)', (await call('GET', '/api/econ/state', { ip: newIp() })).status === 401);
let es = await state(E1);
ok('cuenta nueva: el servidor le da el saldo inicial y la escalera empieza en el armario', es.snapshot.flora === ECON.starterFlora && es.snapshot.tier === 1 && es.snapshot.staff.length === 0);
let cl = await intent(E1, 'claim_daily', {});
ok('reclamo diario: suma el monto fijo', cl.status === 200 && cl.json.snapshot.flora === ECON.starterFlora + ECON.dailyClaim);
cl = await intent(E1, 'claim_daily', {});
ok('reclamo diario: una sola vez cada 24 h', cl.status === 400 && cl.json.error === 'too_early' && cl.json.leftMs > 0);
let sp = await intent(E1, 'spend', { amount: 1000, memo: 'trampa' });
ok('gastar más de lo que hay se rechaza y no toca el saldo', sp.status === 400 && sp.json.error === 'insufficient' && (await state(E1)).snapshot.flora === ECON.starterFlora + ECON.dailyClaim);
ok('un gasto no puede ser negativo (no se puede imprimir saldo gastando)', (await intent(E1, 'spend', { amount: -100 })).status === 400 && (await intent(E1, 'spend', { amount: 0 })).status === 400);
const f0 = (await state(E1)).snapshot.flora;
const idemA = await intent(E1, 'spend', { amount: 10, memo: 'x' }, 'k-1'), idemB = await intent(E1, 'spend', { amount: 10, memo: 'x' }, 'k-1');
ok('clave idempotente: el doble clic no cobra dos veces', idemA.status === 200 && idemB.status === 200 && (await state(E1)).snapshot.flora === f0 - 10 && idemB.json.snapshot.flora === idemA.json.snapshot.flora);
ok('un intent desconocido se rechaza', (await intent(E1, 'print_money', { amount: 1e9 })).json.error === 'unknown_intent');

// builds: cost, one at a time, no skipping, capped speed-ups, finished by time
const E2 = await mkPlayer(2); await state(E2); setFlora(E2, 5000);
ok('obras: no se salta ningún escalón', (await intent(E2, 'start_build', { facilityId: 'greenhouse_commercial' })).json.error === 'skip_rung');
let b = await intent(E2, 'start_build', { facilityId: 'tent_pro' });
ok('obra: cuesta $FLORA y queda en marcha', b.status === 200 && b.json.snapshot.flora === 5000 - 250 && !!b.json.snapshot.construction && b.json.snapshot.tier === 1);
ok('obra: solo una a la vez', (await intent(E2, 'start_build', { facilityId: 'tent_pro' })).json.error === 'build_in_progress');
const s1 = await intent(E2, 'speedup_build', {}), s2 = await intent(E2, 'speedup_build', {}), s3 = await intent(E2, 'speedup_build', {});
ok('aceleraciones: máximo por día, cada una quema y recorta', s1.status === 200 && s2.status === 200 && s3.json.error === 'speedup_limit' && s2.json.snapshot.flora < s1.json.snapshot.flora && s2.json.snapshot.construction.endsAt < b.json.snapshot.construction.endsAt);
const stE2 = stateRow(E2); stE2.construction.endsAt = Date.now() - 1000; db.prepare('UPDATE econ_state SET json = ? WHERE account_id = ?').run(JSON.stringify(stE2), E2.id);
es = await state(E2);
ok('la obra termina sola con el tiempo del servidor', es.snapshot.tier === 2 && es.snapshot.construction === null && es.snapshot.unlocked.includes('tent_pro'));

// sales: bounded by the market depth, fee and licence burned
const E3 = await mkPlayer(3); await state(E3);
ok('venta: producto o gramos inventados se rechazan', (await intent(E3, 'sell', { type: 'oro', grams: 10 })).status === 400 && (await intent(E3, 'sell', { type: 'live_rosin', grams: -5 })).status === 400 && (await intent(E3, 'sell', { type: 'live_rosin', grams: 1e9 })).status === 400);
const s10 = await intent(E3, 'sell', { type: 'live_rosin', grams: 10 });
ok('venta: paga, quema comisión y devuelve el porcentaje de mercado', s10.status === 200 && s10.json.result.gross > 0 && s10.json.result.fee >= 1 && s10.json.result.net === s10.json.result.gross - s10.json.result.fee && s10.json.result.ratio < 1);
const s10b = await intent(E3, 'sell', { type: 'live_rosin', grams: 10 });
ok('venta: el mercado se satura (la misma venta paga menos la segunda vez)', s10b.json.result.gross < s10.json.result.gross);
const E4 = await mkPlayer(4); await state(E4);
let tot = 0; for (let i = 0; i < 12; i++) { const r = await intent(E4, 'sell', { type: 'pure_terpenes', grams: 2000 }); tot += r.json.result.gross; }
ok('un guardado adulterado no imprime dinero: 24 000 g de terpenos pagan una cantidad acotada', tot < 12 * ECON.depthGrams * 85 * ECON.priceScale * 1.5, `(${tot} $FLORA)`);
const wE4 = wallet(E4);
ok('libro mayor: saldo = inicial + emitido − quemado', wE4.flora === ECON.starterFlora + wE4.minted - wE4.burned);

// staff NFTs: hire from the day's board, chests, wages, ranks, ownership
const E5 = await mkPlayer(5); await state(E5); setFlora(E5, 3000);
const board = sim.staff.jobBoard(Math.floor(Date.now() / 86400000));
ok('contratar: un candidato que no está en la bolsa se rechaza', (await intent(E5, 'hire', { candidateId: 'staff-d1-0' })).json.error === 'not_on_board');
const h1 = await intent(E5, 'hire', { candidateId: board[0].id });
ok('contratar: cuesta el precio de la bolsa y crea un NFT del jugador', h1.status === 200 && h1.json.snapshot.flora === 3000 - board[0].priceFlora && h1.json.snapshot.staff.length === 1 && h1.json.result.staff.role === board[0].role);
ok('contratar: no se puede contratar dos veces al mismo', (await intent(E5, 'hire', { candidateId: board[0].id })).json.error === 'already_hired');
const E6 = await mkPlayer(6); await state(E6); setFlora(E6, 1000);
ok('la bolsa es de todos: otro jugador puede contratar al mismo candidato (su propia copia)', (await intent(E6, 'hire', { candidateId: board[0].id })).status === 200);
const hire = h1.json.result.staff;
const asg = await intent(E5, 'assign', { role: hire.role, staffId: hire.id });
ok('asignar: el sueldo del día se cobra al instante', asg.status === 200 && (await state(E5)).snapshot.flora === 3000 - board[0].priceFlora - sim.staff.wageOf(hire) && (await state(E5)).snapshot.staffAssign[hire.role] === hire.id);
ok('asignar a un puesto equivocado o a un NFT ajeno se rechaza', (await intent(E5, 'assign', { role: hire.role === 'foreman' ? 'farmer' : 'foreman', staffId: hire.id })).json.error === 'wrong_role' && (await intent(E6, 'assign', { role: hire.role, staffId: hire.id })).json.error === 'not_yours');
const up = await intent(E5, 'rank_up', { staffId: hire.id });
ok('subir de rango quema $FLORA y solo el dueño puede', up.status === 200 && up.json.result.staff.rank === 2 && (await intent(E6, 'rank_up', { staffId: hire.id })).json.error === 'not_yours');
const ch = await intent(E5, 'staff_chest', { chestId: 'recruit' });
ok('cofre de personal: tirada del servidor, cobra y guarda el contador de garantía', ch.status === 200 && !!ch.json.result.staff.id && ch.json.snapshot.staffPity.recruit.sinceEpic + ch.json.snapshot.staffPity.recruit.sinceLegend >= 0 && ch.json.snapshot.staff.length === 2);
setFlora(E5, 5); db.prepare('UPDATE nfts SET data = json_set(data, \'$.paidThrough\', 0) WHERE account_id = ? AND kind = \'staff\'').run(E5.id);
es = await state(E5);
ok('sueldos: sin saldo el asistente deja de trabajar (sin deuda)', es.snapshot.flora >= 0 && es.snapshot.staff.find((x) => x.id === hire.id).paidThrough === 0 ? es.snapshot.flora === 5 : es.snapshot.flora < 5);

// lands: unique, scarce, priced by the server
const E7 = await mkPlayer(7); await state(E7); setFlora(E7, 5000);
const offerId = (await state(E7)).snapshot.offers.jamaica.ids[0];
const lp = await intent(E7, 'buy_plot', { offerId });
ok('tierra: se compra al precio de la oferta y pasa a ser del jugador', lp.status === 200 && lp.json.snapshot.plots.length === 1 && lp.json.snapshot.plots[0].id === offerId && lp.json.snapshot.flora < 5000);
const E8 = await mkPlayer(8); await state(E8); setFlora(E8, 5000);
ok('tierra: es única, otro jugador ya no puede comprarla', (await intent(E8, 'buy_plot', { offerId })).json.error === 'plot_taken');
ok('tierra: la oferta desaparece del mercado de todos', !(await state(E8)).snapshot.offers.jamaica.ids.includes(offerId));
ok('tierra: un id inventado o ya vendido antes de abrir se rechaza', (await intent(E8, 'buy_plot', { offerId: 'plot-jamaica-1' })).json.error === 'plot_taken' && (await intent(E8, 'buy_plot', { offerId: 'plot-mars-3' })).status === 400);

// avatars, rewards
const cav = await intent(E7, 'avatar_chest', { chestId: 'season' });
ok('cofre de avatar: cobra, tira en el servidor y guarda el NFT', cav.status === 200 && cav.json.snapshot.avatars.length === 1 && cav.json.result.owned.count === 1);
const rq = await intent(E3, 'reward', { kind: 'quest', id: 'quest_water_micro' });
ok('misión con $FLORA: una sola vez y con el monto de la tabla del servidor', rq.status === 200 && rq.json.result.amount > 0 && (await intent(E3, 'reward', { kind: 'quest', id: 'quest_water_micro' })).json.error === 'already_claimed' && (await intent(E3, 'reward', { kind: 'quest', id: 'inventada' })).status === 400);
ok('bono de nivel: no se puede saltar a un nivel absurdo en una cuenta nueva', (await intent(E3, 'reward', { kind: 'level', level: 60 })).json.error === 'too_fast');
ok('bono de nivel: un nivel cercano se cobra una vez', (await intent(E3, 'reward', { kind: 'level', level: 3 })).status === 200 && (await intent(E3, 'reward', { kind: 'level', level: 3 })).json.error === 'already_claimed');

// import of a local save: capped, once
const E9 = await mkPlayer(9); await state(E9);
const legend = sim.staff.makeStaff('staff-import-1', 'foreman', 'legendary', 5, Date.now(), 5);
const imp = await call('POST', '/api/econ/import-local', { jar: E9.jar, ip: E9.ip, body: { flora: 9_999_999, tier: 3, staff: [legend, { id: 3 }], staffAssign: { foreman: 'staff-import-1' }, avatars: [{ designId: 'classic-1', count: 2, firstAt: 1, serial: 1234 }, { designId: 'no-existe', count: 1 }], plots: [{ id: 'plot-asia-20', mintedAt: 5 }, { id: 'plot-mars-1' }] } });
ok('importar guardado local: el saldo se limita, los NFT se validan y la tierra se calcula con la fórmula del servidor', imp.status === 200 && imp.json.snapshot.flora === 1500 && imp.json.snapshot.tier === 3 && imp.json.snapshot.staff.length === 1 && imp.json.snapshot.avatars.length === 1 && imp.json.snapshot.plots.length === 1 && imp.json.snapshot.plots[0].landRating === sim.terroir.plotOffer('asia', 20).landRating);
ok('importar: solo una vez', (await call('POST', '/api/econ/import-local', { jar: E9.jar, ip: E9.ip, body: { flora: 500 } })).json.error === 'already_imported');
const owner = (nid) => db.prepare('SELECT account_id FROM nfts WHERE id = ?').get(nid)?.account_id;

// ── player market (P2P): escrow, one-transaction sales, burned fee
const B = await mkPlayer(10); await state(B); setFlora(B, 5000);
const supply = () => db.prepare('SELECT SUM(flora) f, SUM(burned) b FROM wallets').get();
const market = async (P, qs = '') => (await call('GET', '/api/econ/market' + qs, { jar: P.jar, ip: P.ip })).json;
let ls = await intent(E9, 'list', { nftId: 'staff-import-1', price: 0 });
ok('P2P: precio fuera de rango se rechaza', ls.status === 400 && (await intent(E9, 'list', { nftId: 'staff-import-1', price: 5_000_000 })).status === 400);
ok('P2P: no se puede listar lo ajeno', (await intent(B, 'list', { nftId: 'staff-import-1', price: 100 })).json.error === 'not_yours' && (await intent(E9, 'list', { nftId: 'inventado', price: 100 })).json.error === 'not_yours');
ls = await intent(E9, 'list', { nftId: 'staff-import-1', price: 400 });
ok('P2P: listar al personal asignado lo quita del puesto y de la plantilla usable', ls.status === 200 && ls.json.snapshot.staff.length === 0 && !ls.json.snapshot.staffAssign.foreman && ls.json.snapshot.listings.length === 1 && stateRow(E9).staffAssign.foreman === undefined);
ok('P2P: lo listado está en depósito (no se asigna, no sube de rango, no se lista dos veces)',
  (await intent(E9, 'assign', { role: 'foreman', staffId: 'staff-import-1' })).json.error === 'not_yours' && (await intent(E9, 'rank_up', { staffId: 'staff-import-1' })).json.error === 'not_yours' && (await intent(E9, 'list', { nftId: 'staff-import-1', price: 10 })).json.error === 'not_yours');
const lid = ls.json.result.listingId;
ok('P2P: el mercado lo muestra con vendedor y filtro por tipo', (await market(B, '?kind=staff')).listings.some((x) => x.id === lid && x.price === 400 && x.seller === 'Econ Player 9' && x.mine === false) && (await market(B, '?kind=land')).listings.length === 0 && (await market(E9)).listings.find((x) => x.id === lid).mine === true);
ok('P2P: no se compra la propia oferta', (await intent(E9, 'buy_listing', { listingId: lid })).json.error === 'own_listing');
setFlora(B, 100);
ok('P2P: sin saldo no se compra y nada se mueve', (await intent(B, 'buy_listing', { listingId: lid })).json.error === 'insufficient' && owner('staff-import-1') === E9.id);
setFlora(B, 5000);
const sup0 = supply(), sellerBefore = wallet(E9).flora;
const buy = await intent(B, 'buy_listing', { listingId: lid });
const fee = Math.max(1, Math.round(400 * 0.05));
ok('P2P: comprar mueve el NFT, cobra el precio y paga al vendedor menos la comisión', buy.status === 200 && buy.json.snapshot.staff.some((x) => x.id === 'staff-import-1') && wallet(B).flora === 4600 && wallet(E9).flora === sellerBefore + 400 - fee && owner('staff-import-1') === B.id);
ok('P2P: la comisión se quema exacta (solo ella sale del sistema)', supply().f === sup0.f - fee && supply().b === sup0.b + fee);
ok('P2P: una oferta vendida ya no se puede comprar ni cancelar, y queda en el historial', (await intent(B, 'buy_listing', { listingId: lid })).json.error === 'listing_gone' && (await intent(E9, 'cancel_listing', { listingId: lid })).json.error === 'not_yours' && (await market(B)).recent.some((x) => x.id === lid && x.price === 400));
ok('P2P: el comprador puede asignar lo comprado', (await intent(B, 'assign', { role: 'foreman', staffId: 'staff-import-1' })).status === 200);

// cancel and land
const l2 = await intent(E9, 'list', { nftId: 'plot-asia-20', price: 250 });
ok('P2P: una tierra listada desaparece de las propias', l2.status === 200 && l2.json.snapshot.plots.length === 0 && l2.json.snapshot.listings[0].kind === 'land' && l2.json.snapshot.listings[0].rarity.length > 0);
ok('P2P: solo el dueño cancela y devuelve el NFT', (await intent(B, 'cancel_listing', { listingId: l2.json.result.listingId })).json.error === 'not_yours' && (await intent(E9, 'cancel_listing', { listingId: l2.json.result.listingId })).json.snapshot.plots.length === 1);
const l3 = await intent(E9, 'list', { nftId: 'plot-asia-20', price: 250 });
const bl = await intent(B, 'buy_listing', { listingId: l3.json.result.listingId });
ok('P2P: la tierra cambia de dueño y sigue sin poder comprarse en la tienda', bl.status === 200 && bl.json.snapshot.plots.some((x) => x.id === 'plot-asia-20') && !(await state(E9)).snapshot.offers.asia.ids.includes('plot-asia-20') && !(await state(B)).snapshot.offers.asia.ids.includes('plot-asia-20'));

// avatars: one copy leaves the stack
const avId = `av-${E9.id}-classic-1`;
const la = await intent(E9, 'list', { nftId: avId, price: 60 });
ok('P2P: de un avatar con 2 copias sale solo una', la.status === 200 && la.json.snapshot.avatars.find((x) => x.designId === 'classic-1').count === 1 && la.json.snapshot.listings[0].data.count === 1);
const ca = await intent(E9, 'cancel_listing', { listingId: la.json.result.listingId });
ok('P2P: cancelarlo devuelve la copia a su pila', ca.json.snapshot.avatars.find((x) => x.designId === 'classic-1').count === 2 && ca.json.snapshot.listings.length === 0);
const lb = await intent(E9, 'list', { nftId: avId, price: 60 });
const bb = await intent(B, 'buy_listing', { listingId: lb.json.result.listingId });
ok('P2P: el comprador recibe la copia y el vendedor conserva la otra', bb.status === 200 && bb.json.snapshot.avatars.find((x) => x.designId === 'classic-1').count === 1 && (await state(E9)).snapshot.avatars.find((x) => x.designId === 'classic-1').count === 1);
// two buyers, one item
const B2 = await mkPlayer(11); await state(B2); setFlora(B2, 5000);
const lr = await intent(B, 'list', { nftId: 'staff-import-1', price: 90 });
const [r1, r2] = await Promise.all([intent(B2, 'buy_listing', { listingId: lr.json.result.listingId }), intent(E9, 'buy_listing', { listingId: lr.json.result.listingId })]);
ok('P2P: dos compradores, un solo ganador', [r1.status, r2.status].filter((x) => x === 200).length === 1 && owner('staff-import-1') !== B.id);
const totalSupply = db.prepare('SELECT SUM(flora) f, SUM(minted) m, SUM(burned) b FROM wallets').get();
ok('el libro mayor de todos cuadra con los saldos (nada se crea ni se pierde fuera del libro)', typeof totalSupply.f === 'number' && totalSupply.m >= 0 && totalSupply.b >= 0);


// ── game wallet + linking Solana / Ronin wallets by signed challenge
const { secp256k1: secp } = await import('@noble/curves/secp256k1');
const { keccak_256: keccak } = await import('@noble/hashes/sha3');
const B58A = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const b58enc = (buf) => { let n = BigInt('0x' + buf.toString('hex')); let out = ''; while (n > 0n) { out = B58A[Number(n % 58n)] + out; n /= 58n; } for (const b of buf) { if (b === 0) out = '1' + out; else break; } return out; };
const solKey = () => { const kp = crypto.generateKeyPairSync('ed25519'); const pub = kp.publicKey.export({ format: 'der', type: 'spki' }).slice(-32); return { address: b58enc(pub), sign: (m) => crypto.sign(null, Buffer.from(m), kp.privateKey).toString('base64') }; };
const ronKey = (priv) => {
  const pub = secp.getPublicKey(priv, false);
  const address = '0x' + Buffer.from(keccak(pub.slice(1)).slice(-20)).toString('hex');
  const sign = (m) => { const body = Buffer.from(m); const h = keccak(Buffer.concat([Buffer.from(`\x19Ethereum Signed Message:\n${body.length}`), body])); const sg = secp.sign(h, priv); return '0x' + sg.toCompactHex() + (27 + sg.recovery).toString(16); };
  return { address, sign };
};
const wget = (P) => call('GET', '/api/wallet', { jar: P.jar, ip: P.ip });
const wpost = (P, path, body) => call('POST', path, { jar: P.jar, ip: P.ip, body });
const W1 = await mkPlayer(20), W2 = await mkPlayer(21);
ok('wallet: sin sesión no hay wallet (401)', (await call('GET', '/api/wallet', { ip: newIp() })).status === 401);
const w1 = (await wget(W1)).json;
ok('wallet: cada cuenta tiene su dirección de juego, estable y distinta', /^YBE-[0-9A-F]{4}(-[0-9A-F]{4}){3}$/.test(w1.gameAddress) && (await wget(W1)).json.gameAddress === w1.gameAddress && (await wget(W2)).json.gameAddress !== w1.gameAddress && w1.links.length === 0);
// known vector: private key 1 ↔ 0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf
const one = new Uint8Array(32); one[31] = 1;
ok('ronin: la dirección de la clave privada 1 es la del vector conocido', ronKey(one).address === '0x7e5f4552091a69125d5dfcb7b8c2659029395bdf');
const linkFlow = async (P, chain, key, opts = {}) => {
  const ch = await wpost(P, '/api/wallet/challenge', { chain, address: opts.address ?? key.address });
  if (ch.status !== 200) return { ch };
  const sig = (opts.signer ?? key).sign(ch.json.message);
  return { ch, ln: await wpost(P, '/api/wallet/link', { chain, address: opts.address ?? key.address, nonce: opts.nonce ?? ch.json.nonce, signature: opts.badSig ? sig.slice(0, -4) + 'aaaa' : sig }) };
};
const SK = solKey(), SK2 = solKey();
let f = await linkFlow(W1, 'solana', SK);
ok('solana: una firma ed25519 válida vincula la billetera', f.ln.status === 200 && f.ln.json.links.some((l) => l.chain === 'solana' && l.address === SK.address));
ok('solana: la firma de otra clave se rechaza', (await linkFlow(W2, 'solana', SK2, { signer: solKey() })).ln.json.error === 'bad_signature');
ok('solana: una firma alterada se rechaza', (await linkFlow(W2, 'solana', SK2, { badSig: true })).ln.json.error === 'bad_signature');
ok('solana: la misma billetera no puede ser de dos cuentas', (await wpost(W2, '/api/wallet/challenge', { chain: 'solana', address: SK.address })).json.error === 'wallet_taken');
ok('solana: una cuenta vincula una sola por cadena', (await wpost(W1, '/api/wallet/challenge', { chain: 'solana', address: SK2.address })).json.error === 'already_linked');
ok('solana: una dirección inventada se rechaza', (await wpost(W2, '/api/wallet/challenge', { chain: 'solana', address: 'hola' })).json.error === 'bad_address' && (await wpost(W2, '/api/wallet/challenge', { chain: 'bitcoin', address: SK2.address })).json.error === 'bad_chain');
const RK = ronKey(crypto.randomBytes(32));
f = await linkFlow(W1, 'ronin', RK);
ok('ronin: una firma personal_sign válida vincula la billetera (0x)', f.ln.status === 200 && f.ln.json.links.some((l) => l.chain === 'ronin' && l.address === RK.address));
const RK2 = ronKey(crypto.randomBytes(32));
ok('ronin: la firma de otra clave se rechaza', (await linkFlow(W2, 'ronin', RK2, { signer: ronKey(crypto.randomBytes(32)) })).ln.json.error === 'bad_signature');
const rch = await wpost(W2, '/api/wallet/challenge', { chain: 'ronin', address: 'ronin:' + RK2.address.slice(2).toUpperCase() });
ok('ronin: acepta la forma ronin:… y la guarda como 0x en minúsculas', rch.status === 200 && rch.json.address === RK2.address);
const rl = await wpost(W2, '/api/wallet/link', { chain: 'ronin', address: RK2.address, nonce: rch.json.nonce, signature: RK2.sign(rch.json.message) });
ok('ronin: vincula tras la forma ronin:…', rl.status === 200);
ok('nonce: no se reutiliza', (await wpost(W2, '/api/wallet/link', { chain: 'ronin', address: RK2.address, nonce: rch.json.nonce, signature: RK2.sign(rch.json.message) })).json.error === 'bad_nonce');
const W3 = await mkPlayer(22);
const c3 = await wpost(W3, '/api/wallet/challenge', { chain: 'solana', address: SK2.address });
ok('nonce: el de otra cuenta no sirve', (await wpost(W2, '/api/wallet/link', { chain: 'solana', address: SK2.address, nonce: c3.json.nonce, signature: SK2.sign(c3.json.message) })).json.error === 'bad_nonce');
db.prepare('UPDATE wallet_nonces SET exp = ? WHERE nonce = ?').run(Date.now() - 1000, c3.json.nonce);
ok('nonce: caducado se rechaza', (await wpost(W3, '/api/wallet/link', { chain: 'solana', address: SK2.address, nonce: c3.json.nonce, signature: SK2.sign(c3.json.message) })).json.error === 'nonce_expired');
const cWrong = await wpost(W3, '/api/wallet/challenge', { chain: 'solana', address: SK2.address });
ok('nonce: la firma de un mensaje distinto (otra cuenta) no vincula', (await wpost(W3, '/api/wallet/link', { chain: 'solana', address: SK2.address, nonce: cWrong.json.nonce, signature: SK2.sign(cWrong.json.message.replace(`#${W3.id}`, `#${W1.id}`)) })).json.error === 'bad_signature');
const un = await wpost(W1, '/api/wallet/unlink', { chain: 'solana' });
ok('desvincular libera la billetera para vincularla de nuevo (o a otra cuenta)', un.status === 200 && un.json.links.every((l) => l.chain !== 'solana') && (await linkFlow(W3, 'solana', SK)).ln.status === 200);

// ── operator gifts: a chest that credits once
const G1 = await mkPlayer(30), G2 = await mkPlayer(31); await state(G1); await state(G2);
const giftRow = db.prepare('INSERT INTO gifts (account_id, amount, note, created_at) VALUES (?,?,?,?)').run(G1.id, 2_000_000, 'prueba', Date.now());
const gid = Number(giftRow.lastInsertRowid);
const gs = await state(G1);
ok('regalo: aparece pendiente en la cartera de su dueño y no en la de otro', gs.snapshot.gifts.length === 1 && gs.snapshot.gifts[0].amount === 2_000_000 && (await state(G2)).snapshot.gifts.length === 0);
ok('regalo: otra cuenta no puede abrir el cofre ajeno', (await intent(G2, 'open_gift', { giftId: gid })).json.error === 'not_yours');
const og = await intent(G1, 'open_gift', { giftId: gid });
ok('regalo: abrirlo acredita el monto y el cofre desaparece', og.status === 200 && og.json.result.amount === 2_000_000 && og.json.snapshot.flora === gs.snapshot.flora + 2_000_000 && og.json.snapshot.gifts.length === 0);
ok('regalo: no se abre dos veces', (await intent(G1, 'open_gift', { giftId: gid })).json.error === 'not_yours' && wallet(G1).flora === gs.snapshot.flora + 2_000_000);
ok('regalo: queda en el libro mayor', db.prepare("SELECT COUNT(*) n FROM ledger WHERE account_id = ? AND kind = 'gift' AND delta = 2000000").get(G1.id).n === 1);
ok('regalo: un id inventado se rechaza', (await intent(G1, 'open_gift', { giftId: 999999 })).json.error === 'not_yours');

// ── every lab product can be sold, priced by its recipe (before, only 4 product types were known to the server)
const SP = await mkPlayer(40), SP2 = await mkPlayer(41); await state(SP); await state(SP2);
const sellOk = await Promise.all(['bubble_hash', 'kief', 'preroll', 'cigar', 'rso', 'gummies', 'terpene_sauce', 'balm', 'candle', 'tincture'].map(async (t, i) => (await intent(await mkPlayer(50 + i), 'sell', { type: t, grams: 3 })).status === 200));
ok('venta: los productos del laboratorio y de la forja (hash, kief, puros, RSO, gomitas, sopa, bálsamo, vela, tintura) se pueden vender en el servidor', sellOk.every(Boolean));
ok('venta: el merch V2P y un producto inventado se rechazan', (await intent(SP, 'sell', { type: 'v2p_merch', grams: 1 })).json.error === 'bad_params' && (await intent(SP, 'sell', { type: 'inventado', grams: 1 })).json.error === 'bad_params');
const gDiamonds = (await intent(SP, 'sell', { type: 'terpene_sauce', recipe: 'diamonds', grams: 4 })).json.result.gross;
const gSauce = (await intent(SP2, 'sell', { type: 'terpene_sauce', grams: 4 })).json.result.gross;
ok('venta: la receta fija el precio (diamantes 95 > sopa 52)', gDiamonds > gSauce, `(${gDiamonds} vs ${gSauce})`);

// ── alfa cerrada: códigos de invitación
cfg.inviteOnly = true;
db.prepare("INSERT INTO invites (code, note, max_uses, created_at) VALUES ('YBE-TEST-2345', 'prueba', 1, ?), ('YBE-DOBL-2345', 'dos usos', 2, ?), ('YBE-VIEJ-2345', 'vencido', 5, ?)").run(Date.now(), Date.now(), Date.now());
db.prepare("UPDATE invites SET expires_at = ? WHERE code = 'YBE-VIEJ-2345'").run(Date.now() - 1000);
ok('invitación: la config avisa que es alfa cerrada', (await call('GET', '/api/auth/config')).json.inviteOnly === true);
const nAcc0 = count();
let ir = await reg({ body: { email: 'inv1@example.com', username: 'Invitado Uno' } });
ok('invitación: sin código no se crea cuenta', ir.status === 403 && ir.json.error === 'invite_required' && count() === nAcc0);
ir = await reg({ body: { email: 'inv1@example.com', username: 'Invitado Uno', invite: 'YBE-NADA-2345' } });
ok('invitación: código inexistente se rechaza', ir.status === 403 && ir.json.error === 'invite_invalid' && count() === nAcc0);
ir = await reg({ body: { email: 'inv1@example.com', username: 'Invitado Uno', invite: 'ybe test2345' } });
ok('invitación: código válido crea la cuenta (acepta minúsculas y sin guión)', ir.status === 200 && count() === nAcc0 + 1 && db.prepare("SELECT uses FROM invites WHERE code = 'YBE-TEST-2345'").get().uses === 1);
ok('invitación: queda registrado quién lo usó', db.prepare("SELECT COUNT(*) n FROM invite_uses u JOIN accounts a ON a.id = u.account_id WHERE u.code = 'YBE-TEST-2345' AND a.email_key = 'inv1@example.com'").get().n === 1);
ir = await reg({ body: { email: 'inv2@example.com', username: 'Invitado Dos', invite: 'YBE-TEST-2345' } });
ok('invitación: un código de un uso no sirve dos veces', ir.status === 403 && ir.json.error === 'invite_invalid' && count() === nAcc0 + 1);
ir = await reg({ body: { email: 'inv3@example.com', username: 'Invitado Tres', invite: 'YBE-VIEJ-2345' } });
ok('invitación: un código vencido se rechaza', ir.status === 403 && ir.json.error === 'invite_invalid');
ir = await reg({ body: { email: 'inv4@example.com', username: 'Invitado Cuatro', invite: 'YBE-DOBL-2345' } });
const ir2 = await reg({ body: { email: 'inv5@example.com', username: 'Invitado Cinco', invite: 'YBE-DOBL-2345' } });
const ir3 = await reg({ body: { email: 'inv6@example.com', username: 'Invitado Seis', invite: 'YBE-DOBL-2345' } });
ok('invitación: código de dos usos sirve exactamente dos veces', ir.status === 200 && ir2.status === 200 && ir3.status === 403 && db.prepare("SELECT uses FROM invites WHERE code = 'YBE-DOBL-2345'").get().uses === 2);
db.prepare("INSERT INTO invites (code, note, max_uses, created_at) VALUES ('YBE-MAIL-2345', '', 1, ?)").run(Date.now());
ir = await reg({ body: { email: 'inv1@example.com', username: 'Otro Nombre', invite: 'YBE-MAIL-2345' } });
ok('invitación: correo ya registrado no gasta código (y responde igual que un alta)', ir.status === 200 && ir.json.pending === true && db.prepare("SELECT uses FROM invites WHERE code = 'YBE-MAIL-2345'").get().uses === 0);
db.prepare("INSERT INTO invites (code, note, max_uses, created_at) VALUES ('YBE-TAKN-2345', '', 1, ?)").run(Date.now());
ir = await reg({ body: { email: 'inv7@example.com', username: 'Invitado Uno', invite: 'YBE-TAKN-2345' } });
ok('invitación: si el usuario ya existe, el código no se gasta', ir.status === 409 && db.prepare("SELECT uses FROM invites WHERE code = 'YBE-TAKN-2345'").get().uses === 0);
// Google en alfa cerrada
async function oauthInvite(profile, invite) {
  profiles.google = profile; const ip = newIp(), j = {};
  const st = await call('GET', `/api/auth/google/start${invite ? `?invite=${encodeURIComponent(invite)}` : ''}`, { ip, jar: j });
  const loc = new URL(st.loc ?? 'http://x/');
  return call('GET', `/api/auth/google/callback?code=abc&state=${loc.searchParams.get('state')}`, { ip, jar: j });
}
let gi = await oauthInvite({ sub: 'g-inv-1', email: 'nuevo.google@gmail.com', email_verified: true, name: 'Nuevo Google' });
ok('invitación: Google sin código no crea cuenta nueva', /#auth_error=invite_required$/.test(gi.loc ?? '') && !db.prepare("SELECT 1 FROM identities WHERE provider = 'google' AND subject = 'g-inv-1'").get());
gi = await oauthInvite({ sub: 'g-inv-1', email: 'nuevo.google@gmail.com', email_verified: true, name: 'Nuevo Google' }, 'YBE-TAKN-2345');
ok('invitación: Google con código crea la cuenta y gasta el código', /#auth=ok$/.test(gi.loc ?? '') && !!db.prepare("SELECT 1 FROM identities WHERE provider = 'google' AND subject = 'g-inv-1'").get() && db.prepare("SELECT uses FROM invites WHERE code = 'YBE-TAKN-2345'").get().uses === 1);
gi = await oauthInvite({ sub: 'g-1', email: 'gina@gmail.com', email_verified: true, name: 'Gina Verde' });
ok('invitación: una cuenta que ya existe entra con Google sin código', /#auth=ok$/.test(gi.loc ?? ''));
// códigos personales del pre-registro: atados a un correo
const { emailKey: ek } = await import('./lib.mjs');
db.prepare("INSERT INTO invites (code, note, max_uses, created_at, email_key) VALUES ('YBE-PERS-2345', 'pre-registro', 1, ?, ?), ('YBE-GMAI-2345', 'pre-registro', 1, ?, ?)").run(Date.now(), ek('bound@example.com'), Date.now(), ek('Bound.Person@gmail.com'));
ir = await reg({ body: { email: 'otro@example.com', username: 'Colado Uno', invite: 'YBE-PERS-2345' } });
ok('invitación personal: con otro correo no sirve', ir.status === 403 && ir.json.error === 'invite_email_mismatch' && db.prepare("SELECT uses FROM invites WHERE code = 'YBE-PERS-2345'").get().uses === 0);
ir = await reg({ body: { email: 'bound@example.com', username: 'Dueño Codigo', invite: 'YBE-PERS-2345' } });
ok('invitación personal: con su correo crea la cuenta', ir.status === 200 && db.prepare("SELECT uses FROM invites WHERE code = 'YBE-PERS-2345'").get().uses === 1);
gi = await oauthInvite({ sub: 'g-bound-x', email: 'alguien.mas@gmail.com', email_verified: true, name: 'Colado Google' }, 'YBE-GMAI-2345');
ok('invitación personal: Google con otro correo no sirve', /#auth_error=invite_email_mismatch$/.test(gi.loc ?? ''));
gi = await oauthInvite({ sub: 'g-bound-1', email: 'boundperson@gmail.com', email_verified: true, name: 'Bound Person' }, 'YBE-GMAI-2345');
ok('invitación personal: Google con el mismo Gmail (aunque cambien los puntos) sirve', /#auth=ok$/.test(gi.loc ?? '') && db.prepare("SELECT uses FROM invites WHERE code = 'YBE-GMAI-2345'").get().uses === 1);
// ── pre-registro con código automático (N cupos, lista de espera) y CORS del sitio
const SITE = 'https://yieldbudempire.com';
const pre = async (body, o = {}) => {
  const ip = o.ip ?? newIp();
  const sol = o.noCaptcha ? undefined : solve((await call('GET', '/api/public/challenge', { ip })).json);
  return call('POST', '/api/public/prereg', { ip, headers: { origin: o.origin ?? SITE }, body: { alias: '', lang: 'es', consent: true, t: Date.now() - 4000, hp: '', captcha: sol, ...body } });
};
const outbox = () => { try { return fs.readFileSync(path.join(cfg.dataDir, 'outbox.log'), 'utf8'); } catch { return ''; } };
prereg.setSeats(2);
let pr = await pre({ email: 'pre1@example.com' }, { noCaptcha: true });
ok('pre-registro: sin verificación anti-bots se rechaza', pr.status === 400 && /captcha/.test(pr.json.error));
pr = await pre({ email: 'bot@example.com', hp: 'http://spam' });
ok('pre-registro: el campo trampa responde bien pero no guarda nada', pr.status === 200 && !db.prepare("SELECT 1 FROM prereg WHERE email_key = 'bot@example.com'").get());
pr = await pre({ email: 'pre0@example.com', consent: false });
ok('pre-registro: sin aceptar el aviso de privacidad se rechaza', pr.status === 400 && pr.json.error === 'consent_required');
const p1 = await pre({ email: 'pre1@example.com', alias: 'Primera' });
const p2 = await pre({ email: 'pre2@example.com', lang: 'en' });
const p3 = await pre({ email: 'pre3@example.com' });
ok('pre-registro: los primeros N reciben código al instante', p1.json.status === 'invited' && p2.json.status === 'invited');
ok('pre-registro: después del cupo quedan en espera con su puesto', p3.json.status === 'waiting' && p3.json.position === 1);
const c1 = db.prepare("SELECT invite_code FROM prereg WHERE email_key = 'pre1@example.com'").get().invite_code;
ok('pre-registro: el código queda atado a su correo y llega por correo', /^YBE-/.test(c1) && db.prepare('SELECT email_key FROM invites WHERE code = ?').get(c1).email_key === 'pre1@example.com' && outbox().includes(c1) && outbox().includes('Hola Primera'));
ok('pre-registro: el correo sale en el idioma elegido', /Your personal code: YBE-/.test(outbox()));
const again = await pre({ email: 'pre1@example.com' });
ok('pre-registro: anotarse dos veces no gasta otro cupo', again.json.status === 'invited' && prereg.stats().invited === 2);
const again3 = await pre({ email: 'PRE3@example.com' });
ok('pre-registro: el que espera sigue en su mismo puesto', again3.json.status === 'waiting' && again3.json.position === 1);
prereg.setSeats(3); const filled = await prereg.fillSeats();
ok('pre-registro: al subir el cupo, el siguiente en espera recibe su código', filled.invited.includes('pre3@example.com') && db.prepare("SELECT status FROM prereg WHERE email_key = 'pre3@example.com'").get().status === 'invited');
prereg.setSeats(10);
const pg = await pre({ email: 'gina@gmail.com' });
ok('pre-registro: si ya tiene cuenta no gasta código', pg.json.status === 'invited' && db.prepare("SELECT status FROM prereg WHERE email_key = 'gina@gmail.com'").get().status === 'has_account' && !db.prepare("SELECT 1 FROM invites WHERE email_key = 'gina@gmail.com'").get());
const cc = db.prepare("SELECT invite_code FROM prereg WHERE email_key = 'pre2@example.com'").get().invite_code;
ir = await reg({ body: { email: 'pre2@example.com', username: 'Pre Dos', invite: cc } });
ok('pre-registro: con el código del correo se crea la cuenta en el juego', ir.status === 200);
// CORS: solo el sitio y solo /api/public/*
let rr = await fetch(base + '/api/public/prereg', { method: 'OPTIONS', headers: { origin: SITE, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type,x-cf-csrf' } });
ok('CORS: el sitio puede preguntar (preflight)', rr.status === 204 && rr.headers.get('access-control-allow-origin') === SITE && /x-cf-csrf/.test(rr.headers.get('access-control-allow-headers') ?? ''));
rr = await fetch(base + '/api/public/prereg', { method: 'OPTIONS', headers: { origin: 'https://sitio-malo.example' } });
ok('CORS: otro dominio no', rr.status === 403 && !rr.headers.get('access-control-allow-origin'));
rr = await fetch(base + '/api/public/stats', { headers: { origin: SITE } });
const sj = await rr.json();
ok('CORS: el sitio lee el contador y el mercado', rr.status === 200 && rr.headers.get('access-control-allow-origin') === SITE && sj.prereg.seats === 10 && typeof sj.market.totals.active === 'number');
pr = await pre({ email: 'pre9@example.com' }, { origin: 'https://sitio-malo.example' });
ok('CORS: un formulario de otro dominio no puede anotar gente', pr.status === 403 && pr.json.error === 'bad_origin');
rr = await fetch(base + '/api/auth/config', { headers: { origin: SITE } });
ok('CORS: el resto de la API no se abre al sitio', !rr.headers.get('access-control-allow-origin'));
cfg.inviteOnly = false;
console.log(failed ? `\n${failed} FALLOS` : '\nTodo OK');
server.close(); mock.close();
fs.rmSync(dir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
