/**
 * Staff NFTs. Every character of the industry (the foreman, the outdoor grower, the shop keeper, the lab scientist, the geneticist
 * and the budtender) can be replaced by an NFT hire of some rarity and rank that brings a bounded bonus in exchange for a daily
 * wage that is BURNED. Pure module (no React): the odds, the effects and the caps live here so the economy simulation can reuse them.
 *
 * The bonuses are small and capped on purpose: no roster, however rare, can push a stat past its cap, and a wage is always paid.
 */
import { rollRarity, type AvatarRarity, type PityState } from './avatars';
import { k, localize } from '../i18n/core';

export type StaffRole = 'foreman' | 'farmer' | 'merchant' | 'scientist' | 'geneticist' | 'budtender';
export const STAFF_ROLES: StaffRole[] = ['foreman', 'farmer', 'merchant', 'scientist', 'geneticist', 'budtender'];
export type StaffRarity = AvatarRarity;
export const RARITIES: StaffRarity[] = ['common', 'rare', 'epic', 'legendary'];
export const MAX_RANK = 5;

export type StatId = 'roomYield' | 'plotYield' | 'shopDiscount' | 'labYield' | 'sellBonus' | 'seedBonus' | 'missionBonus' | 'growth';

export const ROLE_INFO: Record<StaffRole, { label: string; place: string; stat: StatId; effect: string }> = localize<Record<StaffRole, { label: string; place: string; stat: StatId; effect: string }>>({
  foreman: { label: k('Capataz'), place: k('Sala de cultivo'), stat: 'roomYield', effect: k('Cosecha de la Sala') },
  farmer: { label: k('Cultivador'), place: k('Parcelas (Planeta)'), stat: 'plotYield', effect: k('Cosecha de las parcelas') },
  merchant: { label: k('Tendero'), place: k('Mercado'), stat: 'shopDiscount', effect: k('Descuento en el Mercado') },
  scientist: { label: k('Científico'), place: k('Laboratorio'), stat: 'labYield', effect: k('Rendimiento de extracción') },
  geneticist: { label: k('Genetista'), place: k('Genética'), stat: 'seedBonus', effect: k('Semillas extra por cruce') },
  budtender: { label: k('Dispensaria'), place: k('Dispensario'), stat: 'sellBonus', effect: k('Precio de venta') },
}, ['label', 'place', 'effect']);

/** the ceiling of every stat, whatever the roster: a legendary at rank 5 alone reaches its role's cap, never more */
export const CAPS: Record<StatId, number> = { roomYield: 0.18, plotYield: 0.18, shopDiscount: 0.1, labYield: 0.15, sellBonus: 0.12, seedBonus: 3, missionBonus: 0.3, growth: 0.1 };
export const STAT_LABEL: Record<StatId, string> = localize<Record<StatId, string>>({
  roomYield: k('Cosecha de la Sala'), plotYield: k('Cosecha de parcelas'), shopDiscount: k('Descuento del Mercado'), labYield: k('Extracción'), sellBonus: k('Precio de venta'),
  seedBonus: k('Semillas extra por cruce'), missionBonus: k('Recompensas de misiones'), growth: k('Ritmo de crecimiento'),
}, ['roomYield', 'plotYield', 'shopDiscount', 'labYield', 'sellBonus', 'seedBonus', 'missionBonus', 'growth']);

const RARITY_POWER: Record<StaffRarity, number> = { common: 0.35, rare: 0.55, epic: 0.8, legendary: 1 };
const RANK_MUL = [0, 0.6, 0.72, 0.84, 0.93, 1];

export interface Trait { id: 'mentor' | 'veloz' | 'especialista'; name: string; blurb: string }
export const TRAITS: Record<Trait['id'], Trait> = localize<Record<Trait['id'], Trait>>({
  mentor: { id: 'mentor', name: k('Mentor'), blurb: k('Enseña: más recompensa en las misiones.') },
  veloz: { id: 'veloz', name: k('Veloz'), blurb: k('Trabajo ágil: el cultivo va un poco más rápido.') },
  especialista: { id: 'especialista', name: k('Especialista'), blurb: k('Refuerza lo que mejor sabe hacer.') },
}, ['name', 'blurb']);
const TRAIT_ORDER: Trait['id'][] = ['especialista', 'mentor', 'veloz'];
/** how many traits a hire has, by rarity (the first `n` of a per-hire shuffle) */
const TRAIT_COUNT: Record<StaffRarity, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

