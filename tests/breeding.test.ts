import {
  BREEDING_LIMITS, breedingCost, canBreed, capGeneration, CROSS_MINUTES, GEN_LABEL, GEN_VARIANCE, inheritTraits,
  lineageLabel, mulberry32, SEED_BATCH, seedBatchSize, type Generation,
} from '../src/sim/breeding';
import type { Strain } from '../src/types';

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) failed++; };

const strain = (o: Partial<Strain> = {}): Strain => ({
  id: 'base', name: 'Base', lineage: 'Base', type: 'Híbrido', thcPercentage: 20, cbdPercentage: 1,
  terpenes: { myrcene: 0.8, limonene: 0.6, caryophyllene: 0.4, pinene: 0.3, linalool: 0.2 },
  difficulty: 'F2P Fácil', cycleDurationSeconds: 60, resinYieldMultiplier: 1.2, colorTheme: '#fff', description: '', ...o,
});
const mother = strain({ id: 'mother', name: 'Madre OG', thcPercentage: 22, cbdPercentage: 1.4, resinYieldMultiplier: 1.3 });
const father = strain({ id: 'father', name: 'Padre Haze', thcPercentage: 18, cbdPercentage: 0.6, resinYieldMultiplier: 1.0, terpenes: { myrcene: 0.3, limonene: 1.1, caryophyllene: 0.2, pinene: 0.5, linalool: 0.4 } });

// ── generation labels and caps
ok('F1..F4 tienen etiqueta', (['1', '2', '3', '4'] as const).every((g) => !!GEN_LABEL[Number(g) as Generation]));
ok('capGeneration nunca baja de 1 ni sube de 4', capGeneration(0) === 1 && capGeneration(-3) === 1 && capGeneration(4) === 4 && capGeneration(9) === 4 && capGeneration(2.4) === 2);
ok('la varianza baja con cada generación (F1 más inestable que F4)', GEN_VARIANCE[1] > GEN_VARIANCE[2] && GEN_VARIANCE[2] > GEN_VARIANCE[3] && GEN_VARIANCE[3] > GEN_VARIANCE[4]);

// ── determinism: the same seed reproduces the exact same cross
{
  const a = inheritTraits(mother, father, 1, false, mulberry32(42));
  const b = inheritTraits(mother, father, 1, false, mulberry32(42));
  ok('la misma semilla RNG reproduce exactamente el mismo cruce', JSON.stringify(a) === JSON.stringify(b));
  const c = inheritTraits(mother, father, 1, false, mulberry32(43));
  ok('una semilla RNG distinta da un cruce distinto', JSON.stringify(a) !== JSON.stringify(c));
}

// ── bounds: no trait ever runs away from the parents' range, across many crosses
{
  let allBounded = true;
  for (let s = 0; s < 300; s++) {
    const r = inheritTraits(mother, father, ((s % 4) + 1) as Generation, s % 3 === 0, mulberry32(1000 + s));
    const hiTHC = Math.max(mother.thcPercentage, father.thcPercentage) * 1.6 + 1e-6;
    const hiResin = Math.max(mother.resinYieldMultiplier, father.resinYieldMultiplier) * 1.6 + 1e-6;
    if (r.traits.thcPercentage < 0 || r.traits.thcPercentage > hiTHC) allBounded = false;
    if (r.traits.resinYieldMultiplier < Math.min(mother.resinYieldMultiplier, father.resinYieldMultiplier) * 0.4 - 1e-6 || r.traits.resinYieldMultiplier > hiResin) allBounded = false;
    for (const k of Object.keys(r.traits.terpenes) as (keyof typeof r.traits.terpenes)[]) {
      const hiT = Math.max(mother.terpenes[k], father.terpenes[k]) * 1.6 + 1e-6;
      if (r.traits.terpenes[k] < 0 || r.traits.terpenes[k] > hiT) allBounded = false;
    }
  }
  ok('ningún rasgo se escapa del rango de los padres (300 cruces de prueba)', allBounded);
}

// ── variance shrinks with generation: F1 spreads out more than F4 across many seeds
{
  const spread = (gen: Generation) => {
    const vals = Array.from({ length: 400 }, (_, s) => inheritTraits(mother, father, gen, false, mulberry32(5000 + s)).traits.thcPercentage);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    return Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length);
  };
  const sd1 = spread(1), sd4 = spread(4);
  ok('F1 dispersa el THC más que F4 (genética estable)', sd1 > sd4, `(sd F1=${sd1.toFixed(2)} · sd F4=${sd4.toFixed(2)})`);
}

