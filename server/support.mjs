// Player support, inside the game: a player opens a case («Ayuda» in the top bar) with a topic, a message and optionally a
// screenshot; the game adds the context by itself (screen, device, build) and the server adds the player's last errors. The
// operators answer from the panel (/#panel → Soporte); the answer shows up in the game and goes out by email too.
// Cases: nuevo → en_curso → resuelto (a new message from the player reopens a solved case).
const MIN = 60_000, HOUR = 60 * MIN;
const TOPICS = new Set(['bug', 'pago', 'reliquias', 'cuenta', 'sugerencia', 'otro']);
const STATUSES = new Set(['nuevo', 'en_curso', 'resuelto']);
const MAX_IMG = 700 * 1024;
/** the support inbox (Hostinger): shown to players, and where a reply to a support email lands */
export const SUPPORT_EMAIL = 'support@yieldbudempire.com';

/** a screenshot as a data URL: only PNG, JPEG or WebP, checked by its first bytes (not by what the browser says) */
function readImage(dataUrl) {
  if (!dataUrl) return null;
  const m = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl));
  if (!m) return { error: 'bad_image' };
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_IMG) return { error: 'image_too_big' };
  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const jpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const webp = buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
  if (!(png || jpg || webp)) return { error: 'bad_image' };
  return { type: png ? 'image/png' : jpg ? 'image/jpeg' : 'image/webp', buf };
}

const MAIL = {
  es: (name, id, body, url) => [`Respuesta de soporte · caso #${id} · Yield Bud Empire`, `Hola, ${name}:\n\nTe respondimos en tu caso #${id}:\n\n${body}\n\nPuedes seguir la conversación dentro del juego, en «Ayuda» (${url}), o responder este correo.\n\nEl equipo de Yield Bud Empire`],
  en: (name, id, body, url) => [`Support reply · case #${id} · Yield Bud Empire`, `Hi ${name},\n\nWe answered your case #${id}:\n\n${body}\n\nYou can keep the conversation going inside the game, under «Help» (${url}), or reply to this email.\n\nThe Yield Bud Empire team`],
};

