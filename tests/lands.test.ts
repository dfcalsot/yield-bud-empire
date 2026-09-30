import { LAND_RARITY_RANK, landPrice, landRarity, type LandRarity } from '../src/sim/lands';
import { REGIONS, plotOffer } from '../src/sim/terroir';

let failed = 0;
const ok = (name: string, cond: boolean, extra = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!cond) failed++; };

ok('cortes de rareza', landRarity(7.2) === 'common' && landRarity(8.09) === 'common' && landRarity(8.1) === 'rare' && landRarity(8.6) === 'epic' && landRarity(9.0) === 'legendary' && landRarity(9.3) === 'legendary');

const all = REGIONS.flatMap((r) => Array.from({ length: r.supply }, (_, i) => plotOffer(r.id, i + 1)));
const count: Record<LandRarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
all.forEach((o) => { count[landRarity(o.landRating)]++; });
console.log('  reparto:', JSON.stringify(count), 'de', all.length);
ok('existen las cuatro rarezas', Object.values(count).every((n) => n > 0));
ok('las legendarias son ≤ 12 % del planeta', count.legendary / all.length <= 0.12, `(${(count.legendary / all.length * 100).toFixed(1)} %)`);
ok('las comunes no son la mayoría absoluta ni una rareza', count.common / all.length > 0.1 && count.common < all.length * 0.6);

// price follows quality inside a region, so a better land is never cheaper
ok('mejor nota nunca cuesta menos (misma región)', REGIONS.every((r) => {
  const o = Array.from({ length: r.supply }, (_, i) => plotOffer(r.id, i + 1)).sort((a, b) => a.landRating - b.landRating);
  return o.every((x, i) => i === 0 || x.priceFlora >= o[i - 1].priceFlora);
}));
ok('la oferta es determinista', JSON.stringify(plotOffer('jamaica', 7)) === JSON.stringify(plotOffer('jamaica', 7)));
ok('el rango de rareza ordena', LAND_RARITY_RANK.legendary > LAND_RARITY_RANK.epic && LAND_RARITY_RANK.epic > LAND_RARITY_RANK.rare && LAND_RARITY_RANK.rare > LAND_RARITY_RANK.common);

// price: ×10 on 2026-09-30, and every land already owned makes the next one 25 % dearer
const prices = all.map((o) => o.priceFlora);
ok('una tierra cuesta entre ~2 000 y ~8 000 $FLORA', Math.min(...prices) >= 2000 && Math.max(...prices) <= 8000, `(${Math.min(...prices)}–${Math.max(...prices)})`);
ok('la segunda cuesta 25 % más y la duodécima 3,75× la primera', landPrice(4000, 0) === 4000 && landPrice(4000, 1) === 5000 && landPrice(4000, 11) === 15000);

console.log(failed === 0 ? '\nALL OK' : `\n${failed} FAILED`);
process.exit(failed ? 1 : 0);
