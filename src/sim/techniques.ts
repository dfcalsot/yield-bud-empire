import type { GrowStage, PlantInGrow, TechniqueId } from '../types';
import { STAGE_ORDER } from './phases';

/**
 * Training techniques. Each one belongs to the phase(s) of the plant where it makes sense, and a plant takes it once:
 * tying, topping and supercropping shape a plant that is still growing (vegetative); defoliation works from late vegetative through
 * flowering; lollipopping (clearing the lower branches) is for the first weeks of flower. Outside its phase a technique is refused.
 */
export interface Technique {
  id: TechniqueId;
  label: string;
  /** the phases where it can be applied */
  stages: readonly GrowStage[];
  /** yield added to the plant's estimate (a fraction) */
  yieldBonus: number;
  /** health lost by the stress of the cut / bend */
  healthCost: number;
  xp: number;
  how: string;
}

export const TECHNIQUES: readonly Technique[] = [
  { id: 'lst', label: 'LST · atado suave', stages: ['vegetative'], yieldBonus: 0.04, healthCost: 3, xp: 30, how: 'Doblas y atas las ramas para abrir la copa: más luz llega a todos los brotes.' },
  { id: 'topping', label: 'Despunte (topping)', stages: ['vegetative'], yieldBonus: 0.04, healthCost: 4, xp: 30, how: 'Cortas la punta principal: la planta hace dos cimas en lugar de una.' },
  { id: 'supercrop', label: 'Supercropping', stages: ['vegetative'], yieldBonus: 0.02, healthCost: 5, xp: 25, how: 'Aplastas con cuidado los tallos altos para igualar la altura de la copa.' },
  { id: 'scrog', label: 'SCROG · malla', stages: ['vegetative'], yieldBonus: 0.04, healthCost: 3, xp: 40, how: 'Instalas una malla y guías las ramas por debajo: una canopia pareja y aprovechada.' },
  { id: 'defoliation', label: 'Defoliación', stages: ['vegetative', 'flowering'], yieldBonus: 0.03, healthCost: 4, xp: 25, how: 'Quitas hojas grandes que tapan la luz y el aire a los brotes de abajo.' },
  { id: 'lollipop', label: 'Poda de bajos (lollipop)', stages: ['flowering'], yieldBonus: 0.03, healthCost: 3, xp: 25, how: 'Limpias las ramas bajas que no llegan a la luz: la energía sube a las cimas.' },
] as const;

export const TECHNIQUE_BY_ID: Record<TechniqueId, Technique> = Object.fromEntries(TECHNIQUES.map((t) => [t.id, t])) as Record<TechniqueId, Technique>;

/** the phase names of a technique, in growth order, for the label */
export const whenLabel = (t: Technique, names: Record<string, string>): string =>
  [...t.stages].sort((a, b) => STAGE_ORDER.indexOf(a) - STAGE_ORDER.indexOf(b)).map((s) => names[s] ?? s).join(' y ');

export type TrainCheck = { ok: true } | { ok: false; reason: 'stage' | 'done' | 'ready'; message: string };

/** can this plant take this technique right now? */
export function canTrain(plant: Pick<PlantInGrow, 'stage' | 'techniques'>, id: TechniqueId, names: Record<string, string>): TrainCheck {
  const t = TECHNIQUE_BY_ID[id];
  if (!t) return { ok: false, reason: 'stage', message: 'Técnica desconocida.' };
  if ((plant.techniques ?? []).includes(id)) return { ok: false, reason: 'done', message: `${t.label}: esta planta ya la recibió (solo una vez por planta).` };
  if (plant.stage === 'ready_harvest') return { ok: false, reason: 'ready', message: 'La planta ya terminó de crecer: solo falta cortarla.' };
  if (!t.stages.includes(plant.stage)) {
    return { ok: false, reason: 'stage', message: `${t.label} solo se aplica en ${whenLabel(t, names)}. Esta planta está en ${names[plant.stage] ?? plant.stage}.` };
  }
  return { ok: true };
}

/** apply the technique: yield up, a little stress, and the plant remembers it */
export function applyTechnique(plant: PlantInGrow, id: TechniqueId): PlantInGrow {
  const t = TECHNIQUE_BY_ID[id];
  return {
    ...plant,
    estimatedDryYieldGrams: plant.estimatedDryYieldGrams + Math.round(plant.estimatedDryYieldGrams * t.yieldBonus),
    health: Math.max(80, plant.health - t.healthCost),
    techniques: [...(plant.techniques ?? []), id],
  };
}
