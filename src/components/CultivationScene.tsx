import React, { useMemo, useRef, useState } from 'react';
import { Droplet, Scissors, Flame, Zap, Crown, Layers, Grid3X3, SlidersHorizontal, ChevronDown, Sprout, Bug, Briefcase, Hand } from 'lucide-react';
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
import { openBag } from '../ui/events';

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
    <div className="shrink-0 rounded-xl bg-neutral-950/80 border" style={{ borderColor: bad.length ? 'rgba(251,191,36,0.5)' : 'rgba(163,230,53,0.22)' }}>
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
    currentRoom, switchGrowRoom, currentFacility, rawFlowerGrams, trimGrams, co2Ppm, getPlantEta, care, reportEvent,
  } = useGame();

  const [roomMenu, setRoomMenu] = useState(false);
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

  return (
    <div className="relative isolate overflow-hidden rounded-3xl border border-emerald-400/20 bg-[#02080a] h-[calc(100dvh-21rem)] min-h-[720px] sm:min-h-[560px] max-h-[900px] shadow-[0_0_60px_-20px_rgba(52,211,153,0.4)]">
      {/* ── backdrop: tent, lamp, light cone, floor ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 75% 60% at 50% 0%, rgba(${lampColor},${0.22 * lightPct}) 0%, rgba(16,185,129,${0.1 * lightPct}) 40%, transparent 75%), linear-gradient(180deg, #03100d 0%, #02090a 60%, #010506 100%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: 'linear-gradient(45deg, #1f3b34 25%, transparent 25%), linear-gradient(-45deg, #1f3b34 25%, transparent 25%)',
            backgroundSize: '36px 36px',
          }}
        />
        <div className="absolute top-0 bottom-0 left-3 w-1.5 rounded-full bg-neutral-700/50" />
        <div className="absolute top-0 bottom-0 right-3 w-1.5 rounded-full bg-neutral-700/50" />

        {/* LED bar + light cone */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[62%] max-w-2xl">
          <div className="flex justify-between px-10">
            <div className="w-0.5 h-5 bg-neutral-500/70" />
            <div className="w-0.5 h-5 bg-neutral-500/70" />
          </div>
          <div className="h-6 rounded-b-xl bg-gradient-to-r from-neutral-800 via-neutral-600 to-neutral-800 border border-neutral-500/50 flex items-center justify-around px-3" style={{ boxShadow: `0 8px 40px rgba(${lampColor},${0.5 * lightPct})` }}>
            {Array.from({ length: 14 }, (_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: `rgb(${i % 4 === 2 ? '239,68,68' : i % 4 === 3 ? '129,140,248' : lampColor})`, boxShadow: `0 0 6px rgba(${lampColor},0.9)` }} />
            ))}
          </div>
        </div>
        <div
          className="absolute top-[3.2rem] left-1/2 -translate-x-1/2 w-[92%] h-[90%] animate-led-shimmer"
          style={{
            clipPath: 'polygon(30% 0, 70% 0, 100% 100%, 0 100%)',
            background: `linear-gradient(180deg, rgba(${lampColor},${0.2 * lightPct}) 0%, rgba(${lampColor},${0.03 * lightPct}) 85%, transparent 100%)`,
          }}
        />

        {/* CO2 mist */}
        {co2Ppm >= 800 && (
          <div className="absolute top-14 left-[30%] right-[30%] h-40 flex justify-around overflow-hidden opacity-50">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="w-1.5 h-14 rounded-full bg-gradient-to-b from-cyan-300/40 to-transparent animate-co2-mist" style={{ animationDelay: `${i * 0.7}s` }} />
            ))}
          </div>
        )}

        {/* floor glow */}
        <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-emerald-500/10 to-transparent" />
        <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 w-[46%] h-16 rounded-[50%] blur-2xl" style={{ background: `rgba(${lampColor},${0.13 * lightPct})` }} />

        {/* floating spores */}
        {spores.map((s, i) => (
          <span
            key={i}
            className="cf-spore absolute bottom-[14%] rounded-full bg-emerald-200"
            style={{ left: `${s.left}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s`, ['--dx' as string]: `${s.dx}px`, boxShadow: '0 0 8px rgba(110,231,183,0.9)' }}
          />
        ))}
      </div>

      {/* ── the plant ── */}
      <div className={`absolute inset-x-0 top-[12%] bottom-[34%] ${canHarvest ? 'sm:bottom-[19%]' : 'sm:bottom-[12%]'} flex items-end justify-center pointer-events-none transition-all duration-500`}>
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
        </div>

        {activePlant && (
          <div className="hidden md:block px-4 py-2 rounded-xl bg-neutral-950/75 border border-emerald-400/20 min-w-[15rem] text-center">
            <div className="font-serif text-base font-bold text-white leading-tight">{activePlant.strain.name}</div>
            <div className="text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: STAGE_DOT[activePlant.stage] }}>
              {STAGE_LABEL[activePlant.stage]} · #{selectedPlantIndex + 1} · THC {activePlant.strain.thcPercentage}%
            </div>
            <StatBar value={activePlant.health} valueLabel={`${activePlant.health}%`} label="Salud" color={activePlant.health > 70 ? '#34d399' : activePlant.health > 45 ? '#fbbf24' : '#f87171'} />
            <div className="mt-1.5 flex justify-between gap-3 text-[10px] font-mono">
              {clockRows.map((r) => (
                <span key={r.icon} className={r.warn ? 'text-amber-300' : 'text-neutral-300'}>{r.icon} {r.text}</span>
              ))}
            </div>
          </div>
        )}
        {activePlant && (
          <div className="md:hidden absolute top-[8.6rem] left-1/2 -translate-x-1/2 z-30 flex gap-3 px-3 py-1 rounded-full bg-neutral-950/85 border border-emerald-400/25 text-[10px] font-mono whitespace-nowrap">
            {clockRows.map((r) => (
              <span key={r.icon} className={r.warn ? 'text-amber-300' : 'text-neutral-300'}>{r.icon} {r.text}</span>
            ))}
          </div>
        )}

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-950/75 border border-neutral-600/40 text-[10px] font-mono">
            <div><span className="text-neutral-500 block leading-none">FLOR</span><span className="text-emerald-300 font-bold text-xs">{rawFlowerGrams}g</span></div>
            <span className="w-px h-6 bg-neutral-700" />
            <div><span className="text-neutral-500 block leading-none">TRIM</span><span className="text-amber-300 font-bold text-xs">{trimGrams}g</span></div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={openBag} data-tour="bag-scene" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-950/80 border border-emerald-300/40 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-400/10 cursor-pointer" title="Maletín (I)"><Briefcase className="w-3.5 h-3.5" /> Maletín</button>
            <button onClick={onShowRoom} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-950/80 border border-neutral-600/40 text-[11px] font-semibold text-neutral-200 hover:border-emerald-300/50 cursor-pointer transition" title="Ver las 30 plantas de la sala">
              <Grid3X3 className="w-3.5 h-3.5 text-emerald-300" /> Sala{thirstyCount > 0 && <span className="px-1 rounded bg-cyan-400 text-neutral-950 text-[9px] font-black" title="Plantas con sed">💧{thirstyCount}</span>}{readyCount > 0 && <span className="px-1 rounded bg-amber-400 text-neutral-950 text-[9px] font-black">{readyCount}</span>}
            </button>
            <button onClick={onOpenPanel} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-950/80 border border-neutral-600/40 text-[11px] font-semibold text-neutral-200 hover:border-cyan-300/50 cursor-pointer transition" title="Clima, luz, CO₂ e instrumental completo">
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-300" /> Panel
            </button>
            {onOpenPlanet && <button onClick={onOpenPlanet} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-950/80 border border-sky-400/40 text-[11px] font-semibold text-sky-200 hover:border-sky-300/70 cursor-pointer transition" title="Tus parcelas al aire libre: el Planeta"><span>🌎</span> Parcelas</button>}
            <button onClick={() => setCareOpen((v) => !v)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-950/80 border text-[11px] font-semibold text-neutral-200 cursor-pointer transition ${care.pests > 0 ? 'border-pink-400/70 cf-ring' : 'border-neutral-600/40 hover:border-emerald-300/50'}`} title="Plagas, calificación de jardinero, limpieza y jardinero del vivero">
              <Bug className="w-3.5 h-3.5 text-pink-300" /> Cuidado{care.males > 0 && <span className="px-1 rounded bg-sky-400 text-neutral-950 text-[9px] font-black">♂{care.males}</span>}{care.pests > 0 && <span className="px-1 rounded bg-pink-400 text-neutral-950 text-[9px] font-black">{care.pests}</span>}<span className="text-[9px] font-mono" style={{ color: care.rating >= 75 ? '#6ee7b7' : care.rating >= 45 ? '#fcd34d' : '#fca5a5' }}>{care.rating}%</span>
            </button>
          </div>
        </div>
      </div>

      {careOpen && (
        <div className="absolute z-40 inset-x-2 top-[7.6rem] flex justify-end sm:inset-x-auto sm:right-3 pointer-events-auto">
          <CarePanel onClose={() => setCareOpen(false)} onOpenMarket={() => { setCareOpen(false); onOpenMarket?.(); }} />
        </div>
      )}

      {care.gardenerLevel > 0 && <GardenerCameo />}

      {/* ── action rail ── */}
      {activePlant && (
        <div className="absolute z-30 flex gap-2 left-2 right-2 overflow-x-auto scrollbar-none bottom-[10.6rem] sm:right-auto sm:overflow-visible sm:left-3 sm:bottom-[5.3rem] sm:top-[10.9rem] sm:flex-col sm:justify-center sm:gap-1.5 pointer-events-none [&>*]:pointer-events-auto">
          <span className="hidden sm:block text-center text-[8px] font-mono uppercase tracking-[0.2em] text-neutral-500">Cuidar</span>
          <SkillButton tour="water" label="Regar" sub={`Hum ${activePlant.soilMoisture}%`} tone="cyan" pulse={thirsty || activePlant.soilMoisture < 55} onClick={() => { waterPlant(); pop('+ Riego', '#22d3ee'); }}>
            <Droplet className="w-5 h-5" />
          </SkillButton>
          <SkillButton tour="feed" label="Abonar N-P-K" sub={`EC ${activePlant.ecLevel}`} tone="emerald" pulse={hungry} onClick={() => { feedNutrients(); pop('+ N-P-K', '#34d399'); }}>
            <NutrientBottle className="w-5 h-5" />
          </SkillButton>
          <SkillButton label="Entrenamiento LST" sub="LST +12%" tone="purple" onClick={() => { trainPlant('Topping & LST'); pop('LST +12%', '#e879f9'); }}>
            <Scissors className="w-5 h-5" />
          </SkillButton>
          <span className="hidden sm:block text-center text-[8px] font-mono uppercase tracking-[0.2em] text-neutral-500">Acelerar</span>
          <SkillButton label="Acelerar ciclo (quema 25 $FLORA)" sub="Acelerar" badge="25" tone="amber" pulse onClick={() => { if (speedUpGrowth()) pop('- 25 $FLORA', '#fbbf24'); }}>
            <span className="flex items-center"><Flame className="w-5 h-5" /><Zap className="w-3 h-3 -ml-1" /></span>
          </SkillButton>
          <span className="hidden sm:block text-center text-[8px] font-mono uppercase tracking-[0.2em] text-neutral-500">Más</span>
          <SkillButton label="Tablas de nutrición" sub="Nutrición" tone="neutral" onClick={onOpenNutrients}>
            <FlaskLeaf className="w-5 h-5" />
          </SkillButton>
          <SkillButton label="Guardar como madre donante" sub="Madre" tone="neutral" onClick={() => { saveCurrentPlantAsMotherOrFather('Madre (Esquejes / Clones)'); pop('Madre guardada', '#c084fc'); }}>
            <Crown className="w-5 h-5" />
          </SkillButton>
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
          <div className="absolute z-30 inset-x-0 bottom-[15.4rem] sm:bottom-[5.9rem] flex justify-center px-4 sm:px-16 pointer-events-none" data-tour="next-action">
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
        <div className="absolute z-30 inset-x-0 bottom-[15.4rem] sm:bottom-[5.9rem] flex justify-center px-4 sm:px-16 pointer-events-none">
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
