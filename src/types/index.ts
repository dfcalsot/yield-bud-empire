/** training techniques a plant can take, each in its own phase (see sim/techniques.ts) */
export type TechniqueId = 'lst' | 'topping' | 'supercrop' | 'scrog' | 'defoliation' | 'lollipop';

/** germination → seedling → vegetative → flowering → maturation → ready to harvest (see sim/phases.ts) */
export type GrowStage = 'seed' | 'seedling' | 'vegetative' | 'flowering' | 'maturation' | 'ready_harvest';

export interface TerpeneProfile {
  myrcene: number;       // earthy/musky (relaxing)
  limonene: number;      // citrus/zesty (uplifting)
  caryophyllene: number; // peppery/spicy (anti-inflammatory)
  pinene: number;        // pine/fresh (alertness)
  linalool: number;      // floral/lavender (calming)
}

export interface Strain {
  id: string;
  name: string;
  lineage: string;
  type: 'Sativa' | 'Indica' | 'Híbrido' | 'Autofloreciente';
  thcPercentage: number;
  cbdPercentage: number;
  terpenes: TerpeneProfile;
  difficulty: 'F2P Fácil' | 'Intermedio' | 'Maestro' | 'Exótico';
  cycleDurationSeconds: number; // simulated cycle duration
  resinYieldMultiplier: number; // rosin/concentrate bonus
  isPatented?: boolean;
  patentId?: string;
  colorTheme: string;
  description: string;
  /** native region of a landrace: it thrives there (terroir); undefined = adaptable hybrid */
  origin?: RegionId;
}

export interface GrowFacility {
  id: string;
  name: string;
  tier: number;
  costFlora: number;
  capacityPlants: number;
  environmentBonus: number; // boosts growth and trichome purity
  description: string;
  unlocked: boolean;
  /** id of the animated illustration (components/art/GameArt) */
  art: string;
}

export interface MachineEquipment {
  id: string;
  name: string;
  category: 'press' | 'extractor' | 'dryer' | 'lighting' | 'washer' | 'sifter' | 'roller' | 'reactor' | 'analyzer';
  wearPercentage: number; // 100% = pristine, 0% = broken
  wearRatePerCycle: number; // how much it degrades
  repairCostFlora: number;
  efficiencyBonus: number;
  description: string;
  status: 'operativo' | 'mantenimiento_requerido' | 'averiado';
}

export interface PlantInGrow {
  id?: string;
  slotIndex?: number;     // 0 to 29 (30 plantas en total)
  rowIndex?: number;      // Fila 1, 2 o 3
  pairIndex?: number;     // Pareja 1 a 5 dentro de la fila
  positionInPair?: 'A' | 'B'; // Planta A o B dentro de la pareja
  strain: Strain;
  plantedAt: number;
  stage: GrowStage;
  /** techniques already applied to this plant (each one, once) */
  techniques?: TechniqueId[];
  progressPercent: number; // 0 to 100%
  health: number; // 0 to 100%
  soilMoisture: number; // 0 to 100%
  temperatureC: number; // e.g. 24°C
  relativeHumidity: number; // e.g. 55%
  vpdKpa: number; // Vapor Pressure Deficit (calculated)
  ppfdLightIntensity: number; // 200 - 1200 umol/m2/s
  luxLumens: number; // calculated approx: PPFD * 54
  co2Ppm: number; // e.g. 400 - 1500 PPM
  currentRoom: GrowRoomId;
  lightSchedule: '18/6' | '12/12' | '24/0';
  ecLevel: number; // Electrical conductivity (nutrients, e.g. 1.8 mS/cm)
  phLevel: number; // e.g. 6.2
  nutrientBrand: string; // e.g. 'Advanced Nutrients' | 'BioBizz' | 'Athena Pro' | 'Canna'
  autoWateringEnabled?: boolean;
  autoClimateEnabled?: boolean;
  trichomeMaturity: {
    clear: number;  // %
    milky: number;  // % (peak potency)
    amber: number;  // % (body/heavy)
  };
  lastWatered: number;
  lastFed: number;
  estimatedDryYieldGrams: number;
  /** full-precision copy of progress / moisture / EC / health kept by the real-time engine (visible fields are rounded) */
  sim?: { progress: number; moisture: number; ec: number; health: number };
  /** growth bonus from the nutrient brand used at the last feeding */
  feedBonus?: number;
  /** active plague (hours since it appeared) */
  pest?: { kind: PestKind; hours: number };
  /** hours of protection left after a treatment (no new plague while > 0) */
  guard?: number;
  /** simulated hours lived — seeds the deterministic plague dice */
  age?: number;
  /** land plot this plant grows on (undefined = the indoor room) */
  siteId?: string;
  /** sex, decided when the seed is planted (undefined = female: feminized / legacy plants). Shown from 30 % progress. */
  sex?: 'female' | 'male';
  /** a male released pollen nearby: less flower, but the harvest also gives seeds */
  pollinated?: boolean;
}

