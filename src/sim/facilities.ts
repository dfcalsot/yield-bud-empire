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

/** the most plants any room can hold (3 rows of 10 in the Sala) */
export const MAX_ROOM_PLANTS = 30;

/**
 * Fit the room to the facility's capacity. Plants past the capacity are not lost: they are kept dormant (frozen) and come back
 * when the room grows again, so a bigger installation never hands out free, pre-grown plants — only the ones the player already had.
 */
export function fitToCapacity<T extends { slotIndex?: number }>(active: T[], dormant: T[], capacity: number, make: (slot: number) => T): { active: T[]; dormant: T[] } {
  const cap = Math.max(1, Math.min(MAX_ROOM_PLANTS, Math.floor(capacity)));
  if (active.length === cap) return { active, dormant };
  if (active.length > cap) {
    return { active: active.slice(0, cap), dormant: [...active.slice(cap), ...dormant].sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0)) };
  }
  const pool = [...dormant];
  const next = [...active];
  for (let slot = active.length; slot < cap; slot++) {
    const at = pool.findIndex((p) => (p.slotIndex ?? -1) === slot);
    next.push(at >= 0 ? pool.splice(at, 1)[0] : make(slot));
  }
  return { active: next, dormant: pool };
}
