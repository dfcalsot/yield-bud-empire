import {
  CannabisLeaf,
  Seed,
  FlaskLeaf,
  CuringJar,
  LeafCoin,
  NutrientBottle,
  RosinPress,
  DnaLeaf,
  ForgeAnvil,
  GrowLight,
  Dispensary,
  BookLeaf,
  IconComponent,
  PlanetGlobe,
  ProfileBadge,
  BreedingChamber,
} from './components/icons/CannabisIcons';

export type TabId =
  | 'cultivo'
  | 'planeta'
  | 'semillas'
  | 'market'
  | 'nutrientes'
  | 'extraccion'
  | 'forja'
  | 'cria'
  | 'genetica'
  | 'dispensario'
  | 'tokenomica'
  | 'whitepaper'
  | 'perfil';

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
  planeta: { id: 'planeta', label: 'Planeta', icon: PlanetGlobe },
  nutrientes: { id: 'nutrientes', label: 'Nutrición', icon: NutrientBottle },
  semillas: { id: 'semillas', label: 'Semillas', icon: Seed },
  extraccion: { id: 'extraccion', label: 'Extracción', icon: RosinPress },
  genetica: { id: 'genetica', label: 'Genética', icon: DnaLeaf },
  forja: { id: 'forja', label: 'Forja', icon: ForgeAnvil },
  cria: { id: 'cria', label: 'Cría', icon: BreedingChamber },
  market: { id: 'market', label: 'Grow Market', icon: GrowLight },
  dispensario: { id: 'dispensario', label: 'Dispensario', icon: Dispensary },
  tokenomica: { id: 'tokenomica', label: 'Tokenómica', icon: LeafCoin },
  whitepaper: { id: 'whitepaper', label: 'Libro Blanco', icon: BookLeaf },
  perfil: { id: 'perfil', label: 'Perfil', icon: ProfileBadge },
};

/** The five dock entries. Groups with several tabs show a sub-tab bar in the shell. */
export const NAV_GROUPS: NavGroup[] = [
  { id: 'cultivo', label: 'Cultivo', icon: CannabisLeaf, tabs: ['cultivo', 'planeta', 'nutrientes'] },
  { id: 'semillas', label: 'Semillas', icon: Seed, tabs: ['semillas'] },
  { id: 'laboratorio', label: 'Laboratorio', icon: FlaskLeaf, tabs: ['extraccion', 'forja', 'cria', 'genetica'] },
  { id: 'mercado', label: 'Mercado', icon: CuringJar, tabs: ['market', 'dispensario'] },
  { id: 'cripto', label: 'Cripto', icon: LeafCoin, tabs: ['tokenomica', 'whitepaper'] },
  { id: 'perfil', label: 'Perfil', icon: ProfileBadge, tabs: ['perfil'] },
];

/** Accent colour of each zone (palette B "Noche Botánica"): panels, borders and glows follow it through the --zone variable. */
export const TAB_ZONE: Record<TabId, string> = {
  cultivo: '#b8f35a',      // lime
  planeta: '#5eead4',      // teal
  nutrientes: '#c4b5fd',   // violet (chemistry)
  semillas: '#f9a8d4',     // pink (genetics)
  extraccion: '#c4b5fd',   // violet (lab)
  forja: '#fbbf24',        // amber (forge)
  cria: '#fb7185',         // rose (breeding chamber)
  genetica: '#f9a8d4',     // pink
  market: '#fcd34d',       // gold
  dispensario: '#fdba74',  // peach
  tokenomica: '#fcd34d',   // gold
  whitepaper: '#c4b5fd',   // violet
  perfil: '#b8f35a',       // lime
};

export const groupOfTab = (tab: string): NavGroup =>
  NAV_GROUPS.find((g) => g.tabs.includes(tab as TabId)) ?? NAV_GROUPS[0];
