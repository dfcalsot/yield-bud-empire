// The game itself, run by the server. The browser is a screen: it reads the state (GET /api/game/state) and asks for actions
// (POST /api/game/action {type, params, idem}); it never sends state. Every request runs in one SQLite transaction: the world
// advances to the server's clock (src/core/tick.ts), the action is validated and applied by the same core the browser uses to
// predict it (src/core/actions.ts), money and goods move through the economy (server/economy.mjs) and everything is saved at once.
//
// The first time an account arrives, its old browser save (the cloud copy in `saves`) is migrated with caps (core normalizeGame):
// level never above what the economy already paid, seeds / lots / numbers inside what the game allows.
import crypto from 'node:crypto';
import { core as C, useLangNow, EN } from './gen/sim.mjs';

const DAY = 86400_000;

export function installGame({ db, route, HttpError, sessionAccount, audit, limit, readJson, econ }) {
  db.exec(`
CREATE TABLE IF NOT EXISTS game_state (account_id INTEGER PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE, json TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, migrated_from TEXT);
CREATE TABLE IF NOT EXISTS game_idem (account_id INTEGER NOT NULL, idem TEXT NOT NULL, response TEXT NOT NULL, ts INTEGER NOT NULL, PRIMARY KEY (account_id, idem));
`);
  const q = {
    get: db.prepare('SELECT json, version FROM game_state WHERE account_id = ?'),
    ins: db.prepare('INSERT INTO game_state (account_id, json, version, created_at, updated_at, migrated_from) VALUES (?,?,?,?,?,?)'),
    put: db.prepare('UPDATE game_state SET json = ?, version = version + 1, updated_at = ? WHERE account_id = ?'),
    idem: db.prepare('SELECT response FROM game_idem WHERE account_id = ? AND idem = ?'),
    putIdem: db.prepare('INSERT OR REPLACE INTO game_idem (account_id, idem, response, ts) VALUES (?,?,?,?)'),
    sweepIdem: db.prepare('DELETE FROM game_idem WHERE ts < ?'),
  };
  setInterval(() => { try { q.sweepIdem.run(Date.now() - DAY); } catch { /* */ } }, 3600_000).unref();

  const rng = () => crypto.randomInt(0, 2 ** 32) / 2 ** 32;

  /** the economy's side of the account, as the core reads it */
  function extOf(id, now) {
    const st = econ.stateOf(id), w = econ.wallet(id);
    const facility = C.facilityOfTier(st.tier);
    return {
      flora: w.flora, tier: st.tier, facility, mods: econ.activeMods(id, st, now),
      plots: econ.free(id, 'land'), avatars: econ.free(id, 'avatar').map((a) => a.designId),
      inventory: econ.inventoryOf(id), forgeJobs: Array.isArray(st.forgeJobs) ? st.forgeJobs : [],
    };
  }

  function ctxFor(id, now, idem) {
    let cache = null, n = 0;
    const fresh = () => { cache = null; };
    return {
      now, rng,
      uid: (prefix) => `${prefix}-${idem}-${n++}`,
      ext: () => (cache ??= extOf(id, now)),
      debit: (amount, kind, memo) => { econ.debit(id, amount, kind, String(memo).slice(0, 120), now); fresh(); },
      credit: (amount, kind, memo) => { econ.credit(id, amount, kind, String(memo).slice(0, 120), now); fresh(); },
      econ: (type, params = {}) => {
        const fn = econ.INTENTS[type];
        if (!fn) throw new HttpError(400, 'unknown_intent');
        try { return fn({ id, now, p: params }); } finally { fresh(); }
      },
      payLevels: (level) => { const paid = econ.payLevels(id, level, now); if (paid) fresh(); return paid; },
    };
  }

  /** the account's game, created (or migrated from its old browser save) the first time */
  function load(acc, now) {
    const row = q.get.get(acc.id);
    if (row) return C.unpackGame(JSON.parse(row.json));
    const est = econ.stateOf(acc.id);
    const paidLevel = Math.max(1, ...(est.levelsClaimed ?? [1]).filter(Number.isFinite));
    const plotIds = econ.free(acc.id, 'land').map((p) => p.id);
    const legacy = econ.legacySave(acc.id);
    const s = C.normalizeGame(legacy?.data ?? null, now, { paidLevel, username: acc.username, plotIds });
    C.reconcileProducts(s, econ.inventoryOf(acc.id).products, now);
    q.ins.run(acc.id, JSON.stringify(C.packGame(s)), 0, now, now, legacy ? `save@${legacy.savedAt}` : null);
    audit(legacy ? 'game_migrated' : 'game_created', acc.id, null);
    return s;
  }
  const save = (id, s, now) => q.put.run(JSON.stringify(C.packGame(s)), now, id);

  const langOf = (acc, v) => (v === 'en' || v === 'es' ? v : acc.lang === 'en' ? 'en' : 'es');

  /** the answer the browser mirrors: its game, the economy's snapshot and what to show */
  const answer = (id, s, now, extra) => ({ serverNow: now, state: C.packGame(s), snapshot: econ.snapshot(id, now), ...extra });

  function tx(fn) {
    db.exec('BEGIN IMMEDIATE');
    try { const out = fn(); db.exec('COMMIT'); return out; }
    catch (e) { try { db.exec('ROLLBACK'); } catch { /* */ } throw e; }
  }

  function readState(acc, lang) {
    const now = Date.now();
    useLangNow(lang, EN);
    return tx(() => {
      econ.walletOf(acc.id, now); econ.settle(acc.id, now);
      const s0 = load(acc, now);
      const ctx = ctxFor(acc.id, now, `t${now.toString(36)}`);
      const { state, fx } = C.advance(s0, ctx);
      ctx.payLevels(state.playerLevel);
      save(acc.id, state, now);
      return answer(acc.id, state, now, { fx });
    });
  }

  function act(acc, type, params, idem, lang) {
    const id = acc.id;
    // a repeated key (double click, retry after a lost answer): the first result again, with the game as it is now
    if (idem) {
      const r = q.idem.get(id, idem);
      if (r) { const now = Date.now(); return answer(id, load(acc, now), now, { ...JSON.parse(r.response), tickFx: [] }); }
    }
    if (!C.PUBLIC.has(type)) throw new HttpError(400, 'unknown_action');
    const now = Date.now();
    useLangNow(lang, EN);
    try {
      return tx(() => {
        econ.walletOf(id, now); econ.settle(id, now);
        const s0 = load(acc, now);
        const ctx = ctxFor(id, now, idem || crypto.randomBytes(5).toString('hex'));
        const out = C.applyAction(s0, type, params, ctx);
        ctx.payLevels(out.state.playerLevel);
        save(id, out.state, now);
        const res = answer(id, out.state, now, { ok: true, result: out.result, fx: out.fx, tickFx: out.tickFx });
        // only what the replay needs (not the whole game: that made each click cost ~100 KB for a day)
        if (idem) q.putIdem.run(id, idem, JSON.stringify({ ok: true, result: out.result, fx: out.fx }), now);
        return res;
      });
    } catch (e) {
      if (e instanceof C.GameError) throw new HttpError(400, e.code, { text: e.text, kind: e.kind, ...(e.extra ?? {}) });
      throw e;
    } finally {
      audit(`game_${type}`, id, null);
    }
  }

  /* ───────────── routes ───────────── */
  const who = (ctx) => { const a = sessionAccount(ctx); if (!a) throw new HttpError(401, 'unauthenticated'); limit(ctx, `game:${a.id}`, 600, 60_000); return a; };
  route('GET', '/api/game/state', (ctx) => { const a = who(ctx); return readState(a, langOf(a, ctx.url.searchParams.get('lang'))); });
  route('POST', '/api/game/action', async (ctx) => {
    const a = who(ctx); const b = await readJson(ctx.req, 64 * 1024);
    return act(a, String(b.type ?? ''), b.params && typeof b.params === 'object' ? b.params : {}, typeof b.idem === 'string' ? b.idem.replace(/[^\w-]/g, '').slice(0, 40) : '', langOf(a, b.lang));
  });
  // the profile carries a picture (up to ~200 KB): its own, bigger limit
  route('POST', '/api/game/profile', async (ctx) => {
    const a = who(ctx); limit(ctx, `profile:${a.id}`, 30, 60_000);
    const b = await readJson(ctx.req, 300 * 1024);
    return act(a, 'updateProfile', { updates: b.updates ?? {} }, '', langOf(a, b.lang));
  });

  // on start: accounts that still have an old browser save are migrated at once (the operator can check them with `admin.mjs games`)
  try {
    const now = Date.now();
    const pending = db.prepare('SELECT a.id, a.username FROM accounts a JOIN saves s ON s.account_id = a.id LEFT JOIN game_state g ON g.account_id = a.id WHERE g.account_id IS NULL').all();
    for (const acc of pending) tx(() => { econ.walletOf(acc.id, now); load(acc, now); });
    if (pending.length) console.log(`game: ${pending.length} partida(s) migrada(s) al servidor`);
  } catch (e) { console.error('game: migración al arrancar falló', e); }

  return { readState, act, load };
}