/** A land plot NFT: 6×6 = 36 plants, with the ratings that decide how well things grow there. */
export interface OwnedPlot {
  id: string;
  region: RegionId;
  index: number;
  name: string;
  ratings: { water: number; sunlight: number; soil: number };
  landRating: number;
  mintedAt: number;
  plants: PlantInGrow[];
}

/** Growing regions of the planet (land plots live here; landrace strains are native to one). */
export type RegionId = 'afghanistan' | 'mexico' | 'jamaica' | 'central_america' | 'south_america' | 'africa' | 'asia';

/** Plagues that can hit a plant: mites (hot / dry / dirty), mould (humid), root rot (over-watered). */
export type PestKind = 'mites' | 'mold' | 'rot';

export type GrowRoomId = 'germination' | 'vegetative' | 'flowering' | 'mothers_fathers';

export interface GrowRoomConfig {
  id: GrowRoomId;
  name: string;
  subtitle: string;
  purpose?: string;
  recommendedLightSchedule: '18/6' | '12/12' | '24/0';
  targetTempC: number;
  targetRhPercent: number;
  targetPpfd: number;
  targetCo2Ppm: number;
  description: string;
  accentColor: string;
  iconType: 'sprout' | 'sun' | 'flower' | 'dna';
}

export interface SeedBankItem {
  id: string;
  name: string;
  breeder: string;
  seedType: 'Feminizada' | 'Autofloreciente' | 'Regular' | 'Landrace' | 'Fast Flowering';
  lineage: string;
  thcPercentage: number;
  cbdPercentage: number;
  floweringWeeks: number;
  yieldGramsPerPlant: number;
  difficulty: 'Fácil' | 'Intermedio' | 'Avanzado' | 'Maestro';
  dominantTerpenes: string[];
  priceFlora: number;
  priceSol: number;
  description: string;
  seedsPerPack: number;
  imageTheme: string;
  inStock: boolean;
  strainTemplate: Strain;
}

export interface SeedInventoryItem {
  seedId: string;
  quantity: number;
  acquiredAt: number;
}

export interface GrowSupplyItem {
  id: string;
  name: string;
  category: 'co2' | 'irrigation' | 'meters' | 'climate' | 'nutrients' | 'lighting';
  categoryLabel: string;
  brand: string;
  priceFlora: number;
  priceSol: number;
  spec: string;
  description: string;
  installed: boolean;
  features: string[];
}

export interface NutrientDoseStage {
  stageName: string;
  phaseCode: string;
  week?: string | number;
  targetPh: string;
  targetEc: string;
  targetPpm500?: string;
  targetPpm?: string;
  recommendedNpk?: string;
  npkRatio?: string;
  dosageMlPerLiter: { productName: string; mlPerL: number }[];
  dosagePerLiter?: { productName: string; mlPerL: number }[];
  dosagesMlPerLiter?: Record<string, number>;
  instructions?: string;
  description?: string;
}

export interface NutrientBrand {
  id: string;
  name: string;
  line: string;
  category: 'Mineral Quelada' | 'Orgánica 100%' | 'Coco Especializada' | 'Sales Grado Comercial';
  origin?: string;
  originCountry?: string;
  philosophy?: string;
  recommendedPhRange?: string | [number, number];
  description: string;
  baseProducts: string[];
  stages: NutrientDoseStage[];
  colorTheme: string;
}

