/**
 * Ciencia de la nutrición del cultivo, pura (sin React, sin globals) y testeada: lo que un grower real tiene que dominar.
 *
 *  - Ingredientes con su composición en mg/L de cada elemento por unidad de dosis (sales exactas por estequiometría; botellas
 *    comerciales como *análisis típico aproximado de su clase*, no la etiqueta exacta del fabricante).
 *  - Agua de origen: alcalinidad (el "colchón" que hace subir el pH), dureza (Ca/Mg que ya trae) y conductividad base.
 *  - pH por alcalinidad residual (modelo didáctico de bicarbonato), acidificantes/alcalinizantes, EC por iones.
 *  - Disponibilidad por pH (bloqueos), antagonismos (K vs Ca/Mg, Ca:Mg) y diagnóstico con síntomas reales.
 */

export type ElementId = 'N' | 'P' | 'K' | 'Ca' | 'Mg' | 'S' | 'Fe';
export const ELEMENT_IDS: ElementId[] = ['N', 'P', 'K', 'Ca', 'Mg', 'S', 'Fe'];
export type Ppm = Record<ElementId, number>;
const zero = (): Ppm => ({ N: 0, P: 0, K: 0, Ca: 0, Mg: 0, S: 0, Fe: 0 });

export const ELEMENTS: Record<ElementId, { name: string; symbol: string; role: string; mobile: boolean; color: string }> = {
  N: { name: 'Nitrógeno', symbol: 'N', role: 'Clorofila, proteínas y crecimiento vegetativo', mobile: true, color: '#34d399' },
  P: { name: 'Fósforo', symbol: 'P', role: 'Energía (ATP), raíces y formación de flores', mobile: true, color: '#c084fc' },
  K: { name: 'Potasio', symbol: 'K', role: 'Agua, resistencia y engorde de cogollos', mobile: true, color: '#fbbf24' },
  Ca: { name: 'Calcio', symbol: 'Ca', role: 'Paredes celulares y raíces; no se mueve dentro de la planta', mobile: false, color: '#f472b6' },
  Mg: { name: 'Magnesio', symbol: 'Mg', role: 'Centro de la clorofila (fotosíntesis)', mobile: true, color: '#4ade80' },
  S: { name: 'Azufre', symbol: 'S', role: 'Aminoácidos, terpenos y aroma', mobile: false, color: '#fde047' },
  Fe: { name: 'Hierro', symbol: 'Fe', role: 'Síntesis de clorofila; el primero en bloquearse con pH alto', mobile: false, color: '#fb923c' },
};

/* ───────────────────────────── ingredientes ───────────────────────────── */

export type IngredientKind = 'salt' | 'liquid' | 'acid' | 'base' | 'booster' | 'stimulant' | 'flush';

export interface Ingredient {
  id: string;
  name: string;
  kind: IngredientKind;
  unit: 'g' | 'ml';
  /** mg/L de cada elemento aportados por 1 unidad de dosis por litro (1 g/L o 1 ml/L) */
  per: Partial<Ppm>;
  /** alcalinidad aportada por unidad/L en mEq/L (negativa = ácido) */
  alkMeq?: number;
  organic?: boolean;
  /** puntos de bioestimulación por unidad/L (no aportan elementos; mejoran raíces y estrés si la base es buena) */
  bio?: number;
  flush?: boolean;
  /** dosis máxima razonable en la interfaz y su paso */
  max: number;
  step: number;
  color: string;
  blurb: string;
  brand?: string;
  /** análisis aproximado de su clase (no el de la etiqueta) */
  approx?: boolean;
}

const I = (x: Ingredient) => x;

/** Sales y correctores: composición exacta por estequiometría. */
export const SALTS: Ingredient[] = [
  I({ id: 'cal_nitrate', name: 'Nitrato de calcio', kind: 'salt', unit: 'g', per: { N: 155, Ca: 190 }, max: 1.5, step: 0.05, color: '#f9a8d4',
    blurb: 'Ca(NO₃)₂·4H₂O, 15,5-0-0 + 19 % Ca. La fuente clásica de calcio y nitrógeno nítrico: no se mezcla concentrado con sulfatos o fosfatos (precipita).' }),
  I({ id: 'mkp', name: 'MKP (fosfato monopotásico)', kind: 'salt', unit: 'g', per: { P: 227, K: 282 }, max: 0.8, step: 0.05, color: '#d8b4fe',
    blurb: 'KH₂PO₄, 0-52-34. Fósforo y potasio limpios para prefloración y floración.' }),
  I({ id: 'k2so4', name: 'Sulfato de potasio', kind: 'salt', unit: 'g', per: { K: 415, S: 180 }, max: 1.0, step: 0.05, color: '#fde68a',
    blurb: 'K₂SO₄, 0-0-50 + 18 % S. Potasio sin nitrógeno ni cloruros: engorde de flor.' }),
  I({ id: 'epsom', name: 'Sal de Epsom (sulfato de magnesio)', kind: 'salt', unit: 'g', per: { Mg: 98, S: 130 }, max: 1.0, step: 0.05, color: '#bbf7d0',
    blurb: 'MgSO₄·7H₂O, 9,8 % Mg + 13 % S. Corrige carencias de magnesio en minutos.' }),
  I({ id: 'kno3', name: 'Nitrato de potasio', kind: 'salt', unit: 'g', per: { N: 130, K: 382 }, max: 1.0, step: 0.05, color: '#a7f3d0',
    blurb: 'KNO₃, 13-0-46. Empuja N y K juntos; útil en transición.' }),
  I({ id: 'fe_eddha', name: 'Hierro quelatado (Fe-EDDHA 6 %)', kind: 'salt', unit: 'g', per: { Fe: 60 }, max: 0.12, step: 0.005, color: '#fdba74',
    blurb: 'El quelato EDDHA mantiene el hierro disponible incluso a pH alto (el EDTA se rompe por encima de 6,5).' }),
  I({ id: 'calmag', name: 'Cal-Mag líquido', kind: 'liquid', unit: 'ml', per: { N: 8, Ca: 55, Mg: 16 }, max: 3, step: 0.1, color: '#f0abfc', approx: true,
    blurb: 'Suplemento típico ≈ 5 % Ca + 1,5 % Mg. Imprescindible con agua de ósmosis y en coco, que atrapa calcio y magnesio.' }),
  I({ id: 'ph_down', name: 'pH Down (ácido fosfórico)', kind: 'acid', unit: 'ml', per: { P: 74 }, alkMeq: -2.4, max: 3, step: 0.02, color: '#fca5a5', approx: true,
    blurb: 'El "pH Down" comercial típico. Cada ml/L neutraliza ≈ 2,4 mEq/L de alcalinidad… y aporta fósforo: con agua dura acabas pasándote de P. Cuidado al pasarte: el pH cae en picada.' }),
  I({ id: 'acid_nitric', name: 'Ácido nítrico diluido (≈3 %)', kind: 'acid', unit: 'ml', per: { N: 7.9 }, alkMeq: -0.56, max: 15, step: 0.05, color: '#fdba74', approx: true,
    blurb: 'Ácido fuerte ya diluido (1:10) para poder dosificarlo con precisión: neutraliza 0,56 mEq/L por ml y aporta nitrógeno, que sí quieres en vegetativo. Nunca lo manejes concentrado: guantes, gafas y siempre ácido sobre agua.' }),
  I({ id: 'acid_sulfuric', name: 'Ácido sulfúrico diluido (≈3 %)', kind: 'acid', unit: 'ml', per: { S: 11.9 }, alkMeq: -0.75, max: 10, step: 0.05, color: '#fde047', approx: true,
    blurb: 'Ácido fuerte diluido (1:10): neutraliza 0,75 mEq/L por ml y aporta azufre. Es el más barato y limpio para agua dura; mide con precisión y añade siempre el ácido al agua.' }),
  I({ id: 'ph_up', name: 'pH Up (hidróxido de potasio)', kind: 'base', unit: 'ml', per: { K: 176 }, alkMeq: 4.5, max: 2, step: 0.02, color: '#93c5fd', approx: true,
    blurb: 'KOH: sube el pH aportando potasio. Con agua de ósmosis (sin colchón) basta una gota. Es mejor no necesitarlo.' }),
];

