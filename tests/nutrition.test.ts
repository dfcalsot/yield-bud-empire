import { NUTRIENT_BRANDS_DATABASE } from '../src/data/initialData';
import {
  availability, CHALLENGES, diagnose, dosesFromTable, ELEMENT_IDS, feedEffect, INGREDIENTS, ingredientForProduct, phCorrection, phFromAlkalinity, phGrowthFactor,
  solve, stageIdOfBrandStage, stageOfProgress, STAGES, strengthForEc, SYMPTOMS, WATERS, type Mix, type StageId, type MediumId, type WaterId,
} from '../src/sim/nutrition';

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) failed++; };
const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;
const mix = (waterId: WaterId, doses: Record<string, number>): Mix => ({ waterId, liters: 1, doses });
const dx = (m: Mix, stage: StageId, medium: MediumId) => diagnose(solve(m), stage, medium);

// 1 · química: sales exactas y agua
{
  const s = solve(mix('ro', { cal_nitrate: 1 }));
  ok('1 g/L de nitrato de calcio = 155 ppm N + 190 ppm Ca (+1 del agua)', s.ppm.N === 155 && s.ppm.Ca === 191, JSON.stringify(s.ppm));
  ok('MKP: 0-52-34 → 227 ppm P y 282 ppm K por g/L', solve(mix('ro', { mkp: 1 })).ppm.P === 227 && solve(mix('ro', { mkp: 1 })).ppm.K === 282);
  ok('los ppm se suman con los que ya trae el agua dura (Ca 80 + 190)', solve(mix('hard', { cal_nitrate: 1 })).ppm.Ca === 270);
  ok('EC: ppm500 = EC × 500 y ppm700 = EC × 700', (() => { const r = solve(mix('soft', { cal_nitrate: 0.5 })); return r.ppm500 === Math.round(r.ec * 500) && r.ppm700 === Math.round(r.ec * 700); })());
  ok('EC del agua sin nada = EC medida del agua', WATERS.every((w) => solve(mix(w.id, {})).ec === w.ec));
  const bio = solve(mix('ro', { bio_grow: 4 })).ppm.N, min = solve(mix('ro', { ph_perfect_grow: 4 })).ppm.N;
  ok('orgánicos: el N solo está disponible al 60 % (mineralización)', bio > 0 && bio < 30 * 4 * 1.6 * 0.61 && bio > 30 * 4 * 1.6 * 0.59, `(bio ${bio}, mineral ${min})`);
}

// 2 · pH por alcalinidad: el agua manda
{
  const ph = Object.fromEntries(WATERS.map((w) => [w.id, solve(mix(w.id, {})).ph]));
  ok('pH del grifo blando ≈ 7,25, duro ≈ 7,8; ósmosis y lluvia ≈ ácidas', near(ph.soft, 7.25, 0.05) && near(ph.hard, 7.78, 0.05) && ph.ro < 6.2 && ph.rain < 5.8, JSON.stringify(ph));
  ok('el pH sube con la alcalinidad (monótono)', phFromAlkalinity(0.01) < phFromAlkalinity(0.1) && phFromAlkalinity(0.1) < phFromAlkalinity(1) && phFromAlkalinity(1) < phFromAlkalinity(5));
  ok('el pH nunca sale de [2,5 ; 9,5] ni da NaN', [-100, -1, 0, 1e-9, 0.0075, 50, NaN, Infinity].every((a) => { const v = phFromAlkalinity(a); return Number.isFinite(v) && v >= 2.5 && v <= 9.5; }));
  let last = 99, mono = true;
  for (let d = 0; d <= 3; d += 0.05) { const v = solve(mix('hard', { ph_down: d })).ph; if (v > last + 1e-9) mono = false; last = v; }
  ok('más ácido = pH más bajo, siempre', mono);
  const hard = mix('hard', {});
  const c = phCorrection(hard, 6.2, 'acid_nitric');
  ok('corrector de pH: el nítrico diluido deja el agua dura en 6,2 con ≈ 7 ml/L', c.ingredient === 'acid_nitric' && near(solve({ ...hard, doses: { acid_nitric: c.dose } }).ph, 6.2, 0.06) && c.dose > 5.5 && c.dose < 9, JSON.stringify(c));
  const c2 = phCorrection(hard, 6.2, 'ph_down');
  ok('el fosfórico necesita más volumen y deja mucho fósforo', c2.dose > 1.2 && solve({ ...hard, doses: { ph_down: c2.dose } }).ppm.P > 90, JSON.stringify(c2));
  const cUp = phCorrection(mix('rain', {}), 6.2);
  ok('con agua ácida el corrector es pH Up y funciona', cUp.ingredient === 'ph_up' && near(solve(mix('rain', { ph_up: cUp.dose })).ph, 6.2, 0.06), JSON.stringify(cUp));
  ok('sin necesidad de corregir → sin dosis', phCorrection(mix('soft', { acid_nitric: 0 }), 7.25).dose === 0);
}

