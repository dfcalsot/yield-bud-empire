import { ECON } from './economy';
import { PRODUCT_PRICE } from './products';
import { t as tr, k, localize } from '../i18n/core';

/**
 * The forge: turns what a plant leaves behind (trim, fibre) and a little flower into MATERIALS and derived products.
 * Pure module (no React): the recipes, what they need, what they give and the rules that decide whether a craft can start.
 *
 * Three families of recipe:
 *  - base      raw materials (fibre, cord, cloth, paper, wax, oil, resin, biochar, compost);
 *  - component the parts other systems ask for: breeding kits (bags, kit, reagent) and the identity seal of a custom avatar;
 *  - derived   products that sell at the dispensary (balm, candle, tincture).
 * Every craft burns a fee in $FLORA and takes real time. Balance rule (tests/forge.test.ts): a craft never gives more value than it
 * takes, plus a small margin, so the forge is a sink and a maker of parts, never a money printer.
 */
export type MaterialId =
  | 'fibra_cruda' | 'fibra_hilada' | 'cordel' | 'tela' | 'papel' | 'cera' | 'aceite_vegetal' | 'resina_refinada' | 'biochar' | 'compost'
  | 'kit_polinizacion' | 'bolsa_aislamiento' | 'reactivo' | 'sello_identidad';

export type MaterialFamily = 'subproducto' | 'base' | 'componente';
export interface MaterialDef { id: MaterialId; name: string; family: MaterialFamily; icon: string; use: string }

export const MATERIALS: readonly MaterialDef[] = localize<readonly MaterialDef[]>([
  { id: 'fibra_cruda', name: k('Fibra cruda'), family: 'subproducto', icon: '🌾', use: k('Sale del tallo al cosechar. Se hila, se prensa o se hace biochar.') },
  { id: 'fibra_hilada', name: k('Fibra hilada'), family: 'base', icon: '🧵', use: k('Hilo fuerte para cordel, tela y mechas de vela.') },
  { id: 'cordel', name: k('Cordel de cáñamo'), family: 'base', icon: '🪢', use: k('Ata bolsas y sostiene mallas de entrenamiento.') },
  { id: 'tela', name: k('Tela de cáñamo'), family: 'base', icon: '🧶', use: k('Bolsas de aislamiento y ropa del avatar propio.') },
  { id: 'papel', name: k('Papel de cáñamo'), family: 'base', icon: '📄', use: k('Etiquetas y envoltorio de kits y sellos.') },
  { id: 'cera', name: k('Cera vegetal'), family: 'base', icon: '🕯️', use: k('Base de bálsamos y velas; sella los kits.') },
  { id: 'aceite_vegetal', name: k('Aceite vegetal'), family: 'base', icon: '🫒', use: k('Portador de bálsamos, tinturas y reactivos.') },
  { id: 'resina_refinada', name: k('Resina refinada'), family: 'base', icon: '🍯', use: k('Ingrediente noble: reactivos y sellos.') },
  { id: 'biochar', name: k('Biochar'), family: 'base', icon: '⚫', use: k('Carbón vegetal para mejorar sustratos (uso futuro en Cultivo).') },
  { id: 'compost', name: k('Compost'), family: 'base', icon: '🟤', use: k('Sustrato vivo (uso futuro en Cultivo y Cría).') },
  { id: 'kit_polinizacion', name: k('Kit de polinización'), family: 'componente', icon: '🧪', use: k('Cría: cada cruce consume uno.') },
  { id: 'bolsa_aislamiento', name: k('Bolsa de aislamiento'), family: 'componente', icon: '🛍️', use: k('Cría: protege la flor de polen ajeno.') },
  { id: 'reactivo', name: k('Reactivo de germinación'), family: 'componente', icon: '⚗️', use: k('Cría: sube la probabilidad de mutación útil.') },
  { id: 'sello_identidad', name: k('Sello de identidad'), family: 'componente', icon: '🔏', use: k('Avatar propio: requisito para acuñarlo como NFT.') },
], ['name', 'use']);
export const MATERIAL_BY_ID: Record<MaterialId, MaterialDef> = Object.fromEntries(MATERIALS.map((m) => [m.id, m])) as Record<MaterialId, MaterialDef>;