/**
 * Botellas comerciales del juego. Análisis *típico aproximado* por clase de producto (Grow, Micro, Bloom, PK, bioestimulante)
 * multiplicado por la potencia calibrada de cada marca (ver BRAND_POTENCY), de modo que sus tablas oficiales den la EC que anuncian.
 */
export const BRAND_INGREDIENTS: Ingredient[] = [
  // Advanced Nutrients
  I({ id: 'ph_perfect_grow', name: 'pH Perfect Grow', kind: 'liquid', unit: 'ml', brand: 'advanced_nutrients', approx: true, per: { N: 38, P: 6, K: 55, Mg: 7, S: 5 }, max: 6, step: 0.25, color: '#5eead4', blurb: 'Base rica en N y K para el crecimiento.' }),
  I({ id: 'ph_perfect_micro', name: 'pH Perfect Micro', kind: 'liquid', unit: 'ml', brand: 'advanced_nutrients', approx: true, per: { N: 42, K: 6, Ca: 58, Mg: 5, Fe: 1.0 }, max: 6, step: 0.25, color: '#67e8f9', blurb: 'Base de calcio, nitrógeno y micronutrientes.' }),
  I({ id: 'ph_perfect_bloom', name: 'pH Perfect Bloom', kind: 'liquid', unit: 'ml', brand: 'advanced_nutrients', approx: true, per: { P: 46, K: 62, Mg: 11, S: 9, Fe: 0.4 }, max: 6, step: 0.25, color: '#c4b5fd', blurb: 'Base de fósforo y potasio para floración.' }),
  I({ id: 'b52', name: 'B-52 Booster', kind: 'stimulant', unit: 'ml', brand: 'advanced_nutrients', approx: true, per: { N: 1 }, bio: 1.0, max: 4, step: 0.25, color: '#fcd34d', blurb: 'Complejo de vitaminas B: ayuda a la planta a gestionar el estrés. No sustituye a la base.' }),
  I({ id: 'big_bud', name: 'Big Bud (PK)', kind: 'booster', unit: 'ml', brand: 'advanced_nutrients', approx: true, per: { P: 28, K: 40 }, bio: 0.4, max: 6, step: 0.25, color: '#e879f9', blurb: 'Refuerzo de fósforo-potasio para engordar cogollos.' }),
  I({ id: 'overdrive', name: 'Overdrive (fin de floración)', kind: 'booster', unit: 'ml', brand: 'advanced_nutrients', approx: true, per: { P: 24, K: 34 }, bio: 0.5, max: 6, step: 0.25, color: '#f0abfc', blurb: 'Impulso final de PK antes del lavado.' }),
  I({ id: 'flawless_finish', name: 'Flawless Finish (quelante)', kind: 'flush', unit: 'ml', brand: 'advanced_nutrients', approx: true, per: {}, flush: true, max: 8, step: 0.5, color: '#e2e8f0', blurb: 'Agente quelante para el lavado: arrastra sales acumuladas en el sustrato.' }),
  // BioBizz (orgánico: el N-P-K solo está disponible cuando los microbios lo mineralizan)
  I({ id: 'bio_grow', name: 'Bio-Grow', kind: 'liquid', unit: 'ml', brand: 'biobizz_organic', organic: true, approx: true, per: { N: 30, P: 8, K: 40, Ca: 10, Mg: 6, S: 6 }, max: 8, step: 0.25, color: '#86efac', blurb: 'Fertilizante orgánico de crecimiento (humus y extracto de algas).' }),
  I({ id: 'bio_bloom', name: 'Bio-Bloom', kind: 'liquid', unit: 'ml', brand: 'biobizz_organic', organic: true, approx: true, per: { N: 5, P: 32, K: 50, Mg: 8, S: 12 }, max: 8, step: 0.25, color: '#fdba74', blurb: 'Orgánico de floración, rico en P y K.' }),
  I({ id: 'top_max', name: 'Top-Max', kind: 'stimulant', unit: 'ml', brand: 'biobizz_organic', organic: true, approx: true, per: { K: 4 }, bio: 0.8, max: 6, step: 0.25, color: '#fde047', blurb: 'Estimulador orgánico de floración.' }),
  I({ id: 'alg_a_mic', name: 'Alg-A-Mic', kind: 'stimulant', unit: 'ml', brand: 'biobizz_organic', organic: true, approx: true, per: { K: 10 }, bio: 1.0, max: 6, step: 0.25, color: '#5eead4', blurb: 'Extracto de algas: hormonas naturales y micronutrientes.' }),
  I({ id: 'bio_heaven', name: 'Bio-Heaven', kind: 'stimulant', unit: 'ml', brand: 'biobizz_organic', organic: true, approx: true, per: { N: 6 }, bio: 0.9, max: 6, step: 0.25, color: '#a7f3d0', blurb: 'Aminoácidos y energía para raíces y microbioma.' }),
  I({ id: 'root_juice', name: 'Root-Juice', kind: 'stimulant', unit: 'ml', brand: 'biobizz_organic', organic: true, approx: true, per: {}, bio: 0.9, max: 6, step: 0.25, color: '#fcd34d', blurb: 'Estimulador de raíces y de la vida del sustrato.' }),
  // Athena
  I({ id: 'athena_core', name: 'Athena Core', kind: 'liquid', unit: 'ml', brand: 'athena_pro', approx: true, per: { N: 60, Ca: 75, Mg: 22, Fe: 0.8 }, max: 6, step: 0.25, color: '#7dd3fc', blurb: 'Base N-Ca-Mg de la línea Blended.' }),
  I({ id: 'athena_grow', name: 'Athena Grow', kind: 'liquid', unit: 'ml', brand: 'athena_pro', approx: true, per: { N: 42, P: 9, K: 55, S: 6 }, max: 6, step: 0.25, color: '#6ee7b7', blurb: 'Fase de crecimiento (N-P-K-S).' }),
  I({ id: 'athena_bloom', name: 'Athena Bloom', kind: 'liquid', unit: 'ml', brand: 'athena_pro', approx: true, per: { P: 50, K: 70, S: 10 }, max: 6, step: 0.25, color: '#d8b4fe', blurb: 'Fase de floración (P-K-S).' }),
  I({ id: 'bud_ignitor', name: 'Bud Ignitor', kind: 'booster', unit: 'ml', brand: 'athena_pro', approx: true, per: { P: 18, K: 22 }, bio: 0.6, max: 6, step: 0.25, color: '#f9a8d4', blurb: 'Activa la formación de flores al cambiar el fotoperíodo.' }),
  I({ id: 'athena_cleanse', name: 'Athena Cleanse', kind: 'flush', unit: 'ml', brand: 'athena_pro', approx: true, per: {}, flush: true, max: 8, step: 0.5, color: '#e2e8f0', blurb: 'Limpiador de sales para las últimas semanas.' }),
];