export interface MotherFatherPlant {
  id: string;
  role: 'Madre (Esquejes / Clones)' | 'Padre (Donante de Polen)' | 'Hembra Revertida (STS)';
  strain: Strain;
  name: string;
  strainName?: string;
  generation?: number;
  thcPercentage?: number;
  vigorRating?: number;
  ageDays?: number;
  clonesHarvested?: number;
  pollenGramsCollected?: number;
  health: number;
  clonesCutCount: number;
  pollenCollectedMg: number;
  savedAt: number;
  traits: string[];
}

export interface ProcessedProduct {
  id: string;
  name: string;
  type:
    | 'cured_flower' | 'live_rosin' | 'full_spec_oil' | 'pure_terpenes' | 'v2p_merch'
    | 'bubble_hash' | 'terpene_sauce' | 'kief' | 'preroll' | 'cigar' | 'rso' | 'gummies'
    | 'balm' | 'candle' | 'tincture';
  /** the recipe that made it: it decides the price the market pays (sim/products.ts) */
  recipeId?: string;
  strainOrigin: string;
  quantityGrams: number;
  potency: string;
  qualityScore: number; // 0 - 100
  marketValueFlora: number;
  createdAt: number;
  batchHash: string;
  /** set by the HPLC station: lab-verified certificate of analysis */
  certified?: boolean;
  coaHash?: string;
  coa?: { thc: number; cbd: number; cbn: number; cbg: number; terpenes: number };
}

/** One industrial lab cycle (see runLabProcess in GameContext). */
export interface LabRunSpec {
  machineId: string;
  inputKind: 'flower' | 'trim';
  grams: number;
  type: ProcessedProduct['type'];
  label: string;          // product name without the strain
  recipeId?: string;      // the recipe id: the price of the product comes from sim/products.ts
  yieldRatio: number;     // output grams per input gram (before machine wear)
  potency: string;
  pricePerGram: number;   // $FLORA market value per output gram
  feeFlora: number;       // burned on every cycle (deflationary sink)
  xp?: number;
  /** lab station running the cycle: needs its licence NFT and burns electricity (economy/catalog.ts USE.labKwhPerCycle) */
  stationId?: string;
}

export interface GenomicPatent {
  id: string;
  strainName: string;
  patentNumber: string;
  solanaSignature: string;
  parentA: string;
  parentB: string;
  creatorWallet: string;
  registeredDate: string;
  thc: number;
  cbd: number;
  dominantTerpene: string;
  floraBurnedFee: number;
}

export interface VirtualBrand {
  name: string;
  tagline: string;
  level: number;
  reputation: number;
  dispensaryOpen: boolean;
  totalSalesFlora: number;
  totalV2pShipped: number;
  accentColor: string;
}

export interface SolanaTransaction {
  id: string;
  signature: string;
  type: 'BURN_SPEEDUP' | 'BURN_REPAIR' | 'BURN_PATENT' | 'BURN_PROCESS' | 'BURN_PURCHASE' | 'AIRDROP' | 'V2P_CLAIM' | 'DISPENSARY_SALE';
  amountFlora: number;
  amountSol?: number;
  timestamp: number;
  status: 'confirmed' | 'finalized';
  blockSlot: number;
  memo: string;
}

export interface V2pRedemptionItem {
  id: string;
  title: string;
  category: 'Botanical Terpenes' | 'Premium Hemp CBD' | 'Yield Merch' | 'Vip Dispensary Pass';
  requiredFlora: number;
  stockPhysical: number;
  /** id of the animated illustration (components/art/GameArt) */
  art: string;
  description: string;
  nftCertificateId: string;
}

export interface GameQuest {
  id: string;
  title: string;
  description: string;
  category: 'cultivo' | 'extraccion' | 'genetica' | 'deflacion';
  targetCount: number;
  currentCount: number;
  rewardFlora: number;
  rewardXp: number;
  isCompleted: boolean;
  isClaimed: boolean;
  iconType: 'plant' | 'press' | 'dna' | 'flame' | 'store';
}