export type ForgeFamily = 'base' | 'componente' | 'derivado';
export type DerivedType = 'balm' | 'candle' | 'tincture';
export type Materials = Partial<Record<MaterialId, number>>;

export interface ForgeRecipe {
  id: string;
  name: string;
  family: ForgeFamily;
  desc: string;
  /** what one craft takes */
  in: { flower?: number; trim?: number; materials?: Materials };
  /** what one craft gives: materials, or a product to sell (grams of it) */
  out: { materials?: Materials; product?: { type: DerivedType; grams: number; name: string; potency: string } };
  /** $FLORA burned by one craft */
  fee: number;
  /** real time of one craft */
  minutes: number;
  /** installation tier needed (1 armario … 4 hidropónica) */
  minTier: number;
}

export const FORGE_RECIPES: readonly ForgeRecipe[] = localize<readonly ForgeRecipe[]>([
  // ── base
  { id: 'spin_fiber', name: k('Hilar fibra'), family: 'base', desc: k('Peinas y tuerces la fibra cruda en hilo.'), in: { materials: { fibra_cruda: 10 } }, out: { materials: { fibra_hilada: 6 } }, fee: 4, minutes: 8, minTier: 1 },
  { id: 'twist_cord', name: k('Trenzar cordel'), family: 'base', desc: k('Trenzas hilo en cordel resistente.'), in: { materials: { fibra_hilada: 4 } }, out: { materials: { cordel: 2 } }, fee: 3, minutes: 5, minTier: 1 },
  { id: 'weave_cloth', name: k('Tejer tela'), family: 'base', desc: k('Un telar sencillo convierte el hilo en tela.'), in: { materials: { fibra_hilada: 6 } }, out: { materials: { tela: 2 } }, fee: 6, minutes: 12, minTier: 2 },
  { id: 'press_paper', name: k('Prensar papel'), family: 'base', desc: k('Pulpa de fibra prensada y secada.'), in: { materials: { fibra_cruda: 8 } }, out: { materials: { papel: 4 } }, fee: 3, minutes: 6, minTier: 1 },
  { id: 'render_wax', name: k('Extraer cera'), family: 'base', desc: k('Del trim se obtiene una cera vegetal limpia.'), in: { trim: 20 }, out: { materials: { cera: 5 } }, fee: 5, minutes: 10, minTier: 1 },
  { id: 'press_oil', name: k('Aceite vegetal'), family: 'base', desc: k('Infusión en frío del trim en aceite portador.'), in: { trim: 15 }, out: { materials: { aceite_vegetal: 4 } }, fee: 4, minutes: 10, minTier: 1 },
  { id: 'refine_resin', name: k('Refinar resina'), family: 'base', desc: k('La flor se lava y concentra en resina noble.'), in: { flower: 6 }, out: { materials: { resina_refinada: 2 } }, fee: 8, minutes: 15, minTier: 2 },
  { id: 'make_biochar', name: k('Pirólisis (biochar)'), family: 'base', desc: k('Fibra quemada sin oxígeno: carbón para sustratos.'), in: { materials: { fibra_cruda: 12 } }, out: { materials: { biochar: 3 } }, fee: 4, minutes: 10, minTier: 2 },
  { id: 'make_compost', name: k('Compostar'), family: 'base', desc: k('Trim y fibra se hacen tierra viva.'), in: { trim: 10, materials: { fibra_cruda: 5 } }, out: { materials: { compost: 4 } }, fee: 2, minutes: 12, minTier: 1 },
  // ── components for breeding and the custom avatar
  { id: 'pollination_kit', name: k('Kit de polinización'), family: 'componente', desc: k('Pinceles, papel y cera de sellado para un cruce.'), in: { materials: { papel: 2, cera: 1 } }, out: { materials: { kit_polinizacion: 1 } }, fee: 6, minutes: 8, minTier: 2 },
  { id: 'isolation_bag', name: k('Bolsas de aislamiento'), family: 'componente', desc: k('Tela y cordel: dos bolsas para la flor.'), in: { materials: { tela: 1, cordel: 1 } }, out: { materials: { bolsa_aislamiento: 2 } }, fee: 3, minutes: 6, minTier: 2 },
  { id: 'reagent', name: k('Reactivo de germinación'), family: 'componente', desc: k('Resina y aceite en una solución que estimula el embrión.'), in: { materials: { resina_refinada: 1, aceite_vegetal: 2 } }, out: { materials: { reactivo: 1 } }, fee: 12, minutes: 15, minTier: 3 },
  { id: 'identity_seal', name: k('Sello de identidad'), family: 'componente', desc: k('Un sello de cera y resina con tu marca personal.'), in: { materials: { cera: 2, resina_refinada: 1, papel: 1 } }, out: { materials: { sello_identidad: 1 } }, fee: 20, minutes: 20, minTier: 2 },
  // ── derived products (sell at the dispensary)
  { id: 'balm', name: k('Bálsamo botánico'), family: 'derivado', desc: k('Cera, aceite y flor en una lata de bálsamo.'), in: { flower: 4, materials: { cera: 2, aceite_vegetal: 2 } }, out: { product: { type: 'balm', grams: 20, name: k('Bálsamo botánico (lata 20 g)'), potency: k('Cera + aceite + flor') } }, fee: 10, minutes: 20, minTier: 2 },
  { id: 'candle', name: k('Vela aromática'), family: 'derivado', desc: k('Cera vegetal con mecha de cáñamo.'), in: { materials: { cera: 3, fibra_hilada: 1 } }, out: { product: { type: 'candle', grams: 24, name: k('Vela aromática (24 g)'), potency: k('Cera vegetal') } }, fee: 6, minutes: 15, minTier: 2 },
  { id: 'tincture', name: k('Tintura'), family: 'derivado', desc: k('Flor macerada en aceite portador.'), in: { flower: 3, materials: { aceite_vegetal: 1 } }, out: { product: { type: 'tincture', grams: 10, name: k('Tintura (frasco 10 g)'), potency: k('Maceración en aceite') } }, fee: 8, minutes: 18, minTier: 2 },
], ['name', 'desc', 'potency']);
export const FORGE_RECIPE_BY_ID: Record<string, ForgeRecipe> = Object.fromEntries(FORGE_RECIPES.map((r) => [r.id, r]));

