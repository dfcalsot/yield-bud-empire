/**
 * The pace outdoors: with basic care (water when dry, feed once a day, treat pests) a native strain on its own land is ready in
 * 7 days at most, whatever the weather; on the most foreign land it takes a little longer (that and the smaller harvest are the
 * terroir's price). Real weather, day and night, over several start dates.
 */
import { advanceWorld, plotEtaSeconds } from '../src/sim/engine';
import { REGIONS, siteConditions, plotOffer, regionDistance } from '../src/sim/terroir';
import { INITIAL_SEED_BANK, LANDRACE_SEEDS } from '../src/data/initialData';
const strains = [...LANDRACE_SEEDS, ...INITIAL_SEED_BANK].map((s: any) => s.strainTemplate).filter((s: any) => s?.origin);
const uniq = [...new Map(strains.map((s: any) => [s.origin, s])).values()] as any[];
function run(strain: any, region: any, startDay: number): number {
  const off = plotOffer(region, 5);
  let p: any = { strain, siteId: 'x', plantedAt: 0, stage: 'seed', progressPercent: 0, health: 100, soilMoisture: 80, temperatureC: 24, relativeHumidity: 60, vpdKpa: 1, ppfdLightIntensity: 900, luxLumens: 0, co2Ppm: 420, currentRoom: 'vegetative', lightSchedule: '24/0', ecLevel: 1.6, phLevel: 6.2, nutrientBrand: 'x', trichomeMaturity: { clear: 100, milky: 0, amber: 0 }, lastWatered: 0, lastFed: 0, estimatedDryYieldGrams: 60 };
  const t0 = Date.UTC(2026, 8, 1) + startDay * 86400e3;
  for (let h = 0; h < 30 * 24; h++) {
    const ms = t0 + h * 3600e3;
    p = advanceWorld([p], 3600, { autoWater: false, autoClimate: false, facilityBonus: 1, co2Ppm: 420, lightOn: 1, getRoomTarget: () => undefined, clockMs: ms, site: () => siteConditions(region, off.ratings, ms) } as any)[0];
    if (p.stage === 'ready_harvest') return (h + 1) / 24;
    const m = p.sim?.moisture ?? p.soilMoisture; const ec = p.sim?.ec ?? p.ecLevel;
    if (m < 50) p = { ...p, soilMoisture: 85, sim: { ...p.sim, moisture: 85 } };          // basic care: waters when dry
    if (p.pest) p = { ...p, pest: undefined, guard: 48 };                                    // and treats a pest when it shows up
    if (h % 24 === 12 && ec < 1.8) p = { ...p, ecLevel: 2.1, sim: { ...p.sim, ec: 2.1 } };  // and feeds once a day
  }
  return 99;
}
let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) failed++; };
let homeMax = 0, awayMax = 0, homeMin = 99;
for (const st of uniq) {
  const worst = REGIONS.map((r) => r.id).filter((r) => r !== st.origin).sort((a, b) => regionDistance(st.origin, b) - regionDistance(st.origin, a))[0];
  for (const d of [0, 11, 23]) { const h = run(st, st.origin, d); homeMax = Math.max(homeMax, h); homeMin = Math.min(homeMin, h); awayMax = Math.max(awayMax, run(st, worst, d)); }
}
ok('en su tierra, con cuidado básico, ninguna genética pasa de 7 días', homeMax <= 7.05, `(máx ${homeMax.toFixed(1)} d)`);
ok('en la tierra más ajena tarda algo más, pero termina en menos de 10 días', awayMax > homeMax - 0.5 && awayMax < 10, `(máx ${awayMax.toFixed(1)} d)`);
ok('afuera no es instantáneo: la más rápida tarda al menos 3 días', homeMin >= 3, `(mín ${homeMin.toFixed(1)} d)`);

// the estimate the plot card shows is honest: it matches what the plant really takes, real weather included
for (const st of uniq.slice(0, 4)) {
  const off = plotOffer(st.origin, 5); const t0 = Date.UTC(2026, 8, 1) + 7 * 86400e3;
  const fresh: any = { strain: st, siteId: 'x', plantedAt: 0, stage: 'seed', progressPercent: 0, health: 100, soilMoisture: 80, temperatureC: 24, relativeHumidity: 60, vpdKpa: 1, ppfdLightIntensity: 900, luxLumens: 0, co2Ppm: 420, currentRoom: 'vegetative', lightSchedule: '24/0', ecLevel: 1.6, phLevel: 6.2, nutrientBrand: 'x', trichomeMaturity: { clear: 100, milky: 0, amber: 0 }, lastWatered: 0, lastFed: 0, estimatedDryYieldGrams: 60 };
  const est = plotEtaSeconds(fresh, st.origin, off.ratings, t0) / 86400;
  const real = run(st, st.origin, 7);
  ok(`la estimación de la parcela es honesta (${st.name.slice(0, 14)})`, Math.abs(est - real) <= 0.6, `(dice ${est.toFixed(1)} d · tarda ${real.toFixed(1)} d)`);
}
console.log(failed ? `\n${failed} FALLOS` : '\nTodo OK');
process.exit(failed ? 1 : 0);
