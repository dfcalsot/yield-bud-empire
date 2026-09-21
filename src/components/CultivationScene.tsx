import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Droplet, Scissors, Flame, Zap, Crown, Layers, Grid3X3, SlidersHorizontal, ChevronDown, Sprout, Bug, Briefcase, Hand, Hammer } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GROW_ROOMS_CONFIG } from '../data/initialData';
import { PlantView } from './PlantView';
import { CarePanel } from './CarePanel';
import { GardenerCameo } from './npc/GardenerCameo';
import { NutrientBottle, FlaskLeaf, CannabisLeaf } from './icons/CannabisIcons';
import { StatBar } from './game/GameUI';
import type { GrowStage } from '../types';
import { formatDuration, hoursUntilMoisture, isHungry, isThirsty, PEST_INFO } from '../sim/engine';
import { nextActionFor } from '../sim/nextAction';
import { remainingMs } from '../sim/facilities';
import { openBag } from '../ui/events';
import { Hotbar, HudToolbar, Nameplate, Orb, type SlotSpec, type ToolSpec } from './hud/HudParts';
import { FacilityBackdrop } from './hud/FacilityBackdrop';
import { Droplets as DropletsIcon, FlaskConical as FlaskIcon, Zap as ZapIcon } from 'lucide-react';