/** most crafts running at once, and the most a single order can repeat */
export const FORGE_LIMITS = { jobs: 3, maxQty: 10 } as const;
/** what the forge and the harvest give for free */
export const FIBRE_PER_FLOWER_GRAM = 0.5;

export interface ForgeStock { flower: number; trim: number; materials: Materials; flora: number; tier: number; hasForge: boolean; jobs: number; /** extra slots from the empire rank */ extraJobs?: number }
export type CraftCheck = { ok: true } | { ok: false; reason: 'license' | 'tier' | 'jobs' | 'qty' | 'flower' | 'trim' | 'material' | 'flora'; message: string };

/** total inputs, fee, time and outputs of `qty` crafts */
export function craftTotals(r: ForgeRecipe, qty: number) {
  const mul = (m?: Materials) => Object.fromEntries(Object.entries(m ?? {}).map(([k, v]) => [k, (v as number) * qty])) as Materials;
  return {
    flower: (r.in.flower ?? 0) * qty, trim: (r.in.trim ?? 0) * qty, materials: mul(r.in.materials), fee: r.fee * qty, minutes: r.minutes * qty,
    outMaterials: mul(r.out.materials), outProductGrams: (r.out.product?.grams ?? 0) * qty,
  };
}

/** can `qty` crafts of this recipe start now? Says why not, in words a player understands. */
export function canCraft(stock: ForgeStock, r: ForgeRecipe, qty: number): CraftCheck {
  if (!Number.isInteger(qty) || qty < 1 || qty > FORGE_LIMITS.maxQty) return { ok: false, reason: 'qty', message: tr('Elige entre 1 y {maxQty} unidades.', { maxQty: FORGE_LIMITS.maxQty }) };
  if (!stock.hasForge) return { ok: false, reason: 'license', message: tr('Necesitas la licencia «Forja de materiales» (Grow Market → Licencias).') };
  if (stock.tier < r.minTier) return { ok: false, reason: 'tier', message: tr('Esta receta pide una instalación de nivel {minTier} o más.', { minTier: r.minTier }) };
  const maxJobs = FORGE_LIMITS.jobs + (stock.extraJobs ?? 0);
  if (stock.jobs >= maxJobs) return { ok: false, reason: 'jobs', message: tr('La forja ya tiene {jobs} trabajos en marcha.', { jobs: maxJobs }) };
  const t = craftTotals(r, qty);
  if (stock.flower + 1e-9 < t.flower) return { ok: false, reason: 'flower', message: tr('Faltan {v0} g de flor seca.', { v0: (t.flower - stock.flower).toFixed(1) }) };
  if (stock.trim + 1e-9 < t.trim) return { ok: false, reason: 'trim', message: tr('Faltan {v0} g de trim.', { v0: (t.trim - stock.trim).toFixed(1) }) };
  for (const [id, need] of Object.entries(t.materials)) {
    const have = stock.materials[id as MaterialId] ?? 0;
    if (have < (need as number)) return { ok: false, reason: 'material', message: tr('Faltan {v0} de {v1}.', { v0: (need as number) - have, v1: MATERIAL_BY_ID[id as MaterialId]?.name ?? id }) };
  }
  if (stock.flora < t.fee) return { ok: false, reason: 'flora', message: tr('La tarifa quema {fee} $FLORA y tienes {v1}.', { fee: t.fee, v1: Math.floor(stock.flora) }) };
  return { ok: true };
}