// 3 · disponibilidad por pH (bloqueos)
{
  ok('disponibilidad siempre entre 0 y 1', ELEMENT_IDS.every((e) => [3, 4.5, 5.5, 6.2, 7, 8.5, 12].every((p) => { const a = availability(e, p); return a >= 0 && a <= 1; })));
  ok('el hierro se bloquea con pH alto (7,5 → < 20 %) y es total en 6,0', availability('Fe', 7.5) < 0.2 && availability('Fe', 6.0) === 1);
  ok('calcio y magnesio se bloquean con pH bajo (5,0 → < 50 %)', availability('Ca', 5.0) < 0.5 && availability('Mg', 5.0) < 0.5);
  ok('el fósforo rinde al máximo entre 6,0 y 7,0', availability('P', 6.5) === 1 && availability('P', 5.5) < 1);
}

// 4 · etapas
{
  ok('progreso → etapa de nutrición', stageOfProgress(0) === 'seedling' && stageOfProgress(20) === 'veg_early' && stageOfProgress(40) === 'veg_late' && stageOfProgress(55) === 'transition' && stageOfProgress(80) === 'bloom_peak' && stageOfProgress(96) === 'flush' && stageOfProgress(100) === 'flush');
  ok('progreso inválido → plántula; el rango de etapas no deja huecos', stageOfProgress(NaN) === 'seedling' && STAGES.every((s, i) => i === 0 || s.from === STAGES[i - 1].to));
  ok('el N objetivo baja y el K sube de vegetativo a floración', STAGES[2].ranges.N[0] > STAGES[4].ranges.N[0] && STAGES[4].ranges.K[0] > STAGES[2].ranges.K[0]);
}

// 4b · mapeo de las etapas de las marcas
{
  const map = NUTRIENT_BRANDS_DATABASE.map((b) => b.stages.map((s) => stageIdOfBrandStage(s.stageName)));
  ok('etapas de AN y BioBizz → las 6 etapas en orden', JSON.stringify(map[0]) === JSON.stringify(['seedling', 'veg_early', 'veg_late', 'transition', 'bloom_peak', 'flush']) && JSON.stringify(map[1]) === JSON.stringify(['seedling', 'veg_early', 'veg_late', 'transition', 'bloom_peak', 'flush']), JSON.stringify(map));
  ok('Athena: germinación, vegetativo, floración, lavado', JSON.stringify(map[2]) === JSON.stringify(['seedling', 'veg_late', 'bloom_peak', 'flush']), JSON.stringify(map[2]));
}

