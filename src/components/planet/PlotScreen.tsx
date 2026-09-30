import { STAGE_LABEL } from '../cultivo/plantInfo';
import React, { useEffect, useMemo, useState } from 'react';
import { FarmScene } from './FarmScene';
import { ArrowLeft, Droplets, FlaskConical, Bug, GraduationCap, Scissors, Sprout, Sun, Moon, Thermometer, Wind, Sparkles } from 'lucide-react';
import { ScreenTour, tourSeen, type TourStep } from '../guide/ScreenTour';
import { useGame } from '../../context/GameContext';
import { PlantView } from '../PlantView';
import { formatDuration, isMale, isThirsty, maleCount, PEST_INFO, sexRevealed, SEX_REVEAL_AT } from '../../sim/engine';
import { dayIndexOf, PLOT_SIZE, REGION_BY_ID, siteConditions, terroirOf, weatherOn } from '../../sim/terroir';
import type { OwnedPlot, PlantInGrow } from '../../types';
import type { Mood } from '../npc/Npc';
import { t as tr, k, localize } from '../../i18n';

/* ───────────────────────── one plant of the field ───────────────────────── */

const STAGE_COLOR: Record<string, string> = { seed: '#a16207', seedling: '#84cc16', vegetative: '#22c55e', flowering: '#c084fc', maturation: '#f0abfc', ready_harvest: '#fbbf24' };

export const PlantTile: React.FC<{ plant?: PlantInGrow; selected: boolean; index: number; onClick: () => void }> = ({ plant, selected, index, onClick }) => {
  if (!plant) {
    return (
      <button onClick={onClick} className="pl-tile pl-tile--empty" aria-label={tr('Hueco {v0} vacío', { v0: index + 1 })}>
        <span className="pl-mound" />
      </button>
    );
  }
  const g = Math.max(0, Math.min(1, plant.progressPercent / 100));
  const s = 0.5 + g * 0.55;
  const leaf = plant.health > 70 ? '#22c55e' : plant.health > 45 ? '#a3a324' : '#8a6d2a';
  const c = plant.strain.colorTheme || STAGE_COLOR[plant.stage];
  const thirsty = isThirsty(plant);
  return (
    <button onClick={onClick} className={`pl-tile ${selected ? 'is-sel' : ''} ${plant.stage === 'ready_harvest' ? 'is-ready' : ''}`} aria-label={tr('Planta {v0}: {name}, {v2} %', { v0: index + 1, name: plant.strain.name, v2: Math.round(plant.progressPercent) })}>
      <svg viewBox="0 0 40 40" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
        <ellipse cx="20" cy="36" rx="9" ry="2.6" fill="#000" opacity=".3" />
        <g className="pl-sway" style={{ animationDelay: `${-(index % 9) * 0.37}s`, transformOrigin: '20px 36px' }}>
          <g transform={`translate(20 36) scale(${s}) translate(-20 -36)`}>
            {plant.stage === 'seed' ? (
              <><ellipse cx="20" cy="34" rx="4.4" ry="3" fill="#7c4a22" /><ellipse cx="20" cy="33" rx="1.8" ry="1.2" fill="#c08a4a" /></>
            ) : (
              <>
                <path d="M20 36 V18" stroke="#3f8f3a" strokeWidth="2.4" strokeLinecap="round" />
                {[[-1, 30, 1.0], [1, 27, 1.0], [-1, 23, 0.85], [1, 20, 0.85]].slice(0, plant.stage === 'seedling' ? 2 : 4).map(([d, y, k], i) => (
                  <path key={i} d={`M20 ${y} q${d * 9 * k} -6 ${d * 12 * k} 1 q${-d * 5 * k} 5 ${-d * 12 * k} -1Z`} fill={leaf} stroke="#14532d" strokeWidth=".6" />
                ))}
                {plant.stage === 'seedling' && <path d="M20 19 q-4 -6 0 -9 q4 3 0 9Z" fill={leaf} />}
                {(plant.stage === 'flowering' || plant.stage === 'maturation' || plant.stage === 'ready_harvest') && (
                  <>
                    <ellipse cx="20" cy="13" rx="4.2" ry="7" fill={plant.stage === 'ready_harvest' || plant.stage === 'maturation' ? '#fbbf24' : c} stroke="#0008" strokeWidth=".5" />
                    <ellipse cx="14" cy="21" rx="2.6" ry="4" fill={plant.stage === 'ready_harvest' ? '#f59e0b' : c} opacity=".9" />
                    <ellipse cx="26" cy="21" rx="2.6" ry="4" fill={plant.stage === 'ready_harvest' ? '#f59e0b' : c} opacity=".9" />
                    <circle cx="19" cy="9" r="1.1" fill="#fff" opacity=".8" />
                  </>
                )}
                {plant.stage === 'vegetative' && <path d="M20 19 q-5 -8 0 -12 q5 4 0 12Z" fill={leaf} stroke="#14532d" strokeWidth=".6" />}
              </>
            )}
          </g>
        </g>
      </svg>
      {plant.pest && <span className="pl-badge pl-badge--pest" title={tr(PEST_INFO[plant.pest.kind].label)}>{PEST_INFO[plant.pest.kind].emoji}</span>}
      {!plant.pest && thirsty && <span className="pl-badge pl-badge--thirst" title={tr('Necesita agua')}>💧</span>}
      {isMale(plant) && sexRevealed(plant) && <span className="pl-badge pl-badge--male" title={tr('Macho: quítalo antes de la floración')}>♂</span>}
      {plant.pollinated && <span className="pl-badge pl-badge--bee" title={tr('Polinizada: menos flor, dará semillas')}>🐝</span>}
    </button>
  );
};