/** Nombre que usan las tablas de las marcas → ingrediente. */
const PRODUCT_ALIAS: Record<string, string> = {
  'pH Perfect Grow': 'ph_perfect_grow', 'pH Perfect Micro': 'ph_perfect_micro', 'pH Perfect Bloom': 'ph_perfect_bloom', 'B-52 Booster': 'b52',
  'Big Bud (PK Booster)': 'big_bud', 'Overdrive (End Bloom)': 'overdrive', 'Flawless Finish Quelante': 'flawless_finish',
  'Bio-Grow': 'bio_grow', 'Bio-Bloom': 'bio_bloom', 'Top-Max': 'top_max', 'Alg-A-Mic': 'alg_a_mic', 'Bio-Heaven': 'bio_heaven', 'Root-Juice (Estimulador)': 'root_juice',
  'Athena Core': 'athena_core', 'Athena Grow': 'athena_grow', 'Athena Bloom': 'athena_bloom', 'Bud Ignitor': 'bud_ignitor', 'Athena Cleanse': 'athena_cleanse',
};

export const INGREDIENTS: Record<string, Ingredient> = Object.fromEntries([...SALTS, ...BRAND_INGREDIENTS].map((i) => [i.id, i]));

/** Potencia de cada marca sobre el análisis típico de su clase. Las tablas se usan como PROPORCIONES de receta: la fuerza final se ajusta a la EC objetivo (strengthForEc). */
export const BRAND_POTENCY: Record<string, number> = { advanced_nutrients: 0.75, biobizz_organic: 1.6, athena_pro: 0.88 };

export const ingredientForProduct = (productName: string): Ingredient | undefined => INGREDIENTS[PRODUCT_ALIAS[productName]];

/** Convierte las dosis de una tabla de marca (ml/L por producto) en dosis de ingredientes, con la fuerza elegida (1 = tabla). */
export function dosesFromTable(dosage: { productName: string; mlPerL: number }[], strength = 1): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of dosage) {
    const ing = ingredientForProduct(d.productName);
    if (!ing) continue; // "Agua pura sin nutrientes" y desconocidos: sin aporte
    out[ing.id] = Number(((out[ing.id] ?? 0) + d.mlPerL * strength).toFixed(3));
  }
  return out;
}

/* ─────────────────────────────── agua y medio ─────────────────────────────── */

export type WaterId = 'ro' | 'rain' | 'soft' | 'well' | 'hard';
export interface WaterSource {
  id: WaterId; name: string; emoji: string; blurb: string;
  /** conductividad medida (mS/cm) */
  ec: number;
  /** alcalinidad en mEq/L (ppm CaCO₃ = 50 × mEq/L) */
  alkMeq: number;
  per: Partial<Ppm>;
}
export const WATERS: WaterSource[] = [
  { id: 'ro', name: 'Ósmosis inversa', emoji: '💧', ec: 0.02, alkMeq: 0.06, per: { Ca: 1 },
    blurb: 'Casi agua destilada: control total, pero sin calcio ni magnesio (hay que añadirlos) y sin colchón: el pH se mueve con cualquier gota.' },
  { id: 'rain', name: 'Agua de lluvia', emoji: '🌧️', ec: 0.03, alkMeq: 0.02, per: { N: 1 },
    blurb: 'Muy blanda y ligeramente ácida. Gratis y excelente si tu techo está limpio; también sin Ca/Mg.' },
  { id: 'soft', name: 'Grifo blando', emoji: '🚰', ec: 0.25, alkMeq: 1.2, per: { Ca: 25, Mg: 6, S: 8 },
    blurb: 'Trae algo de Ca/Mg y una alcalinidad moderada (60 ppm CaCO₃). Un buen punto de partida.' },
  { id: 'well', name: 'Pozo', emoji: '🪣', ec: 0.55, alkMeq: 2.6, per: { Ca: 55, Mg: 18, S: 12, Fe: 0.4 },
    blurb: 'Mineralizada: Ca/Mg/Fe propios y bastante alcalinidad. Analízala: cambia con la estación.' },
  { id: 'hard', name: 'Grifo duro', emoji: '🏙️', ec: 0.85, alkMeq: 4.0, per: { Ca: 80, Mg: 25, S: 45 },
    blurb: 'Mucho calcio y magnesio (¡ya cuentan como nutrientes!) y 200 ppm de alcalinidad: hará falta bastante ácido para bajar el pH.' },
];
export const WATER_BY_ID = Object.fromEntries(WATERS.map((w) => [w.id, w])) as Record<WaterId, WaterSource>;

export type MediumId = 'soil' | 'coco' | 'hydro';
export interface Medium {
  id: MediumId; name: string; emoji: string; ph: [number, number]; ecMul: number; demand: Partial<Ppm>; blurb: string;
}
export const MEDIA: Medium[] = [
  { id: 'soil', name: 'Tierra', emoji: '🌱', ph: [6.0, 7.0], ecMul: 0.85, demand: {}, blurb: 'Amortigua errores y guarda nutrientes. Rango de pH más amplio (6,0–7,0) y EC algo menor.' },
  { id: 'coco', name: 'Fibra de coco', emoji: '🥥', ph: [5.8, 6.2], ecMul: 0.95, demand: { Ca: 1.25, Mg: 1.3 }, blurb: 'La fibra atrapa calcio y magnesio: pide Cal-Mag constante y pH 5,8–6,2.' },
  { id: 'hydro', name: 'Hidroponía', emoji: '🧪', ph: [5.5, 6.2], ecMul: 1, demand: {}, blurb: 'Sin colchón: todo lo que pones lo siente la raíz al instante. pH 5,5–6,2 y cero improvisación.' },
];
export const MEDIUM_BY_ID = Object.fromEntries(MEDIA.map((m) => [m.id, m])) as Record<MediumId, Medium>;

/* ───────────────────────────── etapas y objetivos ───────────────────────────── */

