/**
 * The shared plumbing of every action: the effects list (toasts, sounds, confetti), XP and levels, quests, mission events, burns,
 * consumables and lab stations. Ported from the old GameContext so the game behaves the same; now it runs on the server.
 */
import type { PlantInGrow, SolanaTransaction, Strain, GrowStage } from '../types';
import { CATALOG_BY_ID, USE, ownsStation, spendResource, stockOf, type ResourceKind } from '../economy/catalog';
import { bump, type MissionEvent } from '../sim/missions';
import { ACTIVITY, addActivity, normalizeActivity } from '../sim/relics';
import { ECON } from '../sim/economy';
import { INITIAL_QUESTS } from '../data/initialData';
import { t as tr } from '../i18n/core';
import { GameError, type Ctx, type Effect, type Sfx, type ToastKind } from './ctx';
import { CAPS, XP_NEEDED, rankTitleOf, seedBankOf, type GameState } from './state';

/** `late`: notices shown after everything else the action says (so a chest earned isn't hidden by the action's own toast) */
export interface Run { s: GameState; ctx: Ctx; fx: Effect[]; late?: Effect[] }

export const say = (r: Run, m: string, k: ToastKind = 'info') => { r.fx.push({ t: 'toast', m, k }); };
export const sfx = (r: Run, s: Sfx) => { r.fx.push({ t: 'sfx', s }); };
export const boom = (r: Run, o: Record<string, unknown>) => { r.fx.push({ t: 'confetti', o }); };
/** refuse the action: nothing changes and the player reads why */
export const no = (text: string, kind: ToastKind = 'info', code = 'refused'): never => { throw new GameError(code, text, kind); };

/* ── params ── */
export const P = {
  num(v: unknown, lo: number, hi: number): number { const n = Number(v); if (!Number.isFinite(n) || n < lo || n > hi) throw new GameError('bad_params'); return n; },
  int(v: unknown, lo: number, hi: number): number { return Math.floor(P.num(v, lo, hi)); },
  str(v: unknown, max = 80): string { if (typeof v !== 'string' || !v.length || v.length > max) throw new GameError('bad_params'); return v; },
  opt(v: unknown, max = 80): string { return typeof v === 'string' ? v.slice(0, max) : ''; },
  oneOf<T extends string>(v: unknown, list: readonly T[]): T { if (!list.includes(v as T)) throw new GameError('bad_params'); return v as T; },
};

/** the selected plant of the room (the index is a UI choice; anything out of range picks the first) */
export function plantAt(r: Run, idx: unknown): { p: PlantInGrow; i: number } {
  const list = r.s.indoorPlants;
  if (!list.length) no(tr('Siembra una planta para aplicarle la solución'));
  const n = Math.floor(Number(idx));
  const i = Number.isFinite(n) && n >= 0 && n < list.length ? n : 0;
  return { p: list[i], i };
}

/** a plant starting again from germination (after a harvest or when a male is pulled) */
export const reborn = (p: PlantInGrow, now: number): PlantInGrow => ({
  ...p, stage: 'seed' as GrowStage, progressPercent: 0, health: 98, soilMoisture: 80, plantedAt: now, sim: undefined,
  trichomeMaturity: { clear: 100, milky: 0, amber: 0 }, sex: 'female', pollinated: false, pest: undefined,
});

/* ── progress ── */
export function addXp(r: Run, amount: number, _reason?: string) {
  const s = r.s;
  s.playerXp += Math.max(0, Math.round(amount));
  let guard = 0;
  while (s.playerXp >= XP_NEEDED(s.playerLevel) && guard++ < 20) {
    s.playerXp -= XP_NEEDED(s.playerLevel);
    s.playerLevel += 1;
    r.ctx.payLevels(s.playerLevel);
    sfx(r, 'levelup');
    boom(r, { particleCount: 130, spread: 90, origin: { y: 0.4 }, colors: ['#10b981', '#fbbf24', '#a855f7', '#38bdf8'] });
    say(r, tr('¡SUBISTE DE NIVEL! Rango: {v0} (Nivel {nextLvl}) • Bono +{levelBonus} $FLORA', { v0: rankTitleOf(s.playerLevel), nextLvl: s.playerLevel, levelBonus: ECON.levelBonus }), 'success');
  }
}

export function questProgress(r: Run, id: string, inc = 1) {
  const def = INITIAL_QUESTS.find((q) => q.id === id);
  if (!def) return;
  let q = r.s.quests.find((x) => x.id === id);
  if (!q) { q = { id, currentCount: 0, isCompleted: false, isClaimed: false }; r.s.quests.push(q); }
  if (q.isCompleted) return;
  q.currentCount = Math.min(def.targetCount, q.currentCount + inc);
  if (q.currentCount >= def.targetCount) {
    q.isCompleted = true;
    say(r, tr('¡Misión lograda: "{title}"! Reclama tu recompensa en la barra de misiones', { title: tr(def.title) }), 'success');
  }
}

export function event(r: Run, ev: MissionEvent, n = 1) {
  if (!(n > 0)) return;
  r.s.missions = bump(r.s.missions, ev, n, r.ctx.now);
  // the week's activity toward the relic chests (only accounts old enough and with some empire rank earn them)
  const ext = r.ctx.ext();
  const eligible = (ext.empire?.rank ?? 1) >= ACTIVITY.minEmpireRank && r.ctx.now - (ext.createdAt ?? r.ctx.now) >= ACTIVITY.minAgeDays * 86400_000;
  const { activity, newChests } = addActivity(r.s.activity ?? normalizeActivity(null, r.ctx.now), ev, n, r.ctx.now, eligible);
  r.s.activity = activity;
  if (newChests > 0) (r.late ??= []).push({ t: 'sfx', s: 'quest' }, { t: 'toast', m: tr('🎁 ¡Ganaste un cofre de actividad! Ábrelo en el Maletín → Reliquias.'), k: 'success' });
}

