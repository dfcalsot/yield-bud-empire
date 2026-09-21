import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Flame, Link2, Unlink, Wallet, X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { challenge, link, unlink, getWallet, b64, WALLET_ERRORS, type Chain, type WalletInfo } from '../../economy/walletApi';
import { fetchHistory } from '../../economy/ledger';
import { connectBrowserWallet, detectSolanaProviders } from '../../utils/solana';
import { connectRonin, roninProvider, signRonin } from '../../utils/ronin';
import { shortAddress } from '../../utils/nft';

const KIND_LABEL: Record<string, string> = {
  starter: 'Saldo de bienvenida', claim: 'Reclamo diario', sale: 'Venta en el Dispensario', sale_fee: 'Comisión de venta', build: 'Obra', speedup: 'Aceleración', hire: 'Fichaje', chest: 'Cofre', rank_up: 'Ascenso',
  land: 'Tierra', wages: 'Sueldos', refund: 'Duplicado devuelto', quest: 'Misión', level: 'Nivel', import: 'Progreso importado', spend: 'Compra', p2p_buy: 'Compra a un jugador', p2p_sale: 'Venta a un jugador', grant: 'Ajuste de la casa',
};
const EXPLORER: Record<Chain, (a: string) => string> = {
  solana: (a) => `https://explorer.solana.com/address/${a}?cluster=devnet`,
  ronin: (a) => `https://saigon-app.roninchain.com/address/${a}`,
};
const CHAIN_STYLE: Record<Chain, { color: string; emoji: string }> = { solana: { color: '#a78bfa', emoji: '◎' }, ronin: { color: '#38bdf8', emoji: '⚔' } };

/**
 * The game wallet: the account's in-game address, its $FLORA and NFTs, and the external wallets (Solana, Ronin) linked by a signed
 * challenge. Linking proves ownership and nothing else: no funds move and no asset leaves the game yet (that bridge comes later).
 */
