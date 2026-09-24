/**
 * The browser's side of the core: talk to the server (it decides) and predict an action on a copy of the last answer (so the
 * screen changes at once). A prediction is never saved anywhere; the server's answer replaces it a moment later.
 */
import type { Snapshot } from '../economy/ledger';
import { reasonText } from '../economy/ledger';
import { modifiersOf, isActive, STAFF_ROLES, NO_MODS, type StaffNft } from '../sim/staff';
import { saleRevenue, burnRateOfSale, ECON } from '../sim/economy';
import { priceOf, productKey, PROCESS_YIELD } from '../sim/products';
import { craftTotals, FORGE_RECIPE_BY_ID, FIBRE_PER_FLOWER_GRAM } from '../sim/forge';
import { GROW_SPEEDUP } from '../sim/harvestCap';
import { getLang } from '../i18n/core';
import { GameError, NeedsServer, type Ctx, type Effect, type Ext, type ToastKind } from './ctx';
import { facilityOfTier, type GameState } from './state';

export interface GameAnswer { serverNow: number; state: GameState; snapshot: Snapshot; fx?: Effect[]; tickFx?: Effect[]; ok?: boolean; result?: unknown }
export type ActionAnswer = ({ ok: true } & GameAnswer) | { ok: false; error: string; text?: string; kind?: ToastKind; status: number };

const lang = () => getLang();

/** the account's game (null: no session / server down) */
export async function fetchGame(): Promise<GameAnswer | { error: string; status: number }> {
  try {
    const r = await fetch(`/api/game/state?lang=${lang()}`, { credentials: 'same-origin' });
    if (!r.ok) return { error: (await r.json().catch(() => ({})) as { error?: string }).error ?? 'error', status: r.status };
    return (await r.json()) as GameAnswer;
  } catch { return { error: 'offline', status: 0 }; }
}

async function post(path: string, body: unknown): Promise<ActionAnswer> {
  try {
    const r = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-cf-csrf': '1' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({})) as Record<string, unknown>;
    if (!r.ok) return { ok: false, error: String(j.error ?? 'error'), text: typeof j.text === 'string' ? j.text : undefined, kind: j.kind as ToastKind | undefined, status: r.status };
    return { ...(j as unknown as GameAnswer), ok: true };
  } catch { return { ok: false, error: 'offline', status: 0 }; }
}
export const postAction = (type: string, params: Record<string, unknown>, idem: string) => post('/api/game/action', { type, params, idem, lang: lang() });
export const postProfile = (updates: Record<string, unknown>) => post('/api/game/profile', { updates, lang: lang() });

export const newIdem = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

/** what a refusal says to the player */
export const refusalText = (a: { error: string; text?: string }) => a.text ?? reasonText(a.error) ?? a.error;

/** the staff bonuses of the hires assigned and paid, from the economy snapshot */
export function modsOf(snap: Snapshot, now: number) {
  const working = STAFF_ROLES.map((r) => snap.staff.find((x) => x.id === snap.staffAssign[r])).filter((x): x is StaffNft => !!x && isActive(x, now));
  return working.length ? modifiersOf(working) : NO_MODS;
}

export function extOfSnapshot(snap: Snapshot, now: number): Ext {
  return {
    flora: snap.flora, tier: snap.tier, facility: facilityOfTier(snap.tier), mods: modsOf(snap, now), plots: snap.plots,
    avatars: snap.avatars.map((a) => a.designId),
    inventory: snap.inventory ?? { flower: 0, trim: 0, materials: {}, products: {} },
    forgeJobs: snap.forgeJobs ?? [],
  };
}

/**
 * A context that predicts on `snap` (mutated in place: the caller passes its own copy). It models the few economy moves an action
 * makes that the browser can guess (spend, harvest, a lab batch, a forge start, a sale); anything else needs the server.
 */