// ── mutation rate: roughly matches the base/reagent chance over many trials
{
  const rate = (hasReagent: boolean) => {
    let hits = 0;
    for (let s = 0; s < 2000; s++) if (inheritTraits(mother, father, 2, hasReagent, mulberry32(9000 + s)).mutated) hits++;
    return hits / 2000;
  };
  // inheritTraits rolls 9 independent traits (thc, cbd, cycle, resin, 5 terpenes), so "mutated" is true if any of them mutates:
  // P(at least one) = 1 - (1 - p)^9.
  const expected = (p: number) => 1 - (1 - p) ** 9;
  const base = rate(false), withReagent = rate(true);
  ok('la tasa de mutación del cruce sin reactivo coincide con el 5% base compuesto en 9 rasgos', Math.abs(base - expected(0.05)) < 0.05, `(medida=${base.toFixed(2)} · esperada=${expected(0.05).toFixed(2)})`);
  ok('el reactivo sube la tasa de mutación al 18% base compuesto en 9 rasgos', Math.abs(withReagent - expected(0.18)) < 0.05, `(medida=${withReagent.toFixed(2)} · esperada=${expected(0.18).toFixed(2)})`);
  ok('el reactivo sube claramente la tasa de mutación del cruce', withReagent > base, `(sin=${base.toFixed(2)} · con=${withReagent.toFixed(2)})`);
}

// ── seed batch: always in range, and vigor/kit push the average up
{
  let allInRange = true;
  for (let s = 0; s < 200; s++) {
    const n = seedBatchSize(s % 101, s % 2 === 0, 0, mulberry32(200 + s));
    if (n < SEED_BATCH.min || n > SEED_BATCH.max + 6) allInRange = false;
  }
  ok('el lote de semillas siempre cae en el rango esperado', allInRange);

  const avg = (vigor: number, kit: boolean) => {
    const vals = Array.from({ length: 300 }, (_, s) => seedBatchSize(vigor, kit, 0, mulberry32(3000 + s)));
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };
  ok('más vigor de la madre da, en promedio, más semillas', avg(100, false) > avg(0, false));
  ok('el kit de polinización sube, en promedio, el lote', avg(50, true) > avg(50, false));
  ok('el seedBonus de personal se suma al lote', seedBatchSize(50, false, 3, mulberry32(1)) >= seedBatchSize(50, false, 0, mulberry32(1)));
}

// ── lineage + generation cap in the label
ok('la etiqueta de linaje nombra madre, padre y generación', lineageLabel(mother, father, 2) === 'Madre OG x Padre Haze (F2)');
ok('una generación fuera de 1..4 se acota en la etiqueta', lineageLabel(mother, father, 9 as Generation) === 'Madre OG x Padre Haze (F4)');

// ── breeding cost + canBreed gate
ok('el cruce siempre pide kit y bolsa; el reactivo es opcional', JSON.stringify(breedingCost(false)) === JSON.stringify({ kit_polinizacion: 1, bolsa_aislamiento: 1 }) && (breedingCost(true).reactivo ?? 0) === 1);

const goodStock = { tier: 4, hasChamber: true, jobs: 0, materials: { kit_polinizacion: 2, bolsa_aislamiento: 2, reactivo: 1 } };
ok('canBreed permite un cruce con todo en regla', canBreed(goodStock, 'mother', 'father', false).ok);
ok('canBreed rechaza cruzar un individuo consigo mismo', !canBreed(goodStock, 'mother', 'mother', false).ok);
ok('canBreed rechaza sin cámara', !canBreed({ ...goodStock, hasChamber: false }, 'mother', 'father', false).ok);
ok('canBreed rechaza instalación por debajo del nivel mínimo', !canBreed({ ...goodStock, tier: BREEDING_LIMITS.minTier - 1 }, 'mother', 'father', false).ok);
ok('canBreed rechaza cuando la cámara ya tiene el máximo de trabajos', !canBreed({ ...goodStock, jobs: BREEDING_LIMITS.jobs }, 'mother', 'father', false).ok);
ok('canBreed rechaza sin materiales suficientes', !canBreed({ ...goodStock, materials: {} }, 'mother', 'father', false).ok);
ok('canBreed exige el reactivo cuando se pide usarlo', !canBreed({ ...goodStock, materials: { kit_polinizacion: 2, bolsa_aislamiento: 2 } }, 'mother', 'father', true).ok);
ok('un cruce en cámara dura horas reales, no es instantáneo', CROSS_MINUTES > 0);

console.log(failed ? `\n${failed} FALLOS` : '\nTodo OK');
process.exit(failed ? 1 : 0);
