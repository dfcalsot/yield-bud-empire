import type { Strain, TerpeneProfile } from '../types';
import type { MaterialId } from './forge';
import { t as tr } from '../i18n/core';

/**
 * Cría (breeding): pure trait-inheritance and seed-yield math, no React and no side effects — the caller (GameContext)
 * owns identity (ids, timestamps), the real-time job queue and persistence, exactly like `sim/forge.ts` does for the forge.
 *
 * Model: a cross's numeric traits land near the parents' average; how far they can drift is a variance band that shrinks every
 * generation (F1 unstable → F4 stable, and further crosses stay as stable as F4). A small, independent chance per trait lets a
 * mutation push past that band — the Reactivo raises that chance. Seed count is a random batch of 6–24, tilted by the mother's
 * vigor, the kit and staff genetics bonus.
 */

export type Rng = () => number;

/** deterministic PRNG (mulberry32): same seed → same sequence, so a cross (and a test) can be replayed exactly. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Generation = 1 | 2 | 3 | 4;
export const GEN_LABEL: Record<Generation, string> = { 1: 'F1', 2: 'F2', 3: 'F3', 4: 'F4' };
/** fraction of a trait's own midpoint value that generation may drift by; F4 and beyond stay this stable. */
export const GEN_VARIANCE: Record<Generation, number> = { 1: 0.35, 2: 0.22, 3: 0.12, 4: 0.05 };
/** a cross past F4 is treated as F4: genetics are already fixed. */
export const capGeneration = (gen: number): Generation => (Math.min(4, Math.max(1, Math.round(gen))) as Generation);

export const MUTATION_CHANCE = { base: 0.05, withReagent: 0.18 } as const;
/** how far a mutation can push a trait beyond its normal band, as a fraction of the trait's midpoint. */
export const MUTATION_SWING = 0.22;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export interface InheritResult { value: number; mutated: boolean }

/**
 * One numeric trait inherited from two parents: lands near their average, drifts by the generation's variance band, and may
 * mutate past it. Bounded to [0 (or 0.4×the lower parent, if `keepPositive`), 1.6×the higher parent] so a cross never runs away.
 */
export function inheritNumber(a: number, b: number, generation: Generation, rng: Rng, hasReagent: boolean, keepPositive = false): InheritResult {
  const mid = (a + b) / 2;
  const variance = GEN_VARIANCE[capGeneration(generation)] * mid;
  let value = mid + (rng() * 2 - 1) * variance;
  const mutated = rng() < (hasReagent ? MUTATION_CHANCE.withReagent : MUTATION_CHANCE.base);
  if (mutated) value += (rng() * 2 - 1) * mid * MUTATION_SWING;
  const lo = keepPositive ? Math.min(a, b) * 0.4 : 0;
  const hi = Math.max(a, b) * 1.6 + 1e-6;
  return { value: clamp(value, lo, hi), mutated };
}

const TERPENE_KEYS: (keyof TerpeneProfile)[] = ['myrcene', 'limonene', 'caryophyllene', 'pinene', 'linalool'];

export interface BreedTraits {
  thcPercentage: number;
  cbdPercentage: number;
  terpenes: TerpeneProfile;
  cycleDurationSeconds: number;
  resinYieldMultiplier: number;
}
export interface BreedResult { traits: BreedTraits; mutated: boolean }

/** the full trait set of a cross: THC, CBD, the five terpenes, cycle length and resin yield, each inherited independently. */
export function inheritTraits(mother: Strain, father: Strain, generation: Generation, hasReagent: boolean, rng: Rng): BreedResult {
  let mutated = false;
  const take = (a: number, b: number, keepPositive = false) => {
    const r = inheritNumber(a, b, generation, rng, hasReagent, keepPositive);
    mutated = mutated || r.mutated;
    return r.value;
  };
  const thc = take(mother.thcPercentage, father.thcPercentage);
  const cbd = take(mother.cbdPercentage, father.cbdPercentage);
  const cycleDurationSeconds = take(mother.cycleDurationSeconds, father.cycleDurationSeconds, true);
  const resinYieldMultiplier = take(mother.resinYieldMultiplier, father.resinYieldMultiplier, true);
  const terpenes = {} as TerpeneProfile;
  for (const k of TERPENE_KEYS) terpenes[k] = Math.round(take(mother.terpenes[k], father.terpenes[k]) * 1000) / 1000;
  return {
    traits: {
      thcPercentage: Math.round(thc * 10) / 10,
      cbdPercentage: Math.round(cbd * 10) / 10,
      cycleDurationSeconds: Math.round(cycleDurationSeconds),
      resinYieldMultiplier: Math.round(resinYieldMultiplier * 100) / 100,
      terpenes,
    },
    mutated,
  };
}