export type StageId = 'seedling' | 'veg_early' | 'veg_late' | 'transition' | 'bloom_peak' | 'flush';
export interface StageTarget {
  id: StageId; name: string; weeks: string; from: number; to: number;
  /** rango ideal de cada elemento en la solución (mg/L) */
  ranges: Record<ElementId, [number, number]>;
  ec: [number, number];
  npk: string;
  note: string;
}
export const STAGES: StageTarget[] = [
  { id: 'seedling', name: 'Plántula', weeks: 'Semana 1', from: 0, to: 15, npk: '1-1-1 suave', ec: [0.5, 0.9],
    ranges: { N: [50, 100], P: [20, 40], K: [60, 120], Ca: [50, 100], Mg: [20, 40], S: [20, 60], Fe: [0.5, 2] },
    note: 'Raíces diminutas: la mitad de dosis. Casi todo el trabajo es no quemar.' },
  { id: 'veg_early', name: 'Vegetativo temprano', weeks: 'Semanas 2-3', from: 15, to: 32, npk: '3-1-2', ec: [1.2, 1.6],
    ranges: { N: [120, 170], P: [30, 50], K: [130, 200], Ca: [100, 150], Mg: [35, 55], S: [40, 80], Fe: [1, 3] },
    note: 'Nitrógeno alto para hojas y ramas; el calcio sostiene la expansión.' },
  { id: 'veg_late', name: 'Vegetativo tardío', weeks: 'Semanas 4-5', from: 32, to: 50, npk: '3-1-3', ec: [1.6, 2.0],
    ranges: { N: [150, 200], P: [40, 60], K: [180, 240], Ca: [120, 170], Mg: [40, 60], S: [50, 90], Fe: [1, 3] },
    note: 'Máximo vigor antes de pasar a 12/12.' },
  { id: 'transition', name: 'Prefloración', weeks: 'Semanas 6-7 (12/12)', from: 50, to: 62, npk: '1-3-2', ec: [1.6, 2.1],
    ranges: { N: [100, 150], P: [50, 70], K: [200, 260], Ca: [120, 160], Mg: [45, 65], S: [60, 100], Fe: [1, 3] },
    note: 'Baja el nitrógeno, sube P y K: la planta cambia de hojas a flores.' },
  { id: 'bloom_peak', name: 'Floración plena', weeks: 'Semanas 8-9', from: 62, to: 92, npk: '0-3-3', ec: [1.8, 2.4],
    ranges: { N: [70, 120], P: [60, 90], K: [250, 340], Ca: [110, 160], Mg: [50, 70], S: [80, 130], Fe: [1, 3] },
    note: 'Potasio alto para engordar. Demasiado N ahora retrasa y ablanda los cogollos.' },
  { id: 'flush', name: 'Lavado final', weeks: 'Últimos 7-10 días', from: 92, to: 100, npk: '0-0-0', ec: [0, 0.4],
    ranges: { N: [0, 20], P: [0, 10], K: [0, 20], Ca: [0, 40], Mg: [0, 15], S: [0, 20], Fe: [0, 1] },
    note: 'Agua limpia (y un quelante) para arrastrar sales acumuladas y mejorar sabor y ceniza.' },
];
export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<StageId, StageTarget>;

/** Etapa de nutrición según el progreso de la planta (0–100). */
export function stageOfProgress(progress: number): StageId {
  const p = Number.isFinite(progress) ? progress : 0;
  return (STAGES.find((s) => p >= s.from && p < s.to) ?? STAGES[STAGES.length - 1]).id;
}

/** Etapa de nutrición a la que corresponde cada etapa de las tablas de las marcas (por su nombre). */
export function stageIdOfBrandStage(stageName: string): StageId {
  const n = stageName.toLowerCase();
  if (/lavado|flush|fade|desfogue/.test(n)) return 'flush';
  if (/germin|plántul|plantul|propag/.test(n)) return 'seedling';
  if (/pre-?flor|transici|estir/.test(n)) return 'transition';
  if (/flor|engorde|peak/.test(n)) return 'bloom_peak';
  if (/temprano/.test(n)) return 'veg_early';
  return 'veg_late';
}

/* ─────────────────────────────── la solución ─────────────────────────────── */

export interface Mix {
  waterId: WaterId;
  liters: number;
  /** unidades por litro (ml/L o g/L) de cada ingrediente */
  doses: Record<string, number>;
}

export interface Solution {
  /** mg/L reales de cada elemento (agua + ingredientes, con la disponibilidad de los orgánicos) */
  ppm: Ppm;
  ec: number;
  ppm500: number;
  ppm700: number;
  /** alcalinidad neta en mEq/L y pH resultante */
  alkMeq: number;
  ph: number;
  bio: number;
  hasFlush: boolean;
  /** cuántos ml/L de productos y g/L de sales lleva */
  totalMl: number;
  totalG: number;
}

/** mS/cm que aporta 1 mg/L de cada elemento (aprox. de conductividades iónicas). */
const EC_FACTOR: Ppm = { N: 0.0033, P: 0.003, K: 0.0022, Ca: 0.003, Mg: 0.0042, S: 0.0015, Fe: 0.002 };
export const ORGANIC_AVAILABILITY = 0.6;

/** Modelo didáctico del bicarbonato: pH = 6,35 + log₁₀(alcalinidad / 0,15 mM); por debajo, ácido libre. */
export function phFromAlkalinity(alkMeq: number): number {
  const REF = 0.15;
  const CUT = 0.0075;
  const a = Number.isFinite(alkMeq) ? alkMeq : 0;
  const ph = a >= CUT ? 6.35 + Math.log10(a / REF) : 5.05 - 0.9 * Math.log10(1 + (CUT - a) * 200);
  return Math.min(9.5, Math.max(2.5, ph));
}

export function solve(mix: Mix): Solution {
  const water = WATER_BY_ID[mix.waterId] ?? WATER_BY_ID.ro;
  const ppm = zero();
  const addedPpm = zero();
  for (const e of ELEMENT_IDS) ppm[e] = water.per[e] ?? 0;
  let alk = water.alkMeq;
  let bio = 0;
  let hasFlush = false;
  let totalMl = 0;
  let totalG = 0;
  for (const [id, dose] of Object.entries(mix.doses)) {
    const ing = INGREDIENTS[id];
    if (!ing || !(dose > 0)) continue;
    const avail = ing.organic ? ORGANIC_AVAILABILITY : 1;
    const potency = ing.brand ? BRAND_POTENCY[ing.brand] ?? 1 : 1;
    for (const e of ELEMENT_IDS) {
      const v = (ing.per[e] ?? 0) * dose * avail * potency;
      ppm[e] += v;
      addedPpm[e] += v;
    }
    alk += (ing.alkMeq ?? 0) * dose;
    bio += (ing.bio ?? 0) * dose;
    if (ing.flush && dose > 0) hasFlush = true;
    if (ing.unit === 'ml') totalMl += dose; else totalG += dose;
  }
  let ec = water.ec;
  for (const e of ELEMENT_IDS) ec += addedPpm[e] * EC_FACTOR[e];
  ec = Number(ec.toFixed(2));
  const round = (o: Ppm): Ppm => Object.fromEntries(ELEMENT_IDS.map((e) => [e, Number(o[e].toFixed(1))])) as Ppm;
  return {
    ppm: round(ppm), ec, ppm500: Math.round(ec * 500), ppm700: Math.round(ec * 700),
    alkMeq: Number(alk.toFixed(3)), ph: Number(phFromAlkalinity(alk).toFixed(2)),
    bio: Number(bio.toFixed(2)), hasFlush, totalMl: Number(totalMl.toFixed(2)), totalG: Number(totalG.toFixed(2)),
  };
}

export type AcidId = 'ph_down' | 'acid_nitric' | 'acid_sulfuric';
const ACIDS: AcidId[] = ['ph_down', 'acid_nitric', 'acid_sulfuric'];

/** Dosis por litro del corrector que deja la solución en el pH objetivo (ácido a elegir; si el pH está bajo, pH Up). */
export function phCorrection(mix: Mix, targetPh: number, acid: AcidId = 'ph_down'): { ingredient: AcidId | 'ph_up' | null; dose: number } {
  const clean: Record<string, number> = { ...mix.doses };
  for (const id of [...ACIDS, 'ph_up']) clean[id] = 0;
  const at = (id: string, d: number) => solve({ ...mix, doses: { ...clean, [id]: d } }).ph;
  const now = at(acid, 0);
  if (Math.abs(now - targetPh) < 0.03) return { ingredient: null, dose: 0 };
  const ing: AcidId | 'ph_up' = now > targetPh ? acid : 'ph_up';
  const max = INGREDIENTS[ing].max;
  const f = (d: number) => at(ing, d);
  const tooHigh = (d: number) => (ing === 'ph_up' ? f(d) < targetPh : f(d) > targetPh);
  if (tooHigh(max)) return { ingredient: ing, dose: max };
  let lo = 0, hi = max;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (tooHigh(mid)) lo = mid; else hi = mid; }
  return { ingredient: ing, dose: Number(((lo + hi) / 2).toFixed(3)) };
}

