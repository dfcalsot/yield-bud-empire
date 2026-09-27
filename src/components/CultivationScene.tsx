import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Droplet, Scissors, Flame, Zap, Crown, Sprout, Hand } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GROW_ROOMS_CONFIG } from '../data/initialData';
import { PlantView } from './PlantView';
import { NutrientBottle, FlaskLeaf, CannabisLeaf } from './icons/CannabisIcons';
import { formatDuration, isHungry, isThirsty, PEST_INFO } from '../sim/engine';
import { nextActionFor } from '../sim/nextAction';
import { Hotbar, type SlotSpec } from './hud/HudParts';
import { FacilityBackdrop } from './hud/FacilityBackdrop';
import { TechniqueMenu } from './cultivo/TechniqueMenu';
import { PHASES, phaseFraction, phaseIndex, stageOf } from '../sim/phases';
import { canTrain, TECHNIQUES } from '../sim/techniques';
import { t, t as tr, k } from '../i18n';
import { useSceneId } from './hud/sceneChoice';

/**
 * The stage of the Cultivo panel: the installation, the plant and its pot BIG in the middle, the skill hotbar (keys 1–6), the
 * growth timeline and the next thing to do. Everything else (plant card, installation, room, resources, tools, instruments)
 * lives in the side rails (`cultivo/CultivoRails.tsx`), so nothing covers the plant. The plant itself is playable: touch the
 * pot to water, the leaves to feed, the crown to train it.
 */