export const SEED_BATCH = { min: 6, max: 24 } as const;

/** how many seeds one cross gives: a random batch of 6–24, tilted by the mother's vigor and the kit, plus the staff seedBonus. */
export function seedBatchSize(motherVigor: number, hasKit: boolean, staffSeedBonus: number, rng: Rng): number {
  const base = SEED_BATCH.min + rng() * (SEED_BATCH.max - SEED_BATCH.min);
  const vigorMul = 0.7 + (clamp(motherVigor, 0, 100) / 100) * 0.6; // 0.7×..1.3×
  const kitMul = hasKit ? 1.15 : 1;
  const raw = Math.round(base * vigorMul * kitMul) + Math.max(0, Math.round(staffSeedBonus));
  return clamp(raw, SEED_BATCH.min, SEED_BATCH.max + 6); // staff bonus / kit can push a little past the base ceiling
}

/** lineage label for the diary: "Madre x Padre (F2)". */
export const lineageLabel = (mother: Strain, father: Strain, generation: Generation): string =>
  `${mother.name} x ${father.name} (${GEN_LABEL[capGeneration(generation)]})`;

/* ───────── chamber cross: real-time job gated by the Cámara de cría, materials, tier and generation cap ───────── */
export const BREEDING_LIMITS = { jobs: 2, minTier: 3, maxGeneration: 4 } as const;
export const CROSS_MINUTES = 5 * 60; // one chamber cross takes 5 real hours
export const CHAMBER_FEE = 15; // $FLORA burned per chamber cross (climate control), on top of the materials it consumes

/** materials one chamber cross needs: a pollination kit and an isolation bag always; the reagent is optional (raises mutation odds). */
export function breedingCost(useReagent: boolean): Partial<Record<MaterialId, number>> {
  return useReagent ? { kit_polinizacion: 1, bolsa_aislamiento: 1, reactivo: 1 } : { kit_polinizacion: 1, bolsa_aislamiento: 1 };
}

export type BreedCheck = { ok: true } | { ok: false; reason: 'parents' | 'chamber' | 'tier' | 'jobs' | 'material'; message: string };

export interface BreedStock {
  tier: number;
  hasChamber: boolean;
  jobs: number;
  materials: Partial<Record<MaterialId, number>>;
}

/** can a chamber cross of `mother`/`father` start now? Says why not, in words a player understands. */
export function canBreed(stock: BreedStock, motherId: string, fatherId: string, useReagent: boolean): BreedCheck {
  if (!motherId || !fatherId || motherId === fatherId) return { ok: false, reason: 'parents', message: tr('Elige una Madre y un Padre distintos para cruzar.') };
  if (!stock.hasChamber) return { ok: false, reason: 'chamber', message: tr('Necesitas la Cámara de cría (Grow Market → Licencias).') };
  if (stock.tier < BREEDING_LIMITS.minTier) return { ok: false, reason: 'tier', message: tr('La cámara pide una instalación de nivel {minTier} o más.', { minTier: BREEDING_LIMITS.minTier }) };
  if (stock.jobs >= BREEDING_LIMITS.jobs) return { ok: false, reason: 'jobs', message: tr('Ya hay {jobs} cruces en marcha en la cámara.', { jobs: BREEDING_LIMITS.jobs }) };
  for (const [id, need] of Object.entries(breedingCost(useReagent))) {
    const have = stock.materials[id as MaterialId] ?? 0;
    if (have < (need as number)) return { ok: false, reason: 'material', message: tr('Falta {v0} de {id}.', { v0: (need as number) - have, id }) };
  }
  return { ok: true };
}
