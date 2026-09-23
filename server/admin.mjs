// Operator tool: node server/admin.mjs stats | flagged | audit [n] | ban <username> | unban <username> | setpass <email> | gift <email> <monto> [nota]
//                | invite [cantidad] [usos] [nota] | invites | revoke <código> | wave <cantidad> [prueba]
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
} else if (cmd === 'flagged') {
  console.table(db.prepare("SELECT id, username, email, source, email_verified AS ok, flags, datetime(created_at/1000,'unixepoch') AS creada FROM accounts WHERE flags != '' ORDER BY created_at DESC LIMIT 100").all());
} else if (cmd === 'audit') {
  console.table(db.prepare("SELECT datetime(ts/1000,'unixepoch') AS cuando, event, account_id AS cuenta, ip_hash, detail FROM audit ORDER BY ts DESC LIMIT ?").all(Number(arg ?? 30)));
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
  const note = process.argv.slice(5).join(' ').slice(0, 120) || 'Regalo de la casa';
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
} else if (cmd === 'wave') {
  // una ola de la alfa: a los siguientes N del pre-registro (en orden de llegada) les llega por correo su código personal,
  // atado a su correo (no sirve para otra persona). Con "prueba" solo muestra a quién le llegaría.
  const n = Math.max(1, Math.min(500, Math.floor(Number(arg)) || 0));
  const dry = /^(prueba|dry|test)$/i.test(String(extra ?? ''));
  if (!Number(arg)) { console.error('uso: wave <cantidad> [prueba]'); process.exit(1); }
  const preDb = process.env.PREREG_DB;
  if (!preDb || !fs.existsSync(preDb)) { console.error('no encuentro la base del pre-registro (PREREG_DB)'); process.exit(1); }
  const pre = new DatabaseSync(preDb);
  for (const col of ['invited_at TEXT', 'invite_code TEXT']) { try { pre.exec(`ALTER TABLE preregistro ADD COLUMN ${col}`); } catch { /* ya existe */ } }
  const rows = pre.prepare('SELECT id, email, alias, lang FROM preregistro WHERE invited_at IS NULL ORDER BY id LIMIT ?').all(n);
  if (!rows.length) { console.log('No hay nadie pendiente en el pre-registro.'); process.exit(0); }
  const base = (process.env.PUBLIC_URL ?? 'https://play.yieldbudempire.com').replace(/\/$/, '');
  if (dry) { console.table(rows.map((r) => ({ id: r.id, correo: r.email, alias: r.alias ?? '', idioma: r.lang ?? 'es' }))); console.log(`${rows.length} persona(s) recibirían su código (modo prueba: no se mandó nada).`); process.exit(0); }
  if (!process.env.SMTP_URL) { console.error('falta SMTP_URL: no se puede mandar correo'); process.exit(1); }
  const { default: nm } = await import('nodemailer');
  const mail = nm.createTransport(process.env.SMTP_URL);
  const from = process.env.MAIL_FROM ?? 'Yield Bud Empire <info@yieldbudempire.com>';
  const insInv = db.prepare('INSERT INTO invites (code, note, max_uses, created_at, email_key) VALUES (?,?,1,?,?)');
  const mark = pre.prepare('UPDATE preregistro SET invited_at = ?, invite_code = ? WHERE id = ?');
  const hasAccount = db.prepare('SELECT username FROM accounts WHERE email_key = ?');
  let sent = 0, skipped = 0, failedN = 0;
  for (const r of rows) {
    const eKey = emailKey(r.email);
    if (!eKey) { mark.run(new Date().toISOString(), 'correo-invalido', r.id); skipped++; continue; }
    const acc = hasAccount.get(eKey);
    if (acc) { mark.run(new Date().toISOString(), `ya-tenia-cuenta:${acc.username}`, r.id); skipped++; console.log(`· ${r.email}: ya tiene cuenta (${acc.username}), no hace falta código`); continue; }
    let code; do { code = newCode(); } while (db.prepare('SELECT 1 FROM invites WHERE code = ?').get(code));
    insInv.run(code, `pre-registro #${r.id}`, Date.now(), eKey);
    const link = `${base}/?invite=${code}`;
    const en = r.lang === 'en';
    const hi = r.alias ? (en ? `Hi ${r.alias},` : `Hola ${r.alias},`) : (en ? 'Hi,' : 'Hola,');
    const subject = en ? 'Your access to the Yield Bud Empire alpha 🌱' : 'Tu acceso a la alfa de Yield Bud Empire 🌱';
    const text = en
      ? `${hi}\n\nIt's your turn! You can now join the closed alpha of Yield Bud Empire, the Decentralized Cannabis Multiverse.\n\nYour personal code: ${code}\nCreate your account: ${link}\n\nThe code is personal and only works with this email (${r.email}). You can also sign in with Google if your Google account uses this same email.\n\nRemember it's an alpha: there may be bugs and the economy may be reset at the end of the test. $FLORA and the NFTs have no real-money value.\n\nSee you in the grow room,\nThe Yield Bud Empire team\nhttps://yieldbudempire.com`
      : `${hi}\n\n¡Llegó tu turno! Ya podés entrar a la alfa cerrada de Yield Bud Empire, el Multiverso Cannábico Descentralizado.\n\nTu código personal: ${code}\nCreá tu cuenta acá: ${link}\n\nEl código es personal y solo funciona con este correo (${r.email}). También podés entrar con Google si tu cuenta de Google usa este mismo correo.\n\nRecordá que es una alfa: puede haber errores y la economía se puede reiniciar al final de la prueba. $FLORA y los NFT no tienen valor en dinero real.\n\nNos vemos en el cultivo,\nEl equipo de Yield Bud Empire\nhttps://yieldbudempire.com`;
    try {
      await mail.sendMail({ from, to: r.email, subject, text });
      mark.run(new Date().toISOString(), code, r.id);
      db.prepare('INSERT INTO audit (ts, event, account_id, ip_hash, detail) VALUES (?,?,?,?,?)').run(Date.now(), 'admin_wave_invite', null, null, code);
      sent++; console.log(`✓ ${r.email} → ${code}`);
    } catch (e) {
      db.prepare('UPDATE invites SET revoked = 1 WHERE code = ?').run(code);   // no llegó: el código no queda suelto
      failedN++; console.log(`✗ ${r.email}: no se pudo enviar (${e.code ?? e.message}); queda pendiente para la próxima ola`);
    }
  }
  const left = pre.prepare('SELECT COUNT(*) n FROM preregistro WHERE invited_at IS NULL').get().n;
  console.log(`\nOla terminada: ${sent} enviado(s), ${skipped} sin código (ya tenían cuenta o correo inválido), ${failedN} fallido(s). Quedan ${left} en espera.`);
} else if (cmd === 'invites') {
  console.table(db.prepare("SELECT code AS codigo, uses || '/' || max_uses AS usos, CASE WHEN revoked THEN 'anulado' WHEN uses >= max_uses THEN 'agotado' ELSE 'libre' END AS estado, note AS nota, date(created_at/1000,'unixepoch') AS creado FROM invites ORDER BY created_at DESC LIMIT 200").all());
  const used = db.prepare('SELECT u.code AS codigo, a.username AS usuario, datetime(u.used_at/1000,\'unixepoch\') AS cuando FROM invite_uses u LEFT JOIN accounts a ON a.id = u.account_id ORDER BY u.used_at DESC LIMIT 50').all();
  if (used.length) console.table(used);
} else if (cmd === 'revoke') {
  const r = db.prepare('UPDATE invites SET revoked = 1 WHERE code = ?').run(String(arg ?? '').toUpperCase().trim());
  console.log(r.changes ? 'código anulado' : 'no existe ese código');
} else console.log('uso: node server/admin.mjs stats | flagged | audit [n] | ban <usuario> | unban <usuario> | setpass <correo> | gift <correo> <monto> [nota] | invite [cantidad] [usos] [nota] | invites | revoke <código> | wave <cantidad> [prueba]');
