import { advancePlant, SimEnv } from '../src/sim/engine';
import type { GrowStage, PlantInGrow } from '../src/types';
import { boostWithinPhase, isHarvestable, maxProgressFrom, PHASES, phaseFraction, stageOf, STAGE_ORDER } from '../src/sim/phases';
import { applyTechnique, canTrain, TECHNIQUES, TECHNIQUE_BY_ID } from '../src/sim/techniques';
import { modelStageOf } from '../src/components/Plant3D';

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) failed++; };
const env = (o: Partial<SimEnv> = {}): SimEnv => ({ autoWater: true, autoClimate: false, facilityBonus: 1, co2Ppm: 750, lightOn: 1, getRoomTarget: () => undefined, ...o });
const plant = (o: Partial<PlantInGrow> = {}): PlantInGrow => ({
  strain: { cycleDurationSeconds: 65 } as PlantInGrow['strain'], plantedAt: 0, stage: 'seed', progressPercent: 0, health: 100, soilMoisture: 85,
  temperatureC: 24, relativeHumidity: 60, vpdKpa: 1.0, ppfdLightIntensity: 675, luxLumens: 0, co2Ppm: 750, currentRoom: 'vegetative', lightSchedule: '18/6',
  ecLevel: 2.1, phLevel: 6.2, nutrientBrand: 'x', trichomeMaturity: { clear: 90, milky: 10, amber: 0 }, lastWatered: 0, lastFed: 0, estimatedDryYieldGrams: 100, ...o,
} as PlantInGrow);
const NAMES: Record<string, string> = Object.fromEntries(PHASES.map((p) => [p.id, p.label]));

// ── the order of the phases
ok('las fases van en este orden: germinación, plántula, vegetativo, floración, maduración, lista', JSON.stringify(STAGE_ORDER) === JSON.stringify(['seed', 'seedling', 'vegetative', 'flowering', 'maturation', 'ready_harvest']));
ok('las fases se tocan sin huecos ni solapes (0 → 100)', PHASES[0].from === 0 && PHASES[PHASES.length - 1].to === 100 && PHASES.every((p, i) => i === 0 || p.from === PHASES[i - 1].to));
ok('límites de fase', stageOf(0) === 'seed' && stageOf(2.99) === 'seed' && stageOf(3) === 'seedling' && stageOf(14.99) === 'seedling' && stageOf(15) === 'vegetative' && stageOf(49.99) === 'vegetative' && stageOf(50) === 'flowering' && stageOf(84.99) === 'flowering' && stageOf(85) === 'maturation' && stageOf(99.99) === 'maturation' && stageOf(100) === 'ready_harvest');
ok('un progreso inválido cuenta como germinación', stageOf(NaN) === 'seed' && stageOf(-5) === 'seed');
ok('fracción de la fase actual', Math.abs(phaseFraction(32.5) - 0.5) < 1e-9 && phaseFraction(0) === 0);
ok('solo la última fase deja cortar la planta', STAGE_ORDER.filter((s) => isHarvestable({ stage: s })).join() === 'ready_harvest');

// ── a plant walks through every phase, in order, whatever the time step
for (const dt of [600, 3600, 6 * 3600, 86400]) {
  let p = plant(); const seen: GrowStage[] = ['seed']; let t = 0;
  while (p.stage !== 'ready_harvest' && t < 40 * 86400) {
    p = advancePlant(p, dt, env()); t += dt;
    if (seen[seen.length - 1] !== p.stage) seen.push(p.stage);
  }
  ok(`con pasos de ${dt} s recorre las 6 fases, en orden y sin saltarse ninguna`, JSON.stringify(seen) === JSON.stringify(STAGE_ORDER), `(${seen.join('→')})`);
}
{
  // even a 30-day absence in one giant step cannot jump over a phase: one call moves at most into the next phase
  const p = advancePlant(plant(), 30 * 86400, env());
  ok('30 días de golpe desde la germinación: como mucho llega a plántula', p.stage === 'seedling' && p.progressPercent < 15, `(${p.stage} ${p.progressPercent}%)`);
  const q = advancePlant(plant({ stage: 'flowering', progressPercent: 60 }), 30 * 86400, env());
  ok('desde la floración un paso enorme llega a maduración pero no a «lista»', q.stage === 'maturation' && q.progressPercent < 100, `(${q.stage} ${q.progressPercent}%)`);
  const r = advancePlant(plant({ stage: 'maturation', progressPercent: 90 }), 30 * 86400, env());
  ok('desde la maduración sí puede terminar: lista para cortar', r.stage === 'ready_harvest' && r.progressPercent === 100);
}
ok('maxProgressFrom: puede entrar a la fase siguiente pero no saltarla', maxProgressFrom('seed') < 15 && maxProgressFrom('seedling') < 50 && maxProgressFrom('vegetative') < 85 && maxProgressFrom('flowering') < 100 && maxProgressFrom('maturation') === 100);

