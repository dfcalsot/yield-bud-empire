import { BUILD_HOURS, SPEEDUP, applySpeedUp, dayOf, fullSpeedUpCostFlora, isDone, normalizeConstruction, progressOf, remainingMs, speedUpQuote, startConstruction } from '../src/sim/facilities';

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) failed++; };
const T0 = Date.UTC(2026, 8, 21, 10);
const H = 3600_000;

ok('el armario (inicial) no tiene obra', startConstruction('tent_starter', T0) === null);
ok('cada mejora tarda más que la anterior', BUILD_HOURS.tent_pro < BUILD_HOURS.greenhouse_commercial && BUILD_HOURS.greenhouse_commercial < BUILD_HOURS.lab_pharma_hydro);
const c0 = startConstruction('greenhouse_commercial', T0)!;
ok('la obra dura lo previsto', remainingMs(c0, T0) === 48 * H && !isDone(c0, T0));
ok('el progreso avanza con el tiempo real', Math.abs(progressOf(c0, T0 + 24 * H) - 0.5) < 1e-9);
ok('termina al llegar la hora', isDone(c0, T0 + 48 * H) && progressOf(c0, T0 + 99 * H) === 1);

// paid speed-ups are capped and get pricier
const big0 = startConstruction('lab_pharma_hydro', T0)!;
let c = big0; const quotes: { cutMs: number; costFlora: number }[] = []; let now = T0;
for (let i = 0; i < 6; i++) { const r = applySpeedUp(c, now); if (!r) break; c = r.state; quotes.push(r.quote); }
ok(`máximo ${SPEEDUP.perDay} aceleraciones por día`, quotes.length === SPEEDUP.perDay, `(${quotes.length})`);
ok('cada aceleración recorta tiempo', remainingMs(c, now) < remainingMs(big0, now));
ok('acelerar NUNCA termina la obra de golpe (rendimientos decrecientes)', !isDone(c, now) && remainingMs(c, now) > 0.5 * remainingMs(big0, now));
const perHour = quotes.map((q) => q.costFlora / (q.cutMs / H));
ok('el precio por hora sube con cada uso del día', perHour.every((x, i) => i === 0 || x > perHour[i - 1]), `(${perHour.map((x) => x.toFixed(1)).join(' → ')} FLORA/h)`);
ok('acelerar quema $FLORA (coste > 0 siempre)', quotes.every((q) => q.costFlora > 0) && fullSpeedUpCostFlora(120) > 0);
ok('no se puede pagar por saltarse la obra en un día', !Number.isFinite(fullSpeedUpCostFlora(120)));
now = T0 + 24 * H;
ok('al día siguiente se renuevan los usos', speedUpQuote(c, now) !== null && dayOf(now) !== dayOf(T0));

// pay-to-speed-up is bounded: even paying the daily maximum every day, a big build still takes real time
const daysAtMaxSpend = (id: string) => { let cc = startConstruction(id, T0)!, t = T0, days = 0; while (!isDone(cc, t) && days < 30) { for (let k = 0; k < SPEEDUP.perDay; k++) { const r = applySpeedUp(cc, t); if (r) cc = r.state; } t += 24 * H; days++; } return { days, hoursPaid: BUILD_HOURS[id] }; };
const lab = daysAtMaxSpend('lab_pharma_hydro'), gh = daysAtMaxSpend('greenhouse_commercial');
ok('pagando el máximo, el hidropónico aún lleva ≥ 3 días (de 5 sin pagar)', lab.days >= 3, `(${lab.days} días)`);
ok('pagando el máximo, el invernadero aún lleva ≥ 1 día (de 2 sin pagar)', gh.days >= 1, `(${gh.days} días)`);
ok('pagar siempre ayuda: menos días que esperar la obra grande', lab.days < 5);

// old / broken saves
ok('normalize de basura', normalizeConstruction(null) === null && normalizeConstruction({ facilityId: 3 }) === null);
ok('normalize conserva una obra válida', normalizeConstruction(c0)?.endsAt === c0.endsAt);

console.log(failed === 0 ? '\nALL OK' : `\n${failed} FAILED`);
process.exit(failed ? 1 : 0);