export interface CultivatorLevelInfo {
  level: number;
  currentXp: number;
  xpNeededForNext: number;
  title: string;
  badgeColor: string;
  perks: string[];
}

// --- SOLANA NETWORKS & WALLETS ---
export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet';

export interface SolanaNetworkConfig {
  id: SolanaNetwork;
  name: string;
  badgeLabel: string;
  rpcUrl: string;
  explorerCluster: string;
  badgeColor: string;
  isOfficial: boolean;
  description: string;
}

export interface SolanaWalletProviderInfo {
  id: 'phantom' | 'solflare' | 'backpack' | 'injected' | 'virtual';
  name: string;
  iconName: string;
  isInstalled: boolean;
  isDetected: boolean;
  website: string;
  description: string;
}

// --- USER AUTHENTICATION & MULTI-USER DATA ---
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar: string;
  role: 'Master Grower' | 'Breeder Botánico' | 'Genetista Comercial' | 'Inversionista Web3' | 'Principiante Botánico';
  walletAddress?: string;
  preferredNetwork?: SolanaNetwork;
  bio?: string;
  createdAt: number;
  experienceLevel: number;
  facilityName: string;
  /** uploaded picture (re-encoded 256×256 data URL) */
  avatarImage?: string;
  /** equipped NFT avatar design id (see sim/avatars.ts) */
  avatarNft?: string;
}

export interface UserAccountData {
  profile: UserProfile;
  floraBalance: number;
  solBalance: number;
  totalFloraBurned: number;
  activePlant: PlantInGrow | null;
  indoorPlants?: PlantInGrow[];
  selectedPlantIndex?: number;
  seedInventory: { [seedId: string]: number };
  suppliesMarket: GrowSupplyItem[];
  mothersFathers: MotherFatherPlant[];
  patents: GenomicPatent[];
  transactions: SolanaTransaction[];
  quests: GameQuest[];
  playerLevel: number;
  playerXp: number;
  rawFlowerGrams: number;
  trimGrams: number;
  brand: VirtualBrand;
  savedAt: number;
  /** real-time engine bookkeeping (offline catch-up) and lab/automation state */
  lastSimAt?: number;
  machines?: MachineEquipment[];
  processedProducts?: ProcessedProduct[];
  autoWaterActive?: boolean;
  autoClimateActive?: boolean;
  /** NFT assets the player owns (equipment, consumables, licences) — see economy/catalog.ts */
  assets?: import('../economy/catalog').OwnedAsset[];
  /** gardener rating (0–100, falls with neglect / garbage) and the last time the room was cleaned */
  care?: { rating: number; lastCleanAt: number };
  /** land plots the player owns, with the plants growing on them */
  plots?: OwnedPlot[];
  /** collectible NFT avatars and the chest pity counters */
  avatars?: import('../sim/avatars').OwnedAvatar[];
  chestPity?: import('../sim/avatars').PityMap;
  /** NPC missions: event counters and claims (sim/missions.ts) */
  missions?: import('../sim/missions').MissionState;
  /** Chrono's tutorial progress (sim/tutorial.ts) */
  tutorial?: import('../sim/tutorial').TutorialState;
  /** the installation you are using and the ones you have unlocked */
  facilityId?: string;
  unlockedFacilities?: string[];
  /** the installation under construction (sim/facilities.ts) and the plants waiting beyond the current capacity */
  construction?: import('../sim/facilities').Construction | null;
  dormantPlants?: PlantInGrow[];
  /** staff NFTs owned, who works where, and the recruitment chests' guarantee counters (sim/staff.ts) */
  staff?: import('../sim/staff').StaffNft[];
  staffAssign?: Partial<Record<import('../sim/staff').StaffRole, string>>;
  staffPity?: import('../sim/staff').StaffPity;
  /** market depth (grams sold recently) and the time of the last daily claim (sim/economy.ts) */
  marketDepth?: import('../sim/economy').Depth;
  faucetAt?: number;
  /** set on a local save whose contents were brought into a server account (kept as a hidden backup) */
  migratedTo?: string;
}

