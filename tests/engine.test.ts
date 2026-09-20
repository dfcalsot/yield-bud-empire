import { advancePlant, advanceWorld, cycleSecondsOf, etaSeconds, hoursUntilMoisture, pestCount, SimEnv } from '../src/sim/engine';
import type { PlantInGrow } from '../src/types';

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) failed++; };

const env = (o: Partial<SimEnv> = {}): SimEnv => ({ autoWater: false, autoClimate: false, facilityBonus: 1, co2Ppm: 750, lightOn: 1, getRoomTarget: () => undefined, ...o });
const plant = (cyc: number, o: Partial<PlantInGrow> = {}): PlantInGrow => ({
  strain: { cycleDurationSeconds: cyc } as PlantInGrow['strain'], plantedAt: 0, stage: 'seedling', progressPercent: 0, health: 100, soilMoisture: 85,
  temperatureC: 24, relativeHumidity: 60, vpdKpa: 1.0, ppfdLightIntensity: 675, luxLumens: 0, co2Ppm: 750, currentRoom: 'vegetative', lightSchedule: '18/6',
  ecLevel: 2.1, phLevel: 6.2, nutrientBrand: 'x', trichomeMaturity: { clear: 90, milky: 10, amber: 0 }, lastWatered: 0, lastFed: 0, estimatedDryYieldGrams: 100, ...o,
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
// 9 · electricity: 600 W lamp (18/6) draws 10.8 kWh/day; empty stock → lamps go dark
{
  const equip = { lampWatts: 600, lampMaxPpfd: 480, acKw: 0, pumpKw: 0, solarKw: 0, waterPerPlantAuto: 0.5 };
  const budget = { waterL: 500, energyKwh: 60 };
  const p = advanceWorld([plant(65)], 3 * 86400, env({ equip, budget, autoWater: true }))[0];
  ok('consumo eléctrico: 600 W × 18 h/día × 3 d = 32.4 kWh', Math.abs((60 - budget.energyKwh) - 32.4) < 1.5, `(gastó ${(60 - budget.energyKwh).toFixed(1)} kWh)`);
  ok('con energía y riego crece a buen ritmo', p.progressPercent > 60, `(${p.progressPercent}%)`);
  const b2 = { waterL: 500, energyKwh: 5 };
  const q = advanceWorld([plant(65)], 3 * 86400, env({ equip, budget: b2, autoWater: true }))[0];
  ok('sin energía se apaga: crece mucho menos', q.progressPercent < p.progressPercent * 0.4, `(${q.progressPercent}% vs ${p.progressPercent}%)`);
}
// 10 · solar field covers most of the bill
{
  const equip = { lampWatts: 600, lampMaxPpfd: 480, acKw: 0, pumpKw: 0, solarKw: 1.6, waterPerPlantAuto: 0.5 };
  const budget = { waterL: 500, energyKwh: 0 };
  const p = advanceWorld([plant(65)], 2 * 86400, env({ equip, budget, autoWater: true }))[0];
  ok('un campo solar de 1.6 kW mantiene las lámparas sin comprar energía', p.progressPercent > 40, `(${p.progressPercent}%)`);
}
// 11 · auto-drip spends water and stops when the tank is empty
{
  const equip = { lampWatts: 600, lampMaxPpfd: 480, acKw: 0, pumpKw: 0.04, solarKw: 0, waterPerPlantAuto: 0.45 };
  const budget = { waterL: 200, energyKwh: 200 };
  advanceWorld([plant(65)], 3 * 86400, env({ equip, budget, autoWater: true }));
  ok('goteo gasta agua del tanque', budget.waterL < 200 && budget.waterL > 190, `(quedan ${budget.waterL.toFixed(2)} L)`);
  const dry = { waterL: 0, energyKwh: 200 };
  const p = advanceWorld([plant(65)], 3 * 86400, env({ equip, budget: dry, autoWater: true }))[0];
  ok('sin agua el goteo no riega: se seca', p.soilMoisture < 30, `(${p.soilMoisture}%)`);
}
// 12 · plagues: seeded, sensitive to conditions and to the room's cleanliness, cured by treatment / guard
{
  const mk = (n: number, o: Partial<PlantInGrow> = {}) => Array.from({ length: n }, (_, i) => plant(65, { id: `t${i}`, ...o }));
  const clean = advanceWorld(mk(60), 3 * 86400, env({ cleanliness: 100, autoWater: true }));
  const clean2 = advanceWorld(mk(60), 3 * 86400, env({ cleanliness: 100, autoWater: true }));
  ok('plagas: misma sala + mismas plantas = mismo resultado (determinista)', JSON.stringify(clean.map((p) => p.pest?.kind ?? '-')) === JSON.stringify(clean2.map((p) => p.pest?.kind ?? '-')));
  ok('plagas: sala limpia y clima ideal → pocas plantas afectadas en 3 d', pestCount(clean) <= 18, `(${pestCount(clean)} de 60)`);
  const dirty = advanceWorld(mk(60, { relativeHumidity: 85 }), 3 * 86400, env({ cleanliness: 0, autoWater: true }));
  const mold = dirty.filter((p) => p.pest?.kind === 'mold').length;
  ok('plagas: sala sucia + humedad 85 % → muchas más, sobre todo moho', pestCount(dirty) > Math.max(3 * pestCount(clean), 15) && mold > pestCount(dirty) / 2, `(${pestCount(dirty)} de 60, moho ${mold}; limpia ${pestCount(clean)})`);
  const guarded = advanceWorld(mk(60, { guard: 500, relativeHumidity: 85 }), 3 * 86400, env({ cleanliness: 0, autoWater: true }));
  ok('plagas: una planta protegida (guard) no se infecta', pestCount(guarded) === 0);
  const sick = advancePlant(plant(65, { pest: { kind: 'mold', hours: 0 } }), 3600, env({ autoWater: true }));
  const fine = advancePlant(plant(65), 3600, env({ autoWater: true }));
  ok('plaga activa: crece más lento y pierde salud', sick.sim!.progress < fine.sim!.progress * 0.6 && sick.sim!.health < fine.sim!.health, `(${sick.sim!.progress.toFixed(3)} vs ${fine.sim!.progress.toFixed(3)}; salud ${sick.sim!.health.toFixed(1)})`);
}
// 13 · gardener: waters, feeds and treats from the stock while the contract lasts
{
  const thirsty = (o: Partial<PlantInGrow> = {}) => plant(65, { soilMoisture: 20, ecLevel: 0.5, ...o });
  const g = { water: true, feed: true, treat: true, feedBonus: 1.06 };
  const b = { waterL: 10, energyKwh: 0, nutrientMl: 20, treatMl: { mold: 50 }, gardenerDays: 2 };
  const p = advanceWorld([thirsty({ pest: { kind: 'mold', hours: 3 } })], 300, env({ gardener: g, budget: b, cleanliness: 100 }))[0];
  ok('jardinero: riega desde el tanque', p.soilMoisture > 80 && Math.abs(b.waterL - 9.5) < 1e-9, `(hum ${p.soilMoisture}, tanque ${b.waterL} L)`);
  ok('jardinero: abona con el stock y aplica la marca', p.ecLevel >= 2 && b.nutrientMl === 17 && p.feedBonus === 1.06, `(EC ${p.ecLevel}, abono ${b.nutrientMl} ml)`);
  ok('jardinero (nivel 2): cura la plaga, gasta tratamiento y protege', !p.pest && (p.guard ?? 0) > 40 && b.treatMl.mold === 42, `(guard ${(p.guard ?? 0).toFixed(1)} h, tratamiento ${b.treatMl.mold} ml)`);
  ok('jardinero: el contrato baja con el tiempo', Math.abs(b.gardenerDays - (2 - 300 / 86400)) < 1e-9, `(${b.gardenerDays.toFixed(4)} d)`);
  const noTreat = advanceWorld([thirsty({ pest: { kind: 'mold', hours: 3 } })], 300, env({ gardener: { ...g, treat: false }, budget: { waterL: 10, energyKwh: 0, nutrientMl: 20, treatMl: { mold: 50 }, gardenerDays: 2 }, cleanliness: 100 }))[0];
  ok('jardinero nivel 1: no trata plagas', !!noTreat.pest);
  const b2 = { waterL: 10, energyKwh: 0, nutrientMl: 20, treatMl: { mold: 50 }, gardenerDays: 0.5 };
  const late = advanceWorld([plant(65, { soilMoisture: 85, ecLevel: 2.1 })], 2 * 86400, env({ gardener: g, budget: b2, cleanliness: 100 }))[0];
  ok('jardinero: al vencer el contrato deja de regar (la planta se seca)', b2.gardenerDays === 0 && late.soilMoisture < 40, `(contrato ${b2.gardenerDays}, humedad ${late.soilMoisture})`);
  const b3 = { waterL: 0, energyKwh: 0, nutrientMl: 0, treatMl: {}, gardenerDays: 2 };
  const nothing = advanceWorld([thirsty()], 3600, env({ gardener: g, budget: b3, cleanliness: 100 }))[0];
  ok('jardinero sin agua ni abono en el almacén no puede hacer magia', nothing.sim!.moisture < 20 && nothing.sim!.ec < 0.5, `(hum ${nothing.sim!.moisture.toFixed(1)}, EC ${nothing.sim!.ec.toFixed(2)})`);
}
console.log(failed ? `\n${failed} FALLOS` : '\nTodo OK');
process.exit(failed ? 1 : 0);
