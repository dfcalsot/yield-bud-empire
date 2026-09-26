import type { StaffNft, StaffPity, StaffRole } from '../sim/staff';
import type { Construction } from '../sim/facilities';
import type { Depth } from '../sim/economy';
import type { PityMap } from '../sim/avatars';
import { k, t } from '../i18n/core';
import type { EmpireView } from '../sim/empire';
import type { Relic } from '../sim/relics';

/**
 * The client of the server-owned economy (server/economy.mjs). The server keeps the wallet, the ledger and the NFTs; the game keeps
 * playing locally for feel and mirrors what the server answers. When there is no account service (development without it) every
 * call returns null and the game falls back to its local economy.
 */
export interface ServerPlot { id: string; region: string; index: number; name: string; ratings: { water: number; sunlight: number; soil: number }; landRating: number; mintedAt: number }
export interface ServerAvatar { designId: string; count: number; firstAt: number; serial: number }
export interface Snapshot {
  serverNow: number; flora: number; faucetAt: number; claim: { ok: boolean; leftMs: number };
  depth: Depth; tier: number; unlocked: string[]; construction: Construction | null;
  staff: StaffNft[]; staffAssign: Partial<Record<StaffRole, string>>; staffPity: StaffPity;
  plots: ServerPlot[]; avatars: ServerAvatar[]; avatarPity: PityMap;
  offers: Record<string, { ids: string[]; left: number }>;
  imported: boolean; minted: number; burned: number; level?: number;
  /** goods the server keeps (flower/trim in grams, forge materials in units, products in grams by product key) */
  inventory?: { flower: number; trim: number; materials: Record<string, number>; products: Record<string, number> };
  invImported?: boolean;
  /** how much more flower the account can harvest right now (grams), its ceiling and how fast it refills */
  harvest?: { allowance: number; cap: number; perHour: number };
  forgeJobs?: Array<{ id: string; recipeId: string; qty: number; startedAt: number; endsAt: number }>;
  /** empire rank, its points by source and its perks (sim/empire.ts) */
  empire?: EmpireView;
  /** developer account: it plays, but nothing real can be taken out with $FLORA */
  dev?: boolean;
  /** relic NFTs held (not on sale), the ones equipped, and when the account started */
  relics?: Relic[];
  relicEquip?: string[];
  createdAt?: number;
  gifts: Array<{ id: number; amount: number; note: string; createdAt: number }>;
  listings: ListingView[]; p2p: { feeRate: number; minPrice: number; maxPrice: number; maxListings: number };
}
export type ListingKind = 'staff' | 'land' | 'avatar' | 'relic';
/** one offer on the player market: the item travels with its data, so it can be drawn as its own card */
export interface ListingView { id: number; nftId: string; kind: ListingKind; rarity: string; price: number; createdAt: number; sellerId: number; data: Record<string, unknown>; seller?: string; sellerRank?: number; sellerFounder?: number | null; mine?: boolean }
export interface MarketPage { listings: ListingView[]; more: boolean; feeRate: number; recent: Array<{ id: number; kind: ListingKind; rarity: string; price: number; at: number }> }
export type IntentResult<T = unknown> = { ok: true; result: T; snapshot: Snapshot } | { ok: false; error: string; extra?: Record<string, unknown> };

const post = async (path: string, body: unknown): Promise<Response | null> => {
  try { return await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-cf-csrf': '1' }, body: JSON.stringify(body) }); } catch { return null; }
};

/** the wallet and NFTs of the signed-in account, or null when there is no service or session (the game then plays locally) */
export async function fetchState(): Promise<Snapshot | null> {
  try {
    const r = await fetch('/api/econ/state', { credentials: 'same-origin' });
    if (!r.ok) return null;
    return ((await r.json()) as { snapshot: Snapshot }).snapshot;
  } catch { return null; }
}

/** one validated action. `idem` makes a retry safe: the server answers the first result instead of doing it twice. */
export async function intent<T = unknown>(type: string, params: Record<string, unknown> = {}, idem: string = `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`): Promise<IntentResult<T>> {
  const r = await post('/api/econ/intent', { type, params, idem });
  if (!r) return { ok: false, error: 'offline' };
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const { error, ...extra } = j as { error?: string }; return { ok: false, error: error ?? 'error', extra }; }
  return j as IntentResult<T>;
}

