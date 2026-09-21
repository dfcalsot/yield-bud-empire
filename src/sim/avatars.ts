/**
 * Profile avatars as collectible NFTs: seasonal designs, minted by opening chests. Pure module (no React): the season of a
 * date, the design catalogue, the chest odds and the roll with its "pity" guarantee.
 */

export type AvatarRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type SeasonId = 'primavera' | 'verano' | 'otono' | 'invierno' | 'classic';
export type Motif = 'leaf' | 'bud' | 'sun' | 'moon' | 'snow' | 'flower' | 'drop' | 'crown' | 'flask' | 'pumpkin' | 'seed' | 'planet' | 'dna' | 'jar' | 'lantern' | 'bee';

export interface Season {
  id: SeasonId;
  name: string;
  emoji: string;
  tagline: string;
  colors: [string, string];
}

export const SEASONS: Record<SeasonId, Season> = {
  primavera: { id: 'primavera', name: 'Primavera · Floración Rosa', emoji: '🌸', tagline: 'Brotes, rocío y cerezos: el jardín despierta.', colors: ['#f472b6', '#86efac'] },
  verano: { id: 'verano', name: 'Verano · Sol de Plata', emoji: '☀️', tagline: 'Luz a raudales, farolillos de playa y frascos dorados.', colors: ['#fbbf24', '#fb923c'] },
  otono: { id: 'otono', name: 'Otoño · Cosecha Dorada', emoji: '🍂', tagline: 'Calabazas chrono, hojas ámbar y lunas de cosecha.', colors: ['#f97316', '#a16207'] },
  invierno: { id: 'invierno', name: 'Invierno · Escarcha Neón', emoji: '❄️', tagline: 'Copos de neón, hielo cristalino y auroras boreales.', colors: ['#7dd3fc', '#c4b5fd'] },
  classic: { id: 'classic', name: 'Clásicos de Yield', emoji: '🧬', tagline: 'Diseños atemporales: salen de cualquier cofre.', colors: ['#34d399', '#a78bfa'] },
};

/** Season by calendar month (Dec–Feb winter, Mar–May spring, Jun–Aug summer, Sep–Nov autumn). */
export function seasonOf(date: Date): SeasonId {
  const m = date.getMonth(); // 0-11
  if (m === 11 || m <= 1) return 'invierno';
  if (m <= 4) return 'primavera';
  if (m <= 7) return 'verano';
  return 'otono';
}

/** Days until the season changes. */
export function daysLeftInSeason(date: Date): number {
  const start = seasonOf(date);
  let d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  for (let i = 1; i <= 100; i++) {
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    if (seasonOf(d) !== start) return i;
  }
  return 90;
}

export interface AvatarDesign {
  id: string;
  season: SeasonId;
  name: string;
  rarity: AvatarRarity;
  motif: Motif;
  colors: [string, string];
}

type Row = [string, Motif, AvatarRarity];
const TABLE: Record<SeasonId, Row[]> = {
  primavera: [['Brote Tierno', 'seed', 'common'], ['Gota de Rocío', 'drop', 'common'], ['Abeja Curiosa', 'bee', 'common'], ['Flor de Cerezo', 'flower', 'rare'], ['Hoja Fresca', 'leaf', 'rare'], ['Cogollo Rosa', 'bud', 'epic'], ['Luna de Mayo', 'moon', 'epic'], ['Reina de la Floración', 'crown', 'legendary']],
  verano: [['Rayo de Sol', 'sun', 'common'], ['Gota Fresca', 'drop', 'common'], ['Farol de Playa', 'lantern', 'common'], ['Hoja Tropical', 'leaf', 'rare'], ['Frasco de Verano', 'jar', 'rare'], ['Cogollo Dorado', 'bud', 'epic'], ['Planeta Ardiente', 'planet', 'epic'], ['Rey del Sol', 'crown', 'legendary']],
  otono: [['Semilla de Cosecha', 'seed', 'common'], ['Calabaza Yield', 'pumpkin', 'common'], ['Farol de Otoño', 'lantern', 'common'], ['Hoja Ámbar', 'leaf', 'rare'], ['Matraz de Sidra', 'flask', 'rare'], ['Cogollo Cobrizo', 'bud', 'epic'], ['Luna de Cosecha', 'moon', 'epic'], ['Rey Cosechador', 'crown', 'legendary']],
  invierno: [['Copo Neón', 'snow', 'common'], ['Gota Helada', 'drop', 'common'], ['Farol de Escarcha', 'lantern', 'common'], ['Hoja de Hielo', 'leaf', 'rare'], ['Frasco de Nieve', 'jar', 'rare'], ['Cogollo Cristal', 'bud', 'epic'], ['Luna Boreal', 'moon', 'epic'], ['Reina de la Escarcha', 'crown', 'legendary']],
  classic: [['Botánico Original', 'leaf', 'common'], ['Guardián de ADN', 'dna', 'rare'], ['Alquimista', 'flask', 'epic'], ['Yield Fundador', 'planet', 'legendary']],
};