/** Fuerza (1 = dosis impresa) con la que estas proporciones alcanzan la EC objetivo con esta agua (el agua dura ya "trae" nutrientes). */
export function strengthForEc(dosage: { productName: string; mlPerL: number }[], waterId: WaterId, targetEc: number): number {
  const ecAt = (s: number) => solve({ waterId, liters: 1, doses: dosesFromTable(dosage, s) }).ec;
  const MAX = 2.5;
  // recetas sin aporte de elementos (lavados, estimuladores): no hay EC que ajustar, se usa la dosis impresa
  if (ecAt(MAX) - ecAt(0) < 0.05) return 1;
  if (ecAt(MAX) < targetEc) return MAX;
  if (ecAt(0) > targetEc) return 0;
  let lo = 0, hi = MAX;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; if (ecAt(mid) < targetEc) lo = mid; else hi = mid; }
  return Number(((lo + hi) / 2).toFixed(2));
}

/* ──────────────────────── disponibilidad, antagonismos, diagnóstico ──────────────────────── */

const curve = (x: number, pts: [number, number][]): number => {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1]; const [x1, y1] = pts[i]; return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0); }
  }
  return pts[pts.length - 1][1];
};
const AVAIL: Record<ElementId, [number, number][]> = {
  N: [[4.5, 0.6], [5.5, 1], [7.5, 1], [8.5, 0.7]],
  K: [[4.5, 0.6], [5.5, 1], [7.5, 1], [8.5, 0.7]],
  S: [[4.5, 0.6], [5.5, 1], [7.5, 1], [8.5, 0.7]],
  P: [[4.5, 0.35], [5.5, 0.75], [6.0, 1], [7.0, 1], [7.5, 0.7], [8.5, 0.4]],
  Ca: [[4.5, 0.25], [5.0, 0.45], [5.6, 0.85], [6.0, 1], [7.5, 1], [8.5, 0.8]],
  Mg: [[4.5, 0.25], [5.0, 0.45], [5.6, 0.85], [6.0, 1], [7.5, 1], [8.5, 0.8]],
  Fe: [[4.5, 1], [6.3, 1], [6.8, 0.5], [7.5, 0.15], [8.5, 0.05]],
};
/** Fracción del elemento que la raíz puede absorber a ese pH (1 = todo). */
export const availability = (el: ElementId, ph: number) => curve(ph, AVAIL[el]);

export type Status = 'deficient' | 'low' | 'ok' | 'high' | 'excess';
export interface Finding {
  id: string;
  level: 'ok' | 'info' | 'warn' | 'bad';
  element?: ElementId | 'pH' | 'EC';
  title: string;
  detail: string;
  fix?: string;
  symptomId?: string;
}
export interface Diagnosis {
  score: number;
  stars: 0 | 1 | 2 | 3;
  status: Record<ElementId, Status>;
  /** ppm que la raíz realmente puede tomar (tras bloqueos por pH y antagonismos) */
  effective: Ppm;
  ranges: Record<ElementId, [number, number]>;
  ecRange: [number, number];
  phRange: [number, number];
  phState: 'low' | 'ok' | 'high';
  ecState: 'low' | 'ok' | 'high' | 'burn';
  ratios: { caMg: number; kToCaMg: number; nToK: number };
  toxic: boolean;
  findings: Finding[];
  headline: string;
}

const WEIGHT: Record<ElementId, number> = { N: 1.5, P: 1.3, K: 1.5, Ca: 1.2, Mg: 1.1, S: 0.9, Fe: 0.6 };

