import { BALANCE } from './balance';
import { PLOT_SIZE } from './terroir';

/**
 * The most flower an account can physically harvest, computed by the SERVER from what it knows for sure: the account's facility
 * (plant spots and environment bonus), how many land plots it owns and the staff it has working. The grow simulation itself runs in
 * the browser; this is the ceiling its harvests are checked against, so a tampered browser can at most grow as fast as the best
 * possible honest player — never print flower (and so $FLORA) out of nothing.
 *
 * Every factor is the maximum the game data allows (see GameContext: a room plant yields 75 g × resin multiplier × facility bonus,
 * then health and staff; techniques add at most +20 %; a landrace in its home region +30 %), plus a small margin. The allowance
 * refills at the rate of the fastest possible cycle and is capped at one full harvest (+25 %), so saving time up never pays twice.
 */
export const BASE_YIELD_G = 75;
/** resin multiplier ceiling (breeding is clamped to it too; the best catalogue strain is 2.1) */
export const MAX_RESIN_MULT = 2.5;
export const TECHNIQUES_MAX = 0.2;
export const TERROIR_MAX = 1.3;
/** CO₂, light and a perfect climate can speed growth above the base rate */
export const GROWTH_UPSIDE = 1.5;
/** trim that comes with each gram of flower (the game gives 40 %) */
export const TRIM_PER_FLOWER = 0.45;
/** a plant speed-up pushes the plant 35 progress points (boostWithinPhase) and costs this much */
export const GROW_SPEEDUP = { plantFlora: 25, roomFlora: 50, share: 0.35 } as const;
const MARGIN = 1.1;

export interface CapInput {
  /** plant spots of the facility the account grows in, and its environment bonus */
  roomSlots: number;
  envBonus: number;
  /** land plots owned (36 plants each) */
  plots: number;
  /** staff modifiers of the people working right now */
  mods: { roomYield: number; plotYield: number; growth: number };
}
export interface Allowance { grams: number; at: number }

export const maxPerRoomPlant = (i: CapInput): number => BASE_YIELD_G * MAX_RESIN_MULT * i.envBonus * (1 + TECHNIQUES_MAX) * (1 + i.mods.roomYield) * MARGIN;
export const maxPerPlotPlant = (i: CapInput): number => BASE_YIELD_G * MAX_RESIN_MULT * TERROIR_MAX * (1 + TECHNIQUES_MAX) * (1 + i.mods.plotYield) * MARGIN;

/** grams of flower if every spot (room and plots) were harvested at the ceiling */
export const fullHarvest = (i: CapInput): number => i.roomSlots * maxPerRoomPlant(i) + i.plots * PLOT_SIZE * maxPerPlotPlant(i);

/** allowance ceiling: one full harvest and a bit */
export const allowanceCap = (i: CapInput): number => fullHarvest(i) * 1.25;

/** grams per second the allowance refills: every spot finishing its fastest possible cycle */
export function allowancePerSecond(i: CapInput): number {
  const base = BALANCE.cycleDaysMin * 86400;
  const speed = (1 + i.mods.growth) * GROWTH_UPSIDE;
  const roomCycle = base / (Math.max(1, i.envBonus) * speed);
  const plotCycle = base / speed;
  return (i.roomSlots * maxPerRoomPlant(i)) / roomCycle + (i.plots * PLOT_SIZE * maxPerPlotPlant(i)) / plotCycle;
}

/** the allowance at `now`: it grows with time up to the ceiling (an account that never had one starts full) */
export function accrue(a: Allowance | null | undefined, i: CapInput, now: number): Allowance {
  const cap = allowanceCap(i);
  if (!a || !Number.isFinite(a.grams)) return { grams: cap, at: now };
  const dt = Math.max(0, (now - a.at) / 1000);
  return { grams: Math.min(cap, a.grams + dt * allowancePerSecond(i)), at: now };
}

/** allowance a speed-up adds: 35 % of a ceiling harvest for each plant it pushes */
export const speedupGrams = (i: CapInput, plants: number): number => plants * maxPerRoomPlant(i) * GROW_SPEEDUP.share;