// ── paid boosts add time inside the phase, they never skip one
ok('acelerar desde la germinación se detiene al final de la fase', boostWithinPhase(0, 35) === 3 && boostWithinPhase(10, 35) === 15 && boostWithinPhase(40, 35) === 50 && boostWithinPhase(60, 35) === 85);
ok('acelerar la maduración puede terminarla; una planta lista no cambia', boostWithinPhase(90, 35) === 100 && boostWithinPhase(100, 35) === 100);
{
  let pr = 0; const seen: GrowStage[] = [stageOf(pr)]; let n = 0;
  while (stageOf(pr) !== 'ready_harvest' && n++ < 50) { pr = boostWithinPhase(pr, 35); const s = stageOf(pr); if (s !== seen[seen.length - 1]) seen.push(s); }
  ok('aceleraciones seguidas pasan por todas las fases en orden', JSON.stringify(seen) === JSON.stringify(STAGE_ORDER), `(${seen.join('→')}, ${n} aceleraciones)`);
}

// ── tricomas: claros → lechosos en floración, lechosos → ámbar en maduración
{
  const f = advancePlant(plant({ stage: 'flowering', progressPercent: 70, sim: undefined }), 60, env()).trichomeMaturity;
  const m = advancePlant(plant({ stage: 'maturation', progressPercent: 95, sim: undefined }), 60, env()).trichomeMaturity;
  ok('floración: sobre todo claros y lechosos, casi sin ámbar', f.amber <= 5 && f.milky > f.amber, JSON.stringify(f));
  ok('maduración: más ámbar que en floración', m.amber > f.amber && m.amber >= 5, JSON.stringify(m));
}

// ── training techniques belong to their phase, once per plant
const can = (stage: GrowStage, id: (typeof TECHNIQUES)[number]['id'], techniques: any[] = []) => canTrain({ stage, techniques }, id, NAMES).ok;
ok('LST, despunte, supercropping y SCROG: solo en vegetativo', (['lst', 'topping', 'supercrop', 'scrog'] as const).every((id) => can('vegetative', id) && (['seed', 'seedling', 'flowering', 'maturation', 'ready_harvest'] as GrowStage[]).every((s) => !can(s, id))));
ok('defoliación: vegetativo y floración, nunca antes ni después', can('vegetative', 'defoliation') && can('flowering', 'defoliation') && !can('seed', 'defoliation') && !can('seedling', 'defoliation') && !can('maturation', 'defoliation') && !can('ready_harvest', 'defoliation'));
ok('poda de bajos: solo en floración', can('flowering', 'lollipop') && (['seed', 'seedling', 'vegetative', 'maturation', 'ready_harvest'] as GrowStage[]).every((s) => !can(s, 'lollipop')));
{
  const c = canTrain({ stage: 'flowering', techniques: [] }, 'lst', NAMES);
  ok('el rechazo explica la fase correcta y la actual', !c.ok && c.reason === 'stage' && /Vegetativo/.test(c.message) && /Floración/.test(c.message), c.ok ? '' : c.message);
  ok('una planta lista ya no se entrena', !canTrain({ stage: 'ready_harvest', techniques: [] }, 'defoliation', NAMES).ok);
}
{
  const p0 = plant({ stage: 'vegetative', progressPercent: 30 });
  const p1 = applyTechnique(p0, 'lst');
  ok('aplicar una técnica sube el rendimiento, cuesta salud y la recuerda', p1.estimatedDryYieldGrams > p0.estimatedDryYieldGrams && p1.health < p0.health && p1.techniques?.[0] === 'lst');
  ok('la misma técnica no se repite en la misma planta', !canTrain(p1, 'lst', NAMES).ok && (canTrain(p1, 'lst', NAMES) as { reason?: string }).reason === 'done');
  ok('otra técnica de su fase sí se puede', canTrain(p1, 'topping', NAMES).ok);
  ok('la salud nunca baja de 80 por entrenar', applyTechnique(plant({ health: 82, stage: 'vegetative' }), 'supercrop').health >= 80);
}
ok('con todas las técnicas el bono total es acotado (máx. +20 %)', TECHNIQUES.reduce((a, t) => a + t.yieldBonus, 0) <= 0.2 + 1e-9 && Object.keys(TECHNIQUE_BY_ID).length === TECHNIQUES.length);

// el modelo 3D muestra la misma fase que el juego (y que el dibujo 2D) en todo el recorrido
{
  const MODEL_FOR: Record<string, number[]> = { seed: [0], seedling: [1], vegetative: [2], flowering: [3, 4], maturation: [4], ready_harvest: [4] };
  const off: string[] = [];
  for (let p = 0; p <= 100; p += 0.25) { const st = stageOf(p), m = modelStageOf(p); if (!MODEL_FOR[st].includes(m)) off.push(`${p}%: ${st}→modelo ${m}`); }
  ok('3D: cada progreso muestra el modelo de su fase (germinación, plántula, vegetativo y floración coinciden)', off.length === 0, off.slice(0, 3).join(' · '));
  ok('3D: al 4 % (plántula en el juego) ya no se ve la semilla', stageOf(4) === 'seedling' && modelStageOf(4) === 1);
}

console.log(failed ? `\n${failed} FALLOS` : '\nTodo OK');
process.exit(failed ? 1 : 0);