export function diagnose(sol: Solution, stageId: StageId, mediumId: MediumId): Diagnosis {
  const stage = STAGE_BY_ID[stageId];
  const medium = MEDIUM_BY_ID[mediumId];
  const ranges = Object.fromEntries(ELEMENT_IDS.map((e) => {
    const m = medium.demand[e] ?? 1;
    const [lo, hi] = stage.ranges[e];
    return [e, [Number((lo * m).toFixed(1)), Number((hi * m).toFixed(1))]];
  })) as Record<ElementId, [number, number]>;
  const ecRange: [number, number] = [Number((stage.ec[0] * medium.ecMul).toFixed(2)), Number((stage.ec[1] * medium.ecMul).toFixed(2))];
  const flush = stageId === 'flush';

  // antagonismo: mucho K frente a Ca+Mg bloquea a estos dos; mucho Ca frente a Mg bloquea al Mg
  const { K, Ca, Mg, N } = sol.ppm;
  const kToCaMg = Ca + Mg > 0 ? K / (Ca + Mg) : K > 0 ? 99 : 0;
  const caMg = Mg > 0 ? Ca / Mg : Ca > 0 ? 99 : 0;
  const antK = flush ? 1 : 1 - 0.25 * Math.min(1, Math.max(0, (kToCaMg - 1.6) / 1.5));
  const antCa = caMg > 5 && !flush ? 0.7 : 1;
  const effective = zero();
  for (const e of ELEMENT_IDS) {
    let f = availability(e, sol.ph);
    if (e === 'Ca' || e === 'Mg') f *= antK;
    if (e === 'Mg') f *= antCa;
    effective[e] = Number((sol.ppm[e] * f).toFixed(1));
  }

  const status = {} as Record<ElementId, Status>;
  const findings: Finding[] = [];
  let weighted = 0, weights = 0, toxic = false;
  for (const e of ELEMENT_IDS) {
    const [lo, hi] = ranges[e];
    const eff = effective[e];
    let s: Status = 'ok', part = 1;
    if (eff < lo * 0.6 && lo > 0) { s = 'deficient'; part = Math.max(0, 1 - (lo - eff) / (0.6 * lo)); }
    else if (eff < lo) { s = 'low'; part = Math.max(0, 1 - (lo - eff) / (0.6 * lo)); }
    else if (eff > hi * 1.5) { s = 'excess'; part = Math.max(0, 1 - (eff - hi) / hi); }
    else if (eff > hi) { s = 'high'; part = Math.max(0, 1 - (eff - hi) / hi); }
    if (flush && (s === 'low' || s === 'deficient')) { s = 'ok'; part = 1; }
    status[e] = s;
    const w = flush ? 0.5 : WEIGHT[e];
    weighted += w * part; weights += w;
    if (s === 'excess') toxic = true;
    const rawOk = sol.ppm[e] >= lo * 0.9;
    if ((s === 'deficient' || s === 'low') && !flush) {
      // bloqueo real solo si el pH (o un antagonismo) le quita al menos un 7 % de lo que hay en la solución
      const lock = rawOk && eff < lo && eff < sol.ppm[e] * 0.93;
      findings.push({
        id: `${e}-low`, element: e, level: s === 'deficient' ? 'bad' : 'warn',
        title: lock ? `${ELEMENTS[e].name} bloqueado por el pH (hay ${sol.ppm[e]} ppm pero solo ${eff} son absorbibles)` : `${ELEMENTS[e].name} ${s === 'deficient' ? 'muy escaso' : 'bajo'} (${eff} ppm, ideal ${lo}–${hi})`,
        detail: lock ? `A pH ${sol.ph} la raíz no puede tomar todo el ${ELEMENTS[e].name.toLowerCase()} disponible.` : `${ELEMENTS[e].role}.`,
        fix: lock ? `Lleva el pH a ${medium.ph[0]}–${medium.ph[1]} antes de añadir más.` : fixFor(e, 'low'),
        symptomId: `${e.toLowerCase()}_def`,
      });
    } else if (s === 'high' || s === 'excess') {
      findings.push({
        id: `${e}-high`, element: e, level: s === 'excess' ? 'bad' : 'warn',
        title: `${ELEMENTS[e].name} ${s === 'excess' ? 'en exceso' : 'alto'} (${eff} ppm, ideal ${lo}–${hi})`,
        detail: s === 'excess' ? 'Riesgo de toxicidad y de bloquear a otros elementos.' : 'Por encima del rango de esta etapa.',
        fix: fixFor(e, 'high'), symptomId: e === 'N' ? 'n_exc' : e === 'K' ? 'k_exc' : undefined,
      });
    }
  }

  // pH
  const [phLo, phHi] = medium.ph;
  const phState = sol.ph < phLo ? 'low' : sol.ph > phHi ? 'high' : 'ok';
  const phDev = sol.ph < phLo ? phLo - sol.ph : sol.ph > phHi ? sol.ph - phHi : 0;
  const phPart = Math.max(0, 1 - phDev / 1.2);
  if (phState !== 'ok') {
    findings.push({
      id: 'ph', element: 'pH', level: phDev > 0.6 ? 'bad' : 'warn',
      title: `pH ${sol.ph} fuera del rango de ${medium.name.toLowerCase()} (${phLo}–${phHi})`,
      detail: phState === 'high' ? 'Un pH alto precipita el hierro, el manganeso y el fósforo: la raíz no los puede tomar.' : 'Un pH bajo deja sin calcio, magnesio y fósforo a la planta.',
      fix: phState === 'high' ? 'Añade pH Down poco a poco (o parte de agua con menos alcalinidad).' : 'Añade pH Up en dosis mínimas o reduce el ácido.',
      symptomId: phState === 'high' ? 'ph_high' : 'ph_low',
    });
  }

  // EC
  const [ecLo, ecHi] = ecRange;
  const ecState = sol.ec > ecHi * 1.35 ? 'burn' : sol.ec > ecHi ? 'high' : sol.ec < ecLo ? 'low' : 'ok';
  const ecPart = sol.ec < ecLo ? Math.max(0, 1 - (ecLo - sol.ec) / Math.max(0.2, ecLo)) : sol.ec > ecHi ? Math.max(0, 1 - (sol.ec - ecHi) / (ecHi * 0.6 || 0.3)) : 1;
  if (ecState === 'burn') { toxic = true; findings.push({ id: 'ec-burn', element: 'EC', level: 'bad', title: `EC ${sol.ec} mS/cm: riesgo de quemadura por sales (máx. ${ecHi})`, detail: 'Las puntas se queman y la planta deja de crecer.', fix: 'Diluye con agua o baja las dosis.', symptomId: 'ec_burn' }); }
  else if (ecState === 'high') findings.push({ id: 'ec-high', element: 'EC', level: 'warn', title: `EC ${sol.ec} mS/cm algo alta (ideal ${ecLo}–${ecHi})`, detail: 'Cerca del límite: vigila las puntas.', fix: 'Baja un poco las dosis.' });
  else if (ecState === 'low' && !flush) findings.push({ id: 'ec-low', element: 'EC', level: 'warn', title: `EC ${sol.ec} mS/cm baja (ideal ${ecLo}–${ecHi})`, detail: 'La planta pasa hambre: crece lento y se aclara.', fix: 'Sube las dosis de la base.', symptomId: 'ec_low' });

  // relaciones
  let penalty = 0;
  if (!flush && Ca > 0 && Mg > 0 && (caMg < 2 || caMg > 5)) {
    penalty += 4;
    findings.push({ id: 'camg', element: 'Ca', level: 'warn', title: `Relación Ca:Mg ${caMg.toFixed(1)}:1 (ideal 2–4:1)`, detail: caMg > 5 ? 'Demasiado calcio frente al magnesio lo bloquea.' : 'Demasiado magnesio frente al calcio.', fix: caMg > 5 ? 'Añade Sal de Epsom o baja el Cal-Mag.' : 'Añade calcio.' });
  }
  if (!flush && kToCaMg > 2.6) {
    penalty += 4;
    findings.push({ id: 'k-ant', element: 'K', level: 'warn', title: `Demasiado potasio frente a Ca+Mg (${kToCaMg.toFixed(1)}:1)`, detail: 'El potasio compite con el calcio y el magnesio en la raíz.', fix: 'Sube Ca/Mg o baja los boosters de PK.' });
  }
  if (!flush && stageId === 'bloom_peak' && N > 0 && N > sol.ppm.K * 0.5) {
    penalty += 3;
    findings.push({ id: 'nk', element: 'N', level: 'info', title: 'Relación N:K alta para floración', detail: 'En floración pleno el potasio debe superar con holgura al nitrógeno.' });
  }
  if (flush && sol.hasFlush) weighted += 0.5;

  let score = ((weighted + 2 * phPart + 2 * ecPart) / (weights + 4)) * 100 - penalty;
  if (sol.bio > 0 && score > 60) score += Math.min(4, sol.bio);
  if (toxic) score = Math.min(score, 55);
  // nunca «de campeonato» con un problema grave a la vista
  if (findings.some((f) => f.level === 'bad')) score = Math.min(score, 84);
  score = Math.round(Math.max(0, Math.min(100, score)));
  const stars = (score >= 90 ? 3 : score >= 75 ? 2 : score >= 55 ? 1 : 0) as 0 | 1 | 2 | 3;
  if (findings.length === 0) findings.push({ id: 'ok', level: 'ok', title: 'Solución equilibrada para esta etapa', detail: 'Todos los elementos, el pH y la EC están en rango.' });
  findings.sort((a, b) => ({ bad: 0, warn: 1, info: 2, ok: 3 }[a.level] - { bad: 0, warn: 1, info: 2, ok: 3 }[b.level]));
  const headline = toxic ? 'Riesgo de toxicidad: no la apliques así' : score >= 90 ? 'Solución de campeonato' : score >= 75 ? 'Muy buena solución' : score >= 55 ? 'Aceptable, mejorable' : 'La planta sufrirá con esto';
  return { score, stars, status, effective, ranges, ecRange, phRange: medium.ph, phState, ecState, ratios: { caMg: Number(caMg.toFixed(1)), kToCaMg: Number(kToCaMg.toFixed(1)), nToK: K > 0 ? Number((N / K).toFixed(2)) : 0 }, toxic, findings, headline };
}

function fixFor(e: ElementId, dir: 'low' | 'high'): string {
  const up: Record<ElementId, string> = {
    N: 'Sube la base de crecimiento o añade nitrato de calcio / de potasio.',
    P: 'Añade MKP o un booster PK (con moderación).',
    K: 'Añade sulfato de potasio o sube la base de floración.',
    Ca: 'Añade nitrato de calcio o Cal-Mag (imprescindible con agua de ósmosis o coco).',
    Mg: 'Añade Sal de Epsom (o Cal-Mag).',
    S: 'Sal de Epsom o sulfato de potasio aportan azufre.',
    Fe: 'Añade un poco de hierro quelatado (EDDHA).',
  };
  const down: Record<ElementId, string> = {
    N: 'Reduce la base de crecimiento y los nitratos: en floración el exceso de N ablanda los cogollos.',
    P: 'Baja el booster PK o el ácido fosfórico del pH Down.',
    K: 'Baja los boosters de PK y las sales de potasio.',
    Ca: 'Baja el nitrato de calcio / Cal-Mag: mucho calcio bloquea al magnesio.',
    Mg: 'Baja Epsom o Cal-Mag.',
    S: 'Baja sulfatos (Epsom, sulfato de potasio).',
    Fe: 'Baja el quelato de hierro.',
  };
  return dir === 'low' ? up[e] : down[e];
}

