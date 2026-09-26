// The Founder Pack: 100 numbered packs paid in USDC with Solana Pay. It gives recognition, never an advantage and never $FLORA:
// the «Fundador #N» badge, the Founder avatar (bound to the account: it can't be sold for $FLORA) and the name in the credits.
//
//   order    one open order per account: a Solana Pay URL (USDC to the team's receiving wallet) with a unique `reference`
//   pay      the player pays by scanning the QR, or with the browser wallet (the server builds the unsigned transfer)
//   watch    every few seconds the server looks for finalized payments carrying each reference and delivers the pack in one
//            SQLite transaction; a payment is used once (UNIQUE sig). Paid late: delivered if there is still a pack left.
//            Paid short, sold out or already a founder: kept for a manual refund (admin.mjs founder).
//
// FOUNDER_ENABLED=1 turns it on; FOUNDER_RECEIVER is the wallet that gets the money (the server has no key for it);
// SOLANA_RPC chooses the network (devnet by default) and with it the USDC mint.
const MIN = 60_000, DAY = 86400_000;
const HOLD = 30 * MIN;        // an open order counts against the packs left for this long
const WATCH = DAY;            // and its reference is watched for this long
const USDC = { devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' };
export const FOUNDER_DESIGN = 'fundador-1';

/** an in-memory chain for the tests: `pay(reference, amount)` plays the player's wallet */
export function fakePay() {
  const pays = new Map(); let n = 0;
  return {
    receiverAta: 'RecvAta1111111111111111111111111111111111111', fail: 0,
    newReference: () => `Ref${String(++n).padStart(40, '1')}`,
    async findPayment(ref) { if (this.fail > 0) { this.fail--; throw new Error('rpc down'); } return pays.get(ref) ?? null; },
    async payTx(p) { return Buffer.from(JSON.stringify(p)).toString('base64'); },
    async tokenBalance() { return 0; },
    pay(ref, amount, payer = 'Payer11111111111111111111111111111111111111', sig = `Sig-${ref}`) { pays.set(ref, { sig, payer, amount }); },
    explorer: (kind, x) => `https://explorer.solana.com/${kind}/${x}?cluster=devnet`,
  };
}

export async function installFounder({ db, route, HttpError, sessionAccount, audit, limit, readJson, env, sendMail }) {
  const fake = env.FOUNDER_FAKE === '1';
  const rpc = env.SOLANA_RPC || 'https://api.devnet.solana.com';
  const network = /devnet/.test(rpc) ? 'devnet' : /testnet/.test(rpc) ? 'testnet' : 'mainnet';
  const receiver = fake ? 'Receiver111111111111111111111111111111111111' : (env.FOUNDER_RECEIVER ?? '').trim();
  const mint = env.FOUNDER_USDC_MINT || (network === 'mainnet' ? USDC.mainnet : USDC.devnet);
  const price = Number(env.FOUNDER_PRICE ?? 20), supply = Math.max(0, Math.floor(Number(env.FOUNDER_SUPPLY ?? 100)));
  const amount = Math.round(price * 1e6);   // USDC has 6 decimals
  const enabled = fake || (env.FOUNDER_ENABLED === '1' && !!receiver);
  if (env.FOUNDER_ENABLED === '1' && !receiver) console.warn('⚠  FOUNDER_ENABLED=1 sin FOUNDER_RECEIVER: el Pack de Fundador queda apagado.');

  db.exec(`
CREATE TABLE IF NOT EXISTS founder_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, reference TEXT NOT NULL UNIQUE, amount INTEGER NOT NULL,
  status TEXT NOT NULL, sig TEXT UNIQUE, payer TEXT, paid INTEGER, error TEXT, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, paid_at INTEGER);
CREATE INDEX IF NOT EXISTS idx_founder_orders ON founder_orders(status, created_at);
CREATE TABLE IF NOT EXISTS founders (number INTEGER PRIMARY KEY, account_id INTEGER NOT NULL UNIQUE, order_id INTEGER, credits INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL);
`);
  const q = {
    founderOf: db.prepare('SELECT number, credits FROM founders WHERE account_id = ?'),
    numbers: db.prepare('SELECT number FROM founders ORDER BY number'),
    sold: db.prepare('SELECT COUNT(*) n FROM founders'),
    holding: db.prepare("SELECT COUNT(*) n FROM founder_orders WHERE status = 'open' AND expires_at > ? AND account_id != ?"),
    openOf: db.prepare("SELECT * FROM founder_orders WHERE account_id = ? AND status = 'open' AND expires_at > ? ORDER BY id DESC LIMIT 1"),
    order: db.prepare('SELECT * FROM founder_orders WHERE id = ?'),
    newOrder: db.prepare("INSERT INTO founder_orders (account_id, reference, amount, status, created_at, expires_at) VALUES (?,?,?, 'open', ?,?)"),
    watched: db.prepare("SELECT * FROM founder_orders WHERE status = 'open' AND created_at > ? ORDER BY id LIMIT 20"),
    expire: db.prepare("UPDATE founder_orders SET status = 'expired' WHERE status = 'open' AND created_at <= ?"),
    settle: db.prepare("UPDATE founder_orders SET status = ?, sig = ?, payer = ?, paid = ?, paid_at = ?, error = NULL WHERE id = ? AND status = 'open'"),
    fail: db.prepare('UPDATE founder_orders SET error = ? WHERE id = ?'),
    sigUsed: db.prepare('SELECT 1 FROM founder_orders WHERE sig = ?'),
    addFounder: db.prepare('INSERT INTO founders (number, account_id, order_id, created_at) VALUES (?,?,?,?)'),
    credits: db.prepare('UPDATE founders SET credits = ? WHERE account_id = ?'),
    creditsList: db.prepare('SELECT f.number, a.username FROM founders f JOIN accounts a ON a.id = f.account_id WHERE f.credits = 1 ORDER BY f.number'),
    account: db.prepare('SELECT id, email, username, lang FROM accounts WHERE id = ?'),
    flags: db.prepare('SELECT flags FROM accounts WHERE id = ?'),
    nft: db.prepare('SELECT 1 FROM nfts WHERE id = ?'),
    putNft: db.prepare("INSERT INTO nfts (id, account_id, kind, data, minted_at) VALUES (?, ?, 'avatar', ?, ?)"),
  };

  let pay = null, newReference = null;
  if (fake) { pay = fakePay(); newReference = pay.newReference; }
  else if (enabled) { const mod = await import('./gen/pay.mjs'); pay = mod.createPay({ rpc, receiver, mint }); newReference = mod.newReference; }

  const tx = (fn) => { db.exec('BEGIN IMMEDIATE'); try { const o = fn(); db.exec('COMMIT'); return o; } catch (e) { try { db.exec('ROLLBACK'); } catch { /* */ } throw e; } };
  const left = (now, accountId = 0) => Math.max(0, supply - q.sold.get().n - q.holding.get(now, accountId).n);
  const payUrl = (o) => {
    const p = new URLSearchParams({ amount: String(o.amount / 1e6), 'spl-token': mint, reference: o.reference, label: 'Yield Bud Empire', message: 'Pack de Fundador', memo: `YBE-F-${o.id}` });
    return `solana:${receiver}?${p.toString().replace(/\+/g, '%20')}`;
  };
  const view = (o, now = Date.now()) => (!o ? null : {
    id: o.id, status: o.status === 'open' && o.expires_at <= now ? 'expired' : o.status, amount: o.amount / 1e6, reference: o.reference,
    url: payUrl(o), expiresAt: o.expires_at, sig: o.sig, explorer: o.sig && pay ? pay.explorer('tx', o.sig) : null,
  });

  const MAIL = {
    es: (u, n) => [`¡Eres el Fundador #${n} de Yield Bud Empire!`, `¡Gracias, ${u}!\n\nTu pago llegó y tu Pack de Fundador ya está en tu cuenta:\n· la insignia «Fundador #${n}»\n· el avatar Fundador (en Perfil → Colección)\n· tu nombre en los créditos (puedes ocultarlo en Cripto → Fundadores)\n\nEl pack es un reconocimiento: no da ventajas en el juego ni $FLORA.\n\nhttps://play.yieldbudempire.com`],
    en: (u, n) => [`You are Yield Bud Empire Founder #${n}!`, `Thank you, ${u}!\n\nYour payment arrived and your Founder Pack is already in your account:\n· the "Founder #${n}" badge\n· the Founder avatar (in Profile → Collection)\n· your name in the credits (you can hide it in Crypto → Founders)\n\nThe pack is a recognition: it gives no in-game advantage and no $FLORA.\n\nhttps://play.yieldbudempire.com`],
  };

  /** a payment was found for an order: deliver the pack, or keep the payment aside for a manual refund */
  function settle(o, p, now) {
    return tx(() => {
      const cur = q.order.get(o.id);
      if (cur.status !== 'open') return null;
      if (q.sigUsed.get(p.sig)) { q.fail.run('firma ya usada por otro pedido', o.id); return null; }
      if (p.amount < o.amount) { q.settle.run('underpaid', p.sig, p.payer, p.amount, now, o.id); return { status: 'underpaid' }; }
      if (q.founderOf.get(o.account_id) || q.sold.get().n >= supply) { q.settle.run('refund_needed', p.sig, p.payer, p.amount, now, o.id); return { status: 'refund_needed' }; }
      const taken = new Set(q.numbers.all().map((r) => r.number));
      let number = 1; while (taken.has(number)) number++;
      q.addFounder.run(number, o.account_id, o.id, now);
      const nid = `av-${o.account_id}-${FOUNDER_DESIGN}`;
      if (!q.nft.get(nid)) q.putNft.run(nid, o.account_id, JSON.stringify({ designId: FOUNDER_DESIGN, count: 1, firstAt: now, serial: number, bound: true }), now);
      q.settle.run('delivered', p.sig, p.payer, p.amount, now, o.id);
      return { status: 'delivered', number };
    });
  }

  async function check(o) {
    let p;
    try { p = await pay.findPayment(o.reference); } catch (e) { q.fail.run(String(e?.message ?? e).slice(0, 200), o.id); return; }
    if (!p || p.amount <= 0) return;
    const now = Date.now();
    const r = settle(o, p, now);
    if (!r) return;
    audit(`founder_${r.status}`, o.account_id, null, `pedido ${o.id} · ${p.amount / 1e6} USDC · ${p.sig.slice(0, 16)}`);
    if (r.status === 'delivered') {
      const a = q.account.get(o.account_id);
      if (a?.email) { try { await sendMail(a.email, ...(MAIL[a.lang === 'en' ? 'en' : 'es'])(a.username, r.number)); } catch { /* the pack is delivered anyway */ } }
    }
  }

  let busy = false;
  async function work() {
    if (busy || !enabled) return;
    busy = true;
    try {
      const now = Date.now();
      q.expire.run(now - WATCH);
      for (const o of q.watched.all(now - WATCH)) await check(o);
    } catch (e) { console.error('founder:', e?.message ?? e); }
    finally { busy = false; }
  }
  if (enabled && !fake) { setInterval(() => { void work(); }, 8000).unref(); void work(); }

  /* ───────────── routes ───────────── */
  const who = (ctx) => { const a = sessionAccount(ctx); if (!a) throw new HttpError(401, 'unauthenticated'); limit(ctx, `founder:${a.id}`, 60, MIN); return a; };
  // on a test network the pack is a rehearsal: only developer accounts see it on sale (real players see «coming soon»)
  const isDev = (id) => /(^|,)dev,/.test(q.flags.get(id)?.flags ?? '');
  const openFor = (id) => enabled && (fake || network === 'mainnet' || isDev(id));
  const on = (a) => { if (!openFor(a.id)) throw new HttpError(400, 'founder_off'); };

  route('GET', '/api/founder/status', (ctx) => {
    const a = who(ctx); const now = Date.now();
    const me = q.founderOf.get(a.id);
    return {
      enabled: openFor(a.id), network, price, supply, sold: q.sold.get().n, left: left(now, a.id), mint, receiver: openFor(a.id) ? receiver : null,
      me: me ? { number: me.number, credits: !!me.credits } : null, order: openFor(a.id) ? view(q.openOf.get(a.id, now), now) : null,
    };
  });

  route('POST', '/api/founder/order', async (ctx) => {
    const a = who(ctx); on(a);
    await readJson(ctx.req, 512);
    limit(ctx, `founder-order:${a.id}`, 6, 3600_000);
    const now = Date.now();
    const out = tx(() => {
      if (q.founderOf.get(a.id)) throw new HttpError(409, 'founder_already');
      const open = q.openOf.get(a.id, now);
      if (open) return open;
      if (left(now, a.id) <= 0) throw new HttpError(409, 'founder_sold_out');
      const id = q.newOrder.run(a.id, newReference(), amount, now, now + HOLD).lastInsertRowid;
      return q.order.get(id);
    });
    audit('founder_order', a.id, ctx.ipHash, `pedido ${out.id}`);
    return { order: view(out, now) };
  });

  /** the order and, while it is open, a fresh look at the chain (the browser asks every few seconds after paying) */
  route('GET', '/api/founder/order', async (ctx) => {
    const a = who(ctx); on(a);
    const o = q.order.get(Math.floor(Number(ctx.url.searchParams.get('id'))) || 0);
    if (!o || o.account_id !== a.id) throw new HttpError(404, 'not_found');
    if (o.status === 'open' && o.created_at > Date.now() - WATCH) await check(o);
    const me = q.founderOf.get(a.id);
    return { order: view(q.order.get(o.id)), me: me ? { number: me.number, credits: !!me.credits } : null };
  });

  /** the USDC transfer for the player's browser wallet to sign and send (any wallet: linking one is not needed) */
  route('POST', '/api/founder/pay-tx', async (ctx) => {
    const a = who(ctx); on(a);
    const b = await readJson(ctx.req, 2048);
    const o = q.order.get(Math.floor(Number(b.id)) || 0);
    if (!o || o.account_id !== a.id) throw new HttpError(404, 'not_found');
    if (o.status !== 'open' || o.expires_at <= Date.now()) throw new HttpError(409, 'founder_order_closed');
    const payer = String(b.payer ?? '').trim();
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(payer)) throw new HttpError(400, 'bad_address');
    const balance = await pay.tokenBalance(payer);
    if (!fake && balance < o.amount) throw new HttpError(400, 'founder_no_usdc', { balance: balance / 1e6 });
    return { tx: await pay.payTx({ payer, reference: o.reference, amount: o.amount }) };
  });

  route('POST', '/api/founder/credits', async (ctx) => {
    const a = who(ctx);
    const b = await readJson(ctx.req, 512);
    if (!q.founderOf.get(a.id)) throw new HttpError(404, 'not_found');
    q.credits.run(b.show === false ? 0 : 1, a.id);
    return { ok: true, show: b.show !== false };
  });

  /** the credits, for the game and the promo site */
  route('GET', '/api/public/founders', (ctx) => {
    limit(ctx, `founders:${ctx.ip}`, 60, MIN);
    return { supply, sold: q.sold.get().n, price, founders: q.creditsList.all().map((r) => ({ number: r.number, name: r.username })) };
  });

  /** the founder number of an account (for badges next to names), or null */
  const numberOf = (accountId) => q.founderOf.get(accountId)?.number ?? null;
  return { enabled, network, receiver, mint, price, supply, pay, work, check, numberOf, status: () => ({ enabled, network, receiver, mint, price, supply, sold: q.sold.get().n }) };
}
