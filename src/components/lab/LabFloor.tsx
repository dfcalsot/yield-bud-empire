import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { ArrowRight, Flame, Wrench } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { STATIONS, STATION_BY_ID, StationId, LabRecipe, HPLC_FEE, PRODUCT_INFO } from '../../lab/stations';
import { StationScene, CoaProfile } from './StationScenes';
import { ProductCard, rarityOfQuality } from './ProductCard';
import { HudPanel, NeonButton, RARITY_STYLE } from '../game/GameUI';
import type { ProcessedProduct } from '../../types';

const wearFactorOf = (wear: number) => (wear > 60 ? 1 : wear > 40 ? 0.93 : 0.85);

const STATUS_COLOR: Record<string, string> = { operativo: '#34d399', mantenimiento_requerido: '#fbbf24', averiado: '#f87171' };
const STATUS_LABEL: Record<string, string> = { operativo: 'Operativa', mantenimiento_requerido: 'Requiere mantenimiento', averiado: 'Averiada' };

/**
 * Planta Industrial: the animated extraction floor.
 * Harvested flower + trim go into a station, the machine runs its animation, burns $FLORA,
 * wears down and mints a batch that can be sold in the dispensary — the whitepaper loop
 * (cosecha → extracción → marca / V2P) with its deflationary sinks made visible.
 */
