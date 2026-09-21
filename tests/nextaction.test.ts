import { nextActionFor, type NextInput } from '../src/sim/nextAction';

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) failed++; };
const base: NextInput = { hasPlant: true, harvestReady: false, pest: null, thirsty: false, hungry: false, maleWarn: false, thirstyOthers: 0, etaText: '2 d' };
const k = (o: Partial<NextInput>) => nextActionFor({ ...base, ...o }).kind;

ok('sin planta → sembrar', k({ hasPlant: false }) === 'seed');
ok('lista para cosechar gana a todo', k({ harvestReady: true, pest: 'Araña roja', thirsty: true, hungry: true }) === 'harvest');
ok('plaga antes que sed', k({ pest: 'Oídio', thirsty: true }) === 'pest');
ok('sed antes que hambre', k({ thirsty: true, hungry: true }) === 'water');
ok('hambre', k({ hungry: true }) === 'feed');
ok('macho', k({ maleWarn: true }) === 'male');
ok('sed en otras plantas', k({ thirstyOthers: 3 }) === 'room-thirst');
ok('todo bien → esperar, no accionable', k({}) === 'wait' && !nextActionFor(base).actionable);
ok('plural correcto', nextActionFor({ ...base, thirstyOthers: 1 }).label.includes('1 planta con sed') && nextActionFor({ ...base, thirstyOthers: 2 }).label.includes('2 plantas con sed'));
ok('el texto de espera lleva el tiempo', nextActionFor(base).label.includes('2 d'));

console.log(failed === 0 ? '\nALL OK' : `\n${failed} FAILED`);
process.exit(failed ? 1 : 0);