/** the last movements of the wallet (the server's ledger), newest first */
export async function fetchHistory(): Promise<Array<{ ts: number; kind: string; delta: number; balance: number; ref: string | null }>> {
  try {
    const r = await fetch('/api/econ/state', { credentials: 'same-origin' });
    return r.ok ? (((await r.json()) as { history?: Array<{ ts: number; kind: string; delta: number; balance: number; ref: string | null }> }).history ?? []) : [];
  } catch { return []; }
}

/** browse the player market (public offers, filtered and paged on the server) */
export async function fetchMarket(q: { kind?: string; rarity?: string; sort?: string; page?: number } = {}): Promise<MarketPage | null> {
  try {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== '' && v !== 'all') p.set(k, String(v));
    const r = await fetch(`/api/econ/market?${p}`, { credentials: 'same-origin' });
    return r.ok ? ((await r.json()) as MarketPage) : null;
  } catch { return null; }
}

/** short Spanish text for the reasons an intent can be refused */
export const REASON: Record<string, string> = {
  insufficient: k('Saldo insuficiente'), too_early: k('Todavía no puedes reclamar'), build_in_progress: k('Ya hay una obra en marcha'), skip_rung: k('No se salta ningún escalón'), already_built: k('Esa instalación ya la tienes'),
  speedup_limit: k('Ya usaste las aceleraciones de hoy'), not_on_board: k('Ese candidato ya no está en la bolsa'), already_hired: k('Ese candidato ya es tuyo'), roster_full: k('Tu plantilla está llena'),
  not_yours: k('Eso no es tuyo'), wrong_role: k('Ese personaje no sirve para ese puesto'), plot_taken: k('Esa tierra ya tiene dueño'), too_many_lands: k('Ya tienes el máximo de tierras'),
  max_rank: k('Ya está en el rango máximo'), already_claimed: k('Ya lo reclamaste'), too_fast: k('Ese nivel aún no se puede cobrar'), offline: k('Sin conexión con el servidor'), listing_gone: k('Esa oferta ya no está disponible'), own_listing: k('Esa oferta es tuya'), too_many_listings: k('Ya tienes el máximo de ofertas activas'), bad_params: k('Precio o dato no válido'), rate_limited: k('Demasiado rápido, espera un momento'),
  insufficient_stock: k('No tienes suficiente en el inventario'), forge_flower: k('Te falta flor seca para esa receta'), forge_trim: k('Te falta trim para esa receta'),
  forge_material: k('Te faltan materiales para esa receta'), forge_tier: k('Esa receta pide una instalación de más nivel'), forge_jobs: k('La forja ya tiene el máximo de trabajos en marcha'),
  forge_flora: k('Saldo insuficiente para la forja'), forge_qty: k('Cantidad no válida'),
  empire_rank: k('Esa sede pide un rango de imperio más alto'),
  avatar_bound: k('El avatar Fundador está ligado a tu cuenta: no se vende'),
  too_many_relics: k('Ya tienes el máximo de reliquias'), relic_slots: k('Ya tienes 3 reliquias equipadas'), relic_same_stat: k('Ya tienes equipada una reliquia de ese tipo'), relic_bound: k('Esa reliquia está ligada a tu cuenta: no se puede vender'),
};
/** el motivo de un rechazo del servidor, en el idioma del jugador (undefined si no hay texto para ese código) */
export const reasonText = (code: string): string | undefined => (REASON[code] ? t(REASON[code]) : undefined);