export function predictCtx(snap: Snapshot, now: number, idem: string): Ctx {
  let n = 0;
  const inv = () => (snap.inventory ??= { flower: 0, trim: 0, materials: {}, products: {} });
  const r2 = (x: number) => Math.round(x * 100) / 100;
  const add = (item: string, d: number) => {
    const i = inv();
    if (item === 'flower' || item === 'trim') {
      if (i[item] + d < -0.005) throw new GameError('insufficient_stock', reasonText('insufficient_stock'));
      i[item] = Math.max(0, r2(i[item] + d));
    } else if (item.startsWith('mat:')) {
      const k = item.slice(4); const next = (i.materials[k] ?? 0) + d;
      if (next < -0.005) throw new GameError('insufficient_stock', reasonText('insufficient_stock'));
      i.materials = { ...i.materials, [k]: Math.max(0, Math.round(next)) };
    } else if (item.startsWith('prod:')) {
      const k = item.slice(5); const next = (i.products[k] ?? 0) + d;
      if (next < -0.005) throw new GameError('insufficient_stock', reasonText('insufficient_stock'));
      i.products = { ...i.products, [k]: Math.max(0, r2(next)) };
    }
  };
  const debit = (amount: number) => {
    amount = Math.round(amount);
    if (amount <= 0) return;
    if (snap.flora < amount) throw new GameError('insufficient', reasonText('insufficient'));
    snap.flora -= amount;
  };
  const ctx: Ctx = {
    now, rng: Math.random,
    uid: (prefix) => `${prefix}-${idem}-${n++}`,
    ext: () => extOfSnapshot(snap, now),
    debit: (amount) => debit(amount),
    credit: (amount) => { snap.flora += Math.max(0, Math.round(amount)); },
    payLevels: () => 0,
    econ: <T,>(type: string, p: Record<string, unknown> = {}): T => {
      switch (type) {
        case 'harvest': {
          const flower = Number(p.flower) || 0, trim = Number(p.trim) || 0;
          const allow = snap.harvest ? snap.harvest.allowance : Infinity;
          const f = r2(Math.min(flower, allow)), tr = r2(Math.min(trim, f * 0.45 + 0.5));
          add('flower', f); add('trim', tr); add('mat:fibra_cruda', Math.round(f * FIBRE_PER_FLOWER_GRAM));
          if (snap.harvest) snap.harvest = { ...snap.harvest, allowance: Math.max(0, snap.harvest.allowance - f) };
          return { flower: f, trim: tr, clipped: f < flower - 0.01 } as T;
        }
        case 'grow_speedup': debit(p.scope === 'room' ? GROW_SPEEDUP.roomFlora : GROW_SPEEDUP.plantFlora); return {} as T;
        case 'process': {
          const key = String(p.product); const y = PROCESS_YIELD[key];
          if (!y) throw new NeedsServer();
          add(y.input, -Number(p.grams)); add(`prod:${key}`, Number(p.out));
          return {} as T;
        }
        case 'consume': for (const [item, g] of Object.entries((p.items ?? {}) as Record<string, number>)) add(item, -g); return {} as T;
        case 'forge_start': {
          const rec = FORGE_RECIPE_BY_ID[String(p.recipe)]; if (!rec) throw new NeedsServer();
          const t = craftTotals(rec, Number(p.qty));
          debit(t.fee); add('flower', -t.flower); add('trim', -t.trim);
          for (const [m, g] of Object.entries(t.materials)) add(`mat:${m}`, -(g as number));
          snap.forgeJobs = [...(snap.forgeJobs ?? []), { id: `fj-${idem}`, recipeId: rec.id, qty: Number(p.qty), startedAt: now, endsAt: now + t.minutes * 60_000 }];
          return {} as T;
        }
        case 'sell': {
          const type2 = String(p.type), recipe = p.recipe as string | undefined, grams = Number(p.grams);
          const base = priceOf(type2, recipe); if (!base) throw new NeedsServer();
          add(`prod:${productKey(type2, recipe)}`, -grams);
          const price = base * ECON.priceScale;
          const sale = saleRevenue(price, grams, snap.depth, now);
          const gross = Math.round(sale.revenue * (1 + modsOf(snap, now).sellBonus));
          const fee = Math.max(1, Math.round(gross * burnRateOfSale(snap.tier)));
          snap.depth = sale.depth; snap.flora += gross - fee;
          return { gross, fee, net: gross - fee, ratio: sale.revenue / Math.max(1e-9, price * grams) } as T;
        }
        default: throw new NeedsServer();
      }
    },
  };
  return ctx;
}