/* ───────────────────────── efecto sobre la planta ───────────────────────── */

export interface FeedEffect { feedBonus: number; healthDelta: number; ec: number; ph: number; label: string }

/** Lo que le pasa a una planta que recibe esta solución: bonus de crecimiento (mientras dure la EC), salud y valores medidos. */
export function feedEffect(sol: Solution, d: Diagnosis): FeedEffect {
  const s = d.score;
  const feedBonus = s >= 90 ? 1.1 : s >= 75 ? 1.05 : s >= 55 ? 1.0 : s >= 40 ? 0.92 : 0.85;
  let healthDelta = s >= 75 ? 6 : s >= 55 ? 2 : s >= 40 ? -3 : -10;
  if (d.toxic) healthDelta -= 6;
  return { feedBonus, healthDelta, ec: sol.ec, ph: sol.ph, label: d.headline };
}

/** Multiplicador de crecimiento por pH del sustrato (bloqueos): 1 en 5,6–6,9. */
export function phGrowthFactor(ph: number): number {
  if (!Number.isFinite(ph)) return 1;
  if (ph >= 5.6 && ph <= 6.9) return 1;
  if ((ph >= 5.2 && ph < 5.6) || (ph > 6.9 && ph <= 7.3)) return 0.85;
  return 0.65;
}

/* ─────────────────────────── síntomas (guía visual) ─────────────────────────── */

export interface LeafSpec {
  base: string;          // color de la hoja
  veins?: string;        // color de las nervaduras (clorosis intervenal: hoja clara con nervios verdes)
  edge?: string;         // color del borde quemado
  tipBurn?: boolean;
  spots?: string;        // manchas
  purple?: boolean;      // tallos/pecíolos morados
  claw?: boolean;        // puntas dobladas hacia abajo
  curlUp?: boolean;
  yellowFrom?: 'base' | 'tip' | 'all';
}
export interface Symptom {
  id: string;
  title: string;
  kind: 'deficiency' | 'excess' | 'lockout' | 'burn';
  element?: ElementId | 'pH' | 'EC';
  where: 'old' | 'new' | 'all';
  look: string;
  cause: string;
  confirm: string;
  fix: string;
  leaf: LeafSpec;
}
const GREEN = '#22803a';
export const SYMPTOMS: Symptom[] = [
  { id: 'n_def', title: 'Falta de nitrógeno', kind: 'deficiency', element: 'N', where: 'old',
    look: 'Amarillea de abajo hacia arriba: primero las hojas viejas, que se caen. Crecimiento lento y pálido.',
    cause: 'El N es móvil: la planta lo saca de las hojas viejas para las nuevas. Típico en vegetativo con pocas dosis o pH bajo.',
    confirm: 'Las hojas más bajas amarillean uniformes (no solo entre nervios) y la planta entera se ve clara.', fix: 'Sube la base de crecimiento o añade nitrato de calcio/potasio; comprueba la EC.',
    leaf: { base: '#c9d33a', yellowFrom: 'all', veins: '#b7c42c' } },
  { id: 'n_exc', title: 'Exceso de nitrógeno', kind: 'excess', element: 'N', where: 'all',
    look: 'Verde muy oscuro, hojas brillantes con las puntas dobladas hacia abajo (“garra”), crecimiento blando.',
    cause: 'Demasiada base de crecimiento, sobre todo al entrar en floración: retrasa las flores y las ablanda.',
    confirm: 'La garra aparece sin manchas ni quemaduras; el resto de la planta crece exuberante.', fix: 'Baja N en prefloración y floración; lava con agua limpia si es severo.',
    leaf: { base: '#0f4d24', claw: true } },
  { id: 'p_def', title: 'Falta de fósforo', kind: 'deficiency', element: 'P', where: 'old',
    look: 'Hojas verde muy oscuro/azuladas con manchas bronce o moradas; tallos y pecíolos rojizos-morados; crecimiento lento.',
    cause: 'Poco P, o pH fuera de 6–7, o raíces frías. El P es móvil: los síntomas empiezan abajo.',
    confirm: 'El morado aparece en tallos y nervios; ojo: algunas cepas son moradas por genética (pero sin retraso).', fix: 'Añade MKP o booster PK, corrige el pH y calienta las raíces (>18 °C).',
    leaf: { base: '#1c4a3e', purple: true, spots: '#7a4b3a' } },
  { id: 'k_def', title: 'Falta de potasio', kind: 'deficiency', element: 'K', where: 'old',
    look: 'Bordes y puntas de hojas viejas amarillos que se vuelven marrones y crujientes, con el centro aún verde.',
    cause: 'Poco K en floración, o exceso de Ca/Mg/Na que compite con él. Cogollos poco densos.',
    confirm: 'El daño sigue el borde de la hoja y avanza hacia dentro, sin manchas aisladas.', fix: 'Sulfato de potasio o base de floración; revisa la relación K:Ca+Mg.',
    leaf: { base: GREEN, edge: '#a86b1d', tipBurn: true } },
  { id: 'k_exc', title: 'Exceso de potasio / sales', kind: 'excess', element: 'K', where: 'all',
    look: 'Puntas quemadas y, a la vez, carencias de calcio y magnesio (manchas, clorosis) aunque las hayas añadido.',
    cause: 'El K compite con Ca y Mg en la raíz: demasiado PK bloquea a los demás.', confirm: 'Aparece tras subir boosters PK; EC alta; carencias “sin razón”.',
    fix: 'Baja el PK y sube Cal-Mag; lava el sustrato si la EC de drenaje es alta.', leaf: { base: '#1f6b30', edge: '#a86b1d', tipBurn: true, spots: '#b0651f' } },
  { id: 'ca_def', title: 'Falta de calcio', kind: 'deficiency', element: 'Ca', where: 'new',
    look: 'Hojas nuevas deformes, con manchas marrón-óxido pequeñas y puntas de crecimiento que se detienen; tallos frágiles.',
    cause: 'El Ca no se mueve por la planta: la carencia aparece en lo nuevo. Común con agua de ósmosis y en coco (que lo atrapa).',
    confirm: 'Manchas óxido dispersas sobre hojas jóvenes, no en los bordes de las viejas.', fix: 'Cal-Mag o nitrato de calcio; con coco, Cal-Mag desde el primer riego.',
    leaf: { base: '#3f8a34', spots: '#9a5a25', curlUp: true } },
  { id: 'mg_def', title: 'Falta de magnesio', kind: 'deficiency', element: 'Mg', where: 'old',
    look: 'Clorosis intervenal: hojas medias y viejas amarillas entre los nervios, que siguen verdes; bordes que se enrollan hacia arriba.',
    cause: 'Poco Mg o bloqueado por exceso de Ca/K o pH bajo. Muy común con RO y coco.', confirm: 'El patrón de “espina de pescado”: nervios verdes con amarillo entre ellos, en hojas viejas.',
    fix: 'Sal de Epsom (0,3–0,5 g/L) o Cal-Mag; comprueba Ca:Mg entre 2 y 4.', leaf: { base: '#c8cf3e', veins: '#1f7a35', curlUp: true } },
  { id: 's_def', title: 'Falta de azufre', kind: 'deficiency', element: 'S', where: 'new',
    look: 'Las hojas nuevas amarillean casi uniformes (parecido al N, pero en lo joven). Menos aroma.',
    cause: 'Poco sulfato: el S es poco móvil. Raro si usas sulfatos (Epsom, K₂SO₄).', confirm: 'Amarilleo en hojas jóvenes con nervios verdosos.', fix: 'Sal de Epsom o sulfato de potasio.',
    leaf: { base: '#d6da45', yellowFrom: 'tip', veins: '#a9b83a' } },
  { id: 'fe_def', title: 'Falta de hierro (o bloqueo)', kind: 'deficiency', element: 'Fe', where: 'new',
    look: 'Hojas nuevas casi blancas-amarillo brillante con los nervios verdes; los brotes se aclaran.',
    cause: 'Casi siempre es un pH alto (>6,5) que precipita el hierro, no falta real.', confirm: 'Mide el pH del sustrato: si es alto, es bloqueo.',
    fix: 'Baja el pH a 5,8–6,3 y usa quelato EDDHA si persiste.', leaf: { base: '#eef07a', veins: '#2e8a3a' } },
  { id: 'ph_high', title: 'pH alto: bloqueo de micronutrientes', kind: 'lockout', element: 'pH', where: 'new',
    look: 'Amarilleo intervenal en hojas nuevas, manchas y crecimiento detenido aunque “tenga de todo”.',
    cause: 'Por encima de 6,8 el Fe, Mn, Zn y P se vuelven insolubles.', confirm: 'Mide pH de la solución y del drenaje; la carencia mejora al bajarlo.',
    fix: 'Riega con solución a pH 6,0–6,2 y lava el exceso; corrige la alcalinidad del agua.', leaf: { base: '#dfe26a', veins: '#2f8a3b', spots: '#8a5a2a' } },
  { id: 'ph_low', title: 'pH bajo: bloqueo de Ca/Mg', kind: 'lockout', element: 'pH', where: 'old',
    look: 'Manchas óxido y clorosis: carencias de Ca y Mg que no se corrigen añadiéndolos.',
    cause: 'Por debajo de 5,5 el Ca, Mg y P quedan fuera de alcance de la raíz.', confirm: 'Drenaje ácido (<5,5).', fix: 'Sube el pH con pH Up en dosis mínimas y riega con solución a 6,0.',
    leaf: { base: '#7fa53a', spots: '#9a5a25', veins: '#2f8a3b' } },
  { id: 'ec_burn', title: 'Quemadura por sales (EC alta)', kind: 'burn', element: 'EC', where: 'all',
    look: 'Puntas amarillas-marrones y crujientes en las hojas más altas, hojas oscuras y rígidas.',
    cause: 'La EC de la solución o del sustrato supera lo que la planta tolera: las raíces pierden agua.', confirm: 'Las puntas mueren de fuera hacia dentro; el sustrato tiene costra blanca.',
    fix: 'Baja la dosis, lava con agua limpia y comprueba la EC de drenaje.', leaf: { base: '#1d6b30', edge: '#8a5a1a', tipBurn: true } },
  { id: 'ec_low', title: 'Poca comida (EC baja)', kind: 'deficiency', element: 'EC', where: 'all',
    look: 'Toda la planta pálida y lenta, hojas más pequeñas, sin manchas concretas.',
    cause: 'La solución no lleva suficientes nutrientes para la etapa.', confirm: 'EC por debajo del rango de la etapa, sin patrón por elementos.', fix: 'Sube las dosis de forma gradual (10–15 % por riego).',
    leaf: { base: '#9cc45a', yellowFrom: 'all' } },
];
export const SYMPTOM_BY_ID = Object.fromEntries(SYMPTOMS.map((s) => [s.id, s])) as Record<string, Symptom>;

