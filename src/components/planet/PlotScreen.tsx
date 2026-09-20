import React, { useMemo, useState } from 'react';
import { ArrowLeft, Droplets, FlaskConical, Bug, Scissors, Sprout, Sun, Moon, Thermometer, Wind, Sparkles } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { PlantView } from '../PlantView';
import { formatDuration, isMale, isThirsty, maleCount, PEST_INFO, sexRevealed, SEX_REVEAL_AT } from '../../sim/engine';
import { dayIndexOf, PLOT_SIZE, REGION_BY_ID, siteConditions, terroirOf, weatherOn } from '../../sim/terroir';
import type { OwnedPlot, PlantInGrow } from '../../types';
import type { Mood } from '../npc/Npc';

/* ───────────────────────── one plant of the field ───────────────────────── */

const STAGE_COLOR: Record<string, string> = { seed: '#a16207', seedling: '#84cc16', vegetative: '#22c55e', flowering: '#c084fc', ready_harvest: '#fbbf24' };

export const PlantTile: React.FC<{ plant?: PlantInGrow; selected: boolean; index: number; onClick: () => void }> = ({ plant, selected, index, onClick }) => {
  if (!plant) {
    return (
      <button onClick={onClick} className="pl-tile pl-tile--empty" aria-label={`Hueco ${index + 1} vacío`}>
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
    <button onClick={onClick} className={`pl-tile ${selected ? 'is-sel' : ''} ${plant.stage === 'ready_harvest' ? 'is-ready' : ''}`} aria-label={`Planta ${index + 1}: ${plant.strain.name}, ${Math.round(plant.progressPercent)} %`}>
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
                {(plant.stage === 'flowering' || plant.stage === 'ready_harvest') && (
                  <>
                    <ellipse cx="20" cy="13" rx="4.2" ry="7" fill={plant.stage === 'ready_harvest' ? '#fbbf24' : c} stroke="#0008" strokeWidth=".5" />
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
      {plant.pest && <span className="pl-badge pl-badge--pest" title={PEST_INFO[plant.pest.kind].label}>{PEST_INFO[plant.pest.kind].emoji}</span>}
      {!plant.pest && thirsty && <span className="pl-badge pl-badge--thirst" title="Necesita agua">💧</span>}
      {isMale(plant) && sexRevealed(plant) && <span className="pl-badge pl-badge--male" title="Macho: quítalo antes de la floración">♂</span>}
      {plant.pollinated && <span className="pl-badge pl-badge--bee" title="Polinizada: menos flor, dará semillas">🐝</span>}
    </button>
  );
};

/* ───────────────────────── the plot ───────────────────────── */

const WEATHER_TIP: Record<string, string> = {
  sunny: 'Buen día de sol: crecen rápido pero el sustrato se seca.',
  cloudy: 'Nublado: llega menos luz, crecen más despacio.',
  rain: 'Llueve: ahorras riego, pero la humedad favorece el moho.',
  storm: '¡Tormenta! Las plantas sufren daño mientras dure.',
  heat: 'Ola de calor: riega más y vigila los ácaros.',
  cold: 'Frente frío: casi no crecen hasta que suba la temperatura.',
};

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

  const act = (fn: () => void, say: string, mood: Mood = 'happy') => { fn(); onSpeak(say, mood); };

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="care-btn"><ArrowLeft className="w-3.5 h-3.5" /> Planeta</button>
        <div className="min-w-0">
          <h2 className="font-serif text-xl font-black text-white leading-tight">{region.emoji} {plot.name} <span className="text-sm font-mono font-normal text-neutral-400">· {region.name} · {region.climate}</span></h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] font-mono text-neutral-400 mt-0.5">
            <span>Nota <b className="text-amber-300">{plot.landRating}</b>/10</span>
            <span>💧 agua <b className="text-sky-300">{plot.ratings.water}</b></span>
            <span>☀️ sol <b className="text-yellow-300">{plot.ratings.sunlight}</b></span>
            <span>🌱 suelo <b className="text-emerald-300">{plot.ratings.soil}</b></span>
            <span>{growing}/{PLOT_SIZE} plantas</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* field */}
        <div className="space-y-3">
          <div className="pl-field p-2.5 sm:p-3">
            {!now.daylight && <div className="pl-night" />}
            {(w.kind === 'rain' || w.kind === 'storm') && <div className={`pl-rain ${w.kind === 'storm' ? 'pl-storm' : ''}`} />}
            {w.kind === 'storm' && <div className="pl-flash" />}
            {w.kind === 'heat' && <div className="pl-heat" />}
            {w.kind === 'cold' && <div className="pl-cold" />}
            <div className="relative z-[1] grid grid-cols-6 gap-1.5 sm:gap-2">
              {Array.from({ length: PLOT_SIZE }, (_, i) => (
                <PlantTile key={i} index={i} plant={bySlot.get(i)} selected={sel === i} onClick={() => { setSel(i); const p = bySlot.get(i); if (!p) { setPlanting(true); onSpeak('¡Hueco libre! Elige qué sembrar: la landrace de esta región rinde el doble.'); } else { setPlanting(false); } }} />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="care-btn" onClick={() => setPlanting((v) => !v)}><Sprout className="w-3.5 h-3.5" /> Sembrar</button>
            <button className="care-btn" onClick={() => act(() => waterPlot(plot.id), thirsty ? '¡A regar se ha dicho!' : 'Todas tienen agua de sobra, patrón.', thirsty ? 'happy' : 'idle')}><Droplets className="w-3.5 h-3.5" /> Regar sedientas{thirsty ? ` (${thirsty})` : ''}</button>
            <button className="care-btn" onClick={() => act(() => feedPlot(plot.id), 'Un buen abono y a crecer.')}><FlaskConical className="w-3.5 h-3.5" /> Abonar</button>
            <button className={`care-btn ${sick ? 'care-btn--hot' : ''}`} disabled={sick === 0} onClick={() => act(() => treatPests('all', plot.id), 'Plaga controlada. ¡Bicho fuera!')}><Bug className="w-3.5 h-3.5" /> Tratar plagas{sick ? ` (${sick})` : ''}</button>
            {males > 0 && <button className="care-btn care-btn--male" onClick={() => act(() => removeMales(plot.id), '¡Fuera los machos! Así no polinizan a las hembras.')}>♂ Quitar machos ({males})</button>}
            <button className={`care-btn ${ready ? 'care-btn--gold' : ''}`} disabled={ready === 0} onClick={() => act(() => harvestPlot(plot.id), '¡Qué cosecha, compadre! Mira esas flores.')}><Scissors className="w-3.5 h-3.5" /> Cosechar{ready ? ` (${ready})` : ''}</button>
          </div>

          {planting && (
            <div className="hud-panel p-3 space-y-2" style={{ background: 'rgba(3, 14, 11, 0.97)' }}>
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">Elige la semilla · {PLOT_SIZE - growing} huecos libres</div>
              {seedsOwned.length === 0 && (
                <div className="text-xs text-neutral-400 flex items-center justify-between gap-3">No tienes semillas. <button className="care-btn" onClick={onOpenSeedBank}><Sparkles className="w-3.5 h-3.5" /> Banco de Semillas</button></div>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {seedsOwned.map((s) => {
                  const t = terroirOf(s.strainTemplate.origin, plot.region, plot.ratings);
                  const have = seedInventory[s.id] || 0;
                  const n = Math.min(have, PLOT_SIZE - growing);
                  return (
                    <div key={s.id} className={`rounded-lg border p-2 ${t.tone === 'up' ? 'border-emerald-400/60 bg-emerald-400/5' : t.tone === 'down' ? 'border-red-400/40 bg-red-500/5' : 'border-neutral-700 bg-neutral-950/60'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-bold text-white truncate">{s.strainTemplate.name}</span>
                        <span className="text-[10px] font-mono text-neutral-400">×{have}</span>
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400">{s.seedType === 'Regular' || s.seedType === 'Landrace' ? '⚥ ~50 % machos: hay que sexarlas' : '♀ 100 % hembras'}</div>
                      <div className={`text-[10.5px] font-mono ${t.tone === 'up' ? 'text-emerald-300' : t.tone === 'down' ? 'text-red-300' : 'text-neutral-400'}`}>{t.label} · crece {Math.round(t.growth * 100)} % · cosecha {Math.round(t.yield * 100)} %</div>
                      <button className="care-btn w-full mt-1.5" disabled={n <= 0} onClick={() => { if (plantPlot(plot.id, s.id, n)) { onSpeak(t.tone === 'up' ? `¡${s.strainTemplate.name} en su tierra! Esto va a dar un cosechón.` : t.tone === 'down' ? `Mmm, ${s.strainTemplate.name} aquí sufrirá un poco… pero probemos.` : `A sembrar ${s.strainTemplate.name}.`, 'happy'); setPlanting(false); } }}>Sembrar {n > 0 ? `×${n}` : ''}</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* side: weather + inspector */}
        <div className="space-y-3">
          <div className="hud-panel p-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-mono uppercase tracking-wider text-sky-300">Clima en {region.name}</div>
              <div className="text-[10px] font-mono text-neutral-400 flex items-center gap-1">{now.daylight ? <Sun className="w-3.5 h-3.5 text-yellow-300" /> : <Moon className="w-3.5 h-3.5 text-indigo-300" />} {now.daylight ? 'de día' : 'de noche'}</div>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-3xl leading-none">{w.emoji}</span>
              <div>
                <div className="text-sm font-bold text-white">{w.label}</div>
                <div className="text-[10.5px] font-mono text-neutral-300 flex gap-3"><span className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> {now.tempC} °C</span><span className="flex items-center gap-1"><Wind className="w-3 h-3" /> {now.rh} % HR</span></div>
              </div>
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug mt-1.5">{WEATHER_TIP[w.kind]}</p>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {forecast.slice(1).map((f, i) => (
                <div key={i} className="rounded-md border border-neutral-800 bg-neutral-950/60 px-1.5 py-1 text-center">
                  <div className="text-[9px] font-mono text-neutral-500">{i === 0 ? 'mañana' : `+${i + 1} d`}</div>
                  <div className="text-lg leading-none">{f.emoji}</div>
                  <div className="text-[9px] font-mono text-neutral-300 truncate">{f.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hud-panel p-3 min-h-[15rem]">
            {plant ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{plant.strain.name}</div>
                    <div className="text-[10px] font-mono text-neutral-400">hueco #{(plant.slotIndex ?? 0) + 1} · {plant.stage === 'ready_harvest' ? '¡lista!' : plant.stage}</div>
                  </div>
                  {(() => { const t = terroirOf(plant.strain.origin, plot.region, plot.ratings); return <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${t.tone === 'up' ? 'text-emerald-300 border-emerald-400/50' : t.tone === 'down' ? 'text-red-300 border-red-400/40' : 'text-neutral-300 border-neutral-600'}`}>{t.label}</span>; })()}
                </div>
                <div className="relative h-44 rounded-lg overflow-hidden bg-[#03100c] border border-emerald-400/15">
                  <PlantView
                    seedKey={plant.id ?? String(sel)} stage={plant.stage} progress={Math.round(plant.progressPercent * 2) / 2} health={plant.health} soilMoisture={plant.soilMoisture}
                    vpdOptimal={plant.vpdKpa >= 0.8 && plant.vpdKpa <= 1.4} strainColor={plant.strain.colorTheme || '#15803d'} amberPct={plant.trichomeMaturity.amber} pest={plant.pest?.kind}
                  />
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10.5px] font-mono">
                  <span className="text-neutral-400">Progreso <b className="text-white">{Math.round(plant.progressPercent)}%</b></span>
                  <span className="text-neutral-400">Salud <b className={plant.health > 70 ? 'text-emerald-300' : plant.health > 45 ? 'text-amber-300' : 'text-red-300'}>{plant.health}%</b></span>
                  <span className="text-neutral-400">Sustrato <b className={isThirsty(plant) ? 'text-cyan-300' : 'text-white'}>{plant.soilMoisture}%</b></span>
                  <span className="text-neutral-400">EC <b className="text-white">{plant.ecLevel}</b></span>
                  <span className="text-neutral-400 col-span-2">{plant.stage === 'ready_harvest' ? '¡Lista para cosechar!' : `Cosecha en ~${formatDuration(plotEta(plot, plant))}`} · ~{plant.estimatedDryYieldGrams} g</span>
                  <span className="col-span-2 text-neutral-400">Sexo: {sexRevealed(plant) ? (isMale(plant) ? <b className="text-sky-300">♂ macho (no da flor)</b> : <b className="text-pink-300">♀ hembra</b>) : <b className="text-neutral-300">? se revela al {SEX_REVEAL_AT} %</b>}{plant.pollinated && <b className="text-amber-300"> · 🐝 polinizada (−40 % flor, da semillas)</b>}</span>
                  {isMale(plant) && sexRevealed(plant) && (
                    <span className="col-span-2 flex gap-1.5 pt-1">
                      <button className="care-btn care-btn--male flex-1" onClick={() => { removeMales(plot.id); setSel(null); }}>Arrancar machos</button>
                      <button className="care-btn flex-1" onClick={() => { keepMaleAsFather(plot.id, plant.slotIndex ?? -1); setSel(null); onSpeak('¡Buen padre para cruzar! Lo guardé en el Santuario.', 'happy'); }}>Guardar como padre</button>
                    </span>
                  )}
                  {plant.pest && <span className="col-span-2 text-pink-300">{PEST_INFO[plant.pest.kind].emoji} {PEST_INFO[plant.pest.kind].label} desde hace {Math.max(1, Math.round(plant.pest.hours))} h · cura: {PEST_INFO[plant.pest.kind].cure}</span>}
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[13rem] flex flex-col items-center justify-center text-center text-xs text-neutral-500 gap-1.5">
                <Sprout className="w-7 h-7 text-emerald-400/50" />
                Toca una planta para verla en 3D, o un hueco vacío para sembrar.
                <div className="text-[10px] font-mono text-neutral-600">Agua {resources.water.toFixed(0)} L · abono {Math.floor(resources.nutrient)} ml</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