interface CultivationSceneProps {
  onOpenSeedModal: () => void;
  onOpenFacility: () => void;
  onOpenNutrients: () => void;
  onOpenMarket?: (cat?: string) => void;
  onOpenPlanet?: () => void;
  onOpenPanel: () => void;
  onShowRoom: () => void;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

const STAGE_LABEL: Record<GrowStage, string> = {
  seed: 'Germinación',
  seedling: 'Plántula',
  vegetative: 'Vegetativo',
  flowering: 'Floración',
  ready_harvest: 'Lista para cosecha',
};

const STAGE_DOT: Record<GrowStage, string> = {
  seed: '#a3e635',
  seedling: '#a3e635',
  vegetative: '#34d399',
  flowering: '#c084fc',
  ready_harvest: '#fbbf24',
};

// milestone = the moment a stage begins (progress 0 / 15 / 50 / 95 / 100)
const MILESTONES = ['Semilla', 'Vegetativo', 'Floración', 'Maduración', 'Cosecha'];

/** Maps 0..100 plant progress to the 5 evenly spaced milestones (stage thresholds 15 / 50 / 95). */
const timelinePct = (p: number): number => {
  if (p < 15) return (p / 15) * 25;
  if (p < 50) return 25 + ((p - 15) / 35) * 25;
  if (p < 95) return 50 + ((p - 50) / 45) * 25;
  return 75 + ((p - 95) / 5) * 25;
};

/* ───────────────────────────── small pieces ───────────────────────────── */

const MiniGauge: React.FC<{
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  okMin: number;
  okMax: number;
}> = ({ label, value, display, min, max, okMin, okMax }) => {
  const ok = value >= okMin && value <= okMax;
  const color = ok ? '#34d399' : '#fbbf24';
  const C = 2 * Math.PI * 15;
  const dash = clamp((value - min) / (max - min)) * C;
  return (
    <div
      className="shrink-0 flex items-center gap-2 pl-1.5 pr-2.5 py-0.5 rounded-xl bg-neutral-950/75 border"
      style={{ borderColor: ok ? 'rgba(52,211,153,0.25)' : 'rgba(251,191,36,0.45)' }}
      title={`${label}: ${display} (ideal ${okMin}–${okMax})`}
    >
      <svg viewBox="0 0 36 36" className="w-7 h-7 -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#16342a" strokeWidth="4" />
        <circle cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${dash} ${C}`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div className="leading-none">
        <div className="text-[9px] uppercase tracking-wider text-neutral-400 font-mono">{label}</div>
        <div className="text-xs font-bold font-mono mt-0.5" style={{ color }}>{display}</div>
      </div>
    </div>
  );
};


/** One of the three gauge groups (Clima / Raíz / Luz y aire): a status dot, a one-line summary, and the detail on demand.
 *  A group with something out of range opens by itself and says what is wrong. */
interface GaugeSpec { label: string; value: number; display: string; min: number; max: number; okMin: number; okMax: number }
const GaugeGroup: React.FC<{ title: string; items: GaugeSpec[]; onOpen?: () => void }> = ({ title, items, onOpen }) => {
  const [open, setOpen] = useState(false);
  const bad = items.filter((g) => g.value < g.okMin || g.value > g.okMax);
  const show = open || bad.length > 0;
  const dot = bad.length ? '#fbbf24' : '#a3e635';
  return (
    <div className="gh-frame shrink-0 !rounded-xl" style={bad.length ? { borderColor: 'rgba(251,191,36,0.6)' } : undefined}>
      <button onClick={() => { if (!open) onOpen?.(); setOpen((v) => !v); }} aria-expanded={show} className="flex items-center gap-1.5 w-full px-2 py-1.5 text-left cursor-pointer">
        <span className="text-[9.5px] font-mono uppercase tracking-[0.16em] text-neutral-200">{title}</span>
        <span className="ml-auto w-2 h-2 rounded-full" style={{ background: dot, boxShadow: `0 0 8px ${dot}` }} aria-label={bad.length ? 'Atención' : 'Óptimo'} />
        <ChevronDown className={`w-3 h-3 text-neutral-400 transition ${show ? 'rotate-180' : ''}`} />
      </button>
      {!show && <div className="px-2 pb-1.5 -mt-0.5 text-[10px] font-mono text-neutral-400 truncate">{items.map((g) => g.display).join(' · ')}</div>}
      {show && (
        <div className="px-1 pb-1.5 space-y-1">
          {items.map((g) => <MiniGauge key={g.label} {...g} />)}
          {bad.map((g) => <p key={g.label} className="px-1 text-[10px] leading-snug text-amber-300">{g.label} {g.value < g.okMin ? 'bajo' : 'alto'}: lo ideal es {g.okMin}–{g.okMax}.</p>)}
        </div>
      )}
    </div>
  );
};

const SkillButton: React.FC<{
  label: string;
  sub?: string;
  badge?: string;
  tone: 'cyan' | 'emerald' | 'purple' | 'amber' | 'neutral';
  pulse?: boolean;
  tour?: string;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, sub, badge, tone, pulse, tour, onClick, children }) => {
  const tones = {
    cyan: 'border-cyan-300/40 text-cyan-200 hover:bg-cyan-400/15 hover:shadow-[0_0_18px_rgba(34,211,238,0.5)]',
    emerald: 'border-emerald-300/40 text-emerald-200 hover:bg-emerald-400/15 hover:shadow-[0_0_18px_rgba(52,211,153,0.5)]',
    purple: 'border-fuchsia-300/40 text-fuchsia-200 hover:bg-fuchsia-400/15 hover:shadow-[0_0_18px_rgba(232,121,249,0.5)]',
    amber: 'border-amber-300/50 text-amber-200 hover:bg-amber-400/15 hover:shadow-[0_0_18px_rgba(251,191,36,0.55)]',
    neutral: 'border-neutral-500/40 text-neutral-200 hover:bg-neutral-400/10',
  } as const;
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      data-tour={tour}
      className={`relative shrink-0 w-14 h-[3.75rem] sm:w-[3.3rem] sm:h-[3.05rem] flex flex-col items-center justify-center gap-0.5 rounded-xl bg-neutral-950/80 border transition active:scale-95 cursor-pointer ${tones[tone]} ${pulse ? 'cf-ring' : ''}`}
    >
      {children}
      <span className="text-[8.5px] font-mono uppercase tracking-wide leading-none text-neutral-300">{sub ?? label}</span>
      {badge && (
        <span className="absolute -top-1.5 -right-1.5 px-1 rounded-md bg-amber-400 text-neutral-950 text-[9px] font-black font-mono">{badge}</span>
      )}
    </button>
  );
};

/* ───────────────────────────── scene ───────────────────────────── */

export const CultivationScene: React.FC<CultivationSceneProps> = ({ onOpenSeedModal, onOpenFacility, onOpenNutrients, onOpenPanel, onShowRoom, onOpenMarket, onOpenPlanet }) => {
  const {
    activePlant, indoorPlants, selectedPlantIndex, selectPlant,
    waterPlant, feedNutrients, trainPlant, speedUpGrowth, harvestPlant, saveCurrentPlantAsMotherOrFather,
    currentRoom, switchGrowRoom, currentFacility, construction, facilities, rawFlowerGrams, trimGrams, co2Ppm, getPlantEta, care, reportEvent, resources, equipStats,
  } = useGame();

  const [roomMenu, setRoomMenu] = useState(false);
  const [buildNow, setBuildNow] = useState(() => Date.now());
  useEffect(() => { if (!construction) return; const t = setInterval(() => setBuildNow(Date.now()), 15000); setBuildNow(Date.now()); return () => clearInterval(t); }, [construction]);
  const [careOpen, setCareOpen] = useState(false);
  const [floaters, setFloaters] = useState<Array<{ id: number; text: string; color: string; dx: number }>>([]);
  const nextId = useRef(1);

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
    () => Array.from({ length: 14 }, (_, i) => ({
      left: 8 + ((i * 37) % 84),
      delay: (i * 0.9) % 9,
      dx: ((i % 5) - 2) * 14,
      size: 2 + (i % 3),
    })),
    [],
  );

  const readyCount = indoorPlants.filter((p) => p.stage === 'ready_harvest').length;
  const thirstyCount = indoorPlants.filter(isThirsty).length;
  const eta = activePlant ? getPlantEta(activePlant) : Infinity;
  const nextWaterH = activePlant ? hoursUntilMoisture(activePlant, 40) : Infinity;
  const thirsty = !!activePlant && isThirsty(activePlant);
  const hungry = !!activePlant && isHungry(activePlant);
  const clockRows = activePlant ? [
    { icon: '⏱', text: activePlant.stage === 'ready_harvest' ? '¡Lista para cosechar!' : isFinite(eta) ? `Cosecha en ${formatDuration(eta)}` : 'Crecimiento en pausa', warn: !isFinite(eta) && activePlant.stage !== 'ready_harvest' },
    { icon: '💧', text: activePlant.stage === 'ready_harvest' ? 'Sin riego pendiente' : thirsty ? '¡Necesita agua ya!' : `Regar en ~${formatDuration(nextWaterH * 3600)}`, warn: thirsty },
    ...(activePlant.sex === 'male' && activePlant.progressPercent >= 30 ? [{ icon: '♂', text: 'Macho: quítalo en Cuidado', warn: true }] : []),
    ...(activePlant.pollinated ? [{ icon: '🐝', text: 'Polinizada · dará semillas', warn: false }] : []),
    ...(activePlant.pest ? [{ icon: PEST_INFO[activePlant.pest.kind].emoji, text: `${PEST_INFO[activePlant.pest.kind].label} · ${Math.max(1, Math.round(activePlant.pest.hours))} h`, warn: true }] : []),
  ] : [];
  const canHarvest = !!activePlant && activePlant.progressPercent >= 80;

  const nextKind = nextActionFor({
    hasPlant: !!activePlant, harvestReady: false, pest: activePlant?.pest ? PEST_INFO[activePlant.pest.kind].label : null, thirsty, hungry,
    maleWarn: !!activePlant && activePlant.sex === 'male' && activePlant.progressPercent >= 30, thirstyOthers: Math.max(0, thirstyCount - (thirsty ? 1 : 0)), etaText: '',
  }).kind;
  const slots: SlotSpec[] = activePlant ? [
    { key: 'water', label: 'Regar', sub: `Hum ${activePlant.soilMoisture}%`, tone: 'cyan', icon: <Droplet className="w-6 h-6" />, hot: nextKind === 'water', tour: 'water', onClick: () => { waterPlant(); pop('+ Riego', '#22d3ee'); } },
    { key: 'feed', label: 'Abonar', sub: `EC ${activePlant.ecLevel}`, tone: 'lime', icon: <NutrientBottle className="w-6 h-6" />, hot: nextKind === 'feed', tour: 'feed', onClick: () => { feedNutrients(); pop('+ N-P-K', '#34d399'); } },
    { key: 'lst', label: 'LST', sub: '+12%', tone: 'pink', icon: <Scissors className="w-6 h-6" />, onClick: () => { trainPlant('Topping & LST'); pop('LST +12%', '#e879f9'); } },
    { key: 'speed', label: 'Acelerar', sub: 'ciclo', tone: 'amber', cost: '25', icon: <span className="flex items-center"><Flame className="w-6 h-6" /><Zap className="w-3.5 h-3.5 -ml-1" /></span>, onClick: () => { if (speedUpGrowth()) pop('- 25 $FLORA', '#fbbf24'); } },
    { key: 'nutri', label: 'Nutrición', sub: 'tablas', tone: 'violet', icon: <FlaskLeaf className="w-6 h-6" />, onClick: onOpenNutrients },
    { key: 'mother', label: 'Madre', sub: 'clones', tone: 'neutral', icon: <Crown className="w-6 h-6" />, onClick: () => { saveCurrentPlantAsMotherOrFather('Madre (Esquejes / Clones)'); pop('Madre guardada', '#c084fc'); } },
  ] : [];
  const tools: ToolSpec[] = [
    { key: 'bag', label: 'Maletín', icon: <Briefcase className="w-5 h-5" />, color: '#b8f35a', onClick: openBag, tour: 'bag-scene', title: 'Maletín (I)' },
    { key: 'room', label: 'Sala', icon: <Grid3X3 className="w-5 h-5" />, color: '#5eead4', onClick: onShowRoom, badge: thirstyCount || undefined, badgeColor: '#22d3ee', title: 'Ver todas las plantas de la sala' },
    { key: 'panel', label: 'Panel', icon: <SlidersHorizontal className="w-5 h-5" />, color: '#22d3ee', onClick: onOpenPanel, title: 'Panel completo de instrumentos' },
    ...(onOpenPlanet ? [{ key: 'planet', label: 'Parcelas', icon: <Layers className="w-5 h-5" />, color: '#38bdf8', onClick: onOpenPlanet, title: 'Tus parcelas en el Planeta' } as ToolSpec] : []),
    { key: 'care', label: 'Cuidado', icon: <Bug className="w-5 h-5" />, color: '#f472b6', onClick: () => setCareOpen((v) => !v), badge: care.males > 0 ? '♂' : undefined, badgeColor: '#38bdf8', title: 'Plagas, machos, limpieza y jardinero' },
  ];
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

  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-emerald-400/20 bg-[#02080a] h-[calc(100dvh-21rem)] min-h-[720px] sm:min-h-[560px] max-h-[900px] shadow-[0_0_60px_-20px_rgba(52,211,153,0.4)]">
      {/* ── backdrop: the facility itself (each tier is a different place) ── */}
      <FacilityBackdrop facilityId={currentFacility.id} lampColor={lampColor} lightPct={lightPct} equip={equipStats} hour={new Date().getHours() + new Date().getMinutes() / 60} />
      <div className="absolute inset-0 pointer-events-none">
        {spores.map((s, i) => (
          <span
            key={i}
            className="cf-spore absolute bottom-[14%] rounded-full bg-emerald-200"
            style={{ left: `${s.left}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, ['--dx' as string]: `${s.dx}px`, boxShadow: '0 0 8px rgba(110,231,183,0.9)' }}
          />
        ))}
      </div>

      {/* ── the plant ── */}
      <div className={`absolute inset-x-0 top-[12%] bottom-[34%] ${canHarvest ? 'sm:bottom-[30%]' : 'sm:bottom-[25%]'} flex items-end justify-center pointer-events-none transition-all duration-500`}>
        {activePlant ? (
          <PlantView
            className="h-full w-full max-w-[560px] drop-shadow-[0_18px_28px_rgba(0,0,0,0.85)]"
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
        ) : (
          <div className="pointer-events-auto self-center text-center max-w-sm space-y-3 px-6">
            <div className="mx-auto w-16 h-16 rounded-full border border-dashed border-emerald-300/40 flex items-center justify-center">
              <Sprout className="w-7 h-7 text-emerald-300" />
            </div>
            <h3 className="font-serif text-lg font-bold text-white">Sala lista para sembrar</h3>
            <p className="text-xs text-neutral-400">Elige una genética de tu banco de semillas para iniciar el ciclo.</p>
            <button onClick={onOpenSeedModal} className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold text-xs cursor-pointer inline-flex items-center gap-2">
              <CannabisLeaf className="w-4 h-4" /> Seleccionar semilla
            </button>
          </div>
        )}
      </div>

      {/* floating feedback text */}
      <div className="absolute left-1/2 bottom-[34%] pointer-events-none z-20">
        {floaters.map((f) => (
          <span key={f.id} className="cf-float-up absolute whitespace-nowrap font-serif font-black text-lg" style={{ color: f.color, marginLeft: f.dx, textShadow: `0 0 12px ${f.color}` }}>
            {f.text}
          </span>
        ))}
      </div>

      {/* ── top HUD ── */}
      <div className="absolute top-3 inset-x-3 z-30 flex items-start justify-between gap-3 pt-10">
        <div className="flex flex-col gap-2 items-start relative">
          <button onClick={() => setRoomMenu((v) => !v)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-950/80 border border-emerald-400/30 text-left cursor-pointer hover:border-emerald-300/60 transition">
            <CannabisLeaf className="w-5 h-5 text-emerald-300" />
            <div className="leading-tight">
              <div className="text-xs font-bold text-white max-w-[9.5rem] sm:max-w-[16rem] truncate">{room.name}</div>
              <div className="text-[10px] font-mono text-emerald-300/80">{room.targetTempC}°C · {room.targetRhPercent}% HR · {room.recommendedLightSchedule}</div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition ${roomMenu ? 'rotate-180' : ''}`} />
          </button>
          {roomMenu && (
            <div className="absolute top-full mt-1.5 left-0 w-72 max-w-[85vw] rounded-xl bg-neutral-950/95 border border-emerald-400/30 p-1.5 space-y-1 shadow-2xl">
              {GROW_ROOMS_CONFIG.map((r) => (
                <button
                  key={r.id}
                  onClick={() => { switchGrowRoom(r.id); setRoomMenu(false); }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg border transition cursor-pointer ${r.id === currentRoom ? 'bg-emerald-400/15 border-emerald-300/50' : 'border-transparent hover:bg-neutral-800/70'}`}
                >
                  <div className="text-xs font-bold text-white">{r.name}</div>
                  <div className="text-[10px] font-mono text-neutral-400">{r.targetTempC}°C · {r.targetRhPercent}% HR · {r.recommendedLightSchedule}</div>
                </button>
              ))}
            </div>
          )}
          <button onClick={onOpenFacility} className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-950/70 border border-neutral-600/40 text-xs text-neutral-200 cursor-pointer hover:border-emerald-300/40 transition">
            <Layers className="w-3.5 h-3.5 text-emerald-300" />
            <span className="max-w-[14rem] truncate">{currentFacility.name}</span>
            <span className="text-[10px] font-mono text-emerald-300">Nv.{currentFacility.tier}</span>
          </button>
          {construction && (
            <button onClick={onOpenFacility} className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-950/70 border border-amber-400/50 text-[11px] text-amber-100 cursor-pointer hover:border-amber-300 transition" title="Obra en marcha · toca para verla o acelerarla" data-testid="build-badge">
              <Hammer className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span className="max-w-[10rem] truncate">{(facilities.find((f) => f.id === construction.facilityId)?.name ?? 'Obra').split(' (')[0]}</span>
              <span className="font-mono text-amber-300">{formatDuration(remainingMs(construction, buildNow) / 1000)}</span>
            </button>
          )}
          <div className="gh-orbs mt-1" data-tour="orbs">
            <Orb kind="water" label="Agua" value={`${Math.round(resources.water)} L`} fill={resources.water / 300} icon={<DropletsIcon className="w-5 h-5" />} low={resources.water < 20} onClick={() => onOpenMarket?.('water')} title="Agua en el tanque · toca para comprar" />
            <Orb kind="nutrient" label="Abono" value={`${Math.round(resources.nutrient)} ml`} fill={resources.nutrient / 1000} icon={<FlaskIcon className="w-5 h-5" />} low={resources.nutrient < 60} onClick={() => onOpenMarket?.('nutrient')} title="Abono · toca para comprar" />
            <Orb kind="energy" label="Energía" value={`${resources.energy.toFixed(0)} kWh`} fill={resources.energy / 100} icon={<ZapIcon className="w-5 h-5" />} low={Number.isFinite(resources.energyDays) && resources.energyDays < 0.5} onClick={() => onOpenMarket?.('energy')} title="Electricidad · toca para comprar" />
          </div>
        </div>

        {activePlant && (
          <div className="hidden md:block">
            <Nameplate
              name={activePlant.strain.name}
              stage={STAGE_LABEL[activePlant.stage]}
              stageColor={STAGE_DOT[activePlant.stage]}
              index={selectedPlantIndex + 1}
              thc={activePlant.strain.thcPercentage}
              health={activePlant.health}
              progress={activePlant.progressPercent}
              emblem={<CannabisLeaf className="w-6 h-6" />}
              clocks={clockRows}
            />
          </div>
        )}
        {activePlant && (
          <div className="md:hidden absolute top-[8.6rem] left-1/2 -translate-x-1/2 z-30 flex gap-3 px-3 py-1 rounded-full bg-neutral-950/85 border border-emerald-400/25 text-[10px] font-mono whitespace-nowrap">
            {clockRows.map((r) => (
              <span key={r.icon} className={r.warn ? 'text-amber-300' : 'text-neutral-300'}>{r.icon} {r.text}</span>
            ))}
          </div>
        )}

        <HudToolbar tools={tools} flower={rawFlowerGrams} trim={trimGrams} />
      </div>

      {careOpen && (
        <div className="absolute z-40 inset-x-2 top-[7.6rem] flex justify-end sm:inset-x-auto sm:right-3 pointer-events-auto">
          <CarePanel onClose={() => setCareOpen(false)} onOpenMarket={() => { setCareOpen(false); onOpenMarket?.(); }} />
        </div>
      )}

      {care.gardenerLevel > 0 && <GardenerCameo />}

      {/* ── skill hotbar (keys 1–6) ── */}
      {activePlant && (
        <div className="absolute z-30 inset-x-0 bottom-[4.9rem] sm:bottom-[4.7rem] flex justify-center px-2 pointer-events-none [&>*]:pointer-events-auto">
          <Hotbar slots={slots} />
        </div>
      )}

      {/* ── gauges ── */}
      {activePlant && (
        <div className="absolute z-30 flex gap-1.5 overflow-x-auto scrollbar-none inset-x-2 bottom-[6.2rem] sm:inset-x-auto sm:right-3 sm:bottom-[5.3rem] sm:top-[9.4rem] sm:flex-col sm:justify-center sm:gap-1.5 sm:overflow-visible sm:w-[9.6rem] pointer-events-none [&>*]:pointer-events-auto" data-tour="gauges">
          <GaugeGroup title="Clima" onOpen={() => reportEvent('gauges')} items={[
            { label: 'Temp', value: activePlant.temperatureC, display: `${activePlant.temperatureC}°C`, min: 15, max: 35, okMin: 22, okMax: 28 },
            { label: 'Humedad', value: activePlant.relativeHumidity, display: `${activePlant.relativeHumidity}%`, min: 20, max: 90, okMin: 40, okMax: 65 },
            { label: 'VPD', value: activePlant.vpdKpa, display: `${activePlant.vpdKpa} kPa`, min: 0, max: 2.5, okMin: 0.8, okMax: 1.4 },
          ]} />
          <GaugeGroup title="Raíz" onOpen={() => reportEvent('gauges')} items={[
            { label: 'Sustrato', value: activePlant.soilMoisture, display: `${activePlant.soilMoisture}%`, min: 0, max: 100, okMin: 40, okMax: 85 },
            { label: 'pH', value: activePlant.phLevel, display: `${activePlant.phLevel}`, min: 5, max: 8, okMin: 5.8, okMax: 6.5 },
            { label: 'EC', value: activePlant.ecLevel, display: `${activePlant.ecLevel} mS`, min: 0, max: 4, okMin: 1, okMax: 2.4 },
          ]} />
          <GaugeGroup title="Luz y aire" onOpen={() => reportEvent('gauges')} items={[
            { label: 'PPFD', value: activePlant.ppfdLightIntensity, display: `${activePlant.ppfdLightIntensity}`, min: 0, max: 1200, okMin: 400, okMax: 1000 },
            { label: 'CO₂', value: co2Ppm, display: `${co2Ppm}`, min: 300, max: 1600, okMin: 700, okMax: 1400 },
          ]} />
        </div>
      )}

      {/* ── next recommended action ── */}
      {!canHarvest && (() => {
        const next = nextActionFor({
          hasPlant: !!activePlant,
          harvestReady: false,
          pest: activePlant?.pest ? PEST_INFO[activePlant.pest.kind].label : null,
          thirsty, hungry,
          maleWarn: !!activePlant && activePlant.sex === 'male' && activePlant.progressPercent >= 30,
          thirstyOthers: Math.max(0, thirstyCount - (thirsty ? 1 : 0)),
          etaText: isFinite(eta) ? formatDuration(eta) : '—',
        });
        const run = () => {
          if (next.kind === 'seed') onOpenSeedModal();
          else if (next.kind === 'water') { waterPlant(); pop('+ Riego', '#22d3ee'); }
          else if (next.kind === 'feed') { feedNutrients(); pop('+ N-P-K', '#34d399'); }
          else if (next.kind === 'pest' || next.kind === 'male') setCareOpen(true);
          else if (next.kind === 'room-thirst') onShowRoom();
        };
        return (
          <div className="absolute z-30 inset-x-0 bottom-[15.4rem] sm:bottom-[10.4rem] flex justify-center px-4 sm:px-16 pointer-events-none" data-tour="next-action">
            <button
              onClick={run}
              disabled={!next.actionable}
              title={next.hint}
              className={`pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-bold transition ${next.actionable ? 'bg-emerald-300 text-neutral-950 shadow-[0_0_24px_-4px_rgba(190,242,100,.9)] hover:bg-emerald-200 cf-ring cursor-pointer' : 'bg-neutral-950/80 text-neutral-300 border border-white/10 cursor-default'}`}
            >
              {next.actionable ? <Hand className="w-4 h-4" aria-hidden /> : <Sprout className="w-4 h-4 text-emerald-300" aria-hidden />}
              <span className="text-[9px] font-mono uppercase tracking-[0.18em] opacity-70">{next.actionable ? 'Siguiente' : 'Estado'}</span>
              {next.label}
            </button>
          </div>
        );
      })()}

      {/* ── harvest call-to-action ── */}
      {canHarvest && activePlant && (
        <div className="absolute z-30 inset-x-0 bottom-[15.4rem] sm:bottom-[10.4rem] flex justify-center px-4 sm:px-16 pointer-events-none">
          <button
            onClick={() => { const g = activePlant.stage === 'ready_harvest' ? activePlant.estimatedDryYieldGrams : Math.round(activePlant.estimatedDryYieldGrams * 0.75); harvestPlant(); pop(`+ ${g}g flor`, '#fbbf24'); }}
            className="pointer-events-auto cf-ring px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-emerald-400 to-amber-500 text-neutral-950 font-black text-sm tracking-wide uppercase shadow-[0_0_30px_rgba(251,191,36,0.55)] cursor-pointer active:scale-95 transition flex items-center gap-2"
          >
            <CannabisLeaf className="w-5 h-5" />
            {activePlant.stage === 'ready_harvest' ? `Cosechar · ~${activePlant.estimatedDryYieldGrams}g` : `Cosecha temprana · ~${Math.round(activePlant.estimatedDryYieldGrams * 0.75)}g`}
          </button>
        </div>
      )}

      {/* ── bottom: growth timeline + room map ── */}
      <div className="absolute z-30 bottom-3 inset-x-3 flex items-end gap-3">
        <div className="flex-1 min-w-0 px-3 pt-2 pb-2.5 rounded-xl bg-neutral-950/80 border border-emerald-400/20">
          {activePlant ? (
            <>
              <div className="relative h-2 rounded-full bg-neutral-800 overflow-visible">
                <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-lime-400 via-emerald-400 to-fuchsia-400" style={{ width: `${timelinePct(activePlant.progressPercent)}%`, transition: 'width 1s linear', boxShadow: '0 0 10px rgba(52,211,153,0.7)' }} />
                {[0, 25, 50, 75, 100].map((p) => (
                  <span key={p} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2" style={{ left: `${p}%`, background: timelinePct(activePlant.progressPercent) >= p ? '#34d399' : '#0b1512', borderColor: timelinePct(activePlant.progressPercent) >= p ? '#a7f3d0' : '#2f4d40' }} />
                ))}
              </div>
              <div className="mt-1.5 flex justify-between text-[9px] sm:text-[10px] font-mono uppercase tracking-wide">
                {MILESTONES.map((m, i) => {
                  const reached = timelinePct(activePlant.progressPercent) >= i * 25;
                  const current = reached && (i === MILESTONES.length - 1 || timelinePct(activePlant.progressPercent) < (i + 1) * 25);
                  return (
                    <span key={m} className={`${reached ? 'text-emerald-300' : 'text-neutral-600'} ${current ? '' : 'max-sm:hidden'}`}>{m}</span>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-xs font-mono text-neutral-500 text-center py-1">Sin cultivo activo</div>
          )}
        </div>

        <div className="shrink-0 p-2 rounded-xl bg-neutral-950/80 border border-emerald-400/20" title="Mapa de la sala: toca una planta para verla">
          <div className="grid grid-cols-10 gap-[3px]">
            {indoorPlants.slice(0, 30).map((p, i) => (
              <button
                key={p.id ?? i}
                onClick={() => selectPlant(i)}
                aria-label={`Planta ${i + 1}`}
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[3px] cursor-pointer transition"
                style={{
                  background: STAGE_DOT[p.stage],
                  opacity: p.health < 50 ? 0.55 : 1,
                  outline: i === selectedPlantIndex ? '2px solid #fff' : p.pest ? '1.5px solid #f472b6' : isThirsty(p) ? '1.5px solid #22d3ee' : p.stage === 'ready_harvest' ? '1px solid #fbbf24' : 'none',
                  outlineOffset: 1,
                  boxShadow: i === selectedPlantIndex ? '0 0 8px #fff' : undefined,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
