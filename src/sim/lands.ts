/**
 * Land NFTs. The rarity of a plot comes only from its rating (water + sun + soil), so it can be recomputed anywhere and is the
 * same on every replay. Ratings across the planet run from about 7.2 to 9.3, so the cut-offs are set to make the top rare.
 */
export type LandRarity = 'common' | 'rare' | 'epic' | 'legendary';

export const LAND_CUTS: Array<{ min: number; rarity: LandRarity }> = [
  { min: 9.0, rarity: 'legendary' },
  { min: 8.6, rarity: 'epic' },
  { min: 8.1, rarity: 'rare' },
  { min: 0, rarity: 'common' },
];

export const landRarity = (landRating: number): LandRarity => LAND_CUTS.find((c) => landRating >= c.min)!.rarity;

export const LAND_RARITY_RANK: Record<LandRarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

/* ───────────────────────────── the land market ───────────────────────────── */
import { REGIONS, REGION_BY_ID, plotOffer, type PlotOffer } from './terroir';
import type { RegionId } from '../types';

/** plots already sold to other growers before the game opened, per region (the market looks alive; every real purchase comes on top) */
export const SOLD_BASE: Record<RegionId, number> = { afghanistan: 14, mexico: 22, jamaica: 31, central_america: 9, south_america: 27, africa: 18, asia: 12 };
export const OFFERS_PER_REGION = 6;

/** The plots of a region that are for sale right now, given the ids that somebody already owns (every player's, not just yours). */
export function landOffers(region: RegionId, takenIds: ReadonlySet<string>): { offers: PlotOffer[]; left: number } {
  const r = REGION_BY_ID[region];
  const mine = [...takenIds].filter((id) => id.startsWith(`plot-${region}-`)).length;
  const left = Math.max(0, r.supply - SOLD_BASE[region] - mine);
  const offers: PlotOffer[] = [];
  for (let i = SOLD_BASE[region] + 1; i <= r.supply && offers.length < Math.min(OFFERS_PER_REGION, left); i++) {
    const o = plotOffer(region, i);
    if (!takenIds.has(o.id)) offers.push(o);
  }
  return { offers, left };
}
export const allRegions = (): RegionId[] => REGIONS.map((r) => r.id);
