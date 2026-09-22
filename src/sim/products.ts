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
