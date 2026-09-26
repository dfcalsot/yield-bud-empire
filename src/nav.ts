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
import { k } from './i18n';

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
  /** What the tab means, shown as a tooltip. */
  hint?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: IconComponent;
  tabs: TabId[];
}

export const NAV_TABS: Record<TabId, NavTab> = {
  cultivo: { id: 'cultivo', label: k('Indoor'), icon: CannabisLeaf, hint: k('Cultivo bajo techo, en tu sala con luces') },
  planeta: { id: 'planeta', label: k('Outdoor'), icon: PlanetGlobe, hint: k('Cultivo al aire libre, en las parcelas del planeta') },
  nutrientes: { id: 'nutrientes', label: k('Nutrición'), icon: NutrientBottle },
  semillas: { id: 'semillas', label: k('Semillas'), icon: Seed },
  extraccion: { id: 'extraccion', label: k('Extracción'), icon: RosinPress },
  genetica: { id: 'genetica', label: k('Genética'), icon: DnaLeaf },
  forja: { id: 'forja', label: k('Forja'), icon: ForgeAnvil },
  cria: { id: 'cria', label: k('Cría'), icon: BreedingChamber },
  market: { id: 'market', label: k('Grow Market'), icon: GrowLight },
  dispensario: { id: 'dispensario', label: k('Dispensario'), icon: Dispensary },
  tokenomica: { id: 'tokenomica', label: k('Tokenómica'), icon: LeafCoin },
  whitepaper: { id: 'whitepaper', label: k('Libro Blanco'), icon: BookLeaf },
  perfil: { id: 'perfil', label: k('Perfil'), icon: ProfileBadge },
};

/** The five dock entries. Groups with several tabs show a sub-tab bar in the shell. */
export const NAV_GROUPS: NavGroup[] = [
  { id: 'cultivo', label: k('Cultivo'), icon: CannabisLeaf, tabs: ['cultivo', 'planeta', 'nutrientes'] },
  { id: 'semillas', label: k('Semillas'), icon: Seed, tabs: ['semillas'] },
  { id: 'laboratorio', label: k('Laboratorio'), icon: FlaskLeaf, tabs: ['extraccion', 'forja', 'cria', 'genetica'] },
  { id: 'mercado', label: k('Mercado'), icon: CuringJar, tabs: ['market', 'dispensario'] },
  { id: 'cripto', label: k('Cripto'), icon: LeafCoin, tabs: ['tokenomica', 'whitepaper'] },
  { id: 'perfil', label: k('Perfil'), icon: ProfileBadge, tabs: ['perfil'] },
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