// 5 · diagnóstico
const VEG: Record<string, number> = { cal_nitrate: 0.75, kno3: 0.3, mkp: 0.15, k2so4: 0.15, epsom: 0.4, fe_eddha: 0.03 };
{
  const s = solve(mix('ro', VEG));
  ok('receta de sales de vegetativo: EC ≈ 1,8 (1,6–2,0) y ppm coherentes', s.ec >= 1.6 && s.ec <= 2.0 && s.ppm.N > 140 && s.ppm.Ca > 130, `(EC ${s.ec}, ${JSON.stringify(s.ppm)})`);
  const d = dx(mix('ro', VEG), 'veg_late', 'hydro');
  ok('esa receta bien hecha puntúa ≥ 85 sin hallazgos graves', d.score >= 85 && !d.findings.some((f) => f.level === 'bad'), `(score ${d.score}; ${d.findings.map((f) => f.id)})`);
  const lock = dx(mix('hard', { ...VEG, cal_nitrate: 0 }), 'veg_late', 'hydro');
  ok('sin corregir el pH del agua dura: pH alto marcado, hierro bloqueado y puntuación baja', lock.phState === 'high' && lock.effective.Fe < solve(mix('hard', { ...VEG, cal_nitrate: 0 })).ppm.Fe * 0.3 && lock.findings.some((f) => f.id === 'ph') && lock.score < 75, `(pH ${solve(mix('hard', VEG)).ph}, score ${lock.score})`);
  const coco = dx(mix('ro', { ph_perfect_grow: 2 }), 'veg_early', 'coco');
  ok('agua de ósmosis + solo base de crecimiento en coco: falta Ca y Mg', ['deficient', 'low'].includes(coco.status.Ca) && ['deficient', 'low'].includes(coco.status.Mg) && coco.findings.some((f) => f.id === 'Ca-low'));
  const over = dx(mix('ro', Object.fromEntries(Object.entries(VEG).map(([k, v]) => [k, v * 2.2]))), 'veg_late', 'hydro');
  ok('sobredosis (×2,2): quemadura por EC, tóxica y puntuación ≤ 55', over.ecState === 'burn' && over.toxic && over.score <= 55, `(EC ${solve(mix('ro', VEG)).ec}→, score ${over.score})`);
  const under = dx(mix('ro', Object.fromEntries(Object.entries(VEG).map(([k, v]) => [k, v * 0.3]))), 'veg_late', 'hydro');
  ok('subdosis (×0,3): EC baja y carencias generales', under.ecState === 'low' && under.score < 60 && under.findings.some((f) => f.id === 'ec-low'));
  const ant = dx(mix('ro', { cal_nitrate: 0.3, epsom: 0.2, k2so4: 1.0, mkp: 0.3 }), 'bloom_peak', 'hydro');
  ok('antagonismo: demasiado K frente a Ca+Mg lo detecta', ant.findings.some((f) => f.id === 'k-ant') && ant.ratios.kToCaMg > 2.6);
  const camg = dx(mix('ro', { cal_nitrate: 1.2, epsom: 0.1, k2so4: 0.3, mkp: 0.2 }), 'bloom_peak', 'hydro');
  ok('relación Ca:Mg fuera de 2–5 se avisa', camg.findings.some((f) => f.id === 'camg') && camg.ratios.caMg > 5);
  const flushOk = dx(mix('ro', { flawless_finish: 2 }), 'flush', 'hydro');
  const flushBad = dx(mix('ro', VEG), 'flush', 'hydro');
  ok('lavado: agua limpia puntúa ≥ 90; con nutrientes puntúa mal', flushOk.score >= 90 && flushBad.score < 50, `(${flushOk.score} vs ${flushBad.score})`);
  ok('la puntuación siempre está en 0–100 y las estrellas cuadran', [over, under, ant, camg, flushOk, coco, lock].every((x) => x.score >= 0 && x.score <= 100 && x.stars === (x.score >= 90 ? 3 : x.score >= 75 ? 2 : x.score >= 55 ? 1 : 0)));
  const same = dx(mix('ro', VEG), 'veg_late', 'hydro');
  ok('determinista: mismo input, mismo resultado', JSON.stringify(same) === JSON.stringify(dx(mix('ro', VEG), 'veg_late', 'hydro')));
  ok('el coco pide más Ca y Mg que la hidroponía en el mismo estadio', dx(mix('ro', VEG), 'veg_late', 'coco').ranges.Ca[0] > dx(mix('ro', VEG), 'veg_late', 'hydro').ranges.Ca[0]);
  ok('cada hallazgo con síntoma apunta a un síntoma que existe', (() => { const ids = new Set(SYMPTOMS.map((s) => s.id)); return [over, under, ant, coco, lock].flatMap((x) => x.findings).every((f) => !f.symptomId || ids.has(f.symptomId)); })());
}

// 6 · efecto sobre la planta
{
  const sol = solve(mix('ro', VEG));
  const good = feedEffect(sol, dx(mix('ro', VEG), 'veg_late', 'hydro'));
  const badSol = solve(mix('ro', Object.fromEntries(Object.entries(VEG).map(([k, v]) => [k, v * 2.2]))));
  const bad = feedEffect(badSol, diagnose(badSol, 'veg_late', 'hydro'));
  ok('una buena solución da bonus de crecimiento y salud; una tóxica los quita', good.feedBonus >= 1.05 && good.healthDelta > 0 && bad.feedBonus < 1 && bad.healthDelta < 0, `(${good.feedBonus}/${good.healthDelta} vs ${bad.feedBonus}/${bad.healthDelta})`);
  ok('bloqueo por pH del sustrato: 1 en 5,6–6,9, penaliza fuera y nunca es NaN', phGrowthFactor(6.2) === 1 && phGrowthFactor(5.6) === 1 && phGrowthFactor(6.9) === 1 && phGrowthFactor(5.3) < 1 && phGrowthFactor(7.0) < 1 && phGrowthFactor(4.5) < phGrowthFactor(5.3) && phGrowthFactor(NaN) === 1);
}

