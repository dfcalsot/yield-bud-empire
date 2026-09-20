import React, { useEffect, useRef, useState } from 'react';
import { Coins, Flame, MapPin, Sprout } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { Npc, useNpcSay } from '../npc/Npc';
import { WorldMap } from './WorldMap';
import { PlotScreen } from './PlotScreen';
import { Bump } from '../ResourceBar';
import { dayIndexOf, REGION_BY_ID, REGIONS, terroirOf, weatherOn } from '../../sim/terroir';
import { isThirsty } from '../../sim/engine';
import type { OwnedPlot, RegionId } from '../../types';

const useNow = (ms: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), ms); return () => window.clearInterval(id); }, [ms]);
  return now;
};

const Bar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div>
    <div className="flex justify-between text-[9.5px] font-mono uppercase tracking-wider text-neutral-400"><span>{label}</span><span className="text-neutral-200">{value}</span></div>
    <div className="mk-bar"><i style={{ ['--to' as string]: value / 100, background: color } as React.CSSProperties} /></div>
  </div>
);

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

/** The Planet: world map, the seven regions, the plots you own and Don Tomás, the farmer who guides you. */
export const PlanetView: React.FC<{ onOpenSeedBank: () => void }> = ({ onOpenSeedBank }) => {
  const { plots, plotsForSale, buyPlot, floraBalance, solBalance, seedBank } = useGame();
  const now = useNow(30000);
  const [region, setRegion] = useState<RegionId | null>(null);
  const [hover, setHover] = useState<RegionId | null>(null);
  const [plotId, setPlotId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'FLORA' | 'SOL'>('FLORA');
  const { say, speak } = useNpcSay('¡Buenas, patrón! Soy Don Tomás. Toca una región del mapa: cada tierra tiene su clima… y sus landrace.');
  const lastSpoke = useRef(Date.now());
  const say2 = (text: string, mood: 'idle' | 'happy' | 'sad' | 'busy' = 'idle') => { lastSpoke.current = Date.now(); speak(text, mood); };

  const plot = plots.find((p) => p.id === plotId) ?? null;
  const owned: Partial<Record<RegionId, number>> = {};
  plots.forEach((p) => { owned[p.region] = (owned[p.region] ?? 0) + 1; });
  const totalPlants = plots.reduce((n, p) => n + p.plants.length, 0);
  const totalReady = plots.reduce((n, p) => n + p.plants.filter((x) => x.stage === 'ready_harvest').length, 0);

  // the farmer comments on what he sees hovering over the map
  useEffect(() => {
    if (!hover || plot) return;
    const t = window.setTimeout(() => { const r = REGION_BY_ID[hover]; say2(`${r.emoji} ${r.name}: ${r.blurb}`); }, 380);
    return () => window.clearTimeout(t);
  }, [hover]); // eslint-disable-line react-hooks/exhaustive-deps

  // ...and keeps an eye on the fields
  const latest = useRef({ plots, region, plot });
  latest.current = { plots, region, plot };
  useEffect(() => {
    const tip = () => {
      if (Date.now() - lastSpoke.current < 14000) return;
      const { plots: ps } = latest.current;
      const urgent: string[] = [];
      for (const p of ps) {
        const ready = p.plants.filter((x) => x.stage === 'ready_harvest').length;
        const thirsty = p.plants.filter(isThirsty).length;
        const sick = p.plants.filter((x) => x.pest).length;
        const w = weatherOn(REGION_BY_ID[p.region], dayIndexOf(Date.now()));
        if (ready) urgent.push(`🌾 ¡${ready} planta${ready > 1 ? 's' : ''} lista${ready > 1 ? 's' : ''} para cosechar en ${p.name}!`);
        if (sick) urgent.push(`🐛 Hay ${sick} planta${sick > 1 ? 's' : ''} con plaga en ${p.name}. Hay que tratarlas ya.`);
        if (thirsty) urgent.push(`💧 ${thirsty} planta${thirsty > 1 ? 's' : ''} con sed en ${p.name}.`);
        if (w.kind === 'storm' && p.plants.length) urgent.push(`⛈️ Tormenta en ${REGION_BY_ID[p.region].name}: mis plantas de ${p.name} lo van a pasar mal…`);
        if (w.kind === 'heat' && p.plants.length) urgent.push(`🔥 Ola de calor en ${REGION_BY_ID[p.region].name}: riega más y vigila los ácaros.`);
        if (p.plants.length === 0) urgent.push(`🌱 ${p.name} está vacía, patrón. ¡A sembrar!`);
      }
      const generic = [
        'La landrace crece el doble de bien en su tierra: Hindu Kush en Afganistán, Acapulco Gold en México…',
        'Al aire libre el sol es gratis, pero manda el clima. Las regiones húmedas piden ojo con el moho.',
        'Una parcela con buena nota de suelo y agua da más cosecha. Mira las tres barritas antes de comprar.',
        'Un jardinero del vivero cuida las parcelas igual que la sala: riega, abona y trata.',
        'Aquí es de noche mientras allá es de día: cada región tiene su hora local.',
      ];
      if (ps.length === 0) generic.unshift('Empieza por Sudamérica: es el clima más equilibrado. Y no olvides comprar semillas.');
      say2(urgent.length ? pick(urgent) : pick(generic));
    };
    const id = window.setInterval(tip, 9000);
    const first = window.setTimeout(tip, 7000);
    return () => { window.clearInterval(id); window.clearTimeout(first); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sale = region ? plotsForSale(region) : null;
  const r = region ? REGION_BY_ID[region] : null;
  const landrace = r ? seedBank.find((s) => s.strainTemplate.id === r.landrace) : undefined;
  const forecast = r ? [0, 1, 2, 3].map((k) => weatherOn(r, dayIndexOf(now) + k)) : [];

  const doBuy = (offerId: string, name: string) => {
    if (buyPlot(offerId, currency)) say2(`¡Ya es tuya, la ${name}! Ahora a sembrar.`, 'happy');
    else say2('Uy, no te alcanza para esa parcela. Junta más y volvemos.', 'sad');
  };

  const openPlot = (p: OwnedPlot) => { setPlotId(p.id); say2(`${p.name}, en ${REGION_BY_ID[p.region].name}. Toca una planta para verla de cerca.`); };

  return (
    <div className="pl-stage animate-fade-in">
      <div className="pl-stars" />
      <div className="relative z-10 p-4 sm:p-6 space-y-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-end">
          <Npc kind="farmer" text={say.text} mood={say.mood} moodKey={say.key} />
          <div className="space-y-2.5">
            <h1 className="font-serif text-2xl sm:text-3xl font-black tracking-[0.12em] text-sky-100 leading-none">PLANETA CHRONO</h1>
            <p className="text-[10.5px] font-mono uppercase tracking-[0.2em] text-sky-300/70">Parcelas NFT · 7 regiones · clima real</p>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              <span className="mk-panel px-2.5 py-1.5 text-neutral-200">🗺️ <b className="text-amber-300">{plots.length}</b> parcelas</span>
              <span className="mk-panel px-2.5 py-1.5 text-neutral-200">🌱 <b className="text-emerald-300">{totalPlants}</b> plantas</span>
              <span className={`mk-panel px-2.5 py-1.5 ${totalReady ? 'text-amber-300 border-amber-400/50' : 'text-neutral-200'}`}>🌾 <b>{totalReady}</b> listas</span>
              <button onClick={() => setCurrency((c) => (c === 'FLORA' ? 'SOL' : 'FLORA'))} className="mk-panel px-2.5 py-1.5 text-neutral-200 cursor-pointer hover:border-amber-400/50" title="Cambiar moneda de pago">
                {currency === 'FLORA' ? <Flame className="inline w-3.5 h-3.5 text-amber-300" /> : <Coins className="inline w-3.5 h-3.5 text-purple-300" />} <b className={currency === 'FLORA' ? 'text-amber-200' : 'text-purple-200'}><Bump value={currency === 'FLORA' ? floraBalance.toLocaleString() : String(solBalance)} /></b> {currency === 'FLORA' ? '$FLORA' : 'SOL'}
              </button>
            </div>
          </div>
        </div>

        {plot ? (
          <PlotScreen plot={plot} nowMs={now} onBack={() => setPlotId(null)} onOpenSeedBank={onOpenSeedBank} onSpeak={say2} />
        ) : (
          <>
            <div className="rounded-2xl overflow-hidden border border-sky-400/20 shadow-[0_0_40px_-20px_rgba(56,189,248,0.6)]">
              <WorldMap owned={owned} selected={region} onSelect={(id) => { setRegion(id); const rr = REGION_BY_ID[id]; say2(`${rr.emoji} ${rr.name}: ${rr.climate}. ${rr.blurb}`); }} onHover={setHover} nowMs={now} />
            </div>

            {r && sale ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] shop-swap" key={r.id}>
                <div className="hud-panel p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl leading-none">{r.emoji}</span>
                    <div><h2 className="font-serif text-xl font-black text-white leading-tight">{r.name}</h2><div className="text-[10.5px] font-mono uppercase tracking-wider" style={{ color: r.color }}>{r.climate}</div></div>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">{r.blurb}</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10.5px] font-mono">
                    <div className="mk-panel py-1.5"><div className="text-neutral-500 text-[9px]">TEMP</div><b className="text-white">{r.temp}°C</b></div>
                    <div className="mk-panel py-1.5"><div className="text-neutral-500 text-[9px]">HUMEDAD</div><b className="text-white">{r.rh}%</b></div>
                    <div className="mk-panel py-1.5"><div className="text-neutral-500 text-[9px]">LLUVIA</div><b className="text-white">{Math.round(r.rain * 100)}%</b></div>
                  </div>
                  <div className="space-y-1.5"><Bar label="Agua típica" value={r.base.water} color="linear-gradient(90deg,#0284c7,#7dd3fc)" /><Bar label="Sol típico" value={r.base.sunlight} color="linear-gradient(90deg,#ca8a04,#fde047)" /><Bar label="Suelo típico" value={r.base.soil} color="linear-gradient(90deg,#059669,#6ee7b7)" /></div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {forecast.map((f, i) => (
                      <div key={i} className="rounded-md border border-neutral-800 bg-neutral-950/60 px-1 py-1 text-center">
                        <div className="text-[9px] font-mono text-neutral-500">{i === 0 ? 'hoy' : i === 1 ? 'mañana' : `+${i} d`}</div>
                        <div className="text-lg leading-none">{f.emoji}</div><div className="text-[8.5px] font-mono text-neutral-300 truncate">{f.label}</div>
                      </div>
                    ))}
                  </div>
                  {landrace && (
                    <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-2.5">
                      <div className="text-[9.5px] font-mono uppercase tracking-wider text-emerald-300">Landrace nativa</div>
                      <div className="text-sm font-bold text-white">{landrace.strainTemplate.name}</div>
                      <div className="text-[10.5px] text-neutral-400">En esta región: {Math.round(terroirOf(landrace.strainTemplate.origin, r.id, r.base).growth * 100)} % de crecimiento y {Math.round(terroirOf(landrace.strainTemplate.origin, r.id, r.base).yield * 100)} % de cosecha.</div>
                      <button className="care-btn w-full mt-1.5" onClick={onOpenSeedBank}><Sprout className="w-3.5 h-3.5" /> Comprar semillas</button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-serif text-sm font-bold tracking-[0.14em] uppercase text-sky-200 flex items-center gap-2"><MapPin className="w-4 h-4" /> Parcelas a la venta</h3>
                    <span className="text-[10px] font-mono text-neutral-400">quedan {sale.left} de {r.supply}</span>
                  </div>
                  {sale.offers.length === 0 && <p className="text-sm text-neutral-500 py-6 text-center">No quedan parcelas en esta región.</p>}
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {sale.offers.map((o, i) => {
                      const price = currency === 'FLORA' ? o.priceFlora : o.priceSol;
                      const ok = (currency === 'FLORA' ? floraBalance : solBalance) >= price;
                      return (
                        <div key={o.id} className="pl-offer shop-in" style={{ ['--d' as string]: `${i * 50}ms`, ['--rc' as string]: r.color } as React.CSSProperties}>
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-white">{o.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full border" style={{ color: r.color, borderColor: r.color }}>nota {o.landRating}</span>
                          </div>
                          <div className="space-y-1 my-2"><Bar label="Agua" value={o.ratings.water} color="linear-gradient(90deg,#0284c7,#7dd3fc)" /><Bar label="Sol" value={o.ratings.sunlight} color="linear-gradient(90deg,#ca8a04,#fde047)" /><Bar label="Suelo" value={o.ratings.soil} color="linear-gradient(90deg,#059669,#6ee7b7)" /></div>
                          <button className={`mk-buy !py-2.5 !text-[11px] ${ok ? '' : 'is-poor'}`} onClick={() => doBuy(o.id, o.name)}>
                            <span className="mk-buy-shine" /><span>Comprar</span>
                            <span className="ml-auto flex items-center gap-1 font-mono">{currency === 'FLORA' ? <Flame className="w-3.5 h-3.5" /> : <Coins className="w-3.5 h-3.5" />}{price}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-xs font-mono text-sky-200/60 py-1">Toca una región para ver su clima, su landrace y las parcelas a la venta.</p>
            )}

            {plots.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-serif text-sm font-bold tracking-[0.14em] uppercase text-amber-200">Mis parcelas</h3>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {plots.map((p) => {
                    const rr = REGION_BY_ID[p.region];
                    const ready = p.plants.filter((x) => x.stage === 'ready_harvest').length;
                    const sick = p.plants.filter((x) => x.pest).length;
                    return (
                      <button key={p.id} onClick={() => openPlot(p)} className="pl-mine" style={{ ['--rc' as string]: rr.color } as React.CSSProperties}>
                        <span className="text-2xl">{rr.emoji}</span>
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block font-mono font-bold text-white truncate">{p.name}</span>
                          <span className="block text-[10px] font-mono text-neutral-400">{rr.name} · nota {p.landRating} · {p.plants.length}/36</span>
                        </span>
                        {ready > 0 && <span className="px-1.5 rounded bg-amber-400 text-neutral-950 text-[10px] font-black">🌾{ready}</span>}
                        {sick > 0 && <span className="px-1.5 rounded bg-pink-400 text-neutral-950 text-[10px] font-black">🐛{sick}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
