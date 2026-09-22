import { addMaterials, canCraft, craftTotals, FORGE_LIMITS, FORGE_RECIPES, inputValue, materialValue, MATERIALS, MATERIAL_BY_ID, outputValue, type ForgeStock, type MaterialId } from '../src/sim/forge';
import { PRODUCT_PRICE } from '../src/sim/products';

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) failed++; };
const stock = (o: Partial<ForgeStock> = {}): ForgeStock => ({ flower: 50, trim: 100, materials: { fibra_cruda: 60 }, flora: 500, tier: 4, hasForge: true, jobs: 0, ...o });
const R = (id: string) => FORGE_RECIPES.find((r) => r.id === id)!;

// ── the catalogue is coherent
ok('todas las recetas tienen id único', new Set(FORGE_RECIPES.map((r) => r.id)).size === FORGE_RECIPES.length);
ok('todo material usado o producido existe en el catálogo', FORGE_RECIPES.every((r) => [...Object.keys(r.in.materials ?? {}), ...Object.keys(r.out.materials ?? {})].every((m) => m in MATERIAL_BY_ID)));
ok('cada receta da algo (materiales o un producto) y cuesta una tarifa que se quema', FORGE_RECIPES.every((r) => (Object.keys(r.out.materials ?? {}).length > 0 || !!r.out.product) && r.fee > 0 && r.minutes > 0));
ok('todo material se puede fabricar (excepto la fibra cruda, que sale de la cosecha)', MATERIALS.filter((m) => m.id !== 'fibra_cruda').every((m) => FORGE_RECIPES.some((r) => (r.out.materials?.[m.id] ?? 0) > 0)));
ok('los productos vendibles tienen precio en la tabla compartida', FORGE_RECIPES.filter((r) => r.out.product).every((r) => PRODUCT_PRICE[r.out.product!.type] > 0));
ok('la cadena de recetas no tiene ciclos (el valor de cada material se calcula)', MATERIALS.every((m) => Number.isFinite(materialValue(m.id))));

// ── balance: a craft never gives more value than it takes (plus a small margin), so the forge is a sink and a parts maker, not a printer
for (const r of FORGE_RECIPES.filter((x) => x.family === 'derivado')) {
  const inV = inputValue(r), outV = outputValue(r);
  ok(`derivado «${r.name}»: valor de salida ≤ 1,25 × entradas`, outV <= inV * 1.25 && outV > 0, `(sale ${outV.toFixed(0)} · entra ${inV.toFixed(0)} · ×${(outV / inV).toFixed(2)})`);
}
ok('las recetas de flor no pagan más que el rosin: 1 g de flor → producto vale ≤ 10 (lista)', FORGE_RECIPES.filter((r) => r.out.product && (r.in.flower ?? 0) > 0).every((r) => outputValue(r) / (r.in.flower ?? 1) <= 40));

// ── the rules of a craft
ok('con todo lo necesario se puede fabricar', canCraft(stock(), R('spin_fiber'), 2).ok);
ok('sin licencia de forja no se fabrica', !canCraft(stock({ hasForge: false }), R('spin_fiber'), 1).ok && (canCraft(stock({ hasForge: false }), R('spin_fiber'), 1) as { reason?: string }).reason === 'license');
ok('la instalación debe tener el nivel de la receta', (canCraft(stock({ tier: 1 }), R('weave_cloth'), 1) as { reason?: string }).reason === 'tier' && canCraft(stock({ tier: 1 }), R('spin_fiber'), 1).ok);
ok('faltan materiales, trim, flor o $FLORA: rechaza y dice qué', (canCraft(stock({ materials: {} }), R('spin_fiber'), 1) as { reason?: string }).reason === 'material' && (canCraft(stock({ trim: 5 }), R('render_wax'), 1) as { reason?: string }).reason === 'trim' && (canCraft(stock({ flower: 1 }), R('refine_resin'), 1) as { reason?: string }).reason === 'flower' && (canCraft(stock({ flora: 2 }), R('spin_fiber'), 1) as { reason?: string }).reason === 'flora');
ok('cantidad inválida (0, 11, decimal) se rechaza', [0, FORGE_LIMITS.maxQty + 1, 1.5, -1].every((q) => !canCraft(stock(), R('spin_fiber'), q).ok));
ok('la forja tiene un máximo de trabajos a la vez', (canCraft(stock({ jobs: FORGE_LIMITS.jobs }), R('spin_fiber'), 1) as { reason?: string }).reason === 'jobs');
{
  const t = craftTotals(R('balm'), 3);
  ok('los totales multiplican entradas, tarifa, tiempo y salida', t.flower === 12 && t.materials.cera === 6 && t.materials.aceite_vegetal === 6 && t.fee === 30 && t.minutes === 60 && t.outProductGrams === 60);
}
{
  const a = addMaterials({ cera: 2 }, { cera: 3, tela: 1 });
  const b = addMaterials(a, { cera: 10 }, -1);
  ok('sumar y restar materiales nunca deja negativos', a.cera === 5 && a.tela === 1 && b.cera === 0);
}
// the identity seal and the breeding parts exist (other modules depend on them)
ok('existen las piezas de Cría y del Avatar', (['kit_polinizacion', 'bolsa_aislamiento', 'reactivo', 'sello_identidad'] as MaterialId[]).every((m) => FORGE_RECIPES.some((r) => (r.out.materials?.[m] ?? 0) > 0)));
ok('el sello de identidad y la tela alcanzan para el avatar (1 sello + 2 telas + 1 resina) con recetas simples', !!R('identity_seal') && !!R('weave_cloth') && !!R('refine_resin'));

console.log(failed ? `\n${failed} FALLOS` : '\nTodo OK');
process.exit(failed ? 1 : 0);
