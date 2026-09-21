// The game economy, owned by the server. The browser can no longer print $FLORA: every coin that enters or leaves a wallet does so
// through an *intent* validated here, with prices, odds, limits and timers taken from the same pure modules the game uses
// (server/gen/sim.mjs, built from src/sim). The client keeps playing locally for feel and mirrors what this module answers.
//
// Where $FLORA can be minted, and what bounds it:
//   claim_daily  one small claim per 24 h                     sale        market depth (see sim/economy.ts): even selling forever pays a bounded amount
//   level        once per level, capped by the account's age   quest       once per quest id, amount from a server table
//   refund       duplicate avatar, a fraction of the chest price
// Everything else burns: builds, speed-ups, wages, hires, chests, ranks, lands, the sale fee and licence, and generic spends.
import crypto from 'node:crypto';
import { economy as E, facilities as F, staff as S, avatars as A, terroir as T, lands as L, INITIAL_FACILITIES, INITIAL_QUESTS } from './gen/sim.mjs';

const DAY = 86400_000;
const PRODUCT_PRICE = { live_rosin: 45, cured_flower: 9, full_spec_oil: 25, pure_terpenes: 85 };   // per product gram, before ECON.priceScale
const QUEST_FLORA = Object.fromEntries(INITIAL_QUESTS.map((q) => [q.id, q.rewardFlora]));
const FACILITY_BY_ID = Object.fromEntries(INITIAL_FACILITIES.map((f) => [f.id, f]));
const MAX_SPEND = 30000;
const CAPS = { staff: 24, avatars: 60, plots: 12, floraOnImport: 1500 };
// Player-to-player market: what is listed sits in escrow, the sale is one transaction, and a slice of every sale is burned.
const P2P = { feeRate: 0.05, minPrice: 1, maxPrice: 100000, maxListings: 20, pageSize: 24, kinds: ['staff', 'land', 'avatar'] };
const rng = () => crypto.randomInt(0, 2 ** 32) / 2 ** 32;

