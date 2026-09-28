import React, { useEffect, useMemo, useState } from 'react';
import { Bug, Check, Droplet, Eye, FlaskConical, Hammer, Lock, Minimize2, Scissors, Sprout, Wind } from 'lucide-react';
import { useGame } from '../context/GameContext';
import type { PlantInGrow } from '../types';
import { FacilityBackdrop } from './hud/FacilityBackdrop';
import { Hotbar, type SlotSpec } from './hud/HudParts';
import { Npc, useNpc } from './npc/Npc';
import { isHungry, isMale, isThirsty, PEST_INFO, sexRevealed } from '../sim/engine';
import { MAX_ROOM_PLANTS } from '../sim/facilities';
import './hud/hud.css';
import { t, t as tr, k, localize } from '../i18n';
import { useSceneId } from './hud/sceneChoice';

/**
 * The grow room as a game board. The room is exactly as big as the installation (the rest of the benches are locked slots that
 * show what the next upgrade gives), every plant is a card with status pips (thirst, hunger, pests, ready), the big action bar
 * does the room-wide chores with keys 1–6, and Nico the foreman talks about what actually needs doing.
 */
const STAGE: Record<string, string> = localize({ seed: k('Semilla'), seedling: k('Plántula'), vegetative: k('Vegetativo'), flowering: k('Floración'), maturation: k('Maduración'), ready_harvest: k('Lista') }, ['seed', 'seedling', 'vegetative', 'flowering', 'maturation', 'ready_harvest']);
const isReady = (p: PlantInGrow) => p.stage === 'ready_harvest';

/** the plant in its pot, drawn per growth stage */
const PlantSprite: React.FC<{ p: PlantInGrow }> = ({ p }) => {
  const veg = p.stage === 'vegetative' || p.stage === 'flowering' || p.stage === 'maturation' || p.stage === 'ready_harvest';
  const bloom = p.stage === 'flowering' || p.stage === 'maturation' || p.stage === 'ready_harvest';
  return (
    <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)]" aria-hidden>
      <path d="M30 94 L38 92 L38 104" stroke="#0ea5e9" strokeWidth="1.2" fill="none" /><circle cx="38" cy="98" r="1.2" fill="#38bdf8" className="animate-water-drip" />
      <ellipse cx="50" cy="104" rx="28" ry="7" fill="#221f1f" stroke="#3a3a3a" strokeWidth="1.5" />
      <path d="M22 104 L28 117 Q50 121 72 117 L78 104Z" fill="#1c1917" stroke="#383838" strokeWidth="1.5" />
      <ellipse cx="50" cy="105" rx="25" ry="5" fill={p.soilMoisture > 50 ? '#1c3829' : '#382216'} />
      {p.stage === 'seed' && (
        <g className="animate-pulse"><ellipse cx="50" cy="102" rx="4" ry="3" fill="#713f12" /><path d="M50 100 Q48 94 52 88" stroke="#84cc16" strokeWidth="1.5" fill="none" strokeLinecap="round" /><circle cx="52" cy="88" r="2" fill="#a3e635" /></g>
      )}
      {p.stage === 'seedling' && (
        <g className="animate-cannabis-breeze">
          <path d="M50 104 Q49 88 50 80" stroke="#65a30d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <ellipse cx="44" cy="86" rx="6" ry="3.5" fill="#84cc16" transform="rotate(-15 44 86)" /><ellipse cx="56" cy="86" rx="6" ry="3.5" fill="#84cc16" transform="rotate(15 56 86)" />
          <path d="M50 80 L40 76 L45 79 L36 78 L46 81Z" fill="#15803d" /><path d="M50 80 L60 76 L55 79 L64 78 L54 81Z" fill="#15803d" />
        </g>
      )}
      {veg && (
        <g>
          <path d="M50 104 Q49 72 50 48" stroke="#365314" strokeWidth="4" fill="none" strokeLinecap="round" />
          <g className="animate-cannabis-sway-left" style={{ transformOrigin: '50px 86px' }}><path d="M50 86 Q30 82 18 88" stroke="#365314" strokeWidth="2" fill="none" /><path d="M18 88 L8 90 L16 86 L6 83 L18 83 L12 78 L22 84Z" fill="#15803d" /></g>
          <g className="animate-cannabis-sway-right" style={{ transformOrigin: '50px 86px' }}><path d="M50 86 Q70 82 82 88" stroke="#365314" strokeWidth="2" fill="none" /><path d="M82 88 L92 90 L84 86 L94 83 L82 83 L88 78 L78 84Z" fill="#15803d" /></g>
          <g className="animate-cannabis-sway-left" style={{ transformOrigin: '50px 68px' }}><path d="M50 68 Q34 62 24 67" stroke="#365314" strokeWidth="1.8" fill="none" /><path d="M24 67 L14 68 L22 64 L14 61 L24 62 L20 56 L28 63Z" fill="#16a34a" /></g>
          <g className="animate-cannabis-sway-right" style={{ transformOrigin: '50px 68px' }}><path d="M50 68 Q66 62 76 67" stroke="#365314" strokeWidth="1.8" fill="none" /><path d="M76 67 L86 68 L78 64 L86 61 L76 62 L80 56 L72 63Z" fill="#16a34a" /></g>
          <path d="M50 54 L38 48 L46 52Z" fill="#22c55e" /><path d="M50 54 L62 48 L54 52Z" fill="#22c55e" />
          {bloom && (
            <g className="animate-cannabis-breeze">
              <ellipse cx="50" cy="38" rx="14" ry="20" fill={p.strain.colorTheme || '#15803d'} opacity="0.95" /><ellipse cx="50" cy="46" rx="16" ry="12" fill="#14532d" /><ellipse cx="50" cy="30" rx="10" ry="12" fill="#166534" /><circle cx="50" cy="20" r="5" fill="#22c55e" />
              <ellipse cx="32" cy="62" rx="8" ry="11" fill={p.strain.colorTheme || '#15803d'} opacity="0.9" /><ellipse cx="68" cy="62" rx="8" ry="11" fill={p.strain.colorTheme || '#15803d'} opacity="0.9" />
              <path d="M46 32 Q40 24 43 20" stroke="#f97316" strokeWidth="1.2" fill="none" strokeLinecap="round" /><path d="M54 32 Q60 24 57 20" stroke="#ea580c" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <path d="M44 44 Q36 40 34 35" stroke="#f59e0b" strokeWidth="1.2" fill="none" strokeLinecap="round" /><path d="M56 44 Q64 40 66 35" stroke="#f97316" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              <circle cx="48" cy="35" r="1.3" fill="#fff" className="animate-trichome-sparkle" /><circle cx="53" cy="40" r="1.2" fill="#fef08a" className="animate-trichome-sparkle" /><circle cx="50" cy="26" r="1.2" fill="#fff" className="animate-trichome-sparkle" />
            </g>
          )}
        </g>
      )}
    </svg>
  );
};

