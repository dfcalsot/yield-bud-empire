/**
 * Economy simulation. Plays 120 days of three kinds of player against the real numbers of the game (`sim/economy.ts`,
 * `sim/facilities.ts`, the engine's cycle and yield) and FAILS when the design promises are broken:
 *  - free-to-play is slow: weeks to the first upgrade, months to the top;
 *  - paying is faster but only by a measured factor, and never skips a rung;
 *  - every sale burns, the market has a depth, and what a player accumulates per day is small and bounded (deflation).
 * Run: npx tsx tests/economy-sim.ts   (prints the timelines, exits 1 on a broken promise)
 */
import { ECON, EMPTY_DEPTH, burnRateOfSale, saleRevenue, type Depth } from '../src/sim/economy';
import { BUILD_HOURS } from '../src/sim/facilities';
import { H, T0, TIERS, play, pricePerGram, type Result } from '../src/sim/economySim';

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) failed++; };
const f2p = play('f2p'), payer = play('payer');
const fmt = (r: Result) => r.days.map((d, i) => `Nv.${i + 1}: día ${d}`).join(' · ');
console.log(`  F2P   ${fmt(f2p)}\n  Pago  ${fmt(payer)}`);
console.log(`  F2P   emitido ${Math.round(f2p.minted)} · quemado ${Math.round(f2p.burned)} · saldo final ${Math.round(f2p.endBalance)}`);
console.log(`  Pago  emitido ${Math.round(payer.minted)} · quemado ${Math.round(payer.burned)} · saldo final ${Math.round(payer.endBalance)}`);

// ── free to play is slow
ok('el F2P no puede comprar la carpa el primer día (saldo inicial < precio)', ECON.starterFlora < TIERS[1].costFlora);
ok('F2P: la carpa llega entre el día 9 y el 15', f2p.days[1] >= 9 && f2p.days[1] <= 15, `(día ${f2p.days[1]})`);
ok('F2P: el invernadero llega entre la semana 5 y la 8', f2p.days[2] >= 35 && f2p.days[2] <= 56, `(día ${f2p.days[2]})`);
ok('F2P: la hidropónica no llega antes de los 4 meses', !(f2p.days[3] > 0) || f2p.days[3] >= 115, `(día ${f2p.days[3] || 'no llega en 120 d'})`);

// ── paying is faster, with a measure, and never skips a rung
const ratio = (i: number) => (payer.days[i] > 0 && f2p.days[i] > 0 ? f2p.days[i] / payer.days[i] : NaN);
ok('el de pago llega antes que el F2P a cada escalón', [1, 2].every((i) => payer.days[i] < f2p.days[i]), `(${payer.days.slice(1, 3).join(', ')} vs ${f2p.days.slice(1, 3).join(', ')})`);
ok('el de pago va como mucho ~2,6× más rápido en cualquier hito', [1, 2, 3].every((i) => !(ratio(i) > 2.6)), `(×${ratio(1).toFixed(2)}, ×${ratio(2).toFixed(2)}, ×${ratio(3).toFixed(2)})`);
ok('nadie se salta un escalón (la obra dura aunque se pague)', payer.days[2] - payer.days[1] >= 3 && payer.days[1] >= 3 && payer.days[3] - payer.days[2] >= 4);

// ── deflation: the market saturates, every sale burns, accumulation per day is small
const probe = (vol: number) => { let d: Depth = EMPTY_DEPTH, tot = 0; for (let i = 0; i < 20; i++) { const s = saleRevenue(pricePerGram(), vol, d, T0 + i * H); d = s.depth; tot += s.revenue; } return tot; };
ok('vender el doble no paga el doble (profundidad de mercado)', probe(2 * 20) < 1.7 * probe(20));
ok('partir una venta en trozos nunca paga más que venderla de una vez', (() => { const a = saleRevenue(pricePerGram(), 100, EMPTY_DEPTH, T0).revenue; let d: Depth = EMPTY_DEPTH, b = 0; for (let i = 0; i < 10; i++) { const s = saleRevenue(pricePerGram(), 10, d, T0); d = s.depth; b += s.revenue; } return b <= a + 1e-6; })());
ok('el ingreso está acotado aunque se venda sin parar (mucho menos que lineal)', probe(5000) < 0.02 * 5000 * 20 * pricePerGram());
ok('cada venta quema algo, y más en instalaciones mayores', burnRateOfSale(1) > 0 && burnRateOfSale(2) > burnRateOfSale(1));
ok('de lo que entra, el F2P quema al menos el 60 % (deflación)', f2p.burned >= 0.6 * f2p.minted, `(${(f2p.burned / f2p.minted * 100).toFixed(0)} %)`);
ok('el de pago quema al menos el 60 % de lo que emite (contando sus compras de imperio)', payer.burned >= 0.6 * payer.minted, `(${(payer.burned / payer.minted * 100).toFixed(0)} %)`);
ok('sin contar sus compras voluntarias, el de pago ya quema ≥ 40 % (comisión, licencias, obras, aceleraciones)', payer.burned - payer.voluntary >= 0.4 * payer.minted, `(${((payer.burned - payer.voluntary) / payer.minted * 100).toFixed(0)} %)`);
ok('el saldo que un jugador acumula en un día es pequeño (F2P ≤ 120, pago ≤ 150 $FLORA)', f2p.maxDailyNet <= 120 && payer.maxDailyNet <= 150, `(F2P ${Math.round(f2p.maxDailyNet)} · pago ${Math.round(payer.maxDailyNet)})`);
ok('nunca se acumula una fortuna: cada uno ahorra solo para su siguiente escalón (el de pago, para la primera sede del imperio)', f2p.endBalance < TIERS[3].costFlora && payer.endBalance < TIERS[4].costFlora, `(F2P ${Math.round(f2p.endBalance)} · pago ${Math.round(payer.endBalance)})`);

// ── empire ranks (sim/empire.ts): long-term progression, never faster than the design promises
{
  const F = play('f2p', 760), P = play('payer', 760);
  const rd = (r: typeof F, n: number) => r.rankDays[n - 1];
  console.log(`  Rangos F2P  ${F.rankDays.map((d, i) => `R${i + 1}:${d}`).join(' ')}\n  Rangos pago ${P.rankDays.map((d, i) => `R${i + 1}:${d}`).join(' ')}`);
  ok('imperio: el F2P llega al rango 5 (primera sede) entre los meses 4 y 6', rd(F, 5) >= 120 && rd(F, 5) <= 185, `(día ${rd(F, 5)})`);
  ok('imperio: el rango 7 no llega antes de 6 meses sin pagar', !(rd(F, 7) < 180), `(día ${rd(F, 7)})`);
  ok('imperio: el rango 10 tarda más de un año, pague o no', !(rd(P, 10) < 365) && !(rd(F, 10) < 365), `(pago día ${rd(P, 10)})`);
  ok('imperio: el de pago va como mucho ~2,6× más rápido en los rangos', [3, 5, 7].every((n) => !(rd(F, n) / rd(P, n) > 2.6)));
  ok('imperio: ninguna sede se construye antes de su rango', [5, 6, 7].every((t) => !(P.days[t - 1] > 0) || P.days[t - 1] >= rd(P, [5, 7, 9][t - 5])));
  ok('imperio: con las sedes, lo quemado sigue siendo al menos el 60 % de lo emitido', P.burned >= 0.6 * P.minted && F.burned >= 0.6 * F.minted);
}

console.log(failed === 0 ? '\nALL OK' : `\n${failed} FAILED`);
process.exit(failed ? 1 : 0);
