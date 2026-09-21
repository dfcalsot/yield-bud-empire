import React, { useMemo, useState } from 'react';
import { Coins, Flame, Globe2 } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { LandCard } from '../LandCard';
import { MintCeremony } from '../MintCeremony';
import { REGIONS } from '../../sim/terroir';
import { LAND_CUTS } from '../../sim/lands';
import { byRarityThenRating, landCardOf, type LandCardData } from '../../utils/land';
import type { RegionId } from '../../types';

type Sort = 'rarity' | 'price' | 'rating';
const PAGE = 9;

/**
 * The land shelf of the market. Every plot is a numbered NFT from a fixed supply per region; buying one burns $FLORA (or SOL),
 * plays the mint ceremony and the plot appears in the Planet and in the briefcase collection (they read the same `plots`).
 */
export const LandMarket: React.FC<{ currency: 'FLORA' | 'SOL'; onSay: (text: string, mood: 'idle' | 'happy' | 'sad') => void; onOpenPlanet?: () => void }> = ({ currency, onSay, onOpenPlanet }) => {
  const { plots, plotsForSale, buyPlot, floraBalance, solBalance } = useGame();
  const [region, setRegion] = useState<RegionId | 'all'>('all');
  const [sort, setSort] = useState<Sort>('rarity');
  const [minted, setMinted] = useState<LandCardData | null>(null);
  const [shown, setShown] = useState(PAGE);

  const offers = useMemo(() => {
    const regions = REGIONS.filter((r) => region === 'all' || r.id === region);
    return regions.flatMap((r) => plotsForSale(r.id).offers).map(landCardOf);
    // plotsForSale reads `plots`, so a purchase refreshes the shelf
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, plots]);

  const sorted = useMemo(() => {
    const price = (c: LandCardData) => (currency === 'FLORA' ? c.priceFlora : c.priceSol) ?? 0;
    return [...offers].sort(sort === 'price' ? (a, b) => price(a) - price(b) : sort === 'rating' ? (a, b) => b.landRating - a.landRating : byRarityThenRating);
  }, [offers, sort, currency]);

  const leftIn = (id: RegionId) => plotsForSale(id).left;

  const buy = async (c: LandCardData) => {
    if (await buyPlot(c.id, currency)) {
      setMinted(c);
      onSay(`¡Ya es tuya, la ${c.name}! ${c.rarity === 'legendary' ? '¡Una legendaria, jefe!' : 'Ahora a sembrar.'}`, 'happy');
    } else onSay('Uy, no pudo ser: no te alcanza o alguien se te adelantó con esa tierra.', 'sad');
  };

  return (
    <div className="mk-panel p-3 sm:p-4 space-y-3" data-testid="land-market">
      <div className="flex flex-wrap items-center gap-2">
        <Globe2 className="w-5 h-5 text-sky-300" />
        <h3 className="font-serif text-base font-black tracking-[0.12em] uppercase text-sky-100">Tierras NFT</h3>
        <span className="text-[11px] font-mono text-neutral-400">Cada parcela es única, de suministro fijo, con 36 plantas. Tienes {plots.length}.</span>
        {onOpenPlanet && <button type="button" onClick={onOpenPlanet} className="ml-auto text-[11px] font-mono text-sky-200 underline underline-offset-2 cursor-pointer hover:text-white">Ver mis tierras en el Planeta →</button>}
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Región">
        <button role="tab" aria-selected={region === 'all'} onClick={() => { setRegion('all'); setShown(PAGE); }} className={`mk-chip ${region === 'all' ? 'is-on' : ''}`}>🌍 Todas</button>
        {REGIONS.map((r) => (
          <button key={r.id} role="tab" aria-selected={region === r.id} onClick={() => { setRegion(r.id); setShown(PAGE); }} className={`mk-chip ${region === r.id ? 'is-on' : ''}`} style={{ ['--rc' as string]: r.color } as React.CSSProperties}>
            {r.emoji} {r.name} <span className="opacity-60 font-mono">{leftIn(r.id)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-neutral-400">
        Ordenar:
        {([['rarity', 'Rareza'], ['rating', 'Nota'], ['price', 'Precio']] as const).map(([id, label]) => (
          <button key={id} onClick={() => { setSort(id); setShown(PAGE); }} className={`mk-chip ${sort === id ? 'is-on' : ''}`}>{label}</button>
        ))}
        <span className="ml-auto hidden sm:inline">Rareza por nota: {LAND_CUTS.filter((c) => c.min > 0).reverse().map((c) => `${c.rarity === 'rare' ? 'Rara' : c.rarity === 'epic' ? 'Épica' : 'Legendaria'} ≥ ${c.min}`).join(' · ')}</span>
      </div>

      {sorted.length === 0 && <p className="text-sm text-neutral-500 py-8 text-center">No quedan parcelas a la venta en esta región.</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.slice(0, shown).map((c) => {
          const price = (currency === 'FLORA' ? c.priceFlora : c.priceSol) ?? 0;
          const ok = (currency === 'FLORA' ? floraBalance : solBalance) >= price;
          return (
            <LandCard key={c.id} card={c} footer={
              <button type="button" className={`mk-buy !py-2.5 !text-[11px] ${ok ? '' : 'is-poor'}`} onClick={() => buy(c)} data-buy-land={c.id}>
                <span className="mk-buy-shine" /><span>Comprar tierra</span>
                <span className="ml-auto flex items-center gap-1 font-mono">{currency === 'FLORA' ? <Flame className="w-3.5 h-3.5" /> : <Coins className="w-3.5 h-3.5" />}{price}</span>
              </button>
            } />
          );
        })}
      </div>

      {sorted.length > shown && (
        <div className="flex justify-center"><button type="button" className="mk-chip" onClick={() => setShown((n) => n + PAGE)}>Ver más tierras ({sorted.length - shown} restantes)</button></div>
      )}

      {minted && (
        <MintCeremony
          card={minted} variant="onchain" feeText={`${currency === 'FLORA' ? minted.priceFlora : minted.priceSol} ${currency === 'FLORA' ? '$FLORA quemados' : 'SOL'}`}
          render={(down) => <LandCard card={minted} faceDown={down} />}
          onClose={() => setMinted(null)} closeLabel="Genial"
        />
      )}
    </div>
  );
};
