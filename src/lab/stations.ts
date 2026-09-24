import type { ProcessedProduct } from '../types';
import {
  IconComponent, RosinPress, BubbleWasher, TerpeneJar, KiefSifter, RollingMachine, Rotavap, Chromatograph,
} from '../components/icons/CannabisIcons';
import { k, localize } from '../i18n';

import { STATION_RECIPES, HPLC_FEE, type StationId, type LabRecipe } from './recipes';
export { HPLC_FEE, type StationId, type LabRecipe };

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
    recipes: STATION_RECIPES.rosin.recipes,
  },
  {
    id: 'bubble', name: k('Lavadora Bubble Hash'), short: k('Bubble'), machineId: 'bubble_washer', icon: BubbleWasher, color: '#67e8f9',
    blurb: k('Agua helada y agitador separan las cabezas de tricoma a través de bolsas de 190 / 120 / 73 µm.'),
    recipes: STATION_RECIPES.bubble.recipes,
  },
  {
    id: 'terpsoup', name: k('Sopa de Terpenos'), short: k('Terpenos'), machineId: 'terp_reactor', icon: TerpeneJar, color: '#a3e635',
    blurb: k('Reactor con agitador magnético: una salsa hirviendo de terpenos donde crecen diamantes de THCa.'),
    recipes: STATION_RECIPES.terpsoup.recipes,
  },
  {
    id: 'kief', name: k('Tamizadora de Kief'), short: k('Kief'), machineId: 'kief_sifter', icon: KiefSifter, color: '#fde68a',
    blurb: k('Malla vibratoria que desprende el polvo dorado de tricomas, seco y sin daños.'),
    recipes: STATION_RECIPES.kief.recipes,
  },
  {
    id: 'roller', name: k('Enrolladora de Puros'), short: k('Puros'), machineId: 'rolling_machine', icon: RollingMachine, color: '#f59e0b',
    blurb: k('Rodillos de precisión llenan y enrollan conos y puros con papel de cáñamo.'),
    recipes: STATION_RECIPES.roller.recipes,
  },
  {
    id: 'rotavap', name: k('Rotavapor · RSO, Aceites y Gomitas'), short: k('Rotavap'), machineId: 'rotovap_extractor', icon: Rotavap, color: '#fb923c',
    blurb: k('Matraz giratorio al vacío en baño caliente: destila etanol y deja aceites concentrados.'),
    recipes: STATION_RECIPES.rotavap.recipes,
  },
  {
    id: 'hplc', name: k('Cromatógrafo HPLC'), short: k('Análisis'), machineId: 'hplc_analyzer', icon: Chromatograph, color: '#c084fc',
    blurb: k('Separa THC, CBD, CBN, CBG y terpenos y emite el certificado de análisis (COA) del lote.'),
    recipes: STATION_RECIPES.hplc.recipes,
  },
], ['name', 'short', 'blurb', 'potency', 'desc']);

export const STATION_BY_ID: Record<StationId, LabStation> = Object.fromEntries(STATIONS.map((s) => [s.id, s])) as Record<StationId, LabStation>;


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