interface CultivationSceneProps {
  onOpenSeedModal: () => void;
  onOpenNutrients: () => void;
  onShowRoom: () => void;
  /** open the care panel (plagues, males, cleaning) */
  onOpenCare: () => void;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

// one milestone per phase, in order, and the cut at the end: germination · seedling · vegetative · flowering · maturation · harvest
const MILESTONES = [...PHASES.map((p) => p.label), k('Cosecha')];
const STEP = 100 / PHASES.length;
const NAMES: Record<string, string> = Object.fromEntries(PHASES.map((p) => [p.id, p.label]));

/** Maps the plant's progress to the evenly spaced phases (each phase is one step of the bar). */
const timelinePct = (p: number): number => {
  const stage = stageOf(p);
  if (stage === 'ready_harvest') return 100;
  return (phaseIndex(stage) + phaseFraction(p)) * STEP;
};

export const CultivationScene: React.FC<CultivationSceneProps> = ({ onOpenSeedModal, onOpenNutrients, onShowRoom, onOpenCare }) => {
  const {
    activePlant, indoorPlants, selectedPlantIndex,
    waterPlant, feedNutrients, speedUpGrowth, harvestPlant, saveCurrentPlantAsMotherOrFather,
    currentRoom, currentFacility, facilities, getPlantEta, care, equipStats,
  } = useGame();
  const sceneId = useSceneId(currentFacility, facilities);

  const [floaters, setFloaters] = useState<Array<{ id: number; text: string; color: string; dx: number }>>([]);
  const nextId = useRef(1);
  const [techOpen, setTechOpen] = useState(false);

  const pop = (text: string, color: string) => {
    const id = nextId.current++;
    setFloaters((f) => [...f.slice(-4), { id, text, color, dx: (Math.random() - 0.5) * 120 }]);
    window.setTimeout(() => setFloaters((f) => f.filter((x) => x.id !== id)), 1400);
  };

  const room = GROW_ROOMS_CONFIG.find((r) => r.id === currentRoom) ?? GROW_ROOMS_CONFIG[0];
  const flowering = activePlant ? activePlant.lightSchedule === '12/12' : room.recommendedLightSchedule === '12/12';
  const lightPct = activePlant ? clamp(activePlant.ppfdLightIntensity / 1000, 0.3, 1) : 0.5;
  const lampColor = flowering ? '255,140,60' : '190,240,255';

  const spores = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ left: 8 + ((i * 37) % 84), delay: (i * 0.9) % 9, dx: ((i % 5) - 2) * 14, size: 2 + (i % 3) })),
    [],
  );

  const thirstyCount = indoorPlants.filter(isThirsty).length;
  const eta = activePlant ? getPlantEta(activePlant) : Infinity;
  const thirsty = !!activePlant && isThirsty(activePlant);
  const hungry = !!activePlant && isHungry(activePlant);
  // a plant can be cut only when it has been through every phase, maturation included
  const canHarvest = !!activePlant && activePlant.stage === 'ready_harvest';
  const maleWarn = !!activePlant && activePlant.sex === 'male' && activePlant.progressPercent >= 30;

  const doWater = () => { waterPlant(); pop(tr('+ Riego'), '#22d3ee'); };
  const doFeed = () => { feedNutrients(); pop('+ N-P-K', '#34d399'); };
  const doTrain = () => setTechOpen(true);
  const techNow = activePlant ? TECHNIQUES.filter((t) => canTrain(activePlant, t.id, NAMES).ok).length : 0;

  const nextKind = nextActionFor({
    hasPlant: !!activePlant, harvestReady: false, pest: activePlant?.pest ? PEST_INFO[activePlant.pest.kind].label : null, thirsty, hungry,
    maleWarn, thirstyOthers: Math.max(0, thirstyCount - (thirsty ? 1 : 0)), etaText: '',
  }).kind;
  const slots: SlotSpec[] = activePlant ? [
    { key: 'water', label: tr('Regar'), sub: tr('Hum {soilMoisture}%', { soilMoisture: activePlant.soilMoisture }), tone: 'cyan', icon: <Droplet className="w-6 h-6" />, hot: nextKind === 'water', tour: 'water', onClick: doWater },
    { key: 'feed', label: tr('Abonar'), sub: `EC ${activePlant.ecLevel}`, tone: 'lime', icon: <NutrientBottle className="w-6 h-6" />, hot: nextKind === 'feed', tour: 'feed', onClick: doFeed },
    { key: 'train', label: tr('Técnicas'), sub: `${techNow} ahora`, tone: 'pink', icon: <Scissors className="w-6 h-6" />, onClick: doTrain },
    { key: 'speed', label: tr('Acelerar'), sub: 'ciclo', tone: 'amber', cost: '25', icon: <span className="flex items-center"><Flame className="w-6 h-6" /><Zap className="w-3.5 h-3.5 -ml-1" /></span>, onClick: () => { if (speedUpGrowth()) pop('- 25 $FLORA', '#fbbf24'); } },
    { key: 'nutri', label: tr('Nutrición'), sub: 'tablas', tone: 'violet', icon: <FlaskLeaf className="w-6 h-6" />, onClick: onOpenNutrients },
    { key: 'mother', label: tr('Madre'), sub: 'clones', tone: 'neutral', icon: <Crown className="w-6 h-6" />, onClick: () => { saveCurrentPlantAsMotherOrFather('Madre (Esquejes / Clones)'); pop(tr('Madre guardada'), '#c084fc'); } },
  ] : [];
  // keys 1–6 press the hotbar (ignored while typing)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const i = Number(e.key) - 1;
      if (Number.isInteger(i) && i >= 0 && i < slots.length) slots[i].onClick();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const next = nextActionFor({
    hasPlant: !!activePlant, harvestReady: false, pest: activePlant?.pest ? PEST_INFO[activePlant.pest.kind].label : null, thirsty, hungry, maleWarn,
    thirstyOthers: Math.max(0, thirstyCount - (thirsty ? 1 : 0)), etaText: isFinite(eta) ? formatDuration(eta) : '—',
  });
  const runNext = () => {
    if (next.kind === 'seed') onOpenSeedModal();
    else if (next.kind === 'water') doWater();
    else if (next.kind === 'feed') doFeed();
    else if (next.kind === 'pest' || next.kind === 'male') onOpenCare();
    else if (next.kind === 'room-thirst') onShowRoom();
  };

  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-emerald-400/20 bg-[#02080a] h-[calc(100dvh-26.5rem)] min-h-[640px] max-h-[880px] shadow-[0_0_60px_-20px_rgba(52,211,153,0.4)]" data-testid="cultivo-stage">
      {/* ── backdrop: the facility itself (each tier is a different place) ── */}
      <FacilityBackdrop facilityId={sceneId} lampColor={lampColor} lightPct={lightPct} equip={equipStats} hour={new Date().getHours() + new Date().getMinutes() / 60} />
      <div className="absolute inset-0 pointer-events-none">
        {spores.map((s, i) => (
          <span key={i} className="cf-spore absolute bottom-[14%] rounded-full bg-emerald-200"
            style={{ left: `${s.left}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, ['--dx' as string]: `${s.dx}px`, boxShadow: '0 0 8px rgba(110,231,183,0.9)' }} />
        ))}
      </div>

      {/* ── what to do next / harvest: top centre, away from the plant ── */}
      <div className="absolute z-30 inset-x-0 top-3 flex justify-center px-4 pointer-events-none" data-tour="next-action">
        {canHarvest && activePlant ? (
          <button
            onClick={() => { const g = activePlant.estimatedDryYieldGrams; harvestPlant(); pop(tr('+ {g}g flor', { g }), '#fbbf24'); }}
            className="pointer-events-auto cf-ring px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500 text-neutral-950 font-black text-sm tracking-wide uppercase shadow-[0_0_30px_rgba(251,191,36,0.55)] cursor-pointer active:scale-95 transition flex items-center gap-2"
          >
            <CannabisLeaf className="w-5 h-5" />
            {tr('Cosechar · ~{estimatedDryYieldGrams}g', { estimatedDryYieldGrams: activePlant.estimatedDryYieldGrams })}
          </button>
        ) : (
          <button onClick={runNext} disabled={!next.actionable} title={tr(next.hint)}
            className={`pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-bold transition ${next.actionable ? 'bg-emerald-300 text-neutral-950 shadow-[0_0_24px_-4px_rgba(190,242,100,.9)] hover:bg-emerald-200 cf-ring cursor-pointer' : 'bg-neutral-950/80 text-neutral-300 border border-white/10 cursor-default'}`}>
            {next.actionable ? <Hand className="w-4 h-4" aria-hidden /> : <Sprout className="w-4 h-4 text-emerald-300" aria-hidden />}
            <span className="text-[9px] font-mono uppercase tracking-[0.18em] opacity-70">{next.actionable ? tr('Siguiente') : tr('Estado')}</span>
            {tr(next.label)}
          </button>
        )}
      </div>

      {/* ── the plant: the protagonist. Big, centred, pot included ── */}
      <div className="absolute inset-x-0 top-[5%] bottom-[28%] flex items-end justify-center pointer-events-none">
        {activePlant ? (
          <div className="relative h-full w-full max-w-[760px]">
            <PlantView
              className="h-full w-full drop-shadow-[0_18px_28px_rgba(0,0,0,0.85)]"
              seedKey={`${activePlant.id ?? ''}${activePlant.strain.id}${selectedPlantIndex}`}
              stage={activePlant.stage}
              progress={Math.round(activePlant.progressPercent * 2) / 2}
              health={activePlant.health}
              soilMoisture={activePlant.soilMoisture}
              vpdOptimal={activePlant.vpdKpa >= 0.8 && activePlant.vpdKpa <= 1.4}
              strainColor={activePlant.strain.colorTheme || '#15803d'}
              amberPct={activePlant.trichomeMaturity.amber}
              pest={activePlant.pest?.kind}
            />
            {/* touch the plant: crown → train, leaves → feed, pot → water */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[62%] grid grid-rows-[34fr_38fr_28fr] gap-1 pointer-events-none [&>button]:pointer-events-auto" data-testid="plant-hotspots">
              <button type="button" onClick={doTrain} className="cs-hot cs-hot--pink" aria-label={tr('Técnicas de entrenamiento')}><span className="cs-hot-lbl"><Scissors className="w-3.5 h-3.5" />{t('Técnicas')}{' '}<kbd>3</kbd></span></button>
              <button type="button" onClick={doFeed} className="cs-hot cs-hot--lime" aria-label={tr('Abonar la planta')}><span className="cs-hot-lbl"><NutrientBottle className="w-3.5 h-3.5" />{t('Abonar')}{' '}<kbd>2</kbd></span></button>
              <button type="button" onClick={doWater} className="cs-hot cs-hot--cyan" aria-label={tr('Regar la maceta')}><span className="cs-hot-lbl"><Droplet className="w-3.5 h-3.5" />{t('Regar')}{' '}<kbd>1</kbd></span></button>
            </div>
          </div>
        ) : (
          <div className="pointer-events-auto self-center text-center max-w-sm space-y-3 px-6">
            <div className="mx-auto w-16 h-16 rounded-full border border-dashed border-emerald-300/40 flex items-center justify-center"><Sprout className="w-7 h-7 text-emerald-300" /></div>
            <h3 className="font-serif text-lg font-bold text-white">{t('Sala lista para sembrar')}</h3>
            <p className="text-xs text-neutral-400">{t('Elige una genética de tu banco de semillas para iniciar el ciclo.')}</p>
            <button onClick={onOpenSeedModal} className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold text-xs cursor-pointer inline-flex items-center gap-2"><CannabisLeaf className="w-4 h-4" />{' '}{t('Seleccionar semilla')}</button>
          </div>
        )}
      </div>

      {/* floating feedback text */}
      <div className="absolute left-1/2 bottom-[36%] pointer-events-none z-20">
        {floaters.map((f) => (
          <span key={f.id} className="cf-float-up absolute whitespace-nowrap font-serif font-black text-lg" style={{ color: f.color, marginLeft: f.dx, textShadow: `0 0 12px ${f.color}` }}>{tr(f.text)}</span>
        ))}
      </div>

      {techOpen && activePlant && <TechniqueMenu plant={activePlant} onClose={() => setTechOpen(false)} />}

      {/* ── skill hotbar (keys 1–6) ── */}
      {activePlant && (
        <div className="absolute z-30 inset-x-0 bottom-[4.7rem] flex justify-center px-2 pointer-events-none [&>*]:pointer-events-auto"><Hotbar slots={slots} /></div>
      )}

      {/* ── bottom: growth timeline ── */}
      <div className="absolute z-30 bottom-3 inset-x-3">
        <div className="px-3 pt-2 pb-2.5 rounded-xl bg-neutral-950/80 border border-emerald-400/20">
          {activePlant ? (
            <>
              <div className="relative h-2 rounded-full bg-neutral-800 overflow-visible">
                <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-lime-400 via-emerald-400 to-fuchsia-400" style={{ width: `${timelinePct(activePlant.progressPercent)}%`, transition: 'width 1s linear', boxShadow: '0 0 10px rgba(52,211,153,0.7)' }} />
                {Array.from({ length: PHASES.length + 1 }, (_, i) => i * STEP).map((p) => (
                  <span key={p} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2" style={{ left: `${p}%`, background: timelinePct(activePlant.progressPercent) >= p ? '#34d399' : '#0b1512', borderColor: timelinePct(activePlant.progressPercent) >= p ? '#a7f3d0' : '#2f4d40' }} />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[9px] sm:text-[10px] font-mono uppercase tracking-wide">
                {MILESTONES.map((m, i) => {
                  const reached = timelinePct(activePlant.progressPercent) >= i * STEP;
                  const current = reached && (i === MILESTONES.length - 1 || timelinePct(activePlant.progressPercent) < (i + 1) * STEP);
                  return <span key={m} className={`${reached ? 'text-emerald-300' : 'text-neutral-600'} ${current ? '' : 'max-sm:hidden'}`}>{t(m)}</span>;
                })}
              </div>
            </>
          ) : <div className="text-xs font-mono text-neutral-500 text-center py-1">{t('Sin cultivo activo')}</div>}
        </div>
      </div>
    </div>
  );
};
