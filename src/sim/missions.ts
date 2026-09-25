import { hash01 } from './hash';
import type { NpcKind } from '../components/npc/Npc';
import { t, k, localize } from '../i18n/core';

/**
 * NPC missions. Every character of the cast hands out a short story line (missions unlock in order) plus one daily
 * errand. Rewards are free RESOURCES — catalogue lots (water, nutrients, energy, treatments), seeds and XP — never free
 * $FLORA, so the burn/deflation story of the economy stays intact.
 *
 * Progress is an event counter: the game reports what the player does (`reportEvent`) and a mission only counts what
 * happened AFTER it unlocked (`base` snapshot), so nothing is retroactive and nothing can be claimed twice.
 * Everything here is pure; the context owns the state and grants the rewards.
 */

export type MissionEvent =
  | 'water' | 'feed' | 'plant' | 'harvest' | 'plot'      // cultivation
  | 'buy' | 'seedbuy' | 'sell'                            // trade
  | 'fertigate' | 'lab' | 'certify'                       // science
  | 'breed' | 'patent'                                    // genetics
  | 'visit' | 'planet' | 'openbag' | 'gauges';            // UI moments (used by the tutorial)

export interface MissionReward {
  /** catalogue ids granted as fresh lots (qty defaults to 1) */
  lots?: Array<{ id: string; qty?: number }>;
  /** seed bank id → seeds */
  seeds?: Record<string, number>;
  xp: number;
}

export interface MissionDef {
  id: string;
  npc: NpcKind;
  title: string;
  /** what the character says when handing it over / when it is ready */
  ask: string;
  /** what the character says when you claim it */
  thanks: string;
  event: MissionEvent;
  goal: number;
  reward: MissionReward;
}

/* ───────────────────────────── story lines (ordered per NPC) ───────────────────────────── */

