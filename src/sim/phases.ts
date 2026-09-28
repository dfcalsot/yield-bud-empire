import type { GrowStage } from '../types';
import { k } from '../i18n/core';

/**
 * The growth phases of a plant. They come in this order, always, and a plant can be cut only after the last one:
 * germination → seedling → vegetative → flowering → maturation → (ready to harvest).
 * Everything that needs a phase boundary (the engine, the paid boosts, the harvest, the screens) reads it from here.
 */
export interface Phase { id: Exclude<GrowStage, 'ready_harvest'>; label: string; from: number; to: number; blurb: string }

export const PHASES: readonly Phase[] = [
  { id: 'seed', label: k('Germinación'), from: 0, to: 3, blurb: k('La semilla abre y saca la raicilla: humedad constante y calor suave.') },
  { id: 'seedling', label: k('Plántula'), from: 3, to: 15, blurb: k('Primeras hojas verdaderas: luz suave, riego ligero y nada de sales fuertes.') },
  { id: 'vegetative', label: k('Vegetativo'), from: 15, to: 50, blurb: k('Crece en tallo y hojas: mucha luz, nitrógeno y espacio para entrenarla.') },
  { id: 'flowering', label: k('Floración'), from: 50, to: 85, blurb: k('Forma las flores: fósforo y potasio, humedad baja y cero estrés.') },
  { id: 'maturation', label: k('Maduración'), from: 85, to: 100, blurb: k('Los tricomas maduran y la planta se afina: menos sales y paciencia.') },
] as const;

/** every state a plant goes through, in order; the last one is the only one that can be harvested */
export const STAGE_ORDER: readonly GrowStage[] = [...PHASES.map((p) => p.id), 'ready_harvest'];

export const stageOf = (progress: number): GrowStage => {
  const p = Number.isFinite(progress) ? progress : 0;
  if (p >= 100) return 'ready_harvest';
  return (PHASES.find((ph) => p < ph.to) ?? PHASES[PHASES.length - 1]).id;
};

export const phaseIndex = (stage: GrowStage): number => STAGE_ORDER.indexOf(stage);

/**
 * The grow room each phase does best in. Indoors the plant moves by itself when it enters a new phase (sim/engine.ts); a plant in
 * a room that doesn't suit its phase (only possible for a moment, or in old saves) grows ROOM_MISFIT slower. The mothers' sanctuary is a vegetative room (18/6 keeps donors from flowering).
 */
export const ROOMS_FOR_STAGE: Record<GrowStage, readonly string[]> = {
  seed: ['germination'], seedling: ['germination'], vegetative: ['vegetative', 'mothers_fathers'],
  flowering: ['flowering'], maturation: ['flowering'], ready_harvest: ['flowering'],
};
export const ROOM_MISFIT = 0.8;
/** the room this phase does best in (the first one listed) */
export const bestRoomFor = (stage: GrowStage): string => ROOMS_FOR_STAGE[stage][0];
export const roomFits = (stage: GrowStage, room: string | undefined): boolean => !room || ROOMS_FOR_STAGE[stage].includes(room);
export const phaseOf = (stage: GrowStage): Phase | undefined => PHASES.find((p) => p.id === stage);
export const isHarvestable = (p: { stage: GrowStage }): boolean => p.stage === 'ready_harvest';

/** percent of its own phase a plant has done (0–100), for the progress bar of the current step */
export const phaseFraction = (progress: number): number => {
  const ph = phaseOf(stageOf(progress));
  if (!ph) return 1;
  return Math.max(0, Math.min(1, (progress - ph.from) / (ph.to - ph.from)));
};

/**
 * The most a plant that is in `stage` may reach in one step. It may enter the next phase but never jump over it, so however big
 * the time step (a long absence, a boost) every phase is lived through. Only the last phase leads to "ready to harvest".
 */
export function maxProgressFrom(stage: GrowStage): number {
  const i = phaseIndex(stage);
  if (i < 0 || stage === 'ready_harvest') return 100;
  const after = PHASES[i + 1];
  // a hair below the end (the bar shows one decimal: it must never read as the boundary while the plant is still inside the phase)
  return after ? after.to - 0.06 : 100;
}

/** a paid boost adds `amount` percent but stops at the end of the phase the plant is in: it never skips one */
export function boostWithinPhase(progress: number, amount: number): number {
  const ph = phaseOf(stageOf(progress));
  if (!ph) return progress;
  return Math.min(progress + amount, ph.to);
}

/** the phases still ahead of the plant, for the "what is left" line */
export const phasesLeft = (stage: GrowStage): Phase[] => {
  const i = phaseIndex(stage);
  return i < 0 ? [] : PHASES.slice(i + 1);
};
