import { LAND_RARITY_RANK, landRarity, type LandRarity } from '../sim/lands';
import { REGION_BY_ID, PLOT_SIZE } from '../sim/terroir';
import type { RegionId } from '../types';
import { mintAddressFor, serialFor } from './nft';

/** View-model of a land NFT (a plot the player owns or one for sale). The mint address is a simulated, deterministic identifier. */
export interface LandCardData {
  id: string;
  name: string;
  region: RegionId;
  regionName: string;
  emoji: string;
  color: string;
  climate: string;
  rarity: LandRarity;
  landRating: number;
  ratings: { water: number; sunlight: number; soil: number };
  /** "17 / 40": which plot of the region's fixed supply this is */
  edition: string;
  serial: string;
  mint: string;
  slots: number;
  priceFlora?: number;
  priceSol?: number;
}

export interface LandLike { id: string; region: RegionId; index: number; name: string; landRating: number; ratings: { water: number; sunlight: number; soil: number }; priceFlora?: number; priceSol?: number }

export function landCardOf(l: LandLike): LandCardData {
  const r = REGION_BY_ID[l.region];
  return {
    id: l.id, name: l.name, region: l.region, regionName: r.name, emoji: r.emoji, color: r.color, climate: r.climate,
    rarity: landRarity(l.landRating), landRating: l.landRating, ratings: l.ratings,
    edition: `${l.index} / ${r.supply}`, serial: serialFor(l.id), mint: mintAddressFor(l.id), slots: PLOT_SIZE,
    priceFlora: l.priceFlora, priceSol: l.priceSol,
  };
}

export const byRarityThenRating = (a: LandCardData, b: LandCardData): number =>
  LAND_RARITY_RANK[b.rarity] - LAND_RARITY_RANK[a.rarity] || b.landRating - a.landRating;
