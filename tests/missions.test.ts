import { CATALOG_BY_ID } from '../src/economy/catalog';
import { INITIAL_SEED_BANK } from '../src/data/initialData';
import {
  activeStory, bump, claimableCount, claimErrand, claimStory, dayKey, emptyMissions, ERRANDS, errandOf, normalizeMissions, rollDaily, STORY, storyOf, storyProgress,
  type MissionEvent, type MissionReward,
} from '../src/sim/missions';
import type { NpcKind } from '../src/components/npc/Npc';

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) failed++; };

const NPCS: NpcKind[] = ['merchant', 'farmer', 'scientist', 'geneticist', 'budtender'];
const DAY1 = Date.UTC(2026, 8, 20, 12);
const DAY2 = Date.UTC(2026, 8, 21, 12);
const times = (s: ReturnType<typeof emptyMissions>, ev: MissionEvent, n: number, now = DAY1) => { for (let i = 0; i < n; i++) s = bump(s, ev, 1, now); return s; };

// 1 · datos: todo lo que se regala existe y no hay $FLORA gratis
{
  const rewards: MissionReward[] = [...STORY.map((m) => m.reward), ...ERRANDS.map((e) => e.reward)];
  const lotsOk = rewards.every((r) => (r.lots ?? []).every((l) => CATALOG_BY_ID[l.id]?.kind === 'consumable'));
  ok('todo lote de recompensa existe en el catálogo y es consumible', lotsOk);
  const seedIds = new Set(INITIAL_SEED_BANK.map((s) => s.id));
  ok('toda semilla de recompensa existe en el banco', rewards.every((r) => Object.keys(r.seeds ?? {}).every((id) => seedIds.has(id))));
  ok('ninguna recompensa da $FLORA (solo lotes, semillas y XP)', rewards.every((r) => Object.keys(r).every((k) => ['lots', 'seeds', 'xp'].includes(k))));
  ok('ids únicos', new Set([...STORY.map((m) => m.id), ...ERRANDS.map((e) => e.id)]).size === STORY.length + ERRANDS.length);
  ok('cada NPC tiene historia y recados', NPCS.every((n) => storyOf(n).length >= 3 && ERRANDS.some((e) => e.npc === n)));
  ok('las metas de la historia crecen dentro de cada NPC con el mismo evento', NPCS.every((n) => {
    const l = storyOf(n).filter((m) => m.event === storyOf(n)[0].event);
    return l.every((m, i) => i === 0 || m.goal >= l[i - 1].goal);
  }));
}

// 2 · historia en orden, sin retroactividad
{
  let s = emptyMissions();
  ok('empieza en la primera misión', activeStory(s, 'merchant')?.id === 'flora_1');
  ok('sin progreso no se puede reclamar', claimStory(s, 'flora_1') === null);
  s = bump(s, 'buy', 4, DAY1);
  ok('4 compras completan la 1 (meta 1)', storyProgress(s, STORY.find((m) => m.id === 'flora_1')!).ready);
  ok('no se puede saltar a la 2 sin reclamar la 1', claimStory(s, 'flora_2') === null);
  const c1 = claimStory(s, 'flora_1')!;
  ok('reclamar la 1 funciona y da lote + xp', !!c1 && c1.reward.xp > 0 && (c1.reward.lots?.length ?? 0) > 0);
  s = c1.state;
  ok('no se reclama dos veces', claimStory(s, 'flora_1') === null);
  ok('pasa a la 2', activeStory(s, 'merchant')?.id === 'flora_2');
  ok('lo hecho ANTES de desbloquear no cuenta (0/3)', storyProgress(s, STORY.find((m) => m.id === 'flora_2')!).done === 0);
  s = times(s, 'buy', 3);
  ok('3 compras nuevas completan la 2', claimStory(s, 'flora_2') !== null);
}

