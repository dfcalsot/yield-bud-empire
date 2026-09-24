/**
 * What the game core needs from outside: the clock, the dice and the economy (wallet, facility, staff, land NFTs, warehouse).
 * On the server (server/game.mjs) these are the real tables, inside the same transaction as the action. In the browser the same
 * core runs on a copy to show the result at once (prediction); the server's answer always replaces it.
 */
import type { GrowFacility } from '../types';
import type { Mods } from '../sim/staff';
import type { ServerPlot } from '../economy/ledger';
import type { EmpireView } from '../sim/empire';

export interface Inventory { flower: number; trim: number; materials: Record<string, number>; products: Record<string, number> }
export interface ForgeJobView { id: string; recipeId: string; qty: number; startedAt: number; endsAt: number }

/** the economy's side of the account, read when an action needs it */
export interface Ext {
  flora: number;
  tier: number;
  facility: GrowFacility;
  mods: Mods;
  /** land NFTs the account can use (not listed on the market) */
  plots: ServerPlot[];
  /** avatar designs the account owns */
  avatars: string[];
  inventory: Inventory;
  forgeJobs: ForgeJobView[];
  /** empire rank and its perks (null before the server has counted them) */
  empire: EmpireView | null;
  /** a developer account (test balance): it can play, but never take anything real out with $FLORA */
  dev?: boolean;
  /** when the account started (its age gates the activity chests) */
  createdAt?: number;
}

export interface Ctx {
  now: number;
  /** server dice (crypto); never the browser's word */
  rng: () => number;
  /** ids that the prediction and the server generate alike (they derive from the action's idempotency key) */
  uid: (prefix: string) => string;
  ext: () => Ext;
  /** burn / earn $FLORA. `debit` throws GameError('insufficient') when there isn't enough */
  debit: (amount: number, kind: string, memo: string) => void;
  credit: (amount: number, kind: string, memo: string) => void;
  /** an economy intent (server/economy.mjs INTENTS), inside the same transaction; the browser can only predict a few */
  econ: <T = Record<string, unknown>>(type: string, params?: Record<string, unknown>) => T;
  /** the economy pays the level bonuses not paid yet, up to `level` (within its age limit); returns what it paid */
  payLevels: (level: number) => number;
}

export class GameError extends Error {
  constructor(public code: string, public text?: string, public kind: ToastKind = 'info', public extra?: Record<string, unknown>) { super(code); }
}
/** the browser cannot predict this action (it needs the server's tables): send it and wait */
export class NeedsServer extends Error { constructor() { super('needs_server'); } }

export type ToastKind = 'success' | 'burn' | 'info';
export type Sfx = 'water' | 'harvest' | 'burn' | 'click' | 'levelup' | 'quest' | 'golden';
export type Effect =
  | { t: 'toast'; m: string; k: ToastKind }
  | { t: 'sfx'; s: Sfx }
  | { t: 'confetti'; o: Record<string, unknown> };
