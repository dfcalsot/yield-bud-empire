// The operators' panel (/#panel in the game): read-only numbers about players, progress, economy and the server, for the
// accounts flagged `admin` (node server/admin.mjs panel <usuario>). To anyone else every /api/admin/* route answers 404, as if it
// didn't exist. Almost everything here only reads; the few admin actions (invitations, a $FLORA chest, blocking an account) are
// the same as server/admin.mjs, need a confirmation in the panel and leave their trace in the audit.
//
// Besides reading the tables the game already keeps (accounts, sessions, audit, game_state, econ_state, wallets, ledger, …), it
// measures the server itself: each request is counted into a one-minute bucket (requests, 4xx, 5xx, response times) that is kept
// in `metrics_minute` for 30 days, and the last server errors are kept in memory.
import fs from 'node:fs';
import crypto from 'node:crypto';

const MIN = 60_000, DAY = 86400_000;
const pct = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const dayKey = (ts) => new Date(ts).toISOString().slice(0, 10);

export function installPanel({ db, route, HttpError, sessionAccount, limit, seenAt, dbFile, readJson, telemetry = false, alerts = null, audit = () => {}, publicUrl = '' }) {
  db.exec(`
CREATE TABLE IF NOT EXISTS metrics_minute (ts INTEGER PRIMARY KEY, req INTEGER NOT NULL, e4 INTEGER NOT NULL, e5 INTEGER NOT NULL,
  p50 INTEGER NOT NULL, p95 INTEGER NOT NULL, online INTEGER NOT NULL, rss INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS client_events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, account_id INTEGER, kind TEXT NOT NULL,
  name TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', device TEXT NOT NULL DEFAULT '', build TEXT NOT NULL DEFAULT '', ms INTEGER);
CREATE INDEX IF NOT EXISTS idx_client_events ON client_events(kind, ts);
`);
  const q = {
    flags: db.prepare('SELECT flags FROM accounts WHERE id = ?'),
    putMin: db.prepare('INSERT OR REPLACE INTO metrics_minute (ts, req, e4, e5, p50, p95, online, rss) VALUES (?,?,?,?,?,?,?,?)'),
    sweepMin: db.prepare('DELETE FROM metrics_minute WHERE ts < ?'),
    minutes: db.prepare('SELECT * FROM metrics_minute WHERE ts >= ? ORDER BY ts'),
    putEvent: db.prepare('INSERT INTO client_events (ts, account_id, kind, name, detail, device, build, ms) VALUES (?,?,?,?,?,?,?,?)'),
    sweepEvents: db.prepare('DELETE FROM client_events WHERE ts < ?'),
  };
  const started = Date.now();
  const api = { telemetry };   // `telemetry` can be switched at run time (the tests do)

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
    watch(now);
  }
  /** bursts worth a Telegram message: server errors in the last 5 minutes, players' errors in the last 10 */
  function watch(now) {
    if (!alerts?.on) return;
    try {
      const e5 = one('SELECT COALESCE(SUM(e5),0) AS n FROM metrics_minute WHERE ts >= ?', now - 5 * MIN).n;
      if (e5 >= 5) void alerts.send('e5', `🔥 ${e5} errores del servidor en los últimos 5 minutos. Mira Panel → Servidor.`, 30 * MIN);
      const ce = one("SELECT COUNT(*) AS n, COUNT(DISTINCT account_id) AS p FROM client_events WHERE kind = 'error' AND ts >= ?", now - 10 * MIN);
      if (ce.n >= 10) void alerts.send('client_errors', `🐞 ${ce.n} errores del juego en 10 minutos (${ce.p} jugadores). Mira Panel → Lado del jugador.`, 60 * MIN);
    } catch { /* */ }
  }
  const timer = setInterval(() => { flush(); try { q.sweepMin.run(Date.now() - 30 * DAY); q.sweepEvents.run(Date.now() - 30 * DAY); } catch { /* */ } }, MIN);
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
    // the orders keep USDC in its smallest unit (6 decimals): shown in whole USDC
    const founder = has('founder_orders') ? all('SELECT status, COUNT(*) AS n, ROUND(COALESCE(SUM(amount),0) / 1e6, 2) AS amount FROM founder_orders GROUP BY status') : [];
    const founders = has('founders') ? one('SELECT COUNT(*) AS n FROM founders').n : 0;
    // health, real players only (no dev accounts, no grants or gifts): what the game creates and destroys each day, the supply over
    // time, who holds it, and what things sell for between players
    const REAL = "account_id IN (SELECT id FROM accounts WHERE flags NOT LIKE '%dev,%')";
    const real = all(`SELECT account_id AS id, ts, kind, delta, balance FROM ledger WHERE ${REAL} ORDER BY id`);
    const health = Array.from({ length: 30 }, (_, i) => ({ d: dayKey(now - (29 - i) * DAY), made: 0, burned: 0, supply: 0 }));
    const idx = new Map(health.map((h, i) => [h.d, i]));
    for (const r of real) { if (r.kind === 'grant' || r.kind === 'gift' || r.ts < now - 30 * DAY) continue; const h = health[idx.get(dayKey(r.ts))]; if (!h) continue; if (r.delta > 0) h.made += r.delta; else h.burned -= r.delta; }
    const lastBal = new Map();   // account → last balance seen, walked day by day
    let k = 0; const sortedTs = [...real].sort((a, b) => a.ts - b.ts);
    for (const h of health) {
      const end = new Date(`${h.d}T23:59:59.999Z`).getTime();
      while (k < sortedTs.length && sortedTs[k].ts <= end) { lastBal.set(sortedTs[k].id, sortedTs[k].balance); k++; }
      h.supply = [...lastBal.values()].reduce((a, b) => a + b, 0);
    }
    const week = health.slice(-7).reduce((a, h) => ({ made: a.made + h.made, burned: a.burned + h.burned }), { made: 0, burned: 0 });
    const holders = all(`SELECT w.account_id AS id, a.username AS name, w.flora FROM wallets w JOIN accounts a ON a.id = w.account_id WHERE a.flags NOT LIKE '%dev,%' ORDER BY w.flora DESC LIMIT 10`)
      .map((h) => ({ ...h, share: circ.real ? h.flora / circ.real : 0 }));
    const prices = has('listings') ? all(`SELECT kind, COUNT(*) AS n, ROUND(AVG(price)) AS avg, MIN(price) AS min, MAX(price) AS max FROM listings WHERE status = 'sold' AND closed_at >= ? GROUP BY kind ORDER BY n DESC`, now - 30 * DAY) : [];
    const sales = has('listings') ? all(`SELECT l.closed_at AS ts, l.kind, l.rarity, l.price, s.username AS seller, b.username AS buyer FROM listings l LEFT JOIN accounts s ON s.id = l.seller_id LEFT JOIN accounts b ON b.id = l.buyer_id WHERE l.status = 'sold' ORDER BY l.closed_at DESC LIMIT 15`) : [];
    return { circulating: circ.real, circulatingAll: circ.all_, byKind, days, market, nfts, bridge, founder, founders, health, week, holders, prices, sales };
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


  /* ───────────── telemetry from the players' browsers (off until TELEMETRY_ENABLED=1) ─────────────
   * What the game sends, in small batches: its own errors (message, where, which build), how long the first load took, and which
   * screen is open. With the account id when signed in (for support), never the IP, the full user agent, or anything typed. */
  const KINDS = new Set(['error', 'view', 'perf']);
  const clip = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').slice(0, n);
  route('POST', '/api/telemetry', async (ctx) => {
    if (!api.telemetry) return { ok: true, off: true };
    limit(ctx, `tele:${ctx.ipHash}`, 60, MIN);
    const a = sessionAccount(ctx);
    const b = await readJson(ctx.req, 16 * 1024);
    const list = Array.isArray(b.events) ? b.events.slice(0, 20) : [];
    const device = clip(b.device, 40), build = clip(b.build, 40), now = Date.now();
    let n = 0;
    for (const e of list) {
      if (!e || !KINDS.has(e.kind)) continue;
      const ms = Number.isFinite(e.ms) ? Math.max(0, Math.min(600_000, Math.round(e.ms))) : null;
      q.putEvent.run(now, a?.id ?? null, e.kind, clip(e.name, 160), clip(e.detail, 600), device, build, ms); n++;
    }
    return { ok: true, n };
  });

  function clientSide(now) {
    const since = now - 7 * DAY;
    const errors = all(`SELECT name, detail, COUNT(*) AS n, COUNT(DISTINCT account_id) AS players, MAX(ts) AS last, GROUP_CONCAT(DISTINCT device) AS devices, MAX(build) AS build
      FROM client_events WHERE kind = 'error' AND ts >= ? GROUP BY name ORDER BY last DESC LIMIT 40`, since);
    const errDay = {}; for (const r of all("SELECT ts FROM client_events WHERE kind = 'error' AND ts >= ?", since)) errDay[dayKey(r.ts)] = (errDay[dayKey(r.ts)] ?? 0) + 1;
    const days = Array.from({ length: 7 }, (_, i) => dayKey(now - (6 - i) * DAY)).map((d) => ({ d, n: errDay[d] ?? 0 }));
    const perfRows = all("SELECT ms, device FROM client_events WHERE kind = 'perf' AND name = 'load' AND ts >= ? AND ms IS NOT NULL", since);
    const byDev = {}; for (const r of perfRows) (byDev[r.device.split(' ')[0] || '?'] ??= []).push(r.ms);
    const perf = Object.entries(byDev).map(([device, ms]) => ({ device, n: ms.length, p50: Math.round(pct(ms, 0.5)), p90: Math.round(pct(ms, 0.9)) }));
    const devices = all("SELECT device, COUNT(DISTINCT COALESCE(account_id, -id)) AS n FROM client_events WHERE kind = 'perf' AND ts >= ? GROUP BY device ORDER BY n DESC LIMIT 12", since);
    const views = all("SELECT name, COUNT(*) AS n, COUNT(DISTINCT account_id) AS players FROM client_events WHERE kind = 'view' AND ts >= ? GROUP BY name ORDER BY n DESC", since);
    return { enabled: api.telemetry, errors, days, perf, devices, views };
  }


  /* ───────────── the first steps: how far new players get ───────────── */
  const STEPS = [
    { id: 'signup', label: 'Se registró' },
    { id: 'play', label: 'Hizo algo en el juego', test: (e) => e.startsWith('game_') && e !== 'game_created' && e !== 'game_migrated' },
    { id: 'water', label: 'Regó', test: (e) => /^game_water/.test(e) },
    { id: 'feed', label: 'Abonó', test: (e) => /^game_(feed|applyNutrient|applyFertigation)/.test(e) },
    { id: 'harvest', label: 'Cosechó su primera planta', test: (e) => /^game_harvest/.test(e) },
    { id: 'sell', label: 'Vendió o procesó la cosecha', test: (e) => /^game_(sellProduct|processRawFlower|runLabProcess|executeManualRosinPress)$|^econ_sell$/.test(e) },
    { id: 'd1', label: 'Volvió otro día' },
    { id: 'd7', label: 'Sigue jugando una semana después' },
  ];
  function funnel(now, days) {
    const since = days ? now - days * DAY : 0;
    const accts = all("SELECT id, created_at FROM accounts WHERE created_at >= ? AND flags NOT LIKE '%dev,%' ORDER BY id", since);
    const ids = new Set(accts.map((a) => a.id));
    const ev = new Map(); for (const a of accts) ev.set(a.id, { names: new Set(), days: new Set(), last: a.created_at });
    for (const r of all('SELECT ts, event, account_id AS id FROM audit WHERE account_id IS NOT NULL AND ts >= ?', since)) {
      if (!ids.has(r.id)) continue;
      const x = ev.get(r.id); x.names.add(r.event); x.days.add(dayKey(r.ts)); x.last = Math.max(x.last, r.ts);
    }
    const reached = (a, st) => {
      const x = ev.get(a.id);
      if (st.id === 'signup') return true;
      if (st.id === 'd1') return [...x.days].some((d) => d !== dayKey(a.created_at));
      if (st.id === 'd7') return x.last - a.created_at >= 7 * DAY;
      return [...x.names].some(st.test);
    };
    const steps = STEPS.map((st) => {
      const who = accts.filter((a) => reached(a, st));
      return { id: st.id, label: st.label, n: who.length, eligible: st.id === 'd7' ? accts.filter((a) => now - a.created_at >= 7 * DAY).length : accts.length };
    });
    // where the ones who didn't finish the tutorial stopped
    const tut = {};
    for (const r of all('SELECT g.account_id AS id, g.json FROM game_state g')) {
      if (!ids.has(r.id)) continue;
      const t = json(r.json).tutorial;
      const k = !t || !t.started ? 'sin empezar' : t.dismissed ? 'cerrado o terminado' : `paso ${(t.index ?? 0) + 1}`;
      tut[k] = (tut[k] ?? 0) + 1;
    }
    // players stuck: signed up but never did anything in the game
    const stuck = accts.filter((a) => !reached(a, STEPS[1])).map((a) => ({ id: a.id, name: one('SELECT username FROM accounts WHERE id = ?', a.id)?.username, created: a.created_at }));
    return { days, total: accts.length, steps, tutorial: Object.entries(tut).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n), stuck };
  }


  /* ───────────── one player's card, for support ───────────── */
  function playerCard(id, now) {
    const a = one('SELECT id, username, created_at, flags, source, lang, email_verified, harvest_mail, terms_version, locked_until FROM accounts WHERE id = ?', id);
    if (!a) throw new HttpError(404, 'not_found');
    const row = players(now).find((p) => p.id === id) ?? {};
    const g = one('SELECT json, version, updated_at FROM game_state WHERE account_id = ?', id);
    const s = g ? json(g.json) : {};
    const e = json(one('SELECT json FROM econ_state WHERE account_id = ?', id)?.json ?? '{}');
    const strainName = (x) => (typeof x === 'string' ? x : x?.name ?? x?.id ?? '?');
    const plant = (p) => ({ strain: strainName(p.strain), stage: p.stage, progress: Math.round(p.progressPercent ?? 0), health: Math.round(p.health ?? 0), moisture: Math.round(p.soilMoisture ?? 0), room: p.currentRoom ?? null, pest: p.pest?.kind ?? null, sex: p.sex ?? null });
    const plots = Object.entries(s.plotPlants ?? {}).map(([site, list]) => ({ site, plants: (Array.isArray(list) ? list : []).map(plant) }));
    const nfts = all('SELECT kind, COUNT(*) AS n, SUM(escrow) AS escrow FROM nfts WHERE account_id = ? GROUP BY kind', id);
    const sessions = one('SELECT COUNT(*) AS n, MAX(last_seen) AS last FROM sessions WHERE account_id = ? AND expires_at > ?', id, now);
    const invite = has('invite_uses') ? one('SELECT code, used_at FROM invite_uses WHERE account_id = ?', id) : null;
    return {
      ...row, email_verified: !!a.email_verified, harvestMail: !!a.harvest_mail, terms: a.terms_version, locked: a.locked_until > now,
      flags: a.flags.split(',').filter(Boolean), sessions, invite: invite ? { code: invite.code.slice(0, 8) + '…', at: invite.used_at } : null,
      game: { level: s.playerLevel ?? 0, xp: s.playerXp ?? 0, room: s.currentRoom ?? null, updated: g?.updated_at ?? null, auto: { water: !!s.autoWaterActive, climate: !!s.autoClimateActive } },
      facility: { tier: e.tier ?? 1, unlocked: e.unlocked ?? [], construction: e.construction ?? null, rank: e.empireRank ?? 1 },
      indoor: (s.indoorPlants ?? []).map(plant), plots,
      seeds: Object.values(s.seedInventory ?? {}).reduce((n, x) => n + (Number(x) || 0), 0),
      products: (s.products ?? []).length, quests: e.questsClaimed ?? [], tutorial: s.tutorial ?? null,
      nfts, activity: all('SELECT ts, event, detail FROM audit WHERE account_id = ? ORDER BY ts DESC LIMIT 60', id),
      ledger: all('SELECT ts, kind, delta, balance, ref FROM ledger WHERE account_id = ? ORDER BY id DESC LIMIT 40', id),
      errors: all("SELECT ts, name, detail, device FROM client_events WHERE account_id = ? AND kind = 'error' ORDER BY ts DESC LIMIT 20", id),
    };
  }


  /* ───────────── security: everything suspicious in one place ───────────── */
  const SEC_EVENTS = ['login_fail', 'bot_signal', 'prereg_bot', 'flag_multi_ip', 'ip_cap', 'disposable', 'prereg_disposable', 'invite_rejected', 'signup_existing_email', 'reset_request'];
  function security(now) {
    const since = now - 30 * DAY;
    const counts = Object.fromEntries(SEC_EVENTS.map((e) => [e, { d1: 0, d7: 0, d30: 0 }]));
    const perDay = {};
    for (const r of all(`SELECT ts, event FROM audit WHERE ts >= ? AND event IN (${SEC_EVENTS.map(() => '?').join(',')})`, since, ...SEC_EVENTS)) {
      const c = counts[r.event]; c.d30++; if (now - r.ts < 7 * DAY) c.d7++; if (now - r.ts < DAY) c.d1++;
      const d = perDay[dayKey(r.ts)] ??= { fail: 0, other: 0 }; if (r.event === 'login_fail') d.fail++; else d.other++;
    }
    const days = Array.from({ length: 30 }, (_, i) => dayKey(now - (29 - i) * DAY)).map((d) => ({ d, fail: perDay[d]?.fail ?? 0, other: perDay[d]?.other ?? 0 }));
    // failed logins by account (the ip is only a hash: grouped, never shown whole)
    const fails = all(`SELECT a.account_id AS id, c.username AS name, COUNT(*) AS n, COUNT(DISTINCT a.ip_hash) AS nets, MAX(a.ts) AS last FROM audit a LEFT JOIN accounts c ON c.id = a.account_id
      WHERE a.event = 'login_fail' AND a.ts >= ? GROUP BY a.account_id ORDER BY n DESC LIMIT 15`, now - 7 * DAY);
    const flagged = all("SELECT id, username AS name, flags, locked_until, failed FROM accounts WHERE flags != '' OR locked_until > ? ORDER BY id DESC LIMIT 60", now)
      .map((a) => ({ id: a.id, name: a.name, flags: a.flags.split(',').filter((f) => f && f !== 'dev' && f !== 'admin'), locked: a.locked_until > now, failed: a.failed }))
      .filter((a) => a.flags.length || a.locked);
    // accounts created from the same network (same ip hash): shown as groups, with a short tag instead of the hash
    const shared = all("SELECT ip_hash, GROUP_CONCAT(username, ', ') AS names, GROUP_CONCAT(id) AS ids, COUNT(*) AS n FROM accounts WHERE ip_hash IS NOT NULL GROUP BY ip_hash HAVING n > 1 ORDER BY n DESC LIMIT 20")
      .map((g, i) => ({ net: `red ${String.fromCharCode(65 + (i % 26))}`, names: g.names, ids: String(g.ids).split(',').map(Number), n: g.n }));
    const recent = all(`SELECT a.ts, a.event, a.account_id AS id, c.username AS name, a.detail FROM audit a LEFT JOIN accounts c ON c.id = a.account_id
      WHERE a.event IN (${SEC_EVENTS.map(() => '?').join(',')}) ORDER BY a.ts DESC LIMIT 40`, ...SEC_EVENTS);
    return { counts, days, fails, flagged, shared, recent, locked: flagged.filter((f) => f.locked).length };
  }

  /* ───────────── what an admin can do from the panel (the same as server/admin.mjs, with its trace in the audit) ─────────────
   * Invitations, a $FLORA chest for one player, and blocking or unblocking an account. Admin accounts can't be blocked from here. */
  const ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const newCode = () => { const b = Array.from(crypto.randomBytes(8), (x) => ABC[x % ABC.length]).join(''); return `YBE-${b.slice(0, 4)}-${b.slice(4)}`; };
  const target = (id) => { const t = one('SELECT id, username, flags FROM accounts WHERE id = ?', Math.floor(Number(id)) || 0); if (!t) throw new HttpError(400, 'no_such_player'); return t; };
  const invites = () => (has('invites')
    ? all('SELECT code, note, max_uses, uses, created_at, revoked FROM invites ORDER BY created_at DESC LIMIT 60').map((r) => ({ ...r, link: `${publicUrl}/?invite=${r.code}` }))
    : []);
  route('GET', '/api/admin/invites', (ctx) => { admin(ctx); return { invites: invites() }; });
  route('POST', '/api/admin/action', async (ctx) => {
    const me = admin(ctx);
    limit(ctx, `panel-act:${me.id}`, 30, MIN);
    const b = await readJson(ctx.req, 8 * 1024);
    const by = `por ${me.username} (panel)`;
    switch (String(b.action ?? '')) {
      case 'invite': {
        if (!has('invites')) throw new HttpError(400, 'no_invites');
        const count = Math.max(1, Math.min(50, Math.floor(Number(b.count)) || 1)), uses = Math.max(1, Math.min(100, Math.floor(Number(b.uses)) || 1));
        const note = String(b.note ?? '').slice(0, 80);
        const ins = db.prepare('INSERT OR IGNORE INTO invites (code, note, max_uses, created_at) VALUES (?,?,?,?)');
        const made = []; while (made.length < count) { const c = newCode(); if (ins.run(c, note, uses, Date.now()).changes) made.push(c); }
        audit('admin_panel_invite', me.id, null, `${count}×${uses} usos · ${note} · ${by}`);
        return { ok: true, codes: made.map((c) => ({ code: c, link: `${publicUrl}/?invite=${c}` })) };
      }
      case 'revoke': {
        const code = String(b.code ?? '').toUpperCase().trim();
        if (!db.prepare('UPDATE invites SET revoked = 1 WHERE code = ?').run(code).changes) throw new HttpError(400, 'no_such_code');
        audit('admin_panel_revoke', me.id, null, `${code.slice(0, 20)} · ${by}`);
        return { ok: true };
      }
      case 'gift': {
        const t = target(b.id);
        const amount = Math.floor(Number(b.amount));
        if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) throw new HttpError(400, 'bad_amount');
        const es = String(b.noteEs ?? '').trim().slice(0, 120), en = String(b.noteEn ?? '').trim().slice(0, 120);
        const note = en ? JSON.stringify({ es: es || en, en }) : (es || 'Regalo de la casa');
        const r = db.prepare('INSERT INTO gifts (account_id, amount, note, created_at) VALUES (?,?,?,?)').run(t.id, amount, note, Date.now());
        audit('admin_gift', t.id, null, `${amount} · ${by}`);
        return { ok: true, gift: Number(r.lastInsertRowid), to: t.username, amount };
      }
      case 'ban': {
        const t = target(b.id);
        if (/(^|,)admin,/.test(t.flags)) throw new HttpError(400, 'is_admin');
        db.prepare("UPDATE accounts SET locked_until = ?, flags = CASE WHEN flags LIKE '%banned,%' THEN flags ELSE flags || 'banned,' END WHERE id = ?").run(Date.now() + 100 * 365 * DAY, t.id);
        db.prepare('DELETE FROM sessions WHERE account_id = ?').run(t.id);
        seenAt.delete(t.id); cache.at = 0;
        audit('admin_ban', t.id, null, `${String(b.reason ?? '').slice(0, 100)} · ${by}`);
        return { ok: true };
      }
      case 'unban': {
        const t = target(b.id);
        db.prepare("UPDATE accounts SET locked_until = 0, failed = 0, flags = replace(flags, 'banned,', '') WHERE id = ?").run(t.id);
        cache.at = 0;
        audit('admin_unban', t.id, null, by);
        return { ok: true };
      }
      default: throw new HttpError(400, 'unknown_action');
    }
  });

  route('GET', '/api/admin/me', (ctx) => { const a = admin(ctx); return { ok: true, name: a.username }; });
  route('GET', '/api/admin/overview', (ctx) => { admin(ctx); const now = Date.now(); return { ...overview(now), health: health(now), feed: feed(40) }; });
  route('GET', '/api/admin/players', (ctx) => { admin(ctx); return { players: players(Date.now()) }; });
  route('GET', '/api/admin/economy', (ctx) => { admin(ctx); return economy(Date.now()); });
  route('GET', '/api/admin/client', (ctx) => { admin(ctx); return clientSide(Date.now()); });
  route('GET', '/api/admin/player', (ctx) => { admin(ctx); return playerCard(Math.floor(Number(ctx.url.searchParams.get('id'))) || 0, Date.now()); });
  route('GET', '/api/admin/security', (ctx) => { admin(ctx); return security(Date.now()); });
  route('GET', '/api/admin/funnel', (ctx) => { admin(ctx); const d = Number(ctx.url.searchParams.get('days')); return funnel(Date.now(), [7, 30, 90].includes(d) ? d : 0); });

  return Object.assign(api, { observe, isAdmin });
}