export const addMaterials = (have: Materials, add: Materials, sign: 1 | -1 = 1): Materials => {
  const out: Materials = { ...have };
  for (const [k, v] of Object.entries(add)) out[k as MaterialId] = Math.max(0, (out[k as MaterialId] ?? 0) + sign * (v as number));
  return out;
};

/* ───────── value model (used by the balance tests) ───────── */
// Values in "list units" (before ECON.priceScale): a gram of flower is worth what cured flower lists at, a gram of trim what the trim
// products pay (≈ 2), a gram of raw fibre 1. A material is worth what went into it, fees included.
export const LIST_VALUE = { flower: PRODUCT_PRICE.cured_flower, trim: 2, fibra_cruda: 1 } as const;
const feeList = (fee: number) => fee / ECON.priceScale;
const memo: Partial<Record<MaterialId, number>> = {};
export function materialValue(id: MaterialId): number {
  if (id === 'fibra_cruda') return LIST_VALUE.fibra_cruda;
  const cached = memo[id]; if (cached !== undefined) return cached;
  const r = FORGE_RECIPES.find((x) => x.out.materials && (x.out.materials[id] ?? 0) > 0);
  if (!r) throw new Error(tr('nada produce {id}', { id }));
  const total = inputValue(r);
  const outCount = Object.values(r.out.materials!).reduce((a, b) => a + (b as number), 0);
  return (memo[id] = total / outCount);
}
export function inputValue(r: ForgeRecipe): number {
  let v = (r.in.flower ?? 0) * LIST_VALUE.flower + (r.in.trim ?? 0) * LIST_VALUE.trim + feeList(r.fee);
  for (const [id, n] of Object.entries(r.in.materials ?? {})) v += (n as number) * materialValue(id as MaterialId);
  return v;
}
export const outputValue = (r: ForgeRecipe): number => (r.out.product ? r.out.product.grams * PRODUCT_PRICE[r.out.product.type] : 0);