export const LabFloor: React.FC = () => {
  const {
    rawFlowerGrams, trimGrams, machines, repairMachine, runLabProcess, certifyProduct,
    processedProducts, floraBalance, burnStats, totalFloraBurned,
  } = useGame();

  const [stationId, setStationId] = useState<StationId>('rosin');
  const station = STATION_BY_ID[stationId];
  const [recipeIdx, setRecipeIdx] = useState(0);
  const recipe: LabRecipe | undefined = station.recipes[Math.min(recipeIdx, Math.max(0, station.recipes.length - 1))];
  const [grams, setGrams] = useState(20);
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle');
  const [result, setResult] = useState<ProcessedProduct | null>(null);
  const [profile, setProfile] = useState<CoaProfile | null>(null);
  const [hplcId, setHplcId] = useState<string | null>(null);

  const sceneRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef(0);

  const setP = (p: number) => sceneRef.current?.style.setProperty('--p', p.toFixed(3));

  // switching station / recipe resets the stage
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    setRecipeIdx(0);
    setPhase('idle');
    setResult(null);
    setProfile(null);
    setP(0);
  }, [stationId]);
  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const stock = recipe ? (recipe.inputKind === 'flower' ? rawFlowerGrams : trimGrams) : 0;
  const maxAllowed = recipe ? Math.min(recipe.maxGrams, Math.floor(stock)) : 0;
  useEffect(() => {
    if (recipe) setGrams(Math.max(recipe.minGrams, Math.min(recipe.defaultGrams, Math.max(recipe.minGrams, maxAllowed))));
  }, [recipe?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const g = recipe ? Math.max(recipe.minGrams, Math.min(grams, Math.max(recipe.minGrams, maxAllowed))) : 0;

  const machine = machines.find((m) => m.id === station.machineId);
  const wear = machine?.wearPercentage ?? 100;
  const broken = wear <= 15;
  const wf = wearFactorOf(wear);
  const estOut = recipe ? Number((g * recipe.yieldRatio * wf).toFixed(2)) : 0;
  const estValue = recipe ? Math.round(estOut * recipe.pricePerGram * 1.06) : 0;

  const uncertified = processedProducts.filter((p) => !p.certified && p.id !== result?.id);
  const hplcSelected = uncertified.find((p) => p.id === hplcId) ?? uncertified[0];

  let blocker = '';
  if (phase === 'running') blocker = 'Ciclo en marcha…';
  else if (broken) blocker = 'Máquina averiada: repárala primero';
  else if (stationId === 'hplc') {
    if (!hplcSelected) blocker = 'No hay lotes sin certificar';
    else if (floraBalance < HPLC_FEE) blocker = `Saldo insuficiente (${HPLC_FEE} $FLORA)`;
  } else if (recipe) {
    if (maxAllowed < recipe.minGrams) blocker = `Necesitas ≥ ${recipe.minGrams}g de ${recipe.inputKind === 'flower' ? 'flor' : 'trim'}`;
    else if (floraBalance < recipe.feeFlora) blocker = `Saldo insuficiente (${recipe.feeFlora} $FLORA)`;
  }

  const begin = (ms: number) => {
    setPhase('running');
    // on phones the button sits below the stage: bring the machine into view
    if (window.innerWidth < 1024) sceneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      setP(p);
      if (pctRef.current) pctRef.current.textContent = `${Math.round(p * 100)}%`;
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setPhase('done');
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const start = () => {
    if (blocker) return;
    if (stationId === 'hplc') {
      if (!hplcSelected) return;
      const updated = certifyProduct(hplcSelected.id, HPLC_FEE);
      if (!updated) return;
      setProfile(updated.coa ?? null);
      setResult(updated);
      begin(6500);
      return;
    }
    if (!recipe) return;
    const prod = runLabProcess({
      machineId: station.machineId, inputKind: recipe.inputKind, grams: g, type: recipe.type, label: recipe.name,
      yieldRatio: recipe.yieldRatio, potency: recipe.potency, pricePerGram: recipe.pricePerGram, feeFlora: recipe.feeFlora,
    });
    if (!prod) return;
    setResult(prod);
    begin(recipe.durationMs);
  };

  // reveal burst
  useEffect(() => {
    if (phase !== 'done' || !result) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const { color } = RARITY_STYLE[rarityOfQuality(result.qualityScore)];
    confetti({ particleCount: 90, spread: 75, startVelocity: 38, origin: { y: 0.55 }, colors: [color, '#ffffff', station.color], zIndex: 120 });
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const collect = () => {
    setPhase('idle');
    setResult(null);
    setP(0);
  };

  const recent = processedProducts.filter((p) => p.id !== result?.id || phase === 'idle').slice(0, 8);
  const running = phase === 'running';

  return (
    <div className="space-y-5">
      {/* whitepaper loop: cosecha → estación → lote NFT → dispensario */}
      <div className="hud-panel p-3 sm:p-4">
        <div className="flex flex-wrap items-stretch gap-2 sm:gap-3 text-xs">
          {[
            { k: 'Cosecha', v: `${rawFlowerGrams} g flor · ${trimGrams} g trim`, c: '#34d399' },
            { k: 'Estación', v: station.short, c: station.color },
            { k: 'Lote NFT', v: `${processedProducts.length} lotes en inventario`, c: '#c084fc' },
            { k: 'Dispensario V2P', v: 'Vende desde Mercado', c: '#22d3ee' },
          ].map((s, i, arr) => (
            <React.Fragment key={s.k}>
              <div className="flex-1 min-w-[9.5rem] px-3 py-2 rounded-xl bg-neutral-950/70 border" style={{ borderColor: `${s.c}55` }}>
                <div className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">{s.k}</div>
                <div className="font-mono font-bold text-[11.5px]" style={{ color: s.c }}>{s.v}</div>
              </div>
              {i < arr.length - 1 && <ArrowRight className="hidden sm:block w-4 h-4 self-center text-neutral-600 shrink-0" />}
            </React.Fragment>
          ))}
          <div className="flex-1 min-w-[12rem] px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-400/40">
            <div className="text-[9px] font-mono uppercase tracking-wider text-amber-300/80 flex items-center gap-1"><Flame className="w-3 h-3" /> Sumidero deflacionario</div>
            <div className="font-mono font-bold text-[11.5px] text-amber-300">{burnStats.repairs.toLocaleString()} $FLORA quemados en lab + mantenimiento</div>
            <div className="text-[9px] font-mono text-neutral-500">Total del juego: {totalFloraBurned.toLocaleString()} $FLORA</div>
          </div>
        </div>
      </div>

      {/* station rail */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {STATIONS.map((s) => {
          const m = machines.find((x) => x.id === s.machineId);
          const w = m?.wearPercentage ?? 100;
          const Icon = s.icon;
          const active = s.id === stationId;
          return (
            <button
              key={s.id}
              onClick={() => phase !== 'running' && setStationId(s.id)}
              aria-current={active ? 'true' : undefined}
              className={`shrink-0 w-[8.4rem] px-2.5 py-2 rounded-xl border text-left transition cursor-pointer ${active ? 'bg-neutral-900/90' : 'bg-neutral-950/60 hover:bg-neutral-900/70'}`}
              style={{ borderColor: active ? s.color : 'rgba(80,110,100,0.35)', boxShadow: active ? `0 0 22px -6px ${s.color}` : undefined }}
            >
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${s.color}1f`, color: s.color }}><Icon className="w-5 h-5" /></span>
                <span className="text-[11px] font-bold text-white leading-tight">{s.short}</span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-neutral-800 overflow-hidden"><div className="h-full" style={{ width: `${w}%`, background: w > 40 ? '#34d399' : w > 15 ? '#fbbf24' : '#f87171' }} /></div>
              <div className="text-[9px] font-mono text-neutral-500 mt-0.5">Desgaste {100 - Math.round(w)}%</div>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* stage */}
        <HudPanel className="p-0 overflow-hidden">
          <div className="relative aspect-[16/10] bg-[#02080a]">
            <div ref={sceneRef} className="absolute inset-0" style={{ ['--p' as string]: 0 }}>
              <StationScene station={stationId} running={running} variant={recipe?.variant ?? 'x'} accent={station.color} profile={profile} className="w-full h-full block" />
            </div>

            <div className="absolute left-3 top-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-950/80 border border-white/10">
              <span className="w-2 h-2 rounded-full" style={{ background: STATUS_COLOR[machine?.status ?? 'operativo'], boxShadow: `0 0 8px ${STATUS_COLOR[machine?.status ?? 'operativo']}` }} />
              <span className="text-[11px] font-bold text-white">{station.name}</span>
              <span className="text-[10px] font-mono text-neutral-400 hidden sm:inline">{STATUS_LABEL[machine?.status ?? 'operativo']}</span>
            </div>
            {running && (
              <div className="absolute right-3 top-3 px-2.5 py-1.5 rounded-lg bg-neutral-950/80 border border-white/10 text-[11px] font-mono" style={{ color: station.color }}>
                Ciclo <span ref={pctRef}>0%</span>
              </div>
            )}
            <div className="absolute left-3 bottom-3 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-[10.5px] font-mono text-amber-300">
              <Flame className={`w-3.5 h-3.5 ${running ? 'lb-blink' : ''}`} />
              {stationId === 'hplc' ? `Quema ${HPLC_FEE} $FLORA por análisis` : recipe ? `Quema ${recipe.feeFlora} $FLORA por ciclo` : ''}
            </div>
            {machine && (
              <div className="absolute right-3 bottom-3 px-2.5 py-1 rounded-lg bg-neutral-950/80 border border-white/10 text-[10.5px] font-mono text-neutral-300">
                −{machine.wearRatePerCycle}% desgaste / ciclo
              </div>
            )}

            {/* result reveal */}
            {phase === 'done' && result && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#020806]/88 p-3">
                <div className="w-[15.5rem] space-y-2.5 text-center">
                  <div className="font-serif font-black text-lg tracking-[0.25em] uppercase" style={{ color: RARITY_STYLE[rarityOfQuality(result.qualityScore)].color }}>
                    {stationId === 'hplc' ? 'Certificado emitido' : 'Lote acuñado'}
                  </div>
                  <div className="mint-reveal"><ProductCard product={result} /></div>
                  <NeonButton tone="emerald" onClick={collect} className="w-full">Recoger lote</NeonButton>
                </div>
              </div>
            )}
          </div>
        </HudPanel>

        {/* controls */}
        <HudPanel title={<>{React.createElement(station.icon, { className: 'w-4 h-4' })} {station.short}</>}>
          <div className="px-4 pb-4 space-y-3.5 text-xs">
            <p className="text-neutral-400 leading-snug">{station.blurb}</p>

            {stationId !== 'hplc' && recipe && (
              <>
                <div className="space-y-1.5">
                  {station.recipes.map((r, i) => (
                    <button
                      key={r.id}
                      onClick={() => phase === 'idle' && setRecipeIdx(i)}
                      className={`w-full text-left px-3 py-2 rounded-xl border transition cursor-pointer ${i === recipeIdx ? 'bg-neutral-900/90' : 'bg-neutral-950/50 hover:bg-neutral-900/60'}`}
                      style={{ borderColor: i === recipeIdx ? station.color : 'rgba(80,110,100,0.3)' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white">{r.name}</span>
                        <span className="font-mono text-[10px] px-1.5 rounded border border-white/15 text-neutral-300">{r.inputKind === 'flower' ? 'FLOR' : 'TRIM'}</span>
                      </div>
                      <div className="text-[10.5px] text-neutral-400">{r.desc}</div>
                    </button>
                  ))}
                </div>

                <div>
                  <div className="flex justify-between font-mono text-[10.5px] mb-1">
                    <span className="text-neutral-400">Cargar {recipe.inputKind === 'flower' ? 'flor seca' : 'biomasa trim'}</span>
                    <span className="text-white font-bold">{g} g <span className="text-neutral-500">/ {Math.floor(stock)} g</span></span>
                  </div>
                  <input
                    type="range" min={recipe.minGrams} max={Math.max(recipe.minGrams, maxAllowed)} step={recipe.step} value={g}
                    onChange={(e) => setGrams(Number(e.target.value))} disabled={phase !== 'idle' || maxAllowed < recipe.minGrams}
                    className="w-full accent-emerald-400" aria-label="Gramos a procesar"
                  />
                </div>

                <dl className="grid grid-cols-2 gap-2 font-mono">
                  {[
                    { k: 'Rendimiento est.', v: `~${estOut} g`, c: '#34d399' },
                    { k: 'Valor est.', v: `~${estValue} $FLORA`, c: '#fbbf24' },
                    { k: 'Quema', v: `${recipe.feeFlora} $FLORA`, c: '#fb923c' },
                    { k: 'Eficiencia', v: `${Math.round(wf * 100)}%`, c: wf === 1 ? '#34d399' : '#fbbf24' },
                  ].map((d) => (
                    <div key={d.k} className="rounded-lg bg-neutral-950/70 border border-neutral-800 px-2.5 py-1.5">
                      <dt className="text-[9px] uppercase tracking-wider text-neutral-500">{d.k}</dt>
                      <dd className="font-bold" style={{ color: d.c }}>{d.v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}

            {stationId === 'hplc' && (
              <div className="space-y-2">
                <div className="text-[10.5px] font-mono text-neutral-400">Elige el lote a analizar (+18% de valor con COA)</div>
                {uncertified.length === 0 ? (
                  <p className="text-neutral-500 py-3 text-center">No hay lotes sin certificar. Procesa flor en otra estación primero.</p>
                ) : (
                  <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                    {uncertified.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => phase === 'idle' && setHplcId(p.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl border transition cursor-pointer ${hplcSelected?.id === p.id ? 'bg-neutral-900/90' : 'bg-neutral-950/50 hover:bg-neutral-900/60'}`}
                        style={{ borderColor: hplcSelected?.id === p.id ? station.color : 'rgba(80,110,100,0.3)' }}
                      >
                        <div className="font-bold text-white truncate">{p.name}</div>
                        <div className="text-[10px] font-mono text-neutral-400">{PRODUCT_INFO[p.type].label} · {p.quantityGrams} g · {p.marketValueFlora} $FLORA</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* machine health */}
            <div className="rounded-xl bg-neutral-950/70 border border-neutral-800 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between font-mono text-[10.5px]">
                <span className="text-neutral-400 truncate">{machine?.name}</span>
                <span style={{ color: wear > 40 ? '#34d399' : wear > 15 ? '#fbbf24' : '#f87171' }}>{Math.round(wear)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden"><div className="h-full transition-[width] duration-700" style={{ width: `${wear}%`, background: wear > 40 ? '#34d399' : wear > 15 ? '#fbbf24' : '#f87171' }} /></div>
              {wear <= 40 && machine && (
                <NeonButton tone="amber" onClick={() => repairMachine(machine.id)} disabled={floraBalance < machine.repairCostFlora || running} className="w-full !py-1.5">
                  <Wrench className="w-3.5 h-3.5" /> Reparar · quema {machine.repairCostFlora} $FLORA
                </NeonButton>
              )}
            </div>

            <NeonButton tone="emerald" onClick={start} disabled={!!blocker} className="w-full !py-3 text-sm">
              {running ? 'Procesando…' : stationId === 'hplc' ? 'Analizar lote' : 'Iniciar ciclo'}
            </NeonButton>
            {blocker && !running && <p className="text-[10.5px] font-mono text-amber-300 text-center -mt-1.5">{blocker}</p>}
          </div>
        </HudPanel>
      </div>

      {/* minted batches */}
      <HudPanel title="Lotes acuñados (inventario NFT)" accessory={<span className="text-[10px] font-mono text-neutral-500">{processedProducts.length} en total</span>}>
        <div className="px-4 pb-4">
          {recent.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-6">Aún no hay lotes. Inicia un ciclo en cualquier estación.</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-4">
              {recent.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </HudPanel>
    </div>
  );
};
