/**
 * The game as it is stored and sent: the same GameState, smaller. A plant's strain (≈ half of each plant) becomes its id when the
 * id points to that exact strain (the catalogue, the player's own strains, or a `strainBook` built for the rest), and the engine's
 * full-precision numbers lose the decimals nobody can see. `unpackGame(packGame(s))` gives back a state the core treats the same.
 */
import type { PlantInGrow, Strain } from '../types';
import { INITIAL_SEED_BANK, INITIAL_STRAINS, LANDRACE_SEEDS } from '../data/initialData';
import type { GameState } from './state';

type Packed<T> = Omit<T, 'strain'> & { strain: Strain | string };
export interface PackedGame extends Omit<GameState, 'indoorPlants' | 'dormantPlants' | 'plotPlants'> {
  indoorPlants: Packed<PlantInGrow>[];
  dormantPlants: Packed<PlantInGrow>[];
  plotPlants: Record<string, Packed<PlantInGrow>[]>;
  /** strains the plants use that are neither in the catalogue nor the player's own list */
  strainBook?: Record<string, Strain>;
  packed: 1;
}

const CATALOG: Record<string, Strain> = {};
for (const s of [...INITIAL_STRAINS, ...INITIAL_SEED_BANK.map((x) => x.strainTemplate), ...LANDRACE_SEEDS.map((x) => x.strainTemplate)]) if (!CATALOG[s.id]) CATALOG[s.id] = s;
const same = (a: Strain, b: Strain) => a === b || JSON.stringify(a) === JSON.stringify(b);
const r = (n: number | undefined, d: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n * d) / d : n);

export function packGame(s: GameState): PackedGame {
  const known: Record<string, Strain> = { ...CATALOG };
  for (const x of s.customStrains) known[x.id] = x;
  for (const x of s.customSeeds) if (!known[x.strainTemplate.id]) known[x.strainTemplate.id] = x.strainTemplate;
  const book: Record<string, Strain> = {};
  const ref = (st: Strain): Strain | string => {
    const k = known[st.id] ?? book[st.id];
    if (k) return same(k, st) ? st.id : st;          // same id, different content (e.g. a patented copy): kept whole
    book[st.id] = st;
    return st.id;
  };
  const plant = (p: PlantInGrow): Packed<PlantInGrow> => ({
    ...p, strain: ref(p.strain), age: r(p.age, 1e4),
    sim: p.sim ? { progress: r(p.sim.progress, 1e5)!, moisture: r(p.sim.moisture, 1e5)!, ec: r(p.sim.ec, 1e5)!, health: r(p.sim.health, 1e5)! } : undefined,
  });
  return {
    ...s,
    indoorPlants: s.indoorPlants.map(plant),
    dormantPlants: s.dormantPlants.map(plant),
    plotPlants: Object.fromEntries(Object.entries(s.plotPlants).map(([k, v]) => [k, v.map(plant)])),
    ...(Object.keys(book).length ? { strainBook: book } : {}),
    packed: 1,
  };
}

/** a stored / received game back to the shape the core works with (an unpacked one passes through) */
export function unpackGame(raw: GameState | PackedGame): GameState {
  const p = raw as PackedGame;
  if (p.packed !== 1) return raw as GameState;
  const known: Record<string, Strain> = { ...CATALOG, ...(p.strainBook ?? {}) };
  for (const x of p.customSeeds ?? []) known[x.strainTemplate.id] = x.strainTemplate;
  for (const x of p.customStrains ?? []) known[x.id] = x;
  const plant = (x: Packed<PlantInGrow>): PlantInGrow => ({ ...x, strain: typeof x.strain === 'string' ? known[x.strain] ?? INITIAL_STRAINS[0] : x.strain });
  const { strainBook: _b, packed: _p, ...rest } = p;
  return {
    ...(rest as unknown as GameState),
    indoorPlants: p.indoorPlants.map(plant),
    dormantPlants: p.dormantPlants.map(plant),
    plotPlants: Object.fromEntries(Object.entries(p.plotPlants).map(([k, v]) => [k, v.map(plant)])),
  };
}
