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
