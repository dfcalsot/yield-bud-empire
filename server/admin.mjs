// Operator tool: node server/admin.mjs stats | flagged | audit [n] | ban <username> | unban <username>
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = process.env.DATA_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
const db = new DatabaseSync(path.join(dir, 'accounts.db'));
const [cmd = 'stats', arg, extra] = process.argv.slice(2);
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
} else console.log('uso: node server/admin.mjs stats | flagged | audit [n] | ban <usuario> | unban <usuario>');
