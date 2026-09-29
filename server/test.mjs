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
  BRIDGE_FAKE: '1', FOUNDER_FAKE: '1', FOUNDER_SUPPLY: '3',
});
const { createServer, cfg, db, limiter, originAllowed, isPrivateHost, prereg, economy, bridge, founder, game, panel } = await import('./index.mjs');

// mock identity provider (NOT Google: it only proves that our OAuth code paths behave)
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
  return { ip, ...(await call('POST', '/api/auth/register', { ip, jar: o.jar, body: { email: 'a@example.com', username: 'Alpha Grower', password: 'Correct-Horse-Battery-9', t: Date.now() - 4000, hp: '', acceptTerms: true, termsVersion: '2026-09-23', captcha: o.noCaptcha ? undefined : (o.captcha ?? await captcha(ip)), ...o.body } })) };
};
const count = () => db.prepare('SELECT COUNT(*) n FROM accounts').get().n;

// ── config / basics
const cfgRes = await call('GET', '/api/auth/config');
ok('config: Google configurado, sin X, captcha PoW', cfgRes.json.google && !('x' in cfgRes.json) && cfgRes.json.captcha.type === 'pow');
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
  const s = await call('GET', `/api/auth/${name}/start?terms=2026-09-23`, { ip, jar: jarO });
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
// X ya no existe como proveedor
r = await call('GET', '/api/auth/x/start', { ip: newIp() });
ok('X: el inicio de sesión con X no existe', r.status === 404);
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
// lo que el navegador ya no puede pedir (cosechar, procesar, premios, gastos sueltos) solo corre dentro de las acciones del juego:
// las pruebas de sus límites lo llaman por dentro, como lo hace server/game.mjs
const inner = async (P, type, params, idem) => {
  try { return { status: 200, json: economy.run({ id: P.id }, type, params, idem) }; }
  catch (e) { return { status: e.status ?? 500, json: { error: e.code ?? String(e), ...(e.extra ?? {}) } }; }
};
const state = async (P) => (await call('GET', '/api/econ/state', { jar: P.jar, ip: P.ip })).json;
const setFlora = (P, n) => db.prepare('UPDATE wallets SET flora = ? WHERE account_id = ?').run(n, P.id);
const wallet = (P) => db.prepare('SELECT * FROM wallets WHERE account_id = ?').get(P.id);
const stateRow = (P) => JSON.parse(db.prepare('SELECT json FROM econ_state WHERE account_id = ?').get(P.id).json);
// pone mercadería en el inventario del servidor (para las pruebas de venta, que no pasan por cosechar y procesar)
const stock = (P, item, g) => db.prepare('INSERT INTO inventory (account_id, item, grams) VALUES (?,?,?) ON CONFLICT(account_id, item) DO UPDATE SET grams = grams + excluded.grams').run(P.id, item, g);

const E1 = await mkPlayer(1);
ok('economía: sin sesión no hay cartera (401)', (await call('GET', '/api/econ/state', { ip: newIp() })).status === 401);
let es = await state(E1);
ok('cuenta nueva: el servidor le da el saldo inicial y la escalera empieza en el armario', es.snapshot.flora === ECON.starterFlora && es.snapshot.tier === 1 && es.snapshot.staff.length === 0);
let cl = await intent(E1, 'claim_daily', {});
ok('reclamo diario: suma el monto fijo', cl.status === 200 && cl.json.snapshot.flora === ECON.starterFlora + ECON.dailyClaim);
cl = await intent(E1, 'claim_daily', {});
ok('reclamo diario: una sola vez cada 24 h', cl.status === 400 && cl.json.error === 'too_early' && cl.json.leftMs > 0);
let sp = await inner(E1, 'spend', { amount: 1000, memo: 'trampa' });
ok('gastar más de lo que hay se rechaza y no toca el saldo', sp.status === 400 && sp.json.error === 'insufficient' && (await state(E1)).snapshot.flora === ECON.starterFlora + ECON.dailyClaim);
ok('un gasto no puede ser negativo (no se puede imprimir saldo gastando)', (await inner(E1, 'spend', { amount: -100 })).status === 400 && (await inner(E1, 'spend', { amount: 0 })).status === 400);
const f0 = (await state(E1)).snapshot.flora;
const idemA = await inner(E1, 'spend', { amount: 10, memo: 'x' }, 'k-1'), idemB = await inner(E1, 'spend', { amount: 10, memo: 'x' }, 'k-1');
ok('clave idempotente: el doble clic no cobra dos veces', idemA.status === 200 && idemB.status === 200 && (await state(E1)).snapshot.flora === f0 - 10 && idemB.json.snapshot.flora === idemA.json.snapshot.flora);
ok('un intent desconocido se rechaza', (await intent(E1, 'print_money', { amount: 1e9 })).json.error === 'unknown_intent');
{
  const blocked = await Promise.all(['spend', 'harvest', 'process', 'reward', 'consume', 'import_inventory', 'grow_speedup', 'forge_start', 'forge_collect'].map((t) => intent(E1, t, { amount: 5, flower: 100, trim: 10, product: 'rso', grams: 10, out: 1, kind: 'level', level: 2 })));
  ok('el navegador ya no puede reportar cosechas, lotes, premios ni gastos sueltos (solo corren dentro del juego)', blocked.every((r) => r.status === 400 && r.json.error === 'unknown_intent'));
}

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
stock(E3, 'prod:live_rosin', 20);
const s10 = await intent(E3, 'sell', { type: 'live_rosin', grams: 10 });
ok('venta: paga, quema comisión y devuelve el porcentaje de mercado', s10.status === 200 && s10.json.result.gross > 0 && s10.json.result.fee >= 1 && s10.json.result.net === s10.json.result.gross - s10.json.result.fee && s10.json.result.ratio < 1);
const s10b = await intent(E3, 'sell', { type: 'live_rosin', grams: 10 });
ok('venta: el mercado se satura (la misma venta paga menos la segunda vez)', s10b.json.result.gross < s10.json.result.gross);
const E4 = await mkPlayer(4); await state(E4);
stock(E4, 'prod:pure_terpenes', 24000);
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
const rq = await inner(E3, 'reward', { kind: 'quest', id: 'quest_water_micro' });
ok('misión con $FLORA: una sola vez y con el monto de la tabla del servidor', rq.status === 200 && rq.json.result.amount > 0 && (await inner(E3, 'reward', { kind: 'quest', id: 'quest_water_micro' })).json.error === 'already_claimed' && (await inner(E3, 'reward', { kind: 'quest', id: 'inventada' })).status === 400);
ok('bono de nivel: no se puede saltar a un nivel absurdo en una cuenta nueva', (await inner(E3, 'reward', { kind: 'level', level: 60 })).json.error === 'too_fast');
ok('bono de nivel: un nivel cercano se cobra una vez', (await inner(E3, 'reward', { kind: 'level', level: 3 })).status === 200 && (await inner(E3, 'reward', { kind: 'level', level: 3 })).json.error === 'already_claimed');

