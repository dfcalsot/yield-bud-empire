import type { ProcessedProduct } from '../types';
import { PRODUCT_PRICE } from '../sim/products';
import {
  IconComponent, RosinPress, BubbleWasher, TerpeneJar, KiefSifter, RollingMachine, Rotavap, Chromatograph,
} from '../components/icons/CannabisIcons';
import { k, localize } from '../i18n';

export type StationId = 'rosin' | 'bubble' | 'terpsoup' | 'kief' | 'roller' | 'rotavap' | 'hplc';

export interface LabRecipe {
  id: string;
  name: string;
  type: ProcessedProduct['type'];
  inputKind: 'flower' | 'trim';
  yieldRatio: number;      // output g per input g
  pricePerGram: number;    // $FLORA
  feeFlora: number;        // burned per cycle
  potency: string;
  minGrams: number;
  maxGrams: number;
  step: number;
  defaultGrams: number;
  durationMs: number;
  variant: string;         // scene variant (colour of the liquid, gummy tray...)
  desc: string;
}

export interface LabStation {
  id: StationId;
  name: string;
  short: string;
  machineId: string;
  icon: IconComponent;
  color: string;
  blurb: string;
  recipes: LabRecipe[];
}

export const STATIONS: LabStation[] = localize<LabStation[]>([
  {
    id: 'rosin', name: k('Prensa de Rosin'), short: k('Rosin'), machineId: 'rosin_press_10t', icon: RosinPress, color: '#fbbf24',
    blurb: k('Placas calientes y 10 toneladas exprimen la resina de la flor sin un solo solvente.'),
    recipes: [
      { id: 'live_rosin', name: k('Live Rosin 90µ'), type: 'live_rosin', inputKind: 'flower', yieldRatio: 0.22, pricePerGram: PRODUCT_PRICE['live_rosin'], feeFlora: 12, potency: k('82.4% THC | 7.8% Terpenos'), minGrams: 10, maxGrams: 60, step: 5, defaultGrams: 20, durationMs: 6500, variant: 'amber', desc: k('Rosin dorado de flor fresca, prensado a 82 °C.') },
    ],
  },
  {
    id: 'bubble', name: k('Lavadora Bubble Hash'), short: k('Bubble'), machineId: 'bubble_washer', icon: BubbleWasher, color: '#67e8f9',
    blurb: k('Agua helada y agitador separan las cabezas de tricoma a través de bolsas de 190 / 120 / 73 µm.'),
    recipes: [
      { id: 'bubble_hash', name: k('Bubble Hash 120µ'), type: 'bubble_hash', inputKind: 'trim', yieldRatio: 0.07, pricePerGram: PRODUCT_PRICE['bubble_hash'], feeFlora: 9, potency: k('62% THC | 5.2% Terpenos'), minGrams: 10, maxGrams: 60, step: 5, defaultGrams: 30, durationMs: 7000, variant: 'trim', desc: k('Hash de trim en 3 mallas, ideal para dabs y prensado.') },
      { id: 'full_melt', name: k('Full Melt 73µ'), type: 'bubble_hash', inputKind: 'flower', yieldRatio: 0.05, pricePerGram: PRODUCT_PRICE['full_melt'], feeFlora: 16, potency: k('71% THC | 6.4% Terpenos'), minGrams: 10, maxGrams: 50, step: 5, defaultGrams: 20, durationMs: 7500, variant: 'flower', desc: k('Grado 6 estrellas: funde por completo al calor.') },
    ],
  },
  {
    id: 'terpsoup', name: k('Sopa de Terpenos'), short: k('Terpenos'), machineId: 'terp_reactor', icon: TerpeneJar, color: '#a3e635',
    blurb: k('Reactor con agitador magnético: una salsa hirviendo de terpenos donde crecen diamantes de THCa.'),
    recipes: [
      { id: 'terpene_sauce', name: k('Sopa de Terpenos (Live Sauce)'), type: 'terpene_sauce', inputKind: 'flower', yieldRatio: 0.18, pricePerGram: PRODUCT_PRICE['terpene_sauce'], feeFlora: 14, potency: k('68% THCa | 11.5% Terpenos'), minGrams: 10, maxGrams: 60, step: 5, defaultGrams: 20, durationMs: 7000, variant: 'sauce', desc: k('Salsa viva con la esencia aromática de la planta.') },
      { id: 'diamonds', name: k('Diamantes THCa + Sauce'), type: 'terpene_sauce', inputKind: 'flower', yieldRatio: 0.1, pricePerGram: PRODUCT_PRICE['diamonds'], feeFlora: 26, potency: k('95% THCa cristalino'), minGrams: 15, maxGrams: 60, step: 5, defaultGrams: 30, durationMs: 8000, variant: 'diamonds', desc: k('Cristales puros de THCa flotando en terpenos.') },
    ],
  },
  {
    id: 'kief', name: k('Tamizadora de Kief'), short: k('Kief'), machineId: 'kief_sifter', icon: KiefSifter, color: '#fde68a',
    blurb: k('Malla vibratoria que desprende el polvo dorado de tricomas, seco y sin daños.'),
    recipes: [
      { id: 'kief_trim', name: k('Kief Dorado 150µ'), type: 'kief', inputKind: 'trim', yieldRatio: 0.1, pricePerGram: PRODUCT_PRICE['kief_trim'], feeFlora: 5, potency: k('52% THC | 3.9% Terpenos'), minGrams: 10, maxGrams: 60, step: 5, defaultGrams: 30, durationMs: 5500, variant: 'trim', desc: k('Polvo de tricomas del trim: base de blunts y bowls.') },
      { id: 'kief_flower', name: k('Kief Premium 90µ'), type: 'kief', inputKind: 'flower', yieldRatio: 0.06, pricePerGram: PRODUCT_PRICE['kief_flower'], feeFlora: 8, potency: k('58% THC | 4.6% Terpenos'), minGrams: 10, maxGrams: 50, step: 5, defaultGrams: 20, durationMs: 6000, variant: 'flower', desc: k('Kief más fino, de flor seleccionada.') },
    ],
  },
  {
    id: 'roller', name: k('Enrolladora de Puros'), short: k('Puros'), machineId: 'rolling_machine', icon: RollingMachine, color: '#f59e0b',
    blurb: k('Rodillos de precisión llenan y enrollan conos y puros con papel de cáñamo.'),
    recipes: [
      { id: 'preroll', name: k('Pre-Rolls Cónicos'), type: 'preroll', inputKind: 'flower', yieldRatio: 0.95, pricePerGram: PRODUCT_PRICE['preroll'], feeFlora: 6, potency: k('22% THC | 2.4% Terpenos'), minGrams: 10, maxGrams: 60, step: 5, defaultGrams: 20, durationMs: 5500, variant: 'cone', desc: k('Conos de 1 g listos para vender por unidad.') },
      { id: 'cigar', name: k('Puros Premium (Kief Blunt)'), type: 'cigar', inputKind: 'flower', yieldRatio: 0.9, pricePerGram: PRODUCT_PRICE['cigar'], feeFlora: 11, potency: k('30% THC | 2.6% Terpenos'), minGrams: 10, maxGrams: 50, step: 5, defaultGrams: 20, durationMs: 6500, variant: 'cigar', desc: k('Puro de hoja con corazón de kief.') },
    ],
  },
  {
    id: 'rotavap', name: k('Rotavapor · RSO, Aceites y Gomitas'), short: k('Rotavap'), machineId: 'rotovap_extractor', icon: Rotavap, color: '#fb923c',
    blurb: k('Matraz giratorio al vacío en baño caliente: destila etanol y deja aceites concentrados.'),
    recipes: [
      { id: 'rso', name: k('RSO (Rick Simpson Oil)'), type: 'rso', inputKind: 'flower', yieldRatio: 0.12, pricePerGram: PRODUCT_PRICE['rso'], feeFlora: 16, potency: k('76% THC | 2.2% CBD'), minGrams: 15, maxGrams: 60, step: 5, defaultGrams: 25, durationMs: 8000, variant: 'rso', desc: k('Aceite oscuro, pesado y potente.') },
      { id: 'oil', name: k('Aceite Full Spectrum'), type: 'full_spec_oil', inputKind: 'flower', yieldRatio: 0.4, pricePerGram: PRODUCT_PRICE['oil'], feeFlora: 10, potency: k('65% cannabinoides totales'), minGrams: 10, maxGrams: 60, step: 5, defaultGrams: 20, durationMs: 7000, variant: 'oil', desc: k('Tintura dorada para uso sublingual.') },
      { id: 'gummies', name: k('Gomitas 10 mg (x20)'), type: 'gummies', inputKind: 'trim', yieldRatio: 0.6, pricePerGram: PRODUCT_PRICE['gummies'], feeFlora: 12, potency: k('10 mg THC por gomita'), minGrams: 10, maxGrams: 60, step: 5, defaultGrams: 30, durationMs: 8000, variant: 'gummies', desc: k('Destila el trim y lo vierte en moldes de gomita.') },
    ],
  },
  {
    id: 'hplc', name: k('Cromatógrafo HPLC'), short: k('Análisis'), machineId: 'hplc_analyzer', icon: Chromatograph, color: '#c084fc',
    blurb: k('Separa THC, CBD, CBN, CBG y terpenos y emite el certificado de análisis (COA) del lote.'),
    recipes: [],
  },
], ['name', 'short', 'blurb', 'potency', 'desc']);