/* ───────────────────────── the plot ───────────────────────── */

const WEATHER_TIP: Record<string, string> = localize({
  sunny: k('Buen día de sol: crecen rápido pero el sustrato se seca.'),
  cloudy: k('Nublado: llega menos luz, crecen más despacio.'),
  rain: k('Llueve: ahorras riego, pero la humedad favorece el moho.'),
  storm: k('¡Tormenta! Las plantas sufren daño mientras dure.'),
  heat: k('Ola de calor: riega más y vigila los ácaros.'),
  cold: k('Frente frío: casi no crecen hasta que suba la temperatura.'),
}, ['sunny', 'cloudy', 'rain', 'storm', 'heat', 'cold']);

/** Chrono's walk-through of a plot (components/guide/ScreenTour.tsx) */
const PLOT_TOUR: TourStep[] = [
  { anchor: 'plot-ideal', title: k('1. La genética ideal'), say: k('Cada tierra tiene su genética ideal: la landrace de su región. Sembrada aquí rinde hasta un 30 % más; otras rinden bastante menos y tardan más.') },
  { anchor: 'plot-field', title: k('2. Tu campo'), say: k('36 lugares para plantas. Toca uno vacío para sembrar, o una planta para ver cómo está y cuánto le falta.') },
  { anchor: 'plot-care', title: k('3. Cuidarlas'), say: k('Riega las sedientas, abona y trata plagas. Al aire libre la tierra se seca más con calor y la lluvia riega sola. Cuando haya 🌾, cosecha.') },
  { anchor: 'plot-weather', title: k('4. El clima'), say: k('Aquí manda el cielo: de noche crecen poco, el frío las frena y las tormentas les quitan salud. Mira el pronóstico para planear.') },
  { anchor: 'plot-guide', title: k('¡Listo!'), say: k('Con buen cuidado, una tierra está lista en 3 a 7 días. Si lo olvidas, toca «Guía de Chrono».') },
];

