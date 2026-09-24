// The on-chain bridge for relics (Solana, Metaplex Core). A relic can leave the game for the player's linked Solana wallet — minted
// into the collection, which carries a royalties plugin for the team — and come back to whichever account sends it to the vault.
// While a relic is outside it gives no bonus in the game and can't be traded inside; $FLORA never leaves the game.
//
//   withdraw  checks (linked wallet, not bound / equipped / listed, not a developer account, daily caps), burns the $FLORA fee,
//             marks the relic "out" and queues a job; the worker mints it (or, if it was on-chain before and is back in the vault,
//             transfers it) with an asset address fixed at queue time, so a retry never creates two. After too many failures the
//             relic and the fee go back.
//   deposit   the asset must be of our collection, owned now by the vault, and the transfer signed by a wallet linked to the
//             account: the relic (the server's own record, not the chain's metadata) joins that account.
//
// BRIDGE_ENABLED=1 turns it on; SOLANA_RPC chooses the network (devnet by default). The bridge keypair lives in DATA_DIR
// (bridge-keypair.json, mode 600) and is the collection authority and the vault.
import fs from 'node:fs';
import path from 'node:path';
import { relics as RL } from './gen/sim.mjs';

const DAY = 86400_000;
const FEES = { common: 20, rare: 40, epic: 80, legendary: 150 };
const CAPS = { perAccountDay: 3, globalDay: 50, maxTries: 8 };
const COLLECTION = { name: 'Yield Bud Empire · Reliquias', royaltyBps: 500 };

/** an in-memory chain with the same surface as server/gen/chain.mjs, for the tests */
export function fakeChain() {
  const assets = new Map(); const sigs = new Map(); let n = 0;
  const vault = 'VauLt1111111111111111111111111111111111111';
  const id = () => `Fake${String(++n).padStart(38, '1')}`;
  return {
    address: vault, fail: 0,
    async balance() { return 5; },
    async ensureCollection(p) { return p.known ?? 'ColL1111111111111111111111111111111111111111'; },
    async mint(p) { if (this.fail > 0) { this.fail--; throw new Error('rpc down'); } const addr = p.asset; if (!assets.has(addr)) assets.set(addr, { owner: p.owner, collection: p.collection, name: p.name, uri: p.uri }); sigs.set(addr, [vault]); return id(); },
    async transfer(p) { const a = assets.get(p.asset); a.owner = p.newOwner; sigs.set(p.asset, [vault]); return id(); },
    async fetchAsset(addr) { const a = assets.get(addr); return a ? { address: addr, ...a } : null; },
    async assetsOf(owner, collection) { return [...assets].filter(([, a]) => a.owner === owner && a.collection === collection).map(([address, a]) => ({ address, ...a })); },
    async depositTx(p) { return Buffer.from(JSON.stringify(p)).toString('base64'); },
    async recentSigners(asset) { return sigs.get(asset) ?? []; },
    /** test helper: someone sends an asset (signs as `from`) */
    move(asset, to, from) { const a = assets.get(asset); a.owner = to; sigs.set(asset, [from]); },
    forge(addr, owner) { assets.set(addr, { owner, collection: 'OtherCollection', name: 'x', uri: '' }); },
    explorer: (kind, x) => `https://explorer.solana.com/${kind}/${x}?cluster=devnet`,
  };
}