export function installSupport({ db, route, HttpError, sessionAccount, guard, limit, readJson, audit, alerts, sendMail, publicUrl = '' }) {
  db.exec(`
CREATE TABLE IF NOT EXISTS support_tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  topic TEXT NOT NULL, subject TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'nuevo', context TEXT NOT NULL DEFAULT '{}',
  unread_player INTEGER NOT NULL DEFAULT 0, unread_admin INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_support_account ON support_tickets(account_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_support_status ON support_tickets(status, updated_at);
CREATE TABLE IF NOT EXISTS support_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author TEXT NOT NULL, admin_id INTEGER, body TEXT NOT NULL, image BLOB, image_type TEXT, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_support_msgs ON support_messages(ticket_id, id);
`);
  const q = {
    mine: db.prepare('SELECT id, topic, subject, status, unread_player, created_at, updated_at FROM support_tickets WHERE account_id = ? ORDER BY updated_at DESC LIMIT 30'),
    ticket: db.prepare('SELECT * FROM support_tickets WHERE id = ?'),
    msgs: db.prepare('SELECT id, author, admin_id, body, image_type IS NOT NULL AS has_image, created_at FROM support_messages WHERE ticket_id = ? ORDER BY id'),
    open: db.prepare("SELECT COUNT(*) AS n FROM support_tickets WHERE account_id = ? AND status != 'resuelto'"),
    insT: db.prepare('INSERT INTO support_tickets (account_id, topic, subject, context, created_at, updated_at) VALUES (?,?,?,?,?,?)'),
    insM: db.prepare('INSERT INTO support_messages (ticket_id, author, admin_id, body, image, image_type, created_at) VALUES (?,?,?,?,?,?,?)'),
    unreadMine: db.prepare('SELECT COUNT(*) AS n FROM support_tickets WHERE account_id = ? AND unread_player = 1'),
    image: db.prepare('SELECT m.image, m.image_type, t.account_id FROM support_messages m JOIN support_tickets t ON t.id = m.ticket_id WHERE m.id = ?'),
    errors: db.prepare("SELECT ts, name, detail, device FROM client_events WHERE account_id = ? AND kind = 'error' ORDER BY ts DESC LIMIT 5"),
  };
  const hasErrors = !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'client_events'").get();
  const clip = (v, n) => String(v ?? '').replace(/\r\n/g, '\n').trim().slice(0, n);
  const tx = (fn) => { db.exec('BEGIN IMMEDIATE'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { try { db.exec('ROLLBACK'); } catch { /* */ } throw e; } };
  const who = (ctx) => { const a = sessionAccount(ctx); if (!a) throw new HttpError(401, 'unauthenticated'); return a; };
  const view = (t) => ({ ...t, messages: q.msgs.all(t.id).map((m) => ({ ...m, has_image: !!m.has_image, image: m.has_image ? `/api/support/image?id=${m.id}` : null })) });
  const mine = (a, id) => { const t = q.ticket.get(Math.floor(Number(id)) || 0); if (!t || t.account_id !== a.id) throw new HttpError(404, 'not_found'); return t; };
  const TOPIC_ES = { bug: 'algo no funciona', pago: 'pagos / Pack de Fundador', reliquias: 'reliquias / Solana', cuenta: 'mi cuenta', sugerencia: 'sugerencia', otro: 'otro' };

  /* ───────────── the player ───────────── */
  route('GET', '/api/support/mine', (ctx) => {
    const a = who(ctx);
    return { tickets: q.mine.all(a.id).map((t) => ({ ...t, unread: !!t.unread_player })), unread: q.unreadMine.get(a.id).n, email: SUPPORT_EMAIL };
  });
  route('GET', '/api/support/ticket', (ctx) => {
    const a = who(ctx);
    const t = mine(a, ctx.url.searchParams.get('id'));
    if (t.unread_player) db.prepare('UPDATE support_tickets SET unread_player = 0 WHERE id = ?').run(t.id);
    const { context: _c, ...rest } = view(t);
    return { ticket: { ...rest, unread_player: 0 } };
  });
  route('POST', '/api/support/new', async (ctx) => {
    const a = who(ctx);
    limit(ctx, `support-new:${a.id}`, 5, HOUR);
    const b = await readJson(ctx.req, 1024 * 1024);
    const topic = TOPICS.has(b.topic) ? b.topic : 'otro';
    const body = clip(b.body, 4000);
    if (body.length < 10) throw new HttpError(400, 'too_short');
    if (q.open.get(a.id).n >= 5) throw new HttpError(400, 'too_many_open');
    const img = readImage(b.image);
    if (img?.error) throw new HttpError(400, img.error);
    // the context the game sends (screen, device, build) plus the player's last errors, read here
    const c = b.context && typeof b.context === 'object' ? b.context : {};
    const context = { screen: clip(c.screen, 40), device: clip(c.device, 60), build: clip(c.build, 40), lang: clip(c.lang, 5), size: clip(c.size, 20), errors: hasErrors ? q.errors.all(a.id) : [] };
    const subject = clip(b.subject, 90) || clip(body.split('\n')[0], 90);
    const now = Date.now();
    const id = tx(() => {
      const tid = Number(q.insT.run(a.id, topic, subject, JSON.stringify(context), now, now).lastInsertRowid);
      q.insM.run(tid, 'player', null, body, img?.buf ?? null, img?.type ?? null, now);
      return tid;
    });
    audit('support_ticket', a.id, ctx.ipHash, `#${id} ${topic}`);
    if (alerts?.on) void alerts.send(`support:${id}`, `🆘 Caso de soporte #${id} de ${a.username} (${TOPIC_ES[topic]}): «${subject}». Míralo en Panel → Soporte.`);
    return { ok: true, id };
  });
  route('POST', '/api/support/reply', async (ctx) => {
    const a = who(ctx);
    limit(ctx, `support-msg:${a.id}`, 30, HOUR);
    const b = await readJson(ctx.req, 1024 * 1024);
    const t = mine(a, b.id);
    const body = clip(b.body, 4000);
    if (body.length < 2) throw new HttpError(400, 'too_short');
    const img = readImage(b.image);
    if (img?.error) throw new HttpError(400, img.error);
    const now = Date.now();
    tx(() => {
      q.insM.run(t.id, 'player', null, body, img?.buf ?? null, img?.type ?? null, now);
      db.prepare("UPDATE support_tickets SET unread_admin = 1, updated_at = ?, status = CASE WHEN status = 'resuelto' THEN 'en_curso' ELSE status END WHERE id = ?").run(now, t.id);
    });
    if (alerts?.on) void alerts.send(`support-reply:${t.id}`, `💬 ${a.username} respondió en el caso #${t.id}.`, 10 * MIN);
    return { ok: true };
  });
  // a screenshot: to its owner or to an admin, never to anyone else
  route('GET', '/api/support/image', (ctx) => {
    const a = sessionAccount(ctx);
    const m = q.image.get(Math.floor(Number(ctx.url.searchParams.get('id'))) || 0);
    let isAdmin = false; try { if (a) { guard(ctx); isAdmin = true; } } catch { /* not an admin */ }
    if (!a || !m || !m.image || (m.account_id !== a.id && !isAdmin)) throw new HttpError(404, 'not_found');
    return { __raw: { type: m.image_type, body: Buffer.from(m.image), cache: 'private, max-age=600' } };
  });

  /* ───────────── the operators (panel → Soporte) ───────────── */
  route('GET', '/api/admin/support', (ctx) => {
    guard(ctx);
    const status = STATUSES.has(ctx.url.searchParams.get('status')) ? ctx.url.searchParams.get('status') : null;
    const rows = db.prepare(`SELECT t.id, t.account_id, a.username AS player, t.topic, t.subject, t.status, t.unread_admin, t.created_at, t.updated_at,
      (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id = t.id) AS messages
      FROM support_tickets t LEFT JOIN accounts a ON a.id = t.account_id ${status ? 'WHERE t.status = ?' : ''} ORDER BY t.unread_admin DESC, t.updated_at DESC LIMIT 200`).all(...(status ? [status] : []));
    const counts = Object.fromEntries(db.prepare('SELECT status, COUNT(*) AS n FROM support_tickets GROUP BY status').all().map((r) => [r.status, r.n]));
    return { tickets: rows, counts, unread: db.prepare('SELECT COUNT(*) AS n FROM support_tickets WHERE unread_admin = 1').get().n };
  });
  route('GET', '/api/admin/support/ticket', (ctx) => {
    guard(ctx);
    const t = q.ticket.get(Math.floor(Number(ctx.url.searchParams.get('id'))) || 0);
    if (!t) throw new HttpError(404, 'not_found');
    if (t.unread_admin) db.prepare('UPDATE support_tickets SET unread_admin = 0 WHERE id = ?').run(t.id);
    const v = view(t);
    const names = new Map(db.prepare('SELECT id, username FROM accounts WHERE id IN (SELECT admin_id FROM support_messages WHERE ticket_id = ?)').all(t.id).map((r) => [r.id, r.username]));
    return { ticket: { ...v, unread_admin: 0, context: JSON.parse(t.context || '{}'), player: db.prepare('SELECT username FROM accounts WHERE id = ?').get(t.account_id)?.username ?? null, messages: v.messages.map((m) => ({ ...m, admin: m.admin_id ? names.get(m.admin_id) ?? null : null })) } };
  });
  route('POST', '/api/admin/support/reply', async (ctx) => {
    const me = guard(ctx);
    limit(ctx, `support-admin:${me.id}`, 60, MIN);
    const b = await readJson(ctx.req, 16 * 1024);
    const t = q.ticket.get(Math.floor(Number(b.id)) || 0);
    if (!t) throw new HttpError(404, 'not_found');
    const body = clip(b.body, 4000);
    if (body.length < 2) throw new HttpError(400, 'too_short');
    const status = STATUSES.has(b.status) ? b.status : t.status === 'nuevo' ? 'en_curso' : t.status;
    const now = Date.now();
    tx(() => {
      q.insM.run(t.id, 'admin', me.id, body, null, null, now);
      db.prepare('UPDATE support_tickets SET unread_player = 1, updated_at = ?, status = ? WHERE id = ?').run(now, status, t.id);
    });
    audit('support_reply', t.account_id, null, `#${t.id} · por ${me.username}`);
    // the answer by email too, in the player's language (the game shows it as well)
    const p = db.prepare('SELECT username, email, lang FROM accounts WHERE id = ?').get(t.account_id);
    let mailed = false;
    if (p?.email && b.email !== false) { try { const [subj, text] = MAIL[p.lang === 'en' ? 'en' : 'es'](p.username, t.id, body, publicUrl);
      mailed = !!(await sendMail(p.email, subj, text, { replyTo: SUPPORT_EMAIL })); } catch { /* the answer is in the game anyway */ } }
    return { ok: true, mailed };
  });
  route('POST', '/api/admin/support/status', async (ctx) => {
    const me = guard(ctx);
    const b = await readJson(ctx.req, 4 * 1024);
    const t = q.ticket.get(Math.floor(Number(b.id)) || 0);
    if (!t) throw new HttpError(404, 'not_found');
    if (!STATUSES.has(b.status)) throw new HttpError(400, 'bad_status');
    db.prepare('UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ?').run(b.status, Date.now(), t.id);
    audit('support_status', t.account_id, null, `#${t.id} → ${b.status} · por ${me.username}`);
    return { ok: true };
  });

  return { unreadAdmin: () => db.prepare('SELECT COUNT(*) AS n FROM support_tickets WHERE unread_admin = 1').get().n };
}
