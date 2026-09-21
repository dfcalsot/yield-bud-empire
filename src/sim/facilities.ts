/**
 * Facility construction. Upgrading is no longer instant: it costs $FLORA (burned) AND real time, so the free player advances
 * with patience and the paying player advances faster, but only within limits (a few speed-ups per day, each pricier than the
 * last, and every speed-up burns $FLORA). Pure, so the economy simulation can reuse it.
 */
export const BUILD_HOURS: Record<string, number> = { tent_pro: 12, greenhouse_commercial: 48, lab_pharma_hydro: 120 };

/** speed-ups allowed per real day, the share of the REMAINING time each one cuts, and the price curve */
export const SPEEDUP = { perDay: 2, share: 0.2, minCutHours: 1, baseFloraPerHour: 15, priceGrowth: 1.8 } as const;

export interface Construction {
  facilityId: string;
  startedAt: number;
  endsAt: number;
  /** speed-ups used on `boostDay` (the player's local calendar day) */
  boosts: number;
  boostDay: string;
}

export const dayOf = (ms: number): string => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

export const buildHoursOf = (facilityId: string): number => BUILD_HOURS[facilityId] ?? 0;

export function startConstruction(facilityId: string, now: number): Construction | null {
  const h = buildHoursOf(facilityId);
  if (h <= 0) return null;
  return { facilityId, startedAt: now, endsAt: now + h * 3600_000, boosts: 0, boostDay: dayOf(now) };
}

export const remainingMs = (c: Construction, now: number): number => Math.max(0, c.endsAt - now);
export const isDone = (c: Construction, now: number): boolean => remainingMs(c, now) <= 0;
export const progressOf = (c: Construction, now: number): number => Math.min(1, Math.max(0, (now - c.startedAt) / Math.max(1, c.endsAt - c.startedAt)));

const boostsToday = (c: Construction, now: number): number => (c.boostDay === dayOf(now) ? c.boosts : 0);

export interface Quote { cutMs: number; costFlora: number; usedToday: number; leftToday: number }

/** What the next speed-up would do and cost, or null when none is allowed (finished or the daily limit is reached). */
export function speedUpQuote(c: Construction, now: number): Quote | null {
  const left = remainingMs(c, now);
  const used = boostsToday(c, now);
  if (left <= 0 || used >= SPEEDUP.perDay) return null;
  const cutMs = Math.min(left, Math.max(SPEEDUP.minCutHours * 3600_000, left * SPEEDUP.share));
  const costFlora = Math.max(5, Math.round(SPEEDUP.baseFloraPerHour * (cutMs / 3600_000) * SPEEDUP.priceGrowth ** used));
  return { cutMs, costFlora, usedToday: used, leftToday: SPEEDUP.perDay - used };
}

export function applySpeedUp(c: Construction, now: number): { state: Construction; quote: Quote } | null {
  const q = speedUpQuote(c, now);
  if (!q) return null;
  const used = boostsToday(c, now);
  return { state: { ...c, endsAt: c.endsAt - q.cutMs, boosts: used + 1, boostDay: dayOf(now) }, quote: q };
}

export function normalizeConstruction(raw: unknown): Construction | null {
  const r = raw as Partial<Construction> | null;
  if (!r || typeof r.facilityId !== 'string' || typeof r.startedAt !== 'number' || typeof r.endsAt !== 'number') return null;
  return { facilityId: r.facilityId, startedAt: r.startedAt, endsAt: r.endsAt, boosts: typeof r.boosts === 'number' ? r.boosts : 0, boostDay: typeof r.boostDay === 'string' ? r.boostDay : dayOf(r.startedAt) };
}

/** Cheapest way to finish a build entirely with speed-ups today, ignoring the daily limit (used by the economy simulation). */
export function fullSpeedUpCostFlora(hours: number): number {
  let left = hours * 3600_000, cost = 0, used = 0;
  while (left > 0 && used < SPEEDUP.perDay) {
    const cut = Math.min(left, Math.max(SPEEDUP.minCutHours * 3600_000, left * SPEEDUP.share));
    cost += Math.max(5, Math.round(SPEEDUP.baseFloraPerHour * (cut / 3600_000) * SPEEDUP.priceGrowth ** used));
    left -= cut; used++;
  }
  return left > 0 ? Infinity : cost;
}
