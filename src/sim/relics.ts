/**
 * Relics: unique NFTs earned by playing (never sold by the house). An active week of play fills the weekly activity chest; the
 * server rolls the relic. Each relic carries one bonus on an existing stat, from its own pool of caps (smaller than the staff's),
 * never on sale prices, so a relic bought from another player — for $FLORA today, for SOL outside the game later — improves the
 * game within limits and never prints $FLORA. Pure: the server and the browser share it.
 */
import { k, localize } from '../i18n/core';
import type { StatId, Mods } from './staff';
import type { MissionEvent } from './missions';
import type { MaterialId } from './forge';

export type RelicRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type RelicStat = Exclude<StatId, 'sellBonus'>;

export interface RelicType { id: string; stat: RelicStat; name: string; icon: string; blurb: string; color: string }
export const RELIC_TYPES: readonly RelicType[] = localize<readonly RelicType[]>([
  { id: 'lamp', stat: 'growth', name: k('Lámpara del Alba'), icon: '💡', blurb: k('Las plantas crecen un poco más rápido.'), color: '#fbbf24' },
  { id: 'soil', stat: 'roomYield', name: k('Sustrato Ancestral'), icon: '🪴', blurb: k('Más flor en la sala bajo techo.'), color: '#a3e635' },
  { id: 'terroir', stat: 'plotYield', name: k('Piedra del Terroir'), icon: '🗿', blurb: k('Más flor en tus tierras al aire libre.'), color: '#34d399' },
  { id: 'flask', stat: 'labYield', name: k('Matraz del Alquimista'), icon: '⚗️', blurb: k('El laboratorio saca más de cada gramo.'), color: '#c084fc' },
  { id: 'ledger', stat: 'shopDiscount', name: k('Libreta del Mercader'), icon: '📒', blurb: k('Descuento en el Grow Market.'), color: '#38bdf8' },
  { id: 'seedpod', stat: 'seedBonus', name: k('Vaina Semillera'), icon: '🌰', blurb: k('Más semillas en cada cruce.'), color: '#f59e0b' },
  { id: 'compass', stat: 'missionBonus', name: k('Brújula del Cultivador'), icon: '🧭', blurb: k('Más XP en las misiones.'), color: '#f472b6' },
], ['name', 'blurb']);
export const RELIC_TYPE_BY_ID: Record<string, RelicType> = Object.fromEntries(RELIC_TYPES.map((r) => [r.id, r]));

/** the most all equipped relics together can add, per stat (smaller than the staff's CAPS; nothing on sale prices) */
export const RELIC_CAPS: Record<RelicStat, number> = { growth: 0.05, roomYield: 0.08, plotYield: 0.08, labYield: 0.06, shopDiscount: 0.05, seedBonus: 1, missionBonus: 0.1 };
/** share of the stat's cap one relic gives, by rarity */
export const RELIC_POWER: Record<RelicRarity, number> = { common: 0.3, rare: 0.5, epic: 0.75, legendary: 1 };
export const RELIC_ODDS: ReadonlyArray<[RelicRarity, number]> = [['common', 0.6], ['rare', 0.28], ['epic', 0.1], ['legendary', 0.02]];
export const MAX_EQUIPPED = 3;
export const MAX_RELICS = 60;

export interface Relic { id: string; typeId: string; stat: RelicStat; rarity: RelicRarity; value: number; serial: number; season: string; mintedAt: number; bound?: boolean }

const round = (stat: RelicStat, v: number) => (stat === 'seedBonus' ? Math.max(1, Math.round(v)) : Math.round(v * 1000) / 1000);
export const relicValue = (stat: RelicStat, rarity: RelicRarity) => round(stat, RELIC_CAPS[stat] * RELIC_POWER[rarity]);

/** the server's roll: a type and a rarity (fixed odds) */
export function rollRelic(rng: () => number, id: string, serial: number, season: string, now: number, bound = false): Relic {
  const type = RELIC_TYPES[Math.floor(rng() * RELIC_TYPES.length) % RELIC_TYPES.length];
  let x = rng(), rarity: RelicRarity = 'common';
  for (const [r, p] of RELIC_ODDS) { if (x < p) { rarity = r; break; } x -= p; }
  return { id, typeId: type.id, stat: type.stat, rarity, value: relicValue(type.stat, rarity), serial, season, mintedAt: now, ...(bound ? { bound: true } : {}) };
}

/** the bonuses of the equipped relics (at most MAX_EQUIPPED, one per stat), inside RELIC_CAPS */
export function relicMods(equipped: Relic[]): Partial<Record<RelicStat, number>> {
  const out: Partial<Record<RelicStat, number>> = {};
  const seen = new Set<RelicStat>();
  for (const r of equipped.slice(0, MAX_EQUIPPED)) {
    if (seen.has(r.stat) || !(r.stat in RELIC_CAPS)) continue;
    seen.add(r.stat);
    out[r.stat] = Math.min(RELIC_CAPS[r.stat], (out[r.stat] ?? 0) + relicValue(r.stat, r.rarity));
  }
  return out;
}