export function installEconomy({ db, route, HttpError, sessionAccount, audit, limit, readJson }) {
  db.exec(`
CREATE TABLE IF NOT EXISTS wallets (account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE, flora INTEGER NOT NULL, faucet_at INTEGER NOT NULL DEFAULT 0,
  depth_sold REAL NOT NULL DEFAULT 0, depth_at INTEGER NOT NULL DEFAULT 0, minted INTEGER NOT NULL DEFAULT 0, burned INTEGER NOT NULL DEFAULT 0, imported INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, ts INTEGER NOT NULL, kind TEXT NOT NULL, delta INTEGER NOT NULL, balance INTEGER NOT NULL, ref TEXT);
CREATE INDEX IF NOT EXISTS idx_ledger_acc ON ledger(account_id, id);
CREATE TABLE IF NOT EXISTS econ_state (account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE, json TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS nfts (id TEXT PRIMARY KEY, account_id INTEGER NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL, minted_at INTEGER NOT NULL, escrow INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_nfts_acc ON nfts(account_id, kind);
CREATE TABLE IF NOT EXISTS listings (id INTEGER PRIMARY KEY AUTOINCREMENT, seller_id INTEGER NOT NULL, nft_id TEXT NOT NULL, kind TEXT NOT NULL, rarity TEXT NOT NULL DEFAULT '',
  data TEXT NOT NULL, price INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'active', buyer_id INTEGER, fee INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, closed_at INTEGER);
CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(status, kind, price);
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_id, status);
CREATE TABLE IF NOT EXISTS gifts (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, amount INTEGER NOT NULL, note TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, opened_at INTEGER);
CREATE INDEX IF NOT EXISTS idx_gifts_acc ON gifts(account_id, opened_at);
CREATE TABLE IF NOT EXISTS econ_idem (account_id INTEGER NOT NULL, idem TEXT NOT NULL, response TEXT NOT NULL, ts INTEGER NOT NULL, PRIMARY KEY (account_id, idem));
`);
  const q = {
    wallet: db.prepare('SELECT * FROM wallets WHERE account_id = ?'),
    newWallet: db.prepare('INSERT INTO wallets (account_id, flora, created_at) VALUES (?,?,?)'),
    setBalance: db.prepare('UPDATE wallets SET flora = ?, minted = minted + ?, burned = burned + ? WHERE account_id = ?'),
    setFaucet: db.prepare('UPDATE wallets SET faucet_at = ? WHERE account_id = ?'),
    setDepth: db.prepare('UPDATE wallets SET depth_sold = ?, depth_at = ? WHERE account_id = ?'),
    setImported: db.prepare('UPDATE wallets SET imported = 1 WHERE account_id = ?'),
    ledger: db.prepare('INSERT INTO ledger (account_id, ts, kind, delta, balance, ref) VALUES (?,?,?,?,?,?)'),
    history: db.prepare('SELECT ts, kind, delta, balance, ref FROM ledger WHERE account_id = ? ORDER BY id DESC LIMIT 40'),
    state: db.prepare('SELECT json FROM econ_state WHERE account_id = ?'),
    putState: db.prepare('INSERT INTO econ_state (account_id, json) VALUES (?,?) ON CONFLICT(account_id) DO UPDATE SET json = excluded.json'),
    nftsOf: db.prepare('SELECT * FROM nfts WHERE account_id = ?'),
    nft: db.prepare('SELECT * FROM nfts WHERE id = ?'),
    putNft: db.prepare('INSERT INTO nfts (id, account_id, kind, data, minted_at) VALUES (?,?,?,?,?)'),
    setNft: db.prepare('UPDATE nfts SET data = ? WHERE id = ?'),
    takenLands: db.prepare("SELECT id FROM nfts WHERE kind = 'land'"),
    idem: db.prepare('SELECT response FROM econ_idem WHERE account_id = ? AND idem = ?'),
    putIdem: db.prepare('INSERT OR REPLACE INTO econ_idem (account_id, idem, response, ts) VALUES (?,?,?,?)'),
    sweepIdem: db.prepare('DELETE FROM econ_idem WHERE ts < ?'),
    giftsOf: db.prepare('SELECT id, amount, note, created_at FROM gifts WHERE account_id = ? AND opened_at IS NULL ORDER BY id'),
    gift: db.prepare('SELECT * FROM gifts WHERE id = ?'),
    openGift: db.prepare('UPDATE gifts SET opened_at = ? WHERE id = ? AND opened_at IS NULL'),
    setEscrow: db.prepare('UPDATE nfts SET escrow = ? WHERE id = ?'),
    moveNft: db.prepare('UPDATE nfts SET account_id = ?, escrow = 0 WHERE id = ?'),
    delNft: db.prepare('DELETE FROM nfts WHERE id = ?'),
    newListing: db.prepare('INSERT INTO listings (seller_id, nft_id, kind, rarity, data, price, created_at) VALUES (?,?,?,?,?,?,?)'),
    listing: db.prepare('SELECT * FROM listings WHERE id = ?'),
    closeListing: db.prepare('UPDATE listings SET status = ?, buyer_id = ?, fee = ?, closed_at = ? WHERE id = ?'),
    activeOf: db.prepare("SELECT * FROM listings WHERE seller_id = ? AND status = 'active' ORDER BY id DESC"),
    activeCount: db.prepare("SELECT COUNT(*) n FROM listings WHERE seller_id = ? AND status = 'active'"),
    recentSales: db.prepare("SELECT l.id, l.kind, l.rarity, l.price, l.closed_at, l.data FROM listings l WHERE l.status = 'sold' ORDER BY l.closed_at DESC LIMIT 20"),
    userName: db.prepare('SELECT username FROM accounts WHERE id = ?'),
  };
  setInterval(() => { try { q.sweepIdem.run(Date.now() - 2 * DAY); } catch { /* */ } }, 3600_000).unref();

  /* ───────────── state ───────────── */
  const freshState = (now) => ({ tier: 1, unlocked: ['tent_starter'], construction: null, staffAssign: {}, staffPity: S.EMPTY_STAFF_PITY, avatarPity: A.EMPTY_PITY, questsClaimed: [], levelsClaimed: [1], created: now });
  const walletOf = (id, now) => {
    let w = q.wallet.get(id);
    if (!w) { q.newWallet.run(id, E.ECON.starterFlora, now); q.putState.run(id, JSON.stringify(freshState(now))); w = q.wallet.get(id); q.ledger.run(id, now, 'starter', E.ECON.starterFlora, E.ECON.starterFlora, 'cuenta nueva'); }
    return w;
  };
  const stateOf = (id) => { const r = q.state.get(id); return r ? JSON.parse(r.json) : freshState(Date.now()); };
  const saveState = (id, st) => q.putState.run(id, JSON.stringify(st));
  const nftRows = (id, kind) => q.nftsOf.all(id).filter((r) => !kind || r.kind === kind).map((r) => ({ ...r, data: JSON.parse(r.data) }));
  const roster = (id) => nftRows(id, 'staff').map((r) => r.data);                       // includes listed ones (they still count toward the cap)
  const free = (id, kind) => nftRows(id, kind).filter((r) => !r.escrow).map((r) => r.data);   // what the player can actually use
  const saveStaff = (s) => q.setNft.run(JSON.stringify(s), s.id);

  const listingView = (r) => ({ id: r.id, nftId: r.nft_id, kind: r.kind, rarity: r.rarity, price: r.price, createdAt: r.created_at, data: JSON.parse(r.data), sellerId: r.seller_id });

  /* ───────────── money ───────────── */
  // All money moves inside one SQLite transaction (see `run`), so an intent either happens entirely or not at all.
  const credit = (id, amount, kind, ref, now) => {
    amount = Math.round(amount); if (amount <= 0) return;
    const w = q.wallet.get(id); const bal = w.flora + amount;
    q.setBalance.run(bal, amount, 0, id); q.ledger.run(id, now, kind, amount, bal, ref ?? null);
  };
  const debit = (id, amount, kind, ref, now) => {
    amount = Math.round(amount); if (amount <= 0) return;
    const w = q.wallet.get(id);
    if (w.flora < amount) throw new HttpError(400, 'insufficient', { need: amount, have: w.flora });
    const bal = w.flora - amount;
    q.setBalance.run(bal, 0, amount, id); q.ledger.run(id, now, kind, -amount, bal, ref ?? null);
  };

  /** buyer pays `price`, seller receives it minus the fee, and the fee leaves the game (only it counts as burned) */
  const transfer = (buyer, seller, price, fee, ref, now) => {
    const b = q.wallet.get(buyer);
    if (b.flora < price) throw new HttpError(400, 'insufficient', { need: price, have: b.flora });
    q.setBalance.run(b.flora - price, 0, fee, buyer); q.ledger.run(buyer, now, 'p2p_buy', -price, b.flora - price, ref);
    const s = q.wallet.get(seller);
    q.setBalance.run(s.flora + price - fee, 0, 0, seller); q.ledger.run(seller, now, 'p2p_sale', price - fee, s.flora + price - fee, ref);
  };

  /* ───────────── time-driven changes: builds finish, wages are paid ───────────── */
  const activeMods = (id, st, now) => {
    const all = roster(id);
    const working = S.STAFF_ROLES.map((r) => all.find((x) => x.id === st.staffAssign[r])).filter((x) => x && S.isActive(x, now));
    return working.length ? S.modifiersOf(working) : { ...S.NO_MODS };
  };
  function settle(id, now) {
    const st = stateOf(id);
    let changed = false;
    if (st.construction && F.isDone(st.construction, now)) {
      const f = FACILITY_BY_ID[st.construction.facilityId];
      if (f) { st.tier = Math.max(st.tier, f.tier); if (!st.unlocked.includes(f.id)) st.unlocked.push(f.id); }
      st.construction = null; changed = true;
    }
    const ids = S.STAFF_ROLES.map((r) => st.staffAssign[r]).filter(Boolean);
    if (ids.length) {
      const before = roster(id);
      const w = q.wallet.get(id);
      const res = S.settleWages(before, ids, w.flora, now);
      if (res.spent > 0) {
        for (const s of res.roster) { const old = before.find((x) => x.id === s.id); if (old && old.paidThrough !== s.paidThrough) saveStaff(s); }
        debit(id, res.spent, 'wages', `${ids.length} asistentes`, now);
      }
    }
    if (changed) saveState(id, st);
    return st;
  }

  /* ───────────── snapshot the client mirrors ───────────── */
  function snapshot(id, now) {
    const w = q.wallet.get(id), st = stateOf(id);
    const taken = new Set(q.takenLands.all().map((r) => r.id));
    const offers = {};
    for (const region of L.allRegions()) { const o = L.landOffers(region, taken); offers[region] = { ids: o.offers.map((x) => x.id), left: o.left }; }
    const claim = E.claimStatus(w.faucet_at, now);
    const plots = free(id, 'land');
    const avatars = free(id, 'avatar');
    return {
      serverNow: now, flora: w.flora, faucetAt: w.faucet_at, claim,
      depth: { sold: w.depth_sold, at: w.depth_at },
      tier: st.tier, unlocked: st.unlocked, construction: st.construction,
      staff: free(id, 'staff'), staffAssign: st.staffAssign, staffPity: st.staffPity,
      plots, avatars, avatarPity: st.avatarPity, offers,
      imported: !!w.imported, minted: w.minted, burned: w.burned,
      gifts: q.giftsOf.all(id).map((g) => ({ id: g.id, amount: g.amount, note: g.note, createdAt: g.created_at })),
      listings: q.activeOf.all(id).map(listingView), p2p: { feeRate: P2P.feeRate, minPrice: P2P.minPrice, maxPrice: P2P.maxPrice, maxListings: P2P.maxListings },
    };
  }

  /* ───────────── intents ───────────── */
  const need = (cond, code, extra) => { if (!cond) throw new HttpError(400, code, extra); };
  const num = (v, lo, hi) => { const n = Number(v); need(Number.isFinite(n) && n >= lo && n <= hi, 'bad_params'); return n; };
  const str = (v, max = 80) => { need(typeof v === 'string' && v.length > 0 && v.length <= max, 'bad_params'); return v; };

  /** an avatar copy joins the owner's stack for that design (or starts one); the temporary escrow NFT is deleted */
  function giveAvatar(id, copy, escrowId, now) {
    q.delNft.run(escrowId);
    const nid = `av-${id}-${copy.designId}`, row = q.nft.get(nid);
    if (row) { const o = JSON.parse(row.data); o.count += 1; q.setNft.run(JSON.stringify(o), nid); }
    else q.putNft.run(nid, id, 'avatar', JSON.stringify({ ...copy, count: 1 }), now);
  }

  const INTENTS = {
    claim_daily({ id, now }) {
      const w = q.wallet.get(id);
      const st = E.claimStatus(w.faucet_at, now);
      need(st.ok, 'too_early', { leftMs: st.leftMs });
      q.setFaucet.run(now, id); credit(id, E.ECON.dailyClaim, 'claim', 'reclamo diario', now);
      return { amount: E.ECON.dailyClaim };
    },

    sell({ id, now, p }) {
      const type = str(p.type, 30); need(type in PRODUCT_PRICE, 'bad_params');
      const grams = num(p.grams, 0.05, 2000);
      const w = q.wallet.get(id), st = stateOf(id);
      const price = PRODUCT_PRICE[type] * E.ECON.priceScale;
      const sale = E.saleRevenue(price, grams, { sold: w.depth_sold, at: w.depth_at }, now);
      const mods = activeMods(id, st, now);
      const gross = Math.round(sale.revenue * (1 + mods.sellBonus));
      const fee = Math.max(1, Math.round(gross * E.burnRateOfSale(st.tier)));
      q.setDepth.run(sale.depth.sold, sale.depth.at, id);
      credit(id, gross, 'sale', `${grams} g de ${type}`, now);
      debit(id, fee, 'sale_fee', `comisión y licencia Nv.${st.tier}`, now);
      return { gross, fee, net: gross - fee, ratio: sale.revenue / Math.max(1e-9, price * grams) };
    },

    start_build({ id, now, p }) {
      const st = stateOf(id); const f = FACILITY_BY_ID[str(p.facilityId, 40)];
      need(f, 'bad_params'); need(!st.construction, 'build_in_progress');
      need(!st.unlocked.includes(f.id), 'already_built'); need(f.tier === st.tier + 1, 'skip_rung');
      const c = F.startConstruction(f.id, now); need(c, 'bad_params');
      debit(id, f.costFlora, 'build', f.name, now); st.construction = c; saveState(id, st);
      return { hours: F.buildHoursOf(f.id) };
    },
    speedup_build({ id, now }) {
      const st = stateOf(id); need(st.construction, 'no_build');
      const r = F.applySpeedUp(st.construction, now); need(r, 'speedup_limit');
      debit(id, r.quote.costFlora, 'speedup', 'aceleración de obra', now); st.construction = r.state; saveState(id, st);
      return { cutMs: r.quote.cutMs, cost: r.quote.costFlora, left: r.quote.leftToday - 1 };
    },

    hire({ id, now, p }) {
      const candId = str(p.candidateId, 60);
      const cand = S.jobBoard(Math.floor(now / DAY)).find((c) => c.id === candId);
      need(cand, 'not_on_board');
      const hireId = `${candId}-${id}`;                       // the board is the same for everybody; every account gets its own copy
      need(!q.nft.get(hireId), 'already_hired');
      need(roster(id).length < CAPS.staff, 'roster_full');
      debit(id, cand.priceFlora, 'hire', candId, now);
      const hire = S.hireFromBoard({ ...cand, id: hireId }, now);
      q.putNft.run(hire.id, id, 'staff', JSON.stringify(hire), now);
      return { staff: hire };
    },
    staff_chest({ id, now, p }) {
      const chest = S.STAFF_CHESTS[str(p.chestId, 20)]; need(chest, 'bad_params');
      need(roster(id).length < CAPS.staff, 'roster_full');
      const st = stateOf(id);
      debit(id, chest.priceFlora, 'chest', chest.name, now);
      let res;
      for (let i = 0; i < 5; i++) { res = S.rollStaff(chest, st.staffPity[chest.id], crypto.randomInt(1, 1e9), now, rng); if (!q.nft.get(res.staff.id)) break; }
      need(!q.nft.get(res.staff.id), 'try_again');
      st.staffPity = { ...st.staffPity, [chest.id]: res.pity }; saveState(id, st);
      q.putNft.run(res.staff.id, id, 'staff', JSON.stringify(res.staff), now);
      return { staff: res.staff };
    },
    rank_up({ id, now, p }) {
      const row = q.nft.get(str(p.staffId, 60)); need(row && row.account_id === id && row.kind === 'staff' && !row.escrow, 'not_yours');
      const s = JSON.parse(row.data); const cost = S.rankUpCost(s); need(cost !== null, 'max_rank');
      debit(id, cost, 'rank_up', s.name, now); s.rank += 1; saveStaff(s);
      return { staff: s };
    },
    assign({ id, now, p }) {
      const role = str(p.role, 20); need(S.STAFF_ROLES.includes(role), 'bad_params');
      const st = stateOf(id);
      if (p.staffId === null || p.staffId === undefined) delete st.staffAssign[role];
      else {
        const row = q.nft.get(str(p.staffId, 60)); need(row && row.account_id === id && row.kind === 'staff' && !row.escrow, 'not_yours');
        need(JSON.parse(row.data).role === role, 'wrong_role');
        st.staffAssign[role] = row.id;
      }
      saveState(id, st);
      return {};
    },

    buy_plot({ id, now, p }) {
      const offerId = str(p.offerId, 60); const m = /^plot-([a-z_]+)-(\d+)$/.exec(offerId);
      need(m && T.REGION_BY_ID[m[1]], 'bad_params');
      need(nftRows(id, 'land').length < CAPS.plots, 'too_many_lands');
      const taken = new Set(q.takenLands.all().map((r) => r.id));
      const offer = L.landOffers(m[1], taken).offers.find((o) => o.id === offerId);
      need(offer, 'plot_taken');
      debit(id, offer.priceFlora, 'land', offer.name, now);
      const land = { id: offer.id, region: offer.region, index: offer.index, name: offer.name, ratings: offer.ratings, landRating: offer.landRating, mintedAt: now };
      try { q.putNft.run(land.id, id, 'land', JSON.stringify(land), now); } catch { throw new HttpError(409, 'plot_taken'); }
      return { plot: land };
    },

    avatar_chest({ id, now, p }) {
      const chest = A.CHESTS[str(p.chestId, 20)]; need(chest, 'bad_params');
      const st = stateOf(id);
      debit(id, chest.priceFlora, 'chest', chest.name, now);
      const { design, pity } = A.rollChest(chest, st.avatarPity[chest.id], A.seasonOf(new Date(now)), rng);
      st.avatarPity = { ...st.avatarPity, [chest.id]: pity }; saveState(id, st);
      const nid = `av-${id}-${design.id}`, row = q.nft.get(nid);
      let owned, refund = 0;
      if (row) { owned = JSON.parse(row.data); owned.count += 1; refund = A.DUPLICATE_REFUND[design.rarity]; q.setNft.run(JSON.stringify(owned), nid); credit(id, refund, 'refund', `duplicado ${design.name}`, now); }
      else { owned = { designId: design.id, count: 1, firstAt: now, serial: 1000 + crypto.randomInt(9000) }; q.putNft.run(nid, id, 'avatar', JSON.stringify(owned), now); }
      return { designId: design.id, isNew: !row, refund, owned };
    },

    reward({ id, now, p }) {
      const st = stateOf(id), kind = str(p.kind, 12);
      if (kind === 'quest') {
        const qid = str(p.id, 60); need(qid in QUEST_FLORA, 'bad_params'); need(!st.questsClaimed.includes(qid), 'already_claimed');
        st.questsClaimed.push(qid); saveState(id, st); credit(id, QUEST_FLORA[qid], 'quest', qid, now);
        return { amount: QUEST_FLORA[qid] };
      }
      if (kind === 'level') {
        const level = Math.floor(num(p.level, 2, 200)); need(!st.levelsClaimed.includes(level), 'already_claimed');
        const ageDays = (now - st.created) / DAY;
        need(level <= 4 + Math.floor(ageDays * 4), 'too_fast');         // a level takes real time: this only stops absurd jumps
        st.levelsClaimed.push(level); saveState(id, st); credit(id, E.ECON.levelBonus, 'level', `nivel ${level}`, now);
        return { amount: E.ECON.levelBonus };
      }
      throw new HttpError(400, 'bad_params');
    },

    /* ── operator gifts: a chest the house sends to one account (`node server/admin.mjs gift <correo> <monto>`); opening it credits once ── */
    open_gift({ id, now, p }) {
      const g = q.gift.get(Math.floor(num(p.giftId, 1, 2 ** 40)));
      need(g && g.account_id === id && g.opened_at === null, 'not_yours');
      need(q.openGift.run(now, g.id).changes === 1, 'already_claimed');
      credit(id, g.amount, 'gift', g.note || 'regalo de la casa', now);
      return { amount: g.amount, note: g.note };
    },

    /* ── player market ── */
    list({ id, now, p }) {
      const nftId = p.designId ? `av-${id}-${str(p.designId, 40)}` : str(p.nftId, 70), price = Math.floor(num(p.price, P2P.minPrice, P2P.maxPrice));
      need(q.activeCount.get(id).n < P2P.maxListings, 'too_many_listings');
      let row = q.nft.get(nftId); need(row && row.account_id === id && P2P.kinds.includes(row.kind) && !row.escrow, 'not_yours');
      let data = JSON.parse(row.data), rarity = '';
      if (row.kind === 'staff') {
        rarity = data.rarity;
        const st = stateOf(id);
        for (const r of Object.keys(st.staffAssign)) if (st.staffAssign[r] === row.id) delete st.staffAssign[r];   // a listed assistant stops working
        saveState(id, st);
      } else if (row.kind === 'land') rarity = L.landRarity(data.landRating);
      else if (row.kind === 'avatar') {
        rarity = A.DESIGN_BY_ID[data.designId]?.rarity ?? '';
        // one copy leaves the stack: the listing is its own NFT until it is sold or taken back
        const copy = { designId: data.designId, count: 1, firstAt: data.firstAt, serial: data.serial };
        if (data.count > 1) { data.count -= 1; q.setNft.run(JSON.stringify(data), row.id); } else q.delNft.run(row.id);
        const lid = `avl-${id}-${now}-${crypto.randomInt(1e6)}`;
        q.putNft.run(lid, id, 'avatar', JSON.stringify(copy), now); row = q.nft.get(lid); data = copy;
      }
      q.setEscrow.run(1, row.id);
      const info = q.newListing.run(id, row.id, row.kind, String(rarity ?? ''), JSON.stringify(data), price, now);
      return { listingId: Number(info.lastInsertRowid), price };
    },
    cancel_listing({ id, now, p }) {
      const l = q.listing.get(Math.floor(num(p.listingId, 1, 2 ** 40))); need(l && l.seller_id === id && l.status === 'active', 'not_yours');
      if (l.kind === 'avatar') giveAvatar(id, JSON.parse(l.data), l.nft_id, now); else q.setEscrow.run(0, l.nft_id);
      q.closeListing.run('cancelled', null, 0, now, l.id);
      return {};
    },
    buy_listing({ id, now, p }) {
      const l = q.listing.get(Math.floor(num(p.listingId, 1, 2 ** 40))); need(l && l.status === 'active', 'listing_gone');
      need(l.seller_id !== id, 'own_listing');
      if (l.kind === 'staff') need(roster(id).length < CAPS.staff, 'roster_full');
      if (l.kind === 'land') need(nftRows(id, 'land').length < CAPS.plots, 'too_many_lands');
      const fee = Math.max(1, Math.round(l.price * P2P.feeRate));
      transfer(id, l.seller_id, l.price, fee, `${l.kind} #${l.nft_id}`, now);
      if (l.kind === 'avatar') giveAvatar(id, JSON.parse(l.data), l.nft_id, now); else q.moveNft.run(id, l.nft_id);
      q.closeListing.run('sold', id, fee, now, l.id);
      return { kind: l.kind, nftId: l.nft_id, price: l.price, fee, data: JSON.parse(l.data) };
    },

    // burns that are not modelled yet (market items, seeds, repairs, patents…): the server only debits, it never credits
    spend({ id, now, p }) {
      const amount = num(p.amount, 1, MAX_SPEND); debit(id, amount, 'spend', String(p.memo ?? '').slice(0, 120), now);
      return { amount };
    },
  };

  /** run one intent atomically; a repeated `idem` returns the first answer instead of doing it twice */
  function run(acc, type, params, idem) {
    const id = acc.id, now = Date.now();
    if (idem) { const r = q.idem.get(id, idem); if (r) return JSON.parse(r.response); }
    const fn = INTENTS[type]; if (!fn) throw new HttpError(400, 'unknown_intent');
    db.exec('BEGIN IMMEDIATE');
    try {
      walletOf(id, now); settle(id, now);
      const result = fn({ id, now, p: params && typeof params === 'object' ? params : {} });
      const out = { ok: true, result, snapshot: snapshot(id, now) };
      if (idem) q.putIdem.run(id, idem, JSON.stringify(out), now);
      db.exec('COMMIT');
      audit(`econ_${type}`, id, null);
      return out;
    } catch (e) { try { db.exec('ROLLBACK'); } catch { /* */ } throw e; }
  }

  /** the one-time import of a local save into the account, with caps (the browser's word is worth little) */
  function importLocal(acc, b) {
    const id = acc.id, now = Date.now();
    db.exec('BEGIN IMMEDIATE');
    try {
      const w = walletOf(id, now); need(!w.imported, 'already_imported');
      const st = stateOf(id);
      const flora = Math.max(0, Math.min(CAPS.floraOnImport, Math.floor(Number(b.flora) || 0)));
      if (flora > w.flora) credit(id, flora - w.flora, 'import', 'progreso local', now);
      const tier = Math.max(1, Math.min(4, Math.floor(Number(b.tier) || 1)));
      for (const f of INITIAL_FACILITIES) if (f.tier <= tier && !st.unlocked.includes(f.id)) st.unlocked.push(f.id);
      st.tier = Math.max(st.tier, tier);
      for (const s of S.normalizeRoster(b.staff).slice(0, CAPS.staff)) if (!q.nft.get(s.id) && /^staff-[\w-]{2,50}$/.test(s.id)) q.putNft.run(s.id, id, 'staff', JSON.stringify({ ...s, paidThrough: 0 }), now);
      st.staffAssign = S.normalizeAssignments(b.staffAssign, roster(id));
      for (const a of (Array.isArray(b.avatars) ? b.avatars : []).slice(0, CAPS.avatars)) {
        if (!A.DESIGN_BY_ID[a?.designId]) continue;
        const nid = `av-${id}-${a.designId}`;
        if (!q.nft.get(nid)) q.putNft.run(nid, id, 'avatar', JSON.stringify({ designId: a.designId, count: Math.max(1, Math.min(50, Math.floor(a.count) || 1)), firstAt: Number(a.firstAt) || now, serial: Math.floor(a.serial) || 1000 }), now);
      }
      for (const pl of (Array.isArray(b.plots) ? b.plots : []).slice(0, CAPS.plots)) {
        const m = /^plot-([a-z_]+)-(\d+)$/.exec(String(pl?.id)); if (!m || !T.REGION_BY_ID[m[1]] || q.nft.get(pl.id)) continue;
        const o = T.plotOffer(m[1], Number(m[2]));           // the plot's data always comes from the server's own formula
        q.putNft.run(o.id, id, 'land', JSON.stringify({ id: o.id, region: o.region, index: o.index, name: o.name, ratings: o.ratings, landRating: o.landRating, mintedAt: Number(pl.mintedAt) || now }), now);
      }
      saveState(id, st); q.setImported.run(id);
      db.exec('COMMIT');
      audit('econ_import', id, null);
      return { ok: true, snapshot: snapshot(id, now) };
    } catch (e) { try { db.exec('ROLLBACK'); } catch { /* */ } throw e; }
  }

  /* ───────────── routes ───────────── */
  const who = (ctx) => { const a = sessionAccount(ctx); if (!a) throw new HttpError(401, 'unauthenticated'); limit(ctx, `econ:${a.id}`, 240, 60_000); return a; };
  route('GET', '/api/econ/state', (ctx) => {
    const a = who(ctx); const now = Date.now();
    db.exec('BEGIN IMMEDIATE');
    try { walletOf(a.id, now); settle(a.id, now); const out = { snapshot: snapshot(a.id, now), history: q.history.all(a.id) }; db.exec('COMMIT'); return out; }
    catch (e) { try { db.exec('ROLLBACK'); } catch { /* */ } throw e; }
  });
  route('POST', '/api/econ/intent', async (ctx) => {
    const a = who(ctx); const b = await readJson(ctx.req, 16 * 1024);
    return run(a, String(b.type ?? ''), b.params, typeof b.idem === 'string' ? b.idem.slice(0, 80) : '');
  });
  route('GET', '/api/econ/market', (ctx) => {
    const a = who(ctx); const u = ctx.url;
    const kind = u.searchParams.get('kind') ?? '', rarity = u.searchParams.get('rarity') ?? '', sort = u.searchParams.get('sort') ?? 'new';
    const page = Math.max(0, Math.min(200, Math.floor(Number(u.searchParams.get('page')) || 0)));
    const where = ["status = 'active'"], args = [];
    if (P2P.kinds.includes(kind)) { where.push('kind = ?'); args.push(kind); }
    if (/^[a-z]{3,12}$/.test(rarity)) { where.push('rarity = ?'); args.push(rarity); }
    const order = sort === 'cheap' ? 'price ASC, id DESC' : sort === 'dear' ? 'price DESC, id DESC' : 'id DESC';
    const rows = db.prepare(`SELECT * FROM listings WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ? OFFSET ?`).all(...args, P2P.pageSize + 1, page * P2P.pageSize);
    const more = rows.length > P2P.pageSize;
    return {
      listings: rows.slice(0, P2P.pageSize).map((r) => ({ ...listingView(r), seller: q.userName.get(r.seller_id)?.username ?? '—', mine: r.seller_id === a.id })),
      more, feeRate: P2P.feeRate,
      recent: q.recentSales.all().map((r) => ({ id: r.id, kind: r.kind, rarity: r.rarity, price: r.price, at: r.closed_at })),
    };
  });
  route('POST', '/api/econ/import-local', async (ctx) => { const a = who(ctx); return importLocal(a, await readJson(ctx.req, 96 * 1024)); });

  return { run, snapshot, walletOf, importLocal, INTENTS };
}
