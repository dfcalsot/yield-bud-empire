import { advancePlant, advanceWorld, cycleSecondsOf, etaSeconds, hoursUntilMoisture, pestCount, sexFor, POLLINATED_YIELD, SimEnv } from '../src/sim/engine';
import type { PlantInGrow, RegionId } from '../src/types';
import { CHESTS, DESIGNS, EMPTY_PITY, rollChest, seasonOf, daysLeftInSeason, validNick, SEASONS, type PityState, type SeasonId } from '../src/sim/avatars';
import { plotOffer, REGION_BY_ID, REGIONS, siteConditions, terroirOf, weatherOn, regionDistance, WeatherKind } from '../src/sim/terroir';

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
// 14 · planet: deterministic weather, region climates, terroir, plots
{
  const rainy = (id: RegionId) => Array.from({ length: 400 }, (_, d) => weatherOn(REGION_BY_ID[id], d).kind).filter((k) => k === 'rain' || k === 'storm').length;
  ok('clima: determinista (mismo día = mismo tiempo)', weatherOn(REGION_BY_ID.jamaica, 123).kind === weatherOn(REGION_BY_ID.jamaica, 123).kind);
  ok('clima: Jamaica llueve mucho más que Afganistán', rainy('jamaica') > rainy('afghanistan') * 3, `(${rainy('jamaica')} vs ${rainy('afghanistan')} días de 400)`);
  const night = siteConditions('mexico', { water: 60, sunlight: 96, soil: 82 }, Date.UTC(2026, 0, 5, 10));
  const noon = siteConditions('mexico', { water: 60, sunlight: 96, soil: 82 }, Date.UTC(2026, 0, 5, 21));
  ok('sitio: de noche (hora local) no hay sol y hace más fresco que por la tarde', night.light === 0 && noon.light > 0 && noon.tempC > night.tempC, `(${night.tempC} °C noche, ${noon.tempC} °C día)`);
  const rat = { water: 80, sunlight: 90, soil: 90 };
  const home = terroirOf('jamaica', 'jamaica', rat), hybrid = terroirOf(undefined, 'jamaica', rat), far = terroirOf('afghanistan', 'jamaica', rat);
  ok('terroir: landrace en su tierra > híbrida > clima ajeno', home.growth > hybrid.growth && hybrid.growth > far.growth && home.yield > hybrid.yield && hybrid.yield > far.yield, `(crec ${home.growth.toFixed(2)}/${hybrid.growth.toFixed(2)}/${far.growth.toFixed(2)}, cosecha ${home.yield.toFixed(2)}/${hybrid.yield.toFixed(2)}/${far.yield.toFixed(2)})`);
  ok('terroir: Afganistán y Jamaica son climas muy distintos; México y Centroamérica se parecen más', regionDistance('afghanistan', 'jamaica') > regionDistance('mexico', 'central_america'));
  const a = plotOffer('asia', 7), b = plotOffer('asia', 7), c = plotOffer('asia', 8);
  ok('parcelas: la n-ésima parcela es siempre la misma y cada una es distinta', JSON.stringify(a) === JSON.stringify(b) && a.name !== c.name, `(${a.name} vs ${c.name})`);
  ok('parcelas: valoraciones 40–100, nota 0–10 y precio positivo en las 7 regiones', REGIONS.every((r) => { const o = plotOffer(r.id, 3); return Object.values(o.ratings).every((v) => v >= 40 && v <= 100) && o.landRating > 4 && o.landRating <= 10 && o.priceFlora > 100; }));
}
// 15 · outdoor growth on a plot
{
  const findDay = (id: RegionId, kind: WeatherKind) => { for (let d = 20000; d < 20800; d++) if (weatherOn(REGION_BY_ID[id], d).kind === kind) return d; throw new Error('no day'); };
  const ratings = { water: 80, sunlight: 90, soil: 90 };
  const site = (id: RegionId) => (sid: string, ms: number) => (sid === 'plotA' ? siteConditions(id, ratings, ms) : undefined);
  const outdoor = (origin: RegionId | undefined, o: Partial<PlantInGrow> = {}) => plant(65, { siteId: 'plotA', lightSchedule: '24/0', strain: { cycleDurationSeconds: 65, origin } as PlantInGrow['strain'], ...o });
  const gardenerEnv = (id: RegionId, day: number, hour = 0) => {
    const budget = { waterL: 9999, energyKwh: 0, nutrientMl: 9999, treatMl: {}, gardenerDays: 99 };
    return env({ site: site(id), clockMs: (day * 24 + hour) * 3600000, gardener: { water: true, feed: true, treat: false, feedBonus: 1 }, budget, cleanliness: 100 });
  };
  const d0 = findDay('jamaica', 'sunny');
  const night = advanceWorld([outdoor('jamaica', { id: 'n' })], 3600, gardenerEnv('jamaica', d0, 8))[0];
  ok('parcela: de noche la planta no crece', night.sim!.progress < 0.001, `(progreso ${night.sim!.progress.toFixed(4)})`);
  const dayHome = advanceWorld([outdoor('jamaica', { id: 'h' })], 2 * 86400, gardenerEnv('jamaica', d0))[0];
  const dayFar = advanceWorld([outdoor('afghanistan', { id: 'f' })], 2 * 86400, gardenerEnv('jamaica', d0))[0];
  ok('parcela: la landrace de la región crece más que la de un clima ajeno', dayHome.sim!.progress > dayFar.sim!.progress * 1.2, `(${dayHome.sim!.progress.toFixed(1)} % vs ${dayFar.sim!.progress.toFixed(1)} % en 2 d)`);
  const dry = advanceWorld([outdoor(undefined, { id: 'd', soilMoisture: 70 })], 6 * 3600, env({ site: site('afghanistan'), clockMs: (findDay('afghanistan', 'sunny') * 24 + 6) * 3600000, cleanliness: 100 }))[0];
  const wet = advanceWorld([outdoor(undefined, { id: 'w', soilMoisture: 50 })], 6 * 3600, env({ site: site('jamaica'), clockMs: (findDay('jamaica', 'rain') * 24 + 6) * 3600000, cleanliness: 100 }))[0];
  ok('parcela: un día seco y soleado seca el sustrato; la lluvia lo moja', dry.sim!.moisture < 65 && wet.sim!.moisture > 55, `(seco ${dry.sim!.moisture.toFixed(0)} %, lluvia ${wet.sim!.moisture.toFixed(0)} %)`);
  const storm = advanceWorld([outdoor(undefined, { id: 's' })], 12 * 3600, env({ site: site('central_america'), clockMs: findDay('central_america', 'storm') * 24 * 3600000, gardener: { water: true, feed: true, treat: false, feedBonus: 1 }, budget: { waterL: 99, energyKwh: 0, nutrientMl: 99, gardenerDays: 9 } as never, cleanliness: 100 }))[0];
  ok('parcela: una tormenta daña a las plantas', storm.sim!.health < 96, `(salud ${storm.sim!.health.toFixed(1)})`);
  const eb = { waterL: 100, energyKwh: 50, nutrientMl: 0, treatMl: {}, gardenerDays: 0 };
  advanceWorld([outdoor('mexico', { id: 'e' })], 86400, env({ site: site('mexico'), clockMs: findDay('mexico', 'sunny') * 24 * 3600000, budget: eb, equip: { lampWatts: 600, lampMaxPpfd: 480, acKw: 0, pumpKw: 0, solarKw: 0, waterPerPlantAuto: 0.5 }, cleanliness: 100 }));
  ok('parcela: al aire libre no se gasta electricidad de las lámparas', eb.energyKwh === 50, `(${eb.energyKwh} kWh)`);
  const lost = advanceWorld([outdoor('mexico', { id: 'x', siteId: 'desconocida' })], 3600, env({ site: site('mexico'), clockMs: 0, budget: { waterL: 0, energyKwh: 0 } }))[0];
  ok('una parcela desconocida se trata como sala interior (no rompe)', Number.isFinite(lost.sim!.progress));
}
// 16 · sexing: 50/50 for regular seeds, feminized always female, males pollinate their room / plot
{
  const males = Array.from({ length: 400 }, (_, i) => sexFor(`seed-${i}`, 'Regular')).filter((s) => s === 'male').length;
  ok('sexado: semilla regular ≈ 50 % machos', males > 160 && males < 240, `(${males} de 400)`);
  ok('sexado: feminizada / auto siempre hembra', ['Feminizada', 'Autofloreciente', 'Fast Flowering', undefined].every((t) => Array.from({ length: 100 }, (_, i) => sexFor(`s${i}`, t)).every((s) => s === 'female')));
  ok('sexado: determinista (misma semilla = mismo sexo)', sexFor('abc-123', 'Landrace') === sexFor('abc-123', 'Landrace'));
  const ploted = (o: Partial<PlantInGrow>) => plant(65, { progressPercent: 62, stage: 'flowering', sim: undefined, estimatedDryYieldGrams: 100, ...o });
  const room = advanceWorld([ploted({ id: 'm', sex: 'male' }), ploted({ id: 'f1', sex: 'female' }), ploted({ id: 'f2' }), ploted({ id: 'f3', siteId: 'plotB', sex: 'female' })], 600, env({ autoWater: true }));
  const by = (id: string) => room.find((p) => p.id === id)!;
  ok('polinización: el macho en flor poliniza a las hembras de su sala (y a las de sexo sin definir)', by('f1').pollinated === true && by('f2').pollinated === true);
  ok('polinización: la cosecha baja al 60 % una sola vez', by('f1').estimatedDryYieldGrams === Math.round(100 * POLLINATED_YIELD), `(${by('f1').estimatedDryYieldGrams} g)`);
  ok('polinización: una hembra de otra parcela no se poliniza', !by('f3').pollinated);
  const young = advanceWorld([ploted({ id: 'm2', sex: 'male', progressPercent: 40 }), ploted({ id: 'f4', progressPercent: 45 })], 600, env({ autoWater: true }));
  ok('polinización: un macho joven (<55 %) todavía no poliniza', !young[1].pollinated);
  const twice = advanceWorld(room, 600, env({ autoWater: true }));
  ok('polinización: no se aplica dos veces', twice.find((p) => p.id === 'f1')!.estimatedDryYieldGrams === by('f1').estimatedDryYieldGrams);
}
// 17 · profile avatars: seasons, catalogue, chests (odds + pity), nickname rules
{
  const mulberry = (a: number) => () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  ok('temporadas: septiembre es otoño, enero invierno, abril primavera, julio verano', seasonOf(new Date(2026, 8, 20)) === 'otono' && seasonOf(new Date(2026, 0, 5)) === 'invierno' && seasonOf(new Date(2026, 3, 1)) === 'primavera' && seasonOf(new Date(2026, 6, 1)) === 'verano');
  ok('temporadas: quedan días positivos hasta el cambio', daysLeftInSeason(new Date(2026, 8, 20)) > 0 && daysLeftInSeason(new Date(2026, 8, 20)) <= 92, `(${daysLeftInSeason(new Date(2026, 8, 20))} d)`);
  ok('catálogo: 36 diseños de cofre más el del Pack de Fundador; cada temporada tiene las 4 rarezas', DESIGNS.length === 37 && DESIGNS.filter((d) => d.season === 'fundador').length === 1 && (['primavera', 'verano', 'otono', 'invierno'] as SeasonId[]).every((s) => ['common', 'rare', 'epic', 'legendary'].every((r) => DESIGNS.some((d) => d.season === s && d.rarity === r))), `(${DESIGNS.length})`);
  ok('catálogo: ids únicos', new Set(DESIGNS.map((d) => d.id)).size === DESIGNS.length);
  ok('cofres: las probabilidades suman 100 %', Object.values(CHESTS).every((c) => Object.values(c.odds).reduce((a, b) => a + b, 0) === 100));
  // 20 000 openings of the season chest
  let pity: PityState = { ...EMPTY_PITY.season }; const rng = mulberry(42); const count = { common: 0, rare: 0, epic: 0, legendary: 0 }; let worstEpic = 0, worstLegend = 0, sinceE = 0, sinceL = 0;
  for (let i = 0; i < 20000; i++) {
    const r = rollChest(CHESTS.season, pity, 'otono', rng); pity = r.pity; count[r.design.rarity]++;
    const epicPlus = r.design.rarity === 'epic' || r.design.rarity === 'legendary';
    sinceE = epicPlus ? 0 : sinceE + 1; sinceL = r.design.rarity === 'legendary' ? 0 : sinceL + 1; worstEpic = Math.max(worstEpic, sinceE); worstLegend = Math.max(worstLegend, sinceL);
  }
  ok('cofre de temporada: nunca pasa de 7 aperturas sin épico o mejor (garantía 8)', worstEpic <= 7, `(peor racha ${worstEpic})`);
  ok('cofre de temporada: nunca pasa de 39 sin legendario (garantía 40)', worstLegend <= 39, `(peor racha ${worstLegend})`);
  ok('cofre de temporada: comunes ≈ 50–62 %, legendarios 2–5 %', count.common / 200 > 45 && count.common / 200 < 62 && count.legendary / 200 >= 2 && count.legendary / 200 <= 5, `(${(count.common / 200).toFixed(1)} % comunes, ${(count.legendary / 200).toFixed(2)} % legendarios)`);
  ok('cofre de temporada: solo sale de la temporada actual y de los clásicos', (() => { let p2: PityState = { ...EMPTY_PITY.season }; const r2 = mulberry(7); for (let i = 0; i < 500; i++) { const r = rollChest(CHESTS.season, p2, 'invierno', r2); p2 = r.pity; if (r.design.season !== 'invierno' && r.design.season !== 'classic') return false; } return true; })());
  const prem = Array.from({ length: 300 }, (_, i) => rollChest(CHESTS.premium, { ...EMPTY_PITY.premium }, 'verano', mulberry(i + 1)).design.rarity);
  ok('cofre premium: nunca da un común', prem.every((r) => r !== 'common'));
  ok('apodo: 3–20 caracteres, letras con tilde y dígitos; rechaza símbolos raros', validNick('Ana_Grower') && validNick('José Ñandú') && validNick('THC.420') && !validNick('ab') && !validNick('<script>') && !validNick('x'.repeat(21)) && validNick('  hola  ') && !validNick('..ab..'));
  ok('temporadas: hay un nombre para cada una', Object.keys(SEASONS).length === 6);
  const drawn = [...Array.from({ length: 400 }, (_, i) => rollChest(CHESTS.premium, { ...EMPTY_PITY.premium }, 'otono', mulberry(i + 7))), ...Array.from({ length: 400 }, (_, i) => rollChest(CHESTS.season, { sinceEpic: 0, sinceLegend: 39 }, 'verano', mulberry(i + 9)))];
  ok('cofres: el avatar Fundador nunca sale de un cofre', drawn.every((r) => r.design.season !== 'fundador') && drawn.some((r) => r.design.rarity === 'legendary'));
}
// 9 · nutrición: pH del sustrato, quemadura por EC y jardinero
{
  const grow = (p: PlantInGrow) => advanceWorld([p], 24 * 3600, env())[0];
  const good = grow(plant(65, { ecLevel: 2.1, phLevel: 6.2 }));
  const locked = grow(plant(65, { ecLevel: 2.1, phLevel: 7.5 }));
  const mild = grow(plant(65, { ecLevel: 2.1, phLevel: 5.4 }));
  ok('pH 7,5 (bloqueo) frena el crecimiento ≈ 35 %', locked.progressPercent < good.progressPercent * 0.75 && locked.progressPercent > good.progressPercent * 0.5, `(${locked.progressPercent} vs ${good.progressPercent})`);
  ok('pH 5,4 frena algo menos que 7,5', mild.progressPercent < good.progressPercent && mild.progressPercent > locked.progressPercent, `(${mild.progressPercent})`);
  const burnt = advanceWorld([plant(65, { ecLevel: 3.2, health: 100 })], 12 * 3600, env())[0];
  ok('EC 3,2 quema: pierde salud mientras dure la sobredosis', burnt.health < 100 && burnt.health >= 30, `(salud ${burnt.health})`);
  ok('EC normal no quema', advanceWorld([plant(65, { ecLevel: 2.1, health: 90 })], 12 * 3600, env())[0].health >= 90);
  const fed = advanceWorld([plant(65, { ecLevel: 1.0, phLevel: 7.4 })], 2 * 3600, env({ gardener: { water: true, feed: true, treat: false, feedBonus: 1.05 }, budget: { waterL: 50, energyKwh: 100, nutrientMl: 100, treatMl: {}, gardenerDays: 5 } }))[0];
  ok('el jardinero restablece el pH a 6,2 al abonar', fed.phLevel === 6.2 && fed.ecLevel > 1.9, `(pH ${fed.phLevel}, EC ${fed.ecLevel})`);
  ok('pH sano no cambia nada respecto a antes (plantas por defecto)', good.progressPercent > 0 && Number.isFinite(good.progressPercent));
}

console.log(failed ? `\n${failed} FALLOS` : '\nTodo OK');
process.exit(failed ? 1 : 0);
