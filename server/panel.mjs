// The operators' panel (/#panel in the game): read-only numbers about players, progress, economy and the server, for the
// accounts flagged `admin` (node server/admin.mjs panel <usuario>). To anyone else every /api/admin/* route answers 404, as if it
// didn't exist. Nothing here changes the game.
//
// Besides reading the tables the game already keeps (accounts, sessions, audit, game_state, econ_state, wallets, ledger, …), it
// measures the server itself: each request is counted into a one-minute bucket (requests, 4xx, 5xx, response times) that is kept
// in `metrics_minute` for 30 days, and the last server errors are kept in memory.
import fs from 'node:fs';

const MIN = 60_000, DAY = 86400_000;
const pct = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const dayKey = (ts) => new Date(ts).toISOString().slice(0, 10);

export function installPanel({ db, route, HttpError, sessionAccount, limit, seenAt, dbFile }) {
  db.exec(`
CREATE TABLE IF NOT EXISTS metrics_minute (ts INTEGER PRIMARY KEY, req INTEGER NOT NULL, e4 INTEGER NOT NULL, e5 INTEGER NOT NULL,
  p50 INTEGER NOT NULL, p95 INTEGER NOT NULL, online INTEGER NOT NULL, rss INTEGER NOT NULL);
`);
  const q = {
    flags: db.prepare('SELECT flags FROM accounts WHERE id = ?'),
    putMin: db.prepare('INSERT OR REPLACE INTO metrics_minute (ts, req, e4, e5, p50, p95, online, rss) VALUES (?,?,?,?,?,?,?,?)'),
    sweepMin: db.prepare('DELETE FROM metrics_minute WHERE ts < ?'),
    minutes: db.prepare('SELECT * FROM metrics_minute WHERE ts >= ? ORDER BY ts'),
  };
  const started = Date.now();

  /* ───────────── the server's own numbers ───────────── */
  let bucket = { ts: Math.floor(Date.now() / MIN) * MIN, req: 0, e4: 0, e5: 0, ms: [] };
  const errors = [];   // the last server errors (5xx), newest first
  const routeHits = new Map();   // path → { n, e, ms } since start
  const onlineNow = (now = Date.now()) => { let n = 0; for (const t of seenAt.values()) if (now - t < 5 * MIN) n++; return n; };
  function flush(now = Date.now()) {
    const b = bucket;
    bucket = { ts: Math.floor(now / MIN) * MIN, req: 0, e4: 0, e5: 0, ms: [] };
    if (!b.req && !onlineNow(now)) return;
    try { q.putMin.run(b.ts, b.req, b.e4, b.e5, Math.round(pct(b.ms, 0.5)), Math.round(pct(b.ms, 0.95)), onlineNow(now), Math.round(process.memoryUsage().rss / 1048576)); } catch { /* */ }
  }
  const timer = setInterval(() => { flush(); try { q.sweepMin.run(Date.now() - 30 * DAY); } catch { /* */ } }, MIN);
  timer.unref?.();
  /** called by the server for every request, once it is answered */
  function observe(pathname, status, ms) {
    const now = Date.now();
    if (now - bucket.ts >= MIN) flush(now);
    bucket.req++; if (status >= 500) bucket.e5++; else if (status >= 400) bucket.e4++;
    if (bucket.ms.length < 5000) bucket.ms.push(ms);
    const key = pathname.startsWith('/api/') ? pathname : '(otro)';
    const r = routeHits.get(key) ?? { n: 0, e: 0, ms: 0 };
    r.n++; if (status >= 500) r.e++; r.ms += ms; routeHits.set(key, r);
    if (status >= 500) { errors.unshift({ ts: now, path: pathname, status }); errors.length = Math.min(errors.length, 50); }
  }

  /* ───────────── access ───────────── */
  const isAdmin = (id) => /(^|,)admin,/.test(q.flags.get(id)?.flags ?? '');
  const admin = (ctx) => {
    const a = sessionAccount(ctx);
    if (!a || !isAdmin(a.id)) throw new HttpError(404, 'not_found');
    limit(ctx, `panel:${a.id}`, 120, MIN);
    return a;
  };

  /* ───────────── reading the game ───────────── */
  const json = (s) => { try { return JSON.parse(s); } catch { return {}; } };
  const all = (sql, ...a) => db.prepare(sql).all(...a);
  const one = (sql, ...a) => db.prepare(sql).get(...a);
  const has = (table) => !!one("SELECT 1 AS x FROM sqlite_master WHERE type = 'table' AND name = ?", table);

  /** every player with the numbers the tables need (a few dozen accounts: read whole, cached for 10 s) */
  let cache = { at: 0, v: null };
  function players(now) {
    if (cache.v && now - cache.at < 10_000) return cache.v;
    const lastAct = new Map(all("SELECT account_id AS id, MAX(ts) AS t FROM audit WHERE account_id IS NOT NULL AND (event LIKE 'game_%' OR event LIKE 'login%') GROUP BY account_id").map((r) => [r.id, r.t]));
    const lastSess = new Map(all('SELECT account_id AS id, MAX(last_seen) AS t FROM sessions GROUP BY account_id').map((r) => [r.id, r.t]));
    const games = new Map(all('SELECT account_id AS id, json, version FROM game_state').map((r) => [r.id, r]));
    const econ = new Map(all('SELECT account_id AS id, json FROM econ_state').map((r) => [r.id, json(r.json)]));
    const flora = new Map(all('SELECT account_id AS id, flora FROM wallets').map((r) => [r.id, r.flora]));
    const founders = has('founders') ? new Map(all('SELECT account_id AS id, number FROM founders').map((r) => [r.id, r.number])) : new Map();
    const harvests = new Map(all("SELECT account_id AS id, COUNT(*) AS n FROM audit WHERE event LIKE 'game_harvest%' GROUP BY account_id").map((r) => [r.id, r.n]));
    const rows = all('SELECT id, username, created_at, flags, source, lang FROM accounts ORDER BY id').map((a) => {
      const g = games.get(a.id); const s = g ? json(g.json) : null; const e = econ.get(a.id) ?? {};
      const plots = s?.plotPlants ? Object.values(s.plotPlants).reduce((n, x) => n + (Array.isArray(x) ? x.length : 0), 0) : 0;
      const indoor = s?.indoorPlants ?? [];
      const last = Math.max(lastAct.get(a.id) ?? 0, lastSess.get(a.id) ?? 0, seenAt.get(a.id) ?? 0, a.created_at);
      return {
        id: a.id, name: a.username, created: a.created_at, last, online: now - (seenAt.get(a.id) ?? 0) < 5 * MIN,
        dev: /(^|,)dev,/.test(a.flags), admin: /(^|,)admin,/.test(a.flags), banned: /(^|,)banned,/.test(a.flags), source: a.source, lang: a.lang,
        level: s?.playerLevel ?? 0, xp: s?.playerXp ?? 0, tier: e.tier ?? 1, facilities: (e.unlocked ?? []).length, rank: e.empireRank ?? 1,
        building: e.construction ? e.construction.facilityId : null,
        plants: indoor.length, ready: indoor.filter((p) => p.stage === 'ready_harvest').length, plots, flora: flora.get(a.id) ?? 0,
        actions: g?.version ?? 0, harvests: harvests.get(a.id) ?? 0, founder: founders.get(a.id) ?? null,
        tutorial: s?.tutorial ? (s.tutorial.dismissed ? 'cerrado' : `paso ${s.tutorial.index ?? 0}`) : '—',
        quests: (e.questsClaimed ?? []).length, weekPoints: s?.activity?.points ?? 0,
      };
    });
    cache = { at: now, v: rows };
    return rows;
  }

  function overview(now) {
    const ps = players(now);
    const real = ps.filter((p) => !p.dev);
    const activeIn = (ms, list = ps) => list.filter((p) => now - p.last < ms).length;
    // sign-ups and active players per day, last 30 days (active = did something in the game or logged in that day)
    const since = now - 30 * DAY;
    const signups = {}; for (const p of ps) if (p.created >= since) signups[dayKey(p.created)] = (signups[dayKey(p.created)] ?? 0) + 1;
    const dau = {}; for (const r of all("SELECT ts, account_id AS id FROM audit WHERE ts >= ? AND account_id IS NOT NULL AND (event LIKE 'game_%' OR event LIKE 'login%')", since)) (dau[dayKey(r.ts)] ??= new Set()).add(r.id);
    const harvestDay = {}; for (const r of all("SELECT ts FROM audit WHERE ts >= ? AND event LIKE 'game_harvest%'", since)) harvestDay[dayKey(r.ts)] = (harvestDay[dayKey(r.ts)] ?? 0) + 1;
    const actionDay = {}; for (const r of all("SELECT ts FROM audit WHERE ts >= ? AND event LIKE 'game_%'", since)) actionDay[dayKey(r.ts)] = (actionDay[dayKey(r.ts)] ?? 0) + 1;
    const days = Array.from({ length: 30 }, (_, i) => dayKey(now - (29 - i) * DAY));
    const series = days.map((d) => ({ d, signups: signups[d] ?? 0, active: dau[d]?.size ?? 0, harvests: harvestDay[d] ?? 0, actions: actionDay[d] ?? 0 }));
    // retention: of the players who signed up at least N days ago, how many came back on/after day N
    const ret = (n) => { const base = real.filter((p) => now - p.created >= n * DAY); return { base: base.length, back: base.filter((p) => p.last - p.created >= n * DAY).length }; };
    const dist = (key) => { const m = {}; for (const p of real) m[p[key]] = (m[p[key]] ?? 0) + 1; return Object.entries(m).map(([k, n]) => ({ k, n })).sort((a, b) => Number(a.k) - Number(b.k)); };
    const inv = has('invites') ? one('SELECT COUNT(*) AS codes, COALESCE(SUM(uses),0) AS used, COALESCE(SUM(max_uses),0) AS cap FROM invites WHERE revoked = 0') : null;
    return {
      now, players: {
        total: ps.length, real: real.length, dev: ps.length - real.length, online: onlineNow(now),
        active24h: activeIn(DAY), active7d: activeIn(7 * DAY), active30d: activeIn(30 * DAY),
        inactive3d: real.filter((p) => now - p.last >= 3 * DAY && now - p.last < 7 * DAY).length,
        inactive7d: real.filter((p) => now - p.last >= 7 * DAY && now - p.last < 30 * DAY).length,
        inactive30d: real.filter((p) => now - p.last >= 30 * DAY).length,
        new24h: ps.filter((p) => now - p.created < DAY).length, new7d: ps.filter((p) => now - p.created < 7 * DAY).length,
        retention: { d1: ret(1), d7: ret(7) }, invites: inv,
      },
      progress: {
        byTier: dist('tier'), byLevel: dist('level'), byRank: dist('rank'),
        plants: real.reduce((n, p) => n + p.plants, 0), ready: real.reduce((n, p) => n + p.ready, 0), plots: real.reduce((n, p) => n + p.plots, 0),
        building: real.filter((p) => p.building).length, tutorialOpen: real.filter((p) => p.tutorial !== 'cerrado').length,
        harvests: real.reduce((n, p) => n + p.harvests, 0),
      },
      series,
    };
  }

  function economy(now) {
    const since = now - 14 * DAY;
    const circ = one('SELECT COALESCE(SUM(w.flora),0) AS all_, COALESCE(SUM(CASE WHEN a.flags LIKE \'%dev,%\' THEN 0 ELSE w.flora END),0) AS real FROM wallets w JOIN accounts a ON a.id = w.account_id');
    const byKind = all('SELECT kind, COUNT(*) AS n, SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END) AS inflow, SUM(CASE WHEN delta < 0 THEN -delta ELSE 0 END) AS outflow FROM ledger WHERE ts >= ? GROUP BY kind ORDER BY (inflow + outflow) DESC', since);
    const perDay = {}; for (const r of all('SELECT ts, delta, kind FROM ledger WHERE ts >= ?', since)) { if (r.kind === 'grant' || r.kind === 'gift') continue; const d = perDay[dayKey(r.ts)] ??= { in: 0, out: 0 }; if (r.delta > 0) d.in += r.delta; else d.out -= r.delta; }
    const days = Array.from({ length: 14 }, (_, i) => dayKey(now - (13 - i) * DAY)).map((d) => ({ d, in: perDay[d]?.in ?? 0, out: perDay[d]?.out ?? 0 }));
    const market = has('listings') ? all('SELECT status, COUNT(*) AS n, COALESCE(SUM(price),0) AS flora FROM listings GROUP BY status') : [];
    const nfts = all('SELECT kind, COUNT(*) AS n FROM nfts GROUP BY kind ORDER BY n DESC');
    const bridge = has('bridge_jobs') ? all('SELECT dir, status, COUNT(*) AS n FROM bridge_jobs GROUP BY dir, status') : [];
    const founder = has('founder_orders') ? all('SELECT status, COUNT(*) AS n, COALESCE(SUM(amount),0) AS amount FROM founder_orders GROUP BY status') : [];
    const founders = has('founders') ? one('SELECT COUNT(*) AS n FROM founders').n : 0;
    return { circulating: circ.real, circulatingAll: circ.all_, byKind, days, market, nfts, bridge, founder, founders };
  }

  function health(now) {
    const mem = process.memoryUsage();
    let dbBytes = 0; for (const f of [dbFile, `${dbFile}-wal`]) { try { dbBytes += fs.statSync(f).size; } catch { /* */ } }
    const hour = q.minutes.all(now - 60 * MIN);
    const day = q.minutes.all(now - DAY);
    // the last 24 h in 30-minute blocks
    const blocks = Array.from({ length: 48 }, (_, i) => ({ ts: Math.floor((now - DAY) / (30 * MIN)) * 30 * MIN + i * 30 * MIN, req: 0, e5: 0, online: 0 }));
    for (const m of day) { const b = blocks[Math.floor((m.ts - blocks[0].ts) / (30 * MIN))]; if (b) { b.req += m.req; b.e5 += m.e5; b.online = Math.max(b.online, m.online); } }
    const sum = (arr, k) => arr.reduce((n, m) => n + m[k], 0);
    const routes = [...routeHits.entries()].map(([path, r]) => ({ path, n: r.n, e: r.e, avg: Math.round(r.ms / r.n) })).sort((a, b) => b.n - a.n).slice(0, 15);
    return {
      uptime: now - started, started, node: process.version, rss: mem.rss, heap: mem.heapUsed, dbBytes,
      lastHour: { req: sum(hour, 'req'), e4: sum(hour, 'e4'), e5: sum(hour, 'e5'), p95: hour.length ? Math.max(...hour.map((m) => m.p95)) : 0 },
      last24h: { req: sum(day, 'req'), e4: sum(day, 'e4'), e5: sum(day, 'e5') },
      minutes: hour.map((m) => ({ ts: m.ts, req: m.req, e5: m.e5, p95: m.p95, online: m.online })), blocks,
      routes, errors: errors.slice(0, 20),
      sessions: one('SELECT COUNT(*) AS n FROM sessions WHERE expires_at > ?', now).n,
      mailFailures: one("SELECT COUNT(*) AS n FROM audit WHERE ts > ? AND event LIKE '%mail_fail%'", now - DAY).n,
    };
  }

  // what happened lately, in words (the noisiest events, like every single watering, are grouped by the panel)
  const FEED = "event LIKE 'signup%' OR event LIKE 'login%' OR event LIKE 'game_harvest%' OR event LIKE 'game_plant%' OR event LIKE 'founder%' OR event LIKE 'bridge%' OR event IN ('game_buyAsset','game_buySeed','game_buyPlot','game_upgradeFacility','econ_start_build','econ_sell','econ_avatar_chest','econ_staff_chest','game_claimQuestReward','game_sellProduct','game_hireCandidate','game_hybridizeParents','game_breedStrains','email_verified','prereg','flag_multi_ip','bot_signal','wallet_link','reset_request')";
  function feed(limitN) {
    return all(`SELECT a.ts, a.event, a.account_id AS id, c.username AS name FROM audit a LEFT JOIN accounts c ON c.id = a.account_id WHERE ${FEED} ORDER BY a.ts DESC LIMIT ?`, limitN);
  }

  route('GET', '/api/admin/me', (ctx) => { const a = admin(ctx); return { ok: true, name: a.username }; });
  route('GET', '/api/admin/overview', (ctx) => { admin(ctx); const now = Date.now(); return { ...overview(now), health: health(now), feed: feed(40) }; });
  route('GET', '/api/admin/players', (ctx) => { admin(ctx); return { players: players(Date.now()) }; });
  route('GET', '/api/admin/economy', (ctx) => { admin(ctx); return economy(Date.now()); });

  return { observe, isAdmin };
}
