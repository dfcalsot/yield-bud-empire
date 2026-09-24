/**
 * The game core: one pure entry point the server runs for every request, and the browser runs on a copy to show the result at once.
 *   advance(state, ctx)                 → the world moved to ctx.now (what a state read does)
 *   applyAction(state, type, params, ctx) → the world moved, then the action applied (or a GameError: nothing changes)
 */
import { ACTIONS, PUBLIC, SERVER_ONLY } from './actions';
import { tick, reconcileProducts } from './tick';
import type { Ctx, Effect } from './ctx';
import type { GameState } from './state';

export * from './ctx';
export * from './state';
export { deriveEnv, fitRoom, reconcileProducts } from './tick';
export { PUBLIC, SERVER_ONLY };
export { packGame, unpackGame, type PackedGame } from './pack';

/** a private copy to work on (structuredClone is ~3× faster; JSON is the fallback for anything it can't copy) */
const clone = <T>(v: T): T => { try { return structuredClone(v); } catch { return JSON.parse(JSON.stringify(v)) as T; } };

export interface Advanced { state: GameState; fx: Effect[] }
export interface Applied extends Advanced { result: unknown; tickFx: Effect[] }

/** move the world to ctx.now; `quiet` = the browser's display tick (no notices, nothing that needs the server) */
export function advance(state: GameState, ctx: Ctx, opts: { quiet?: boolean; extraSeconds?: number } = {}): Advanced {
  const r = { s: clone(state), ctx, fx: [] as Effect[] };
  tick(r, opts);
  if (!opts.quiet) reconcileProducts(r.s, ctx.ext().inventory.products, ctx.now);
  return { state: r.s, fx: r.fx };
}

export function applyAction(state: GameState, type: string, params: Record<string, unknown> | undefined, ctx: Ctx, opts: { quiet?: boolean } = {}): Applied {
  const fn = PUBLIC.has(type) ? ACTIONS[type] : undefined;
  if (!fn) throw Object.assign(new Error('unknown_action'), { code: 'unknown_action' });
  const r = { s: clone(state), ctx, fx: [] as Effect[] };
  tick(r, opts);
  const tickFx = r.fx;
  r.fx = [];
  const result = fn(r, params && typeof params === 'object' ? params : {});
  if (!opts.quiet) reconcileProducts(r.s, ctx.ext().inventory.products, ctx.now);
  return { state: r.s, result: result === undefined ? null : result, fx: r.fx, tickFx };
}
