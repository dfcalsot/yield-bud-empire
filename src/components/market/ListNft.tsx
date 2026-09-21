import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Flame, Tag, X } from 'lucide-react';
import { useGame } from '../../context/GameContext';

/** where a price suggestion starts, by rarity; the player is free to change it (the server only bounds it) */
const SUGGEST: Record<string, number> = { common: 60, rare: 250, epic: 900, legendary: 3500 };
export const suggestedPrice = (rarity: string): number => SUGGEST[rarity] ?? 100;

/**
 * "Listar en el mercado": a small button that opens a dialog to set the price and confirms with the sale rules in plain words
 * (escrow while listed, the fee that is burned, what the player would actually collect).
 */
export const ListNftButton: React.FC<{
  what: { nftId?: string; designId?: string };
  name: string;
  rarity: string;
  className?: string;
  label?: string;
}> = ({ what, name, rarity, className = 'sr-btn', label = 'Vender' }) => {
  const { listNft, p2pInfo, myListings, ledgerOn } = useGame();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(suggestedPrice(rarity));
  const [busy, setBusy] = useState(false);
  if (!ledgerOn) return null;
  const fee = Math.max(1, Math.round(price * p2pInfo.feeRate));
  const valid = Number.isFinite(price) && price >= p2pInfo.minPrice && price <= p2pInfo.maxPrice;
  const full = myListings.length >= p2pInfo.maxListings;

  const confirm = async () => {
    setBusy(true);
    const ok = await listNft(what, Math.floor(price));
    setBusy(false);
    if (ok) setOpen(false);
  };

  return (
    <>
      <button type="button" className={className} onClick={(e) => { e.stopPropagation(); setPrice(suggestedPrice(rarity)); setOpen(true); }} data-list={what.nftId ?? what.designId} title="Ponerlo a la venta a otros jugadores">
        <Tag className="w-3.5 h-3.5" />{label}
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal aria-label={`Listar ${name}`} onClick={() => setOpen(false)}>
          <div className="fp-shell w-full max-w-sm p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-serif text-lg font-black text-white">Vender «{name}»</h4>
                <p className="text-[11.5px] text-neutral-400 leading-snug">Queda en depósito mientras esté a la venta: no trabaja ni se usa. Puedes retirarlo cuando quieras.</p>
              </div>
              <button type="button" className="fp-x" onClick={() => setOpen(false)} aria-label="Cerrar"><X className="w-4 h-4" /></button>
            </div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-neutral-400">Precio en $FLORA
              <input type="number" min={p2pInfo.minPrice} max={p2pInfo.maxPrice} value={Number.isFinite(price) ? price : ''} onChange={(e) => setPrice(Number(e.target.value))} data-list-price
                className="mt-1 w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-base font-mono text-amber-200 outline-none focus:border-amber-300/60" />
            </label>
            <div className="rounded-lg border border-white/10 bg-black/30 p-2.5 text-[11.5px] font-mono space-y-1">
              <div className="flex justify-between text-neutral-300"><span>Precio</span><span>{valid ? price : '—'}</span></div>
              <div className="flex justify-between text-amber-300"><span className="inline-flex items-center gap-1"><Flame className="w-3 h-3" />Comisión quemada ({Math.round(p2pInfo.feeRate * 100)} %)</span><span>−{valid ? fee : '—'}</span></div>
              <div className="flex justify-between text-emerald-300 font-bold border-t border-white/10 pt-1"><span>Recibirías</span><span>{valid ? price - fee : '—'}</span></div>
            </div>
            {!valid && <p className="text-[11px] text-rose-300">El precio va de {p2pInfo.minPrice} a {p2pInfo.maxPrice.toLocaleString()} $FLORA.</p>}
            {full && <p className="text-[11px] text-rose-300">Ya tienes {p2pInfo.maxListings} ofertas activas: retira alguna primero.</p>}
            <button type="button" className="fp-cta w-full justify-center" disabled={!valid || busy || full} onClick={confirm} data-list-confirm><Tag className="w-4 h-4" />{busy ? 'Publicando…' : 'Publicar oferta'}</button>
          </div>
        </div>, document.body)}
    </>
  );
};
