/**
 * Empire rank: the long-term progression after the hydroponic facility. Ten ranks, earned with points the SERVER counts from what
 * really happened (flower harvested under the physical cap, dispensary sales in the ledger, lands, facility, patents, chamber
 * crosses, staff, player level). A rank never goes down, unlocks the facilities past the hydroponic one and a few capped perks.
 * No perk mints $FLORA. Weights and thresholds are tuned by tests/economy-sim.ts (timelines of a free and a paying player).
 */
import { k, localize } from '../i18n/core';

/** what the server counts for an account */
export interface EmpireStats {
  /** grams of flower harvested since the empire started counting */
  harvested: number;
  /** gross $FLORA of dispensary sales */
  sales: number;
  lands: number;
  /** facility tier (1 = closet) */
  tier: number;
  patents: number;
  crosses: number;
  staff: number;
  level: number;
}

export const EMPIRE_WEIGHTS = {
  /** points per gram of flower, per $FLORA of sales, per land, per facility rung above the first, per patent, cross, hire, level */
  harvested: 1 / 40, sales: 1 / 25, lands: 100, tier: 150, patents: 120, crosses: 40, staff: 30, level: 50,
} as const;

export type EmpireSource = keyof EmpireStats;

export interface EmpireRank {
  rank: number;
  /** points needed */
  at: number;
  title: string;
  /** what reaching it unlocks (shown in the profile) */
  unlocks: string[];
}

export const EMPIRE_RANKS: readonly EmpireRank[] = localize<readonly EmpireRank[]>([
  { rank: 1, at: 0, title: k('Cultivador de armario'), unlocks: [] },
  { rank: 2, at: 250, title: k('Cultivador de barrio'), unlocks: [] },
  { rank: 3, at: 600, title: k('Productor local'), unlocks: [k('+1 trabajo simultáneo en la forja')] },
  { rank: 4, at: 1200, title: k('Señor del invernadero'), unlocks: [k('+2 tierras al máximo (14)')] },
  { rank: 5, at: 2000, title: k('Barón verde'), unlocks: [k('Sede: Complejo Hidropónico')] },
  { rank: 6, at: 3500, title: k('Magnate del cultivo'), unlocks: [k('+1 cruce simultáneo en la cámara')] },
  { rank: 7, at: 5500, title: k('Duque de la cosecha'), unlocks: [k('Sede: Campus de Cultivo')] },
  { rank: 8, at: 8500, title: k('Archiduque botánico'), unlocks: [k('+2 tierras al máximo (16)')] },
  { rank: 9, at: 13000, title: k('Rey de los terpenos'), unlocks: [k('Sede: Sede del Imperio')] },
  { rank: 10, at: 20000, title: k('Emperador del Cannabis'), unlocks: [k('Corona e insignia dorada')] },
], ['title', 'unlocks']);

export const MAX_EMPIRE_RANK = EMPIRE_RANKS.length;

/** the points of each source and the total */
export function empirePoints(s: EmpireStats): { total: number; breakdown: Record<EmpireSource, number> } {
  const W = EMPIRE_WEIGHTS;
  const b: Record<EmpireSource, number> = {
    harvested: Math.floor(Math.max(0, s.harvested) * W.harvested),
    sales: Math.floor(Math.max(0, s.sales) * W.sales),
    lands: Math.max(0, s.lands) * W.lands,
    tier: Math.max(0, s.tier - 1) * W.tier,
    patents: Math.max(0, s.patents) * W.patents,
    crosses: Math.max(0, s.crosses) * W.crosses,
    staff: Math.max(0, s.staff) * W.staff,
    level: Math.max(0, s.level - 1) * W.level,
  };
  return { total: Object.values(b).reduce((a, x) => a + x, 0), breakdown: b };
}

export const rankOf = (points: number): number => EMPIRE_RANKS.filter((r) => points >= r.at).length || 1;
export const rankInfo = (rank: number): EmpireRank => EMPIRE_RANKS[Math.max(1, Math.min(MAX_EMPIRE_RANK, rank)) - 1];

/** the capped advantages of a rank (none of them creates $FLORA) */
export function perksOf(rank: number) {
  return {
    forgeJobs: rank >= 3 ? 1 : 0,
    maxLands: 12 + (rank >= 4 ? 2 : 0) + (rank >= 8 ? 2 : 0),
    breedingJobs: rank >= 6 ? 1 : 0,
    crown: rank >= 10,
  };
}
export type EmpirePerks = ReturnType<typeof perksOf>;

/** what the economy snapshot carries */
export interface EmpireView { rank: number; points: number; next: number | null; breakdown: Record<EmpireSource, number>; perks: EmpirePerks }