/** a key granted at most once every `hours` (0 = once ever); returns whether it was granted now */
export function once(r: Run, key: string, hours = 0): boolean {
  const at = r.s.once[key];
  if (at !== undefined && (hours <= 0 || r.ctx.now - at < hours * 3600_000)) return false;
  r.s.once[key] = r.ctx.now;
  const keys = Object.keys(r.s.once);
  if (keys.length > 400) for (const k of keys.sort((a, b) => r.s.once[a] - r.s.once[b]).slice(0, keys.length - 400)) delete r.s.once[k];
  return true;
}
/** hours left before `key` can be granted again */
export const onceLeftHours = (r: Run, key: string, hours: number): number => Math.max(0, hours - (r.ctx.now - (r.s.once[key] ?? -Infinity)) / 3600_000);

/* ── money shown in the wallet history ── */
const SIG_CHARS = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export const fakeSig = (r: Run, n = 88) => Array.from({ length: n }, () => SIG_CHARS[Math.floor(r.ctx.rng() * SIG_CHARS.length)]).join('');

export function pushTx(r: Run, tx: Omit<SolanaTransaction, 'id' | 'signature' | 'timestamp' | 'status' | 'blockSlot'>) {
  r.s.transactions.unshift({ id: r.ctx.uid('tx'), signature: fakeSig(r), timestamp: r.ctx.now, status: 'confirmed', blockSlot: 248920000 + Math.floor(r.ctx.rng() * 5000), ...tx });
  r.s.transactions = r.s.transactions.slice(0, CAPS.transactions);
}

/** a $FLORA burn: charged to the wallet (unless the economy intent already did) and written in the history */
export function burn(r: Run, type: SolanaTransaction['type'], amount: number, memo: string, charge = true) {
  amount = Math.round(amount);
  if (amount <= 0) return;
  if (charge) r.ctx.debit(amount, type.toLowerCase(), memo);
  pushTx(r, { type, amountFlora: amount, memo });
  r.s.totalFloraBurned += amount;
  const b = r.s.burnStats;
  if (type === 'BURN_SPEEDUP') b.speedUp += amount;
  else if (type === 'BURN_REPAIR' || type === 'BURN_PROCESS' || type === 'BURN_PURCHASE') b.repairs += amount;
  else if (type === 'BURN_PATENT') b.patents += amount;
  else if (type === 'V2P_CLAIM') b.v2p += amount;
  sfx(r, 'burn');
}

/** pay with the game's SOL (the simulated wallet balance) */
export function paySol(r: Run, amount: number, type: SolanaTransaction['type'], memo: string) {
  if (r.s.solBalance + 1e-9 < amount) no(tr('Saldo insuficiente: Requiere {priceSol} SOL', { priceSol: amount }));
  r.s.solBalance = Number(Math.max(0, r.s.solBalance - amount).toFixed(3));
  pushTx(r, { type, amountFlora: 0, amountSol: amount, memo });
}

export const needFlora = (r: Run, amount: number, text: string) => { if (r.ctx.ext().flora < amount) no(text); };

/* ── consumables and stations ── */
export function takeResource(r: Run, kind: Extract<ResourceKind, 'water' | 'nutrient'>, amount: number) {
  const next = spendResource(r.s.assets, kind, amount);
  if (!next) {
    no(kind === 'water'
      ? tr('Sin agua suficiente ({v0} L necesarios, quedan {v1} L). Compra agua en el Grow Market.', { v0: amount.toFixed(1), v1: stockOf(r.s.assets, 'water').toFixed(1) })
      : tr('Sin nutrientes suficientes ({amount} ml necesarios, quedan {v1} ml). Compra fertilizante en el Grow Market.', { amount, v1: Math.floor(stockOf(r.s.assets, 'nutrient')) }), 'burn');
  }
  r.s.assets = next!;
}

/** a lab cycle needs the station's licence NFT and draws its electricity from the stock */
export function takeStation(r: Run, stationId: string | undefined) {
  if (!stationId) return;
  if (!ownsStation(r.s.assets, stationId)) no(tr('Esta estación necesita su licencia NFT. Cómprala en el Grow Market → Licencias de laboratorio.'));
  const kwh = USE.labKwhPerCycle[stationId] ?? 0;
  if (kwh > 0) {
    if (stockOf(r.s.assets, 'energy') + 1e-9 < kwh) no(tr('Sin electricidad: el ciclo necesita {kwh} kWh y quedan {v1} kWh. Compra un Bono de Energía.', { kwh, v1: stockOf(r.s.assets, 'energy').toFixed(1) }), 'burn');
    r.s.assets = spendResource(r.s.assets, 'energy', kwh) ?? r.s.assets;
  }
}

/** seeds of a strain go to the inventory (pollinated females give seeds at harvest) */
export function giveSeeds(r: Run, strain: Strain, n: number): number {
  const item = seedBankOf(r.s).find((x) => x.strainTemplate.id === strain.id);
  if (!item || n <= 0) return 0;
  const have = r.s.seedInventory[item.id] ?? 0;
  const add = Math.max(0, Math.min(n, CAPS.seedsPerKind - have));
  if (add > 0) r.s.seedInventory[item.id] = have + add;
  return add;
}

export const catalogName = (id: string) => CATALOG_BY_ID[id]?.name ?? id;