// 7 · tablas de las marcas
{
  const names = new Set(NUTRIENT_BRANDS_DATABASE.flatMap((b) => b.stages.flatMap((s) => s.dosageMlPerLiter.map((d) => d.productName))));
  const unknown = [...names].filter((n) => !ingredientForProduct(n) && !/agua pura/i.test(n));
  ok('todos los productos de las 3 marcas tienen composición', unknown.length === 0, JSON.stringify(unknown));
  ok('«Agua pura» y desconocidos no aportan', Object.keys(dosesFromTable([{ productName: 'Agua pura sin nutrientes', mlPerL: 5 }, { productName: 'Cosa rara', mlPerL: 1 }])).length === 0);
  const an = NUTRIENT_BRANDS_DATABASE.find((b) => b.id === 'advanced_nutrients')!;
  const st = an.stages[1];
  const strength = strengthForEc(st.dosageMlPerLiter, 'soft', 1.35);
  const got = solve(mix('soft', dosesFromTable(st.dosageMlPerLiter, strength))).ec;
  ok('strengthForEc: con esa fuerza la EC calculada es la objetivo (±0,03)', near(got, 1.35, 0.03) && strength > 0.3 && strength < 2.5, `(fuerza ${strength}, EC ${got})`);
  ok('con agua dura hace falta menos base que con ósmosis para la misma EC (el agua ya trae nutrientes)', strengthForEc(st.dosageMlPerLiter, 'hard', 1.35) < strengthForEc(st.dosageMlPerLiter, 'ro', 1.35));
  ok('recetas sin elementos (lavado, estimuladores) usan la dosis impresa', strengthForEc([{ productName: 'Flawless Finish Quelante', mlPerL: 2 }], 'ro', 0.3) === 1 && strengthForEc([{ productName: 'Root-Juice (Estimulador)', mlPerL: 2 }], 'ro', 0.6) === 1);
  let allFinite = true;
  for (const b of NUTRIENT_BRANDS_DATABASE) for (const s of b.stages) for (const w of WATERS) { const r = solve(mix(w.id, dosesFromTable(s.dosageMlPerLiter, 1))); if (![r.ec, r.ph, ...Object.values(r.ppm)].every(Number.isFinite)) allFinite = false; }
  ok('ninguna tabla × agua produce valores no numéricos', allFinite);
  ok('los ingredientes tienen dosis máxima y paso válidos', Object.values(INGREDIENTS).every((i) => i.max > 0 && i.step > 0 && i.step <= i.max));
}

// 8 · retos: cada uno se puede ganar y ninguno está ganado de entrada
{
  const solve5 = (id: string, doses: Record<string, number>) => { const ch = CHALLENGES.find((c) => c.id === id)!; const m = mix(ch.water, doses); const s = solve(m); const d = diagnose(s, ch.stage, ch.medium); return { ...ch.goal(s, d, m), score: d.score, ph: s.ph, ec: s.ec }; };
  for (const ch of CHALLENGES) {
    const m = mix(ch.water, { ...(ch.preset ?? {}) }); const s = solve(m);
    ok(`reto «${ch.title}» no está ganado de entrada`, !ch.goal(s, diagnose(s, ch.stage, ch.medium), m).ok);
  }
  const flush = solve5('flush', { ph_up: 0.02, flawless_finish: 0.5 });
  ok('reto lavado: una gota de pH Up + quelante lo gana', flush.ok, JSON.stringify(flush));
  const bloom = solve5('salts_bloom', { cal_nitrate: 0.55, mkp: 0.3, k2so4: 0.35, kno3: 0.05, fe_eddha: 0.025, epsom: 0.55, calmag: 0.6 });
  ok('reto floración con sales: existe una receta ≥ 85', bloom.ok, JSON.stringify(bloom));
  const coco = solve5('ro_coco', { cal_nitrate: 0.3, mkp: 0.2, k2so4: 0.2, epsom: 0.25, fe_eddha: 0.025, calmag: 0.6, ph_perfect_micro: 1.5 });
  ok('reto coco con ósmosis: existe una receta ≥ 80', coco.ok, JSON.stringify(coco));
  const rescue = solve5('rescue', { ph_perfect_grow: 3, ph_perfect_micro: 3, ph_perfect_bloom: 2 });
  ok('reto rescate: la mitad de las dosis lo resuelve', rescue.ok, JSON.stringify(rescue));
  const tap = solve5('tap_veg', { acid_nitric: 6.6, cal_nitrate: 0.2, mkp: 0.2, kno3: 0.15, epsom: 0.1, fe_eddha: 0.03 });
  ok('reto agua dura: nítrico + sales lo gana (con fosfórico se pasa de P)', tap.ok && !solve5('tap_veg', { ph_down: 1.6, cal_nitrate: 0.2, mkp: 0.2, kno3: 0.15, epsom: 0.1, fe_eddha: 0.03 }).ok, JSON.stringify(tap));
}

console.log(failed ? `\n${failed} FALLOS` : '\nTodo OK');
process.exit(failed ? 1 : 0);