export const WalletModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { floraBalance, staff, plots, avatars, myListings, ledgerOn, currentUser } = useGame();
  const [info, setInfo] = useState<WalletInfo | null>(null);
  const [hist, setHist] = useState<Awaited<ReturnType<typeof fetchHistory>>>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const r = await getWallet(); if (r.ok) setInfo(r.data);
    setHist(await fetchHistory());
  }, []);
  useEffect(() => { if (isOpen && ledgerOn) void refresh(); }, [isOpen, ledgerOn, refresh, floraBalance]);
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);
  if (!isOpen) return null;

  const copy = (text: string, key: string) => { void navigator.clipboard?.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1600); };
  const fail = (e: unknown) => setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) });

  /** connect the external wallet, get the server's challenge, have the wallet sign it, hand the signature back */
  const linkWallet = async (chain: Chain, solanaProvider?: 'phantom' | 'solflare' | 'backpack' | 'injected') => {
    setMsg(null); setBusy(chain);
    try {
      let address: string, sign: (m: string) => Promise<string>;
      if (chain === 'solana') {
        const c = await connectBrowserWallet(solanaProvider ?? 'injected');
        if (typeof c.provider.signMessage !== 'function') throw new Error('Esa billetera no permite firmar mensajes.');
        address = c.publicKey;
        sign = async (m) => { const r = await c.provider.signMessage(new TextEncoder().encode(m), 'utf8'); return b64((r?.signature ?? r) as Uint8Array); };
      } else {
        const c = await connectRonin();
        address = c.address;
        sign = (m) => signRonin(c.provider, c.address, m);
      }
      const ch = await challenge(chain, address);
      if (!ch.ok) throw new Error(WALLET_ERRORS[ch.error] ?? ch.error);
      const signature = await sign(ch.data.message);
      const ln = await link(chain, address, ch.data.nonce, signature);
      if (!ln.ok) throw new Error(WALLET_ERRORS[ln.error] ?? ln.error);
      setInfo(ln.data);
      setMsg({ ok: true, text: `${chain === 'solana' ? 'Solana' : 'Ronin'} vinculada: ${shortAddress(address, 4, 4)}` });
    } catch (e) { fail(e); } finally { setBusy(null); }
  };
  const unlinkWallet = async (chain: Chain) => {
    setBusy(chain); const r = await unlink(chain); setBusy(null);
    if (r.ok) { setInfo(r.data); setMsg({ ok: true, text: 'Billetera desvinculada.' }); } else setMsg({ ok: false, text: WALLET_ERRORS[r.error] ?? r.error });
  };

  const solProviders = detectSolanaProviders().filter((p) => p.isInstalled && p.id !== 'virtual');
  const solChoices = solProviders.some((p) => p.id !== 'injected') ? solProviders.filter((p) => p.id !== 'injected') : solProviders;
  const hasRonin = !!roninProvider();
  const linkOf = (c: Chain) => info?.links.find((l) => l.chain === c);
  const nfts = staff.length + plots.length + avatars.reduce((n, a) => n + a.count, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto" role="dialog" aria-modal aria-label="Wallet del juego" onClick={onClose} data-testid="wallet-modal">
      <div className="hud-panel max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-emerald-400/10 border border-emerald-300/30 text-emerald-300"><Wallet className="w-5 h-5" /></span>
            <div>
              <h3 className="font-serif text-lg font-black text-white leading-tight">Wallet del juego</h3>
              <p className="text-[11px] text-neutral-400" data-testid="wallet-account">{info ? `Cuenta #${info.account.id} · ${info.account.username}${info.account.email ? ` · ${info.account.email}` : ''}` : (currentUser?.displayName ?? 'Jugador')} · modo simulado</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="fp-x" aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </header>

        {!ledgerOn ? (
          <p className="text-sm text-neutral-400 py-6 text-center" data-testid="wallet-offline">Este navegador está jugando en modo local: no hay sesión con el servidor de cuentas, así que no se ve la cartera del servidor. Cierra sesión y vuelve a entrar con tu correo y contraseña.</p>
        ) : (
          <>
            <section className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
              <div className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-neutral-400">Dirección de juego</div>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate text-[13px] font-mono text-emerald-200" data-testid="game-address">{info?.gameAddress ?? '…'}</code>
                <button type="button" className="sr-btn" onClick={() => info && copy(info.gameAddress, 'game')} aria-label="Copiar">{copied === 'game' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-lg bg-black/40 border border-amber-300/20 p-2"><div className="text-[10px] font-mono text-neutral-400">$FLORA</div><div className="text-lg font-black text-amber-300 font-mono" data-testid="wallet-flora">{floraBalance.toLocaleString()}</div></div>
                <div className="rounded-lg bg-black/40 border border-sky-300/20 p-2"><div className="text-[10px] font-mono text-neutral-400">NFT del juego</div><div className="text-lg font-black text-sky-200 font-mono">{nfts}<span className="text-[10.5px] font-normal text-neutral-400"> · {myListings.length} en venta</span></div></div>
              </div>
            </section>

            <section className="space-y-2">
              <div className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-neutral-400">Billeteras vinculadas</div>
              {(['solana', 'ronin'] as Chain[]).map((chain) => {
                const l = linkOf(chain), st = CHAIN_STYLE[chain], meta = info?.chains[chain];
                return (
                  <div key={chain} className="rounded-xl border p-3 space-y-2" style={{ borderColor: `${st.color}55`, background: `linear-gradient(160deg, ${st.color}14, rgba(8,5,20,.85))` }} data-wallet-chain={chain}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-white"><span style={{ color: st.color }} className="text-lg">{st.emoji}</span>{meta?.name ?? chain}<span className="text-[10px] font-mono text-neutral-400">{meta?.network}</span></div>
                      {l && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-400/15 text-emerald-200 border border-emerald-300/30">VINCULADA</span>}
                    </div>
                    {l ? (
                      <div className="flex items-center gap-2">
                        <code className="flex-1 truncate text-[12px] font-mono text-neutral-200" title={l.address}>{chain === 'ronin' ? `ronin:${l.address.slice(2)}` : l.address}</code>
                        <button type="button" className="sr-btn" onClick={() => copy(l.address, chain)} aria-label="Copiar">{copied === chain ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}</button>
                        <a className="sr-btn" href={EXPLORER[chain](l.address)} target="_blank" rel="noreferrer" aria-label="Ver en el explorador"><ExternalLink className="w-3.5 h-3.5" /></a>
                        <button type="button" className="sr-btn" disabled={busy === chain} onClick={() => unlinkWallet(chain)} data-unlink={chain}><Unlink className="w-3.5 h-3.5" />Quitar</button>
                      </div>
                    ) : chain === 'solana' ? (
                      solChoices.length === 0
                        ? <p className="text-[11.5px] text-neutral-400">No se detectó ninguna billetera Solana. Instala <a className="text-sky-300 underline" href="https://phantom.app" target="_blank" rel="noreferrer">Phantom</a>, Solflare o Backpack y recarga.</p>
                        : <div className="flex flex-wrap gap-1.5">{solChoices.map((p) => <button key={p.id} type="button" className="sr-btn sr-btn--lime" disabled={busy === chain} onClick={() => linkWallet('solana', p.id as 'phantom' | 'solflare' | 'backpack' | 'injected')} data-link-solana={p.id}><Link2 className="w-3.5 h-3.5" />{busy === chain ? 'Firmando…' : `Vincular ${p.name.replace(' Wallet', '').replace(' xNFT', '')}`}</button>)}</div>
                    ) : hasRonin
                      ? <button type="button" className="sr-btn sr-btn--lime" disabled={busy === chain} onClick={() => linkWallet('ronin')} data-link-ronin><Link2 className="w-3.5 h-3.5" />{busy === chain ? 'Firmando…' : 'Vincular Ronin Wallet'}</button>
                      : <p className="text-[11.5px] text-neutral-400">No se detectó Ronin Wallet. Instálala desde <a className="text-sky-300 underline" href="https://wallet.roninchain.com" target="_blank" rel="noreferrer">wallet.roninchain.com</a> y recarga.</p>}
                  </div>
                );
              })}
              {msg && <p className={`text-[11.5px] ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`} role="status" data-testid="wallet-msg">{msg.text}</p>}
              <p className="text-[10.5px] leading-snug text-neutral-500">Vincular es solo una firma que prueba que la billetera es tuya: no cuesta nada ni mueve fondos. Por ahora los activos viven en el juego; el puente a Solana devnet y Ronin Saigon llegará después.</p>
            </section>

            <section className="space-y-1.5">
              <div className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-neutral-400">Últimos movimientos</div>
              <ul className="max-h-40 overflow-y-auto space-y-1 pr-1" data-testid="wallet-history">
                {hist.length === 0 && <li className="text-[11.5px] text-neutral-500">Aún no hay movimientos.</li>}
                {hist.slice(0, 20).map((h, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-[11.5px] font-mono">
                    <span className="truncate text-neutral-300">{KIND_LABEL[h.kind] ?? h.kind}{h.ref ? <span className="text-neutral-500"> · {h.ref}</span> : null}</span>
                    <span className={`shrink-0 font-bold ${h.delta >= 0 ? 'text-emerald-300' : 'text-amber-300'}`}>{h.delta >= 0 ? '+' : ''}{h.delta.toLocaleString()}{h.delta < 0 && <Flame className="inline w-3 h-3 ml-0.5 opacity-70" />}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
};