export const PlotScreen: React.FC<{
  plot: OwnedPlot;
  nowMs: number;
  onBack: () => void;
  onOpenSeedBank: () => void;
  onSpeak: (text: string, mood?: Mood) => void;
}> = ({ plot, nowMs, onBack, onOpenSeedBank, onSpeak }) => {
  const { plantPlot, waterPlot, feedPlot, treatPests, harvestPlot, plotEta, seedBank, seedInventory, resources, removeMales, keepMaleAsFather } = useGame();
  const region = REGION_BY_ID[plot.region];
  const [sel, setSel] = useState<number | null>(null);
  const [planting, setPlanting] = useState(false);
  const [shower, setShower] = useState(0);
  // Chrono explains the plot the first time the player opens one
  const [tour, setTour] = useState(false);
  useEffect(() => { if (tourSeen('outdoor-plot')) return; const id = window.setTimeout(() => setTour(true), 700); return () => window.clearTimeout(id); }, []);
  useEffect(() => { if (!shower) return; const t = window.setTimeout(() => setShower(0), 1700); return () => window.clearTimeout(t); }, [shower]);

  const now = siteConditions(plot.region, plot.ratings, nowMs);
  const forecast = [0, 1, 2, 3].map((k) => weatherOn(region, dayIndexOf(nowMs) + k));
  const bySlot = useMemo(() => { const m = new Map<number, PlantInGrow>(); plot.plants.forEach((p) => m.set(p.slotIndex ?? -1, p)); return m; }, [plot.plants]);
  const growing = plot.plants.length;
  const ready = plot.plants.filter((p) => p.stage === 'ready_harvest').length;
  const thirsty = plot.plants.filter(isThirsty).length;
  const sick = plot.plants.filter((p) => p.pest).length;
  const males = maleCount(plot.plants);
  const plant = sel !== null ? bySlot.get(sel) : undefined;
  const w = forecast[0];

  const seedsOwned = seedBank.filter((s) => (seedInventory[s.id] || 0) > 0);
  // the strain this land was made for (its region's landrace): the biggest harvest on this plot
  const ideal = seedBank.find((s) => s.strainTemplate.id === region.landrace);
  const idealT = ideal ? terroirOf(ideal.strainTemplate.origin, plot.region, plot.ratings) : null;
  const idealHave = ideal ? seedInventory[ideal.id] || 0 : 0;

  const act = (fn: () => void, say: string, mood: Mood = 'happy') => { fn(); onSpeak(say, mood); };

  return (
    <div className="space-y-4">
      <ScreenTour id="outdoor-plot" steps={PLOT_TOUR} open={tour} onClose={() => setTour(false)} />
      {/* header */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="care-btn"><ArrowLeft className="w-3.5 h-3.5" />{' '}{tr('Outdoor')}</button>
        <button onClick={() => setTour(true)} data-tour="plot-guide" className="care-btn ml-auto order-last"><GraduationCap className="w-3.5 h-3.5" />{' '}{tr('Guía de Chrono')}</button>
        <div className="min-w-0">
          <h2 className="font-serif text-xl font-black text-white leading-tight">{region.emoji} {tr(plot.name)} <span className="text-sm font-mono font-normal text-neutral-400">· {tr(region.name)} · {region.climate}</span></h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] font-mono text-neutral-400 mt-0.5">
            <span>{tr('Nota')}{' '}<b className="text-amber-300">{plot.landRating}</b>/10</span>
            <span>{tr('💧 agua')}{' '}<b className="text-sky-300">{plot.ratings.water}</b></span>
            <span>{tr('☀️ sol')}{' '}<b className="text-yellow-300">{plot.ratings.sunlight}</b></span>
            <span>{tr('🌱 suelo')}{' '}<b className="text-emerald-300">{plot.ratings.soil}</b></span>
            <span>{tr('{growing}/{PLOT_SIZE} plantas', { growing, PLOT_SIZE })}</span>
          </div>
        </div>
      </div>

      {/* the ideal strain for this land, always in sight: planting anything else loses a big part of the harvest */}
      {ideal && idealT && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-400/40 bg-emerald-400/[0.07] px-3.5 py-2.5" data-tour="plot-ideal">
          <Sprout className="w-5 h-5 text-emerald-300 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">{tr('Genética ideal para esta tierra')}</div>
            <div className="text-[13px] text-white"><b>{tr(ideal.strainTemplate.name)}</b>{' '}<span className="text-emerald-200">{tr('· crece {v0} % · cosecha {v1} %', { v0: Math.round(idealT.growth * 100), v1: Math.round(idealT.yield * 100) })}</span></div>
            <div className="text-[10.5px] text-neutral-400">{tr('Es la landrace de {name}: aquí da hasta un 30 % más que en otra tierra. Otras genéticas rinden bastante menos.', { name: tr(region.name) })}</div>
          </div>
          {idealHave > 0
            ? <button className="care-btn care-btn--gold" disabled={growing >= PLOT_SIZE} onClick={() => { const n = Math.min(idealHave, PLOT_SIZE - growing); if (plantPlot(plot.id, ideal.id, n)) onSpeak(tr('¡{name} en su tierra! Esto va a dar un cosechón.', { name: ideal.strainTemplate.name }), 'happy'); }}><Sprout className="w-3.5 h-3.5" />{' '}{tr('Sembrar las {v0} que tienes', { v0: Math.min(idealHave, PLOT_SIZE - growing) })}</button>
            : <button className="care-btn" onClick={onOpenSeedBank}><Sparkles className="w-3.5 h-3.5" />{' '}{tr('Comprar semillas de {name}', { name: tr(ideal.strainTemplate.name) })}</button>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* field */}
        <div className="space-y-3">
          <div data-tour="plot-field" className={`pl-field p-2.5 sm:p-3 ${shower ? 'is-wet' : ''}`} style={{ ['--sway' as string]: w.kind === 'storm' ? '1.1s' : w.kind === 'rain' ? '2.2s' : w.kind === 'cold' ? '4.2s' : '3.4s' }}>
            <div className="-mx-2.5 -mt-2.5 sm:-mx-3 sm:-mt-3 mb-2.5 sm:mb-3 overflow-hidden rounded-t-[16px]"><FarmScene regionId={plot.region} color={region.color} lon={region.lon} nowMs={nowMs} weather={w.kind} /></div>
            {shower > 0 && <div key={shower} className="pl-shower" aria-hidden>{Array.from({ length: 26 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 9) * 0.07}s`, ['--fall' as string]: `${170 + (i % 5) * 26}px` }} />)}</div>}
            {!now.daylight && <div className="pl-night" />}
            {(w.kind === 'rain' || w.kind === 'storm') && <div className={`pl-rain ${w.kind === 'storm' ? 'pl-storm' : ''}`} />}
            {w.kind === 'storm' && <div className="pl-flash" />}
            {w.kind === 'heat' && <div className="pl-heat" />}
            {w.kind === 'cold' && <div className="pl-cold" />}
            <div className="relative z-[1] grid grid-cols-6 gap-1.5 sm:gap-2">
              {Array.from({ length: PLOT_SIZE }, (_, i) => (
                <PlantTile key={i} index={i} plant={bySlot.get(i)} selected={sel === i} onClick={() => { setSel(i); const p = bySlot.get(i); if (!p) { setPlanting(true); onSpeak(tr('¡Hueco libre! Elige qué sembrar: la landrace de esta región rinde el doble.')); } else { setPlanting(false); } }} />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2" data-tour="plot-care">
            <button className="care-btn" onClick={() => setPlanting((v) => !v)}><Sprout className="w-3.5 h-3.5" />{' '}{tr('Sembrar')}</button>
            <button className="care-btn" onClick={() => act(() => { waterPlot(plot.id); setShower((k) => k + 1); }, thirsty ? tr('¡A regar se ha dicho!') : tr('Todas tienen agua de sobra, patrón.'), thirsty ? 'happy' : 'idle')}><Droplets className="w-3.5 h-3.5" />{' '}{tr('Regar sedientas{v0}', { v0: thirsty ? ` (${thirsty})` : '' })}</button>
            <button className="care-btn" onClick={() => act(() => feedPlot(plot.id), tr('Un buen abono y a crecer.'))}><FlaskConical className="w-3.5 h-3.5" />{' '}{tr('Abonar')}</button>
            <button className={`care-btn ${sick ? 'care-btn--hot' : ''}`} disabled={sick === 0} onClick={() => act(() => treatPests('all', plot.id), tr('Plaga controlada. ¡Bicho fuera!'))}><Bug className="w-3.5 h-3.5" />{' '}{tr('Tratar plagas{v0}', { v0: sick ? ` (${sick})` : '' })}</button>
            {males > 0 && <button className="care-btn care-btn--male" onClick={() => act(() => removeMales(plot.id), tr('¡Fuera los machos! Así no polinizan a las hembras.'))}>{tr('♂ Quitar machos ({males})', { males })}</button>}
            <button className={`care-btn ${ready ? 'care-btn--gold' : ''}`} disabled={ready === 0} onClick={() => act(() => harvestPlot(plot.id), tr('¡Qué cosecha, compadre! Mira esas flores.'))}><Scissors className="w-3.5 h-3.5" />{' '}{tr('Cosechar{v0}', { v0: ready ? ` (${ready})` : '' })}</button>
          </div>

          {planting && (
            <div className="hud-panel p-3 space-y-2" style={{ background: 'rgba(3, 14, 11, 0.97)' }}>
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">{tr('Elige la semilla · {v0} huecos libres', { v0: PLOT_SIZE - growing })}</div>
              {seedsOwned.length === 0 && (
                <div className="text-xs text-neutral-400 flex items-center justify-between gap-3">{tr('No tienes semillas.')}{' '}<button className="care-btn" onClick={onOpenSeedBank}><Sparkles className="w-3.5 h-3.5" />{' '}{tr('Banco de Semillas')}</button></div>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {seedsOwned.map((s) => {
                  const t = terroirOf(s.strainTemplate.origin, plot.region, plot.ratings);
                  const have = seedInventory[s.id] || 0;
                  const n = Math.min(have, PLOT_SIZE - growing);
                  return (
                    <div key={s.id} className={`rounded-lg border p-2 ${t.tone === 'up' ? 'border-emerald-400/60 bg-emerald-400/5' : t.tone === 'down' ? 'border-red-400/40 bg-red-500/5' : 'border-neutral-700 bg-neutral-950/60'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-bold text-white truncate">{tr(s.strainTemplate.name)}</span>
                        <span className="text-[10px] font-mono text-neutral-400">×{have}</span>
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400">{s.seedType === 'Regular' || s.seedType === 'Landrace' ? tr('⚥ ~50 % machos: hay que sexarlas') : tr('♀ 100 % hembras')}</div>
                      <div className={`text-[10.5px] font-mono ${t.tone === 'up' ? 'text-emerald-300' : t.tone === 'down' ? 'text-red-300' : 'text-neutral-400'}`}>{tr('{label} · crece {v1} % · cosecha {v2} %', { label: t.label, v1: Math.round(t.growth * 100), v2: Math.round(t.yield * 100) })}</div>
                      <button className="care-btn w-full mt-1.5" disabled={n <= 0} onClick={() => { if (plantPlot(plot.id, s.id, n)) { onSpeak(t.tone === 'up' ? tr('¡{name} en su tierra! Esto va a dar un cosechón.', { name: s.strainTemplate.name }) : t.tone === 'down' ? tr('Mmm, {name} aquí sufrirá un poco… pero probemos.', { name: s.strainTemplate.name }) : tr('A sembrar {name}.', { name: s.strainTemplate.name }), 'happy'); setPlanting(false); } }}>{tr('Sembrar {v0}', { v0: n > 0 ? `×${n}` : '' })}</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* side: weather + inspector */}
        <div className="space-y-3">
          <div className="hud-panel p-3" data-tour="plot-weather">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono uppercase tracking-wider text-sky-300">{tr('Clima en {name}', { name: region.name })}</div>
              <div className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">{now.daylight ? <Sun className="w-3.5 h-3.5 text-yellow-300" /> : <Moon className="w-3.5 h-3.5 text-indigo-300" />} {now.daylight ? tr('de día') : tr('de noche')}</div>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-3xl leading-none">{w.emoji}</span>
              <div>
                <div className="text-sm font-bold text-white">{tr(w.label)}</div>
                <div className="text-[10.5px] font-mono text-neutral-300 flex gap-3"><span className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> {now.tempC} °C</span><span className="flex items-center gap-1"><Wind className="w-3 h-3" />{' '}{tr('{rh} % HR', { rh: now.rh })}</span></div>
              </div>
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug mt-1.5">{WEATHER_TIP[w.kind]}</p>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {forecast.slice(1).map((f, i) => (
                <div key={i} className="rounded-md border border-neutral-800 bg-neutral-950/60 px-1.5 py-1 text-center">
                  <div className="text-[9px] font-mono text-neutral-500">{i === 0 ? tr('mañana') : `+${i + 1} d`}</div>
                  <div className="text-lg leading-none">{f.emoji}</div>
                  <div className="text-[9px] font-mono text-neutral-300 truncate">{tr(f.label)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hud-panel p-3 min-h-[15rem]">
            {plant ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{tr(plant.strain.name)}</div>
                    <div className="text-[10px] font-mono text-neutral-400">{tr('hueco #{v0} · {v1}', { v0: (plant.slotIndex ?? 0) + 1, v1: plant.stage === 'ready_harvest' ? tr('¡lista!') : STAGE_LABEL[plant.stage] })}</div>
                  </div>
                  {(() => { const t = terroirOf(plant.strain.origin, plot.region, plot.ratings); return <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${t.tone === 'up' ? 'text-emerald-300 border-emerald-400/50' : t.tone === 'down' ? 'text-red-300 border-red-400/40' : 'text-neutral-300 border-neutral-600'}`}>{tr(t.label)}</span>; })()}
                </div>
                <div className="relative h-44 rounded-lg overflow-hidden bg-[#03100c] border border-emerald-400/15">
                  <PlantView
                    seedKey={plant.id ?? String(sel)} stage={plant.stage} progress={Math.round(plant.progressPercent * 2) / 2} health={plant.health} soilMoisture={plant.soilMoisture}
                    vpdOptimal={plant.vpdKpa >= 0.8 && plant.vpdKpa <= 1.4} strainColor={plant.strain.colorTheme || '#15803d'} amberPct={plant.trichomeMaturity.amber} pest={plant.pest?.kind}
                  />
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px] font-mono">
                  <span className="text-neutral-400">{tr('Progreso')}{' '}<b className="text-white">{Math.round(plant.progressPercent)}%</b></span>
                  <span className="text-neutral-400">{tr('Salud')}{' '}<b className={plant.health > 70 ? 'text-emerald-300' : plant.health > 45 ? 'text-amber-300' : 'text-red-300'}>{plant.health}%</b></span>
                  <span className="text-neutral-400">{tr('Sustrato')}{' '}<b className={isThirsty(plant) ? 'text-cyan-300' : 'text-white'}>{plant.soilMoisture}%</b></span>
                  <span className="text-neutral-400">EC <b className="text-white">{plant.ecLevel}</b></span>
                  <span className="text-neutral-400 col-span-2">{plant.stage === 'ready_harvest' ? tr('¡Lista para cosechar!') : tr('Cosecha en ~{v0} con el clima de estos días, si la riegas y abonas', { v0: formatDuration(plotEta(plot, plant)) })} · ~{plant.estimatedDryYieldGrams} g</span>
                  <span className="col-span-2 text-neutral-400">{tr('Sexo:')}{' '}{sexRevealed(plant) ? (isMale(plant) ? <b className="text-sky-300">{tr('♂ macho (no da flor)')}</b> : <b className="text-pink-300">{tr('♀ hembra')}</b>) : <b className="text-neutral-300">{tr('? se revela al {SEX_REVEAL_AT} %', { SEX_REVEAL_AT })}</b>}{plant.pollinated && <b className="text-amber-300">{' '}{tr('· 🐝 polinizada (−40 % flor, da semillas)')}</b>}</span>
                  {isMale(plant) && sexRevealed(plant) && (
                    <span className="col-span-2 flex gap-1.5 pt-1">
                      <button className="care-btn care-btn--male flex-1" onClick={() => { removeMales(plot.id); setSel(null); }}>{tr('Arrancar machos')}</button>
                      <button className="care-btn flex-1" onClick={() => { keepMaleAsFather(plot.id, plant.slotIndex ?? -1); setSel(null); onSpeak(tr('¡Buen padre para cruzar! Lo guardé en el Santuario.'), 'happy'); }}>{tr('Guardar como padre')}</button>
                    </span>
                  )}
                  {plant.pest && <span className="col-span-2 text-pink-300">{tr('{emoji} {label} desde hace {v2} h · cura: {cure}', { emoji: PEST_INFO[plant.pest.kind].emoji, label: PEST_INFO[plant.pest.kind].label, v2: Math.max(1, Math.round(plant.pest.hours)), cure: PEST_INFO[plant.pest.kind].cure })}</span>}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[13rem] flex flex-col items-center justify-center text-center text-xs text-neutral-500 gap-1.5">
                <Sprout className="w-7 h-7 text-emerald-400/50" />
                {tr('Toca una planta para verla en 3D, o un hueco vacío para sembrar.')}
                <div className="text-[10px] font-mono text-neutral-600">{tr('Agua {v0} L · abono {v1} ml', { v0: resources.water.toFixed(0), v1: Math.floor(resources.nutrient) })}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
