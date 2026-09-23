// Pre-registration for the closed alpha: a queue ordered by arrival, a number of seats, and the personal code sent by email.
// Shared by the accounts service (index.mjs: people signing up on the website) and the operator tool (admin.mjs: raising seats).
import crypto from 'node:crypto';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // no 0/O, 1/I/L
const newCode = () => { const b = Array.from(crypto.randomBytes(8), (x) => ABC[x % ABC.length]).join(''); return `YBE-${b.slice(0, 4)}-${b.slice(4)}`; };

/** The email with the personal code, in the language the person chose on the website. */
export function inviteMail({ lang, alias, email, code, link }) {
  const en = lang === 'en';
  const hi = alias ? (en ? `Hi ${alias},` : `Hola ${alias},`) : (en ? 'Hi,' : 'Hola,');
  return en
    ? { subject: 'Your access to the Yield Bud Empire alpha 🌱', text: `${hi}\n\nIt's your turn! You can now join the closed alpha of Yield Bud Empire, the Decentralized Cannabis Multiverse.\n\nYour personal code: ${code}\nCreate your account: ${link}\n\nThe code is personal and only works with this email (${email}). You can also sign in with Google if your Google account uses this same email.\n\nRemember it's an alpha: there may be bugs and the economy may be reset at the end of the test. $FLORA and the NFTs have no real-money value.\n\nSee you in the grow room,\nThe Yield Bud Empire team\nhttps://yieldbudempire.com` }
    : { subject: 'Tu acceso a la alfa de Yield Bud Empire 🌱', text: `${hi}\n\n¡Llegó tu turno! Ya podés entrar a la alfa cerrada de Yield Bud Empire, el Multiverso Cannábico Descentralizado.\n\nTu código personal: ${code}\nCreá tu cuenta acá: ${link}\n\nEl código es personal y solo funciona con este correo (${email}). También podés entrar con Google si tu cuenta de Google usa este mismo correo.\n\nRecordá que es una alfa: puede haber errores y la economía se puede reiniciar al final de la prueba. $FLORA y los NFT no tienen valor en dinero real.\n\nNos vemos en el cultivo,\nEl equipo de Yield Bud Empire\nhttps://yieldbudempire.com` };
}

/**
 * @param {object} o
 * @param {DatabaseSync} o.db           accounts.db (invites and accounts live there too)
 * @param {(to:string, subject:string, text:string) => Promise<boolean>} o.sendMail   resolves true when the mail really left
 * @param {boolean} o.mustDeliver       true when SMTP is configured: a mail that did not leave is a failure (in development the outbox counts)
 * @param {string} o.publicUrl          the game's public address, for the link in the email
 * @param {number} o.defaultSeats       seats when none were set yet (env ALPHA_SEATS)
 */