// import of a local save: capped, once
const E9 = await mkPlayer(9); await state(E9);
const legend = sim.staff.makeStaff('staff-import-1', 'foreman', 'legendary', 5, Date.now(), 5);
const imp = await (async (b) => { try { return { status: 200, json: economy.importLocal({ id: E9.id }, b) }; } catch (e) { return { status: e.status, json: { error: e.code } }; } })({ flora: 9_999_999, tier: 3, staff: [legend, { id: 3 }], staffAssign: { foreman: 'staff-import-1' }, avatars: [{ designId: 'classic-1', count: 2, firstAt: 1, serial: 1234 }, { designId: 'no-existe', count: 1 }], plots: [{ id: 'plot-asia-20', mintedAt: 5 }, { id: 'plot-mars-1' }] });
ok('importar guardado local: el saldo se limita, los NFT se validan y la tierra se calcula con la fórmula del servidor', imp.status === 200 && imp.json.snapshot.flora === 1500 && imp.json.snapshot.tier === 3 && imp.json.snapshot.staff.length === 1 && imp.json.snapshot.avatars.length === 1 && imp.json.snapshot.plots.length === 1 && imp.json.snapshot.plots[0].landRating === sim.terroir.plotOffer('asia', 20).landRating);
ok('importar: solo una vez', (() => { try { economy.importLocal({ id: E9.id }, { flora: 500 }); return false; } catch (e) { return e.code === 'already_imported'; } })());
ok('importar un guardado local ya no existe como ruta pública', (await call('POST', '/api/econ/import-local', { jar: E9.jar, ip: E9.ip, body: { flora: 500 } })).status === 404);
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
const sellOk = await Promise.all(['bubble_hash', 'kief', 'preroll', 'cigar', 'rso', 'gummies', 'terpene_sauce', 'balm', 'candle', 'tincture'].map(async (t, i) => { const P = await mkPlayer(50 + i); stock(P, `prod:${t}`, 3); return (await intent(P, 'sell', { type: t, grams: 3 })).status === 200; }));
ok('venta: los productos del laboratorio y de la forja (hash, kief, puros, RSO, gomitas, sopa, bálsamo, vela, tintura) se pueden vender en el servidor', sellOk.every(Boolean));
ok('venta: el merch V2P y un producto inventado se rechazan', (await intent(SP, 'sell', { type: 'v2p_merch', grams: 1 })).json.error === 'bad_params' && (await intent(SP, 'sell', { type: 'inventado', grams: 1 })).json.error === 'bad_params');
stock(SP, 'prod:diamonds', 4); stock(SP2, 'prod:terpene_sauce', 4);
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
  const st = await call('GET', `/api/auth/google/start?terms=2026-09-23${invite ? `&invite=${encodeURIComponent(invite)}` : ''}`, { ip, jar: j });
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
const p1 = await pre({ email: 'pre1@example.com', alias: 'Primera', termsVersion: '2026-09-23' });
const p2 = await pre({ email: 'pre2@example.com', lang: 'en' });
const p3 = await pre({ email: 'pre3@example.com' });
ok('pre-registro: los primeros N reciben código al instante', p1.json.status === 'invited' && p2.json.status === 'invited');
ok('pre-registro: guarda la versión de los términos aceptados', db.prepare("SELECT terms_version FROM prereg WHERE email_key = 'pre1@example.com'").get().terms_version === '2026-09-23');
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
// ── aceptación de Términos y Privacidad (18+) al crear cuenta
cfg.inviteOnly = false;
ir = await reg({ body: { email: 'noterms@example.com', username: 'Sin Terminos', acceptTerms: false } });
ok('términos: sin aceptarlos no se crea la cuenta', ir.status === 400 && ir.json.error === 'terms_required' && !db.prepare("SELECT 1 FROM accounts WHERE email_key = 'noterms@example.com'").get());
ir = await reg({ body: { email: 'conterms@example.com', username: 'Con Terminos' } });
const tacc = db.prepare("SELECT terms_version, terms_accepted_at FROM accounts WHERE email_key = 'conterms@example.com'").get();
ok('términos: se guarda la versión y la fecha aceptadas', ir.status === 200 && tacc.terms_version === '2026-09-23' && tacc.terms_accepted_at > 0);
{
  profiles.google = { sub: 'g-noterms', email: 'noterms.g@gmail.com', email_verified: true, name: 'Sin Terminos G' };
  const ip = newIp(), j = {};
  const st = await call('GET', '/api/auth/google/start', { ip, jar: j });
  const cb = await call('GET', `/api/auth/google/callback?code=abc&state=${new URL(st.loc).searchParams.get('state')}`, { ip, jar: j });
  ok('términos: Google sin aceptarlos no crea cuenta nueva', /#auth_error=terms_required$/.test(cb.loc ?? '') && !db.prepare("SELECT 1 FROM identities WHERE subject = 'g-noterms'").get());
  profiles.google = { sub: 'g-1', email: 'gina@gmail.com', email_verified: true, name: 'Gina Verde' };
  const st2 = await call('GET', '/api/auth/google/start', { ip, jar: j });
  const cb2 = await call('GET', `/api/auth/google/callback?code=abc&state=${new URL(st2.loc).searchParams.get('state')}`, { ip, jar: j });
  ok('términos: una cuenta que ya existe entra con Google sin volver a aceptar', /#auth=ok$/.test(cb2.loc ?? ''));
}
// ── mercadería en el servidor: la venta exige producto real y la cosecha tiene techo físico
{
  const GP = await mkPlayer(70); await state(GP);
  const flora0 = wallet(GP).flora;
  let r = await intent(GP, 'sell', { type: 'rso', grams: 5 });
  ok('mercadería: vender sin producto se rechaza', r.status === 400 && r.json.error === 'insufficient_stock');
  // el ataque de la consola: vender una y otra vez lo que no se tiene
  let blocked = 0; for (let i = 0; i < 5; i++) if ((await intent(GP, 'sell', { type: 'rso', grams: 2000 })).status === 400) blocked++;
  ok('mercadería: repetir ventas inventadas no crea $FLORA', blocked === 5 && wallet(GP).flora === flora0);
  // cosecha: armario (1 plaza, bono 1.0), sin parcelas → techo = 75 × 2.5 × 1.2 × 1.1 = 247.5 g por planta, cupo inicial 1.25 × eso
  r = await inner(GP, 'harvest', { flower: 100000, trim: 100000, source: 'room' });
  const cap1 = 75 * 2.5 * 1.2 * 1.1 * 1.25;
  ok('cosecha: lo que pasa del cupo se recorta (no se rechaza)', r.status === 200 && r.json.result.clipped === true && Math.abs(r.json.result.flower - cap1) < 0.5 && r.json.result.trim <= r.json.result.flower * 0.45 + 0.6);
  ok('cosecha: también da la fibra del tallo', r.json.result.fibre === Math.round(r.json.result.flower * 0.5) && r.json.snapshot.inventory.materials.fibra_cruda === r.json.result.fibre);
  r = await inner(GP, 'harvest', { flower: 200, trim: 0 });
  ok('cosecha: con el cupo gastado, cosechar de nuevo al instante casi no da nada', r.json.result.flower < 1);
  const st = stateRow(GP); st.harvestAllowance.at -= 86400_000; db.prepare('UPDATE econ_state SET json = ? WHERE account_id = ?').run(JSON.stringify(st), GP.id);
  r = await inner(GP, 'harvest', { flower: 1000, trim: 0 });
  ok('cosecha: el cupo se recarga con el tiempo (un día ≈ 123,75 g en el armario)', Math.abs(r.json.result.flower - 123.75) < 1);
  const floraS = wallet(GP).flora;
  r = await inner(GP, 'grow_speedup', { scope: 'plant' });
  const after = await inner(GP, 'harvest', { flower: 1000, trim: 0 });
  ok('aceleración: cobra 25 $FLORA y suma cupo (35 % de una planta)', r.status === 200 && wallet(GP).flora === floraS - 25 && Math.abs(after.json.result.flower - 247.5 * 0.35) < 1);
  // procesar: nunca más producto que el rendimiento de la receta
  const flowerHave = after.json.snapshot.inventory.flower;
  r = await inner(GP, 'process', { product: 'rso', grams: 100, out: 20 });
  ok('proceso: sacar más producto que el rendimiento máximo se rechaza', r.status === 400 && r.json.error === 'bad_params');
  r = await inner(GP, 'process', { product: 'rso', grams: 100, out: 12 });
  ok('proceso: descuenta la flor y guarda el producto', r.status === 200 && Math.abs(r.json.snapshot.inventory.flower - (flowerHave - 100)) < 0.02 && r.json.snapshot.inventory.products.rso === 12);
  r = await inner(GP, 'process', { product: 'rso', grams: 4000, out: 1 });
  ok('proceso: sin flor suficiente no se puede', r.status === 400 && r.json.error === 'insufficient_stock');
  r = await intent(GP, 'sell', { type: 'rso', grams: 12 });
  const r2 = await intent(GP, 'sell', { type: 'rso', grams: 12 });
  ok('venta: con producto real se vende una vez, no dos', r.status === 200 && r.json.result.gross > 0 && r2.status === 400);
  // forja: los insumos salen al empezar y el producto llega al terminar
  stock(GP, 'trim', 20);
  r = await inner(GP, 'forge_start', { recipe: 'render_wax', qty: 1 });
  ok('forja: empieza, cobra y descuenta el trim', r.status === 200 && r.json.snapshot.forgeJobs.length === 1);
  const st2 = stateRow(GP); st2.forgeJobs[0].endsAt = Date.now() - 1; db.prepare('UPDATE econ_state SET json = ? WHERE account_id = ?').run(JSON.stringify(st2), GP.id);
  r = await inner(GP, 'forge_collect', {});
  ok('forja: al terminar entrega el material', r.status === 200 && r.json.snapshot.inventory.materials.cera === 5 && r.json.snapshot.forgeJobs.length === 0);
  const NP = await mkPlayer(72); await state(NP);
  r = await inner(NP, 'forge_start', { recipe: 'render_wax', qty: 1 });
  ok('forja: sin insumos no arranca', r.status === 400 && /^forge_/.test(r.json.error));
  r = await inner(GP, 'consume', { items: { 'mat:cera': 2 } });
  const rc = await inner(GP, 'consume', { items: { 'mat:cera': 99 } });
  const rx = await inner(GP, 'consume', { items: { 'prod:rso': 1 } });
  ok('consumo: solo quita, y solo lo que hay', r.status === 200 && r.json.snapshot.inventory.materials.cera === 3 && rc.json.error === 'insufficient_stock' && rx.json.error === 'bad_params');
  // importación única de lo que el navegador ya tenía
  const IP = await mkPlayer(71); await state(IP);
  r = await inner(IP, 'import_inventory', { flower: 999999, trim: 5, materials: { cera: 9999, inventado: 5 }, products: { diamonds: 5000, inventado: 3 } });
  const inv = r.json.snapshot.inventory;
  ok('importación: respeta los topes', r.status === 200 && inv.flower === 3000 && inv.trim === 5 && inv.materials.cera === 200 && !('inventado' in inv.materials) && inv.products.diamonds > 0 && inv.products.diamonds < 5000 && !('inventado' in inv.products));
  ok('importación: solo una vez', (await inner(IP, 'import_inventory', { flower: 10 })).json.error === 'already_imported');
}
// ── el juego entero corre en el servidor (server/game.mjs + src/core): el navegador solo pide acciones
{
  const gs = (P, lang) => call('GET', `/api/game/state${lang ? `?lang=${lang}` : ''}`, { jar: P.jar, ip: P.ip });
  const act = (P, type, params = {}, extra = {}) => call('POST', '/api/game/action', { jar: P.jar, ip: P.ip, body: { type, params, ...extra } });
  const gameRow = (P) => JSON.parse(db.prepare('SELECT json FROM game_state WHERE account_id = ?').get(P.id).json);
  const putGame = (P, st) => db.prepare('UPDATE game_state SET json = ? WHERE account_id = ?').run(JSON.stringify(st), P.id);
  const water = (st) => st.assets.filter((a) => a.catalogId.startsWith('water')).reduce((n, a) => n + (a.remaining ?? 0), 0);

  ok('juego: sin sesión no hay partida (401)', (await call('GET', '/api/game/state', { ip: newIp() })).status === 401);
  const GA = await mkPlayer(80);
  let g = await gs(GA);
  ok('juego: una cuenta nueva empieza con su sala, el kit de inicio y el estado de la economía', g.status === 200 && g.json.state.playerLevel === 1 && g.json.state.indoorPlants.length === 1 && g.json.state.assets.length > 3 && g.json.snapshot.flora === ECON.starterFlora);

  // acciones: validadas y aplicadas por el servidor
  const w0 = water(g.json.state);
  let a = await act(GA, 'waterPlant', { idx: 0 }, { idem: 'w-1' });
  ok('regar: gasta agua del stock del servidor y da XP', a.status === 200 && a.json.ok && water(a.json.state) < w0 && a.json.state.playerXp === 20 && a.json.fx.some((f) => f.t === 'toast'));
  const again = await act(GA, 'waterPlant', { idx: 0 }, { idem: 'w-1' });
  ok('regar: el doble clic (misma clave) no se aplica dos veces', again.status === 200 && gameRow(GA).playerXp === 20);
  ok('el navegador no puede mandar estado: una acción inventada se rechaza', (await act(GA, 'setState', { playerLevel: 99 })).json.error === 'unknown_action' && (await act(GA, 'breedStrainsFree', { a: {}, b: {} })).json.error === 'unknown_action');
  a = await act(GA, 'harvestPlant', { idx: 0 });
  ok('cosechar una planta que no está lista se rechaza con el motivo', a.status === 400 && a.json.error === 'refused' && /no se puede cortar/i.test(a.json.text));

  // el tiempo lo pone el reloj del servidor
  let st = gameRow(GA); const p0 = st.indoorPlants[0].progressPercent;
  st.lastSimAt = Date.now() - 6 * 3600_000; putGame(GA, st);
  g = await gs(GA);
  ok('el mundo avanza con el reloj del servidor (6 h sin jugar = la planta creció)', g.json.state.indoorPlants[0].progressPercent > p0);
  const p1 = gameRow(GA).indoorPlants[0].progressPercent;
  await act(GA, 'setPpfd', { ppfd: 700, extraSeconds: 9e6, now: Date.now() + 9e9 });
  ok('el navegador no puede adelantar el reloj', Math.abs(gameRow(GA).indoorPlants[0].progressPercent - p1) < 1);

  // cosecha: la calcula el servidor con su planta
  st = gameRow(GA); st.indoorPlants[0] = { ...st.indoorPlants[0], progressPercent: 100, stage: 'ready_harvest', sim: undefined, health: 100, sex: 'female' }; putGame(GA, st);
  const flower0 = (await state(GA)).snapshot.inventory.flower;
  a = await act(GA, 'harvestPlant', { idx: 0, flower: 99999, grams: 99999 });
  const got = a.json.snapshot.inventory.flower - flower0;
  ok('cosecha: los gramos salen de la planta del servidor, no de los parámetros', a.status === 200 && got > 0 && got <= st.indoorPlants[0].estimatedDryYieldGrams && a.json.state.indoorPlants[0].progressPercent === 0, `(${got} g)`);

  // laboratorio: rendimiento de la receta del servidor
  stock(GA, 'flower', 100);
  const fl = (await state(GA)).snapshot.inventory.flower;
  a = await act(GA, 'runLabProcess', { recipeId: 'live_rosin', grams: 20, yieldRatio: 50, feeFlora: 0 });
  const batch = a.json.state.products.find((x) => x.recipeId === 'live_rosin');
  ok('laboratorio: el rendimiento y la tarifa son los de la receta (0,22 g/g, quema 12)', a.status === 200 && batch && batch.quantityGrams <= 20 * 0.22 + 0.01 && a.json.snapshot.inventory.products.live_rosin === batch.quantityGrams && Math.abs(a.json.snapshot.inventory.flower - (fl - 20)) < 0.01);
  a = await act(GA, 'sellProduct', { productId: batch.id });
  ok('vender un lote: sale del almacén y paga lo que dice el mercado del servidor', a.status === 200 && !a.json.state.products.some((x) => x.id === batch.id) && a.json.result.gross > 0 && !a.json.snapshot.inventory.products.live_rosin);
  ok('un lote que no existe no se vende', (await act(GA, 'sellProduct', { productId: batch.id })).status === 400);

  // XP gratis con límite
  const xp0 = gameRow(GA).playerXp, lv0 = gameRow(GA).playerLevel;
  await act(GA, 'calibrateMeter', { meter: 'ph' }); await act(GA, 'calibrateMeter', { meter: 'ph' }); await act(GA, 'calibrateMeter', { meter: 'ph' });
  const st2 = gameRow(GA);
  ok('calibrar da XP una vez al día por medidor (antes era XP infinita)', (st2.playerLevel > lv0 ? true : st2.playerXp - xp0 === 15));
  a = await act(GA, 'collectPollenFromFather', { fatherId: 'father_santa_marta_male' });
  const pol2 = await act(GA, 'collectPollenFromFather', { fatherId: 'father_santa_marta_male' });
  ok('recolectar polen tiene espera (6 h)', a.status === 200 && pol2.status === 400 && pol2.json.error === 'refused');

  // subir de nivel paga el bono una vez, en el servidor
  st = gameRow(GA); st.playerXp = 740; st.playerLevel = 2; putGame(GA, st);
  const lvlBefore = db.prepare("SELECT COUNT(*) n FROM ledger WHERE account_id = ? AND kind = 'level'").get(GA.id).n;
  a = await act(GA, 'waterPlant', { idx: 0 });
  const lvlAfter = db.prepare("SELECT COUNT(*) n FROM ledger WHERE account_id = ? AND kind = 'level'").get(GA.id).n;
  ok('subir de nivel: el servidor paga el bono una sola vez', a.json.state.playerLevel === 3 && lvlAfter === lvlBefore + 1);
  st = gameRow(GA); st.playerLevel = 2; st.playerXp = 745; putGame(GA, st);
  await act(GA, 'waterPlant', { idx: 0 });
  ok('subir de nivel dos veces al mismo nivel no cobra dos veces', db.prepare("SELECT COUNT(*) n FROM ledger WHERE account_id = ? AND kind = 'level'").get(GA.id).n === lvlAfter);

  // guía: reiniciarla no vuelve a pagar
  st = gameRow(GA); st.tutorialPaid = sim.core.normalizeGame({}, Date.now()).tutorialPaid.concat(['move', 'bag', 'water', 'feed', 'gauges', 'process', 'sell', 'buy', 'planet', 'harvest']); st.tutorial = { started: true, dismissed: false, minimized: false, index: 0, base: {}, claimed: [] }; putGame(GA, st);
  const assetsN = gameRow(GA).assets.length, xpT = gameRow(GA).playerXp;
  for (let i = 0; i < 4; i++) { await act(GA, 'reportEvent', { event: 'visit' }); await act(GA, 'claimTutorialStep'); }
  ok('guía: un paso ya cobrado no se cobra otra vez al reiniciarla', gameRow(GA).assets.length === assetsN && gameRow(GA).playerXp === xpT && gameRow(GA).tutorial.claimed.includes('move'));
  ok('eventos de interfaz: solo los que la interfaz ve', (await act(GA, 'reportEvent', { event: 'harvest' })).status === 400);

  // perfil en el servidor
  a = await call('POST', '/api/game/profile', { jar: GA.jar, ip: GA.ip, body: { updates: { displayName: 'Nuevo Nombre', bio: 'x'.repeat(500), avatarImage: 'javascript:alert(1)', avatarNft: 'legendary-1' } } });
  ok('perfil: se guarda en el servidor con topes (sin imagen falsa ni avatar ajeno)', a.status === 200 && a.json.state.profile.displayName === 'Nuevo Nombre' && a.json.state.profile.bio.length === 200 && !a.json.state.profile.avatarImage && !a.json.state.profile.avatarNft);
  ok('equipar un avatar que no es tuyo se rechaza', (await act(GA, 'equipAvatar', { designId: 'legendary-1' })).status === 400);

  // idioma de los avisos
  a = await act(GA, 'toggleAutoWater', {}, { lang: 'en' });
  ok('los avisos salen en el idioma del jugador', a.status === 200 && a.json.fx.some((f) => f.t === 'toast' && /Automatic|Auto/i.test(f.m)), a.json.fx.map((f) => f.m).join(' | '));

  // migración de una partida vieja del navegador, con topes
  const GM = await mkPlayer(81); await state(GM);
  const es0 = stateRow(GM); es0.levelsClaimed = [1, 2, 3]; db.prepare('UPDATE econ_state SET json = ? WHERE account_id = ?').run(JSON.stringify(es0), GM.id);
  const plant = { id: 'indoor-r1-p1-A', slotIndex: 0, strain: { id: 'x-hack', name: 'Hack', resinYieldMultiplier: 99, cycleDurationSeconds: 1, terpenes: {} }, progressPercent: 100, stage: 'ready_harvest', health: 100, soilMoisture: 80, estimatedDryYieldGrams: 999999, plantedAt: 1, lastWatered: 1, lastFed: 1, temperatureC: 24, relativeHumidity: 60 };
  const old = { playerLevel: 50, playerXp: 999999, seedInventory: { seed_chrono_og: 9999, hybrid_seed_fake: 50 }, assets: [{ id: 'a1', catalogId: 'water_200', remaining: 1e9, mintedAt: 1 }, { id: 'a2', catalogId: 'no-existe', remaining: 5 }], indoorPlants: [plant], lastSimAt: Date.now() - 3600_000, profile: { displayName: 'Viejo', avatar: '🌿' }, mothersFathers: [] };
  db.prepare('INSERT INTO saves (account_id, data, saved_at, updated_at) VALUES (?,?,?,?)').run(GM.id, JSON.stringify(old), Date.now(), Date.now());
  g = await gs(GM);
  const m = sim.core.unpackGame(g.json.state);
  ok('migración: el nivel no pasa del que el servidor ya pagó y la XP se limita', m.playerLevel === 3 && m.playerXp < 1600);
  ok('migración: semillas con tope, las de genéticas perdidas se descartan', m.seedInventory.seed_chrono_og === 60 && !('hybrid_seed_fake' in m.seedInventory));
  ok('migración: lotes con su cantidad máxima y solo del catálogo', m.assets.length === 1 && m.assets[0].remaining <= 200);
  ok('migración: la planta queda dentro de lo que el juego permite', m.indoorPlants[0].strain.resinYieldMultiplier <= sim.harvestCap.MAX_RESIN_MULT && m.indoorPlants[0].estimatedDryYieldGrams <= 75 * sim.harvestCap.MAX_RESIN_MULT * 2.4 && m.indoorPlants[0].strain.cycleDurationSeconds >= 40);
  ok('migración: conserva el perfil', m.profile.displayName === 'Viejo');
  ok('migración: se hace una sola vez (la partida vieja ya no manda)', db.prepare('SELECT migrated_from FROM game_state WHERE account_id = ?').get(GM.id).migrated_from?.startsWith('save@'));
  // tamaño: la partida viaja y se guarda empaquetada, y la clave de doble clic guarda solo el resultado
  {
    const packed = sim.core.packGame(m), back = sim.core.unpackGame(packed);
    const strip = (x) => JSON.stringify(x, (k, v) => (k === 'sim' || k === 'age' ? undefined : v));
    ok('empaquetar y desempaquetar devuelve la misma partida', strip(back) === strip(m) && back.indoorPlants[0].strain.resinYieldMultiplier === m.indoorPlants[0].strain.resinYieldMultiplier);
    const idemRows = db.prepare('SELECT length(response) n FROM game_idem WHERE account_id = ?').all(GA.id);
    ok('la clave de doble clic guarda solo el resultado (no la partida entera)', idemRows.length > 0 && idemRows.every((r) => r.n < 6000), `(máx ${Math.max(...idemRows.map((r) => r.n))} bytes)`);
    const rep = await act(GA, 'waterPlant', { idx: 0 }, { idem: 'w-1' });
    ok('repetir una clave devuelve el primer resultado con la partida de ahora', rep.status === 200 && rep.json.ok && Array.isArray(rep.json.fx) && rep.json.state.playerLevel === gameRow(GA).playerLevel);
  }
  ok('el guardado en la nube del navegador ya no existe', (await call('POST', '/api/save', { jar: GM.jar, ip: GM.ip, body: { data: { playerLevel: 99 }, savedAt: Date.now() } })).status === 404 && (await call('GET', '/api/save', { jar: GM.jar, ip: GM.ip })).status === 404);

  const r = stateRow(E1); r.levelsClaimed = [1, 2, 3, 4];
  db.prepare('UPDATE econ_state SET json = ? WHERE account_id = ?').run(JSON.stringify(r), E1.id);
  ok('nivel: el estado del servidor informa el nivel más alto ya pagado', (await state(E1)).snapshot.level === 4 && (await state(G1)).snapshot.level === 1);
}
// ── rango de imperio: puntos de lo que de verdad pasó, nunca baja, abre sedes y topes
{
  const EP = await mkPlayer(90); await state(EP);
  const emp = async () => (await state(EP)).snapshot.empire;
  let e = await emp();
  ok('imperio: una cuenta nueva empieza en rango 1 con su desglose', e.rank === 1 && e.points === 0 && e.perks.maxLands === 12 && e.next === 250);
  // regalos y asignaciones no suman; las ventas sí
  db.prepare("INSERT INTO ledger (account_id, ts, kind, delta, balance, ref) VALUES (?,?,?,?,?,?)").run(EP.id, Date.now(), 'grant', 900000, 900000, 'prueba');
  e = await emp();
  ok('imperio: un regalo o una asignación de $FLORA no da puntos', e.breakdown.sales === 0 && e.points === 0);
  stock(EP, 'prod:live_rosin', 30); setFlora(EP, 100000);
  for (let i = 0; i < 3; i++) await intent(EP, 'sell', { type: 'live_rosin', grams: 10 });
  e = await emp();
  ok('imperio: las ventas del dispensario suman puntos', e.breakdown.sales > 0);
  // cosechar suma (lo que la economía guardó, con su techo)
  const h = await inner(EP, 'harvest', { flower: 400, trim: 100, source: 'room' });
  e = await emp();
  ok('imperio: la flor cosechada suma (1 punto cada 40 g, con el techo físico)', h.status === 200 && e.breakdown.harvested === Math.floor(h.json.result.flower / 40));
  // tierras y rango que no baja
  const st0 = stateRow(EP); st0.stats = { harvested: 400000 }; db.prepare('UPDATE econ_state SET json = ? WHERE account_id = ?').run(JSON.stringify(st0), EP.id);
  e = await emp();
  ok('imperio: con suficientes puntos sube de rango y abre ventajas (tope de tierras, forja, cámara)', e.rank >= 8 && e.perks.maxLands === 16 && e.perks.forgeJobs === 1 && e.perks.breedingJobs === 1, `(rango ${e.rank}, ${e.points} pts)`);
  const st1 = stateRow(EP); st1.stats = { harvested: 0 }; db.prepare('UPDATE econ_state SET json = ? WHERE account_id = ?').run(JSON.stringify(st1), EP.id);
  ok('imperio: el rango nunca baja aunque bajen los puntos', (await emp()).rank === e.rank);
  // sedes: piden rango
  const EQ = await mkPlayer(91); await state(EQ); setFlora(EQ, 1000000);
  const sq = stateRow(EQ); sq.tier = 4; sq.unlocked = ['tent_starter', 'tent_pro', 'greenhouse_commercial', 'lab_pharma_hydro']; db.prepare('UPDATE econ_state SET json = ? WHERE account_id = ?').run(JSON.stringify(sq), EQ.id);
  let b2 = await intent(EQ, 'start_build', { facilityId: 'hydro_complex' });
  ok('sedes: el Complejo Hidropónico no se construye sin rango 5', b2.json.error === 'empire_rank' && b2.json.need === 5);
  const gb = await call('POST', '/api/game/action', { jar: EQ.jar, ip: EQ.ip, body: { type: 'upgradeFacility', params: { facilityId: 'hydro_complex' } } });
  ok('sedes: el juego explica qué rango falta', gb.status === 400 && /rango de imperio 5/.test(gb.json.text ?? ''));
  const sq2 = stateRow(EQ); sq2.empireRank = 5; db.prepare('UPDATE econ_state SET json = ? WHERE account_id = ?').run(JSON.stringify(sq2), EQ.id);
  b2 = await intent(EQ, 'start_build', { facilityId: 'hydro_complex' });
  ok('sedes: con rango 5 se construye (cuesta y tarda como las demás)', b2.status === 200 && b2.json.result.cost === 5000 && b2.json.result.hours === 168);
  ok('sedes: no se salta al Campus sin pasar por el Complejo', (await intent(EQ, 'start_build', { facilityId: 'grow_campus' })).json.error !== undefined);
  // lo que el juego cuenta (patentes, cruces, nivel) llega al rango
  await call('GET', '/api/game/state', { jar: EQ.jar, ip: EQ.ip });
  ok('imperio: el nivel de jugador y lo del juego llegan al desglose', (await state(EQ)).snapshot.empire.breakdown.tier === 450);
}
// ── panel de operadores: solo cuentas admin; a las demás no existe, y solo lee
{
  const PA = await mkPlayer(190); await state(PA);
  const PN = await mkPlayer(191); await state(PN);
  const routes = ['/api/admin/me', '/api/admin/overview', '/api/admin/players', '/api/admin/economy'];
  let hidden = true; for (const r of routes) { const x = await call('GET', r, { jar: PN.jar, ip: PN.ip }); hidden &&= x.status === 404; }
  ok('panel: una cuenta normal recibe 404 en todas sus rutas', hidden);
  ok('panel: sin sesión también 404', (await call('GET', '/api/admin/overview', { ip: newIp() })).status === 404);
  db.prepare("UPDATE accounts SET flags = flags || 'dev,' WHERE id = ?").run(PN.id);
  ok('panel: ser dev no alcanza', (await call('GET', '/api/admin/overview', { jar: PN.jar, ip: PN.ip })).status === 404);
  db.prepare("UPDATE accounts SET flags = flags || 'admin,' WHERE id = ?").run(PA.id);
  const o = await call('GET', '/api/admin/overview', { jar: PA.jar, ip: PA.ip });
  ok('panel: la cuenta admin ve el resumen', o.status === 200 && o.json.players.total >= 2 && o.json.players.online >= 1 && o.json.series.length === 30 && Array.isArray(o.json.feed) && o.json.health.uptime >= 0);
  const pl = await call('GET', '/api/admin/players', { jar: PA.jar, ip: PA.ip });
  const me = pl.json.players?.find((p) => p.id === PA.id);
  ok('panel: la lista de jugadores trae nivel, instalación y plantas', pl.status === 200 && me && me.admin === true && typeof me.level === 'number' && typeof me.plants === 'number' && me.online === true);
  ok('panel: la lista no trae correos', !JSON.stringify(pl.json).includes('@example.com'));
  const ec = await call('GET', '/api/admin/economy', { jar: PA.jar, ip: PA.ip });
  ok('panel: economía (circulante, libro, NFT)', ec.status === 200 && typeof ec.json.circulating === 'number' && ec.json.days.length === 14 && Array.isArray(ec.json.nfts));
  ok('panel: cuenta las peticiones del servidor', panel && typeof panel.observe === 'function');

  // telemetría del navegador: apagada no guarda nada; encendida guarda solo tipos conocidos y recorta lo largo
  const before = db.prepare('SELECT COUNT(*) AS n FROM client_events').get().n;
  const off = await call('POST', '/api/telemetry', { jar: PN.jar, ip: PN.ip, body: { events: [{ kind: 'error', name: 'x' }] } });
  ok('telemetría: apagada no guarda nada', off.status === 200 && off.json.off === true && db.prepare('SELECT COUNT(*) AS n FROM client_events').get().n === before);
  panel.telemetry = true;
  const on = await call('POST', '/api/telemetry', { jar: PN.jar, ip: PN.ip, body: { device: 'celular Android Chrome', build: 'b1', events: [{ kind: 'error', name: 'TypeError: boom', detail: 'y'.repeat(5000) }, { kind: 'view', name: 'cultivo' }, { kind: 'perf', name: 'load', ms: 2300 }, { kind: 'hack', name: 'z' }] } });
  const rows = db.prepare('SELECT * FROM client_events WHERE account_id = ?').all(PN.id);
  ok('telemetría: encendida guarda errores, pantallas y carga (y descarta lo desconocido)', on.json.n === 3 && rows.length === 3 && rows.every((r) => r.detail.length <= 600));
  const cl = await call('GET', '/api/admin/client', { jar: PA.jar, ip: PA.ip });
  ok('telemetría: el panel la muestra', cl.status === 200 && cl.json.errors[0]?.name === 'TypeError: boom' && cl.json.views[0]?.name === 'cultivo' && cl.json.perf[0]?.p50 === 2300);
  ok('telemetría: la pestaña del panel no la ve una cuenta normal', (await call('GET', '/api/admin/client', { jar: PN.jar, ip: PN.ip })).status === 404);
  panel.telemetry = false;
  const fu = await call('GET', '/api/admin/funnel?days=7', { jar: PA.jar, ip: PA.ip });
  ok('embudo: pasos en orden, el primero es el registro', fu.status === 200 && fu.json.steps.length === 8 && fu.json.steps[0].id === 'signup' && fu.json.steps[0].n === fu.json.total && fu.json.steps.every((x) => x.n <= x.eligible));
  ok('embudo: no cuenta las cuentas dev', !fu.json.stuck.some((x) => x.id === PN.id));
  const fc = await call('GET', `/api/admin/player?id=${PA.id}`, { jar: PA.jar, ip: PA.ip });
  ok('ficha: trae plantas, instalación, acciones y libro', fc.status === 200 && Array.isArray(fc.json.indoor) && fc.json.facility.tier >= 1 && Array.isArray(fc.json.activity) && Array.isArray(fc.json.ledger));
  ok('ficha: sin correo', !JSON.stringify(fc.json).includes('@example.com'));
  ok('ficha: jugador inexistente → 404; cuenta normal → 404', (await call('GET', '/api/admin/player?id=999999', { jar: PA.jar, ip: PA.ip })).status === 404 && (await call('GET', `/api/admin/player?id=${PA.id}`, { jar: PN.jar, ip: PN.ip })).status === 404);
  // alertas a Telegram (server/alerts.mjs) con un Telegram falso: jugador nuevo sí, repetidas con espera no, sin token nada
  {
    const { createAlerts } = await import('./alerts.mjs');
    const sent = [];
    const al = createAlerts({ db, env: { TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: 'c' }, fetchImpl: async (url, o) => { sent.push({ url, body: JSON.parse(o.body) }); return { ok: true }; } });
    al.onAudit('signup', PA.id); al.onAudit('login', PA.id); al.onAudit('bot_signal', null, 'honeypot'); al.onAudit('bot_signal', null, 'honeypot');
    await new Promise((r) => setTimeout(r, 20));
    ok('alertas: avisa jugador nuevo y seguridad; un login no; lo repetido espera', sent.length === 2 && /Jugador nuevo/.test(sent[0].body.text) && /Seguridad/.test(sent[1].body.text) && sent[0].body.chat_id === 'c' && sent[0].url.includes('/bott/'));
    const quiet = createAlerts({ db, env: {}, fetchImpl: async () => { throw new Error('no debería llamar'); } });
    ok('alertas: sin token no hace nada', quiet.on === false && (await quiet.send('x', 'y')) === false);
  }
  const ec2 = await call('GET', '/api/admin/economy', { jar: PA.jar, ip: PA.ip });
  ok('economía: salud de 30 días, semana, mayores tenedores y precios', ec2.status === 200 && ec2.json.health.length === 30 && typeof ec2.json.week.made === 'number' && Array.isArray(ec2.json.holders) && Array.isArray(ec2.json.prices) && ec2.json.holders.every((h) => h.share >= 0 && h.share <= 1));
  const sc = await call('GET', '/api/admin/security', { jar: PA.jar, ip: PA.ip });
  ok('seguridad: conteos, días, marcadas y redes compartidas', sc.status === 200 && sc.json.days.length === 30 && typeof sc.json.counts.login_fail.d30 === 'number' && Array.isArray(sc.json.shared) && !JSON.stringify(sc.json).includes('ip_hash'));
  ok('seguridad: una cuenta normal no la ve', (await call('GET', '/api/admin/security', { jar: PN.jar, ip: PN.ip })).status === 404);
  // soporte: el jugador abre un caso desde el juego, el admin lo ve con contexto y responde; nadie ve casos ajenos
  {
    limiter.m.clear();
    const PR = await mkPlayer(192); await state(PR);
    const mails = () => (outbox().match(/Respuesta de soporte/g) ?? []).length;
    const PNG = 'data:image/png;base64,' + Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40)]).toString('base64');
    ok('soporte: sin sesión no se abre un caso', (await call('POST', '/api/support/new', { ip: newIp(), body: { topic: 'bug', body: 'algo pasa en el juego' } })).status === 401);
    ok('soporte: un mensaje demasiado corto se rechaza', (await call('POST', '/api/support/new', { jar: PN.jar, ip: PN.ip, body: { topic: 'bug', body: 'hola' } })).json.error === 'too_short');
    ok('soporte: una «imagen» que no es imagen se rechaza', (await call('POST', '/api/support/new', { jar: PN.jar, ip: PN.ip, body: { topic: 'bug', body: 'mi planta no crece nada', image: 'data:image/png;base64,' + Buffer.from('<script>x</script>').toString('base64') } })).json.error === 'bad_image');
    const nt = await call('POST', '/api/support/new', { jar: PN.jar, ip: PN.ip, body: { topic: 'bug', body: 'Mi planta no crece desde ayer', image: PNG, context: { screen: 'cultivo', device: 'celular Android Chrome', build: 'b1' } } });
    ok('soporte: el jugador abre un caso con captura', nt.status === 200 && nt.json.id > 0);
    const id = nt.json.id;
    const list = await call('GET', '/api/admin/support', { jar: PA.jar, ip: PA.ip });
    ok('soporte: el panel lo ve como nuevo y sin leer', list.status === 200 && list.json.tickets.some((t) => t.id === id && t.status === 'nuevo' && t.unread_admin === 1) && list.json.unread >= 1);
    const full = await call('GET', `/api/admin/support/ticket?id=${id}`, { jar: PA.jar, ip: PA.ip });
    ok('soporte: el caso trae el contexto que puso el juego', full.json.ticket.context.screen === 'cultivo' && full.json.ticket.context.device === 'celular Android Chrome' && Array.isArray(full.json.ticket.context.errors) && full.json.ticket.messages[0].has_image);
    const img = await call('GET', full.json.ticket.messages[0].image, { jar: PA.jar, ip: PA.ip });
    ok('soporte: el admin ve la captura; otro jugador no', img.status === 200 && (await call('GET', full.json.ticket.messages[0].image, { jar: PR.jar, ip: PR.ip })).status === 404);
    ok('soporte: otro jugador no ve el caso', (await call('GET', `/api/support/ticket?id=${id}`, { jar: PR.jar, ip: PR.ip })).status === 404);
    ok('soporte: una cuenta normal no ve la bandeja', (await call('GET', '/api/admin/support', { jar: PN.jar, ip: PN.ip })).status === 404);
    const m0 = mails();
    const rep = await call('POST', '/api/admin/support/reply', { jar: PA.jar, ip: PA.ip, body: { id, body: 'Ya lo revisamos: riega la planta y vuelve a crecer.' } });
    ok('soporte: el admin responde, el caso pasa a en curso y sale el correo', rep.status === 200 && mails() === m0 + 1 && /caso #\d+/.test(outbox()) && db.prepare('SELECT status FROM support_tickets WHERE id = ?').get(id).status === 'en_curso');
    const mine = await call('GET', '/api/support/mine', { jar: PN.jar, ip: PN.ip });
    ok('soporte: el jugador ve que tiene una respuesta', mine.json.unread === 1 && mine.json.tickets[0].unread === true && mine.json.email === 'support@yieldbudempire.com');
    const seen = await call('GET', `/api/support/ticket?id=${id}`, { jar: PN.jar, ip: PN.ip });
    ok('soporte: al abrirlo la lee y ya no queda pendiente', seen.json.ticket.messages.length === 2 && seen.json.ticket.messages[1].author === 'admin' && !('context' in seen.json.ticket) && (await call('GET', '/api/support/mine', { jar: PN.jar, ip: PN.ip })).json.unread === 0);
    await call('POST', '/api/admin/support/status', { jar: PA.jar, ip: PA.ip, body: { id, status: 'resuelto' } });
    await call('POST', '/api/support/reply', { jar: PN.jar, ip: PN.ip, body: { id, body: 'Volvió a pasar hoy' } });
    ok('soporte: si el jugador escribe en un caso resuelto, se reabre', db.prepare('SELECT status, unread_admin FROM support_tickets WHERE id = ?').get(id).status === 'en_curso');
  }
  // sección Solana del panel: solo admins; lo mal formado se rechaza sin tocar la red
  ok('solana: una cuenta normal recibe 404', (await call('GET', '/api/admin/chain/status', { jar: PN.jar, ip: PN.ip })).status === 404 && (await call('GET', '/api/admin/chain/tx?sig=x', { jar: PN.jar, ip: PN.ip })).status === 404);
  ok('solana: firma o dirección mal formada → 400', (await call('GET', '/api/admin/chain/tx?sig=hola', { jar: PA.jar, ip: PA.ip })).json.error === 'bad_signature' && (await call('GET', '/api/admin/chain/nft?asset=0OIl', { jar: PA.jar, ip: PA.ip })).json.error === 'bad_address');
  // acciones de admin desde el panel: invitaciones, regalo, bloqueo; nunca para una cuenta normal, nunca contra un admin
  {
    const A = (body, P = PA) => call('POST', '/api/admin/action', { jar: P.jar, ip: P.ip, body });
    ok('acciones: una cuenta normal recibe 404', (await A({ action: 'invite', count: 1 }, PN)).status === 404);
    const iv = await A({ action: 'invite', count: 2, uses: 3, note: 'prueba panel' });
    ok('acciones: crea invitaciones con su enlace', iv.status === 200 && iv.json.codes.length === 2 && /^YBE-\w{4}-\w{4}$/.test(iv.json.codes[0].code) && iv.json.codes[0].link.includes('?invite=') && db.prepare('SELECT max_uses FROM invites WHERE code = ?').get(iv.json.codes[0].code).max_uses === 3);
    const rv = await A({ action: 'revoke', code: iv.json.codes[1].code });
    ok('acciones: anula una invitación', rv.status === 200 && db.prepare('SELECT revoked FROM invites WHERE code = ?').get(iv.json.codes[1].code).revoked === 1);
    const gf = await A({ action: 'gift', id: PN.id, amount: 750, noteEs: 'gracias', noteEn: 'thanks' });
    const gRow = db.prepare('SELECT amount, note FROM gifts WHERE account_id = ? ORDER BY id DESC').get(PN.id);
    ok('acciones: regala un cofre de $FLORA con su nota en dos idiomas', gf.status === 200 && gRow.amount === 750 && JSON.parse(gRow.note).en === 'thanks');
    ok('acciones: el monto tiene límite', (await A({ action: 'gift', id: PN.id, amount: 5_000_000 })).status === 400 && (await A({ action: 'gift', id: PN.id, amount: 0 })).status === 400);
    ok('acciones: no se bloquea a un admin', (await A({ action: 'ban', id: PA.id })).json.error === 'is_admin');
    const bn = await A({ action: 'ban', id: PN.id, reason: 'prueba' });
    ok('acciones: bloquear cierra sus sesiones', bn.status === 200 && (await call('GET', '/api/game/state', { jar: PN.jar, ip: PN.ip })).status === 401 && db.prepare('SELECT flags FROM accounts WHERE id = ?').get(PN.id).flags.includes('banned,'));
    const ub = await A({ action: 'unban', id: PN.id });
    ok('acciones: desbloquear', ub.status === 200 && !db.prepare('SELECT flags FROM accounts WHERE id = ?').get(PN.id).flags.includes('banned,'));
    ok('acciones: queda registrado quién la hizo', db.prepare("SELECT COUNT(*) AS n FROM audit WHERE event IN ('admin_gift','admin_ban','admin_unban','admin_panel_invite','admin_panel_revoke') AND detail LIKE '%(panel)%'").get().n >= 5);
    ok('acciones: sin el encabezado anti-CSRF se rechaza', (await call('POST', '/api/admin/action', { jar: PA.jar, ip: PA.ip, body: { action: 'invite' }, headers: { 'x-cf-csrf': '0' } })).status === 403);
  }
  limiter.m.clear();   // the two accounts above count against the per-minute sign-up budget of the sections below
}
// ── cuentas de desarrollador: juegan con su saldo de prueba, pero nada real sale con $FLORA
{
  const DV = await mkPlayer(95); await state(DV); setFlora(DV, 2_000_000);
  db.prepare("UPDATE accounts SET flags = flags || 'dev,' WHERE id = ?").run(DV.id);
  const r = await call('POST', '/api/game/action', { jar: DV.jar, ip: DV.ip, body: { type: 'redeemV2p', params: { itemId: 'v2p_cbd_drops', name: 'X', country: 'CR' } } });
  ok('desarrollador: no puede canjear productos reales (V2P) y no se le cobra', r.status === 400 && /desarrollador/.test(r.json.text ?? '') && wallet(DV).flora === 2_000_000);
  ok('desarrollador: el estado lo dice', (await state(DV)).snapshot.dev === true);
  const w = await call('POST', '/api/game/action', { jar: DV.jar, ip: DV.ip, body: { type: 'waterPlant', params: { idx: 0 } } });
  ok('desarrollador: puede jugar normal', w.status === 200);
  const NP = await mkPlayer(96); await state(NP); setFlora(NP, 5000);
  const n = await call('POST', '/api/game/action', { jar: NP.jar, ip: NP.ip, body: { type: 'redeemV2p', params: { itemId: 'v2p_grow_hoodie', name: 'Y', country: 'CR' } } });
  ok('una cuenta normal sí canjea', n.status === 200 && (await state(NP)).snapshot.dev === false);
}
// ── cofres de actividad y reliquias: se ganan jugando, bonos con tope, se venden entre jugadores
{
  const game = (P, type, params = {}) => call('POST', '/api/game/action', { jar: P.jar, ip: P.ip, body: { type, params } });
  const gRow = (P) => JSON.parse(db.prepare('SELECT json FROM game_state WHERE account_id = ?').get(P.id).json);
  const gPut = (P, st) => db.prepare('UPDATE game_state SET json = ? WHERE account_id = ?').run(JSON.stringify(st), P.id);
  const eSet = (P, f) => { const st = stateRow(P); f(st); db.prepare('UPDATE econ_state SET json = ? WHERE account_id = ?').run(JSON.stringify(st), P.id); };
  const RA = await mkPlayer(100); await state(RA); await call('GET', '/api/game/state', { jar: RA.jar, ip: RA.ip });
  // una partida guardada antes de las reliquias (sin el campo de actividad) carga igual
  { const old = gRow(RA); delete old.activity; gPut(RA, old); const g0 = await call('GET', '/api/game/state', { jar: RA.jar, ip: RA.ip });
    ok('reliquias: una partida vieja sin actividad carga y la recibe vacía', g0.status === 200 && g0.json.state.activity?.pending === 0); }
  // una cuenta nueva no gana cofres (antigüedad y rango), aunque juegue
  let st = gRow(RA); st.activity = { ...st.activity, points: 200, days: ['2000-01-01', '2000-01-02', '2000-01-03', '2000-01-04', '2000-01-05'] }; gPut(RA, st);
  await game(RA, 'waterPlant', { idx: 0 });
  ok('reliquias: una cuenta nueva (menos de 7 días, rango 1) no gana cofres', gRow(RA).activity.pending === 0);
  eSet(RA, (x) => { x.created = Date.now() - 10 * 86400000; x.empireRank = 2; });
  st = gRow(RA); st.activity = { ...st.activity, points: 59, perKind: {}, days: ['2000-01-01', '2000-01-02'], earned: 0, pending: 0 }; gPut(RA, st);
  const w = await game(RA, 'waterPlant', { idx: 0 });
  ok('reliquias: con 60 puntos y 3 días se gana el primer cofre (y lo avisa)', gRow(RA).activity.pending === 1 && w.json.fx.some((f) => /cofre de actividad/i.test(f.m ?? '')));
  for (let i = 0; i < 25; i++) await game(RA, 'waterPlant', { idx: 0 });
  ok('reliquias: regar sin parar no llena la semana (tope por tipo)', (gRow(RA).activity.perKind.water ?? 0) <= 15);
  st = gRow(RA); st.activity = { ...st.activity, points: 1000, days: ['a', 'b', 'c', 'd', 'e', 'f'] }; gPut(RA, st);
  await game(RA, 'feedNutrients', { idx: 0 });
  ok('reliquias: máximo 2 cofres por semana', gRow(RA).activity.earned === 2 && gRow(RA).activity.pending === 2);
  ok('reliquias: el navegador no puede pedir una reliquia directo', (await intent(RA, 'relic_chest', {})).json.error === 'unknown_intent' && (await game(RA, 'relic_chest')).json.error === 'unknown_action');
  const o1 = await game(RA, 'openActivityChest');
  const r1 = o1.json.result;
  ok('reliquias: abrir el cofre acuña una reliquia única con serie y la guarda como NFT', o1.status === 200 && /^relic-\d+$/.test(r1.id) && r1.serial > 1000 && !!db.prepare("SELECT 1 FROM nfts WHERE id = ? AND kind = 'relic'").get(r1.id) && gRow(RA).activity.pending === 1);
  await game(RA, 'openActivityChest');
  ok('reliquias: sin cofres pendientes no se abre nada', (await game(RA, 'openActivityChest')).status === 400);
  // equipar: 3 como máximo, distintas; bonos dentro del tope
  const mk = (P, n, stat, rarity = 'legendary') => { const rid = `relic-test-${P.id}-${n}`; db.prepare("INSERT INTO nfts (id, account_id, kind, data, minted_at) VALUES (?,?,?,?,?)").run(rid, P.id, 'relic', JSON.stringify({ id: rid, typeId: 'x', stat, rarity, value: 1, serial: 900 + n, season: 'classic', mintedAt: Date.now() }), Date.now()); return rid; };
  const a1 = mk(RA, 1, 'roomYield'), a2 = mk(RA, 2, 'roomYield'), a3 = mk(RA, 3, 'growth'), a4 = mk(RA, 4, 'labYield'), a5 = mk(RA, 5, 'plotYield');
  await game(RA, 'unequipRelic', { relicId: r1.id });
  ok('reliquias: equipar una', (await game(RA, 'equipRelic', { relicId: a1 })).status === 200 && (await state(RA)).snapshot.relicEquip.includes(a1));
  ok('reliquias: no se equipan dos del mismo tipo', (await game(RA, 'equipRelic', { relicId: a2 })).json.error === 'relic_same_stat');
  await game(RA, 'equipRelic', { relicId: a3 }); await game(RA, 'equipRelic', { relicId: a4 });
  ok('reliquias: máximo 3 equipadas', (await game(RA, 'equipRelic', { relicId: a5 })).json.error === 'relic_slots');
  const mods = sim.relics.relicMods([{ stat: 'roomYield', rarity: 'legendary' }, { stat: 'growth', rarity: 'legendary' }]);
  ok('reliquias: el bono respeta su tope (sala +8 %, crecimiento +5 %) y nunca toca el precio de venta', mods.roomYield === 0.08 && mods.growth === 0.05 && !('sellBonus' in mods));
  // fundir
  const matBefore = (await state(RA)).snapshot.inventory.materials.resina_refinada ?? 0;
  const m = await game(RA, 'meltRelic', { relicId: a4 });
  ok('reliquias: fundir da materiales y la reliquia deja de existir', m.status === 200 && (await state(RA)).snapshot.inventory.materials.resina_refinada === matBefore + 5 && !db.prepare('SELECT 1 FROM nfts WHERE id = ?').get(a4) && !(await state(RA)).snapshot.relicEquip.includes(a4));
  // mercado entre jugadores
  const RB = await mkPlayer(101); await state(RB); setFlora(RB, 5000);
  const ls = await intent(RA, 'list', { nftId: a5, price: 300 });
  ok('reliquias: se ponen a la venta en el mercado', ls.status === 200 && (await market(RB, '?kind=relic')).listings.some((l) => l.nftId === a5));
  const bb = await intent(RB, 'buy_listing', { listingId: ls.json.result.listingId });
  ok('reliquias: otro jugador la compra y pasa a ser suya', bb.status === 200 && owner(a5) === RB.id);
  // una equipada que se pone a la venta deja de dar su bono
  await intent(RA, 'list', { nftId: a1, price: 100 });
  ok('reliquias: una reliquia en venta deja de estar equipada', !(await state(RA)).snapshot.relicEquip.includes(a1));
  // cuentas de desarrollador: reliquias ligadas
  const RD = await mkPlayer(102); await state(RD); await call('GET', '/api/game/state', { jar: RD.jar, ip: RD.ip });
  db.prepare("UPDATE accounts SET flags = flags || 'dev,' WHERE id = ?").run(RD.id);
  const sd = gRow(RD); sd.activity = { ...sd.activity, pending: 1 }; gPut(RD, sd);
  const od = await game(RD, 'openActivityChest');
  ok('reliquias: una cuenta de desarrollador recibe reliquias ligadas que no se pueden vender', od.status === 200 && od.json.result.bound === true && (await intent(RD, 'list', { nftId: od.json.result.id, price: 100 })).json.error === 'relic_bound');
}
// ── puente on-chain de reliquias (con una cadena falsa en memoria)
{
  const game = (P, type, params = {}) => call('POST', '/api/game/action', { jar: P.jar, ip: P.ip, body: { type, params } });
  const br = (P, path, body) => (body === undefined ? call('GET', `/api/bridge/${path}`, { jar: P.jar, ip: P.ip }) : call('POST', `/api/bridge/${path}`, { jar: P.jar, ip: P.ip, body }));
  const chain = bridge.chain;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const link = (P, addr) => db.prepare("INSERT INTO wallet_links (account_id, chain, address, linked_at) VALUES (?, 'solana', ?, ?)").run(P.id, addr, Date.now());
  const relic = (P, n, rarity = 'rare', extra = {}) => { const rid = `relic-br-${P.id}-${n}`; db.prepare("INSERT INTO nfts (id, account_id, kind, data, minted_at) VALUES (?,?,?,?,?)").run(rid, P.id, 'relic', JSON.stringify({ id: rid, typeId: 'soil', stat: 'roomYield', rarity, value: 0.04, serial: 5000 + P.id * 10 + n, season: 'classic', mintedAt: Date.now(), ...extra }), Date.now()); return rid; };
  const BA = await mkPlayer(110); await state(BA); setFlora(BA, 1000);
  const r1 = relic(BA, 1);
  ok('puente: sin billetera vinculada no sale', (await br(BA, 'withdraw', { relicId: r1 })).json.error === 'bridge_no_wallet');
  link(BA, 'WalletA111111111111111111111111111111111111');
  const rb = relic(BA, 2, 'rare', { bound: true });
  ok('puente: una reliquia ligada no sale', (await br(BA, 'withdraw', { relicId: rb })).json.error === 'relic_bound');
  await game(BA, 'equipRelic', { relicId: r1 });
  ok('puente: una reliquia equipada no sale', (await br(BA, 'withdraw', { relicId: r1 })).json.error === 'bridge_equipped');
  await game(BA, 'unequipRelic', { relicId: r1 });
  const f0 = wallet(BA).flora;
  const w = await br(BA, 'withdraw', { relicId: r1 });
  ok('puente: sacar una reliquia rara quema 40 $FLORA y la deja en camino', w.status === 200 && w.json.fee === 40 && wallet(BA).flora === f0 - 40 && !(await state(BA)).snapshot.relics.some((r) => r.id === r1));
  ok('puente: en camino no se puede vender ni equipar adentro', (await intent(BA, 'list', { nftId: r1, price: 100 })).json.error === 'not_yours' && (await game(BA, 'equipRelic', { relicId: r1 })).json.error === 'not_yours');
  await wait(700);
  const st1 = (await br(BA, 'status')).json;
  const out = st1.outside.find((x) => x.relic.id === r1);
  ok('puente: el proceso la acuña en la colección, en la billetera del jugador', out?.state === 'onchain' && (await chain.fetchAsset(out.asset))?.owner === 'WalletA111111111111111111111111111111111111' && (await chain.fetchAsset(out.asset)).collection === st1.collection);
  // metadatos públicos
  const meta = (await call('GET', `/api/nft/relic?s=${out.relic.serial}`, { ip: newIp() })).json;
  const img = await fetch(`${base}/api/nft/relic-image?s=${out.relic.serial}`);
  ok('puente: metadatos públicos con atributos e imagen SVG', meta.name?.includes(`#${out.relic.serial}`) && meta.attributes?.length >= 4 && img.headers.get('content-type') === 'image/svg+xml' && (await img.text()).startsWith('<svg'));
  // venta afuera: pasa a otra billetera, y esa cuenta la trae al juego
  const BB = await mkPlayer(111); await state(BB); link(BB, 'WalletB111111111111111111111111111111111111');
  chain.move(out.asset, 'WalletB111111111111111111111111111111111111', 'WalletA111111111111111111111111111111111111');
  ok('puente: la billetera nueva ve la reliquia en «Mis reliquias en Solana»', (await br(BB, 'mine')).json.assets.some((x) => x.asset === out.asset && x.relic?.id === r1));
  ok('puente: arma la transferencia a la bóveda para que la firme su billetera', (await br(BB, 'deposit-tx', { asset: out.asset })).json.tx?.length > 10 && (await br(BA, 'deposit-tx', { asset: out.asset })).json.error === 'bridge_not_owner');
  ok('puente: no se acredita si todavía no llegó a la bóveda', (await br(BB, 'deposit', { asset: out.asset })).json.error === 'bridge_not_in_vault');
  chain.move(out.asset, chain.address, 'WalletB111111111111111111111111111111111111');
  ok('puente: otra cuenta no puede reclamar lo que envió otra billetera', (await br(BA, 'deposit', { asset: out.asset })).json.error === 'bridge_not_sender');
  const d = await br(BB, 'deposit', { asset: out.asset });
  ok('puente: al llegar a la bóveda, la reliquia entra al juego en la cuenta que la envió', d.status === 200 && owner(r1) === BB.id && (await state(BB)).snapshot.relics.some((r) => r.id === r1));
  ok('puente: no se acredita dos veces', (await br(BB, 'deposit', { asset: out.asset })).json.error === 'bridge_already_in');
  chain.forge('Forged11111111111111111111111111111111111', chain.address);
  ok('puente: un activo de otra colección se rechaza', (await br(BB, 'deposit', { asset: 'Forged11111111111111111111111111111111111' })).json.error === 'bridge_not_ours');
  // volver a sacarla reutiliza el mismo activo (transferencia desde la bóveda, no una acuñación nueva)
  setFlora(BB, 1000);
  const w2 = await br(BB, 'withdraw', { relicId: r1 });
  await wait(700);
  ok('puente: sacarla otra vez usa el mismo activo', w2.json.asset === out.asset && (await chain.fetchAsset(out.asset)).owner === 'WalletB111111111111111111111111111111111111');
  // fallos: reintenta y, al final, devuelve la reliquia y el $FLORA
  const r3 = relic(BA, 3, 'legendary'); setFlora(BA, 1000);
  chain.fail = 100;
  await br(BA, 'withdraw', { relicId: r3 });
  for (let i = 0; i < 12; i++) { await bridge.work(); }
  chain.fail = 0;
  ok('puente: si la cadena falla una y otra vez, la reliquia y los 150 $FLORA vuelven', wallet(BA).flora === 1000 && (await state(BA)).snapshot.relics.some((r) => r.id === r3));
  // cuentas de desarrollador y tope diario
  const BD = await mkPlayer(112); await state(BD); link(BD, 'WalletD111111111111111111111111111111111111'); setFlora(BD, 1000);
  db.prepare("UPDATE accounts SET flags = flags || 'dev,' WHERE id = ?").run(BD.id);
  ok('puente: una cuenta de desarrollador no saca nada', (await br(BD, 'withdraw', { relicId: relic(BD, 1) })).json.error === 'bridge_dev');
  const BC = await mkPlayer(113); await state(BC); link(BC, 'WalletC111111111111111111111111111111111111'); setFlora(BC, 1000);
  for (let i = 1; i <= 3; i++) await br(BC, 'withdraw', { relicId: relic(BC, i, 'common') });
  ok('puente: máximo 3 salidas por cuenta al día', (await br(BC, 'withdraw', { relicId: relic(BC, 4, 'common') })).json.error === 'bridge_daily_cap');
  await wait(500);
}
// ── Pack de Fundador (Solana Pay en USDC, con una cadena falsa en memoria)
{
  limiter.m.clear();
  const fd = (P, path, body) => (body === undefined ? call('GET', `/api/founder/${path}`, { jar: P.jar, ip: P.ip }) : call('POST', `/api/founder/${path}`, { jar: P.jar, ip: P.ip, body }));
  const pay = founder.pay;
  const orderOf = async (P) => (await fd(P, 'order', {})).json.order;
  const settleNow = async () => { for (const o of db.prepare("SELECT * FROM founder_orders WHERE status = 'open'").all()) await founder.check(o); };
  const F1 = await mkPlayer(120); await state(F1);
  const st = (await fd(F1, 'status')).json;
  ok('fundador: estado con precio, cupo y sin pack', st.enabled && st.price === 20 && st.supply === 3 && st.left === 3 && st.me === null && st.order === null);
  const o1 = await orderOf(F1);
  ok('fundador: el pedido trae la URL de Solana Pay en USDC con su referencia', o1?.status === 'open' && o1.url.startsWith(`solana:${founder.receiver}?`) && o1.url.includes('amount=20') && o1.url.includes(`spl-token=${founder.mint}`) && o1.url.includes(`reference=${o1.reference}`));
  ok('fundador: pedir otra vez devuelve el mismo pedido abierto', (await orderOf(F1)).id === o1.id);
  ok('fundador: arma la transferencia para la billetera del navegador', (await fd(F1, 'pay-tx', { id: o1.id, payer: 'Payer11111111111111111111111111111111111111' })).json.tx?.length > 10 && (await fd(F1, 'pay-tx', { id: o1.id, payer: 'nope' })).status === 400);
  const FU = await mkPlayer(121); await state(FU);
  const ou = await orderOf(FU);
  pay.pay(ou.reference, 5_000_000);
  ok('fundador: un pago de menos no entrega nada y queda para revisar', (await fd(FU, `order?id=${ou.id}`)).json.order.status === 'underpaid' && founder.numberOf(FU.id) === null);
  ok('fundador: sin pago el pedido sigue abierto', (await fd(F1, `order?id=${o1.id}`)).json.order.status === 'open');
  pay.pay(o1.reference, 20_000_000);
  const g1 = (await fd(F1, `order?id=${o1.id}`)).json;
  ok('fundador: al llegar el pago se entrega el pack #1', g1.order.status === 'delivered' && g1.me?.number === 1 && founder.numberOf(F1.id) === 1);
  const av = db.prepare('SELECT data FROM nfts WHERE id = ?').get(`av-${F1.id}-fundador-1`);
  ok('fundador: el avatar Fundador queda en la cuenta, ligado', !!av && JSON.parse(av.data).bound === true && (await state(F1)).snapshot.avatars.some((a) => a.designId === 'fundador-1'));
  ok('fundador: el avatar Fundador no se puede vender por $FLORA', (await intent(F1, 'list', { designId: 'fundador-1', price: 500 })).json.error === 'avatar_bound');
  ok('fundador: el correo de confirmación dice el número', /Fundador #1 de Yield Bud Empire/.test(outbox()));
  await settleNow(); await founder.check(db.prepare('SELECT * FROM founder_orders WHERE id = ?').get(o1.id));
  ok('fundador: revisar otra vez no entrega dos veces', db.prepare('SELECT COUNT(*) n FROM founders').get().n === 1);
  ok('fundador: un fundador no puede pedir otro pack', (await fd(F1, 'order', {})).json.error === 'founder_already');
  // la misma firma no paga dos pedidos
  const F2 = await mkPlayer(122); await state(F2);
  const o2 = await orderOf(F2);
  pay.pay(o2.reference, 20_000_000, undefined, `Sig-${o1.reference}`);
  await settleNow();
  ok('fundador: una firma ya usada no paga otro pedido', db.prepare('SELECT status FROM founder_orders WHERE id = ?').get(o2.id).status === 'open' && founder.numberOf(F2.id) === null);
  // pago tardío (el pedido ya venció) con packs disponibles: se entrega igual
  db.prepare('UPDATE founder_orders SET expires_at = ? WHERE id = ?').run(Date.now() - 1000, o2.id);
  ok('fundador: un pedido vencido se ve como vencido', (await fd(F2, 'status')).json.order === null);
  pay.pay(o2.reference, 20_000_000);
  await settleNow();
  ok('fundador: un pago tardío se entrega si queda cupo', founder.numberOf(F2.id) === 2);
  // cupo: los pedidos abiertos de otros apartan su pack mientras están vigentes
  const F3 = await mkPlayer(123); await state(F3);
  const o3 = await orderOf(F3);
  const F4 = await mkPlayer(124); await state(F4);
  ok('fundador: sin cupo (pedidos abiertos de otros cuentan) no se puede pedir', (await fd(F4, 'order', {})).json.error === 'founder_sold_out' && (await fd(F4, 'status')).json.left === 0);
  pay.pay(o3.reference, 25_000_000);
  await settleNow();
  ok('fundador: pagar de más también entrega (el pack #3)', founder.numberOf(F3.id) === 3);
  // agotado: un pago que llega igual queda para devolver
  const now = Date.now();
  const late = db.prepare("INSERT INTO founder_orders (account_id, reference, amount, status, created_at, expires_at) VALUES (?, 'RefLate11111111111111111111111111111111111', 20000000, 'open', ?, ?)").run(F4.id, now, now + 60_000).lastInsertRowid;
  pay.pay('RefLate11111111111111111111111111111111111', 20_000_000);
  await settleNow();
  ok('fundador: agotados, el pago queda marcado para devolver', db.prepare('SELECT status FROM founder_orders WHERE id = ?').get(late).status === 'refund_needed' && founder.numberOf(F4.id) === null && db.prepare('SELECT COUNT(*) n FROM founders').get().n === 3);
  // si la cadena falla, el pedido sigue abierto y se reintenta
  const FX = await mkPlayer(125); await state(FX);
  const ox = db.prepare("INSERT INTO founder_orders (account_id, reference, amount, status, created_at, expires_at) VALUES (?, 'RefFail11111111111111111111111111111111111', 20000000, 'open', ?, ?)").run(FX.id, now, now + 60_000).lastInsertRowid;
  pay.fail = 1; await settleNow();
  ok('fundador: un error de la cadena no cierra el pedido', db.prepare('SELECT status, error FROM founder_orders WHERE id = ?').get(ox).status === 'open');
  // créditos
  let pub = (await call('GET', '/api/public/founders', { ip: newIp() })).json;
  ok('fundador: créditos públicos con los tres fundadores', pub.sold === 3 && pub.founders.length === 3 && pub.founders[0].number === 1 && pub.founders[0].name === 'Econ Player 120');
  await fd(F2, 'credits', { show: false });
  pub = (await call('GET', '/api/public/founders', { ip: newIp() })).json;
  ok('fundador: quien lo pide no aparece en los créditos', pub.founders.length === 2 && !pub.founders.some((f) => f.number === 2) && (await fd(F2, 'status')).json.me.credits === false);
  ok('fundador: solo un fundador cambia los créditos', (await fd(FU, 'credits', { show: false })).status === 404);
  // títulos del pack y acceso anticipado
  const me1 = (await fd(F1, 'status')).json.me;
  ok('fundador: trae los títulos Arquitecto y Maestro, sin ninguno elegido, y el acceso anticipado', me1.titles.join() === 'arquitecto,maestro' && me1.title === null && me1.earlyAccess === true);
  const t1 = await fd(F1, 'title', { title: 'maestro' });
  ok('fundador: elige qué título mostrar y sale en los créditos', t1.status === 200 && t1.json.me.title === 'maestro' && (await call('GET', '/api/public/founders', { ip: newIp() })).json.founders.find((f) => f.number === 1).title === 'maestro');
  ok('fundador: un título que no es del pack se rechaza', (await fd(F1, 'title', { title: 'rey' })).status === 400);
  ok('fundador: puede no mostrar ninguno', (await fd(F1, 'title', { title: null })).json.me.title === null);
  ok('fundador: quien no es fundador no elige título', (await fd(FU, 'title', { title: 'maestro' })).status === 404);
  ok('fundador: otra cuenta no ve un pedido ajeno', (await fd(FU, `order?id=${o1.id}`)).status === 404);
  ok('fundador: sin sesión no hay pedido', (await call('POST', '/api/founder/order', { ip: newIp(), body: {} })).status === 401);
}
// ── retos: si la economía ya pagó un reto que el juego tenía abierto, reclamarlo lo cierra (sin volver a pagar)
{
  limiter.m.clear();
  const Q = await mkPlayer(131); await state(Q);
  await call('GET', '/api/game/state', { jar: Q.jar, ip: Q.ip });
  const C = sim.core;
  const g = C.unpackGame(JSON.parse(db.prepare('SELECT json FROM game_state WHERE account_id = ?').get(Q.id).json));
  g.quests = [...g.quests.filter((x) => x.id !== 'quest_machine_repair'), { id: 'quest_machine_repair', currentCount: 1, isCompleted: true, isClaimed: false }];
  db.prepare('UPDATE game_state SET json = ? WHERE account_id = ?').run(JSON.stringify(C.packGame(g)), Q.id);
  const es = JSON.parse(db.prepare('SELECT json FROM econ_state WHERE account_id = ?').get(Q.id).json);
  es.questsClaimed = [...(es.questsClaimed ?? []), 'quest_machine_repair'];
  db.prepare('UPDATE econ_state SET json = ? WHERE account_id = ?').run(JSON.stringify(es), Q.id);
  const f0 = wallet(Q).flora;
  const r1 = await call('POST', '/api/game/action', { jar: Q.jar, ip: Q.ip, body: { type: 'claimQuestReward', params: { questId: 'quest_machine_repair' } } });
  const qq = C.unpackGame(JSON.parse(db.prepare('SELECT json FROM game_state WHERE account_id = ?').get(Q.id).json)).quests.find((x) => x.id === 'quest_machine_repair');
  ok('retos: un reto ya cobrado por la economía se cierra al reclamarlo, sin pagar dos veces', r1.status === 200 && qq.isClaimed === true && wallet(Q).flora === f0, `(${r1.status} ${JSON.stringify(r1.json?.error ?? '')})`);
}
// ── aviso de cosecha por correo (jugadores ausentes)
{
  limiter.m.clear();
  const H = await mkPlayer(130); await state(H);
  await call('GET', '/api/game/state', { jar: H.jar, ip: H.ip });
  db.prepare('UPDATE accounts SET email_verified = 1 WHERE id = ?').run(H.id);
  const C = sim.core;
  const g = C.unpackGame(JSON.parse(db.prepare('SELECT json FROM game_state WHERE account_id = ?').get(H.id).json));
  g.indoorPlants = g.indoorPlants.map((p, i) => (i === 0 ? { ...p, progressPercent: 100, stage: 'ready_harvest', sim: { ...(p.sim ?? {}), progress: 100 } } : p));
  const setGame = (st, age) => db.prepare('UPDATE game_state SET json = ?, updated_at = ? WHERE account_id = ?').run(JSON.stringify(C.packGame(st)), Date.now() - age, H.id);
  const mails = () => (outbox().match(/tu cosecha está lista/g) ?? []).length;
  setGame(g, 5 * 60_000);
  const m0 = mails();
  await game.harvestAlerts();
  ok('cosecha: un jugador conectado hace poco no recibe correo', mails() === m0);
  setGame(g, 60 * 60_000);
  await game.harvestAlerts();
  ok('cosecha: un jugador ausente con plantas listas recibe un correo', mails() === m0 + 1 && /Una planta está lista para cosechar/.test(outbox()));
  await game.harvestAlerts();
  ok('cosecha: la misma cosecha no se avisa dos veces', mails() === m0 + 1);
  ok('cosecha: revisar no guarda la partida (el resumen al volver sigue intacto)', Date.now() - db.prepare('SELECT updated_at FROM game_state WHERE account_id = ?').get(H.id).updated_at >= 59 * 60_000);
  const link = /\/api\/notify\/harvest-off\?a=(\d+)&t=([^\s]+)/.exec(outbox());
  ok('cosecha: un enlace falso no da de baja', (await call('GET', `/api/notify/harvest-off?a=${H.id}&t=nope`, { ip: newIp() })).status === 400);
  const offR = await fetch(`${base}/api/notify/harvest-off?a=${link[1]}&t=${link[2]}`);
  ok('cosecha: el enlace del correo da de baja los avisos', offR.status === 200 && db.prepare('SELECT harvest_mail FROM accounts WHERE id = ?').get(H.id).harvest_mail === 0);
  db.prepare('DELETE FROM harvest_notices WHERE account_id = ?').run(H.id);
  await game.harvestAlerts();
  ok('cosecha: dado de baja, no recibe más', mails() === m0 + 1);
}
// ── idioma de la cuenta: correos en inglés para quien juega en inglés
{
  limiter.m.clear();   // the sections above created many accounts within a minute (global sign-up budget)
  cfg.inviteOnly = false;
  const j = {};
  const r = await reg({ jar: j, body: { email: 'english.player@example.com', username: 'English Grower', lang: 'en' } });
  const me = await call('GET', '/api/auth/me', { jar: j, ip: r.ip });
  ok('idioma: la cuenta guarda el idioma con el que se registró', me.json.account.lang === 'en');
  ok('idioma: el correo de confirmación sale en inglés', /Confirm your Yield Bud Empire account[\s\S]*Welcome, English Grower!/.test(outbox()));
  let l = await call('POST', '/api/auth/lang', { jar: j, ip: r.ip, body: { lang: 'es' } });
  ok('idioma: el jugador lo puede cambiar', l.status === 200 && (await call('GET', '/api/auth/me', { jar: j, ip: r.ip })).json.account.lang === 'es');
  l = await call('POST', '/api/auth/lang', { jar: j, ip: r.ip, body: { lang: 'fr' } });
  ok('idioma: solo es o en', l.status === 400);
  ok('idioma: sin sesión no se puede cambiar', (await call('POST', '/api/auth/lang', { ip: newIp(), body: { lang: 'en' } })).status === 401);
  const r2 = await reg({ body: { email: 'sin.idioma@example.com', username: 'Sin Idioma' } });
  ok('idioma: sin idioma el correo sale en español', r2.status === 200 && /Confirma tu cuenta de Yield Bud Empire[\s\S]*Bienvenido, Sin Idioma/.test(outbox()));
}
cfg.inviteOnly = true;
cfg.inviteOnly = false;
console.log(failed ? `\n${failed} FALLOS` : '\nTodo OK');
server.close(); mock.close();
fs.rmSync(dir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
