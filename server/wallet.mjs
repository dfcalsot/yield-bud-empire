// The game wallet and the link to external wallets (Solana, Ronin), proven by a signature.
//
// Every account has an in-game address (a public id, not a key: nothing here holds private keys or moves assets on-chain).
// Linking an external wallet is a challenge: the server issues a one-time nonce inside a message that names the account, the chain
// and the address; the wallet signs it; the server checks the signature with the address itself and stores the link.
//   Solana  ed25519 over the message bytes (Phantom / Solflare / Backpack `signMessage`), verified with node:crypto.
//   Ronin   EIP-191 `personal_sign` (secp256k1 + keccak256), verified with @noble/curves + @noble/hashes (server only, MIT, audited).
// One wallet per chain per account, and one account per wallet address.
import crypto from 'node:crypto';
import { secp256k1 } from '@noble/curves/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';

const CHAINS = { solana: { name: 'Solana', network: 'devnet' }, ronin: { name: 'Ronin', network: 'Saigon (testnet)' } };
const NONCE_TTL = 10 * 60_000;
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function b58decode(s) {
  let n = 0n; for (const ch of s) { const i = B58.indexOf(ch); if (i < 0) return null; n = n * 58n + BigInt(i); }
  let hex = n.toString(16); if (hex.length % 2) hex = '0' + hex;
  const body = n === 0n ? Buffer.alloc(0) : Buffer.from(hex, 'hex');
  let zeros = 0; for (const ch of s) { if (ch === '1') zeros++; else break; }
  return Buffer.concat([Buffer.alloc(zeros), body]);
}

/** ed25519 verification with node:crypto: the Solana address *is* the 32-byte public key */
export function verifySolana(address, message, sigB64) {
  const pub = b58decode(address); if (!pub || pub.length !== 32) return false;
  const sig = Buffer.from(String(sigB64), 'base64'); if (sig.length !== 64) return false;
  try {
    const key = crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), pub]), format: 'der', type: 'spki' });
    return crypto.verify(null, Buffer.from(message, 'utf8'), key, sig);
  } catch { return false; }
}

const hex = (u8) => Buffer.from(u8).toString('hex');
/** the 0x… address that signed `message` with personal_sign (EIP-191), or null */
export function recoverRonin(message, sigHex) {
  try {
    const raw = String(sigHex).replace(/^0x/, ''); if (!/^[0-9a-fA-F]{130}$/.test(raw)) return null;
    let v = parseInt(raw.slice(128), 16); if (v >= 27) v -= 27; if (v !== 0 && v !== 1) return null;
    const body = Buffer.from(message, 'utf8');
    const hash = keccak_256(Buffer.concat([Buffer.from(`\x19Ethereum Signed Message:\n${body.length}`, 'utf8'), body]));
    const pub = secp256k1.Signature.fromCompact(raw.slice(0, 128)).addRecoveryBit(v).recoverPublicKey(hash).toBytes(false);   // 65 bytes, 0x04 + X + Y
    return '0x' + hex(keccak_256(pub.slice(1)).slice(-20));
  } catch { return null; }
}

/** `ronin:abc…` and `0xABC…` are the same address; we store it as lowercase 0x */
export const normRonin = (a) => { const m = /^(?:ronin:|0x)([0-9a-fA-F]{40})$/.exec(String(a).trim()); return m ? '0x' + m[1].toLowerCase() : null; };
export const normSolana = (a) => { const s = String(a).trim(); const b = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s) ? b58decode(s) : null; return b && b.length === 32 ? s : null; };

export const challengeText = ({ accountId, chain, address, nonce, exp }) =>
  `Yield Bud Empire\nVincular billetera ${CHAINS[chain].name} a la cuenta #${accountId}\nDirección: ${address}\nNonce: ${nonce}\nCaduca: ${new Date(exp).toISOString()}\nFirmar no cuesta nada ni mueve fondos.`;