export function createPrereg({ db, sendMail, mustDeliver, publicUrl, defaultSeats = 30 }) {
  db.exec(`
CREATE TABLE IF NOT EXISTS prereg (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, email_key TEXT NOT NULL UNIQUE, alias TEXT, lang TEXT,
  ip_hash TEXT, created_at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'waiting', invite_code TEXT, invited_at INTEGER, last_mail_at INTEGER);
CREATE INDEX IF NOT EXISTS idx_prereg_wait ON prereg(status, id);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS invites (code TEXT PRIMARY KEY, note TEXT NOT NULL DEFAULT '', max_uses INTEGER NOT NULL DEFAULT 1, uses INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, expires_at INTEGER, revoked INTEGER NOT NULL DEFAULT 0);
`);
  try { db.exec('ALTER TABLE invites ADD COLUMN email_key TEXT'); } catch { /* ya existe */ }
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('alpha_seats', ?)").run(String(defaultSeats));

  const q = {
    seats: db.prepare("SELECT value FROM settings WHERE key = 'alpha_seats'"),
    setSeats: db.prepare("UPDATE settings SET value = ? WHERE key = 'alpha_seats'"),
    invitedCount: db.prepare("SELECT COUNT(*) n FROM prereg WHERE status = 'invited'"),
    byKey: db.prepare('SELECT * FROM prereg WHERE email_key = ?'),
    insert: db.prepare("INSERT INTO prereg (email, email_key, alias, lang, ip_hash, created_at, status) VALUES (?,?,?,?,?,?, 'waiting')"),
    nextWaiting: db.prepare("SELECT * FROM prereg WHERE status = 'waiting' ORDER BY id LIMIT ?"),
    position: db.prepare("SELECT COUNT(*) n FROM prereg WHERE status = 'waiting' AND id <= ?"),
    waitingCount: db.prepare("SELECT COUNT(*) n FROM prereg WHERE status = 'waiting'"),
    total: db.prepare('SELECT COUNT(*) n FROM prereg'),
    hasAccount: db.prepare('SELECT username FROM accounts WHERE email_key = ?'),
    codeTaken: db.prepare('SELECT 1 FROM invites WHERE code = ?'),
    addInvite: db.prepare('INSERT INTO invites (code, note, max_uses, created_at, email_key) VALUES (?,?,1,?,?)'),
    revoke: db.prepare('UPDATE invites SET revoked = 1 WHERE code = ?'),
    inviteUsable: db.prepare('SELECT 1 FROM invites WHERE code = ? AND revoked = 0 AND uses < max_uses'),
    markInvited: db.prepare("UPDATE prereg SET status = 'invited', invite_code = ?, invited_at = ?, last_mail_at = ? WHERE id = ?"),
    markAccount: db.prepare("UPDATE prereg SET status = 'has_account', invited_at = ? WHERE id = ?"),
    touchMail: db.prepare('UPDATE prereg SET last_mail_at = ? WHERE id = ?'),
  };

  // una alta o una ola a la vez: dos personas no pueden quedarse con el mismo último lugar
  let chain = Promise.resolve();
  const serial = (fn) => { const run = chain.then(fn, fn); chain = run.catch(() => {}); return run; };

  const seats = () => Number(q.seats.get()?.value ?? defaultSeats);
  const freeSeats = () => Math.max(0, seats() - q.invitedCount.get().n);
  const linkFor = (code) => `${publicUrl.replace(/\/$/, '')}/?invite=${code}`;

  async function mailCode(row, code) {
    const m = inviteMail({ lang: row.lang, alias: row.alias, email: row.email, code, link: linkFor(code) });
    const delivered = await sendMail(row.email, m.subject, m.text);
    return delivered || !mustDeliver;
  }

  /** Give a code to one waiting person (or mark them as already playing). Returns 'invited' | 'has_account' | 'failed'. */
  async function issue(row) {
    const acc = q.hasAccount.get(row.email_key);
    if (acc) { q.markAccount.run(Date.now(), row.id); return 'has_account'; }
    let code; do { code = newCode(); } while (q.codeTaken.get(code));
    q.addInvite.run(code, `pre-registro #${row.id}`, Date.now(), row.email_key);
    if (!(await mailCode(row, code))) { q.revoke.run(code); return 'failed'; }   // did not leave: the code is not left loose, the person keeps waiting
    const now = Date.now();
    q.markInvited.run(code, now, now, row.id);
    return 'invited';
  }

  /** Fill the free seats with the next people in the queue (arrival order). */
  async function fillSeats(limit = Infinity) {
    const out = { invited: [], has_account: [], failed: [] };
    let room = Math.min(freeSeats(), limit);
    while (room > 0) {
      const batch = q.nextWaiting.all(Math.min(room, 50));
      if (!batch.length) break;
      let progressed = false;
      for (const row of batch) {
        const r = await issue(row);
        out[r].push(row.email);
        if (r === 'invited') { room--; progressed = true; }
        if (r === 'has_account') progressed = true;
        if (room <= 0) break;
      }
      if (!progressed) break;   // every mail failed: stop instead of looping on the same people
    }
    return out;
  }

  /**
   * Someone signed up on the website. Returns { status: 'invited' } or { status: 'waiting', position }.
   * The same answer for somebody already on the list or already playing, so the form never tells who is registered.
   */
  async function signUp({ email, eKey, alias, lang, ipHash }) {
    const existing = q.byKey.get(eKey);
    if (existing) {
      if (existing.status === 'invited') {
        // resend the unused code, at most every 30 minutes (and never a new code)
        if (existing.invite_code && q.inviteUsable.get(existing.invite_code) && Date.now() - (existing.last_mail_at ?? 0) > 30 * 60_000) {
          q.touchMail.run(Date.now(), existing.id);
          await mailCode(existing, existing.invite_code);
        }
        return { status: 'invited' };
      }
      if (existing.status === 'has_account') return { status: 'invited' };
      return { status: 'waiting', position: q.position.get(existing.id).n };
    }
    const id = q.insert.run(email, eKey, alias || null, lang === 'en' ? 'en' : 'es', ipHash ?? null, Date.now()).lastInsertRowid;
    if (freeSeats() > 0) {
      const r = await issue(q.byKey.get(eKey));
      if (r !== 'failed') return { status: 'invited' };
    }
    return { status: 'waiting', position: q.position.get(id).n };
  }

  /** Copy the old website database (web/server.mjs, preregistro.db) once; the test row of the team is left out. */
  function migrateFrom(file, keyOf) {
    if (!file || !fs.existsSync(file)) return 0;
    if (db.prepare("SELECT value FROM settings WHERE key = 'prereg_migrated'").get()) return 0;
    let n = 0;
    try {
      const old = new DatabaseSync(file, { readOnly: true });
      for (const r of old.prepare('SELECT email, alias, lang, created_at FROM preregistro ORDER BY id').all()) {
        const eKey = keyOf(r.email);
        if (!eKey || eKey === 'info@yieldbudempire.com') continue;
        n += db.prepare("INSERT OR IGNORE INTO prereg (email, email_key, alias, lang, created_at, status) VALUES (?,?,?,?,?, 'waiting')").run(r.email, eKey, r.alias, r.lang, Date.parse(r.created_at) || Date.now()).changes;
      }
      old.close();
    } catch (e) { console.error('prereg migration:', e.message); return 0; }
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('prereg_migrated', ?)").run(new Date().toISOString());
    return n;
  }

  return {
    seats, freeSeats, migrateFrom,
    fillSeats: (limit) => serial(() => fillSeats(limit)),
    signUp: (o) => serial(() => signUp(o)),
    setSeats: (n) => q.setSeats.run(String(Math.max(0, Math.floor(n)))),
    stats: () => ({ total: q.total.get().n, invited: q.invitedCount.get().n, waiting: q.waitingCount.get().n, seats: seats() }),
    waitingList: () => db.prepare("SELECT id, email, alias, lang, created_at FROM prereg WHERE status = 'waiting' ORDER BY id").all(),
    all: () => db.prepare('SELECT id, email, alias, lang, status, invite_code, created_at, invited_at FROM prereg ORDER BY id').all(),
  };
}
