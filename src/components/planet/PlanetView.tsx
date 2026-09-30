import React, { Component, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Coins, Flame, GraduationCap, MapPin, Sprout } from 'lucide-react';
import { ScreenTour, tourSeen, type TourStep } from '../guide/ScreenTour';
import { ListNftButton } from '../market/ListNft';
import { useGame } from '../../context/GameContext';
import { Npc, useNpcSay, type Mood } from '../npc/Npc';
import { NpcMissions } from '../missions/NpcMissions';
import { WorldMap, NEXT_SKIN, SKIN_LABEL, type MapSkin } from './WorldMap';
import { PlotScreen } from './PlotScreen';
import { Bump } from '../ResourceBar';
import { dayIndexOf, REGION_BY_ID, REGIONS, terroirOf, weatherOn } from '../../sim/terroir';
import { isThirsty } from '../../sim/engine';
import type { OwnedPlot, RegionId } from '../../types';
import { LandCard } from '../LandCard';
import { byRarityThenRating, landCardOf } from '../../utils/land';
import { t as tr, k } from '../../i18n';
import { sceneArt3d, useNpcArt3d } from '../npc/art3d';

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


const Globe3D = lazy(() => import('./Globe3D').then((m) => ({ default: m.Globe3D })));
class GlobeBoundary extends Component<{ fallback: React.ReactNode; onFail: () => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.warn('Globo 3D no disponible, se usa el mapa plano', err); this.props.onFail(); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
const webglOk = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
const GLOBE_KEY = 'ybe_globe';
const SKIN_KEY = 'ybe_map_skin';
const readSkin = (): MapSkin => { try { const v = localStorage.getItem(SKIN_KEY); return v === 'parchment' || v === 'classic' ? v : 'monti'; } catch { return 'monti'; } };
const readGlobe = () => { try { return webglOk && localStorage.getItem(GLOBE_KEY) === '1'; } catch { return false; } };

/** Chrono's walk-through of the planet (components/guide/ScreenTour.tsx) */
const MAP_TOUR: TourStep[] = [
  { title: k('Cultivar afuera'), say: k('Aquí cultivas en tierras propias: 36 plantas por tierra, con sol y clima de verdad. Una tierra bien sembrada cosecha muchísimo más que la sala.') },
  { anchor: 'pl-map', title: k('1. El planeta'), say: k('Siete regiones, cada una con su clima: sol, lluvia, frío y calor que cambian cada día (el mismo para todos). Toca una región para verla.') },
  { anchor: 'pl-region', title: k('2. La región'), say: k('Su clima, el pronóstico de 4 días y su landrace nativa: la genética que mejor rinde aquí, hasta +30 % de cosecha. Compra sus semillas antes de sembrar.') },
  { anchor: 'pl-offers', title: k('3. Tierras a la venta'), say: k('Cada tierra tiene nota de agua, sol y suelo: más nota, más cosecha. Ojo: cada tierra que ya tienes hace que la siguiente cueste 25 % más. Elige bien.') },
  { anchor: 'pl-mylands', title: k('4. Tus tierras'), say: k('Aquí aparecen las tuyas, con las plantas listas (🌾) y las plagas (🐛). Tócala para entrar a sembrar y cuidar.') },
  { anchor: 'pl-tools', title: k('5. Ayuda'), say: k('¿Muchas plantas? Un jardinero riega, abona y trata plagas también en tus tierras mientras no estás.') },
  { anchor: 'pl-guide', title: k('¡A cultivar!'), say: k('Con la genética de su región y buen cuidado, una tierra está lista en 3 a 7 días. Si lo olvidas, toca «Guía de Chrono».') },
];

/** The Planet: world map, the seven regions, the plots you own and Tomás, the farmer who guides you. */
export const PlanetView: React.FC<{ onOpenSeedBank: () => void; onOpenMarket: (cat?: string) => void }> = ({ onOpenSeedBank, onOpenMarket }) => {
  const { plots, plotsForSale, buyPlot, floraBalance, solBalance, seedBank, ufoCaught } = useGame();
  const now = useNow(30000);
  const art3d = useNpcArt3d();
  const [region, setRegion] = useState<RegionId | null>(null);
  const [hover, setHover] = useState<RegionId | null>(null);
  const [plotId, setPlotId] = useState<string | null>(null);
  // Chrono's walk-through of the planet (the first time, and from the «Guía de Chrono» button); it picks a region so the region
  // steps have something to show
  const [tour, setTour] = useState(false);
  useEffect(() => { if (tourSeen('outdoor-map')) return; const id = window.setTimeout(() => setTour(true), 900); return () => window.clearTimeout(id); }, []);
  useEffect(() => { if (tour && !region) setRegion((plots[0]?.region as RegionId | undefined) ?? 'south_america'); }, [tour]); // eslint-disable-line react-hooks/exhaustive-deps
  /** the map zooms into the region of the plot you open (origin in % of the map) before the plot screen replaces it */
  const [globe, setGlobe] = useState<boolean>(readGlobe);
  const [skin, setSkin] = useState<MapSkin>(readSkin);
  const nextSkin = () => setSkin((s) => { const n = NEXT_SKIN[s]; try { localStorage.setItem(SKIN_KEY, n); } catch { /* private mode */ } return n; });
  const toggleGlobe = () => setGlobe((g) => { const next = !g; try { localStorage.setItem(GLOBE_KEY, next ? '1' : '0'); } catch { /* private mode */ } return next; });
  const [zoom, setZoom] = useState<{ ox: number; oy: number } | null>(null);
  const [currency, setCurrency] = useState<'FLORA' | 'SOL'>('FLORA');
  const { say, speak } = useNpcSay(tr('¡Buenas, patrón! Soy Tomás. Toca una región del mapa: cada tierra tiene su clima… y sus landrace.'));
  const lastSpoke = useRef(Date.now());
  const say2 = (text: string, mood: Mood = 'idle') => { lastSpoke.current = Date.now(); speak(text, mood); };

  const plot = plots.find((p) => p.id === plotId) ?? null;
  const owned: Partial<Record<RegionId, number>> = {};
  plots.forEach((p) => { owned[p.region] = (owned[p.region] ?? 0) + 1; });
  const readyByRegion: Partial<Record<RegionId, number>> = {};
  plots.forEach((p) => { const n = p.plants.filter((x) => x.stage === 'ready_harvest').length; if (n) readyByRegion[p.region] = (readyByRegion[p.region] ?? 0) + n; });
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
        if (ready) urgent.push(tr('🌾 ¡{ready} planta{v1} lista{v2} para cosechar en {name}!', { ready, v1: ready > 1 ? 's' : '', v2: ready > 1 ? 's' : '', name: p.name }));
        if (sick) urgent.push(tr('🐛 Hay {sick} planta{v1} con plaga en {name}. Hay que tratarlas ya.', { sick, v1: sick > 1 ? 's' : '', name: p.name }));
        if (thirsty) urgent.push(tr('💧 {thirsty} planta{v1} con sed en {name}.', { thirsty, v1: thirsty > 1 ? 's' : '', name: p.name }));
        if (w.kind === 'storm' && p.plants.length) urgent.push(tr('⛈️ Tormenta en {name}: mis plantas de {v1} lo van a pasar mal…', { name: REGION_BY_ID[p.region].name, v1: p.name }));
        if (w.kind === 'heat' && p.plants.length) urgent.push(tr('🔥 Ola de calor en {name}: riega más y vigila los ácaros.', { name: REGION_BY_ID[p.region].name }));
        if (p.plants.length === 0) urgent.push(tr('🌱 {name} está vacía, patrón. ¡A sembrar!', { name: p.name }));
      }
      const generic = [
        tr('La landrace crece el doble de bien en su tierra: Hindu Kush en Afganistán, Acapulco Gold en México…'),
        tr('Al aire libre el sol es gratis, pero manda el clima. Las regiones húmedas piden ojo con el moho.'),
        tr('Una parcela con buena nota de suelo y agua da más cosecha. Mira las tres barritas antes de comprar.'),
        tr('Un jardinero del vivero cuida las parcelas igual que la sala: riega, abona y trata.'),
        tr('Aquí es de noche mientras allá es de día: cada región tiene su hora local.'),
      ];
      if (ps.length === 0) generic.unshift(tr('Empieza por Sudamérica: es el clima más equilibrado. Y no olvides comprar semillas.'));
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

