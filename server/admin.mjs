// Operator tool: node server/admin.mjs stats | games | dev <username> [off] | bridge [airdrop] | aviso <archivo.json> [enviar] | flagged | audit [n] | ban <username> | unban <username> | setpass <email> | gift <email> <monto> [nota]
//                | invite [cantidad] [usos] [nota] | invites | revoke <código> | seats <N> | wave <N> | waiting | prereg | founder [grant <usuario> | refunded <pedido>]
//                | panel [<usuario> [off]]   (acceso al panel de operadores, /#panel en el juego)
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { hashPassword, passwordProblem, emailKey } from './lib.mjs';
import { fileURLToPath } from 'node:url';
const dir = process.env.DATA_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const db = new DatabaseSync(path.join(dir, 'accounts.db'));
const [cmd = 'stats', arg, extra] = process.argv.slice(2);
// la tabla la crea el servicio al arrancar; acá también, por si se generan códigos antes
db.exec("CREATE TABLE IF NOT EXISTS invites (code TEXT PRIMARY KEY, note TEXT NOT NULL DEFAULT '', max_uses INTEGER NOT NULL DEFAULT 1, uses INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, expires_at INTEGER, revoked INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS invite_uses (code TEXT NOT NULL, account_id INTEGER NOT NULL, used_at INTEGER NOT NULL);");
try { db.exec('ALTER TABLE invites ADD COLUMN email_key TEXT'); } catch { /* ya existe */ }
const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newCode = () => { const b = Array.from(crypto.randomBytes(8), (x) => ABC[x % ABC.length]).join(''); return `YBE-${b.slice(0, 4)}-${b.slice(4)}`; };
const day = Date.now() - 86400_000;
if (cmd === 'stats') {
  const n = (sql, ...a) => db.prepare(sql).get(...a).n;
  console.log({ cuentas: n('SELECT COUNT(*) n FROM accounts'), verificadas: n('SELECT COUNT(*) n FROM accounts WHERE email_verified = 1'), nuevas24h: n('SELECT COUNT(*) n FROM accounts WHERE created_at > ?', day),
    marcadas: n("SELECT COUNT(*) n FROM accounts WHERE flags != ''"), sesionesActivas: n('SELECT COUNT(*) n FROM sessions WHERE expires_at > ?', Date.now()), bloqueadas: n('SELECT COUNT(*) n FROM accounts WHERE locked_until > ?', Date.now()) });
  console.table(db.prepare('SELECT event, COUNT(*) AS n FROM audit WHERE ts > ? GROUP BY event ORDER BY n DESC').all(day));
} else if (cmd === 'games') {
  // the games the server runs: level, plants, lots, seeds and where each one came from (a migrated browser save or new)
  const rows = db.prepare('SELECT g.account_id, a.username, g.json, g.version, g.migrated_from, g.updated_at FROM game_state g JOIN accounts a ON a.id = g.account_id ORDER BY g.account_id').all();
  console.table(rows.map((r) => { const s = JSON.parse(r.json); return {
    cuenta: r.account_id, jugador: r.username, nivel: s.playerLevel, xp: s.playerXp, sala: s.indoorPlants.length,
    parcelas: Object.values(s.plotPlants).map((x) => x.length).join('/'), lotes: s.assets.length, semillas: Object.values(s.seedInventory).reduce((a, b) => a + b, 0),
    lotesLab: s.products.length, acciones: r.version, origen: r.migrated_from ?? 'nueva', kb: Math.round(r.json.length / 1024) }; }));
} else if (cmd === 'flagged') {
  console.table(db.prepare("SELECT id, username, email, source, email_verified AS ok, flags, datetime(created_at/1000,'unixepoch') AS creada FROM accounts WHERE flags != '' ORDER BY created_at DESC LIMIT 100").all());
} else if (cmd === 'audit') {
  console.table(db.prepare("SELECT datetime(ts/1000,'unixepoch') AS cuando, event, account_id AS cuenta, ip_hash, detail FROM audit ORDER BY ts DESC LIMIT ?").all(Number(arg ?? 30)));
} else if (cmd === 'bridge') {
  // the relic bridge: its wallet (created here if missing, so it can be funded before turning the bridge on), balance, collection, jobs
  const { newKeypair, createChain } = await import('./gen/chain.mjs');
  const file = path.join(dir, 'bridge-keypair.json');
  if (!fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(newKeypair().secretKey), { mode: 0o600 }); console.log('billetera del puente creada'); }
  const rpc = process.env.SOLANA_RPC || 'https://api.devnet.solana.com';
  const chain = createChain({ rpc, secretKey: JSON.parse(fs.readFileSync(file, 'utf8')) });
  if (arg === 'airdrop') { try { console.log('airdrop:', await chain.airdrop(1)); } catch (e) { console.log('el faucet no respondió:', e.message); } }
  let col = null; try { col = db.prepare("SELECT v FROM bridge_meta WHERE k = 'collection'").get()?.v ?? null; } catch { /* no table yet */ }
  console.log({ red: rpc, activo: process.env.BRIDGE_ENABLED === '1', billetera: chain.address, saldoSOL: await chain.balance().catch(() => '¿?'), coleccion: col, explorador: chain.explorer('address', chain.address) });
  try { console.table(db.prepare("SELECT id, account_id AS cuenta, nft_id, dir, status, tries, substr(error, 1, 60) AS error, datetime(created_at/1000,'unixepoch') AS creado FROM bridge_jobs ORDER BY id DESC LIMIT 15").all()); } catch { /* no jobs yet */ }
} else if (cmd === 'aviso') {
  // aviso por correo a todas las cuentas verificadas, en su idioma: admin.mjs aviso <archivo.json> [enviar]
  // el archivo trae { "es": { "subject", "text", "html"? }, "en": { ... }, "solo"?: [ids] }; {usuario} se reemplaza por el nombre.
  // "html" es opcional (el texto va igual como alternativa); "solo" limita el envío a esas cuentas. Sin "enviar" solo muestra.
  const msg = JSON.parse(fs.readFileSync(arg, 'utf8'));
  const only = Array.isArray(msg.solo) ? new Set(msg.solo.map(Number)) : null;
  const rows = db.prepare('SELECT id, username, email, lang FROM accounts WHERE email_verified = 1 AND email IS NOT NULL ORDER BY id').all().filter((r) => !only || only.has(r.id));
  let mailer = null, ok = 0;
  for (const r of rows) {
    const m = msg[r.lang === 'en' ? 'en' : 'es'];
    const text = m.text.replaceAll('{usuario}', r.username);
    const subject = m.subject.replaceAll('{usuario}', r.username);
    const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const html = m.html ? m.html.replaceAll('{usuario}', esc(r.username)) : undefined;
    if (extra !== 'enviar') { console.log(`#${r.id} ${r.username} (${r.lang ?? 'es'}) → ${subject}${html ? ' · con HTML' : ''}`); continue; }
    if (!process.env.SMTP_URL) { console.log('falta SMTP_URL (cargar /data/oauth.env)'); break; }
    mailer ??= (await import('nodemailer')).default.createTransport(process.env.SMTP_URL);
    try { await mailer.sendMail({ from: process.env.MAIL_FROM ?? 'Yield Bud Empire <info@yieldbudempire.com>', to: r.email, subject, text, ...(html ? { html } : {}) }); ok++; console.log(`#${r.id} ${r.username}: enviado`); }
    catch (e) { console.log(`#${r.id} ${r.username}: no se pudo (${e.code ?? e.message})`); }
  }
  if (extra === 'enviar') console.log(`enviados ${ok} de ${rows.length}`);
} else if (cmd === 'panel') {
  // the operators' panel (server/panel.mjs, /#panel in the game): only accounts flagged admin can open it
  if (arg) {
    const a = db.prepare('SELECT id, flags FROM accounts WHERE username = ?').get(arg);
    if (!a) { console.error('no existe ese usuario'); process.exit(1); }
    if (extra === 'off') db.prepare("UPDATE accounts SET flags = replace(flags, 'admin,', '') WHERE id = ?").run(a.id);
    else if (!/(^|,)admin,/.test(a.flags)) db.prepare("UPDATE accounts SET flags = flags || 'admin,' WHERE id = ?").run(a.id);
    console.log(extra === 'off' ? `${arg}: ya no entra al panel` : `${arg}: entra al panel de operadores`);
  }
  console.table(db.prepare("SELECT id, username, flags FROM accounts WHERE flags LIKE '%admin,%'").all());
} else if (cmd === 'dev') {
  // developer account: keeps its test balance for playing, but can never take anything real out with $FLORA (V2P, future withdrawals)
  const a = db.prepare('SELECT id, flags FROM accounts WHERE username = ?').get(arg);
  if (!a) { console.error('no existe ese usuario'); process.exit(1); }
  if (extra === 'off') db.prepare("UPDATE accounts SET flags = replace(flags, 'dev,', '') WHERE id = ?").run(a.id);
  else if (!/(^|,)dev,/.test(a.flags)) db.prepare("UPDATE accounts SET flags = flags || 'dev,' WHERE id = ?").run(a.id);
  console.log(extra === 'off' ? `${arg}: ya no es cuenta de desarrollador` : `${arg}: cuenta de desarrollador (sin canjes reales con $FLORA)`);
  console.table(db.prepare("SELECT id, username, flags FROM accounts WHERE flags LIKE '%dev,%'").all());
} else if (cmd === 'ban' || cmd === 'unban') {
  const a = db.prepare('SELECT id FROM accounts WHERE username = ?').get(arg);
  if (!a) { console.error('no existe ese usuario'); process.exit(1); }
  if (cmd === 'ban') { db.prepare('UPDATE accounts SET locked_until = ?, flags = flags || ? WHERE id = ?').run(Date.now() + 100 * 365 * 86400_000, 'banned,', a.id); db.prepare('DELETE FROM sessions WHERE account_id = ?').run(a.id); }
  else db.prepare("UPDATE accounts SET locked_until = 0, failed = 0, flags = replace(flags, 'banned,', '') WHERE id = ?").run(a.id);
  console.log(cmd === 'ban' ? 'cuenta bloqueada y sesiones cerradas' : 'cuenta desbloqueada');
} else if (cmd === 'setpass') {
  // Operator reset for a lost password while there is no mail: verifies the address, sets a random temporary password (printed once,
  // never stored in clear) and signs the account out everywhere. Same scrypt + pepper as the service, so it logs in normally.
  const a = db.prepare('SELECT id, username, email FROM accounts WHERE email_key = ?').get(String(arg ?? '').trim().toLowerCase());
  if (!a) { console.error('no existe una cuenta con ese correo'); process.exit(1); }
  const MASTER = process.env.SECRET ?? fs.readFileSync(path.join(dir, 'secret.key'), 'utf8').trim();
  const PEPPER = crypto.createHmac('sha256', MASTER).update('pepper').digest('base64');
  let pw = '';
  do { pw = crypto.randomBytes(9).toString('base64url') + 'Xz7-' + crypto.randomBytes(3).toString('hex'); } while (passwordProblem(pw, { username: a.username, email: a.email ?? '' }));
  db.prepare('UPDATE accounts SET pass_hash = ?, email_verified = 1, failed = 0, locked_until = 0 WHERE id = ?').run(hashPassword(pw, PEPPER), a.id);
  db.prepare('DELETE FROM sessions WHERE account_id = ?').run(a.id);
  db.prepare('INSERT INTO audit (ts, event, account_id, ip_hash, detail) VALUES (?,?,?,?,?)').run(Date.now(), 'admin_setpass', a.id, null, 'operator');
  console.log(`cuenta #${a.id} (${a.username}) · correo verificado · contraseña temporal: ${pw}`);
} else if (cmd === 'gift') {
  // a chest for one account: it shows up in their game and credits the amount when they open it (needs the service to have run once, which creates the table)
  const a = db.prepare('SELECT id, username FROM accounts WHERE email_key = ?').get(String(arg ?? '').trim().toLowerCase());
  const amount = Math.floor(Number(extra));
  if (!a) { console.error('no existe una cuenta con ese correo'); process.exit(1); }
  if (!Number.isFinite(amount) || amount < 1 || amount > 10_000_000) { console.error('monto inválido (1 a 10 000 000)'); process.exit(1); }
  // "texto en español | text in English" → the chest shows each player the note in their language
  const raw = process.argv.slice(5).join(' ');
  const [es, en] = raw.split(' | ').map((s) => s.trim().slice(0, 120));
  const note = en ? JSON.stringify({ es, en }) : (es || 'Regalo de la casa');
  const r = db.prepare('INSERT INTO gifts (account_id, amount, note, created_at) VALUES (?,?,?,?)').run(a.id, amount, note, Date.now());
  db.prepare('INSERT INTO audit (ts, event, account_id, ip_hash, detail) VALUES (?,?,?,?,?)').run(Date.now(), 'admin_gift', a.id, null, String(amount));
  console.log(`cofre #${r.lastInsertRowid} enviado a la cuenta #${a.id} (${a.username}): ${amount} $FLORA · «${note}»`);
} else if (cmd === 'invite') {
  // códigos de invitación para la alfa: YBE-XXXX-XXXX, sin letras que se confunden (0/O, 1/I/L)
  const count = Math.max(1, Math.min(200, Math.floor(Number(arg ?? 1)) || 1));
  const uses = Math.max(1, Math.min(1000, Math.floor(Number(extra ?? 1)) || 1));
  const note = process.argv.slice(5).join(' ').slice(0, 80);
  const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const pick = () => Array.from(crypto.randomBytes(8), (b) => ABC[b % ABC.length]).join('');
  const ins = db.prepare('INSERT OR IGNORE INTO invites (code, note, max_uses, created_at) VALUES (?,?,?,?)');
  const made = [];
  while (made.length < count) { const b = pick(); const code = `YBE-${b.slice(0, 4)}-${b.slice(4)}`; if (ins.run(code, note, uses, Date.now()).changes) made.push(code); }
  const base = (process.env.PUBLIC_URL ?? 'https://play.yieldbudempire.com').replace(/\/$/, '');
  for (const c of made) console.log(`${c}   ${base}/?invite=${c}`);
  console.error(`${made.length} código(s) · ${uses} uso(s) cada uno${note ? ` · «${note}»` : ''}`);
} else if (cmd === 'seats' || cmd === 'wave' || cmd === 'waiting' || cmd === 'prereg') {
  // pre-registro de la alfa (el sitio lo llena solo; esto es para mirar la cola y abrir más lugares)
  const { createPrereg } = await import('./prereg.mjs');
  let mailer = null;
  const sendMail = async (to, subject, text) => {
    if (process.env.SMTP_URL) {
      mailer ??= (await import('nodemailer')).default.createTransport(process.env.SMTP_URL);
      try { await mailer.sendMail({ from: process.env.MAIL_FROM ?? 'Yield Bud Empire <info@yieldbudempire.com>', to, subject, text }); return true; } catch (e) { console.error(`  no se pudo enviar a ${to}: ${e.code ?? e.message}`); return false; }
    }
    fs.appendFileSync(path.join(dir, 'outbox.log'), `--- ${new Date().toISOString()} → ${to}\n${subject}\n${text}\n\n`, { mode: 0o600 });
    return false;
  };
  const pr = createPrereg({ db, sendMail, mustDeliver: !!process.env.SMTP_URL, publicUrl: process.env.PUBLIC_URL ?? 'https://play.yieldbudempire.com', defaultSeats: Number(process.env.ALPHA_SEATS ?? 30) });
  const show = () => { const st = pr.stats(); console.log(`Cupos: ${st.seats} · con código: ${st.invited} · en espera: ${st.waiting} · anotados en total: ${st.total}`); };
  if (cmd === 'waiting') {
    const rows = pr.waitingList();
    if (rows.length) console.table(rows.map((r, i) => ({ puesto: i + 1, correo: r.email, alias: r.alias ?? '', idioma: r.lang ?? 'es', anotado: new Date(r.created_at).toISOString().slice(0, 16).replace('T', ' ') })));
    else console.log('No hay nadie en espera.');
    show();
  } else if (cmd === 'prereg') {
    console.table(pr.all().map((r) => ({ id: r.id, correo: r.email, alias: r.alias ?? '', estado: r.status, codigo: r.invite_code ?? '', anotado: new Date(r.created_at).toISOString().slice(0, 10) })));
    show();
  } else {
    // seats N: el cupo total pasa a N · wave N: se abren N lugares más
    const st = pr.stats();
    const target = cmd === 'wave' ? st.invited + Math.max(0, Math.floor(Number(arg)) || 0) : Math.max(0, Math.floor(Number(arg)));
    if (!Number.isFinite(target) || arg === undefined) { console.error(`uso: ${cmd} <número>`); process.exit(1); }
    if (target < st.invited) console.log(`Ojo: ya hay ${st.invited} con código; bajar el cupo no le quita el código a nadie, solo frena los próximos.`);
    pr.setSeats(target);
    const out = await pr.fillSeats();
    for (const e of out.invited) console.log(`✓ código enviado a ${e}`);
    for (const e of out.has_account) console.log(`· ${e} ya tenía cuenta: no hace falta código`);
    for (const e of out.failed) console.log(`✗ no se pudo enviar a ${e}: sigue en espera`);
    if (!out.invited.length && !out.has_account.length && !out.failed.length) console.log('No había nadie en espera para ocupar esos lugares (se llenan solos a medida que la gente se anote).');
    show();
  }
} else if (cmd === 'invites') {
  console.table(db.prepare("SELECT code AS codigo, uses || '/' || max_uses AS usos, CASE WHEN revoked THEN 'anulado' WHEN uses >= max_uses THEN 'agotado' ELSE 'libre' END AS estado, note AS nota, date(created_at/1000,'unixepoch') AS creado FROM invites ORDER BY created_at DESC LIMIT 200").all());
  const used = db.prepare('SELECT u.code AS codigo, a.username AS usuario, datetime(u.used_at/1000,\'unixepoch\') AS cuando FROM invite_uses u LEFT JOIN accounts a ON a.id = u.account_id ORDER BY u.used_at DESC LIMIT 50').all();
  if (used.length) console.table(used);
} else if (cmd === 'revoke') {
  const r = db.prepare('UPDATE invites SET revoked = 1 WHERE code = ?').run(String(arg ?? '').toUpperCase().trim());
  console.log(r.changes ? 'código anulado' : 'no existe ese código');
} else if (cmd === 'founder') {
  // Pack de Fundador: ventas, USDC recibidos y pagos a revisar; `founder grant <usuario>` entrega a mano, `founder refunded <pedido>` marca una devolución hecha
  db.exec("CREATE TABLE IF NOT EXISTS founder_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, reference TEXT NOT NULL UNIQUE, amount INTEGER NOT NULL, status TEXT NOT NULL, sig TEXT UNIQUE, payer TEXT, paid INTEGER, error TEXT, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, paid_at INTEGER); CREATE TABLE IF NOT EXISTS founders (number INTEGER PRIMARY KEY, account_id INTEGER NOT NULL UNIQUE, order_id INTEGER, credits INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL);");
  const supply = Number(process.env.FOUNDER_SUPPLY ?? 100);
  if (arg === 'grant') {
    const a = db.prepare('SELECT id, username FROM accounts WHERE username = ?').get(String(extra ?? ''));
    if (!a) { console.log('no existe ese usuario'); process.exit(1); }
    if (db.prepare('SELECT 1 FROM founders WHERE account_id = ?').get(a.id)) { console.log('ya es fundador'); process.exit(1); }
    const taken = new Set(db.prepare('SELECT number FROM founders').all().map((r) => r.number));
    let n = 1; while (taken.has(n)) n++;
    if (n > supply) { console.log('no quedan packs'); process.exit(1); }
    const now = Date.now();
    db.prepare('INSERT INTO founders (number, account_id, created_at) VALUES (?,?,?)').run(n, a.id, now);
    db.prepare("INSERT OR IGNORE INTO nfts (id, account_id, kind, data, minted_at) VALUES (?, ?, 'avatar', ?, ?)").run(`av-${a.id}-fundador-1`, a.id, JSON.stringify({ designId: 'fundador-1', count: 1, firstAt: now, serial: n, bound: true }), now);
    console.log(`${a.username} es el Fundador #${n}`);
  } else if (arg === 'refunded') {
    const r = db.prepare("UPDATE founder_orders SET status = 'refunded' WHERE id = ? AND status IN ('refund_needed', 'underpaid')").run(Number(extra));
    console.log(r.changes ? 'marcado como devuelto' : 'ese pedido no está para devolver');
  } else {
    const t = db.prepare("SELECT COUNT(*) n, COALESCE(SUM(paid), 0) usdc FROM founder_orders WHERE status = 'delivered'").get();
    console.log({ vendidos: db.prepare('SELECT COUNT(*) n FROM founders').get().n, de: supply, usdcRecibidos: t.usdc / 1e6 });
    console.table(db.prepare("SELECT f.number AS nro, a.username AS jugador, f.credits AS creditos, datetime(f.created_at/1000,'unixepoch') AS desde FROM founders f JOIN accounts a ON a.id = f.account_id ORDER BY f.number").all());
    const rev = db.prepare("SELECT o.id AS pedido, a.username AS jugador, o.status AS estado, o.paid / 1e6 AS usdc, o.payer AS billetera, o.sig AS firma FROM founder_orders o JOIN accounts a ON a.id = o.account_id WHERE o.status IN ('refund_needed', 'underpaid') ORDER BY o.id").all();
    if (rev.length) { console.log('A revisar (devolver a la billetera que pagó):'); console.table(rev); }
    console.table(db.prepare("SELECT o.id AS pedido, a.username AS jugador, o.status AS estado, o.paid / 1e6 AS usdc, o.error, datetime(o.created_at/1000,'unixepoch') AS creado FROM founder_orders o JOIN accounts a ON a.id = o.account_id ORDER BY o.id DESC LIMIT 20").all());
  }
} else console.log('uso: node server/admin.mjs stats | flagged | audit [n] | ban <usuario> | unban <usuario> | setpass <correo> | gift <correo> <monto> [nota ES | nota EN] | invite [cantidad] [usos] [nota] | invites | revoke <código> | seats <N> | wave <N> | waiting | prereg | founder [grant <usuario> | refunded <pedido>]');