/** staff bonuses (already capped) plus the relics' own pool */
export function combineMods(staff: Mods, relics: Partial<Record<RelicStat, number>>): Mods {
  const m = { ...staff };
  for (const [k2, v] of Object.entries(relics) as Array<[RelicStat, number]>) m[k2] = (m[k2] ?? 0) + v;
  return m;
}

/* ───────────── the weekly activity chest ───────────── */
export const ACTIVITY = {
  /** points per mission event, and a weekly ceiling per kind (so clicking the same button can't fill it) */
  points: { harvest: 5, sell: 3, lab: 3, breed: 4, certify: 2, fertigate: 2, plant: 1, water: 1, feed: 1, buy: 1, seedbuy: 1, plot: 5, patent: 5 } as Partial<Record<MissionEvent, number>>,
  capPerKind: { water: 15, feed: 15, plant: 15, buy: 10, seedbuy: 10, fertigate: 20, certify: 20, lab: 45, sell: 45, harvest: 80, breed: 40, plot: 20, patent: 20 } as Partial<Record<MissionEvent, number>>,
  /** chests of a week: points and active days needed */
  chests: [{ points: 60, days: 3 }, { points: 150, days: 5 }] as const,
  /** chests earned and not opened are kept, up to this */
  maxPending: 4,
  /** an account must be this old and have this empire rank */
  minAgeDays: 7,
  minEmpireRank: 2,
} as const;

/** Monday-based week key of a moment (UTC) */
export function weekKey(ms: number): string {
  const d = new Date(ms);
  const day = (d.getUTCDay() + 6) % 7;                    // 0 = Monday
  const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
  return new Date(monday).toISOString().slice(0, 10);
}
export const dayKeyUtc = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export interface Activity { week: string; points: number; perKind: Partial<Record<MissionEvent, number>>; days: string[]; earned: number; pending: number; opened: number }
export const emptyActivity = (now: number): Activity => ({ week: weekKey(now), points: 0, perKind: {}, days: [], earned: 0, pending: 0, opened: 0 });

export function normalizeActivity(raw: unknown, now: number): Activity {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Activity>;
  const a = emptyActivity(now);
  if (typeof r.week === 'string') a.week = r.week.slice(0, 10);
  a.points = Math.max(0, Math.min(10_000, Number(r.points) || 0));
  a.perKind = r.perKind && typeof r.perKind === 'object' ? Object.fromEntries(Object.entries(r.perKind).filter(([, v]) => typeof v === 'number').map(([k2, v]) => [k2, Math.max(0, v as number)])) : {};
  a.days = Array.isArray(r.days) ? r.days.filter((x) => typeof x === 'string').slice(0, 7) : [];
  a.earned = Math.max(0, Math.min(ACTIVITY.chests.length, Math.floor(Number(r.earned) || 0)));
  a.pending = Math.max(0, Math.min(ACTIVITY.maxPending, Math.floor(Number(r.pending) || 0)));
  a.opened = Math.max(0, Math.floor(Number(r.opened) || 0));
  return rollWeek(a, now);
}

/** a new week starts from zero (chests already earned stay pending) */
export function rollWeek(a: Activity, now: number): Activity {
  const w = weekKey(now);
  return a.week === w ? a : { ...a, week: w, points: 0, perKind: {}, days: [], earned: 0 };
}

/** something the player did counts for the week; returns how many chests it just earned */
export function addActivity(a: Activity, ev: MissionEvent, n: number, now: number, eligible: boolean): { activity: Activity; newChests: number } {
  const cur = rollWeek(a, now);
  const per = ACTIVITY.points[ev] ?? 0;
  const done = cur.perKind[ev] ?? 0;
  const room = Math.max(0, (ACTIVITY.capPerKind[ev] ?? Infinity) - done);
  const gain = Math.min(room, per * Math.max(0, n));
  const day = dayKeyUtc(now);
  const next: Activity = { ...cur, points: cur.points + gain, perKind: { ...cur.perKind, [ev]: done + gain }, days: cur.days.includes(day) ? cur.days : [...cur.days, day].slice(-7) };
  if (!eligible) return { activity: next, newChests: 0 };
  let newChests = 0;
  while (next.earned < ACTIVITY.chests.length) {
    const c = ACTIVITY.chests[next.earned];
    if (next.points < c.points || next.days.length < c.days) break;
    next.earned += 1;
    if (next.pending < ACTIVITY.maxPending) { next.pending += 1; newChests += 1; }
  }
  return { activity: next, newChests };
}

/** melting a relic gives forge materials by rarity (it leaves circulation for good) */
export function meltReward(rarity: RelicRarity): Partial<Record<MaterialId, number>> {
  return { common: { fibra_hilada: 3, cera: 1 }, rare: { tela: 2, cera: 2, resina_refinada: 1 }, epic: { resina_refinada: 3, reactivo: 1 }, legendary: { resina_refinada: 5, reactivo: 2, sello_identidad: 1 } }[rarity];
}

export const RELIC_RARITY_LABEL: Record<RelicRarity, string> = localize<Record<RelicRarity, string>>({ common: k('Común'), rare: k('Rara'), epic: k('Épica'), legendary: k('Legendaria') }, ['common', 'rare', 'epic', 'legendary']);
