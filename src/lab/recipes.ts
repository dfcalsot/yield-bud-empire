import type { ProcessedProduct } from '../types';
import { PRODUCT_PRICE } from '../sim/products';
import { k, localize } from '../i18n/core';

/** Lab station recipes as pure data (no icons, no React): the game core on the server reads them too (see core/actions.ts). */
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

export const STATION_RECIPES: Record<StationId, { machineId: string; recipes: LabRecipe[] }> = localize<Record<StationId, { machineId: string; recipes: LabRecipe[] }>>({
  rosin: { machineId: 'rosin_press_10t', recipes: [
      { id: 'live_rosin', name: k('Live Rosin 90µ'), type: 'live_rosin', inputKind: 'flower', yieldRatio: 0.22, pricePerGram: PRODUCT_PRICE['live_rosin'], feeFlora: 12, potency: k('82.4% THC | 7.8% Terpenos'), minGrams: 10, maxGrams: 60, step: 5, defaultGrams: 20, durationMs: 6500, variant: 'amber', desc: k('Rosin dorado de flor fresca, prensado a 82 °C.') },
  ] },
  bubble: { machineId: 'bubble_washer', recipes: [
      { id: 'bubble_hash', name: k('Bubble Hash 120µ'), type: 'bubble_hash', inputKind: 'trim', yieldRatio: 0.07, pricePerGram: PRODUCT_PRICE['bubble_hash'], feeFlora: 9, potency: k('62% THC | 5.2% Terpenos'), minGrams: 10, maxGrams: 60, step: 5, defaultGrams: 30, durationMs: 7000, variant: 'trim', desc: k('Hash de trim en 3 mallas, ideal para dabs y prensado.') },
      { id: 'full_melt', name: k('Full Melt 73µ'), type: 'bubble_hash', inputKind: 'flower', yieldRatio: 0.05, pricePerGram: PRODUCT_PRICE['full_melt'], feeFlora: 16, potency: k('71% THC | 6.4% Terpenos'), minGrams: 10, maxGrams: 50, step: 5, defaultGrams: 20, durationMs: 7500, variant: 'flower', desc: k('Grado 6 estrellas: funde por completo al calor.') },
  ] },
  terpsoup: { machineId: 'terp_reactor', recipes: [
      { id: 'terpene_sauce', name: k('Sopa de Terpenos (Live Sauce)'), type: 'terpene_sauce', inputKind: 'flower', yieldRatio: 0.18, pricePerGram: PRODUCT_PRICE['terpene_sauce'], feeFlora: 14, potency: k('68% THCa | 11.5% Terpenos'), minGrams: 10, maxGrams: 60, step: 5, defaultGrams: 20, durationMs: 7000, variant: 'sauce', desc: k('Salsa viva con la esencia aromática de la planta.') },
      { id: 'diamonds', name: k('Diamantes THCa + Sauce'), type: 'terpene_sauce', inputKind: 'flower', yieldRatio: 0.1, pricePerGram: PRODUCT_PRICE['diamonds'], feeFlora: 26, potency: k('95% THCa cristalino'), minGrams: 15, maxGrams: 60, step: 5, defaultGrams: 30, durationMs: 8000, variant: 'diamonds', desc: k('Cristales puros de THCa flotando en terpenos.') },
  ] },
  kief: { machineId: 'kief_sifter', recipes: [
      { id: 'kief_trim', name: k('Kief Dorado 150µ'), type: 'kief', inputKind: 'trim', yieldRatio: 0.1, pricePerGram: PRODUCT_PRICE['kief_trim'], feeFlora: 5, potency: k('52% THC | 3.9% Terpenos'), minGrams: 10, maxGrams: 60, step: 5, defaultGrams: 30, durationMs: 5500, variant: 'trim', desc: k('Polvo de tricomas del trim: base de blunts y bowls.') },
      { id: 'kief_flower', name: k('Kief Premium 90µ'), type: 'kief', inputKind: 'flower', yieldRatio: 0.06, pricePerGram: PRODUCT_PRICE['kief_flower'], feeFlora: 8, potency: k('58% THC | 4.6% Terpenos'), minGrams: 10, maxGrams: 50, step: 5, defaultGrams: 20, durationMs: 6000, variant: 'flower', desc: k('Kief más fino, de flor seleccionada.') },
  ] },
  roller: { machineId: 'rolling_machine', recipes: [
      { id: 'preroll', name: k('Pre-Rolls Cónicos'), type: 'preroll', inputKind: 'flower', yieldRatio: 0.95, pricePerGram: PRODUCT_PRICE['preroll'], feeFlora: 6, potency: k('22% THC | 2.4% Terpenos'), minGrams: 10, maxGrams: 60, step: 5, defaultGrams: 20, durationMs: 5500, variant: 'cone', desc: k('Conos de 1 g listos para vender por unidad.') },
      { id: 'cigar', name: k('Puros Premium (Kief Blunt)'), type: 'cigar', inputKind: 'flower', yieldRatio: 0.9, pricePerGram: PRODUCT_PRICE['cigar'], feeFlora: 11, potency: k('30% THC | 2.6% Terpenos'), minGrams: 10, maxGrams: 50, step: 5, defaultGrams: 20, durationMs: 6500, variant: 'cigar', desc: k('Puro de hoja con corazón de kief.') },
  ] },
  rotavap: { machineId: 'rotovap_extractor', recipes: [
      { id: 'rso', name: k('RSO (Rick Simpson Oil)'), type: 'rso', inputKind: 'flower', yieldRatio: 0.12, pricePerGram: PRODUCT_PRICE['rso'], feeFlora: 16, potency: k('76% THC | 2.2% CBD'), minGrams: 15, maxGrams: 60, step: 5, defaultGrams: 25, durationMs: 8000, variant: 'rso', desc: k('Aceite oscuro, pesado y potente.') },
      { id: 'oil', name: k('Aceite Full Spectrum'), type: 'full_spec_oil', inputKind: 'flower', yieldRatio: 0.4, pricePerGram: PRODUCT_PRICE['oil'], feeFlora: 10, potency: k('65% cannabinoides totales'), minGrams: 10, maxGrams: 60, step: 5, defaultGrams: 20, durationMs: 7000, variant: 'oil', desc: k('Tintura dorada para uso sublingual.') },
      { id: 'gummies', name: k('Gomitas 10 mg (x20)'), type: 'gummies', inputKind: 'trim', yieldRatio: 0.6, pricePerGram: PRODUCT_PRICE['gummies'], feeFlora: 12, potency: k('10 mg THC por gomita'), minGrams: 10, maxGrams: 60, step: 5, defaultGrams: 30, durationMs: 8000, variant: 'gummies', desc: k('Destila el trim y lo vierte en moldes de gomita.') },
  ] },
  hplc: { machineId: 'hplc_analyzer', recipes: [] },
}, ['name', 'potency', 'desc']);

/** a recipe and the station that makes it */
export const RECIPE_BY_ID: Record<string, { recipe: LabRecipe; stationId: StationId; machineId: string }> = Object.fromEntries(
  (Object.keys(STATION_RECIPES) as StationId[]).flatMap((sid) => STATION_RECIPES[sid].recipes.map((r) => [r.id, { recipe: r, stationId: sid, machineId: STATION_RECIPES[sid].machineId }])),
);
export const HPLC_FEE = 15;