  const doBuy = async (offerId: string, name: string) => {
    if (await buyPlot(offerId, currency)) say2(tr('¡Ya es tuya, la {name}! Ahora a sembrar.', { name }), 'happy');
    else say2(tr('Uy, no pudo ser: no te alcanza o alguien se te adelantó con esa parcela.'), 'sad');
  };

  const openPlot = (p: OwnedPlot) => {
    const rr = REGION_BY_ID[p.region];
    const calm = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (calm) setPlotId(p.id);
    else { setZoom({ ox: ((rr.lon + 180) / 360) * 100, oy: ((90 - rr.lat) / 180) * 100 }); window.setTimeout(() => { setPlotId(p.id); setZoom(null); }, 460); }
    say2(tr('{name}, en {v1}. Toca una planta para verla de cerca.', { name: p.name, v1: REGION_BY_ID[p.region].name }));
  };

  return (
    <div className={`pl-stage animate-fade-in ${art3d ? 'pl-stage--3d' : ''}`}>
      <div className="pl-stars" />
      {/* 3D trial: Tomás's field covers the top of the whole planet stage */}
      {art3d && <div className="pl-scene" style={{ backgroundImage: `url(${sceneArt3d('farmer')})` }} aria-hidden />}
      <div className="relative z-10 p-4 sm:p-6 space-y-5">
        <div className={`grid gap-4 items-end ${art3d ? 'pl-hero' : 'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]'}`}>
          <Npc kind="farmer" text={tr(say.text)} mood={say.mood} moodKey={say.key} noScene={art3d} large={art3d} />
          <div className={`space-y-2.5 ${art3d ? 'pl-board' : ''}`}>
            <h1 className="font-serif text-2xl sm:text-3xl font-black tracking-[0.12em] text-sky-100 leading-none">{tr('PLANETA YIELD')}</h1>
            <p className="text-[10.5px] font-mono uppercase tracking-[0.2em] text-sky-300/70">{tr('Parcelas NFT · 7 regiones · clima real')}</p>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              <div className={art3d ? 'pl-stats' : 'contents'}>
              <span className="mk-panel px-2.5 py-1.5 text-neutral-200">🗺️ <b className="text-amber-300">{plots.length}</b>{' '}{tr('parcelas')}</span>
              <span className="mk-panel px-2.5 py-1.5 text-neutral-200">🌱 <b className="text-emerald-300">{totalPlants}</b>{' '}{tr('plantas')}</span>
              <span className={`mk-panel px-2.5 py-1.5 ${totalReady ? 'text-amber-300 border-amber-400/50' : 'text-neutral-200'}`}>🌾 <b>{totalReady}</b>{' '}{tr('listas')}</span>
              </div>
              <button onClick={nextSkin} className="mk-panel px-2.5 py-1.5 text-amber-200 cursor-pointer hover:border-amber-400/60" title={tr('Cambia el estilo del mapa · ahora: {v0}', { v0: SKIN_LABEL[skin] })} data-testid="skin-toggle">{SKIN_LABEL[NEXT_SKIN[skin]]}</button>
              {webglOk && <button onClick={toggleGlobe} className="mk-panel px-2.5 py-1.5 text-sky-200 cursor-pointer hover:border-sky-400/60" title={tr('Cambia entre el mapa plano y un globo 3D (usa más GPU)')}>{globe ? tr('🗺️ Mapa plano') : tr('🌐 Globo 3D')}</button>}
              <button onClick={() => setTour(true)} data-tour="pl-guide" className="mk-panel px-2.5 py-1.5 text-amber-200 cursor-pointer hover:border-amber-400/60 inline-flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />{tr('Guía de Chrono')}</button>
              <button onClick={() => onOpenMarket('service')} data-tour="pl-tools" className="mk-panel px-2.5 py-1.5 text-emerald-200 cursor-pointer hover:border-emerald-400/60" title={tr('Grow Market → Servicios de vivero')}>{tr('🧑‍🌾 Contratar jardinero')}</button>
              <button onClick={onOpenSeedBank} className="mk-panel px-2.5 py-1.5 text-emerald-200 cursor-pointer hover:border-emerald-400/60" title={tr('Banco de semillas')}>{tr('🌱 Semillas')}</button>
              <button onClick={() => setCurrency((c) => (c === 'FLORA' ? 'SOL' : 'FLORA'))} className="mk-panel px-2.5 py-1.5 text-neutral-200 cursor-pointer hover:border-amber-400/50" title={tr('Cambiar moneda de pago')}>
                {currency === 'FLORA' ? <Flame className="inline w-3.5 h-3.5 text-amber-300" /> : <Coins className="inline w-3.5 h-3.5 text-purple-300" />} <b className={currency === 'FLORA' ? 'text-amber-200' : 'text-purple-200'}><Bump value={currency === 'FLORA' ? floraBalance.toLocaleString() : String(solBalance)} /></b> {currency === 'FLORA' ? '$FLORA' : 'SOL'}
              </button>
            </div>
          </div>
        </div>

        <NpcMissions npc="farmer" onSay={say2} />
        <ScreenTour id="outdoor-map" steps={MAP_TOUR} open={tour && !plot} onClose={() => setTour(false)} />

        {plot ? (
          <div className="pl-plot-in"><PlotScreen plot={plot} nowMs={now} onBack={() => setPlotId(null)} onOpenSeedBank={onOpenSeedBank} onSpeak={say2} /></div>
        ) : (
          <>
            <div className="rounded-2xl overflow-hidden border border-sky-400/20 shadow-[0_0_40px_-20px_rgba(56,189,248,0.6)]" data-tour="pl-map">
              <div className={`pl-zoomwrap ${zoom ? 'pl-zooming' : ''}`} style={zoom ? { transformOrigin: `${zoom.ox}% ${zoom.oy}%` } : undefined}>
              {(() => {
                const flat = <WorldMap owned={owned} ready={readyByRegion} selected={region} onSelect={(id) => { setRegion(id); const rr = REGION_BY_ID[id]; say2(`${rr.emoji} ${rr.name}: ${rr.climate}. ${rr.blurb}`); }} onHover={setHover} nowMs={now} skin={skin} onUfoCaught={(reg) => { const xp = ufoCaught(); if (xp > 0) { say2(tr('¡Un ovni sobre {reg}! Me saludó y me dejó {xp} XP. Dicen que abducen vacas… y plantas.', { reg, xp }), 'happy'); } else say2(tr('El ovni ya se fue de gira: hoy no te da más XP, pero sigue saludando.'), 'idle'); }} />;
                if (!globe) return flat;
                return (
                  <GlobeBoundary fallback={flat} onFail={() => setGlobe(false)}>
                    <Suspense fallback={flat}><Globe3D owned={owned} ready={readyByRegion} selected={region} onSelect={(id) => { setRegion(id); const rr = REGION_BY_ID[id]; say2(`${rr.emoji} ${rr.name}: ${rr.climate}. ${rr.blurb}`); }} onHover={setHover} nowMs={now} skin={skin} /></Suspense>
                  </GlobeBoundary>
                );
              })()}
              </div>
            </div>

            {r && sale ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] shop-swap" key={r.id}>
                <div className="hud-panel p-4 space-y-3" data-tour="pl-region">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl leading-none">{r.emoji}</span>
                    <div><h2 className="font-serif text-xl font-black text-white leading-tight">{tr(r.name)}</h2><div className="text-[10.5px] font-mono uppercase tracking-wider" style={{ color: r.color }}>{r.climate}</div></div>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">{tr(r.blurb)}</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-[10.5px] font-mono">
                    <div className="mk-panel py-1.5"><div className="text-neutral-500 text-[9px]">{tr('TEMP')}</div><b className="text-white">{r.temp}°C</b></div>
                    <div className="mk-panel py-1.5"><div className="text-neutral-500 text-[9px]">{tr('HUMEDAD')}</div><b className="text-white">{r.rh}%</b></div>
                    <div className="mk-panel py-1.5"><div className="text-neutral-500 text-[9px]">{tr('LLUVIA')}</div><b className="text-white">{Math.round(r.rain * 100)}%</b></div>
                  </div>
                  <div className="space-y-1.5"><Bar label={tr('Agua típica')} value={r.base.water} color="linear-gradient(90deg,#0284c7,#7dd3fc)" /><Bar label={tr('Sol típico')} value={r.base.sunlight} color="linear-gradient(90deg,#ca8a04,#fde047)" /><Bar label={tr('Suelo típico')} value={r.base.soil} color="linear-gradient(90deg,#059669,#6ee7b7)" /></div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {forecast.map((f, i) => (
                      <div key={i} className="rounded-md border border-neutral-800 bg-neutral-950/60 px-1 py-1 text-center">
                        <div className="text-[9px] font-mono text-neutral-500">{i === 0 ? tr('hoy') : i === 1 ? tr('mañana') : `+${i} d`}</div>
                        <div className="text-lg leading-none">{f.emoji}</div><div className="text-[8.5px] font-mono text-neutral-300 truncate">{tr(f.label)}</div>
                      </div>
                    ))}
                  </div>
                  {landrace && (
                    <div className="rounded-lg border border-emerald-400/30 bg-emerald-400/5 p-2.5">
                      <div className="text-[9.5px] font-mono uppercase tracking-wider text-emerald-300">{tr('Landrace nativa')}</div>
                      <div className="text-sm font-bold text-white">{tr(landrace.strainTemplate.name)}</div>
                      <div className="text-[10.5px] text-neutral-400">{tr('En esta región: {v0} % de crecimiento y {v1} % de cosecha.', { v0: Math.round(terroirOf(landrace.strainTemplate.origin, r.id, r.base).growth * 100), v1: Math.round(terroirOf(landrace.strainTemplate.origin, r.id, r.base).yield * 100) })}</div>
                      <button className="care-btn w-full mt-1.5" onClick={onOpenSeedBank}><Sprout className="w-3.5 h-3.5" />{' '}{tr('Comprar semillas')}</button>
                    </div>
                  )}
                </div>

                <div className="space-y-3" data-tour="pl-offers">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-serif text-sm font-bold tracking-[0.14em] uppercase text-sky-200 flex items-center gap-2"><MapPin className="w-4 h-4" />{' '}{tr('Parcelas a la venta')}</h3>
                    <span className="text-[10px] font-mono text-neutral-400">{tr('quedan {left} de {supply}', { left: sale.left, supply: r.supply })}</span>
                  </div>
                  {sale.offers.length === 0 && <p className="text-sm text-neutral-500 py-6 text-center">{tr('No quedan parcelas en esta región.')}</p>}
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {sale.offers.map((o, i) => {
                      const price = currency === 'FLORA' ? o.priceFlora : o.priceSol;
                      const ok = (currency === 'FLORA' ? floraBalance : solBalance) >= price;
                      return (
                        <div key={o.id} className="pl-offer shop-in" style={{ ['--d' as string]: `${i * 50}ms`, ['--rc' as string]: r.color } as React.CSSProperties}>
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-white">{tr(o.name)}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full border" style={{ color: r.color, borderColor: r.color }}>{tr('nota {landRating}', { landRating: o.landRating })}</span>
                          </div>
                          <div className="space-y-1 my-2"><Bar label={tr('Agua')} value={o.ratings.water} color="linear-gradient(90deg,#0284c7,#7dd3fc)" /><Bar label={tr('Sol')} value={o.ratings.sunlight} color="linear-gradient(90deg,#ca8a04,#fde047)" /><Bar label={tr('Suelo')} value={o.ratings.soil} color="linear-gradient(90deg,#059669,#6ee7b7)" /></div>
                          <button className={`mk-buy !py-2.5 !text-[11px] ${ok ? '' : 'is-poor'}`} onClick={() => doBuy(o.id, o.name)}>
                            <span className="mk-buy-shine" /><span>{tr('Comprar')}</span>
                            <span className="ml-auto flex items-center gap-1 font-mono">{currency === 'FLORA' ? <Flame className="w-3.5 h-3.5" /> : <Coins className="w-3.5 h-3.5" />}{price}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-xs font-mono text-sky-200/60 py-1">{tr('Toca una región para ver su clima, su landrace y las parcelas a la venta.')}</p>
            )}

            {plots.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-serif text-sm font-bold tracking-[0.14em] uppercase text-amber-200">{tr('Mis tierras NFT')}{' '}<span className="font-mono text-[11px] text-neutral-400">{plots.length}</span></h3>
                  <button type="button" onClick={() => onOpenMarket?.('land')} className="text-[11px] font-mono text-sky-200 underline underline-offset-2 cursor-pointer hover:text-white">{tr('Comprar más en el Mercado →')}</button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="my-lands" data-tour="pl-mylands">
                  {[...plots].map((p) => ({ p, c: landCardOf({ ...p }) })).sort((x, y) => byRarityThenRating(x.c, y.c)).map(({ p, c }) => {
                    const ready = p.plants.filter((x) => x.stage === 'ready_harvest').length;
                    const sick = p.plants.filter((x) => x.pest).length;
                    return (
                      <LandCard key={p.id} card={c} onClick={() => openPlot(p)}
                        badges={<>{ready > 0 && <span className="px-1.5 rounded bg-amber-400 text-neutral-950 text-[10px] font-black">🌾{ready}</span>}{sick > 0 && <span className="px-1.5 rounded bg-pink-400 text-neutral-950 text-[10px] font-black">🐛{sick}</span>}</>}
                        footer={<div className="flex items-center justify-between text-[10.5px] font-mono text-neutral-300"><span>{tr('{length}/36 plantas', { length: p.plants.length })}</span><span className="flex items-center gap-2"><ListNftButton what={{ nftId: p.id }} name={c.name} rarity={c.rarity} className="sr-btn !py-0.5 !text-[10px]" /><span className="text-emerald-300">{tr('Entrar →')}</span></span></div>} />
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