/* ─────────────────────────────── retos del laboratorio ─────────────────────────────── */

export interface Challenge {
  id: string; title: string; brief: string; stage: StageId; medium: MediumId; water: WaterId; xp: number;
  /** ingredientes permitidos (todos si no se indica) */
  only?: string[];
  preset?: Record<string, number>;
  goal: (sol: Solution, d: Diagnosis, mix: Mix) => { ok: boolean; hint: string };
}
export const CHALLENGES: Challenge[] = [
  { id: 'tap_veg', title: 'Vegetativo con agua dura', xp: 50, stage: 'veg_early', medium: 'soil', water: 'hard',
    brief: 'Tu grifo es duro: 200 ppm de alcalinidad (pH 7,8) y ya trae Ca y Mg. Deja el pH en 6,0–7,0 y consigue una puntuación ≥ 75.',
    goal: (s, d) => ({ ok: s.ph >= 6.0 && s.ph <= 7.0 && d.score >= 75 && !d.toxic, hint: s.ph > 7.0 ? 'Hace falta ácido. Con el fosfórico te pasarás de P: prueba el nítrico (aporta N, que quieres).' : d.status.P === 'high' || d.status.P === 'excess' ? 'Demasiado fósforo: el ácido fosfórico lo aporta. Cambia de ácido.' : 'Ajusta N y K con la base de crecimiento sin pasarte de EC.' }) },
  { id: 'ro_coco', title: 'Coco con agua de ósmosis', xp: 60, stage: 'veg_early', medium: 'coco', water: 'ro',
    brief: 'Con agua de ósmosis en coco falta calcio y magnesio desde el primer riego. Consigue una puntuación ≥ 80 en vegetativo temprano.',
    goal: (_s, d) => ({ ok: d.score >= 80, hint: d.status.Ca !== 'ok' || d.status.Mg !== 'ok' ? 'Añade Cal-Mag: el coco atrapa Ca y Mg.' : 'Ajusta pH (5,8–6,2) y la EC.' }) },
  { id: 'salts_bloom', title: 'Floración solo con sales', xp: 90, stage: 'bloom_peak', medium: 'hydro', water: 'ro',
    only: ['cal_nitrate', 'mkp', 'k2so4', 'epsom', 'kno3', 'fe_eddha', 'calmag', 'ph_down', 'ph_up'],
    brief: 'Sin botellas comerciales: construye una solución de floración plena a partir de sales puras. Puntuación ≥ 85.',
    goal: (_s, d) => ({ ok: d.score >= 85, hint: 'Necesitas K (sulfato/nitrato), P (MKP), Ca (nitrato de calcio) y Mg (Epsom); cuida la relación Ca:Mg.' }) },
  { id: 'rescue', title: 'Rescata la solución quemada', xp: 50, stage: 'veg_late', medium: 'hydro', water: 'soft',
    preset: { ph_perfect_grow: 6, ph_perfect_micro: 6, ph_perfect_bloom: 4 },
    brief: 'Alguien dosificó de más: la EC está por las nubes. Baja las dosis hasta una solución segura (puntuación ≥ 70, sin toxicidad).',
    goal: (_s, d) => ({ ok: d.score >= 70 && !d.toxic, hint: 'Reduce las tres botellas a la mitad y vuelve a medir.' }) },
  { id: 'flush', title: 'Lavado final', xp: 30, stage: 'flush', medium: 'hydro', water: 'ro',
    brief: 'Últimos días: solución de lavado con EC ≤ 0,4 y pH 6,0–6,5.',
    goal: (s, d) => ({ ok: s.ec <= 0.4 && s.ph >= 6.0 && s.ph <= 6.5 && !d.toxic, hint: s.ph > 6.5 ? 'Ajusta el pH un poco (con muy poco pH Down).' : s.ph < 6.0 ? 'Sube el pH con una gota de pH Up.' : 'Nada de nutrientes: solo agua y, si quieres, un quelante.' }) },
];
