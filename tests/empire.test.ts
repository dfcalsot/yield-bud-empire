import { EMPIRE_RANKS, MAX_EMPIRE_RANK, empirePoints, perksOf, rankOf, type EmpireStats } from '../src/sim/empire';
import { INITIAL_FACILITIES } from '../src/data/initialData';
import { BUILD_HOURS } from '../src/sim/facilities';
import { burnRateOfSale } from '../src/sim/economy';

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) failed++; };
const zero: EmpireStats = { harvested: 0, sales: 0, lands: 0, tier: 1, patents: 0, crosses: 0, staff: 0, level: 1 };

ok('una cuenta nueva tiene 0 puntos y rango 1', empirePoints(zero).total === 0 && rankOf(0) === 1);
ok('10 rangos con umbrales crecientes', EMPIRE_RANKS.length === 10 && EMPIRE_RANKS.every((r, i) => i === 0 || r.at > EMPIRE_RANKS[i - 1].at));
ok('el rango cambia justo en el umbral', rankOf(EMPIRE_RANKS[4].at - 1) === 4 && rankOf(EMPIRE_RANKS[4].at) === 5 && rankOf(1e9) === MAX_EMPIRE_RANK);
const p = empirePoints({ harvested: 400, sales: 250, lands: 2, tier: 3, patents: 1, crosses: 2, staff: 3, level: 4 });
ok('cada fuente suma lo que dice la tabla', p.breakdown.harvested === 10 && p.breakdown.sales === 10 && p.breakdown.lands === 200 && p.breakdown.tier === 300 && p.breakdown.patents === 120 && p.breakdown.crosses === 80 && p.breakdown.staff === 90 && p.breakdown.level === 150 && p.total === 960);
ok('números negativos o raros no restan', empirePoints({ ...zero, harvested: -500, sales: -1, lands: -3 }).total === 0);
ok('ventajas con tope: tierras 12 → 14 → 16, forja y cámara +1', perksOf(1).maxLands === 12 && perksOf(4).maxLands === 14 && perksOf(8).maxLands === 16 && perksOf(3).forgeJobs === 1 && perksOf(2).forgeJobs === 0 && perksOf(6).breedingJobs === 1 && perksOf(10).crown && !perksOf(9).crown);
const seats = INITIAL_FACILITIES.filter((f) => f.minEmpireRank);
ok('3 sedes del imperio siguen la escalera (tiers 5–7, más plantas y mejor ambiente)', seats.length === 3 && seats.map((f) => f.tier).join() === '5,6,7' && seats.every((f, i) => f.capacityPlants > (i ? seats[i - 1] : INITIAL_FACILITIES[3]).capacityPlants && f.environmentBonus > (i ? seats[i - 1] : INITIAL_FACILITIES[3]).environmentBonus));
ok('ninguna sede pasa de 30 plantas y cada una tiene su obra', seats.every((f) => f.capacityPlants <= 30 && BUILD_HOURS[f.id] > BUILD_HOURS.lab_pharma_hydro));
ok('las sedes pagan más licencia al vender (deflación)', burnRateOfSale(5) > burnRateOfSale(4) && burnRateOfSale(7) > burnRateOfSale(6));
ok('cada sede pide un rango que existe y crece', seats.every((f, i) => f.minEmpireRank! <= MAX_EMPIRE_RANK && (!i || f.minEmpireRank! > seats[i - 1].minEmpireRank!)));

console.log(failed ? `\n${failed} FALLOS` : '\nTodo OK');
process.exit(failed ? 1 : 0);