/** Each role has 6 hand-designed characters: 2 common, 2 rare, 1 epic and 1 legendary (the higher the rarity, the more elaborate). */
export const VARIANTS_PER_ROLE = 6;
export const VARIANT_TIER: Record<StaffRarity, number[]> = { common: [0, 1], rare: [2, 3], epic: [4], legendary: [5] };
/** designs taken out of use: no new hire gets them and old hires with one move to another design of the same rarity */
export const RETIRED_VARIANTS: Partial<Record<StaffRole, number[]>> = { merchant: [1] };
/** the designs a hire of this role and rarity can have */
export const variantsFor = (role: StaffRole, rarity: StaffRarity): number[] => VARIANT_TIER[rarity].filter((v) => !RETIRED_VARIANTS[role]?.includes(v));
export const variantFor = (role: StaffRole, rarity: StaffRarity, seed: number): number => { const t = variantsFor(role, rarity); return t[Math.abs(Math.floor(seed)) % t.length]; };
/** the design of a hire (old saves without one get it from their seed) */
export const variantOf = (s: Pick<StaffNft, 'role' | 'rarity' | 'seed'> & { variant?: number }): number => (typeof s.variant === 'number' && variantsFor(s.role, s.rarity).includes(s.variant) ? s.variant : variantFor(s.role, s.rarity, s.seed));

export interface StaffNft {
  id: string;
  role: StaffRole;
  rarity: StaffRarity;
  rank: number;
  name: string;
  /** decides the portrait variation; stable */
  seed: number;
  traits: Trait['id'][];
  /** which of the role's 6 designs this is (see VARIANT_TIER) */
  variant?: number;
  hiredAt: number;
  /** the wage is paid one day at a time: the hire works until this moment */
  paidThrough: number;
}

export type Mods = Record<StatId, number>;
export const NO_MODS: Mods = { roomYield: 0, plotYield: 0, shopDiscount: 0, labYield: 0, sellBonus: 0, seedBonus: 0, missionBonus: 0, growth: 0 };

const DAY = 86400000;

/* ───────────────────────────── the numbers ───────────────────────────── */

const clampRank = (r: number) => Math.max(1, Math.min(MAX_RANK, Math.round(r)));

function primaryOf(s: Pick<StaffNft, 'role' | 'rarity' | 'rank' | 'traits'>): number {
  const stat = ROLE_INFO[s.role].stat;
  let v = CAPS[stat] * RARITY_POWER[s.rarity] * RANK_MUL[clampRank(s.rank)];
  if (s.traits.includes('especialista')) v += CAPS[stat] * 0.25 * RANK_MUL[clampRank(s.rank)];
  return stat === 'seedBonus' ? Math.min(CAPS.seedBonus, Math.max(1, Math.round(v))) : Math.min(CAPS[stat], v);
}

/** what this hire contributes on its own (before the roster caps) */
export function effectsOf(s: Pick<StaffNft, 'role' | 'rarity' | 'rank' | 'traits'>): Partial<Mods> {
  const out: Partial<Mods> = { [ROLE_INFO[s.role].stat]: primaryOf(s) };
  const m = RANK_MUL[clampRank(s.rank)];
  if (s.traits.includes('mentor')) out.missionBonus = CAPS.missionBonus * 0.5 * m;
  if (s.traits.includes('veloz')) out.growth = CAPS.growth * 0.5 * m;
  return out;
}

/** Sum the bonuses of the hires that are ACTIVE (assigned and paid), never past a cap. */
export function modifiersOf(active: StaffNft[]): Mods {
  const m: Mods = { ...NO_MODS };
  for (const s of active) for (const [k, v] of Object.entries(effectsOf(s)) as Array<[StatId, number]>) m[k] += v;
  (Object.keys(m) as StatId[]).forEach((k) => { m[k] = Math.min(CAPS[k], m[k]); });
  return m;
}

