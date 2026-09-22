import { PRODUCT_PRICE, priceOf } from '../src/sim/products';
import { STATIONS } from '../src/lab/stations';

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) failed++; };

const recipes = STATIONS.flatMap((s) => s.recipes);
ok('hay recetas en el laboratorio', recipes.length >= 12, `(${recipes.length})`);
ok('toda receta tiene su precio en la tabla compartida y coincide', recipes.every((r) => PRODUCT_PRICE[r.id] > 0 && r.pricePerGram === PRODUCT_PRICE[r.id]));
ok('todo tipo de producto que se puede vender tiene precio (menos el merch V2P)', recipes.every((r) => priceOf(r.type, r.id) !== undefined) && priceOf('v2p_merch') === undefined && priceOf('inventado') === undefined);
ok('una receta manda sobre su tipo (diamantes valen más que la sopa)', (priceOf('terpene_sauce', 'diamonds') ?? 0) > (priceOf('terpene_sauce') ?? 0) && (priceOf('bubble_hash', 'full_melt') ?? 0) > (priceOf('bubble_hash') ?? 0));

// balance: no station may pay more for a gram of flower than the rosin press does (≈ 9.9 list units), and trim (a free by-product) pays ≈ 2 at most
const perInput = (r: (typeof recipes)[number]) => r.yieldRatio * r.pricePerGram;
const flower = recipes.filter((r) => r.inputKind === 'flower').map((r) => [r.id, perInput(r)] as const);
const trim = recipes.filter((r) => r.inputKind === 'trim').map((r) => [r.id, perInput(r)] as const);
ok('ninguna receta de flor paga más que el rosin por gramo de flor', flower.every(([, v]) => v <= 10.01), JSON.stringify(flower.map(([i, v]) => `${i}:${v.toFixed(2)}`)));
ok('el trim (subproducto gratis) rinde como máximo ≈ 2 por gramo', trim.every(([, v]) => v <= 2.01), JSON.stringify(trim.map(([i, v]) => `${i}:${v.toFixed(2)}`)));
ok('el pre-roll y el puro ya no superan al rosin (antes daban 15 y 23)', perInput(recipes.find((r) => r.id === 'preroll')!) < 9.9 && perInput(recipes.find((r) => r.id === 'cigar')!) < 9.9);
ok('los precios base de los 4 productos originales no cambian', PRODUCT_PRICE.live_rosin === 45 && PRODUCT_PRICE.cured_flower === 9 && PRODUCT_PRICE.full_spec_oil === 25 && PRODUCT_PRICE.pure_terpenes === 85);

console.log(failed ? `\n${failed} FALLOS` : '\nTodo OK');
process.exit(failed ? 1 : 0);