export const DESIGNS: AvatarDesign[] = (Object.keys(TABLE) as SeasonId[]).flatMap((season) =>
  TABLE[season].map(([name, motif, rarity], i) => ({ id: `${season}-${i + 1}`, season, name, motif, rarity, colors: SEASONS[season].colors }))
);
export const DESIGN_BY_ID: Record<string, AvatarDesign> = Object.fromEntries(DESIGNS.map((d) => [d.id, d]));

export const RARITIES: AvatarRarity[] = ['common', 'rare', 'epic', 'legendary'];

/* ───────────────────────────── chests ───────────────────────────── */

export type ChestId = 'season' | 'premium';
export interface ChestDef {
  id: ChestId;
  name: string;
  blurb: string;
  priceFlora: number;
  priceSol: number;
  odds: Record<AvatarRarity, number>;   // percentages, sum 100
  epicEvery: number;                     // guaranteed epic or better within this many opens
  legendEvery: number;                   // guaranteed legendary within this many opens
  colors: [string, string];
}

export const CHESTS: Record<ChestId, ChestDef> = {
  season: { id: 'season', name: 'Cofre de Temporada', blurb: 'Diseños de la temporada actual y algún clásico.', priceFlora: 90, priceSol: 0.09, odds: { common: 60, rare: 28, epic: 10, legendary: 2 }, epicEvery: 8, legendEvery: 40, colors: ['#22c55e', '#166534'] },
  premium: { id: 'premium', name: 'Cofre Premium', blurb: 'Sin comunes: raros o mejores, con más legendarios.', priceFlora: 260, priceSol: 0.26, odds: { common: 0, rare: 55, epic: 33, legendary: 12 }, epicEvery: 1, legendEvery: 12, colors: ['#fbbf24', '#92400e'] },
};

export interface PityState { sinceEpic: number; sinceLegend: number }
export type PityMap = Record<ChestId, PityState>;
export const EMPTY_PITY: PityMap = { season: { sinceEpic: 0, sinceLegend: 0 }, premium: { sinceEpic: 0, sinceLegend: 0 } };

/** Which rarity comes out (odds + pity). `rng` returns [0,1). */
export function rollRarity(chest: ChestDef, pity: PityState, rng: () => number): AvatarRarity {
  if (pity.sinceLegend + 1 >= chest.legendEvery) return 'legendary';
  if (pity.sinceEpic + 1 >= chest.epicEvery) {
    const e = chest.odds.epic, l = chest.odds.legendary;
    return rng() * (e + l) < l ? 'legendary' : 'epic';
  }
  let r = rng() * 100;
  for (const rar of RARITIES) { r -= chest.odds[rar]; if (r < 0) return rar; }
  return 'common';
}

export interface RollResult { design: AvatarDesign; pity: PityState }

/** Open a chest: pick the rarity, then a design of that rarity from the current season (classics count half). */
export function rollChest(chest: ChestDef, pity: PityState, season: SeasonId, rng: () => number = Math.random): RollResult {
  const rarity = rollRarity(chest, pity, rng);
  const pool = DESIGNS.filter((d) => d.rarity === rarity && (d.season === season || d.season === 'classic'));
  const weights = pool.map((d) => (d.season === 'classic' ? 0.5 : 1));
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  let design = pool[pool.length - 1];
  for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r < 0) { design = pool[i]; break; } }
  const epicPlus = rarity === 'epic' || rarity === 'legendary';
  return { design, pity: { sinceEpic: epicPlus ? 0 : pity.sinceEpic + 1, sinceLegend: rarity === 'legendary' ? 0 : pity.sinceLegend + 1 } };
}

/** $FLORA given back when the avatar is a duplicate. */
export const DUPLICATE_REFUND: Record<AvatarRarity, number> = { common: 15, rare: 35, epic: 80, legendary: 200 };

export interface OwnedAvatar {
  designId: string;
  count: number;
  firstAt: number;
  /** simulated mint address (Devnet) */
  mint: string;
  serial: number;
}

/** Nickname rules: 3–20 characters, letters (with accents), digits, spaces and . _ - */
export const NICK_RE = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{1,18}[\p{L}\p{N}]$/u;
export const validNick = (s: string) => NICK_RE.test(s.trim());
