import { ACTIVITY, RELIC_CAPS, RELIC_ODDS, RELIC_TYPES, addActivity, emptyActivity, meltReward, relicMods, combineMods, rollRelic, weekKey } from '../src/sim/relics';
import { CAPS, NO_MODS } from '../src/sim/staff';
import { mulberry32 } from '../src/sim/breeding';

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) failed++; };
const T = Date.UTC(2026, 8, 23, 12); // miércoles

ok('7 tipos de reliquia, ninguno toca el precio de venta', RELIC_TYPES.length === 7 && RELIC_TYPES.every((r) => (r.stat as string) !== 'sellBonus'));
ok('los topes de reliquias son menores que los del personal', (Object.keys(RELIC_CAPS) as Array<keyof typeof RELIC_CAPS>).every((k) => RELIC_CAPS[k] < CAPS[k]));
ok('probabilidades suman 1', Math.abs(RELIC_ODDS.reduce((a, [, p]) => a + p, 0) - 1) < 1e-9);
const rng = mulberry32(7); const n = 20000; const c: Record<string, number> = {};
for (let i = 0; i < n; i++) { const r = rollRelic(rng, `r${i}`, i, 'classic', T); c[r.rarity] = (c[r.rarity] ?? 0) + 1; }
ok('el azar respeta las probabilidades (muestra de 20 000)', RELIC_ODDS.every(([k, p]) => Math.abs((c[k] ?? 0) / n - p) < 0.012), JSON.stringify(c));
const m = relicMods(RELIC_TYPES.map((t, i) => ({ id: `x${i}`, typeId: t.id, stat: t.stat, rarity: 'legendary' as const, value: 1, serial: i, season: 'x', mintedAt: T })));
ok('solo cuentan 3 equipadas', Object.keys(m).length === 3);
const all = combineMods({ ...NO_MODS, roomYield: CAPS.roomYield }, relicMods([{ id: 'a', typeId: 'soil', stat: 'roomYield', rarity: 'legendary', value: 1, serial: 1, season: 'x', mintedAt: T }, { id: 'b', typeId: 'soil', stat: 'roomYield', rarity: 'legendary', value: 1, serial: 2, season: 'x', mintedAt: T }]));
ok('el máximo total es personal + reliquias, y dos del mismo tipo no se suman', Math.abs(all.roomYield - (CAPS.roomYield + RELIC_CAPS.roomYield)) < 1e-9);
ok('la semana empieza el lunes (UTC)', weekKey(T) === '2026-09-21' && weekKey(Date.UTC(2026, 8, 27, 23)) === '2026-09-21' && weekKey(Date.UTC(2026, 8, 28, 0)) === '2026-09-28');
let a = emptyActivity(T);
for (let i = 0; i < 100; i++) a = addActivity(a, 'water', 1, T, true).activity;
ok('regar suma hasta su tope semanal', a.points === ACTIVITY.capPerKind.water);
let b = emptyActivity(T); let got = 0;
for (let d = 0; d < 3; d++) for (let i = 0; i < 6; i++) { const r = addActivity(b, 'harvest', 1, T + d * 86400000 - 2 * 86400000, true); b = r.activity; got += r.newChests; }
ok('90 puntos en 3 días dan el primer cofre, no el segundo', got === 1 && b.pending === 1);
const nx = addActivity(b, 'water', 1, T + 7 * 86400000, true).activity;
ok('una semana nueva empieza de cero y guarda los cofres pendientes', nx.points === 1 && nx.earned === 0 && nx.pending === 1);
ok('sin requisitos no se gana cofre', addActivity({ ...emptyActivity(T), points: 999, days: ['a', 'b', 'c'] }, 'sell', 1, T, false).newChests === 0);
ok('fundir da más materiales cuanto más rara', Object.values(meltReward('legendary')).reduce((x, y) => x + (y ?? 0), 0) > Object.values(meltReward('common')).reduce((x, y) => x + (y ?? 0), 0));
console.log(failed ? `\n${failed} FALLOS` : '\nTodo OK'); process.exit(failed ? 1 : 0);
