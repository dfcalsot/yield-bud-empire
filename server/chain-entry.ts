// The Solana side of the bridge (server only): Metaplex Core assets in one collection with a royalties plugin. Bundled by
// scripts/build-server-sim.mjs into server/gen/chain.mjs, so the account service needs no node_modules for it.
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createNoopSigner, createSignerFromKeypair, generateSigner, keypairIdentity, publicKey, type Umi } from '@metaplex-foundation/umi';
import {
  mplCore, create, createCollection, fetchAssetV1, fetchCollectionV1, transfer, ruleSet, getAssetV1GpaBuilder, Key, updateAuthority,
} from '@metaplex-foundation/mpl-core';
import { base58 } from '@metaplex-foundation/umi/serializers';
import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';

export interface AssetView { address: string; owner: string; collection: string | null; name: string; uri: string }

export function newKeypair(): { publicKey: string; secretKey: number[] } {
  const k = Keypair.generate();
  return { publicKey: k.publicKey.toBase58(), secretKey: Array.from(k.secretKey) };
}

export function createChain(opts: { rpc: string; secretKey: number[] }) {
  const umi: Umi = createUmi(opts.rpc, 'confirmed').use(mplCore());
  const kp = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(opts.secretKey));
  umi.use(keypairIdentity(kp));
  const conn = new Connection(opts.rpc, 'confirmed');
  const address = kp.publicKey.toString();
  const sig58 = (s: Uint8Array) => base58.deserialize(s)[0];

  async function fetchAsset(addr: string): Promise<AssetView | null> {
    try {
      const a = await fetchAssetV1(umi, publicKey(addr));
      const col = a.updateAuthority.type === 'Collection' ? String(a.updateAuthority.address) : null;
      return { address: addr, owner: String(a.owner), collection: col, name: a.name, uri: a.uri };
    } catch { return null; }
  }

  return {
    address,
    async balance(): Promise<number> { return (await conn.getBalance(new PublicKey(address))) / 1e9; },
    async airdrop(sol = 1): Promise<string> { return conn.requestAirdrop(new PublicKey(address), sol * 1e9); },

    /** the collection with its royalties plugin; created once (returns the existing one when `known` is on-chain) */
    async ensureCollection(p: { known?: string | null; name: string; uri: string; royaltyBps: number; royaltyWallet: string }): Promise<string> {
      if (p.known) { try { await fetchCollectionV1(umi, publicKey(p.known)); return p.known; } catch { /* create it */ } }
      const col = generateSigner(umi);
      await createCollection(umi, {
        collection: col, name: p.name, uri: p.uri,
        plugins: [{ type: 'Royalties', basisPoints: p.royaltyBps, creators: [{ address: publicKey(p.royaltyWallet), percentage: 100 }], ruleSet: ruleSet('None') }],
      }).sendAndConfirm(umi);
      return String(col.publicKey);
    },

    /** mint an asset of the collection straight to `owner`; the asset address comes from a keypair the caller keeps (retries reuse it) */
    async mint(p: { assetSecret: number[]; owner: string; name: string; uri: string; collection: string }): Promise<string> {
      const asset = createSignerFromKeypair(umi, umi.eddsa.createKeypairFromSecretKey(new Uint8Array(p.assetSecret)));
      const collection = await fetchCollectionV1(umi, publicKey(p.collection));
      const r = await create(umi, { asset, collection, name: p.name, uri: p.uri, owner: publicKey(p.owner) }).sendAndConfirm(umi);
      return sig58(r.signature);
    },

    /** move an asset the bridge vault holds to `newOwner` */
    async transfer(p: { asset: string; collection: string; newOwner: string }): Promise<string> {
      const asset = await fetchAssetV1(umi, publicKey(p.asset));
      const collection = await fetchCollectionV1(umi, publicKey(p.collection));
      const r = await transfer(umi, { asset, collection, newOwner: publicKey(p.newOwner) }).sendAndConfirm(umi);
      return sig58(r.signature);
    },

    fetchAsset,

    /** assets of the collection a wallet holds */
    async assetsOf(owner: string, collection: string): Promise<AssetView[]> {
      const list = await getAssetV1GpaBuilder(umi).whereField('key', Key.AssetV1).whereField('owner', publicKey(owner)).getDeserialized();
      return list.filter((a) => a.updateAuthority.type === 'Collection' && String(a.updateAuthority.address) === collection)
        .map((a) => ({ address: String(a.publicKey), owner: String(a.owner), collection, name: a.name, uri: a.uri }));
    },

    /** an unsigned transfer to the vault for the player's wallet to sign and send (it pays the fee) */
    async depositTx(p: { asset: string; collection: string; owner: string }): Promise<string> {
      const owner = createNoopSigner(publicKey(p.owner));
      const asset = await fetchAssetV1(umi, publicKey(p.asset));
      const collection = await fetchCollectionV1(umi, publicKey(p.collection));
      const tx = await transfer(umi, { asset, collection, newOwner: publicKey(address), authority: owner, payer: owner })
        .setFeePayer(owner).buildWithLatestBlockhash(umi);
      return Buffer.from(umi.transactions.serialize(tx)).toString('base64');
    },

    /** the wallets that signed the latest transactions touching an asset (who sent it to the vault) */
    async recentSigners(asset: string, limit = 3): Promise<string[]> {
      const sigs = await conn.getSignaturesForAddress(new PublicKey(asset), { limit });
      const out = new Set<string>();
      for (const s of sigs) {
        if (s.err) continue;
        const tx = await conn.getTransaction(s.signature, { maxSupportedTransactionVersion: 0 });
        const m = tx?.transaction.message;
        if (!m) continue;
        const keys = m.getAccountKeys().staticAccountKeys;
        for (let i = 0; i < m.header.numRequiredSignatures; i++) out.add(keys[i].toBase58());
      }
      return [...out];
    },

    explorer: (kind: 'address' | 'tx', id: string) => `https://explorer.solana.com/${kind}/${id}${opts.rpc.includes('devnet') ? '?cluster=devnet' : ''}`,
  };
}

export type Chain = ReturnType<typeof createChain>;
export { VersionedTransaction, updateAuthority };
