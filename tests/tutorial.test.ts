import { bump, emptyMissions } from '../src/sim/missions';
import { STEPS, claimStep, currentStep, emptyTutorial, isFinished, normalizeTutorial, skipStep, startTutorial, stepProgress } from '../src/sim/tutorial';
import { CATALOG_BY_ID } from '../src/economy/catalog';
import { INITIAL_SEED_BANK } from '../src/data/initialData';

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) failed++; };
const T0 = Date.UTC(2026, 8, 21, 12);

// data
ok('ids de pasos únicos', new Set(STEPS.map((s) => s.id)).size === STEPS.length);
ok('la cosecha (lenta) va la última', STEPS[STEPS.length - 1].id === 'harvest');
ok('todo lote y semilla de recompensa existe', STEPS.every((s) => (s.reward.lots ?? []).every((l) => CATALOG_BY_ID[l.id]?.kind === 'consumable') && Object.keys(s.reward.seeds ?? {}).every((id) => INITIAL_SEED_BANK.some((b) => b.id === id))));
ok('sin $FLORA gratis', STEPS.every((s) => Object.keys(s.reward).every((k) => ['lots', 'seeds', 'xp'].includes(k))));

// flow
let m = emptyMissions(); let t = emptyTutorial();
ok('empieza sin arrancar', !t.started && currentStep(t)?.id === 'move');
t = startTutorial(t, m);
ok('arrancado en el primer paso', t.started && t.index === 0);
ok('sin progreso no se reclama', claimStep(t, m) === null);
m = bump(m, 'visit', 1, T0);
ok('un viaje completa «muévete»', stepProgress(t, m)!.ready);
const c1 = claimStep(t, m)!;
ok('reclamar da recompensa y avanza', !!c1 && c1.reward.xp > 0 && c1.state.index === 1);
t = c1.state;
ok('no se reclama dos veces', claimStep(t, m) === null);
ok('lo hecho ANTES de que el paso sea el actual no cuenta', stepProgress(t, m)!.done === 0 && currentStep(t)!.id === 'bag');
m = bump(m, 'water', 5, T0);
ok('regar no avanza «maletín»', stepProgress(t, m)!.done === 0);
m = bump(m, 'openbag', 1, T0);
t = claimStep(t, m)!.state;
ok('sigue en orden', currentStep(t)!.id === 'water');
ok('el riego hecho antes de llegar a ese paso NO cuenta (0/1)', stepProgress(t, m)!.done === 0);

// skip never blocks
const before = t.index;
t = skipStep(t, m);
ok('saltar avanza sin recompensa', t.index === before + 1 && t.claimed.length === 2);
let guard = 0; while (!isFinished(t) && guard++ < 50) t = skipStep(t, m);
ok('se puede saltar toda la guía', isFinished(t) && currentStep(t) === null);
ok('terminada: nada que reclamar', claimStep(t, m) === null && stepProgress(t, m) === null);

// persistence / old saves
ok('normalize de basura', JSON.stringify(normalizeTutorial(undefined)) === JSON.stringify(emptyTutorial()));
ok('índice fuera de rango se acota', normalizeTutorial({ index: 999 }).index === STEPS.length && normalizeTutorial({ index: -3 }).index === 0);
const again = startTutorial(t, m);
ok('repetir la guía la reinicia', again.index === 0 && again.claimed.length === 0 && again.started);

console.log(failed === 0 ? '\nALL OK' : `\n${failed} FAILED`);
process.exit(failed ? 1 : 0);