const WAGE_BASE: Record<StaffRarity, number> = { common: 3, rare: 7, epic: 15, legendary: 30 };
/** $FLORA burned per day of work */
export const wageOf = (s: Pick<StaffNft, 'rarity' | 'rank'>): number => Math.round(WAGE_BASE[s.rarity] * (1 + 0.35 * (clampRank(s.rank) - 1)));

const RANK_COST_BASE: Record<StaffRarity, number> = { common: 50, rare: 90, epic: 160, legendary: 300 };
/** $FLORA burned to go from `rank` to `rank + 1` (null at the top) */
export const rankUpCost = (s: Pick<StaffNft, 'rarity' | 'rank'>): number | null => (s.rank >= MAX_RANK ? null : RANK_COST_BASE[s.rarity] * 2 ** (s.rank - 1));

export const isActive = (s: StaffNft, now: number): boolean => s.paidThrough > now;

/**
 * Pay the wages that are due. Only ASSIGNED hires cost anything; one is paid a day at a time, and if the balance does not cover it
 * the hire stops working until it can be paid (nothing is charged in advance, and being away never runs up a debt).
 */
export function settleWages(roster: StaffNft[], assignedIds: string[], balance: number, now: number): { roster: StaffNft[]; spent: number; unpaid: string[] } {
  let left = balance, spent = 0;
  const unpaid: string[] = [];
  const next = roster.map((s) => {
    if (!assignedIds.includes(s.id) || s.paidThrough > now) return s;
    const w = wageOf(s);
    if (left >= w) { left -= w; spent += w; return { ...s, paidThrough: now + DAY }; }
    unpaid.push(s.id);
    return s;
  });
  return { roster: next, spent, unpaid };
}

/** Only one hire per role can be assigned: validate an assignment map { role: staffId } against the roster. */
export function normalizeAssignments(raw: unknown, roster: StaffNft[]): Partial<Record<StaffRole, string>> {
  const out: Partial<Record<StaffRole, string>> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const role of STAFF_ROLES) {
    const id = (raw as Record<string, unknown>)[role];
    if (typeof id === 'string' && roster.some((s) => s.id === id && s.role === role)) out[role] = id;
  }
  return out;
}

export function normalizeRoster(raw: unknown): StaffNft[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is StaffNft => !!s && typeof s.id === 'string' && STAFF_ROLES.includes(s.role) && RARITIES.includes(s.rarity) && typeof s.name === 'string')
    .map((s) => ({ ...s, rank: clampRank(s.rank), traits: Array.isArray(s.traits) ? s.traits.filter((t) => t in TRAITS) : [], seed: Number(s.seed) || 0, hiredAt: Number(s.hiredAt) || 0, paidThrough: Number(s.paidThrough) || 0 }));
}

/* ───────────────────────────── making hires ───────────────────────────── */

const FIRST = ['Álex', 'Nico', 'Sami', 'Dani', 'Rocío', 'Bruno', 'Vale', 'Tomi', 'Luna', 'Mateo', 'Ingrid', 'Santi', 'Pilar', 'Kai', 'Nora', 'Iván', 'Camila', 'Rafa', 'Yara', 'Leo', 'Maru', 'Beto', 'Zoe', 'Hugo', 'Dana', 'Omar', 'Lía', 'Fede', 'Sol', 'Emilio'];
const LAST = ['Rojas', 'Mora', 'Vega', 'Campos', 'Solano', 'Brenes', 'Quirós', 'Salas', 'Araya', 'Chaves', 'Umaña', 'Cordero', 'Zamora', 'Jiménez', 'Barrantes', 'Alfaro', 'Montero', 'Céspedes', 'Villalobos', 'Porras'];