export const STORY: MissionDef[] = localize<MissionDef[]>([
  // Flor · Grow Shop
  { id: 'flora_1', npc: 'merchant', title: k('Primera compra'), event: 'buy', goal: 1, reward: { lots: [{ id: 'water_50' }], xp: 30 },
    ask: k('Mire, jefe, un cultivador que no compra no crece. Llévese cualquier cosa de la tienda y le regalo agua.'), thanks: k('¡Trato hecho! Agua limpia de la casa.') },
  { id: 'flora_2', npc: 'merchant', title: k('Cliente de confianza'), event: 'buy', goal: 3, reward: { lots: [{ id: 'nut_biobizz' }], xp: 50 },
    ask: k('Tres compras más y le doy un fertilizante de cortesía. Los clientes fieles se cuidan.'), thanks: k('Para usted, con cariño: nutrientes TerraViva.') },
  { id: 'flora_3', npc: 'merchant', title: k('Mayorista'), event: 'buy', goal: 6, reward: { lots: [{ id: 'energy_20' }, { id: 'pest_neem' }], xp: 90 },
    ask: k('Seis compras y ya es mayorista. Le tengo un bono de energía y neem para las plagas.'), thanks: k('¡Mayorista oficial! Que no le falte luz ni le sobren bichos.') },

  // Tomás · Cultivador
  { id: 'tomas_1', npc: 'farmer', title: k('Manos a la tierra'), event: 'water', goal: 3, reward: { lots: [{ id: 'water_50' }], xp: 30 },
    ask: k('Una planta sedienta es una planta triste. Riegue tres veces y le paso agua de mi pozo.'), thanks: k('¡Así se hace! Aquí tiene su agua.') },
  { id: 'tomas_2', npc: 'farmer', title: k('A sembrar'), event: 'plant', goal: 2, reward: { seeds: { seed_gelato_auto: 1 }, xp: 50 },
    ask: k('Siembre dos semillas, donde quiera, y le regalo una Gelato Auto de mi reserva.'), thanks: k('Una Gelato Auto pa\' usted. Cuídela bien.') },
  { id: 'tomas_3', npc: 'farmer', title: k('Dueño de tierra'), event: 'plot', goal: 1, reward: { lots: [{ id: 'pest_neem' }, { id: 'water_200' }], xp: 120 },
    ask: k('Un agricultor de verdad tiene su terreno. Compre una parcela en el Planeta y le ayudo con el arranque.'), thanks: k('¡Ya tiene tierra propia! Agua y neem, que arranca la faena.') },
  { id: 'tomas_4', npc: 'farmer', title: k('Primera cosecha'), event: 'harvest', goal: 1, reward: { seeds: { seed_chrono_og: 2 }, xp: 100 },
    ask: k('Ahora lo más lindo: coseche una planta. Se lo ha ganado.'), thanks: k('¡Esa sí es cosecha! Dos semillas Yield OG de premio.') },

  // Dra. Lucía · Científica
  { id: 'lucia_1', npc: 'scientist', title: k('Receta a medida'), event: 'fertigate', goal: 1, reward: { lots: [{ id: 'nut_biobizz' }], xp: 40 },
    ask: k('Prepare una solución en el laboratorio de Nutrición y aplíquela a una planta. Le repongo los reactivos.'), thanks: k('Química bien aplicada. Reactivos repuestos.') },
  { id: 'lucia_2', npc: 'scientist', title: k('Planta Industrial'), event: 'lab', goal: 2, reward: { lots: [{ id: 'energy_20' }], xp: 70 },
    ask: k('Corra dos procesos en la Planta Industrial. Las máquinas comen kWh, le devuelvo parte.'), thanks: k('Dos ciclos limpios. Aquí van unos kWh.') },
  { id: 'lucia_3', npc: 'scientist', title: k('Sello de calidad'), event: 'certify', goal: 1, reward: { lots: [{ id: 'pest_shield' }, { id: 'energy_20' }], xp: 120 },
    ask: k('Un producto sin certificado de laboratorio no vale lo que debería. Certifique uno.'), thanks: k('Certificado y todo. Bio-Shield y energía para la siguiente.') },

  // Prof. Rafa · Genetista
  { id: 'rafa_1', npc: 'geneticist', title: k('Genética nueva'), event: 'seedbuy', goal: 1, reward: { seeds: { seed_super_silver_haze: 1 }, xp: 40 },
    ask: k('Compre una semilla del banco. Diversificar es la primera regla de un genetista.'), thanks: k('Y de mi colección, una Super Silver Haze.') },
  { id: 'rafa_2', npc: 'geneticist', title: k('Primer cruce'), event: 'breed', goal: 1, reward: { seeds: { seed_neon_kush_rosin: 2 }, xp: 90 },
    ask: k('Cruce dos genéticas. De ahí sale lo bueno.'), thanks: k('¡Un híbrido propio! Dos Neon Kush Rosin para seguir experimentando.') },
  { id: 'rafa_3', npc: 'geneticist', title: k('Patente'), event: 'patent', goal: 1, reward: { lots: [{ id: 'energy_100' }], xp: 200 },
    ask: k('Registre una patente y su genética queda a su nombre para siempre.'), thanks: k('Su nombre en el registro. Energía para el laboratorio.') },

  // Marta · Dispensaria
  { id: 'marta_1', npc: 'budtender', title: k('Primera venta'), event: 'sell', goal: 1, reward: { lots: [{ id: 'water_50' }], xp: 30 },
    ask: k('Venda un lote en el dispensario y le regalo agua para la próxima ronda.'), thanks: k('¡Primera venta! Se corre la voz.') },
  { id: 'marta_2', npc: 'budtender', title: k('Cartera de clientes'), event: 'sell', goal: 3, reward: { lots: [{ id: 'nut_biobizz' }], xp: 60 },
    ask: k('Tres ventas más y ya tiene clientela.'), thanks: k('Clientela fiel. Nutrientes de mi parte.') },
  { id: 'marta_3', npc: 'budtender', title: k('Proveedor estrella'), event: 'sell', goal: 6, reward: { lots: [{ id: 'energy_20' }, { id: 'pest_neem' }], xp: 110 },
    ask: k('Seis ventas y es mi proveedor estrella.'), thanks: k('¡Proveedor estrella! Un bono de energía y neem.') },
], ['title', 'ask', 'thanks']);

/* ───────────────────────────── daily errands (one per NPC per day) ───────────────────────────── */

export interface ErrandDef {
  id: string;
  npc: NpcKind;
  title: string;
  ask: string;
  event: MissionEvent;
  goal: number;
  reward: MissionReward;
}

const SMALL = (id: string, xp = 15): MissionReward => ({ lots: [{ id }], xp });

