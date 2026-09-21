import type { StaffNft, StaffPity, StaffRole } from '../sim/staff';
import type { Construction } from '../sim/facilities';
import type { Depth } from '../sim/economy';
import type { PityMap } from '../sim/avatars';

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
  imported: boolean; minted: number; burned: number;
}
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

/** the one-time import of a local save (the server caps and validates it) */
export async function importLocal(body: Record<string, unknown>): Promise<Snapshot | null> {
  const r = await post('/api/econ/import-local', body);
  if (!r || !r.ok) return null;
  return ((await r.json()) as { snapshot: Snapshot }).snapshot;
}

/** short Spanish text for the reasons an intent can be refused */
export const REASON: Record<string, string> = {
  insufficient: 'Saldo insuficiente', too_early: 'Todavía no puedes reclamar', build_in_progress: 'Ya hay una obra en marcha', skip_rung: 'No se salta ningún escalón', already_built: 'Esa instalación ya la tienes',
  speedup_limit: 'Ya usaste las aceleraciones de hoy', not_on_board: 'Ese candidato ya no está en la bolsa', already_hired: 'Ese candidato ya es tuyo', roster_full: 'Tu plantilla está llena',
  not_yours: 'Eso no es tuyo', wrong_role: 'Ese personaje no sirve para ese puesto', plot_taken: 'Esa tierra ya tiene dueño', too_many_lands: 'Ya tienes el máximo de tierras',
  max_rank: 'Ya está en el rango máximo', already_claimed: 'Ya lo reclamaste', too_fast: 'Ese nivel aún no se puede cobrar', offline: 'Sin conexión con el servidor', rate_limited: 'Demasiado rápido, espera un momento',
};
