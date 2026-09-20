import { advancePlant, advanceWorld, cycleSecondsOf, etaSeconds, hoursUntilMoisture, SimEnv } from '../src/sim/engine';
import type { PlantInGrow } from '../src/types';

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) failed++; };

const env = (o: Partial<SimEnv> = {}): SimEnv => ({ autoWater: false, autoClimate: false, facilityBonus: 1, co2Ppm: 750, lightOn: 1, getRoomTarget: () => undefined, ...o });
const plant = (cyc: number, o: Partial<PlantInGrow> = {}): PlantInGrow => ({
  strain: { cycleDurationSeconds: cyc } as PlantInGrow['strain'], plantedAt: 0, stage: 'seedling', progressPercent: 0, health: 100, soilMoisture: 85,
  temperatureC: 24, relativeHumidity: 60, vpdKpa: 1.0, ppfdLightIntensity: 675, luxLumens: 0, co2Ppm: 750, currentRoom: 'vegetative', lightSchedule: '18/6',
  ecLevel: 2.1, phLevel: 6.2, nutrientBrand: 'x', trichomeMaturity: { clear: 90, milky: 10, amber: 0 }, lastWatered: 0, lastFed: 0, estimatedDryYieldGrams: 100,
} as PlantInGrow);

// 1 · cycle length mapping
ok('genética rápida = 3 días', Math.abs(cycleSecondsOf({ cycleDurationSeconds: 40 }) / 86400 - 3) < 1e-9);
ok('genética lenta = 5 días', Math.abs(cycleSecondsOf({ cycleDurationSeconds: 90 }) / 86400 - 5) < 1e-9);

// 2 · a well cared plant (water every 12 h, feed every 24 h) matures inside 3–5 days
for (const [cyc, lo, hi] of [[40, 2.9, 3.6], [65, 3.8, 4.6], [90, 4.8, 5.6]] as const) {
  let p = plant(cyc); let t = 0; const step = 600;
  while (p.stage !== 'ready_harvest' && t < 8 * 86400) {
    p = advanceWorld([p], step, env())[0]; t += step;
    if (t % (12 * 3600) === 0) p = { ...p, soilMoisture: Math.min(100, p.soilMoisture + 55) };
    if (t % (24 * 3600) === 0) p = { ...p, ecLevel: 2.1 };
  }
  ok(`cuidada (${cyc}s) cosecha en ${(t / 86400).toFixed(2)} d`, t / 86400 >= lo && t / 86400 <= hi);
}

// 3 · neglect: stalls, health falls to the floor, never dies / NaN
{
  let p = plant(65); p = advanceWorld([p], 5 * 86400, env())[0];
  ok('sin riego 5 d: salud en el mínimo 30 %', p.health === 30, `(salud ${p.health})`);
  ok('sin riego: sustrato seco pero finito', Number.isFinite(p.soilMoisture) && p.soilMoisture >= 5, `(${p.soilMoisture}%)`);
  ok('sin riego: sigue vivo (progreso finito)', Number.isFinite(p.progressPercent) && p.progressPercent < 100, `(progreso ${p.progressPercent}%)`);
}

// 4 · thirst timing: watered plant needs water again in ~10-20 h
{
  const p = plant(65, { soilMoisture: 90, progressPercent: 40, stage: 'vegetative', sim: undefined });
  const h = hoursUntilMoisture(p, 40);
  ok('de 90 % a 40 % tarda entre 10 y 24 h', h > 10 && h < 24, `(${h.toFixed(1)} h)`);
}

// 5 · lamps off (no energy): no growth
{
  const p = advanceWorld([plant(65)], 86400, env({ lightOn: 0 }))[0];
  ok('sin energía las lámparas no crecen', p.progressPercent === 0, `(progreso ${p.progressPercent})`);
}

// 6 · auto-drip keeps moisture up
{
  const p = advanceWorld([plant(65)], 3 * 86400, env({ autoWater: true }))[0];
  ok('goteo automático mantiene humedad ≥ 40 %', p.soilMoisture >= 40 && p.health >= 95, `(hum ${p.soilMoisture}, salud ${p.health})`);
}

// 7 · chunked catch-up ≈ many small ticks
{
  const a = advanceWorld([plant(65)], 2 * 86400, env())[0];
  let b = plant(65); for (let i = 0; i < 2 * 86400 / 10; i++) b = advancePlant(b, 10, env());
  ok('catch-up en bloques ≈ ticks de 10 s', Math.abs(a.progressPercent - b.progressPercent) < 0.6, `(${a.progressPercent} vs ${b.progressPercent})`);
}

// 8 · ETA
{
  const p = plant(65);
  const eta = etaSeconds(p, env()) / 86400;
  ok('ETA de una semilla ≈ 3.5–4.5 d', eta > 3.5 && eta < 4.8, `(${eta.toFixed(2)} d)`);
}
console.log(failed ? `\n${failed} FALLOS` : '\nTodo OK');
process.exit(failed ? 1 : 0);