export function installWallet({ db, route, HttpError, sessionAccount, audit, limit, readJson }) {
  db.exec(`
CREATE TABLE IF NOT EXISTS wallet_links (id INTEGER PRIMARY KEY AUTOINCREMENT, account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, chain TEXT NOT NULL, address TEXT NOT NULL, linked_at INTEGER NOT NULL,
  UNIQUE (chain, address), UNIQUE (account_id, chain));
CREATE TABLE IF NOT EXISTS wallet_nonces (nonce TEXT PRIMARY KEY, account_id INTEGER NOT NULL, chain TEXT NOT NULL, address TEXT NOT NULL, exp INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
`);
  const q = {
    links: db.prepare('SELECT chain, address, linked_at FROM wallet_links WHERE account_id = ? ORDER BY chain'),
    ofChain: db.prepare('SELECT * FROM wallet_links WHERE account_id = ? AND chain = ?'),
    byAddr: db.prepare('SELECT account_id FROM wallet_links WHERE chain = ? AND address = ?'),
    add: db.prepare('INSERT INTO wallet_links (account_id, chain, address, linked_at) VALUES (?,?,?,?)'),
    del: db.prepare('DELETE FROM wallet_links WHERE account_id = ? AND chain = ?'),
    putNonce: db.prepare('INSERT INTO wallet_nonces (nonce, account_id, chain, address, exp) VALUES (?,?,?,?,?)'),
    nonce: db.prepare('SELECT * FROM wallet_nonces WHERE nonce = ?'),
    useNonce: db.prepare('UPDATE wallet_nonces SET used = 1 WHERE nonce = ?'),
    sweep: db.prepare('DELETE FROM wallet_nonces WHERE exp < ?'),
  };
  setInterval(() => { try { q.sweep.run(Date.now() - 3600_000); } catch { /* */ } }, 3600_000).unref();

  /** the in-game address: a public id derived from the account, easy to read out loud. Not a key. */
  const gameAddress = (id) => { const h = crypto.createHash('sha256').update(`yield-bud-empire/game-wallet/${id}`).digest('hex').toUpperCase(); return `YBE-${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}`; };
  const view = (id) => ({ gameAddress: gameAddress(id), chains: CHAINS, links: q.links.all(id).map((r) => ({ chain: r.chain, address: r.address, linkedAt: r.linked_at })) });
  const who = (ctx, key, max) => { const a = sessionAccount(ctx); if (!a) throw new HttpError(401, 'unauthenticated'); limit(ctx, `${key}:${a.id}`, max, 60_000); return a; };
  const normalize = (chain, address) => (chain === 'solana' ? normSolana(address) : chain === 'ronin' ? normRonin(address) : null);

  route('GET', '/api/wallet', (ctx) => view(who(ctx, 'wallet', 120).id));

  route('POST', '/api/wallet/challenge', async (ctx) => {
    const a = who(ctx, 'wchal', 20); const b = await readJson(ctx.req, 2048);
    const chain = String(b.chain ?? ''); if (!CHAINS[chain]) throw new HttpError(400, 'bad_chain');
    const address = normalize(chain, b.address); if (!address) throw new HttpError(400, 'bad_address');
    if (q.ofChain.get(a.id, chain)) throw new HttpError(409, 'already_linked');
    const owner = q.byAddr.get(chain, address); if (owner) throw new HttpError(409, 'wallet_taken');
    const nonce = crypto.randomBytes(16).toString('hex'), exp = Date.now() + NONCE_TTL;
    q.putNonce.run(nonce, a.id, chain, address, exp);
    return { nonce, exp, address, message: challengeText({ accountId: a.id, chain, address, nonce, exp }) };
  });

  route('POST', '/api/wallet/link', async (ctx) => {
    const a = who(ctx, 'wlink', 20); const b = await readJson(ctx.req, 4096);
    const n = q.nonce.get(String(b.nonce ?? ''));
    if (!n || n.account_id !== a.id || n.used) throw new HttpError(400, 'bad_nonce');
    if (n.exp < Date.now()) throw new HttpError(400, 'nonce_expired');
    const chain = n.chain, address = n.address;
    if (String(b.chain) !== chain || normalize(chain, b.address) !== address) throw new HttpError(400, 'bad_nonce');
    const message = challengeText({ accountId: a.id, chain, address, nonce: n.nonce, exp: n.exp });
    const good = chain === 'solana' ? verifySolana(address, message, b.signature) : recoverRonin(message, b.signature) === address;
    q.useNonce.run(n.nonce);                                   // a nonce is good for one attempt, right or wrong
    if (!good) throw new HttpError(400, 'bad_signature');
    if (q.ofChain.get(a.id, chain)) throw new HttpError(409, 'already_linked');
    try { q.add.run(a.id, chain, address, Date.now()); } catch { throw new HttpError(409, 'wallet_taken'); }
    audit('wallet_link', a.id, chain);
    return view(a.id);
  });

  route('POST', '/api/wallet/unlink', async (ctx) => {
    const a = who(ctx, 'wunlink', 20); const b = await readJson(ctx.req, 512);
    const chain = String(b.chain ?? ''); if (!CHAINS[chain]) throw new HttpError(400, 'bad_chain');
    q.del.run(a.id, chain); audit('wallet_unlink', a.id, chain);
    return view(a.id);
  });

  return { gameAddress, view };
}
