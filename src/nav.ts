import {
  CannabisLeaf,
  Seed,
  FlaskLeaf,
  CuringJar,
  LeafCoin,
  NutrientBottle,
  RosinPress,
  DnaLeaf,
  GrowLight,
  Dispensary,
  BookLeaf,
  IconComponent,
} from './components/icons/CannabisIcons';

export type TabId =
  | 'cultivo'
  | 'semillas'
  | 'market'
  | 'nutrientes'
  | 'extraccion'
  | 'genetica'
  | 'dispensario'
  | 'tokenomica'
  | 'whitepaper';

export interface NavTab {
  id: TabId;
  label: string;
  icon: IconComponent;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: IconComponent;
  tabs: TabId[];
}

export const NAV_TABS: Record<TabId, NavTab> = {
  cultivo: { id: 'cultivo', label: 'Cultivo', icon: CannabisLeaf },
  nutrientes: { id: 'nutrientes', label: 'Nutrición', icon: NutrientBottle },
  semillas: { id: 'semillas', label: 'Semillas', icon: Seed },
  extraccion: { id: 'extraccion', label: 'Extracción', icon: RosinPress },
  genetica: { id: 'genetica', label: 'Genética', icon: DnaLeaf },
  market: { id: 'market', label: 'Grow Market', icon: GrowLight },
  dispensario: { id: 'dispensario', label: 'Dispensario', icon: Dispensary },
  tokenomica: { id: 'tokenomica', label: 'Tokenómica', icon: LeafCoin },
  whitepaper: { id: 'whitepaper', label: 'Libro Blanco', icon: BookLeaf },
};

/** The five dock entries. Groups with several tabs show a sub-tab bar in the shell. */
export const NAV_GROUPS: NavGroup[] = [
  { id: 'cultivo', label: 'Cultivo', icon: CannabisLeaf, tabs: ['cultivo', 'nutrientes'] },
  { id: 'semillas', label: 'Semillas', icon: Seed, tabs: ['semillas'] },
  { id: 'laboratorio', label: 'Laboratorio', icon: FlaskLeaf, tabs: ['extraccion', 'genetica'] },
  { id: 'mercado', label: 'Mercado', icon: CuringJar, tabs: ['market', 'dispensario'] },
  { id: 'cripto', label: 'Cripto', icon: LeafCoin, tabs: ['tokenomica', 'whitepaper'] },
];

export const groupOfTab = (tab: string): NavGroup =>
  NAV_GROUPS.find((g) => g.tabs.includes(tab as TabId)) ?? NAV_GROUPS[0];
