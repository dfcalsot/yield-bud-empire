/**
 * The list price of everything a player can sell, in one table shared by the lab stations, the client and the server.
 * Prices are per OUTPUT gram, before `ECON.priceScale`. They are keyed by recipe id (a station recipe) and, as a fallback, by product type.
 *
 * Balance rule (checked by tests/products.test.ts): a gram of FLOWER must never be worth more as any product than as live rosin
 * (0.22 g × 45 ≈ 9.9), and a gram of TRIM (a free by-product) about 2 at most, so no station makes money out of nothing.
 */
export const PRODUCT_PRICE: Readonly<Record<string, number>> = {
  // flower processed at the extraction bench
  cured_flower: 9, live_rosin: 45, full_spec_oil: 25, pure_terpenes: 85,
  // lab-floor recipes
  oil: 25, bubble_hash: 28, full_melt: 62, terpene_sauce: 52, diamonds: 95, kief_trim: 20, kief_flower: 34,
  preroll: 9, cigar: 10.5, rso: 70, gummies: 3.3,
  // the same products by type (a sale without a recipe id)
  kief: 20, v2p_merch: 0,
  // forge derivatives (see sim/forge.ts)
  balm: 6, candle: 3, tincture: 8,
};

/** list price per gram of a product: its recipe if known, else its type; undefined when the game does not sell it */
export const priceOf = (type: string, recipeId?: string): number | undefined => {
  const p = (recipeId && PRODUCT_PRICE[recipeId]) || PRODUCT_PRICE[type];
  return typeof p === 'number' && p > 0 ? p : undefined;
};

/** the key a product is kept and sold under (the same rule as priceOf: its recipe when it has its own price, else its type) */
export const productKey = (type: string, recipeId?: string): string => (recipeId && PRODUCT_PRICE[recipeId] ? recipeId : type);

/**
 * How much product one gram of input can give at most, per product key: the station/bench ratio, the best staff lab bonus (+15 %)
 * and, for live rosin, the press mini-game's critical (+35 %). The server refuses a batch that claims more (see server/economy.mjs,
 * intent `process`). Ratios are the ones the game uses: lab/stations.ts and the extraction bench in GameContext.
 */
export const PROCESS_YIELD: Readonly<Record<string, { input: 'flower' | 'trim'; ratio: number }>> = {
  // lab floor stations (by recipe id)
  live_rosin: { input: 'flower', ratio: 0.22 }, bubble_hash: { input: 'trim', ratio: 0.07 }, full_melt: { input: 'flower', ratio: 0.05 },
  terpene_sauce: { input: 'flower', ratio: 0.18 }, diamonds: { input: 'flower', ratio: 0.1 }, kief_trim: { input: 'trim', ratio: 0.1 },
  kief_flower: { input: 'flower', ratio: 0.06 }, preroll: { input: 'flower', ratio: 0.95 }, cigar: { input: 'flower', ratio: 0.9 },
  rso: { input: 'flower', ratio: 0.12 }, oil: { input: 'flower', ratio: 0.4 }, gummies: { input: 'trim', ratio: 0.6 },
  // extraction bench (by type)
  cured_flower: { input: 'flower', ratio: 1 }, full_spec_oil: { input: 'flower', ratio: 0.4 }, pure_terpenes: { input: 'flower', ratio: 0.08 },
};
const LAB_BONUS_MAX = 0.15;
const PRESS_CRIT_MAX = 0.35;
/** most grams of `key` one input gram can give (undefined: not something the lab makes) */
export function maxYieldOf(key: string): number | undefined {
  const y = PROCESS_YIELD[key];
  if (!y) return undefined;
  return y.ratio * (1 + LAB_BONUS_MAX) * (key === 'live_rosin' ? 1 + PRESS_CRIT_MAX : 1);
}

/** the product type of each key (to draw a batch the server holds but this browser never saw, e.g. made on another device) */
export const TYPE_OF_KEY: Readonly<Record<string, string>> = {
  live_rosin: 'live_rosin', bubble_hash: 'bubble_hash', full_melt: 'bubble_hash', terpene_sauce: 'terpene_sauce', diamonds: 'terpene_sauce',
  kief_trim: 'kief', kief_flower: 'kief', kief: 'kief', preroll: 'preroll', cigar: 'cigar', rso: 'rso', oil: 'full_spec_oil', gummies: 'gummies',
  cured_flower: 'cured_flower', full_spec_oil: 'full_spec_oil', pure_terpenes: 'pure_terpenes', balm: 'balm', candle: 'candle', tincture: 'tincture',
};