export const STATION_BY_ID: Record<StationId, LabStation> = Object.fromEntries(STATIONS.map((s) => [s.id, s])) as Record<StationId, LabStation>;

export const HPLC_FEE = 15;

/** Display info per product type (product cards, batch lists). */
export const PRODUCT_INFO: Record<ProcessedProduct['type'], { label: string; color: string; station: StationId | null }> = localize<Record<ProcessedProduct['type'], { label: string; color: string; station: StationId | null }>>({
  live_rosin: { label: k('Live Rosin'), color: '#fbbf24', station: 'rosin' },
  bubble_hash: { label: k('Bubble Hash'), color: '#67e8f9', station: 'bubble' },
  terpene_sauce: { label: k('Sopa de Terpenos'), color: '#a3e635', station: 'terpsoup' },
  kief: { label: k('Kief'), color: '#fde68a', station: 'kief' },
  preroll: { label: k('Pre-Roll'), color: '#f59e0b', station: 'roller' },
  cigar: { label: k('Puro'), color: '#f59e0b', station: 'roller' },
  rso: { label: 'RSO', color: '#fb923c', station: 'rotavap' },
  full_spec_oil: { label: k('Aceite Full Spectrum'), color: '#fb923c', station: 'rotavap' },
  gummies: { label: k('Gomitas'), color: '#f472b6', station: 'rotavap' },
  pure_terpenes: { label: k('Terpenos Puros'), color: '#c084fc', station: 'rotavap' },
  cured_flower: { label: k('Flor Curada'), color: '#34d399', station: null },
  v2p_merch: { label: k('Merch V2P'), color: '#22d3ee', station: null },
  balm: { label: k('Bálsamo'), color: '#84af28', station: null },
  candle: { label: k('Vela aromática'), color: '#fbbf24', station: null },
  tincture: { label: k('Tintura'), color: '#a78bfa', station: null },
}, ['label']);