export const ERRANDS: ErrandDef[] = localize<ErrandDef[]>([
  { id: 'e_flora_a', npc: 'merchant', title: k('Una compra del día'), event: 'buy', goal: 1, reward: SMALL('water_50'), ask: k('Hoy tengo oferta: haga una compra y le doy agua.') },
  { id: 'e_flora_b', npc: 'merchant', title: k('Reponer stock'), event: 'buy', goal: 2, reward: SMALL('energy_20', 20), ask: k('Reponga dos cositas hoy y le sale un bono de energía.') },

  { id: 'e_tomas_a', npc: 'farmer', title: k('Ronda de riego'), event: 'water', goal: 4, reward: SMALL('water_50'), ask: k('Hoy toca ronda de riego: cuatro riegos.') },
  { id: 'e_tomas_b', npc: 'farmer', title: k('Hora de abonar'), event: 'feed', goal: 2, reward: SMALL('nut_biobizz'), ask: k('Alimente a las plantas dos veces hoy.') },
  { id: 'e_tomas_c', npc: 'farmer', title: k('Sembrar hoy'), event: 'plant', goal: 2, reward: SMALL('pest_neem'), ask: k('Siembre un par de plantas hoy.') },

  { id: 'e_lucia_a', npc: 'scientist', title: k('Ajuste del día'), event: 'fertigate', goal: 1, reward: SMALL('nut_biobizz'), ask: k('Aplique una solución nutritiva hoy y anote qué pasó.') },
  { id: 'e_lucia_b', npc: 'scientist', title: k('Turno de laboratorio'), event: 'lab', goal: 1, reward: SMALL('energy_20', 20), ask: k('Corra un ciclo en la Planta Industrial.') },

  { id: 'e_rafa_a', npc: 'geneticist', title: k('Ojo al banco'), event: 'seedbuy', goal: 1, reward: { seeds: { seed_gelato_auto: 1 }, xp: 20 }, ask: k('Compre una semilla hoy: el banco rota su catálogo.') },
  { id: 'e_rafa_b', npc: 'geneticist', title: k('Experimento'), event: 'breed', goal: 1, reward: SMALL('pest_neem', 25), ask: k('Un cruce hoy, aunque salga mal: se aprende igual.') },

  { id: 'e_marta_a', npc: 'budtender', title: k('Turno de mostrador'), event: 'sell', goal: 1, reward: SMALL('water_50'), ask: k('Venda un lote hoy y le doy agua.') },
  { id: 'e_marta_b', npc: 'budtender', title: k('Día de ventas'), event: 'sell', goal: 2, reward: SMALL('energy_20', 20), ask: k('Dos ventas hoy y le toca un bono de energía.') },
], ['title', 'ask']);

/* ───────────────────────────── state ───────────────────────────── */

export interface DailyState {
  day: string;
  errandId: string;
  /** counters at the moment the errand was issued */
  base: number;
  claimed: boolean;
}

export interface MissionState {
  counters: Partial<Record<MissionEvent, number>>;
  /** counters when each story mission unlocked */
  base: Record<string, number>;
  claimed: string[];
  daily: Partial<Record<NpcKind, DailyState>>;
}

export const emptyMissions = (): MissionState => ({ counters: {}, base: {}, claimed: [], daily: {} });

/** Tolerates old / broken saves. */
export function normalizeMissions(raw: unknown): MissionState {
  const r = (raw ?? {}) as Partial<MissionState>;
  return {
    counters: r.counters && typeof r.counters === 'object' ? r.counters : {},
    base: r.base && typeof r.base === 'object' ? r.base : {},
    claimed: Array.isArray(r.claimed) ? r.claimed.filter((x) => typeof x === 'string') : [],
    daily: r.daily && typeof r.daily === 'object' ? r.daily : {},
  };
}

/** The player's LOCAL calendar day (errands renew at their midnight, not at UTC's). */
export const dayKey = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const count = (s: MissionState, ev: MissionEvent) => s.counters[ev] ?? 0;

export const storyOf = (npc: NpcKind): MissionDef[] => STORY.filter((m) => m.npc === npc);
const errandsOf = (npc: NpcKind): ErrandDef[] => ERRANDS.filter((e) => e.npc === npc);
export const ERRAND_BY_ID: Record<string, ErrandDef> = Object.fromEntries(ERRANDS.map((e) => [e.id, e]));