const Pip: React.FC<{ tone: 'cyan' | 'lime' | 'rose' | 'amber' | 'violet'; title: string; children: React.ReactNode }> = ({ tone, title, children }) => (
  <span className={`sr-pip sr-pip--${tone}`} title={title}>{children}</span>
);

const Bar: React.FC<{ label: string; value: number; tone: string }> = ({ label, value, tone }) => (
  <div>
    <div className="flex justify-between text-[10px] font-mono text-neutral-400"><span>{label}</span><span className="text-neutral-200">{Math.round(value)}%</span></div>
    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><i className="block h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: tone }} /></div>
  </div>
);

export const IndoorRoomVisualizer: React.FC<{ onOpenFacility?: () => void }> = ({ onOpenFacility }) => {
  const {
    indoorPlants, selectedPlantIndex, selectPlant, currentFacility, facilities, construction,
    waterPlant, waterAllPlants, feedNutrients, feedAllPlants, harvestPlant, harvestAllReadyPlants, treatPests,
    co2Ppm, setCo2Ppm, equipStats,
  } = useGame();
  const sceneId = useSceneId(currentFacility, facilities);
  const [lens, setLens] = useState(false);
  const [co2Burst, setCo2Burst] = useState(false);
  const { say, speak, tips } = useNpc(tr('Sala en orden, jefe. Toca una planta para ver su ficha; las teclas 1–6 hacen las tareas de toda la sala.'));

  const plants = indoorPlants;
  const cap = plants.length;
  const next = facilities.find((f) => f.tier === currentFacility.tier + 1);
  const lockedSlots = Math.max(0, Math.min(MAX_ROOM_PLANTS, next?.capacityPlants ?? cap) - cap);
  const sel = plants[selectedPlantIndex] ?? plants[0] ?? null;

  const thirsty = plants.filter(isThirsty).length;
  const hungry = plants.filter(isHungry).length;
  const pests = plants.filter((p) => p.pest).length;
  const ready = plants.filter(isReady).length;
  const avgHealth = Math.round(plants.reduce((a, p) => a + p.health, 0) / Math.max(1, plants.length));
  const avgMoist = Math.round(plants.reduce((a, p) => a + p.soilMoisture, 0) / Math.max(1, plants.length));

  // Nico advises about what is really going on in the room
  tips.current = () => {
    const t: string[] = [];
    if (ready) t.push(tr('Tengo {ready} {v1} para cortar. Revisa los tricomas y a cosechar.', { ready, v1: ready === 1 ? tr('planta lista') : tr('plantas listas') }));
    if (thirsty) t.push(tr('{thirsty} {v1} sed. Tecla 1 y listo.', { thirsty, v1: thirsty === 1 ? tr('maceta tiene') : tr('macetas tienen') }));
    if (pests) t.push(tr('Hay plaga en {pests} {v1}. Trátalas ya (tecla 3) o se riega el problema a las vecinas.', { pests, v1: pests === 1 ? tr('planta') : tr('plantas') }));
    if (hungry && !thirsty) t.push(tr('Las plantas piden abono. Tecla 2 para fertirrigar la sala.'));
    if (!t.length) t.push(tr('Todo tranquilo. Un cuarto limpio y parejo rinde más que uno apurado.'));
    if (next && !construction) t.push(tr('Con {v0} tendríamos {capacityPlants} plazas. Eso sí que es crecer.', { v0: tr(next.name).split(' (')[0], capacityPlants: next.capacityPlants }));
    return t;
  };

  const chore = (fn: () => void, line: string, mood: 'happy' | 'idle' = 'happy') => { fn(); speak(line, mood); };
  const co2Pulse = () => { setCo2Burst(true); setCo2Ppm(Math.min(1800, co2Ppm + 250)); speak(tr('Pulso de CO₂ abierto: más fotosíntesis por unos minutos.'), 'happy'); window.setTimeout(() => setCo2Burst(false), 3500); };

  const slots: SlotSpec[] = [
    { key: 'water', label: tr('Regar'), sub: thirsty ? tr('{thirsty} con sed', { thirsty }) : 'sala', tone: 'cyan', icon: <Droplet className="w-5 h-5" />, hot: thirsty > 0, onClick: () => chore(waterAllPlants, thirsty ? tr('¡Regando! Que se hidraten todas.') : tr('Riego de mantenimiento hecho.')) },
    { key: 'feed', label: tr('Abonar'), sub: hungry ? tr('{hungry} con hambre', { hungry }) : 'sala', tone: 'lime', icon: <FlaskConical className="w-5 h-5" />, hot: hungry > 0 && thirsty === 0, onClick: () => chore(feedAllPlants, tr('Fertirriego aplicado a toda la sala.')) },
    { key: 'treat', label: tr('Tratar'), sub: pests ? `${pests} plaga${pests > 1 ? 's' : ''}` : tr('sin plagas'), tone: 'pink', icon: <Bug className="w-5 h-5" />, hot: pests > 0, onClick: () => { treatPests('all'); speak(pests ? tr('Tratamiento aplicado. Vigila unos días.') : tr('No hay plagas, pero me gusta que preguntes.'), pests ? 'happy' : 'idle'); } },
    { key: 'co2', label: 'CO₂', sub: `${co2Ppm} ppm`, tone: 'violet', icon: <Wind className="w-5 h-5" />, onClick: co2Pulse },
    { key: 'harvest', label: tr('Cosechar'), sub: ready ? `${ready} lista${ready > 1 ? 's' : ''}` : tr('nada aún'), tone: 'amber', icon: <Scissors className="w-5 h-5" />, hot: ready > 0, onClick: () => { harvestAllReadyPlants(); if (ready) speak(tr('¡Buen corte! Esa flor va directa al secado.'), 'happy'); else speak(tr('Todavía no hay nada listo, paciencia.'), 'idle'); } },
    { key: 'lens', label: tr('Lupa'), sub: 'tricomas', tone: 'neutral', icon: <Eye className="w-5 h-5" />, onClick: () => setLens((v) => !v) },
  ];

  // keys 1–6 do the room chores (ignored while typing)
  const handlers = useMemo(() => slots.map((s) => s.onClick), [slots]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable))) return;
      const n = Number(e.key);
      if (n >= 1 && n <= handlers.length) handlers[n - 1]();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers]);

  // real plants grouped in benches of 10; the locked teaser slots go at the end of the last bench
  const benchCount = Math.max(1, Math.ceil(cap / 10));
  const benches = Array.from({ length: benchCount }, (_, b) => {
    const last = b === benchCount - 1;
    const n = Math.min(10, cap - b * 10) + (last ? lockedSlots : 0);
    return Array.from({ length: n }, (_, k) => b * 10 + k);
  });

  return (
    <div className="sr-root" data-testid="sala">
      {/* the installation you actually have fills the whole panel, behind Nico and the benches */}
      <FacilityBackdrop facilityId={sceneId} lampColor="255,236,190" lightPct={0.7} equip={equipStats} hour={13} />
      <div className="sr-veil" />
      {/* banner: foreman + the state of the room */}
      <header className="sr-banner">
        <div className="sr-npc"><Npc kind="foreman" text={tr(say.text)} mood={say.mood} moodKey={say.key} /></div>
        <div className="sr-stats">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-lg sm:text-xl font-black text-white tracking-wide">{t('Sala de cultivo')}</h3>
            <span className="sr-cap"><Sprout className="w-3.5 h-3.5" />{cap} {cap === 1 ? t('planta') : t('plantas')} · {t(currentFacility.name).split(' (')[0]}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="sr-vital"><Bar label={tr('Salud')} value={avgHealth} tone="linear-gradient(90deg,#34d399,#b8f35a)" /></div>
            <div className="sr-vital"><Bar label={tr('Humedad')} value={avgMoist} tone="linear-gradient(90deg,#38bdf8,#22d3ee)" /></div>
            <div className="sr-vital sr-vital--num"><b className={ready ? 'text-amber-300' : 'text-neutral-200'}>{ready}</b><span>{tr('listas')}</span></div>
          </div>
          {next && (
            <button type="button" onClick={onOpenFacility} className="sr-upsell">
              <Hammer className="w-3.5 h-3.5" />
              {construction ? tr('Obra en marcha · ver progreso') : tr('Ampliar a {v0}: {capacityPlants} plazas', { v0: t(next.name).split(' (')[0], capacityPlants: next.capacityPlants })}
            </button>
          )}
        </div>
      </header>

      {/* the room */}
      <div className="sr-stage">
        {co2Burst && <div className="sr-co2" aria-hidden />}

        {!lens ? (
          <div className="relative z-10 space-y-3 p-3 sm:p-4">
            {benches.map((idx, b) => (
              <section key={b} className="sr-bench" aria-label={tr('Bancada {v0}', { v0: b + 1 })}>
                <div className="sr-drip" aria-hidden />
                <div className="sr-bench-title">{t('Bancada {v0}', { v0: b + 1 })}<span>{idx.filter((i) => i < cap).length}{' '}{t('en cultivo')}{idx.some((i) => i >= cap) ? tr(' · {length} bloqueadas', { length: idx.filter((i) => i >= cap).length }) : ''}</span></div>
                <div className="sr-grid">
                  {idx.map((i) => {
                    const p = plants[i];
                    if (!p) {
                      return (
                        <button key={i} type="button" className="sr-slot sr-slot--locked" onClick={onOpenFacility} title={next ? tr('Se desbloquea con {name}', { name: next.name }) : tr('Plaza bloqueada')}>
                          <Lock className="w-5 h-5" />
                          <span>Nv. {currentFacility.tier + 1}</span>
                        </button>
                      );
                    }
                    const rdy = isReady(p), dry = isThirsty(p), hun = isHungry(p);
                    const male = isMale(p) && sexRevealed(p);
                    return (
                      <button key={p.id || i} type="button" onClick={() => selectPlant(i)} aria-pressed={i === selectedPlantIndex} data-slot={i}
                        className={`sr-slot ${i === selectedPlantIndex ? 'is-selected' : ''} ${rdy ? 'is-ready' : ''}`}>
                        <span className="sr-num">#{i + 1}</span>
                        <div className="sr-pips">
                          {rdy && <Pip tone="amber" title={tr('Lista para cosechar')}><Check className="w-3 h-3" /></Pip>}
                          {dry && <Pip tone="cyan" title={tr('Tiene sed')}><Droplet className="w-3 h-3" /></Pip>}
                          {hun && !rdy && <Pip tone="lime" title={tr('Necesita abono')}><FlaskConical className="w-3 h-3" /></Pip>}
                          {p.pest && <Pip tone="rose" title={tr(PEST_INFO[p.pest.kind].label)}><Bug className="w-3 h-3" /></Pip>}
                          {male && <Pip tone="violet" title={tr('Macho')}>♂</Pip>}
                        </div>
                        <div className="sr-sprite"><PlantSprite p={p} /></div>
                        <div className="sr-meter"><i style={{ width: `${p.progressPercent}%` }} className={rdy ? 'is-ready' : ''} /></div>
                        <span className="sr-stage-lbl">{STAGE[p.stage] ?? p.stage} · {Math.round(p.progressPercent)}%</span>
                        <span className="sr-tip" role="tooltip">
                          <b>{tr(p.strain.name)}</b>
                          <em>{t('Salud {v0}% · Humedad {v1}%', { v0: Math.round(p.health), v1: Math.round(p.soilMoisture) })}</em>
                          <em>{t('≈ {estimatedDryYieldGrams} g de flor seca', { estimatedDryYieldGrams: p.estimatedDryYieldGrams })}</em>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
            {lockedSlots > 0 && next && <p className="text-center text-[11px] font-mono text-neutral-400">{t('Las plazas con candado se abren al construir')}{' '}<b className="text-amber-300">{t(next.name).split(' (')[0]}</b>.</p>}
          </div>
        ) : sel && (
          <div className="relative z-10 grid gap-4 p-4 sm:grid-cols-2 items-center">
            <div className="relative h-64 sm:h-80"><div className="absolute inset-0 grid place-items-center scale-[1.7] origin-center"><div className="w-28 h-32"><PlantSprite p={sel} /></div></div></div>
            <div className="space-y-3">
              <h4 className="font-serif text-xl font-black text-white">{tr(sel.strain.name)} <span className="text-sm font-mono text-neutral-400">#{selectedPlantIndex + 1}</span></h4>
              <p className="text-[12px] text-neutral-300">{t('Mira el color de los tricomas:')}{' '}<b className="text-white">{tr('transparentes')}</b>{' '}{t('= aún crudo,')}{' '}<b className="text-white">{tr('lechosos')}</b>{' '}{t('= punto máximo,')}{' '}<b className="text-amber-300">{t('ámbar')}</b>{' '}{t('= más sedante.')}</p>
              <div className="space-y-2">
                <Bar label={tr('Transparentes')} value={sel.trichomeMaturity.clear} tone="linear-gradient(90deg,#e0f2fe,#7dd3fc)" />
                <Bar label={tr('Lechosos')} value={sel.trichomeMaturity.milky} tone="linear-gradient(90deg,#f5f5f4,#d6d3d1)" />
                <Bar label={tr('Ámbar')} value={sel.trichomeMaturity.amber} tone="linear-gradient(90deg,#fbbf24,#d97706)" />
              </div>
              <button type="button" className="sr-btn" onClick={() => setLens(false)}><Minimize2 className="w-4 h-4" />{t('Volver a la sala')}</button>
            </div>
          </div>
        )}
      </div>

      {/* the selected plant's card + the room action bar */}
      <div className="sr-dock">
        {sel && (
          <div className="sr-sheet">
            <div className="flex items-center gap-3 min-w-0">
              <div className="sr-sheet-sprite"><PlantSprite p={sel} /></div>
              <div className="min-w-0">
                <div className="text-[13px] font-extrabold text-white truncate">#{selectedPlantIndex + 1} · {tr(sel.strain.name)}</div>
                <div className="text-[11px] font-mono text-neutral-400">{t('{v0} · ≈{estimatedDryYieldGrams} g · THC {thcPercentage}%', { v0: STAGE[sel.stage] ?? sel.stage, estimatedDryYieldGrams: sel.estimatedDryYieldGrams, thcPercentage: sel.strain.thcPercentage })}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 min-w-[9rem] flex-1 max-w-[16rem]">
              <Bar label={tr('Salud')} value={sel.health} tone="linear-gradient(90deg,#34d399,#b8f35a)" />
              <Bar label={tr('Humedad')} value={sel.soilMoisture} tone="linear-gradient(90deg,#38bdf8,#22d3ee)" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" className="sr-btn sr-btn--cyan" onClick={() => { waterPlant(); speak(tr('Riego la #{v0}.', { v0: selectedPlantIndex + 1 }), 'happy'); }}><Droplet className="w-3.5 h-3.5" />{t('Regar')}</button>
              <button type="button" className="sr-btn sr-btn--lime" onClick={() => { feedNutrients(); speak(tr('Abono para la #{v0}.', { v0: selectedPlantIndex + 1 }), 'happy'); }}><FlaskConical className="w-3.5 h-3.5" />{t('Abonar')}</button>
              {isReady(sel) && <button type="button" className="sr-btn sr-btn--amber" onClick={() => { harvestPlant(); speak(tr('¡Corte limpio!'), 'happy'); }}><Scissors className="w-3.5 h-3.5" />{t('Cosechar')}</button>}
            </div>
          </div>
        )}
        <div className="sr-bar"><Hotbar slots={slots} /></div>
      </div>
    </div>
  );
};
