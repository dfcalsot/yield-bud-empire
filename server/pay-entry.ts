// The Solana side of the Founder Pack payments (server only): Solana Pay transfer requests in USDC. The server holds no key here:
// the money goes straight to the team's receiving wallet and the server only reads the chain. Bundled by
// scripts/build-server-sim.mjs into server/gen/pay.mjs.
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';

const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ATA_PROGRAM = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

/** the associated token account of `owner` for `mint` */
export const ata = (owner: PublicKey, mint: PublicKey) => PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN_PROGRAM.toBuffer(), mint.toBuffer()], ATA_PROGRAM)[0];

/** a Solana Pay reference: a random public key nobody holds, added read-only to the payment so the server can find it */
export const newReference = () => Keypair.generate().publicKey.toBase58();

export interface Payment { sig: string; payer: string; amount: number }

export function createPay(opts: { rpc: string; receiver: string; mint: string; decimals?: number }) {
  const conn = new Connection(opts.rpc, 'confirmed');
  const receiver = new PublicKey(opts.receiver), mint = new PublicKey(opts.mint), decimals = opts.decimals ?? 6;
  const receiverAta = ata(receiver, mint);

  return {
    receiverAta: receiverAta.toBase58(),

    /**
     * The first finalized transaction that carries `reference` and credits the receiving wallet with the mint, and how much it got
     * (in base units: 1 USDC = 1 000 000). The amount is the receiver's balance change, so a wallet that built the transfer its own
     * way (QR) and our unsigned transaction are read the same. `amount` 0 = it carried the reference but paid nothing to us.
     */
    async findPayment(reference: string): Promise<Payment | null> {
      const sigs = await conn.getSignaturesForAddress(new PublicKey(reference), { limit: 10 }, 'finalized');
      let seen: Payment | null = null;
      for (const s of sigs.reverse()) {
        if (s.err) continue;
        const tx = await conn.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0, commitment: 'finalized' });
        if (!tx?.meta || tx.meta.err) continue;
        const mine = (list: typeof tx.meta.postTokenBalances) => (list ?? []).filter((b) => b.owner === opts.receiver && b.mint === opts.mint).reduce((a, b) => a + BigInt(b.uiTokenAmount.amount), 0n);
        const delta = Number(mine(tx.meta.postTokenBalances) - mine(tx.meta.preTokenBalances));
        const payer = tx.transaction.message.accountKeys[0]?.pubkey.toBase58() ?? '';
        if (delta > 0) return { sig: s.signature, payer, amount: delta };
        seen ??= { sig: s.signature, payer, amount: 0 };
      }
      return seen;
    },

    /** the transfer for a browser wallet to sign and send: creates the receiver's token account if missing, then TransferChecked */
    async payTx(p: { payer: string; reference: string; amount: number }): Promise<string> {
      const payer = new PublicKey(p.payer);
      const createAta = new TransactionInstruction({
        programId: ATA_PROGRAM,
        keys: [
          { pubkey: payer, isSigner: true, isWritable: true }, { pubkey: receiverAta, isSigner: false, isWritable: true },
          { pubkey: receiver, isSigner: false, isWritable: false }, { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, { pubkey: TOKEN_PROGRAM, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([1]),   // CreateIdempotent
      });
      const data = Buffer.alloc(10);
      data[0] = 12;   // TransferChecked
      data.writeBigUInt64LE(BigInt(p.amount), 1);
      data[9] = decimals;
      const transfer = new TransactionInstruction({
        programId: TOKEN_PROGRAM,
        keys: [
          { pubkey: ata(payer, mint), isSigner: false, isWritable: true }, { pubkey: mint, isSigner: false, isWritable: false },
          { pubkey: receiverAta, isSigner: false, isWritable: true }, { pubkey: payer, isSigner: true, isWritable: false },
          { pubkey: new PublicKey(p.reference), isSigner: false, isWritable: false },
        ],
        data,
      });
      const tx = new Transaction({ feePayer: payer, ...(await conn.getLatestBlockhash('confirmed')) }).add(createAta, transfer);
      return tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64');
    },

    /** how many base units of the mint a wallet holds (0 when it has no token account) */
    async tokenBalance(owner: string): Promise<number> {
      try { return Number((await conn.getTokenAccountBalance(ata(new PublicKey(owner), mint))).value.amount); } catch { return 0; }
    },

    explorer: (kind: 'address' | 'tx', id: string) => `https://explorer.solana.com/${kind}/${id}${opts.rpc.includes('devnet') ? '?cluster=devnet' : ''}`,
  };
}

export type Pay = ReturnType<typeof createPay>;
