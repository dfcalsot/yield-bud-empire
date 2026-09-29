// The Solana part of the operators' panel (/#panel → Solana): read-only questions to the chain that support and the accountant
// ask — the wallets' balances, the USDC the Founder Pack collected, «did this player's transaction go through?», «where is this
// relic NFT really?». Plain JSON-RPC over fetch; no keys are read or used here (bridge_jobs.asset_secret is never selected).
const MIN = 60_000;
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SIG = /^[1-9A-HJ-NP-Za-km-z]{64,90}$/;

export function installChainPanel({ db, route, HttpError, guard, limit, bridge, founder, env = process.env, fetchImpl = globalThis.fetch }) {
  const bridgeRpc = env.SOLANA_RPC || 'https://api.devnet.solana.com';
  const payRpc = env.FOUNDER_RPC || bridgeRpc;
  const net = (url) => (/devnet/.test(url) ? 'devnet' : /testnet/.test(url) ? 'testnet' : 'mainnet');
  const explorer = (url, kind, id) => `https://explorer.solana.com/${kind}/${id}${net(url) === 'mainnet' ? '' : `?cluster=${net(url)}`}`;
  let rid = 0;
  async function rpc(url, method, params) {
    const r = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: ++rid, method, params }), signal: AbortSignal.timeout(12_000) });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message ?? 'rpc_error');
    return j.result;
  }
  const one = (sql, ...a) => db.prepare(sql).get(...a);
  const all = (sql, ...a) => db.prepare(sql).all(...a);
  const nameOf = (id) => (id ? one('SELECT username FROM accounts WHERE id = ?', id)?.username ?? `#${id}` : null);

  /* ───────── wallets and what the Founder Pack collected ───────── */
  let cache = { at: 0, v: null };
  async function status() {
    if (cache.v && Date.now() - cache.at < MIN) return cache.v;
    const f = founder?.status?.() ?? {}, b = bridge?.status?.() ?? {};
    const out = { founder: { network: net(payRpc), enabled: !!f.enabled, receiver: f.receiver || null, mint: f.mint || null }, bridge: { network: net(bridgeRpc), enabled: !!b.enabled, vault: b.vault || null, collection: b.collection || null }, errors: [] };
    const tryIt = async (label, fn) => { try { return await fn(); } catch (e) { out.errors.push(`${label}: ${e.message}`); return null; } };
    if (out.bridge.vault) {
      out.bridge.sol = await tryIt('SOL del puente', async () => (await rpc(bridgeRpc, 'getBalance', [out.bridge.vault])).value / 1e9);
      out.bridge.explorer = explorer(bridgeRpc, 'address', out.bridge.vault);
    }
    if (out.founder.receiver) {
      const r = out.founder.receiver;
      out.founder.explorer = explorer(payRpc, 'address', r);
      out.founder.sol = await tryIt('SOL de cobros', async () => (await rpc(payRpc, 'getBalance', [r])).value / 1e9);
      const accts = await tryIt('USDC de cobros', async () => (await rpc(payRpc, 'getTokenAccountsByOwner', [r, { mint: out.founder.mint }, { encoding: 'jsonParsed' }])).value);
      if (accts) {
        out.founder.usdc = accts.reduce((n, a) => n + Number(a.account.data.parsed.info.tokenAmount.uiAmount ?? 0), 0);
        const ata = accts[0]?.pubkey;
        // the last payments that reached the collecting account, straight from the chain
        if (ata) {
          const sigs = (await tryIt('pagos en la cadena', () => rpc(payRpc, 'getSignaturesForAddress', [ata, { limit: 12 }]))) ?? [];
          out.founder.payments = [];
          for (const s of sigs) {
            const tx = await tryIt('transacción', () => rpc(payRpc, 'getTransaction', [s.signature, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }]));
            const bal = (arr) => (arr ?? []).filter((x) => x.owner === r && x.mint === out.founder.mint).reduce((n, x) => n + Number(x.uiTokenAmount.uiAmount ?? 0), 0);
            const delta = tx ? bal(tx.meta?.postTokenBalances) - bal(tx.meta?.preTokenBalances) : null;
            const order = one('SELECT id, account_id, status FROM founder_orders WHERE sig = ?', s.signature);
            out.founder.payments.push({ sig: s.signature, ts: s.blockTime ? s.blockTime * 1000 : null, ok: !s.err, usdc: delta, order: order ? { id: order.id, status: order.status, player: nameOf(order.account_id) } : null, explorer: explorer(payRpc, 'tx', s.signature) });
          }
        }
      }
    }
    // USDC collected per month, from the delivered orders (what the accountant needs)
    out.founder.months = all("SELECT strftime('%Y-%m', paid_at / 1000, 'unixepoch') AS month, COUNT(*) AS n, ROUND(SUM(amount) / 1e6, 2) AS usdc FROM founder_orders WHERE status = 'delivered' AND paid_at IS NOT NULL GROUP BY month ORDER BY month DESC LIMIT 12");
    cache = { at: Date.now(), v: out };
    return out;
  }

  /* ───────── «did this transaction go through?» ───────── */
  async function tx(sig) {
    if (!SIG.test(sig)) throw new HttpError(400, 'bad_signature');
    const nets = [...new Set([payRpc, bridgeRpc])];
    for (const url of nets) {
      const st = (await rpc(url, 'getSignatureStatuses', [[sig], { searchTransactionHistory: true }])).value?.[0];
      if (!st) continue;
      const t = await rpc(url, 'getTransaction', [sig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }]);
      const tokens = {};
      for (const [side, arr] of [[-1, t?.meta?.preTokenBalances], [1, t?.meta?.postTokenBalances]]) for (const x of arr ?? []) {
        const k = `${x.owner}|${x.mint}`; tokens[k] = (tokens[k] ?? 0) + side * Number(x.uiTokenAmount.uiAmount ?? 0);
      }
      const usdcMint = founder?.mint;
      const tokenChanges = Object.entries(tokens).filter(([, d]) => Math.abs(d) > 1e-9).map(([k, d]) => { const [owner, mint] = k.split('|'); return { owner, mint, token: mint === usdcMint ? 'USDC' : `${mint.slice(0, 4)}…${mint.slice(-4)}`, delta: Math.round(d * 1e6) / 1e6 }; });
      const keys = t?.transaction?.message?.accountKeys ?? [];
      const solChanges = keys.map((k, i) => ({ account: k.pubkey ?? k, delta: ((t.meta.postBalances[i] ?? 0) - (t.meta.preBalances[i] ?? 0)) / 1e9 })).filter((x) => Math.abs(x.delta) > 0).slice(0, 8);
      const order = one('SELECT id, account_id, status, amount FROM founder_orders WHERE sig = ?', sig);
      const job = one('SELECT id, account_id, dir, status, asset, wallet FROM bridge_jobs WHERE sig = ?', sig);
      return {
        found: true, network: net(url), status: st.err ? 'falló' : st.confirmationStatus ?? 'procesada', error: st.err ? JSON.stringify(st.err) : null,
        slot: st.slot, ts: t?.blockTime ? t.blockTime * 1000 : null, fee: t?.meta ? t.meta.fee / 1e9 : null,
        signer: (keys.find((k) => k.signer)?.pubkey) ?? null, tokenChanges, solChanges,
        order: order ? { id: order.id, status: order.status, player: nameOf(order.account_id), usdc: order.amount / 1e6 } : null,
        job: job ? { id: job.id, dir: job.dir, status: job.status, player: nameOf(job.account_id), asset: job.asset, wallet: job.wallet } : null,
        explorer: explorer(url, 'tx', sig),
      };
    }
    return { found: false, networks: nets.map(net) };
  }

  /* ───────── «where is this relic really?» ───────── */
  async function nft(asset, wallet) {
    if (!B58.test(asset)) throw new HttpError(400, 'bad_address');
    if (wallet && !B58.test(wallet)) throw new HttpError(400, 'bad_address');
    const job = one('SELECT id, account_id, dir, status, wallet, nft_id, updated_at FROM bridge_jobs WHERE asset = ? ORDER BY id DESC', asset);
    const rec = job ? one('SELECT data FROM nfts WHERE id = ?', job.nft_id) : null;
    let onChain = null, err = null;
    try { onChain = bridge?.chain ? await bridge.chain.fetchAsset(asset) : null; } catch (e) { err = e.message; }
    const vault = bridge?.status?.().vault ?? null;
    const owner = onChain?.owner ?? null;
    return {
      asset, found: !!onChain, owner, inVault: !!owner && owner === vault, name: onChain?.name ?? (rec ? JSON.parse(rec.data).name ?? null : null),
      collection: onChain?.collection ?? null, ourCollection: (bridge?.status?.().collection ?? null),
      matches: wallet ? owner === wallet : null, wallet: wallet || null, error: err,
      job: job ? { id: job.id, dir: job.dir, status: job.status, player: nameOf(job.account_id), wallet: job.wallet, updated: job.updated_at } : null,
      explorer: explorer(bridgeRpc, 'address', asset),
    };
  }

  const safe = async (fn) => { try { return await fn(); } catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(502, 'chain_unavailable', { detail: String(e.message).slice(0, 160) }); } };
  route('GET', '/api/admin/chain/status', async (ctx) => { guard(ctx); return safe(status); });
  route('GET', '/api/admin/chain/tx', async (ctx) => { guard(ctx); limit(ctx, `chain:${ctx.ipHash}`, 30, MIN); return safe(() => tx(String(ctx.url.searchParams.get('sig') ?? '').trim())); });
  route('GET', '/api/admin/chain/nft', async (ctx) => { guard(ctx); limit(ctx, `chain:${ctx.ipHash}`, 30, MIN); return safe(() => nft(String(ctx.url.searchParams.get('asset') ?? '').trim(), String(ctx.url.searchParams.get('wallet') ?? '').trim())); });
}
