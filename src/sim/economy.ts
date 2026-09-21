/**
 * The money model of the game, in one place. Pure (no React), shared with the economy simulation and, later, with the server.
 *
 * $FLORA enters the world only through selling product, a small daily claim, level-ups and missions; everything else burns it.
 * What keeps the economy deflationary and slow to grow:
 *  - the market has limited DEPTH: the more you sell in a short time the less each gram pays (`saleRevenue`), so a bigger
 *    installation makes more product but not proportionally more money;
 *  - every sale burns a fee, and bigger operations pay a licence (`SALE_TAX`), both burned;
 *  - running the room costs energy, water and nutrients (market consumables, burned when bought);
 *  - a starter balance too small to skip the first upgrade.
 * The numbers were tuned with `tests/economy-sim.ts`, which fails when a target is broken.
 */
export const ECON = {
  /** what a new account starts with (a bit of running money, not enough to buy the first upgrade) */
  starterFlora: 80,
  /** multiplies the listed value of every product (rosin, cured flower, oil, terpenes) */
  priceScale: 0.26,
  /** the market absorbs about this many grams at full price; beyond it each gram pays less (see `saleRevenue`) */
  depthGrams: 45,
  /** the depth is recovered with this half-life */
  depthHalfLifeHours: 12,
  /** burned on every sale, plus a licence that grows with the installation (index = facility tier − 1) */
  marketFee: 0.025,
  saleTax: [0, 0.3, 0.3, 0.35] as readonly number[],
  /** the daily claim that replaces the unlimited faucet: one small claim every 24 h */
  dailyClaim: 10,
  dailyClaimEveryHours: 24,
  /** $FLORA given on levelling up (used to be 100) */
  levelBonus: 20,
} as const;

/** state of the market depth: grams sold recently (decays with time) and when it was last updated */
export interface Depth { sold: number; at: number }
export const EMPTY_DEPTH: Depth = { sold: 0, at: 0 };

/** grams "still weighing on the market" at `now` */
export const soldNow = (d: Depth, now: number): number => (d.sold <= 0 ? 0 : d.sold * 0.5 ** (Math.max(0, now - d.at) / 3600_000 / ECON.depthHalfLifeHours));

/**
 * What selling `grams` at a list price of `pricePerGram` is worth right now, and the depth afterwards. The unit price falls as
 * 1 / (1 + sold / depth), integrated over the grams, so splitting a sale into pieces never pays more than selling it at once.
 * It is bounded: even selling forever earns at most about `pricePerGram × depth` per depth-recovery period.
 */
export function saleRevenue(pricePerGram: number, grams: number, depth: Depth, now: number): { revenue: number; depth: Depth } {
  const s = soldNow(depth, now);
  const D = ECON.depthGrams;
  const revenue = pricePerGram * D * Math.log((D + s + grams) / (D + s));
  return { revenue, depth: { sold: s + grams, at: now } };
}

/** how much of a sale is burned: the market fee plus the licence of the installation */
export const burnRateOfSale = (facilityTier: number): number => ECON.marketFee + (ECON.saleTax[Math.max(0, Math.min(ECON.saleTax.length - 1, facilityTier - 1))] ?? 0);

/** can the daily claim be taken (and how long is left when not) */
export const claimStatus = (lastAt: number, now: number): { ok: boolean; leftMs: number } => {
  const left = lastAt + ECON.dailyClaimEveryHours * 3600_000 - now;
  return { ok: left <= 0, leftMs: Math.max(0, left) };
};