/** Report something the player did. */
export function bump(s: MissionState, ev: MissionEvent, n = 1, now = Date.now()): MissionState {
  if (!(n > 0)) return s;
  const rolled = rollDaily(s, dayKey(now));
  return { ...rolled, counters: { ...rolled.counters, [ev]: count(rolled, ev) + n } };
}

/** Give every NPC today's errand (idempotent: same object back when nothing changes). */
export function rollDaily(s: MissionState, day: string): MissionState {
  let changed = false;
  const daily = { ...s.daily };
  (Object.keys(NPC_ORDER) as NpcKind[]).forEach((npc) => {
    if (daily[npc]?.day === day) return;
    const pool = errandsOf(npc);
    if (!pool.length) return;
    const e = pool[Math.floor(hash01(`${npc}:${day}`, 11) * pool.length) % pool.length];
    daily[npc] = { day, errandId: e.id, base: count(s, e.event), claimed: false };
    changed = true;
  });
  return changed ? { ...s, daily } : s;
}
const NPC_ORDER: Record<NpcKind, true> = { merchant: true, farmer: true, scientist: true, geneticist: true, budtender: true };

/** The story mission an NPC is currently offering (first unclaimed, in order); null when the line is finished. */
export function activeStory(s: MissionState, npc: NpcKind): MissionDef | null {
  return storyOf(npc).find((m) => !s.claimed.includes(m.id)) ?? null;
}

export interface Progress { done: number; goal: number; ready: boolean }

export function storyProgress(s: MissionState, m: MissionDef): Progress {
  const done = Math.max(0, Math.min(m.goal, count(s, m.event) - (s.base[m.id] ?? 0)));
  return { done, goal: m.goal, ready: done >= m.goal };
}

export interface ErrandView { def: ErrandDef; progress: Progress; claimed: boolean }

export function errandOf(s: MissionState, npc: NpcKind, now = Date.now()): ErrandView | null {
  const d = rollDaily(s, dayKey(now)).daily[npc];
  const def = d && ERRAND_BY_ID[d.errandId];
  if (!d || !def) return null;
  const done = Math.max(0, Math.min(def.goal, count(s, def.event) - d.base));
  return { def, progress: { done, goal: def.goal, ready: done >= def.goal }, claimed: d.claimed };
}

/** How many things can be claimed from this NPC right now (for the badge). */
export function claimableCount(s: MissionState, npc: NpcKind, now = Date.now()): number {
  const st = activeStory(s, npc);
  const e = errandOf(s, npc, now);
  return (st && storyProgress(s, st).ready ? 1 : 0) + (e && !e.claimed && e.progress.ready ? 1 : 0);
}

export interface Claim { state: MissionState; reward: MissionReward; say: string; title: string }

export function claimStory(s: MissionState, id: string): Claim | null {
  const m = STORY.find((x) => x.id === id);
  if (!m || s.claimed.includes(id) || activeStory(s, m.npc)?.id !== id || !storyProgress(s, m).ready) return null;
  const claimed = [...s.claimed, id];
  const next = storyOf(m.npc).find((x) => !claimed.includes(x.id));
  const base = next ? { ...s.base, [next.id]: count(s, next.event) } : s.base;
  return { state: { ...s, claimed, base }, reward: m.reward, say: m.thanks, title: m.title };
}

export function claimErrand(s: MissionState, npc: NpcKind, now = Date.now()): Claim | null {
  const rolled = rollDaily(s, dayKey(now));
  const view = errandOf(rolled, npc, now);
  const d = rolled.daily[npc];
  if (!view || !d || view.claimed || !view.progress.ready) return null;
  return {
    state: { ...rolled, daily: { ...rolled.daily, [npc]: { ...d, claimed: true } } },
    reward: view.def.reward,
    say: t('¡Recado cumplido! Vuelva mañana, siempre hay algo que hacer.'),
    title: view.def.title,
  };
}

export const rewardSummary = (r: MissionReward, nameOf: (catalogId: string) => string, seedName: (seedId: string) => string): string[] => [
  ...(r.lots ?? []).map((l) => `${l.qty && l.qty > 1 ? `${l.qty}× ` : ''}${nameOf(l.id)}`),
  ...Object.entries(r.seeds ?? {}).map(([id, n]) => t('{n}× semilla {v1}', { n, v1: seedName(id) })),
  `+${r.xp} XP`,
];