// 3 · progreso acotado, eventos no relacionados no cuentan
{
  let s = times(emptyMissions(), 'sell', 50);
  const p = storyProgress(s, STORY.find((m) => m.id === 'marta_1')!);
  ok('el progreso se acota a la meta', p.done === p.goal);
  ok('vender no avanza compras', storyProgress(s, STORY.find((m) => m.id === 'flora_1')!).done === 0);
  ok('bump con n<=0 no cambia nada', bump(s, 'sell', 0) === s && bump(s, 'sell', -3) === s);
  s = bump(s, 'water', 2.5, DAY1);
  ok('cuenta fraccionarios sin romperse', (s.counters.water ?? 0) === 2.5);
}

// 4 · recado diario: determinista, uno por NPC y día, reclamable una vez, rota al día siguiente
{
  const a = rollDaily(emptyMissions(), dayKey(DAY1));
  const b = rollDaily(emptyMissions(), dayKey(DAY1));
  ok('mismo día = mismo recado (determinista)', NPCS.every((n) => a.daily[n]?.errandId === b.daily[n]?.errandId));
  ok('idempotente: el mismo objeto si no cambia el día', rollDaily(a, dayKey(DAY1)) === a);
  ok('cada recado pertenece a su NPC', NPCS.every((n) => ERRANDS.find((e) => e.id === a.daily[n]!.errandId)?.npc === n));
  let s = a;
  const v = errandOf(s, 'merchant', DAY1)!;
  ok('recado sin progreso no se reclama', claimErrand(s, 'merchant', DAY1) === null);
  s = times(s, v.def.event, v.def.goal);
  ok('avisa 1 reclamable en el badge (historia o recado)', claimableCount(s, 'merchant', DAY1) >= 1);
  const c = claimErrand(s, 'merchant', DAY1)!;
  ok('reclama el recado', !!c && c.reward.xp > 0);
  s = c.state;
  ok('no se reclama dos veces el mismo día', claimErrand(s, 'merchant', DAY1) === null);
  ok('el recado marcado sigue como reclamado en la vista', errandOf(s, 'merchant', DAY1)!.claimed);
  const next = errandOf(s, 'merchant', DAY2)!;
  ok('al día siguiente hay recado nuevo sin reclamar y con 0 de progreso', !next.claimed && next.progress.done === 0);
  ok('lo hecho el día anterior no cuenta hoy', errandOf(times(s, 'buy', 0), 'merchant', DAY2)!.progress.done === 0);
}

// 5 · bump cruzando de día snapshotea la base antes de sumar (el evento que cambia el día sí cuenta)
{
  let s = rollDaily(emptyMissions(), dayKey(DAY1));
  s = bump(s, 'water', 1, DAY2);   // primer evento del día 2
  ok('el evento que abre el día nuevo cuenta para el recado', s.daily.farmer!.day === dayKey(DAY2) && s.daily.farmer!.base === 0 && (s.counters.water ?? 0) === 1);
}

// 6 · guardados viejos o corruptos
{
  ok('normalize de null → estado vacío', JSON.stringify(normalizeMissions(null)) === JSON.stringify(emptyMissions()));
  ok('normalize descarta basura', normalizeMissions({ claimed: [1, 'a'], counters: 5, base: [], daily: 'x' }).claimed.length === 1);
  const s = normalizeMissions({ counters: { buy: 2 }, base: {}, claimed: [], daily: {} });
  ok('un estado normalizado funciona con bump', (bump(s, 'buy', 1, DAY1).counters.buy ?? 0) === 3);
}

// 7 · línea completa de un NPC
{
  let s = emptyMissions();
  for (const m of storyOf('budtender')) {
    s = times(s, m.event, m.goal);
    const c = claimStory(s, m.id);
    if (!c) { ok(`completar ${m.id}`, false); break; }
    s = c.state;
  }
  ok('al terminar la línea ya no ofrece historia', activeStory(s, 'budtender') === null);
}

console.log(failed === 0 ? '\nALL OK' : `\n${failed} FAILED`);
process.exit(failed ? 1 : 0);