export function mulberry(seed: number): () => number {
  let a = seed | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const nameFor = (seed: number): string => { const r = mulberry(seed ^ 0x9e3779b9); return `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`; };

/** small, stable visual variation of the role's character (hue shift, saturation) so every NFT looks like its own person */
export function lookFor(seed: number): { hue: number; sat: number; bright: number } {
  const r = mulberry(seed ^ 0x51ed270b);
  return { hue: Math.round((r() * 2 - 1) * 38), sat: Number((0.85 + r() * 0.35).toFixed(2)), bright: Number((0.94 + r() * 0.14).toFixed(2)) };
}

export function makeStaff(id: string, role: StaffRole, rarity: StaffRarity, seed: number, now: number, rank = 1): StaffNft {
  const r = mulberry(seed ^ 0x2545f491);
  const order = [...TRAIT_ORDER].sort(() => r() - 0.5);
  return { id, role, rarity, rank: clampRank(rank), name: nameFor(seed), seed, variant: variantFor(role, rarity, seed), traits: order.slice(0, TRAIT_COUNT[rarity]), hiredAt: now, paidThrough: 0 };
}

/* ── job board: a few candidates a day, fixed prices, only common and rare ── */
export interface Candidate { id: string; role: StaffRole; rarity: 'common' | 'rare'; seed: number; priceFlora: number }
export const BOARD_PRICE: Record<'common' | 'rare', number> = { common: 60, rare: 170 };
export const BOARD_SIZE = 4;

export function jobBoard(dayIndex: number): Candidate[] {
  const r = mulberry(dayIndex * 7919 + 13);
  return Array.from({ length: BOARD_SIZE }, (_, slot) => {
    const role = STAFF_ROLES[Math.floor(r() * STAFF_ROLES.length)];
    const rarity: 'common' | 'rare' = r() < 0.22 ? 'rare' : 'common';
    return { id: `staff-d${dayIndex}-${slot}`, role, rarity, seed: Math.floor(r() * 2 ** 31), priceFlora: BOARD_PRICE[rarity] };
  });
}
export const hireFromBoard = (c: Candidate, now: number): StaffNft => makeStaff(c.id, c.role, c.rarity, c.seed, now);

/* ── recruitment chests with the same "pity" guarantee as the avatar chests ── */
export type StaffChestId = 'recruit' | 'headhunter';
export interface StaffChestDef { id: StaffChestId; name: string; blurb: string; priceFlora: number; odds: Record<StaffRarity, number>; epicEvery: number; legendEvery: number; colors: [string, string] }
export const STAFF_CHESTS: Record<StaffChestId, StaffChestDef> = localize<Record<StaffChestId, StaffChestDef>>({
  recruit: { id: 'recruit', name: k('Convocatoria abierta'), blurb: k('Candidatos de cualquier oficio. Casi siempre comunes, a veces una sorpresa.'), priceFlora: 220, odds: { common: 55, rare: 32, epic: 11, legendary: 2 }, epicEvery: 10, legendEvery: 50, colors: ['#38bdf8', '#075985'] },
  headhunter: { id: 'headhunter', name: k('Cazatalentos'), blurb: k('Sin comunes: perfiles raros o mejores, con más opciones de estrella.'), priceFlora: 600, odds: { common: 0, rare: 55, epic: 33, legendary: 12 }, epicEvery: 3, legendEvery: 20, colors: ['#fbbf24', '#92400e'] },
}, ['name', 'blurb']);
export type StaffPity = Record<StaffChestId, PityState>;
export const EMPTY_STAFF_PITY: StaffPity = { recruit: { sinceEpic: 0, sinceLegend: 0 }, headhunter: { sinceEpic: 0, sinceLegend: 0 } };

export function rollStaff(chest: StaffChestDef, pity: PityState, seedForId: number, now: number, rng: () => number = Math.random): { staff: StaffNft; pity: PityState } {
  const rarity = rollRarity(chest, pity, rng);
  const role = STAFF_ROLES[Math.floor(rng() * STAFF_ROLES.length)];
  const seed = Math.floor(rng() * 2 ** 31);
  const epicPlus = rarity === 'epic' || rarity === 'legendary';
  return {
    staff: makeStaff(`staff-c${seedForId}`, role, rarity, seed, now),
    pity: { sinceEpic: epicPlus ? 0 : pity.sinceEpic + 1, sinceLegend: rarity === 'legendary' ? 0 : pity.sinceLegend + 1 },
  };
}