export async function installBridge({ db, route, HttpError, sessionAccount, audit, limit, readJson, econ, cfg, env }) {
  const enabled = env.BRIDGE_ENABLED === '1';
  const rpc = env.SOLANA_RPC || 'https://api.devnet.solana.com';
  const network = /devnet/.test(rpc) ? 'devnet' : /testnet/.test(rpc) ? 'testnet' : 'mainnet';
  db.exec(`
CREATE TABLE IF NOT EXISTS bridge_jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL, nft_id TEXT NOT NULL, dir TEXT NOT NULL, status TEXT NOT NULL,
  wallet TEXT, asset TEXT, asset_secret TEXT, fee INTEGER NOT NULL DEFAULT 0, tries INTEGER NOT NULL DEFAULT 0, sig TEXT, error TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_bridge_jobs ON bridge_jobs(status, id);
CREATE TABLE IF NOT EXISTS bridge_meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
`);
  for (const col of ['chain_state TEXT', 'asset TEXT']) { try { db.exec(`ALTER TABLE nfts ADD COLUMN ${col}`); } catch { /* exists */ } }
  const q = {
    nft: db.prepare('SELECT * FROM nfts WHERE id = ?'),
    byAsset: db.prepare('SELECT * FROM nfts WHERE asset = ?'),
    bySerial: db.prepare("SELECT * FROM nfts WHERE kind = 'relic' AND json_extract(data, '$.serial') = ?"),
    setChain: db.prepare('UPDATE nfts SET chain_state = ?, asset = COALESCE(?, asset) WHERE id = ?'),
    moveTo: db.prepare('UPDATE nfts SET account_id = ?, chain_state = NULL, escrow = 0 WHERE id = ?'),
    outOf: db.prepare("SELECT * FROM nfts WHERE account_id = ? AND kind = 'relic' AND chain_state IS NOT NULL"),
    wallet: db.prepare("SELECT address FROM wallet_links WHERE account_id = ? AND chain = 'solana'"),
    flags: db.prepare('SELECT flags FROM accounts WHERE id = ?'),
    job: db.prepare('INSERT INTO bridge_jobs (account_id, nft_id, dir, status, wallet, asset, asset_secret, fee, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)'),
    pending: db.prepare("SELECT * FROM bridge_jobs WHERE status = 'pending' ORDER BY id LIMIT 3"),
    jobDone: db.prepare("UPDATE bridge_jobs SET status = 'done', sig = ?, asset_secret = NULL, error = NULL, updated_at = ? WHERE id = ?"),
    jobFail: db.prepare('UPDATE bridge_jobs SET tries = tries + 1, error = ?, updated_at = ? WHERE id = ?'),
    jobGiveUp: db.prepare("UPDATE bridge_jobs SET status = 'failed', asset_secret = NULL, updated_at = ? WHERE id = ?"),
    outToday: db.prepare("SELECT COUNT(*) n FROM bridge_jobs WHERE account_id = ? AND dir = 'out' AND status != 'failed' AND created_at > ?"),
    outTodayAll: db.prepare("SELECT COUNT(*) n FROM bridge_jobs WHERE dir = 'out' AND status != 'failed' AND created_at > ?"),
    jobsOf: db.prepare('SELECT id, nft_id, dir, status, asset, sig, error, created_at FROM bridge_jobs WHERE account_id = ? ORDER BY id DESC LIMIT 20'),
    meta: db.prepare('SELECT v FROM bridge_meta WHERE k = ?'),
    putMeta: db.prepare('INSERT INTO bridge_meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v'),
  };

  // the chain: the real one (bundled Metaplex Core) or, in the tests, an in-memory one
  let chain = null, newKeypair = null;
  if (env.BRIDGE_FAKE === '1') { chain = fakeChain(); let i = 0; newKeypair = () => ({ publicKey: `k${++i}`, secretKey: Array.from({ length: 64 }, (_, j) => (i * 7 + j) % 256) }); }
  else if (enabled) {
    const mod = await import('./gen/chain.mjs');
    newKeypair = mod.newKeypair;
    const file = path.join(cfg.dataDir, 'bridge-keypair.json');
    if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(mod.newKeypair().secretKey), { mode: 0o600 });
    chain = mod.createChain({ rpc, secretKey: JSON.parse(fs.readFileSync(file, 'utf8')) });
  }
  const on = () => enabled || env.BRIDGE_FAKE === '1';
  const base = cfg.publicUrl.replace(/\/$/, '');
  const metaUri = (serial) => `${base}/api/nft/relic?s=${serial}`;
  const collectionUri = `${base}/api/nft/collection`;

  let collection = q.meta.get('collection')?.v ?? null;
  async function ensureCollection() {
    if (!on() || collection) return collection;
    collection = await chain.ensureCollection({ known: collection, name: COLLECTION.name, uri: collectionUri, royaltyBps: COLLECTION.royaltyBps, royaltyWallet: env.BRIDGE_ROYALTY_WALLET || chain.address });
    q.putMeta.run('collection', collection);
    console.log(`bridge: colección ${collection} (${network})`);
    return collection;
  }

  const isDev = (id) => /(^|,)dev,/.test(q.flags.get(id)?.flags ?? '');
  const linked = (id) => q.wallet.get(id)?.address ?? null;
  const need = (c, code, extra) => { if (!c) throw new HttpError(400, code, extra); };
  const tx = (fn) => { db.exec('BEGIN IMMEDIATE'); try { const o = fn(); db.exec('COMMIT'); return o; } catch (e) { try { db.exec('ROLLBACK'); } catch { /* */ } throw e; } };
  const relicName = (r) => `${RL.RELIC_TYPE_BY_ID[r.typeId]?.name ?? 'Reliquia'} #${r.serial}`;

  /* ───────────── the worker: mints / transfers the relics on their way out ───────────── */
  let busy = false;
  async function work() {
    if (busy || !on()) return;
    busy = true;
    try {
      const col = await ensureCollection();
      for (const j of q.pending.all()) {
        const row = q.nft.get(j.nft_id);
        const relic = row && JSON.parse(row.data);
        try {
          const now = Date.now();
          const current = await chain.fetchAsset(j.asset);
          let sig = null;
          if (!current) sig = await chain.mint({ asset: j.asset, assetSecret: JSON.parse(j.asset_secret), owner: j.wallet, name: relicName(relic), uri: metaUri(relic.serial), collection: col });
          else if (current.owner === chain.address) sig = await chain.transfer({ asset: j.asset, collection: col, newOwner: j.wallet });
          // (already at the player's wallet: a previous attempt went through)
          tx(() => { q.setChain.run('onchain', j.asset, j.nft_id); q.jobDone.run(sig, now, j.id); });
          audit('bridge_out', j.account_id, null);
        } catch (e) {
          const now = Date.now();
          q.jobFail.run(String(e?.message ?? e).slice(0, 300), now, j.id);
          if (j.tries + 1 >= CAPS.maxTries) {
            // give up: the relic and the fee go back to the player
            tx(() => { q.setChain.run(null, null, j.nft_id); q.jobGiveUp.run(now, j.id); if (j.fee) econ.credit(j.account_id, j.fee, 'bridge_refund', `reliquia ${j.nft_id}`, now); });
            audit('bridge_out_failed', j.account_id, null);
          }
        }
      }
    } catch (e) { console.error('bridge:', e?.message ?? e); }
    finally { busy = false; }
  }
  if (on()) { setInterval(() => { void work(); }, env.BRIDGE_FAKE === '1' ? 200 : 8000).unref(); void work(); }

  /* ───────────── routes ───────────── */
  const who = (ctx) => { const a = sessionAccount(ctx); if (!a) throw new HttpError(401, 'unauthenticated'); limit(ctx, `bridge:${a.id}`, 60, 60_000); return a; };
  const off = () => { if (!on()) throw new HttpError(400, 'bridge_off'); };

  route('GET', '/api/bridge/status', async (ctx) => {
    const a = who(ctx);
    const outside = q.outOf.all(a.id).map((r) => ({ relic: JSON.parse(r.data), state: r.chain_state, asset: r.asset, explorer: r.asset && chain ? chain.explorer('address', r.asset) : null }));
    const since = Date.now() - DAY;
    return {
      enabled: on(), network, vault: chain?.address ?? null, collection, wallet: linked(a.id), dev: isDev(a.id), fees: FEES,
      left: Math.max(0, Math.min(CAPS.perAccountDay - q.outToday.get(a.id, since).n, CAPS.globalDay - q.outTodayAll.get(since).n)),
      outside, jobs: q.jobsOf.all(a.id).map((j) => ({ ...j, explorer: j.sig && chain ? chain.explorer('tx', j.sig) : null })),
    };
  });

  route('POST', '/api/bridge/withdraw', async (ctx) => {
    const a = who(ctx); off();
    const b = await readJson(ctx.req, 4096);
    const wallet = linked(a.id); need(wallet, 'bridge_no_wallet');
    need(!isDev(a.id), 'bridge_dev');
    await ensureCollection();
    const now = Date.now();
    const out = tx(() => {
      const row = q.nft.get(String(b.relicId ?? '').slice(0, 80));
      need(row && row.account_id === a.id && row.kind === 'relic' && !row.escrow && !row.chain_state, 'not_yours');
      const relic = JSON.parse(row.data);
      need(!relic.bound, 'relic_bound');
      const st = econ.stateOf(a.id);
      need(!(st.relicEquip ?? []).includes(row.id), 'bridge_equipped');
      const since = now - DAY;
      need(q.outToday.get(a.id, since).n < CAPS.perAccountDay && q.outTodayAll.get(since).n < CAPS.globalDay, 'bridge_daily_cap');
      const fee = FEES[relic.rarity] ?? FEES.common;
      econ.debit(a.id, fee, 'bridge', `sacar reliquia #${relic.serial} a Solana`, now);
      // the asset address: the one it already had (back in the vault) or a new keypair kept until the mint is confirmed
      let asset = row.asset, secret = null;
      if (!asset) { const k = newKeypair(); asset = k.publicKey; secret = JSON.stringify(k.secretKey); }
      q.setChain.run('out', asset, row.id);
      q.job.run(a.id, row.id, 'out', 'pending', wallet, asset, secret, fee, now, now);
      return { relic, fee, asset };
    });
    audit('bridge_withdraw', a.id, ctx.ipHash);
    void work();
    return { ok: true, ...out };
  });

  /** relics of our collection the linked wallet holds right now (to bring back) */
  route('GET', '/api/bridge/mine', async (ctx) => {
    const a = who(ctx); off();
    const wallet = linked(a.id); if (!wallet || !collection) return { wallet, assets: [] };
    const list = await chain.assetsOf(wallet, collection);
    return { wallet, assets: list.map((x) => { const r = q.byAsset.get(x.address); return { asset: x.address, name: x.name, relic: r ? JSON.parse(r.data) : null, explorer: chain.explorer('address', x.address) }; }) };
  });

  /** the transfer to the vault, for the player's wallet to sign */
  route('POST', '/api/bridge/deposit-tx', async (ctx) => {
    const a = who(ctx); off();
    const b = await readJson(ctx.req, 4096);
    const wallet = linked(a.id); need(wallet, 'bridge_no_wallet');
    const asset = String(b.asset ?? '').slice(0, 64);
    const cur = await chain.fetchAsset(asset);
    need(cur && cur.collection === collection, 'bridge_not_ours');
    need(cur.owner === wallet, 'bridge_not_owner');
    return { tx: await chain.depositTx({ asset, collection, owner: wallet }), vault: chain.address };
  });

  /** after the asset reached the vault: it joins the account whose linked wallet sent it */
  route('POST', '/api/bridge/deposit', async (ctx) => {
    const a = who(ctx); off();
    const b = await readJson(ctx.req, 4096);
    const wallet = linked(a.id); need(wallet, 'bridge_no_wallet');
    const asset = String(b.asset ?? '').slice(0, 64);
    const cur = await chain.fetchAsset(asset);
    need(cur && cur.collection === collection, 'bridge_not_ours');
    need(cur.owner === chain.address, 'bridge_not_in_vault');
    const signers = await chain.recentSigners(asset, 1);
    need(signers.includes(wallet), 'bridge_not_sender');
    const out = tx(() => {
      const row = q.byAsset.get(asset);
      need(row && row.kind === 'relic' && row.chain_state === 'onchain', 'bridge_already_in');
      q.moveTo.run(a.id, row.id);
      const now = Date.now();
      q.job.run(a.id, row.id, 'in', 'done', wallet, asset, null, 0, now, now);
      return { relic: JSON.parse(row.data) };
    });
    audit('bridge_deposit', a.id, ctx.ipHash);
    return { ok: true, ...out };
  });

  /* ───────────── public metadata (what wallets and marketplaces show) ───────────── */
  const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
  const RARITY_COLOR = { common: '#9ca3af', rare: '#38bdf8', epic: '#c084fc', legendary: '#fbbf24' };
  const RARITY_ES = { common: 'Común', rare: 'Rara', epic: 'Épica', legendary: 'Legendaria' };
  const bonusText = (r) => (r.stat === 'seedBonus' ? `+${RL.relicValue(r.stat, r.rarity)} semilla por cruce` : `+${Math.round(RL.relicValue(r.stat, r.rarity) * 1000) / 10} % ${r.stat}`);
  function relicSvg(r) {
    const t = RL.RELIC_TYPE_BY_ID[r.typeId] ?? { icon: '✦', color: '#fbbf24', name: 'Reliquia' };
    const rc = RARITY_COLOR[r.rarity] ?? '#9ca3af';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
<defs><radialGradient id="g" cx="50%" cy="42%" r="62%"><stop offset="0%" stop-color="${t.color}" stop-opacity="0.85"/><stop offset="100%" stop-color="#0a0716"/></radialGradient></defs>
<rect width="600" height="600" rx="36" fill="#0a0716"/><rect x="14" y="14" width="572" height="572" rx="28" fill="url(#g)" stroke="${rc}" stroke-width="8"/>
<polygon points="300,96 470,194 470,390 300,488 130,390 130,194" fill="#0a0716" fill-opacity="0.35" stroke="${rc}" stroke-width="10"/>
<text x="300" y="340" text-anchor="middle" font-size="150">${t.icon}</text>
<text x="300" y="548" text-anchor="middle" font-family="sans-serif" font-size="34" font-weight="700" fill="#fff">${esc(t.name)}</text>
<text x="40" y="70" font-family="monospace" font-size="28" fill="${rc}">${RARITY_ES[r.rarity] ?? r.rarity}</text>
<text x="560" y="70" text-anchor="end" font-family="monospace" font-size="28" fill="#e5e7eb">#${r.serial}</text></svg>`;
  }
  const bySerial = (ctx) => { const s = Math.floor(Number(ctx.url.searchParams.get('s'))); const row = Number.isFinite(s) ? q.bySerial.get(s) : null; if (!row) throw new HttpError(404, 'not_found'); return JSON.parse(row.data); };
  route('GET', '/api/nft/relic', (ctx) => {
    const r = bySerial(ctx); const t = RL.RELIC_TYPE_BY_ID[r.typeId];
    ctx.cors = '*';
    return {
      name: `${t?.name ?? 'Reliquia'} #${r.serial}`, symbol: 'YBER',
      description: `Reliquia de Yield Bud Empire, ganada jugando. Dentro del juego: ${bonusText(r)} (con tope). Tráela de vuelta al juego para usarla.`,
      image: `${base}/api/nft/relic-image?s=${r.serial}`, external_url: base,
      attributes: [{ trait_type: 'Tipo', value: t?.name ?? r.typeId }, { trait_type: 'Rareza', value: RARITY_ES[r.rarity] ?? r.rarity }, { trait_type: 'Bono', value: bonusText(r) }, { trait_type: 'Serie', value: r.serial }, { trait_type: 'Temporada', value: r.season }],
      properties: { category: 'image', files: [{ uri: `${base}/api/nft/relic-image?s=${r.serial}`, type: 'image/svg+xml' }] },
    };
  });
  route('GET', '/api/nft/relic-image', (ctx) => { const r = bySerial(ctx); ctx.cors = '*'; return { __raw: { type: 'image/svg+xml', body: relicSvg(r) } }; });
  route('GET', '/api/nft/collection', (ctx) => { ctx.cors = '*'; return { name: COLLECTION.name, symbol: 'YBER', description: 'Reliquias de Yield Bud Empire: NFT únicos que se ganan jugando.', external_url: base }; });

  return { status: () => ({ enabled: on(), network, vault: chain?.address ?? null, collection }), chain, work, ensureCollection };
}
