import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import { diagnose as diagnoseMix, dosesFromTable, feedEffect, phCorrection, solve as solveMix, stageOfProgress, strengthForEc, type Mix } from '../sim/nutrition';
import {
  Strain,
  GrowFacility,
  MachineEquipment,
  PlantInGrow,
  ProcessedProduct,
  LabRunSpec,
  PestKind,
  OwnedPlot,
  RegionId,
  GenomicPatent,
  VirtualBrand,
  SolanaTransaction,
  GrowStage,
  V2pRedemptionItem,
  GameQuest,
  SeedBankItem,
  GrowSupplyItem,
  NutrientBrand,
  GrowRoomId,
  MotherFatherPlant,
  SolanaNetwork,
  UserProfile,
  UserAccountData
} from '../types';
import {
  INITIAL_STRAINS,
  INITIAL_FACILITIES,
  INITIAL_MACHINES,
  INITIAL_V2P_ITEMS,
  INITIAL_QUESTS,
  INITIAL_SEED_BANK,
  INITIAL_GROW_SUPPLIES,
  NUTRIENT_BRANDS_DATABASE,
  GROW_ROOMS_CONFIG,
  INITIAL_MOTHERS_FATHERS
} from '../data/initialData';
import {
  SOLANA_NETWORKS,
  connectBrowserWallet,
  generateSolanaKeypair,
  fetchLiveSolBalance,
  requestSolanaAirdrop,
  signSolanaMessage
} from '../utils/solana';
import {
  getStoredUserProfiles,
  saveUserProfile,
  getActiveUserId,
  setActiveUserId,
  loadUserData,
  saveUserData,
  DEFAULT_DEMO_USERS
} from '../utils/auth';
import {
  playWaterSound,
  playHarvestChime,
  playBurnSound,
  playClickSound,
  playLevelUpSound,
  playQuestCompleteSound,
  playGoldenDripSound,
  isSoundEnabled,
  setSoundEnabled
} from '../utils/audio';

import { advanceWorld, calculateVpd, etaSeconds, formatDuration, isMale, maleCount, pestCount, PEST_INFO, plotEtaSeconds, powerDraw, sexFor, sexRevealed, SEEDS_PER_POLLINATED, SimEnv } from '../sim/engine';
import { siteConditions, plotOffer, terroirOf, REGION_BY_ID, PLOT_SIZE, type PlotOffer } from '../sim/terroir';
import { CHESTS, DUPLICATE_REFUND, EMPTY_PITY, DESIGN_BY_ID, rollChest, seasonOf, type AvatarDesign, type ChestId, type OwnedAvatar, type PityMap } from '../sim/avatars';
import {
  CATALOG_BY_ID, OwnedAsset, USE, newAsset, starterAssets, equipStatsOf, stockOf, spendResource, bestFeedBonus, repairCostOf,
  ownsStation, EquipStats, pestStock, spendPest, gardenerLevelOf, garbageOf, starterPestKit,
} from '../economy/catalog';
import { BALANCE } from '../sim/balance';
import { applySpeedUp, buildHoursOf, fitToCapacity, isDone, normalizeConstruction, speedUpQuote, startConstruction, type Construction } from '../sim/facilities';
import { bump as bumpMissions, claimErrand, claimStory, emptyMissions, normalizeMissions, rewardSummary, type MissionEvent, type MissionReward, type MissionState } from '../sim/missions';
import type { NpcKind } from '../components/npc/Npc';
import { claimStep as claimTutStep, emptyTutorial, normalizeTutorial, skipStep as skipTutStep, startTutorial as startTutState, type TutorialState } from '../sim/tutorial';
export { calculateVpd };

// Generate realistic Solana signature
export function generateSolanaSignature(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let sig = '';
  for (let i = 0; i < 88; i++) {
    sig += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sig;
}

export interface FertigationInput {
  ec: number; ph: number; feedBonus: number; healthDelta: number; score: number; label: string;
  scope: 'one' | 'all';
  brandName?: string;
}

interface GameContextType {
  // Wallet / Solana & Networks
  walletAddress: string;
  isWalletConnected: boolean;
  solanaNetwork: SolanaNetwork;
  setSolanaNetwork: (net: SolanaNetwork) => void;
  connectedWalletType: string;
  connectWallet: () => void;
  connectSpecificWallet: (providerType: 'phantom' | 'solflare' | 'backpack' | 'injected' | 'virtual') => Promise<boolean>;
  generateVirtualKeypair: () => { publicKey: string; secretKeyHex: string };
  signAuthMessageTest: () => Promise<boolean>;
  refreshLiveBalance: () => Promise<number>;
  disconnectWallet: () => void;
  floraBalance: number;
  solBalance: number;
  totalFloraBurned: number;
  burnStats: {
    speedUp: number;
    repairs: number;
    patents: number;
    v2p: number;
  };
  transactions: SolanaTransaction[];
  requestAirdrop: () => void;

  // User Accounts & Data Isolation
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  allUserProfiles: UserProfile[];
  loginUser: (usernameOrEmail: string) => boolean;
  registerUser: (profile: Omit<UserProfile, 'id' | 'createdAt'>) => boolean;
  loginWithSolanaWallet: () => boolean;
  switchUserAccount: (userId: string) => boolean;
  importLocalSave: (fromUserId: string) => boolean;
  logoutUser: () => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;

  // Cultivation & Indoor Grow Room (3 filas de 10 plantas en pares de 2)
  facilities: GrowFacility[];
  currentFacility: GrowFacility;
  upgradeFacility: (facilityId: string) => void;
  /** the installation being built (null when none) and the paid speed-up (burns $FLORA, limited per day) */
  construction: Construction | null;
  speedUpConstruction: () => boolean;
  strains: Strain[];
  activePlant: PlantInGrow | null;
  indoorPlants: PlantInGrow[];
  selectedPlantIndex: number;
  selectPlant: (index: number) => void;
  waterAllPlants: () => void;
  feedAllPlants: () => void;
  harvestAllReadyPlants: () => void;
  plantIndoorBatch: (strain: Strain) => void;
  speedUpIndoorRoom: () => boolean;
  trainIndoorCanopy: () => void;
  plantNewSeed: (strain: Strain, seedType?: string) => void;
  waterPlant: () => void;
  feedNutrients: () => void;
  setTemperature: (temp: number) => void;
  setHumidity: (rh: number) => void;
  setPpfd: (ppfd: number) => void;
  setLightSchedule: (schedule: '18/6' | '12/12' | '24/0') => void;
  trainPlant: (technique: string) => void;
  speedUpGrowth: () => boolean;
  harvestPlant: () => void;

  // Inventory & Processing
  rawFlowerGrams: number;
  trimGrams: number;
  processedProducts: ProcessedProduct[];
  machines: MachineEquipment[];
  processRawFlower: (type: 'cured_flower' | 'live_rosin' | 'full_spec_oil' | 'pure_terpenes', gramsInput: number) => boolean;
  runLabProcess: (spec: LabRunSpec) => ProcessedProduct | null;
  /** real seconds until a plant is ready to harvest at its current conditions (Infinity if stalled) */
  getPlantEta: (plant: PlantInGrow) => number;
  certifyProduct: (productId: string, feeFlora?: number) => ProcessedProduct | null;
  repairMachine: (machineId: string) => boolean;

  // Genetics & Patents
  patents: GenomicPatent[];
  breedStrains: (parentA: Strain, parentB: Strain, name: string) => Strain;
  registerPatent: (strain: Strain) => boolean;

  // Seed Bank & Grow Supplies Market
  seedBank: SeedBankItem[];
  seedInventory: { [seedId: string]: number };
  buySeed: (seedId: string, currency?: 'FLORA' | 'SOL') => boolean;
  plantFromSeedBank: (seedId: string) => boolean;
  suppliesMarket: GrowSupplyItem[];
  buySupply: (supplyId: string, currency?: 'FLORA' | 'SOL') => boolean;

  // NFT assets: equipment, consumables (water / nutrients / electricity) and lab licences
  assets: OwnedAsset[];
  equipStats: EquipStats;
  /** litres of water, ml of nutrient and kWh of electricity in stock, and the electric runway in days */
  resources: { water: number; nutrient: number; energy: number; kwhPerDay: number; solarKwhPerDay: number; energyDays: number };
  buyAsset: (catalogId: string, currency?: 'FLORA' | 'SOL', qty?: number) => boolean;
  setAssetEquipped: (assetId: string, equipped: boolean) => void;
  repairAsset: (assetId: string) => boolean;
  ownsStation: (stationId: string) => boolean;

  // Plagues, gardener rating and nursery mode (HashKings-inspired)
  /** NPC missions: event counters + story/daily claims (sim/missions.ts). `claim*` return the character's reply, or null if not claimable */
  missions: MissionState;
  reportEvent: (event: MissionEvent, n?: number) => void;
  claimStoryMission: (id: string) => string | null;
  claimErrandMission: (npc: NpcKind) => string | null;
  /** Chrono's tutorial (sim/tutorial.ts) */
  tutorial: TutorialState;
  startTutorial: () => void;
  claimTutorialStep: () => string | null;
  skipTutorialStep: () => void;
  patchTutorial: (p: Partial<TutorialState>) => void;
  care: { rating: number; cleanReadyInHours: number; pests: number; plotPests: number; males: number; plotMales: number; pollinated: number; garbage: number; gardenerLevel: 0 | 1 | 2; gardenerDays: number };
  treatPests: (scope: 'selected' | 'all', plotId?: string) => void;
  cleanRoom: () => boolean;
  recycleGarbage: () => void;

  // Land plots on the planet: NFT parcels of 36 plants that grow outdoors under the sun and the weather
  plots: OwnedPlot[];
  /** plots still for sale in a region (the next few, cheapest number first) and how many are left in total */
  plotsForSale: (region: RegionId) => { offers: PlotOffer[]; left: number };
  buyPlot: (offerId: string, currency?: 'FLORA' | 'SOL') => boolean;
  plantPlot: (plotId: string, seedId: string, count?: number) => boolean;
  waterPlot: (plotId: string, all?: boolean) => void;
  feedPlot: (plotId: string) => void;
  harvestPlot: (plotId: string) => void;
  plotEta: (plot: OwnedPlot, plant: PlantInGrow) => number;
  /** pull up the revealed males of the room (no plotId) or of a plot */
  removeMales: (plotId?: string) => void;
  // Profile: collectible NFT avatars minted by opening chests
  avatars: OwnedAvatar[];
  chestPity: PityMap;
  showNotification: (message: string, type: 'success' | 'burn' | 'info') => void;
  openChest: (id: ChestId, currency?: 'FLORA' | 'SOL') => { design: AvatarDesign; isNew: boolean; refund: number; owned: OwnedAvatar } | null;
  equipAvatar: (designId: string | null) => void;
  /** keep a male of a plot as a pollen donor in the Sanctuary of mothers & fathers */
  keepMaleAsFather: (plotId: string, slot: number) => void;

  // Nutrient Tables & Feeding
  nutrientBrands: NutrientBrand[];
  selectedNutrientBrand: string;
  setSelectedNutrientBrand: (brandId: string) => void;
  applyNutrientStage: (stageIndex: number) => void;
  /** Apply a prepared nutrient solution (from the Nutrition lab or tables) to the selected plant or the whole room. Spends stock; returns false if it could not. */
  applyFertigation: (f: FertigationInput) => boolean;

  // Grow Rooms & Climate/Irrigation Automation
  currentRoom: GrowRoomId;
  switchGrowRoom: (roomId: GrowRoomId) => void;
  co2Ppm: number;
  setCo2Ppm: (ppm: number) => void;
  autoWaterActive: boolean;
  toggleAutoWater: () => void;
  autoClimateActive: boolean;
  toggleAutoClimate: () => void;
  calibrateMeter: (meterType: 'ph' | 'ec' | 'par' | 'lux') => void;

  // Mothers, Fathers & Hybridization
  mothersFathers: MotherFatherPlant[];
  saveCurrentPlantAsMotherOrFather: (role: 'Madre (Esquejes / Clones)' | 'Padre (Donante de Polen)') => boolean;
  takeCloneFromMother: (motherId: string) => boolean;
  collectPollenFromFather: (fatherId: string) => number;
  hybridizeParents: (motherId: string, fatherId: string, newStrainName: string) => Strain | null;

  // Brand & V2P
  brand: VirtualBrand;
  updateBrand: (name: string, tagline: string) => void;
  sellProduct: (productId: string) => void;
  v2pItems: V2pRedemptionItem[];
  redeemV2p: (item: V2pRedemptionItem, shippingDetails: { name: string; country: string }) => boolean;
  redeemedV2pList: { item: V2pRedemptionItem; timestamp: number; txSig: string; recipient: string }[];

  // Gaming & Progression
  playerLevel: number;
  playerXp: number;
  xpNeeded: number;
  rankTitle: string;
  addXp: (amount: number, reason?: string) => void;
  quests: GameQuest[];
  claimQuestReward: (questId: string) => void;
  executeManualRosinPress: (yieldBonus: number, quality: number, isCritical: boolean) => void;

  // Sound
  soundEnabled: boolean;
  toggleSound: () => void;

  // Notification / Toast helper
  notification: { message: string; type: 'success' | 'burn' | 'info' } | null;
  clearNotification: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

// Helper to generate the 30-plant indoor grow room (3 rows of 10 plants, arranged in pairs of 2)
export const createInitialIndoorRoom = (baseStrain: Strain): PlantInGrow[] => {
  const plants: PlantInGrow[] = [];
  for (let r = 1; r <= 3; r++) {
    for (let p = 1; p <= 5; p++) {
      for (const pos of ['A', 'B'] as const) {
        const slotIdx = (r - 1) * 10 + (p - 1) * 2 + (pos === 'A' ? 0 : 1);
        // Realistic vegetative / flowering stages across the canopy
        const progressBase = 30 + ((slotIdx % 8) * 8);
        const stage: GrowStage = progressBase >= 95 ? 'ready_harvest' : progressBase >= 50 ? 'flowering' : progressBase >= 15 ? 'vegetative' : 'seedling';
        const temp = Number((24.0 + (r * 0.2) + ((slotIdx % 3) * 0.1)).toFixed(1));
        const rh = Number((58 - (r * 1) + ((slotIdx % 4) * 0.5)).toFixed(1));
        const vpd = calculateVpd(temp, rh);

        plants.push({
          id: `indoor-r${r}-p${p}-${pos}`,
          slotIndex: slotIdx,
          rowIndex: r,
          pairIndex: p,
          positionInPair: pos,
          strain: baseStrain,
          plantedAt: Date.now() - (slotIdx * 60000 + 120000),
          stage,
          progressPercent: Math.min(100, progressBase),
          health: Math.min(100, 94 + (slotIdx % 4)),
          soilMoisture: Math.min(95, 68 + ((slotIdx % 5) * 5)),
          temperatureC: temp,
          relativeHumidity: rh,
          vpdKpa: vpd,
          ppfdLightIntensity: 650 + (p * 25),
          luxLumens: Math.round((650 + (p * 25)) * 54),
          co2Ppm: 750,
          currentRoom: 'vegetative',
          lightSchedule: '18/6',
          ecLevel: 1.8,
          phLevel: 6.2,
          nutrientBrand: 'advanced_nutrients',
          autoWateringEnabled: false,
          autoClimateEnabled: false,
          trichomeMaturity: {
            clear: Math.max(5, 90 - progressBase),
            milky: Math.min(70, Math.max(10, progressBase - 25)),
            amber: Math.max(0, progressBase - 70)
          },
          lastWatered: Date.now() - (slotIdx * 30000),
          lastFed: Date.now() - (slotIdx * 60000),
          estimatedDryYieldGrams: Math.round(75 * baseStrain.resinYieldMultiplier + (slotIdx % 10))
        });
      }
    }
  }
  return plants;
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- USER AUTH & MULTI-ACCOUNT STATE ---
  const [allUserProfiles, setAllUserProfiles] = useState<UserProfile[]>(() => getStoredUserProfiles());
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const users = getStoredUserProfiles();
    const activeId = getActiveUserId();
    return users.find(u => u.id === activeId) || users[0] || null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  // --- SOLANA NETWORKS & WALLET STATE ---
  const [solanaNetwork, setSolanaNetworkState] = useState<SolanaNetwork>(() => {
    const users = getStoredUserProfiles();
    const activeId = getActiveUserId();
    const user = users.find(u => u.id === activeId) || users[0];
    return user?.preferredNetwork || 'devnet';
  });
  const [connectedWalletType, setConnectedWalletType] = useState<string>('Phantom');
  const [activeProviderInstance, setActiveProviderInstance] = useState<any>(null);

  // Wallet State
  const [walletAddress, setWalletAddress] = useState<string>(() => {
    const users = getStoredUserProfiles();
    const activeId = getActiveUserId();
    const user = users.find(u => u.id === activeId) || users[0];
    return user?.walletAddress || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
  });
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(true);
  const [floraBalance, setFloraBalance] = useState<number>(350);
  const [solBalance, setSolBalance] = useState<number>(1.85);
  const [totalFloraBurned, setTotalFloraBurned] = useState<number>(142850);
  const [burnStats, setBurnStats] = useState({
    speedUp: 38200,
    repairs: 49450,
    patents: 32500,
    v2p: 22700
  });
  const [transactions, setTransactions] = useState<SolanaTransaction[]>([
    {
      id: 'tx-init-1',
      signature: '5K2Qp8eA1V7xL7n4M8B9c...genesisSolana',
      type: 'BURN_SPEEDUP',
      amountFlora: 25,
      timestamp: Date.now() - 3600000 * 4,
      status: 'finalized',
      blockSlot: 248910243,
      memo: 'Yield Bud Empire: Speedup Boost (Anchor Instruction #4)'
    },
    {
      id: 'tx-init-2',
      signature: '3vK9xZbWp12LMn98RtU12...burnAnchor',
      type: 'BURN_REPAIR',
      amountFlora: 65,
      timestamp: Date.now() - 3600000 * 2,
      status: 'finalized',
      blockSlot: 248914890,
      memo: 'Yield Bud Empire: Prensa Hidráulica 10T Overhaul (Permanent Burn)'
    }
  ]);

  // Cultivation
  const [facilities, setFacilities] = useState<GrowFacility[]>(INITIAL_FACILITIES);
  const [currentFacility, setCurrentFacility] = useState<GrowFacility>(INITIAL_FACILITIES[0]);
  const [strains, setStrains] = useState<Strain[]>(INITIAL_STRAINS);
  
  // Seed Bank & Inventory
  const [seedBank, setSeedBank] = useState<SeedBankItem[]>(INITIAL_SEED_BANK);
  const [seedInventory, setSeedInventory] = useState<{ [seedId: string]: number }>({
    seed_chrono_og: 3,
    seed_gelato_auto: 1
  });

  // Grow Supplies Market
  const [suppliesMarket, setSuppliesMarket] = useState<GrowSupplyItem[]>(INITIAL_GROW_SUPPLIES);

  // Nutrient Brands & Feeding
  const [nutrientBrands, setNutrientBrands] = useState<NutrientBrand[]>(NUTRIENT_BRANDS_DATABASE);
  const [selectedNutrientBrand, setSelectedNutrientBrand] = useState<string>('advanced_nutrients');

  // Rooms & Microclimate Automation
  const [currentRoom, setCurrentRoom] = useState<GrowRoomId>('vegetative');
  const [co2Ppm, setCo2PpmState] = useState<number>(750);
  const [assets, setAssets] = useState<OwnedAsset[]>(() => starterAssets());
  const assetsRef = useRef<OwnedAsset[]>(assets);
  assetsRef.current = assets;
  // gardener rating (0–100): falls with neglect and garbage, rises when the room is cleaned / garbage recycled
  const [care, setCare] = useState<{ rating: number; lastCleanAt: number }>({ rating: 100, lastCleanAt: 0 });
  const [plots, setPlots] = useState<OwnedPlot[]>([]);
  const [avatars, setAvatars] = useState<OwnedAvatar[]>([]);
  const [chestPity, setChestPity] = useState<PityMap>(EMPTY_PITY);
  const [missions, setMissions] = useState<MissionState>(emptyMissions);
  const missionsRef = useRef<MissionState>(missions);
  const applyMissions = useCallback((next: MissionState) => { missionsRef.current = next; setMissions(next); }, []);
  const reportEvent = useCallback((event: MissionEvent, n = 1) => { applyMissions(bumpMissions(missionsRef.current, event, n)); }, [applyMissions]);
  const [tutorial, setTutorial] = useState<TutorialState>(emptyTutorial);
  const tutorialRef = useRef<TutorialState>(tutorial);
  const applyTutorial = useCallback((next: TutorialState) => { tutorialRef.current = next; setTutorial(next); }, []);
  const plotsRef = useRef<OwnedPlot[]>(plots);
  plotsRef.current = plots;
  const [autoWaterActive, setAutoWaterActive] = useState<boolean>(false);
  const [autoClimateActive, setAutoClimateActive] = useState<boolean>(false);

  // Mothers, Fathers & Breeding Genotypes
  const [mothersFathers, setMothersFathers] = useState<MotherFatherPlant[]>(INITIAL_MOTHERS_FATHERS);

  // Indoor Grow Room: 3 Rows of 10 Plants in pairs of 2 (30 plants total)
  // (the room is only as big as the installation: the starter closet holds one plant; the rest stay dormant until the room grows)
  const [indoorPlants, setIndoorPlants] = useState<PlantInGrow[]>(() => {
    return createInitialIndoorRoom(INITIAL_STRAINS[0]).slice(0, INITIAL_FACILITIES[0].capacityPlants);
  });
  const [dormantPlants, setDormantPlants] = useState<PlantInGrow[]>([]);
  const [construction, setConstruction] = useState<Construction | null>(null);
  const [selectedPlantIndex, setSelectedPlantIndex] = useState<number>(0);

  // Active plant refers to currently selected plant in the indoor room
  const activePlant = indoorPlants[selectedPlantIndex] || indoorPlants[0] || null;

  const selectPlant = useCallback((index: number) => {
    if (index >= 0 && index < indoorRef.current.length) {
      setSelectedPlantIndex(index);
    }
  }, []);

  const setActivePlant = useCallback((updater: React.SetStateAction<PlantInGrow | null>) => {
    setIndoorPlants(prev => {
      const current = prev[selectedPlantIndex] || prev[0];
      const updated = typeof updater === 'function' ? updater(current) : updater;
      if (!updated) {
        return prev.map((p, idx) => idx === selectedPlantIndex ? {
          ...p,
          stage: 'seed' as GrowStage,
          progressPercent: 0,
          health: 100,
          soilMoisture: 85,
          plantedAt: Date.now(),
          trichomeMaturity: { clear: 100, milky: 0, amber: 0 }
        } : p);
      }
      return prev.map((p, idx) => idx === selectedPlantIndex ? updated : p);
    });
  }, [selectedPlantIndex]);

  // Inventory
  const [rawFlowerGrams, setRawFlowerGrams] = useState<number>(145);
  const [trimGrams, setTrimGrams] = useState<number>(60);
  const [processedProducts, setProcessedProducts] = useState<ProcessedProduct[]>([
    {
      id: 'prod-init-1',
      name: 'Yield OG Live Rosin 90u',
      type: 'live_rosin',
      strainOrigin: 'Yield Foundation OG',
      quantityGrams: 8.5,
      potency: '78.5% THC | 6.2% Terps',
      qualityScore: 94,
      marketValueFlora: 340,
      createdAt: Date.now() - 86400000,
      batchHash: '0x9fa4b8...c721'
    },
    {
      id: 'prod-init-2',
      name: 'Solana Silver Cured Buds (Glass Jar)',
      type: 'cured_flower',
      strainOrigin: 'Solana Super Silver',
      quantityGrams: 28,
      potency: '24.2% THC',
      qualityScore: 91,
      marketValueFlora: 280,
      createdAt: Date.now() - 43200000,
      batchHash: '0x3cb17f...e411'
    }
  ]);

  // Machines
  const [machines, setMachines] = useState<MachineEquipment[]>(INITIAL_MACHINES);

  // Genetics & Patents
  const [patents, setPatents] = useState<GenomicPatent[]>([
    {
      id: 'pat-001',
      strainName: 'Emerald Terp Queen',
      patentNumber: 'SOL-PAT-9941-X',
      solanaSignature: '4gR7TxW9zL1m...AnchorPat',
      parentA: 'Gelato 41',
      parentB: 'Yield Bud Gene v2',
      creatorWallet: '7xKX...sU',
      registeredDate: '2026-03-12',
      thc: 25.4,
      cbd: 3.5,
      dominantTerpene: 'Mirceno & Linalol',
      floraBurnedFee: 250
    }
  ]);

  // Brand & V2P
  const [brand, setBrand] = useState<VirtualBrand>({
    name: 'YieldSol Botanicals',
    tagline: 'Genéticas de Cáñamo y Cannabis de Alta Pureza On-Chain',
    level: 2,
    reputation: 98,
    dispensaryOpen: true,
    totalSalesFlora: 1840,
    totalV2pShipped: 3,
    accentColor: '#10b981'
  });
  const [v2pItems, setV2pItems] = useState<V2pRedemptionItem[]>(INITIAL_V2P_ITEMS);
  const [redeemedV2pList, setRedeemedV2pList] = useState<{ item: V2pRedemptionItem; timestamp: number; txSig: string; recipient: string }[]>([]);

  // Sound
  const [sound, setSound] = useState(isSoundEnabled());

  // Notification Toast
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'burn' | 'info' } | null>(null);

  const showNotification = useCallback((message: string, type: 'success' | 'burn' | 'info') => {
    setNotification({ message, type });
  }, []);

  const clearNotification = () => setNotification(null);

  // Gaming & Progression System
  const [playerLevel, setPlayerLevel] = useState<number>(1);
  const [playerXp, setPlayerXp] = useState<number>(160);
  const [quests, setQuests] = useState<GameQuest[]>(INITIAL_QUESTS);

  const getXpNeeded = (level: number) => {
    if (level === 1) return 300;
    if (level === 2) return 750;
    if (level === 3) return 1600;
    if (level === 4) return 3200;
    return 6000;
  };

  const getRankTitle = (level: number) => {
    if (level === 1) return 'Novato del Sustrato';
    if (level === 2) return 'Horticultor Botánico';
    if (level === 3) return 'Alquimista de Terpenos';
    if (level === 4) return 'Maestro Extractor Rosin';
    return 'Titán Genético Multiverso';
  };

  const xpNeeded = getXpNeeded(playerLevel);
  const rankTitle = getRankTitle(playerLevel);

  const updateQuestProgress = (questId: string, increment = 1) => {
    setQuests(prev => prev.map(q => {
      if (q.id === questId && !q.isCompleted) {
        const nextCount = q.currentCount + increment;
        const completed = nextCount >= q.targetCount;
        if (completed) {
          showNotification(`¡Misión lograda: "${q.title}"! Reclama tu recompensa en la barra de misiones`, 'success');
        }
        return {
          ...q,
          currentCount: nextCount,
          isCompleted: completed
        };
      }
      return q;
    }));
  };

  const addXp = (amount: number, reason?: string) => {
    setPlayerXp(prev => {
      const total = prev + amount;
      const needed = getXpNeeded(playerLevel);
      if (total >= needed) {
        const nextLvl = playerLevel + 1;
        setPlayerLevel(nextLvl);
        setFloraBalance(b => b + 100);
        playLevelUpSound();
        confetti({
          particleCount: 130,
          spread: 90,
          origin: { y: 0.4 },
          colors: ['#10b981', '#fbbf24', '#a855f7', '#38bdf8']
        });
        showNotification(`¡SUBISTE DE NIVEL! Rango: ${getRankTitle(nextLvl)} (Nivel ${nextLvl}) • Bono +100 $FLORA`, 'success');
        return total - needed;
      }
      return total;
    });
  };

  const claimQuestReward = (questId: string) => {
    const targetQuest = quests.find(q => q.id === questId);
    if (!targetQuest || !targetQuest.isCompleted || targetQuest.isClaimed) return;

    playQuestCompleteSound();
    setQuests(prev => prev.map(q => q.id === questId ? { ...q, isClaimed: true } : q));
    setFloraBalance(prev => prev + targetQuest.rewardFlora);
    addXp(targetQuest.rewardXp, `Misión: ${targetQuest.title}`);
    showNotification(`¡Recompensa reclamada! +${targetQuest.rewardFlora} $FLORA y +${targetQuest.rewardXp} XP`, 'success');
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
  };

  // Add Solana burn transaction
  const recordBurnTransaction = useCallback((type: SolanaTransaction['type'], amount: number, memo: string) => {
    const sig = generateSolanaSignature();
    const newTx: SolanaTransaction = {
      id: `tx-${Date.now()}`,
      signature: sig,
      type,
      amountFlora: amount,
      timestamp: Date.now(),
      status: 'confirmed',
      blockSlot: 248920000 + Math.floor(Math.random() * 5000),
      memo
    };

    setTransactions(prev => [newTx, ...prev.slice(0, 24)]);
    setFloraBalance(prev => Math.max(0, prev - amount));
    setTotalFloraBurned(prev => prev + amount);

    playBurnSound();

    if (type === 'BURN_SPEEDUP') {
      setBurnStats(prev => ({ ...prev, speedUp: prev.speedUp + amount }));
    } else if (type === 'BURN_REPAIR' || type === 'BURN_PROCESS' || type === 'BURN_PURCHASE') {
      setBurnStats(prev => ({ ...prev, repairs: prev.repairs + amount }));
    } else if (type === 'BURN_PATENT') {
      setBurnStats(prev => ({ ...prev, patents: prev.patents + amount }));
    } else if (type === 'V2P_CLAIM') {
      setBurnStats(prev => ({ ...prev, v2p: prev.v2p + amount }));
    }
  }, []);

  // --- REAL-TIME SIMULATION (src/sim/engine.ts) ---
  const lastSimRef = useRef<number>(Date.now());
  const indoorRef = useRef<PlantInGrow[]>(indoorPlants);
  indoorRef.current = indoorPlants;
  const simEnvRef = useRef<SimEnv>(null as unknown as SimEnv);
  const equipStats = equipStatsOf(assets);
  simEnvRef.current = {
    // automation only works with the matching NFT equipment installed (and not broken)
    autoWater: autoWaterActive && equipStats.autoWater,
    autoClimate: autoClimateActive && equipStats.hasAc,
    facilityBonus: currentFacility.environmentBonus,
    co2Ppm: Math.max(co2Ppm, equipStats.co2Ppm),
    lightOn: 1,
    equip: equipStats,
    cleanliness: care.rating,
    gardener: gardenerLevelOf(assets) > 0 ? { water: true, feed: true, treat: gardenerLevelOf(assets) >= 2, feedBonus: bestFeedBonus(assets) } : undefined,
    getRoomTarget: (roomId) => {
      const r = GROW_ROOMS_CONFIG.find(x => x.id === (roomId || currentRoom));
      return r ? { tempC: r.targetTempC, rh: r.targetRhPercent } : undefined;
    },
  };

  // --- USER DATA RESTORATION & PERSISTENCE ---
  const saveCurrentUserDataForUser = useCallback((userId: string) => {
    if (!userId) return;
    const userToSave = allUserProfiles.find(u => u.id === userId);
    if (!userToSave) return;

    saveUserData(userId, {
      profile: userToSave,
      floraBalance,
      solBalance,
      totalFloraBurned,
      activePlant,
      indoorPlants,
      selectedPlantIndex,
      seedInventory,
      suppliesMarket,
      mothersFathers,
      patents,
      transactions,
      quests,
      playerLevel,
      playerXp,
      rawFlowerGrams,
      trimGrams,
      brand,
      lastSimAt: lastSimRef.current,
      machines,
      processedProducts,
      autoWaterActive,
      autoClimateActive,
      assets,
      care,
      plots,
      avatars,
      chestPity,
      missions,
      tutorial,
      facilityId: currentFacility.id,
      unlockedFacilities: facilities.filter(f => f.unlocked).map(f => f.id),
      construction,
      dormantPlants,
      savedAt: Date.now()
    });
  }, [
    allUserProfiles,
    floraBalance,
    solBalance,
    totalFloraBurned,
    activePlant,
    indoorPlants,
    selectedPlantIndex,
    seedInventory,
    suppliesMarket,
    mothersFathers,
    patents,
    transactions,
    quests,
    playerLevel,
    playerXp,
    rawFlowerGrams,
    trimGrams,
    brand,
    machines,
    processedProducts,
    autoWaterActive,
    autoClimateActive,
    assets,
    care,
    plots,
    avatars,
    chestPity,
    missions,
    tutorial,
    currentFacility,
    facilities,
    construction,
    dormantPlants
  ]);

  const loadUserDataForUser = useCallback((userId: string, seedIfMissing: boolean = true) => {
    const saved = loadUserData(userId);
    applyMissions(normalizeMissions(saved?.missions));
    applyTutorial(normalizeTutorial(saved?.tutorial));
    {
      // the installation you built survives a reload (it used to reset to the starter kit)
      const unlocked = new Set<string>(['tent_starter', ...(Array.isArray(saved?.unlockedFacilities) ? saved!.unlockedFacilities! : [])]);
      const list = INITIAL_FACILITIES.map(f => ({ ...f, unlocked: f.unlocked || unlocked.has(f.id) }));
      setFacilities(list);
      setCurrentFacility(list.find(f => f.id === saved?.facilityId && f.unlocked) ?? list[0]);
      setConstruction(normalizeConstruction(saved?.construction));
      setDormantPlants(Array.isArray(saved?.dormantPlants) ? saved!.dormantPlants! : []);
    }
    if (saved) {
      if (typeof saved.floraBalance === 'number') setFloraBalance(saved.floraBalance);
      if (typeof saved.solBalance === 'number') setSolBalance(saved.solBalance);
      if (typeof saved.totalFloraBurned === 'number') setTotalFloraBurned(saved.totalFloraBurned);
      if (Array.isArray(saved.indoorPlants) && saved.indoorPlants.length > 0) {
        setIndoorPlants(saved.indoorPlants);
      } else if (saved.activePlant) {
        setActivePlant(saved.activePlant);
      }
      if (typeof saved.selectedPlantIndex === 'number') {
        setSelectedPlantIndex(saved.selectedPlantIndex);
      }
      if (saved.seedInventory) setSeedInventory(saved.seedInventory);
      if (saved.suppliesMarket) setSuppliesMarket(saved.suppliesMarket);
      if (saved.mothersFathers) setMothersFathers(saved.mothersFathers);
      if (saved.patents) setPatents(saved.patents);
      if (saved.transactions) setTransactions(saved.transactions);
      if (saved.quests) setQuests(saved.quests);
      if (typeof saved.playerLevel === 'number') setPlayerLevel(saved.playerLevel);
      if (typeof saved.playerXp === 'number') setPlayerXp(saved.playerXp);
      if (typeof saved.rawFlowerGrams === 'number') setRawFlowerGrams(saved.rawFlowerGrams);
      if (typeof saved.trimGrams === 'number') setTrimGrams(saved.trimGrams);
      if (saved.brand) setBrand(saved.brand);
      if (Array.isArray(saved.machines)) setMachines(INITIAL_MACHINES.map(m => saved.machines!.find(x => x.id === m.id) ?? m));
      if (Array.isArray(saved.processedProducts)) setProcessedProducts(saved.processedProducts);
      if (typeof saved.autoWaterActive === 'boolean') setAutoWaterActive(saved.autoWaterActive);
      if (typeof saved.autoClimateActive === 'boolean') setAutoClimateActive(saved.autoClimateActive);
      // saves from before the asset economy get the starter kit
      const loadedAssets = Array.isArray(saved.assets) ? saved.assets : starterAssets();
      // saves from before plagues existed get a one-off treatment kit
      setAssets(Array.isArray(saved.assets) && !saved.care ? [...loadedAssets, ...starterPestKit()] : loadedAssets);
      if (saved.care) setCare(saved.care);
      setPlots(Array.isArray(saved.plots) ? saved.plots : []);
      setAvatars(Array.isArray(saved.avatars) ? saved.avatars : []);
      setChestPity(saved.chestPity ?? EMPTY_PITY);
      lastSimRef.current = saved.lastSimAt ?? saved.savedAt ?? Date.now();
    } else if (seedIfMissing) {
      // Seed preset demo data
      if (userId === 'usr-satoshi') {
        setFloraBalance(12500);
        setSolBalance(4.25);
        setPlayerLevel(14);
        setPlayerXp(420);
        setSeedInventory({ seed_chrono_og: 5, seed_gelato_auto: 3, seed_amnesia_haze: 2 });
      } else if (userId === 'usr-elena') {
        setFloraBalance(8200);
        setSolBalance(3.10);
        setPlayerLevel(9);
        setPlayerXp(310);
        setSeedInventory({ seed_gelato_auto: 4, seed_purple_punch: 2 });
      } else if (userId === 'usr-novice') {
        setFloraBalance(500);
        setSolBalance(1.50);
        setPlayerLevel(2);
        setPlayerXp(45);
        setSeedInventory({ seed_chrono_og: 1 });
      }
    }
  }, [applyMissions, applyTutorial]);

  // --- SOLANA NETWORKS & WALLETS ---
  const refreshLiveBalance = useCallback(async (): Promise<number> => {
    if (!walletAddress) return solBalance;
    try {
      const liveSol = await fetchLiveSolBalance(walletAddress, solanaNetwork);
      if (liveSol > 0) {
        setSolBalance(liveSol);
      }
      return liveSol;
    } catch {
      return solBalance;
    }
  }, [walletAddress, solanaNetwork, solBalance]);

  const setSolanaNetwork = useCallback((network: SolanaNetwork) => {
    setSolanaNetworkState(network);
    const netConfig = SOLANA_NETWORKS[network];
    showNotification(`Red Solana cambiada a: ${netConfig.name}`, 'info');
    setTimeout(() => {
      fetchLiveSolBalance(walletAddress, network).then(bal => {
        if (bal > 0) setSolBalance(bal);
      });
    }, 400);
  }, [walletAddress, showNotification]);

  const connectSpecificWallet = useCallback(async (providerType: 'phantom' | 'solflare' | 'backpack' | 'injected' | 'virtual'): Promise<boolean> => {
    try {
      if (providerType === 'virtual') {
        const kp = generateSolanaKeypair();
        setWalletAddress(kp.publicKey);
        setConnectedWalletType('Virtual Keypair');
        setIsWalletConnected(true);
        setActiveProviderInstance(null);
        showNotification(`Billetera Virtual Solana generada: ${kp.publicKey.slice(0, 4)}...${kp.publicKey.slice(-4)}`, 'success');
        return true;
      }

      const res = await connectBrowserWallet(providerType);
      setWalletAddress(res.publicKey);
      setConnectedWalletType(res.providerName);
      setActiveProviderInstance(res.provider);
      setIsWalletConnected(true);
      showNotification(`Billetera ${res.providerName} conectada: ${res.publicKey.slice(0, 4)}...${res.publicKey.slice(-4)}`, 'success');
      
      fetchLiveSolBalance(res.publicKey, solanaNetwork).then(bal => {
        if (bal > 0) setSolBalance(bal);
      });
      return true;
    } catch (err: any) {
      showNotification(err.message || 'Error al conectar billetera', 'burn');
      return false;
    }
  }, [solanaNetwork, showNotification]);

  const generateVirtualKeypair = useCallback(() => {
    const kp = generateSolanaKeypair();
    setWalletAddress(kp.publicKey);
    setConnectedWalletType('Virtual Keypair');
    setIsWalletConnected(true);
    showNotification(`Nueva clave Solana Ed25519 generada: ${kp.publicKey.slice(0, 6)}...`, 'success');
    return { publicKey: kp.publicKey, secretKeyHex: kp.secretKeyHex };
  }, [showNotification]);

  const signAuthMessageTest = useCallback(async (): Promise<boolean> => {
    try {
      const msg = `Yield Bud Empire Botanical Web3 Auth | Cultivador: ${currentUser?.displayName || 'Anónimo'} | Red: ${solanaNetwork} | Timestamp: ${Date.now()}`;
      const res = await signSolanaMessage(activeProviderInstance, msg);
      showNotification(`¡Firma criptográfica verificada con éxito! Hash: ${res.signature.slice(0, 10)}...`, 'success');
      return true;
    } catch (err: any) {
      showNotification(`Firma cancelada: ${err.message || 'Error'}`, 'burn');
      return false;
    }
  }, [activeProviderInstance, currentUser, solanaNetwork, showNotification]);

  const requestAirdrop = useCallback(async () => {
    const netConfig = SOLANA_NETWORKS[solanaNetwork];
    if (solanaNetwork === 'mainnet-beta') {
      setFloraBalance(prev => prev + 500);
      showNotification('Mainnet Oficial: No se permite airdrop de SOL real. Se añadieron +500 $FLORA de utilidad.', 'info');
      return;
    }

    try {
      showNotification(`Solicitando 1.0 SOL de prueba en ${netConfig.name}...`, 'info');
      const res = await requestSolanaAirdrop(walletAddress, solanaNetwork, 1.0);
      setSolBalance(prev => Number((prev + 1.0).toFixed(2)));
      setFloraBalance(prev => prev + 500);

      const newTx: SolanaTransaction = {
        id: `tx-airdrop-${Date.now()}`,
        signature: res.signature,
        type: 'AIRDROP',
        amountFlora: 500,
        amountSol: 1.0,
        timestamp: Date.now(),
        status: 'confirmed',
        blockSlot: 248925100,
        memo: `Solana ${netConfig.badgeLabel} Faucet: +500 $FLORA, +1.0 SOL`
      };
      setTransactions(prev => [newTx, ...prev]);
      showNotification(`¡Airdrop exitoso en ${netConfig.badgeLabel}! +1.0 SOL y +500 $FLORA`, 'success');
    } catch (err: any) {
      setFloraBalance(prev => prev + 500);
      setSolBalance(prev => Number((prev + 1.0).toFixed(2)));
      showNotification(`Airdrop de prueba aplicado: +1.0 SOL y +500 $FLORA`, 'success');
    }
  }, [solanaNetwork, walletAddress, showNotification]);

  const connectWallet = useCallback(() => {
    connectSpecificWallet('injected');
  }, [connectSpecificWallet]);

  const disconnectWallet = useCallback(() => {
    setIsWalletConnected(false);
    setConnectedWalletType('Ninguna');
    showNotification('Billetera Solana desconectada', 'info');
  }, [showNotification]);

  // --- USER AUTHENTICATION & MULTI-ACCOUNT ACTIONS ---
  const switchUserAccount = useCallback((userId: string): boolean => {
    if (currentUser?.id) {
      saveCurrentUserDataForUser(currentUser.id);
    }
    const targetUser = allUserProfiles.find(u => u.id === userId);
    if (!targetUser) return false;

    setActiveUserId(userId);
    setCurrentUser(targetUser);
    setIsAuthenticated(true);
    if (targetUser.walletAddress) {
      setWalletAddress(targetUser.walletAddress);
      setIsWalletConnected(true);
    }
    if (targetUser.preferredNetwork) {
      setSolanaNetworkState(targetUser.preferredNetwork);
    }
    loadUserDataForUser(userId);
    showNotification(`Sesión cambiada a: ${targetUser.displayName} (${targetUser.role})`, 'success');
    return true;
  }, [currentUser, allUserProfiles, saveCurrentUserDataForUser, loadUserDataForUser, showNotification]);

  /** Bring a save that lives in this browser (another local profile) into the active account. The original stays as a hidden backup. */
  const importLocalSave = useCallback((fromUserId: string): boolean => {
    if (!currentUser?.id || fromUserId === currentUser.id) return false;
    const saved = loadUserData(fromUserId);
    if (!saved || saved.migratedTo) return false;
    saveUserData(currentUser.id, { ...saved, profile: currentUser, migratedTo: undefined });
    loadUserDataForUser(currentUser.id, false);
    saveUserData(fromUserId, { ...saved, migratedTo: currentUser.id });
    showNotification(`Partida recuperada: ${saved.plots?.length ?? 0} parcela(s), ${Math.round(saved.floraBalance ?? 0)} $FLORA, nivel ${saved.playerLevel ?? 1}`, 'success');
    return true;
  }, [currentUser, loadUserDataForUser, showNotification]);

  const loginUser = useCallback((usernameOrEmail: string): boolean => {
    const clean = usernameOrEmail.trim().toLowerCase();
    const found = allUserProfiles.find(u => 
      u.username.toLowerCase() === clean || 
      u.email.toLowerCase() === clean ||
      (u.walletAddress && u.walletAddress.toLowerCase() === clean)
    );

    if (found) {
      return switchUserAccount(found.id);
    } else {
      showNotification('Usuario o correo no encontrado. Puedes registrarte en la pestaña de Registro.', 'burn');
      return false;
    }
  }, [allUserProfiles, switchUserAccount, showNotification]);

  const registerUser = useCallback((profileData: Omit<UserProfile, 'id' | 'createdAt'>): boolean => {
    if (!profileData.username || !profileData.displayName) {
      showNotification('Por favor completa nombre y usuario.', 'burn');
      return false;
    }

    const newId = `usr-${Date.now()}`;
    const newProfile: UserProfile = {
      ...profileData,
      id: newId,
      createdAt: Date.now(),
      walletAddress: profileData.walletAddress || walletAddress
    };

    saveUserProfile(newProfile);
    setAllUserProfiles(prev => [...prev, newProfile]);
    
    // Save fresh starter data for new user
    saveUserData(newId, {
      profile: newProfile,
      floraBalance: 500,
      solBalance: 2.0,
      totalFloraBurned: 0,
      activePlant: {
        strain: INITIAL_STRAINS[0],
        plantedAt: Date.now(),
        stage: 'vegetative',
        progressPercent: 15,
        health: 100,
        soilMoisture: 80,
        temperatureC: 24.0,
        relativeHumidity: 60,
        vpdKpa: calculateVpd(24.0, 60),
        ppfdLightIntensity: 550,
        luxLumens: 550 * 54,
        co2Ppm: 600,
        currentRoom: 'vegetative',
        lightSchedule: '18/6',
        ecLevel: 1.4,
        phLevel: 6.2,
        nutrientBrand: 'general_hydroponics',
        autoWateringEnabled: false,
        autoClimateEnabled: false,
        trichomeMaturity: { clear: 100, milky: 0, amber: 0 },
        lastWatered: Date.now(),
        lastFed: Date.now(),
        estimatedDryYieldGrams: 65
      },
      seedInventory: { seed_chrono_og: 2 },
      suppliesMarket: INITIAL_GROW_SUPPLIES,
      mothersFathers: [],
      patents: [],
      transactions: [],
      quests: INITIAL_QUESTS,
      playerLevel: 1,
      playerXp: 0,
      rawFlowerGrams: 0,
      trimGrams: 0,
      brand: {
        name: `${newProfile.displayName}'s Craft Botanicals`,
        tagline: 'Genéticas puras cultivadas en Yield Bud Empire',
        level: 1,
        reputation: 100,
        dispensaryOpen: true,
        totalSalesFlora: 0,
        totalV2pShipped: 0,
        accentColor: '#10b981'
      },
      savedAt: Date.now()
    });

    switchUserAccount(newId);
    showNotification(`¡Bienvenido a Yield Bud Empire, ${newProfile.displayName}! Paquete de inicio activado (+500 $FLORA, 2.0 SOL).`, 'success');
    return true;
  }, [walletAddress, switchUserAccount, showNotification]);

  const loginWithSolanaWallet = useCallback((): boolean => {
    if (!walletAddress) {
      showNotification('Conecta tu billetera Solana primero para iniciar sesión con Web3.', 'burn');
      return false;
    }

    const existingUser = allUserProfiles.find(u => u.walletAddress?.toLowerCase() === walletAddress.toLowerCase());
    if (existingUser) {
      return switchUserAccount(existingUser.id);
    }

    const web3Username = `sol_${walletAddress.slice(0, 4)}_${walletAddress.slice(-4)}`.toLowerCase();
    return registerUser({
      username: web3Username,
      email: `${web3Username}@solana.id`,
      displayName: `Grower ${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
      avatar: '⚡',
      role: 'Inversionista Web3',
      walletAddress: walletAddress,
      preferredNetwork: solanaNetwork,
      bio: `Cultivador verificado on-chain con billetera Solana ${walletAddress}.`,
      experienceLevel: 1,
      facilityName: `Instalación Solana #${walletAddress.slice(-4)}`
    });
  }, [walletAddress, allUserProfiles, solanaNetwork, switchUserAccount, registerUser, showNotification]);

  const logoutUser = useCallback(() => {
    if (currentUser?.id) {
      saveCurrentUserDataForUser(currentUser.id);
    }
    setIsAuthenticated(false);
    showNotification('Has cerrado sesión. Puedes ingresar con otra cuenta o con tu billetera Solana.', 'info');
  }, [currentUser, saveCurrentUserDataForUser, showNotification]);

  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated: UserProfile = { ...currentUser, ...updates };
    setCurrentUser(updated);
    saveUserProfile(updated);
    setAllUserProfiles(prev => prev.map(u => u.id === updated.id ? updated : u));
    showNotification('Perfil de cultivador actualizado con éxito.', 'success');
  }, [currentUser, showNotification]);

  // Real-time world clock: advances every plant by the *real* time elapsed (also after being away).
  const runTick = useCallback((extraSeconds: number = 0) => {
    const now = Date.now();
    const dt = (now - lastSimRef.current) / 1000 + extraSeconds;
    lastSimRef.current = now;
    if (dt < 0.5) return;
    // consumables the simulation may spend during this span (electricity, tank water, nutrients, treatments, the
    // gardener's contract days); applied to the NFT lots afterwards
    const stock = assetsRef.current;
    const treat0 = pestStock(stock);
    const budget = { waterL: stockOf(stock, 'water'), energyKwh: stockOf(stock, 'energy'), nutrientMl: stockOf(stock, 'nutrient'), treatMl: { ...treat0 }, gardenerDays: stockOf(stock, 'service') };
    const plotsBefore = plotsRef.current;
    const plotList = plotsBefore.flatMap(pl => pl.plants);
    const env: SimEnv = {
      ...simEnvRef.current,
      budget: { ...budget, treatMl: { ...treat0 } },
      // plots: the weather is a pure function of region + time, so catch-up replays exactly what happened
      clockMs: now - Math.min(dt, BALANCE.maxCatchUpSeconds) * 1000,
      site: (siteId, ms) => { const pl = plotsBefore.find(x => x.id === siteId); return pl ? siteConditions(pl.region, pl.ratings, ms) : undefined; },
    };
    const before = indoorRef.current;
    const everything = advanceWorld([...before, ...plotList], dt, env);
    const after = everything.slice(0, before.length);
    let off = before.length;
    const plotsAfter = plotsBefore.map(pl => { const plants = everything.slice(off, off + pl.plants.length); off += pl.plants.length; return { ...pl, plants }; });
    const plotAfterList = plotsAfter.flatMap(pl => pl.plants);
    const eb = env.budget!;
    const usedWater = budget.waterL - eb.waterL;
    const usedEnergy = budget.energyKwh - eb.energyKwh;
    const usedNutrient = budget.nutrientMl - (eb.nutrientMl ?? 0);
    const usedDays = budget.gardenerDays - (eb.gardenerDays ?? 0);
    const usedTreat = (['mites', 'mold', 'rot'] as const).map(k => [k, treat0[k] - (eb.treatMl?.[k] ?? 0)] as const).filter(([, v]) => v > 1e-6);
    const days = Math.min(dt, BALANCE.maxCatchUpSeconds) / 86400;
    if (usedWater > 1e-6 || usedEnergy > 1e-6 || usedNutrient > 1e-6 || usedDays > 1e-9 || usedTreat.length || stock.some(a => a.equipped && CATALOG_BY_ID[a.catalogId]?.kind === 'equipment')) {
      setAssets(prev => {
        let next = prev;
        if (usedWater > 1e-6) next = spendResource(next, 'water', Math.min(usedWater, stockOf(next, 'water'))) ?? next;
        if (usedEnergy > 1e-6) next = spendResource(next, 'energy', Math.min(usedEnergy, stockOf(next, 'energy'))) ?? next;
        if (usedNutrient > 1e-6) next = spendResource(next, 'nutrient', Math.min(usedNutrient, stockOf(next, 'nutrient'))) ?? next;
        if (usedDays > 1e-9) next = spendResource(next, 'service', Math.min(usedDays, stockOf(next, 'service'))) ?? next;
        for (const [k, v] of usedTreat) next = spendPest(next, k, v).assets;
        // installed gear wears with time (a lamp only while there was power to run it)
        return next.map(a => {
          const it = CATALOG_BY_ID[a.catalogId];
          if (!a.equipped || it?.kind !== 'equipment' || (a.durability ?? 0) <= 0) return a;
          const running = it.category === 'lamp' ? usedEnergy > 1e-6 || (env.equip?.solarKw ?? 0) > 0 : true;
          if (!running) return a;
          return { ...a, durability: Math.max(0, Number(((a.durability ?? 100) - (it.wearPerDay ?? 0) * days).toFixed(3))) };
        });
      });
    }
    // gardener rating: falls with neglect and garbage while there are plants (a master gardener nearly stops it)
    if (before.length > 0 || plotList.length > 0) {
      const decay = (USE.ratingDecayPerDay + USE.garbageDecayPerDay * garbageOf(stock).length) * days * (gardenerLevelOf(stock) >= 2 ? 0.1 : 1);
      if (decay > 0) setCare(c => ({ ...c, rating: Math.max(0, Number((c.rating - decay).toFixed(3))) }));
    }
    const newPests = [...after.filter((p, i) => p.pest && !before[i]?.pest), ...plotAfterList.filter((p, i) => p.pest && !plotList[i]?.pest)];
    if (budget.energyKwh > 0 && eb.energyKwh <= 0 && (env.equip?.lampWatts ?? 0) > 0 && (env.equip?.solarKw ?? 0) * 0.25 < 0.3) {
      showNotification('⚡ Se acabó la electricidad: las lámparas se apagaron y las plantas dejan de crecer. Compra un Bono de Energía en el Grow Market.', 'burn');
    } else if (budget.waterL > 0 && eb.waterL <= 0 && (env.autoWater || env.gardener?.water)) {
      showNotification('💧 El tanque de agua está vacío: el riego automático se detuvo.', 'burn');
    } else if (budget.gardenerDays > 0 && (eb.gardenerDays ?? 0) <= 0 && before.length > 0) {
      showNotification('🧑‍🌾 Terminó el contrato de tu jardinero. Renuévalo en el Grow Market → Servicios de vivero.', 'info');
    } else if (newPests.length > 0 && dt <= 1800) {
      const kinds = newPests.reduce<Record<string, number>>((m, p) => { const k = PEST_INFO[p.pest!.kind].label; m[k] = (m[k] ?? 0) + 1; return m; }, {});
      showNotification(`🐛 Plaga detectada en ${newPests.length} planta${newPests.length > 1 ? 's' : ''} (${Object.entries(kinds).map(([k, n]) => `${k} ×${n}`).join(', ')}). Trátalas desde el botón Cuidado.`, 'burn');
    }
    const allBefore = [...before, ...plotList];
    const allAfter = [...after, ...plotAfterList];
    const newMales = allAfter.filter((p, i) => isMale(p) && sexRevealed(p) && !(allBefore[i] && isMale(allBefore[i]) && sexRevealed(allBefore[i])));
    const newPollinated = allAfter.filter((p, i) => p.pollinated && !allBefore[i]?.pollinated);
    if (dt <= 1800 && newPollinated.length > 0) {
      showNotification(`🐝 ¡Polinización! ${newPollinated.length} hembra${newPollinated.length > 1 ? 's' : ''} recibieron polen: darán un 40 % menos de flor pero también semillas. Habrá que quitar el macho a tiempo la próxima vez.`, 'burn');
    } else if (dt <= 1800 && newMales.length > 0) {
      showNotification(`♂ ¡Macho detectado en ${newMales.length} planta${newMales.length > 1 ? 's' : ''}! Quítalo antes de que llegue a flor (55 %) o polinizará a las hembras. También puedes guardarlo como padre.`, 'burn');
    }
    if (dt > 1800) {
      // welcome-back summary for long absences
      const avg = (arr: PlantInGrow[], f: (p: PlantInGrow) => number) => arr.reduce((a, p) => a + f(p), 0) / Math.max(1, arr.length);
      const grew = avg(after, p => p.progressPercent) - avg(before, p => p.progressPercent);
      const thirsty = after.filter(p => p.stage !== 'ready_harvest' && p.soilMoisture < BALANCE.thirstyBelow).length;
      const ready = after.filter(p => p.stage === 'ready_harvest').length;
      const sick = pestCount(after);
      showNotification(
        `Han pasado ${formatDuration(Math.min(dt, BALANCE.maxCatchUpSeconds))}: tus plantas crecieron +${grew.toFixed(1)}%${ready ? ` (${ready} listas para cosechar)` : ''}${thirsty ? `. ¡${thirsty} necesitan agua!` : '.'}${sick ? ` 🐛 ${sick} con plaga.` : ''}${newMales.length ? ` ♂ ${newMales.length} macho${newMales.length > 1 ? 's' : ''} por quitar.` : ''}${newPollinated.length ? ` 🐝 ${newPollinated.length} polinizada${newPollinated.length > 1 ? 's' : ''}.` : ''}`,
        thirsty || sick ? 'info' : 'success'
      );
    }
    setIndoorPlants(after);
    if (plotsBefore.length > 0) setPlots(plotsAfter);
  }, [showNotification]);

  useEffect(() => {
    const id = window.setInterval(() => runTick(), BALANCE.liveTickSeconds * 1000);
    const onVisible = () => { if (!document.hidden) runTick(); };
    document.addEventListener('visibilitychange', onVisible);
    // DEV: window.__cfWarp(seconds) fast-forwards the world clock (days of play in one call)
    if (import.meta.env.DEV) (window as unknown as { __cfWarp?: (s: number) => void }).__cfWarp = (s: number) => runTick(s);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [runTick]);

  // Restore the saved game when the page opens (the game used to start from scratch on every reload)
  useEffect(() => {
    if (!currentUser) return;
    if (loadUserData(currentUser.id)) {
      loadUserDataForUser(currentUser.id, false);
      runTick(); // offline catch-up right away
    } else {
      lastSimRef.current = Date.now();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave: every 20 s, when the tab is hidden and when it closes
  const saveNowRef = useRef<() => void>(() => {});
  saveNowRef.current = () => { if (currentUser?.id) saveCurrentUserDataForUser(currentUser.id); };
  useEffect(() => {
    const save = () => saveNowRef.current();
    const id = window.setInterval(save, 20000);
    const onHide = () => { if (document.hidden) save(); };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', save);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', save);
    };
  }, []);

  // Actions on active plant & room-wide batch actions
  /** Takes `amount` of a consumable from the NFT lots, or explains what is missing. */
  const takeResource = (kind: 'water' | 'nutrient', amount: number): boolean => {
    const next = spendResource(assets, kind, amount);
    if (!next) {
      showNotification(
        kind === 'water'
          ? `Sin agua suficiente (${amount.toFixed(1)} L necesarios, quedan ${stockOf(assets, 'water').toFixed(1)} L). Compra agua en el Grow Market.`
          : `Sin nutrientes suficientes (${amount} ml necesarios, quedan ${Math.floor(stockOf(assets, 'nutrient'))} ml). Compra fertilizante en el Grow Market.`,
        'burn'
      );
      return false;
    }
    setAssets(prev => spendResource(prev, kind, amount) ?? prev);
    return true;
  };

  /** Lab cycle gate: the station licence NFT must be owned and the electricity is drawn from the stock. */
  const takeStation = (stationId: string | undefined): boolean => {
    if (!stationId) return true;
    if (!ownsStation(assets, stationId)) {
      showNotification('Esta estación necesita su licencia NFT. Cómprala en el Grow Market → Licencias de laboratorio.', 'info');
      return false;
    }
    const kwh = USE.labKwhPerCycle[stationId] ?? 0;
    if (kwh > 0) {
      if (stockOf(assets, 'energy') + 1e-9 < kwh) {
        showNotification(`Sin electricidad: el ciclo necesita ${kwh} kWh y quedan ${stockOf(assets, 'energy').toFixed(1)} kWh. Compra un Bono de Energía.`, 'burn');
        return false;
      }
      setAssets(prev => spendResource(prev, 'energy', kwh) ?? prev);
    }
    return true;
  };

  const waterPlant = () => {
    if (!takeResource('water', USE.waterPerPlantManual)) return;
    playWaterSound();
    setIndoorPlants(prev => prev.map((p, idx) => {
      if (idx !== selectedPlantIndex) return p;
      return {
        ...p,
        soilMoisture: Math.min(100, p.soilMoisture + 55),
        health: Math.min(100, p.health + 5),
        lastWatered: Date.now()
      };
    }));
    updateQuestProgress('quest_water_micro', 1);
    reportEvent('water', 1);
    addXp(20, 'Riego y Calibración');
    showNotification(`Riego completado en Planta #${selectedPlantIndex + 1} (+20 XP)`, 'info');
  };

  const waterAllPlants = () => {
    if (!takeResource('water', USE.waterPerPlantManual * indoorPlants.length)) return;
    playWaterSound();
    setIndoorPlants(prev => prev.map(p => ({
      ...p,
      soilMoisture: Math.min(100, p.soilMoisture + 55),
      health: Math.min(100, p.health + 5),
      lastWatered: Date.now()
    })));
    updateQuestProgress('quest_water_micro', 5);
    reportEvent('water', indoorPlants.length);
    addXp(60, 'Riego Masivo Sala Indoor');
    showNotification('¡Riego por goteo activado en las 3 filas (30 plantas de la sala)! (+60 XP)', 'info');
  };

  const feedNutrients = () => {
    if (!takeResource('nutrient', USE.nutrientPerPlant)) return;
    playClickSound();
    const feedBonus = bestFeedBonus(assets);
    setIndoorPlants(prev => prev.map((p, idx) => {
      if (idx !== selectedPlantIndex) return p;
      return {
        ...p,
        feedBonus,
        ecLevel: 2.1,
        phLevel: 6.2,
        health: Math.min(100, p.health + 10),
        lastFed: Date.now()
      };
    }));
    reportEvent('feed', 1);
    addXp(25, 'Nutrición N-P-K');
    showNotification(`Nutrición N-P-K optimizada en Planta #${selectedPlantIndex + 1} (+25 XP)`, 'info');
  };

  const feedAllPlants = () => {
    if (!takeResource('nutrient', USE.nutrientPerPlant * indoorPlants.length)) return;
    playClickSound();
    const feedBonus = bestFeedBonus(assets);
    setIndoorPlants(prev => prev.map(p => ({
      ...p,
      feedBonus,
      ecLevel: 2.1,
      phLevel: 6.2,
      health: Math.min(100, p.health + 10),
      lastFed: Date.now()
    })));
    reportEvent('feed', indoorPlants.length);
    addXp(75, 'Fertirriego Masivo');
    showNotification('Fertirriego N-P-K aplicado a las 30 plantas de la sala (+75 XP)', 'info');
  };

  const setTemperature = (temp: number) => {
    setIndoorPlants(prev => prev.map((p, idx) => {
      if (idx !== selectedPlantIndex) return p;
      const vpd = calculateVpd(temp, p.relativeHumidity);
      return { ...p, temperatureC: temp, vpdKpa: vpd };
    }));
  };

  const setHumidity = (rh: number) => {
    setIndoorPlants(prev => prev.map((p, idx) => {
      if (idx !== selectedPlantIndex) return p;
      const vpd = calculateVpd(p.temperatureC, rh);
      return { ...p, relativeHumidity: rh, vpdKpa: vpd };
    }));
  };

  const setPpfd = (ppfd: number) => {
    // Light fixtures illuminate the entire indoor room canopy
    setIndoorPlants(prev => prev.map(p => ({
      ...p,
      ppfdLightIntensity: ppfd,
      luxLumens: Math.round(ppfd * 54)
    })));
  };

  const setLightSchedule = (schedule: '18/6' | '12/12' | '24/0') => {
    playClickSound();
    setIndoorPlants(prev => prev.map(p => ({
      ...p,
      lightSchedule: schedule
    })));
    showNotification(`Ciclo fotoperiódico de la sala indoor ajustado a ${schedule}`, 'info');
  };

  const trainPlant = (technique: string) => {
    playClickSound();
    setIndoorPlants(prev => prev.map((p, idx) => {
      if (idx !== selectedPlantIndex) return p;
      const bonusYield = Math.round(p.estimatedDryYieldGrams * 0.12);
      return {
        ...p,
        estimatedDryYieldGrams: p.estimatedDryYieldGrams + bonusYield,
        health: Math.max(80, p.health - 4)
      };
    }));
    addXp(35, 'Entrenamiento LST');
    showNotification(`Técnica (${technique}) en Planta #${selectedPlantIndex + 1}: +12% rendimiento (+35 XP)`, 'info');
  };

  const trainIndoorCanopy = () => {
    playClickSound();
    setIndoorPlants(prev => prev.map(p => ({
      ...p,
      estimatedDryYieldGrams: p.estimatedDryYieldGrams + Math.round(p.estimatedDryYieldGrams * 0.12),
      health: Math.max(80, p.health - 3)
    })));
    addXp(60, 'Entrenamiento Canopia SCROG');
    showNotification('Entrenamiento SCROG aplicado a la canopia completa de la sala (+12% rendimiento floral)', 'info');
  };

  // Speed up growth by burning 25 $FLORA
  const speedUpGrowth = (): boolean => {
    if (floraBalance < 25) {
      showNotification('Saldo insuficiente: Necesitas al menos 25 $FLORA para acelerar el cultivo', 'info');
      return false;
    }

    recordBurnTransaction('BURN_SPEEDUP', 25, 'Yield Bud Empire: Aceleración Fotónica Planta Individual (Quema de 25 $FLORA)');
    
    setIndoorPlants(prev => prev.map((p, idx) => {
      if (idx !== selectedPlantIndex) return p;
      const nextProgress = Math.min(100, p.progressPercent + 35);
      let nextStage = p.stage;
      if (nextProgress >= 95) nextStage = 'ready_harvest';
      else if (nextProgress >= 50) nextStage = 'flowering';
      else if (nextProgress >= 15) nextStage = 'vegetative';
      return {
        ...p,
        progressPercent: nextProgress,
        stage: nextStage
      };
    }));

    showNotification(`¡25 $FLORA quemados! Planta #${selectedPlantIndex + 1} acelerada un +35%`, 'burn');
    return true;
  };

  const speedUpIndoorRoom = (): boolean => {
    if (floraBalance < 50) {
      showNotification('Saldo insuficiente: Necesitas al menos 50 $FLORA para acelerar la sala completa', 'info');
      return false;
    }

    recordBurnTransaction('BURN_SPEEDUP', 50, 'Yield Bud Empire: Aceleración Fotónica Sala Indoor Completa (30 Plantas)');

    setIndoorPlants(prev => prev.map(p => {
      const nextProgress = Math.min(100, p.progressPercent + 30);
      let nextStage = p.stage;
      if (nextProgress >= 95) nextStage = 'ready_harvest';
      else if (nextProgress >= 50) nextStage = 'flowering';
      else if (nextProgress >= 15) nextStage = 'vegetative';
      return {
        ...p,
        progressPercent: nextProgress,
        stage: nextStage
      };
    }));

    showNotification('¡50 $FLORA quemados! Aceleración cuántica aplicada a las 3 filas (30 plantas de la sala)', 'burn');
    return true;
  };

  // Harvest single plant
  const harvestPlant = () => {
    const target = indoorPlants[selectedPlantIndex];
    if (!target) return;
    playHarvestChime();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#f59e0b', '#a855f7']
    });

    const maleTarget = target.sex === 'male';
    const flowerHarvested = maleTarget ? 0 : Math.round(target.estimatedDryYieldGrams * (target.health / 100));
    const trimHarvested = Math.round(flowerHarvested * 0.4);
    const seedsGot = !maleTarget && target.pollinated ? giveSeeds(target.strain, SEEDS_PER_POLLINATED) : 0;

    setRawFlowerGrams(prev => prev + flowerHarvested);
    setTrimGrams(prev => prev + trimHarvested);

    updateQuestProgress('quest_harvest_run', 1);
    if (!maleTarget) reportEvent('harvest', 1);
    addXp(180, 'Cosecha F2P');

    showNotification(maleTarget ? `Planta #${selectedPlantIndex + 1} era macho: no da flor. La sala queda libre para una hembra.` : `¡Cosecha exitosa! Planta #${selectedPlantIndex + 1}: +${flowerHarvested}g Flor Seca y +${trimHarvested}g Biomasa${seedsGot ? ` y 🌰 ${seedsGot} semillas (fue polinizada)` : ''} (+180 XP)`, 'success');

    // Reset plant to fresh seedling
    setIndoorPlants(prev => prev.map((p, idx) => {
      if (idx !== selectedPlantIndex) return p;
      return {
        ...p,
        stage: 'seedling' as GrowStage,
        progressPercent: 5,
        health: 98,
        soilMoisture: 80,
        plantedAt: Date.now(),
        trichomeMaturity: { clear: 95, milky: 5, amber: 0 },
        sex: 'female' as const,
        pollinated: false
      };
    }));
  };

  // Harvest all ready plants in the room
  const harvestAllReadyPlants = () => {
    const readyIndices = indoorPlants
      .map((p, idx) => ({ p, idx }))
      .filter(({ p }) => p.stage === 'ready_harvest' || p.progressPercent >= 90);

    if (readyIndices.length === 0) {
      showNotification('Aún no hay plantas listas para corte en la sala indoor.', 'info');
      return;
    }

    playHarvestChime();
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#f59e0b', '#a855f7', '#6366f1']
    });

    let totalFlower = 0;
    let totalTrim = 0;
    let totalSeeds = 0;
    let maleCut = 0;
    const readySet = new Set(readyIndices.map(r => r.idx));
    readyIndices.forEach(({ p }) => {
      if (p.sex === 'male') { maleCut++; return; }
      const flower = Math.round(p.estimatedDryYieldGrams * (p.health / 100));
      totalFlower += flower;
      totalTrim += Math.round(flower * 0.4);
      if (p.pollinated) totalSeeds += giveSeeds(p.strain, SEEDS_PER_POLLINATED);
    });

    setIndoorPlants(prev => prev.map((p, idx) => readySet.has(idx) ? {
      ...p,
      stage: 'seedling' as GrowStage,
      progressPercent: 5,
      health: 98,
      soilMoisture: 80,
      plantedAt: Date.now(),
      trichomeMaturity: { clear: 95, milky: 5, amber: 0 },
      sex: 'female' as const,
      pollinated: false
    } : p));

    setRawFlowerGrams(prev => prev + totalFlower);
    setTrimGrams(prev => prev + totalTrim);
    updateQuestProgress('quest_harvest_run', readyIndices.length);
    reportEvent('harvest', readyIndices.length - maleCut);
    addXp(readyIndices.length * 150, 'Cosecha Sala Indoor');
    showNotification(`¡Cosecha de Sala Completa! ${readyIndices.length} plantas cosechadas: +${totalFlower}g Flor Seca y +${totalTrim}g Biomasa${totalSeeds ? ` · 🌰 +${totalSeeds} semillas` : ''}${maleCut ? ` · ${maleCut} macho${maleCut > 1 ? 's' : ''} (sin flor)` : ''}`, 'success');
  };

  /** seeds of a strain go back to the seed bank inventory (pollinated females give seeds at harvest) */
  const giveSeeds = (strain: Strain, n: number): number => {
    const item = seedBank.find(s => s.strainTemplate.id === strain.id);
    if (!item) return 0;
    setSeedInventory(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + n }));
    return n;
  };

  const plantNewSeed = (strain: Strain, seedType?: string) => {
    playClickSound();
    setIndoorPlants(prev => prev.map((p, idx) => {
      if (idx !== selectedPlantIndex) return p;
      return {
        ...p,
        strain,
        plantedAt: Date.now(),
        stage: 'seed' as GrowStage,
        progressPercent: 0,
        health: 100,
        soilMoisture: 85,
        temperatureC: 24.0,
        relativeHumidity: 65,
        vpdKpa: calculateVpd(24.0, 65),
        ppfdLightIntensity: 450,
        luxLumens: Math.round(450 * 54),
        co2Ppm: co2Ppm || 700,
        currentRoom,
        lightSchedule: '18/6',
        ecLevel: 1.4,
        phLevel: 6.2,
        nutrientBrand: selectedNutrientBrand,
        autoWateringEnabled: autoWaterActive,
        autoClimateEnabled: autoClimateActive,
        trichomeMaturity: { clear: 100, milky: 0, amber: 0 },
        lastWatered: Date.now(),
        lastFed: Date.now(),
        estimatedDryYieldGrams: Math.round(75 * strain.resinYieldMultiplier * currentFacility.environmentBonus),
        sex: sexFor(`${p.id ?? idx}-${Date.now()}`, seedType),
        pollinated: false,
        pest: undefined
      };
    }));
    reportEvent('plant', 1);
    showNotification(`Semilla plantada en Planta #${selectedPlantIndex + 1}: ${strain.name}. ¡Inicia el monitoreo de microclima!`, 'info');
  };

  const plantIndoorBatch = (strain: Strain) => {
    playClickSound();
    const cap = currentFacility.capacityPlants;
    setIndoorPlants(createInitialIndoorRoom(strain).slice(0, cap));
    setDormantPlants([]);
    setSelectedPlantIndex(0);
    addXp(50, 'Siembra Sala Completa');
    showNotification(`Sala resembrada con ${cap} ${cap === 1 ? 'planta' : 'plantas'} de ${strain.name}${cap < 30 ? ` (tu instalación da para ${cap})` : ' (3 filas en pares de 2)'}`, 'info');
  };

  // --- SEED BANK & INVENTORY ---
  const buySeed = (seedId: string, currency: 'FLORA' | 'SOL' = 'FLORA'): boolean => {
    const seed = seedBank.find(s => s.id === seedId);
    if (!seed) return false;

    if (currency === 'FLORA') {
      if (floraBalance < seed.priceFlora) {
        showNotification(`Saldo insuficiente: Requiere ${seed.priceFlora} $FLORA`, 'info');
        return false;
      }
      recordBurnTransaction('BURN_PATENT', seed.priceFlora, `Yield Bud Empire: Compra de Pack de Semillas (${seed.name})`);
    } else {
      if (solBalance < seed.priceSol) {
        showNotification(`Saldo insuficiente: Requiere ${seed.priceSol} SOL`, 'info');
        return false;
      }
      setSolBalance(prev => Number(Math.max(0, prev - seed.priceSol).toFixed(3)));
      const sig = generateSolanaSignature();
      const newTx: SolanaTransaction = {
        id: `tx-seed-${Date.now()}`,
        signature: sig,
        type: 'BURN_PATENT',
        amountFlora: 0,
        amountSol: seed.priceSol,
        timestamp: Date.now(),
        status: 'confirmed',
        blockSlot: 248926000,
        memo: `Yield Bud Empire: Adquisición de Semillas ${seed.name} con SOL`
      };
      setTransactions(prev => [newTx, ...prev]);
    }

    setSeedInventory(prev => ({
      ...prev,
      [seedId]: (prev[seedId] || 0) + seed.seedsPerPack
    }));

    playHarvestChime();
    reportEvent('seedbuy', 1);
    addXp(35, 'Adquisición de Genética');
    showNotification(`¡Pack de ${seed.seedsPerPack}x semillas de ${seed.name} añadido a tu inventario! (+35 XP)`, 'success');
    return true;
  };

  const plantFromSeedBank = (seedId: string): boolean => {
    const available = seedInventory[seedId] || 0;
    if (available <= 0) {
      showNotification('No tienes semillas disponibles de este tipo. Adquiere más en el Banco de Semillas.', 'info');
      return false;
    }

    const seedItem = seedBank.find(s => s.id === seedId);
    if (!seedItem) return false;

    // Decrement inventory
    setSeedInventory(prev => ({
      ...prev,
      [seedId]: Math.max(0, prev[seedId] - 1)
    }));

    // Plant new plant
    plantNewSeed(seedItem.strainTemplate, seedItem.seedType);
    return true;
  };

  // --- GROW SUPPLIES MARKET & HARDWARE ---
  const buySupply = (supplyId: string, currency: 'FLORA' | 'SOL' = 'FLORA'): boolean => {
    const supply = suppliesMarket.find(s => s.id === supplyId);
    if (!supply) return false;
    if (supply.installed) {
      showNotification('Este equipo ya está instalado en tu instalación.', 'info');
      return false;
    }

    if (currency === 'FLORA') {
      if (floraBalance < supply.priceFlora) {
        showNotification(`Saldo insuficiente: Requiere ${supply.priceFlora} $FLORA`, 'info');
        return false;
      }
      recordBurnTransaction('BURN_REPAIR', supply.priceFlora, `Yield Bud Empire: Instalación de Equipo de Cultivo (${supply.name})`);
    } else {
      if (solBalance < supply.priceSol) {
        showNotification(`Saldo insuficiente: Requiere ${supply.priceSol} SOL`, 'info');
        return false;
      }
      setSolBalance(prev => Number(Math.max(0, prev - supply.priceSol).toFixed(3)));
      const sig = generateSolanaSignature();
      const newTx: SolanaTransaction = {
        id: `tx-supply-${Date.now()}`,
        signature: sig,
        type: 'BURN_REPAIR',
        amountFlora: 0,
        amountSol: supply.priceSol,
        timestamp: Date.now(),
        status: 'confirmed',
        blockSlot: 248928000,
        memo: `Yield Bud Empire: Compra de Hardware Botánico ${supply.name}`
      };
      setTransactions(prev => [newTx, ...prev]);
    }

    // Install supply
    setSuppliesMarket(prev => prev.map(s => s.id === supplyId ? { ...s, installed: true } : s));

    // Activate automatic capabilities if applicable
    if (supply.category === 'irrigation') {
      setAutoWaterActive(true);
    } else if (supply.category === 'climate') {
      setAutoClimateActive(true);
    } else if (supply.category === 'co2') {
      setCo2PpmState(1200);
      setActivePlant(p => p ? { ...p, co2Ppm: 1200 } : null);
    }

    confetti({ particleCount: 60, spread: 70 });
    addXp(60, 'Mejora de Equipamiento');
    showNotification(`¡Hardware instalado: ${supply.name}! Automatización y sensores activos (+60 XP)`, 'success');
    return true;
  };

  // --- NFT ASSETS: buy / install / repair ---
  const SINGLE_SLOT = ['lamp', 'ac', 'irrigation'];

  const buyAsset = (catalogId: string, currency: 'FLORA' | 'SOL' = 'FLORA', qty: number = 1): boolean => {
    const item = CATALOG_BY_ID[catalogId];
    if (!item) return false;
    // only consumables come in stacks; equipment and licences are bought one at a time
    const n = item.kind === 'consumable' ? Math.max(1, Math.min(20, Math.floor(qty) || 1)) : 1;
    if (item.kind === 'license' && item.stationId && ownsStation(assets, item.stationId)) {
      showNotification('Ya tienes esta licencia.', 'info');
      return false;
    }
    const totalFlora = item.priceFlora * n;
    const totalSol = Number((item.priceSol * n).toFixed(3));
    const label = `${n > 1 ? `${n}× ` : ''}${item.name}`;
    if (currency === 'FLORA') {
      if (floraBalance < totalFlora) {
        showNotification(`Saldo insuficiente: requiere ${totalFlora} $FLORA`, 'info');
        return false;
      }
      recordBurnTransaction('BURN_PURCHASE', totalFlora, `Yield Bud Empire: Mint NFT ${label} (${item.kind === 'consumable' ? 'consumible' : item.kind === 'license' ? 'licencia' : 'equipo'})`);
    } else {
      if (solBalance < totalSol) {
        showNotification(`Saldo insuficiente: requiere ${totalSol} SOL`, 'info');
        return false;
      }
      setSolBalance(prev => Number(Math.max(0, prev - totalSol).toFixed(3)));
      setTransactions(prev => [{
        id: `tx-asset-${Date.now()}`,
        signature: generateSolanaSignature(),
        type: 'BURN_PURCHASE',
        amountFlora: 0,
        amountSol: totalSol,
        timestamp: Date.now(),
        status: 'confirmed',
        blockSlot: 248928000 + Math.floor(Math.random() * 5000),
        memo: `Yield Bud Empire: Mint NFT ${label}`
      }, ...prev.slice(0, 24)]);
    }
    // equipment goes straight into an empty slot (lamp / AC / irrigation); racks like solar, CO₂ and meters always install
    const slotTaken = assets.some(a => a.equipped && CATALOG_BY_ID[a.catalogId]?.category === item.category);
    const equip = item.kind === 'equipment' && (!SINGLE_SLOT.includes(item.category) || !slotTaken);
    setAssets(prev => [...prev, ...Array.from({ length: n }, () => newAsset(catalogId, { equipped: equip || undefined }))]);
    if (equip && item.category === 'irrigation') setAutoWaterActive(true);
    if (equip && item.category === 'ac') setAutoClimateActive(true);
    confetti({ particleCount: 40, spread: 60 });
    reportEvent('buy', 1);
    addXp(item.tier * 15 * n, 'Compra de Equipamiento');
    showNotification(`NFT minteado: ${label}${equip ? ' — instalado' : ''}${item.kind === 'consumable' ? ` (+${(item.amount ?? 0) * n} ${item.unit})` : ''}`, 'success');
    return true;
  };

  const setAssetEquipped = (assetId: string, equipped: boolean) => {
    playClickSound();
    setAssets(prev => {
      const target = prev.find(a => a.id === assetId);
      const item = target && CATALOG_BY_ID[target.catalogId];
      if (!target || item?.kind !== 'equipment') return prev;
      return prev.map(a => {
        if (a.id === assetId) return { ...a, equipped };
        // one lamp / AC / irrigation system at a time
        if (equipped && SINGLE_SLOT.includes(item.category) && CATALOG_BY_ID[a.catalogId]?.category === item.category) return { ...a, equipped: false };
        return a;
      });
    });
    const item = CATALOG_BY_ID[assets.find(a => a.id === assetId)?.catalogId ?? ''];
    if (equipped && item?.category === 'irrigation') setAutoWaterActive(true);
    if (equipped && item?.category === 'ac') setAutoClimateActive(true);
  };

  const repairAsset = (assetId: string): boolean => {
    const asset = assets.find(a => a.id === assetId);
    const item = asset && CATALOG_BY_ID[asset.catalogId];
    if (!asset || !item || asset.durability === undefined) return false;
    if (asset.durability >= 99) {
      showNotification('Este equipo está como nuevo.', 'info');
      return false;
    }
    const cost = repairCostOf(asset);
    if (floraBalance < cost) {
      showNotification(`Saldo insuficiente: la reparación cuesta ${cost} $FLORA`, 'info');
      return false;
    }
    recordBurnTransaction('BURN_REPAIR', cost, `Yield Bud Empire: Reparación de ${item.name} (quema permanente)`);
    setAssets(prev => prev.map(a => a.id === assetId ? { ...a, durability: 100 } : a));
    showNotification(`${item.name} reparado al 100 % (${cost} $FLORA quemados)`, 'success');
    return true;
  };

  // --- PLAGUES, GARDENER RATING AND CLEANING ---
  const treatPests = (scope: 'selected' | 'all', plotId?: string) => {
    if (plotId) { treatPlot(plotId); return; }
    const targets = indoorPlants.map((p, i) => ({ p, i })).filter(({ p, i }) => p.pest && (scope === 'all' || i === selectedPlantIndex));
    if (targets.length === 0) {
      showNotification(scope === 'selected' ? 'Esta planta no tiene plagas.' : 'No hay plagas que tratar. ¡Bien cuidado!', 'info');
      return;
    }
    // dry-run on a copy of the stock: a plant is treated only if there is enough product for it
    let cur = assets;
    const jobs: Array<{ i: number; kind: PestKind; guard: number }> = [];
    const missing = new Set<string>();
    for (const { p, i } of targets) {
      const r = spendPest(cur, p.pest!.kind, USE.pestPerPlant);
      if (r.spent + 1e-9 >= USE.pestPerPlant) { cur = r.assets; jobs.push({ i, kind: p.pest!.kind, guard: r.guardHours || 48 }); }
      else missing.add(PEST_INFO[p.pest!.kind].cure);
    }
    if (jobs.length === 0) {
      showNotification(`No tienes tratamiento: necesitas ${[...missing].join(' / ')}. Cómpralo en el Grow Market → Control de plagas.`, 'burn');
      return;
    }
    setAssets(prev => jobs.reduce((acc, j) => spendPest(acc, j.kind, USE.pestPerPlant).assets, prev));
    setIndoorPlants(prev => prev.map((p, i) => {
      const j = jobs.find(x => x.i === i);
      return j && p.pest ? { ...p, pest: undefined, guard: j.guard, health: Math.min(100, p.health + 5) } : p;
    }));
    playClickSound();
    addXp(15 * jobs.length, 'Control de plagas');
    showNotification(`🧴 ${jobs.length} planta${jobs.length > 1 ? 's tratadas' : ' tratada'} y protegida${jobs.length > 1 ? 's' : ''} ${Math.max(...jobs.map(j => j.guard))} h${missing.size ? `. Faltó: ${[...missing].join(' / ')}` : ''}.`, missing.size ? 'info' : 'success');
  };

  const cleanRoom = (): boolean => {
    const since = (Date.now() - care.lastCleanAt) / 3600000;
    if (since < USE.cleanCooldownHours) {
      const left = USE.cleanCooldownHours - since;
      showNotification(`La sala ya está limpia. Podrás volver a limpiar en ${left >= 1 ? `${Math.floor(left)} h ${Math.round((left % 1) * 60)} min` : `${Math.max(1, Math.round(left * 60))} min`}.`, 'info');
      return false;
    }
    playClickSound();
    setCare({ rating: Math.min(100, care.rating + USE.cleanGain), lastCleanAt: Date.now() });
    addXp(20, 'Limpieza de la sala');
    showNotification(`🧹 Sala limpia: calificación de jardinero +${Math.min(USE.cleanGain, 100 - Math.round(care.rating))}.`, 'success');
    return true;
  };

  const recycleGarbage = () => {
    const trash = garbageOf(assets);
    if (trash.length === 0) {
      showNotification('No hay basura que reciclar.', 'info');
      return;
    }
    const ids = new Set(trash.map(a => a.id));
    playClickSound();
    setAssets(prev => prev.filter(a => !ids.has(a.id)));
    setCare(c => ({ ...c, rating: Math.min(100, c.rating + trash.length * USE.recycleGain) }));
    showNotification(`♻️ Reciclaste ${trash.length} objeto${trash.length > 1 ? 's' : ''} (frascos vacíos y equipo averiado): +${trash.length * USE.recycleGain} de calificación.`, 'success');
  };

  // --- LAND PLOTS (the planet) ---
  /** plots already sold to other growers, per region (the market looks alive; your own purchases come on top) */
  const SOLD_BASE: Record<RegionId, number> = { afghanistan: 14, mexico: 22, jamaica: 31, central_america: 9, south_america: 27, africa: 18, asia: 12 };

  const plotsForSale = (region: RegionId): { offers: PlotOffer[]; left: number } => {
    const r = REGION_BY_ID[region];
    const owned = new Set(plots.map(pl => pl.id));
    const left = Math.max(0, r.supply - SOLD_BASE[region] - plots.filter(pl => pl.region === region).length);
    const offers: PlotOffer[] = [];
    for (let i = SOLD_BASE[region] + 1; i <= r.supply && offers.length < Math.min(6, left); i++) {
      const o = plotOffer(region, i);
      if (!owned.has(o.id)) offers.push(o);
    }
    return { offers, left };
  };

  const buyPlot = (offerId: string, currency: 'FLORA' | 'SOL' = 'FLORA'): boolean => {
    const m = /^plot-([a-z_]+)-(\d+)$/.exec(offerId);
    const region = m?.[1] as RegionId | undefined;
    if (!m || !region || !REGION_BY_ID[region]) return false;
    const offer = plotOffer(region, Number(m[2]));
    if (!plotsForSale(region).offers.some(o => o.id === offer.id)) {
      showNotification('Esa parcela ya no está a la venta.', 'info');
      return false;
    }
    const r = REGION_BY_ID[region];
    if (currency === 'FLORA') {
      if (floraBalance < offer.priceFlora) {
        showNotification(`Saldo insuficiente: la parcela ${offer.name} cuesta ${offer.priceFlora} $FLORA`, 'info');
        return false;
      }
      recordBurnTransaction('BURN_PURCHASE', offer.priceFlora, `Yield Bud Empire Planeta: Mint NFT parcela ${offer.name} (${r.name}, nota ${offer.landRating}/10)`);
    } else {
      if (solBalance < offer.priceSol) {
        showNotification(`Saldo insuficiente: la parcela cuesta ${offer.priceSol} SOL`, 'info');
        return false;
      }
      setSolBalance(prev => Number(Math.max(0, prev - offer.priceSol).toFixed(3)));
      setTransactions(prev => [{
        id: `tx-plot-${Date.now()}`, signature: generateSolanaSignature(), type: 'BURN_PURCHASE', amountFlora: 0, amountSol: offer.priceSol,
        timestamp: Date.now(), status: 'confirmed', blockSlot: 248928000 + Math.floor(Math.random() * 5000), memo: `Yield Bud Empire Planeta: Mint NFT parcela ${offer.name}`
      }, ...prev.slice(0, 24)]);
    }
    setPlots(prev => [...prev, { id: offer.id, region, index: offer.index, name: offer.name, ratings: offer.ratings, landRating: offer.landRating, mintedAt: Date.now(), plants: [] }]);
    confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    reportEvent('plot', 1);
    addXp(80, 'Compra de parcela');
    showNotification(`🌎 Parcela minteada: ${offer.name} en ${r.name} · nota ${offer.landRating}/10 · 36 plantas`, 'success');
    return true;
  };

  const plantPlot = (plotId: string, seedId: string, count?: number): boolean => {
    const plot = plots.find(pl => pl.id === plotId);
    const seedItem = seedBank.find(s => s.id === seedId);
    if (!plot || !seedItem) return false;
    const have = seedInventory[seedId] || 0;
    const taken = new Set(plot.plants.map(p => p.slotIndex));
    const empty = Array.from({ length: PLOT_SIZE }, (_, i) => i).filter(i => !taken.has(i));
    const n = Math.min(count ?? empty.length, have, empty.length);
    if (n <= 0) {
      showNotification(empty.length === 0 ? 'La parcela está llena: cosecha antes de sembrar.' : 'No tienes semillas de esa genética. Cómpralas en el Banco de Semillas.', 'info');
      return false;
    }
    const strain = seedItem.strainTemplate;
    const ter = terroirOf(strain.origin, plot.region, plot.ratings);
    const now = Date.now();
    const yieldEach = Math.round(seedItem.yieldGramsPerPlant * 0.32 * ter.yield);
    const fresh: PlantInGrow[] = empty.slice(0, n).map(slot => ({
      id: `${plot.id}-s${slot}-${now}`, slotIndex: slot, siteId: plot.id, strain, plantedAt: now, stage: 'seed' as GrowStage, progressPercent: 0, health: 100, soilMoisture: 80,
      temperatureC: 24, relativeHumidity: 60, vpdKpa: calculateVpd(24, 60), ppfdLightIntensity: 900, luxLumens: 900 * 54, co2Ppm: 420, currentRoom: 'vegetative', lightSchedule: '24/0',
      ecLevel: 1.6, phLevel: 6.2, nutrientBrand: selectedNutrientBrand, trichomeMaturity: { clear: 100, milky: 0, amber: 0 }, lastWatered: now, lastFed: now, estimatedDryYieldGrams: yieldEach,
      sex: sexFor(`${plot.id}-s${slot}-${now}`, seedItem.seedType), pollinated: false,
    }));
    setSeedInventory(prev => ({ ...prev, [seedId]: Math.max(0, (prev[seedId] || 0) - n) }));
    setPlots(prev => prev.map(pl => pl.id === plotId ? { ...pl, plants: [...pl.plants, ...fresh] } : pl));
    playClickSound();
    reportEvent('plant', n);
    addXp(n * 5, 'Siembra en parcela');
    showNotification(`🌱 ${n} semilla${n > 1 ? 's' : ''} de ${strain.name} en ${plot.name}: ${ter.label}. ~${yieldEach} g por planta.`, ter.tone === 'down' ? 'info' : 'success');
    return true;
  };

  const waterPlot = (plotId: string, all = false) => {
    const plot = plots.find(pl => pl.id === plotId);
    if (!plot) return;
    const targets = plot.plants.filter(p => p.stage !== 'ready_harvest' && (all || p.soilMoisture < 60));
    if (targets.length === 0) {
      showNotification(plot.plants.length ? 'Ninguna planta necesita riego ahora (todas ≥ 60 % de humedad).' : 'La parcela está vacía.', 'info');
      return;
    }
    if (!takeResource('water', USE.waterPerPlantManual * targets.length)) return;
    const slots = new Set(targets.map(p => p.slotIndex));
    playWaterSound();
    setPlots(prev => prev.map(pl => pl.id !== plotId ? pl : { ...pl, plants: pl.plants.map(p => slots.has(p.slotIndex) ? { ...p, soilMoisture: Math.min(100, p.soilMoisture + 55), health: Math.min(100, p.health + 3), lastWatered: Date.now() } : p) }));
    reportEvent('water', targets.length);
    addXp(targets.length * 3, 'Riego de parcela');
    showNotification(`💧 ${targets.length} planta${targets.length > 1 ? 's regadas' : ' regada'} en ${plot.name} (${(USE.waterPerPlantManual * targets.length).toFixed(1)} L)`, 'info');
  };

  const feedPlot = (plotId: string) => {
    const plot = plots.find(pl => pl.id === plotId);
    if (!plot) return;
    const targets = plot.plants.filter(p => p.stage !== 'ready_harvest' && p.ecLevel < 1.6);
    if (targets.length === 0) {
      showNotification('Ninguna planta necesita abono ahora.', 'info');
      return;
    }
    if (!takeResource('nutrient', USE.nutrientPerPlant * targets.length)) return;
    const slots = new Set(targets.map(p => p.slotIndex));
    const feedBonus = bestFeedBonus(assets);
    playClickSound();
    setPlots(prev => prev.map(pl => pl.id !== plotId ? pl : { ...pl, plants: pl.plants.map(p => slots.has(p.slotIndex) ? { ...p, ecLevel: 2.1, phLevel: 6.2, feedBonus, health: Math.min(100, p.health + 5), lastFed: Date.now() } : p) }));
    reportEvent('feed', targets.length);
    addXp(targets.length * 4, 'Abonado de parcela');
    showNotification(`🧪 ${targets.length} planta${targets.length > 1 ? 's abonadas' : ' abonada'} en ${plot.name}`, 'info');
  };

  const treatPlot = (plotId: string) => {
    const plot = plots.find(pl => pl.id === plotId);
    if (!plot) return;
    const targets = plot.plants.filter(p => p.pest);
    if (targets.length === 0) {
      showNotification('No hay plagas en esta parcela.', 'info');
      return;
    }
    let cur = assets;
    const jobs: Array<{ slot: number; kind: PestKind; guard: number }> = [];
    const missing = new Set<string>();
    for (const p of targets) {
      const r = spendPest(cur, p.pest!.kind, USE.pestPerPlant);
      if (r.spent + 1e-9 >= USE.pestPerPlant) { cur = r.assets; jobs.push({ slot: p.slotIndex ?? -1, kind: p.pest!.kind, guard: r.guardHours || 48 }); }
      else missing.add(PEST_INFO[p.pest!.kind].cure);
    }
    if (jobs.length === 0) {
      showNotification(`No tienes tratamiento: necesitas ${[...missing].join(' / ')}. Cómpralo en el Grow Market → Control de plagas.`, 'burn');
      return;
    }
    setAssets(prev => jobs.reduce((acc, j) => spendPest(acc, j.kind, USE.pestPerPlant).assets, prev));
    setPlots(prev => prev.map(pl => pl.id !== plotId ? pl : { ...pl, plants: pl.plants.map(p => { const j = jobs.find(x => x.slot === p.slotIndex); return j && p.pest ? { ...p, pest: undefined, guard: j.guard, health: Math.min(100, p.health + 5) } : p; }) }));
    playClickSound();
    addXp(15 * jobs.length, 'Control de plagas');
    showNotification(`🧴 ${jobs.length} planta${jobs.length > 1 ? 's tratadas' : ' tratada'} en ${plot.name}${missing.size ? `. Faltó: ${[...missing].join(' / ')}` : ''}.`, missing.size ? 'info' : 'success');
  };

  const harvestPlot = (plotId: string) => {
    const plot = plots.find(pl => pl.id === plotId);
    if (!plot) return;
    const ready = plot.plants.filter(p => p.stage === 'ready_harvest');
    if (ready.length === 0) {
      showNotification('Aún no hay plantas listas para cosechar en esta parcela.', 'info');
      return;
    }
    let flower = 0, trim = 0, seeds = 0, maleCut = 0;
    for (const p of ready) {
      if (isMale(p)) { maleCut++; continue; }
      const f = Math.round(p.estimatedDryYieldGrams * (p.health / 100));
      flower += f;
      trim += Math.round(f * 0.4);
      if (p.pollinated) seeds += giveSeeds(p.strain, SEEDS_PER_POLLINATED);
    }
    setPlots(prev => prev.map(pl => pl.id !== plotId ? pl : { ...pl, plants: pl.plants.filter(p => p.stage !== 'ready_harvest') }));
    setRawFlowerGrams(prev => prev + flower);
    setTrimGrams(prev => prev + trim);
    updateQuestProgress('quest_harvest_run', ready.length);
    reportEvent('harvest', ready.length - maleCut);
    addXp(ready.length * 180, 'Cosecha en parcela');
    playHarvestChime();
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#f59e0b', '#a855f7', '#6366f1'] });
    showNotification(`🌾 Cosecha en ${plot.name}: ${ready.length} plantas → +${flower} g de flor y +${trim} g de biomasa${seeds ? ` · 🌰 +${seeds} semillas` : ''}${maleCut ? ` · ${maleCut} macho${maleCut > 1 ? 's' : ''} sin flor` : ''}. La parcela queda libre para sembrar.`, 'success');
  };

  const plotEta = (plot: OwnedPlot, plant: PlantInGrow) => plotEtaSeconds(plant, plot.region, plot.ratings);

  // --- PROFILE: chests that mint seasonal NFT avatars ---
  const openChest = (id: ChestId, currency: 'FLORA' | 'SOL' = 'FLORA'): { design: AvatarDesign; isNew: boolean; refund: number; owned: OwnedAvatar } | null => {
    const chest = CHESTS[id];
    if (currency === 'FLORA') {
      if (floraBalance < chest.priceFlora) { showNotification(`Saldo insuficiente: el ${chest.name} cuesta ${chest.priceFlora} $FLORA`, 'info'); return null; }
      recordBurnTransaction('BURN_PURCHASE', chest.priceFlora, `Yield Bud Empire: ${chest.name} (mint de avatar NFT)`);
    } else {
      if (solBalance < chest.priceSol) { showNotification(`Saldo insuficiente: el ${chest.name} cuesta ${chest.priceSol} SOL`, 'info'); return null; }
      setSolBalance(prev => Number(Math.max(0, prev - chest.priceSol).toFixed(3)));
      setTransactions(prev => [{ id: `tx-chest-${Date.now()}`, signature: generateSolanaSignature(), type: 'BURN_PURCHASE', amountFlora: 0, amountSol: chest.priceSol, timestamp: Date.now(), status: 'confirmed', blockSlot: 248928000 + Math.floor(Math.random() * 5000), memo: `Yield Bud Empire: ${chest.name}` }, ...prev.slice(0, 24)]);
    }
    // fair randomness: the browser's cryptographic generator, not Math.random
    const rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    const { design, pity } = rollChest(chest, chestPity[id], seasonOf(new Date()), rng);
    setChestPity(prev => ({ ...prev, [id]: pity }));
    const have = avatars.find(a => a.designId === design.id);
    const refund = have ? DUPLICATE_REFUND[design.rarity] : 0;
    const owned: OwnedAvatar = have
      ? { ...have, count: have.count + 1 }
      : { designId: design.id, count: 1, firstAt: Date.now(), mint: generateSolanaSignature().slice(0, 44), serial: 1000 + Math.floor(rng() * 9000) };
    setAvatars(prev => (have ? prev.map(a => (a.designId === design.id ? owned : a)) : [...prev, owned]));
    if (refund) setFloraBalance(prev => prev + refund);
    playLevelUpSound();
    addXp(design.rarity === 'legendary' ? 200 : design.rarity === 'epic' ? 80 : 30, 'Cofre de avatar');
    return { design, isNew: !have, refund, owned };
  };

  const equipAvatar = (designId: string | null) => {
    if (designId && !avatars.some(a => a.designId === designId)) return;
    updateUserProfile({ avatarNft: designId ?? undefined });
    showNotification(designId ? `Avatar equipado: ${DESIGN_BY_ID[designId]?.name ?? designId}` : 'Avatar NFT desequipado.', 'success');
  };

  const removeMales = (plotId?: string) => {
    if (plotId) {
      const plot = plots.find(pl => pl.id === plotId);
      const males = plot?.plants.filter(p => isMale(p) && sexRevealed(p)) ?? [];
      if (!plot || males.length === 0) { showNotification('No hay machos por quitar en esta parcela.', 'info'); return; }
      const slots = new Set(males.map(p => p.slotIndex));
      setPlots(prev => prev.map(pl => pl.id !== plotId ? pl : { ...pl, plants: pl.plants.filter(p => !slots.has(p.slotIndex)) }));
      playClickSound();
      addXp(males.length * 10, 'Machos retirados');
      showNotification(`♂ ${males.length} macho${males.length > 1 ? 's' : ''} arrancado${males.length > 1 ? 's' : ''} de ${plot.name}. Las hembras están a salvo de la polinización.`, 'success');
      return;
    }
    const idx = indoorPlants.map((p, i) => ({ p, i })).filter(({ p }) => isMale(p) && sexRevealed(p)).map(x => x.i);
    if (idx.length === 0) { showNotification('No hay machos por quitar en la sala.', 'info'); return; }
    const set = new Set(idx);
    setIndoorPlants(prev => prev.map((p, i) => set.has(i) ? { ...p, stage: 'seedling' as GrowStage, progressPercent: 5, health: 98, soilMoisture: 80, plantedAt: Date.now(), trichomeMaturity: { clear: 95, milky: 5, amber: 0 }, sex: 'female' as const, pollinated: false, pest: undefined } : p));
    playClickSound();
    addXp(idx.length * 10, 'Machos retirados');
    showNotification(`♂ ${idx.length} macho${idx.length > 1 ? 's' : ''} retirado${idx.length > 1 ? 's' : ''} de la sala; su hueco vuelve a empezar como hembra.`, 'success');
  };

  const keepMaleAsFather = (plotId: string, slot: number) => {
    const plot = plots.find(pl => pl.id === plotId);
    const plant = plot?.plants.find(p => p.slotIndex === slot);
    if (!plot || !plant || !isMale(plant)) return;
    const donor: MotherFatherPlant = {
      id: `donor_${Date.now()}`,
      role: 'Padre (Donante de Polen)',
      strain: plant.strain,
      name: `Padre Donante ${plant.strain.name}`,
      health: plant.health,
      clonesCutCount: 0,
      pollenCollectedMg: 250,
      savedAt: Date.now(),
      traits: [`THC: ${plant.strain.thcPercentage}%`, `Terpeno Dominante: ${Object.keys(plant.strain.terpenes)[0]}`, plant.strain.origin ? `Landrace de ${REGION_BY_ID[plant.strain.origin].name}` : 'Híbrido adaptable'],
    };
    setMothersFathers(prev => [donor, ...prev]);
    setPlots(prev => prev.map(pl => pl.id !== plotId ? pl : { ...pl, plants: pl.plants.filter(p => p.slotIndex !== slot) }));
    playLevelUpSound();
    addXp(75, 'Conservación Genética');
    showNotification(`♂ ${donor.name} guardado en el Santuario de Madres & Padres: ya puedes cruzarlo en Genética (+75 XP).`, 'success');
  };


  const careInfo = {
    rating: Math.round(care.rating),
    cleanReadyInHours: Math.max(0, USE.cleanCooldownHours - (Date.now() - care.lastCleanAt) / 3600000),
    pests: pestCount(indoorPlants),
    plotPests: plots.reduce((n, pl) => n + pestCount(pl.plants), 0),
    males: maleCount(indoorPlants),
    plotMales: plots.reduce((n, pl) => n + maleCount(pl.plants), 0),
    pollinated: indoorPlants.filter(p => p.pollinated).length + plots.reduce((n, pl) => n + pl.plants.filter(p => p.pollinated).length, 0),
    garbage: garbageOf(assets).length,
    gardenerLevel: gardenerLevelOf(assets),
    gardenerDays: stockOf(assets, 'service'),
  };

  const resources = (() => {
    const flags = { autoClimate: simEnvRef.current.autoClimate, autoWater: simEnvRef.current.autoWater };
    const { kwhPerDay, solarKwhPerDay } = powerDraw(equipStats, indoorPlants[0], flags);
    const energy = stockOf(assets, 'energy');
    const net = kwhPerDay - solarKwhPerDay;
    return { water: stockOf(assets, 'water'), nutrient: stockOf(assets, 'nutrient'), energy, kwhPerDay, solarKwhPerDay, energyDays: net <= 0.001 ? Infinity : energy / net };
  })();

  // --- NUTRIENT DOSING & BRAND FEEDING TABLES ---
  /** Apply a prepared solution: spends abono + water from the warehouse and sets the plant's measured EC / pH / growth bonus. */
  const applyFertigation = (f: FertigationInput): boolean => {
    if (indoorPlants.length === 0) { showNotification('Siembra una planta para aplicarle la solución', 'info'); return false; }
    const n = f.scope === 'all' ? indoorPlants.length : 1;
    if (!takeResource('nutrient', USE.nutrientPerPlant * n)) return false;
    playWaterSound();
    // un abono NFT premium en la bodega suma la mitad de su bonus por encima de la calidad de la mezcla
    const feedBonus = Math.min(1.15, f.feedBonus * (1 + (bestFeedBonus(assets) - 1) * 0.5));
    const now = Date.now();
    setIndoorPlants(prev => prev.map((p, idx) => (f.scope === 'all' || idx === selectedPlantIndex)
      ? { ...p, feedBonus, ecLevel: f.ec, phLevel: f.ph, health: Math.max(30, Math.min(100, p.health + f.healthDelta)), lastFed: now, nutrientBrand: f.brandName ?? p.nutrientBrand }
      : p));
    const xp = Math.round(10 + f.score / 5);
    reportEvent('fertigate', 1);
    addXp(xp, 'Fertirriego con receta propia');
    showNotification(`${f.label}: EC ${f.ec} mS/cm · pH ${f.ph} · calidad ${f.score}/100 (+${xp} XP)`, f.score >= 55 ? 'success' : 'info');
    return true;
  };

  /** Tabla de una marca aplicada con la ciencia real: proporciones de la tabla ajustadas a su EC objetivo con agua de grifo blando y pH corregido. */
  const applyNutrientStage = (stageIndex: number) => {
    if (!activePlant) return;
    const brand = nutrientBrands.find(b => b.id === selectedNutrientBrand);
    const stage = brand?.stages[stageIndex];
    if (!brand || !stage) return;
    const mid = (s: string) => { const v = (s.match(/[\d.]+/g) ?? []).map(Number); return v.length ? v.reduce((a, x) => a + x, 0) / v.length : NaN; };
    const ecMid = mid(stage.targetEc) || 1.8;
    const phMid = mid(stage.targetPh) || 6.2;
    const strength = strengthForEc(stage.dosageMlPerLiter, 'soft', ecMid);
    const base: Mix = { waterId: 'soft', liters: 1, doses: dosesFromTable(stage.dosageMlPerLiter, strength) };
    const corr = phCorrection(base, phMid, 'acid_nitric');
    if (corr.ingredient) base.doses[corr.ingredient] = corr.dose;
    const sol = solveMix(base);
    const d = diagnoseMix(sol, stageOfProgress(activePlant.progressPercent), 'soil');
    const e = feedEffect(sol, d);
    applyFertigation({ ...e, score: d.score, label: `${brand.name} · ${stage.stageName}`, scope: 'one', brandName: brand.name });
  };

  // --- ROOMS & MICROCLIMATE ---
  const switchGrowRoom = (roomId: GrowRoomId) => {
    playClickSound();
    setCurrentRoom(roomId);
    const roomConfig = GROW_ROOMS_CONFIG.find(r => r.id === roomId);
    if (roomConfig) {
      setActivePlant(prev => {
        if (!prev) return null;
        return {
          ...prev,
          currentRoom: roomId,
          lightSchedule: roomConfig.recommendedLightSchedule,
          ppfdLightIntensity: roomConfig.targetPpfd,
          luxLumens: Math.round(roomConfig.targetPpfd * 54),
          co2Ppm: roomConfig.targetCo2Ppm
        };
      });
      showNotification(`Traslado de sala: ${roomConfig.name}. Ajustando microclima a ${roomConfig.recommendedLightSchedule} (${roomConfig.targetTempC}°C)`, 'info');
    }
  };

  const setCo2Ppm = (ppm: number) => {
    setCo2PpmState(ppm);
    setActivePlant(prev => {
      if (!prev) return null;
      return { ...prev, co2Ppm: ppm };
    });
  };

  const toggleAutoWater = () => {
    playClickSound();
    setAutoWaterActive(prev => {
      const next = !prev;
      showNotification(`Riego Automático: ${next ? 'ACTIVADO (Goteo inteligente cuando sustrato < 45%)' : 'DESACTIVADO (Manual)'}`, 'info');
      return next;
    });
  };

  const toggleAutoClimate = () => {
    playClickSound();
    setAutoClimateActive(prev => {
      const next = !prev;
      showNotification(`Control Climático Autónomo: ${next ? 'ACTIVADO (Termostato / Higrostato PID)' : 'DESACTIVADO (Manual)'}`, 'info');
      return next;
    });
  };

  const calibrateMeter = (meterType: 'ph' | 'ec' | 'par' | 'lux') => {
    playClickSound();
    addXp(15, 'Calibración Científica');
    const descriptions = {
      ph: 'Sonda de pH calibrada con buffer patrón 4.01 / 7.01 (Precisión ±0.01 pH)',
      ec: 'Electroconductímetro calibrado en 1413 μS/cm (Lectura exacta mS/cm)',
      par: 'Sensor Apogee Quantum nivelado a 180° y calibrado en ePAR 400-750nm',
      lux: 'Luxómetro calibrado contra sensor fotométrico CIE (Factor x54)'
    };
    showNotification(descriptions[meterType] + ' (+15 XP)', 'success');
  };

  // --- MOTHERS, FATHERS & BOTANICAL HYBRIDIZATION ---
  const saveCurrentPlantAsMotherOrFather = (role: 'Madre (Esquejes / Clones)' | 'Padre (Donante de Polen)'): boolean => {
    if (!activePlant) {
      showNotification('No hay planta activa para conservar como donante.', 'info');
      return false;
    }

    const newDonor: MotherFatherPlant = {
      id: `donor_${Date.now()}`,
      role,
      strain: activePlant.strain,
      name: `${role.includes('Madre') ? 'Madre Élite' : 'Padre Donante'} ${activePlant.strain.name}`,
      health: activePlant.health,
      clonesCutCount: 0,
      pollenCollectedMg: role.includes('Padre') ? 250 : 0,
      savedAt: Date.now(),
      traits: [
        `THC: ${activePlant.strain.thcPercentage}%`,
        `Terpeno Dominante: ${Object.keys(activePlant.strain.terpenes)[0]}`,
        'Resistencia a plagas'
      ]
    };

    setMothersFathers(prev => [newDonor, ...prev]);
    playLevelUpSound();
    addXp(75, 'Conservación Genética');
    showNotification(`¡${newDonor.name} guardado en el Santuario de Madres & Padres! (+75 XP)`, 'success');
    return true;
  };

  const takeCloneFromMother = (motherId: string): boolean => {
    const mother = mothersFathers.find(m => m.id === motherId);
    if (!mother) return false;

    setMothersFathers(prev => prev.map(m => m.id === motherId ? { ...m, clonesCutCount: m.clonesCutCount + 1 } : m));
    playHarvestChime();
    addXp(40, 'Corte de Esquejes');

    // Plant the clone as seedling
    plantNewSeed(mother.strain);
    showNotification(`¡Esqueje enraizado cortado de ${mother.name}! Plantado exitosamente (+40 XP)`, 'success');
    return true;
  };

  const collectPollenFromFather = (fatherId: string): number => {
    const father = mothersFathers.find(f => f.id === fatherId);
    if (!father) return 0;

    const collectedMg = 150;
    setMothersFathers(prev => prev.map(f => f.id === fatherId ? { ...f, pollenCollectedMg: f.pollenCollectedMg + collectedMg } : f));
    playClickSound();
    addXp(35, 'Recolección de Polen');
    showNotification(`Se recolectaron +${collectedMg}mg de polen fértil de ${father.name} (+35 XP)`, 'success');
    return collectedMg;
  };

  const hybridizeParents = (motherId: string, fatherId: string, newStrainName: string): Strain | null => {
    const mother = mothersFathers.find(m => m.id === motherId);
    const father = mothersFathers.find(f => f.id === fatherId);
    if (!mother || !father) {
      showNotification('Selecciona una Madre receptora y un Padre donante de polen válidos.', 'info');
      return null;
    }

    if (mother.id === father.id) {
      showNotification('Debes seleccionar dos individuos distintos para cruzar.', 'info');
      return null;
    }

    const hybridStrain = breedStrains(mother.strain, father.strain, newStrainName || `${mother.strain.name} x ${father.strain.name}`);
    
    // Add 5 seeds of this new hybrid to user's seed inventory
    const hybridSeedId = `hybrid_seed_${hybridStrain.id}`;
    const newSeedItem: SeedBankItem = {
      id: hybridSeedId,
      name: `${hybridStrain.name} (F1 Hybrid)`,
      breeder: `${brand.name} Lab Master`,
      seedType: 'Regular',
      lineage: `${mother.strain.name} x ${father.strain.name}`,
      thcPercentage: hybridStrain.thcPercentage,
      cbdPercentage: hybridStrain.cbdPercentage,
      floweringWeeks: 9,
      yieldGramsPerPlant: 165,
      difficulty: 'Avanzado',
      dominantTerpenes: ['Mirceno', 'Limoneno', 'Cariofileno'],
      priceFlora: 200,
      priceSol: 0.25,
      description: `Cruzamiento botánico F1 estabilizado entre ${mother.strain.name} y ${father.strain.name}.`,
      seedsPerPack: 5,
      imageTheme: 'emerald',
      inStock: true,
      strainTemplate: hybridStrain
    };

    setSeedBank(prev => [newSeedItem, ...prev]);
    setSeedInventory(prev => ({ ...prev, [hybridSeedId]: (prev[hybridSeedId] || 0) + 5 }));

    confetti({ particleCount: 150, spread: 100 });
    addXp(160, 'Hibridación F1 Exitosa');
    showNotification(`¡Hibridación F1 Completada! Se generaron 5 semillas exclusivas de "${hybridStrain.name}" en tu inventario (+160 XP)`, 'success');
    return hybridStrain;
  };

  // Facilities are built, not bought: each rung costs $FLORA (burned) and real time, you cannot skip a rung, and speeding up is capped
  const upgradeFacility = (facilityId: string) => {
    const target = facilities.find(f => f.id === facilityId);
    if (!target) return;
    if (target.unlocked) {
      if (target.tier < currentFacility.tier) showNotification(`${target.name} ya la superaste: tu instalación actual es mejor.`, 'info');
      else setCurrentFacility(target);
      return;
    }
    if (construction) {
      const b = facilities.find(f => f.id === construction.facilityId);
      showNotification(`Ya hay una obra en marcha (${b?.name ?? 'instalación'}). Termínala antes de empezar otra.`, 'info');
      return;
    }
    if (target.tier !== currentFacility.tier + 1) {
      showNotification('No se salta ningún escalón: construye primero la instalación anterior.', 'info');
      return;
    }
    if (floraBalance < target.costFlora) {
      showNotification(`Saldo insuficiente: la obra cuesta ${target.costFlora} $FLORA`, 'info');
      return;
    }
    const c = startConstruction(facilityId, Date.now());
    if (!c) return;
    recordBurnTransaction('BURN_SPEEDUP', target.costFlora, `Yield Bud Empire: Obra de ${target.name}`);
    setConstruction(c);
    const h = buildHoursOf(facilityId);
    showNotification(`¡Obra iniciada: ${target.name}! Tardará ${h >= 24 ? `${Math.round(h / 24 * 10) / 10} días` : `${h} h`}. Puedes seguir cultivando mientras tanto.`, 'success');
  };

  const finishConstruction = useCallback((c: Construction) => {
    const target = INITIAL_FACILITIES.find(f => f.id === c.facilityId);
    setConstruction(null);
    if (!target) return;
    setFacilities(prev => prev.map(f => f.id === c.facilityId ? { ...f, unlocked: true } : f));
    setCurrentFacility({ ...target, unlocked: true });
    confetti({ particleCount: 140, spread: 90, origin: { y: 0.55 } });
    showNotification(`¡Obra terminada! ${target.name}: ahora caben ${target.capacityPlants} ${target.capacityPlants === 1 ? 'planta' : 'plantas'}.`, 'success');
  }, [showNotification]);

  const speedUpConstruction = (): boolean => {
    if (!construction) return false;
    const q = speedUpQuote(construction, Date.now());
    if (!q) { showNotification('Ya usaste todas las aceleraciones de hoy. Mañana podrás recortar más; el resto lo pone el tiempo.', 'info'); return false; }
    if (floraBalance < q.costFlora) { showNotification(`Saldo insuficiente: acelerar cuesta ${q.costFlora} $FLORA`, 'info'); return false; }
    const r = applySpeedUp(construction, Date.now());
    if (!r) return false;
    const cutH = Math.round(q.cutMs / 360000) / 10;
    recordBurnTransaction('BURN_SPEEDUP', q.costFlora, `Yield Bud Empire: Aceleración de obra (−${cutH} h)`);
    setConstruction(r.state);
    showNotification(`Obra acelerada: −${cutH} h por ${q.costFlora} $FLORA quemados. Te quedan ${q.leftToday - 1} aceleraciones hoy.`, 'burn');
    return true;
  };

  // the build finishes by itself (also when you were away)
  useEffect(() => {
    if (!construction) return;
    if (isDone(construction, Date.now())) { finishConstruction(construction); return; }
    const t = setInterval(() => { if (isDone(construction, Date.now())) finishConstruction(construction); }, 5000);
    return () => clearInterval(t);
  }, [construction, finishConstruction]);

  // the room is exactly as big as the installation; plants past its capacity wait (frozen) and come back when it grows
  useEffect(() => {
    const cap = currentFacility.capacityPlants;
    if (indoorPlants.length === cap) return;
    const fresh = createInitialIndoorRoom(strains[0] ?? INITIAL_STRAINS[0]);
    const r = fitToCapacity<PlantInGrow>(indoorPlants, dormantPlants, cap, (slot) => ({
      ...fresh[slot], stage: 'seed' as GrowStage, progressPercent: 0, health: 100, soilMoisture: 85, plantedAt: Date.now(), trichomeMaturity: { clear: 100, milky: 0, amber: 0 },
    }));
    setIndoorPlants(r.active);
    setDormantPlants(r.dormant);
    setSelectedPlantIndex(i => Math.min(i, r.active.length - 1));
  }, [currentFacility.capacityPlants, indoorPlants, dormantPlants, strains]);

  // Process raw flower in Extraction Lab
  const processRawFlower = (type: 'cured_flower' | 'live_rosin' | 'full_spec_oil' | 'pure_terpenes', gramsInput: number): boolean => {
    if (rawFlowerGrams < gramsInput) {
      showNotification(`No tienes suficiente flor cruda (requiere ${gramsInput}g)`, 'info');
      return false;
    }

    // Check machine wear
    let requiredMachineId = 'rosin_press_10t';
    if (type === 'pure_terpenes') requiredMachineId = 'rotovap_extractor';
    if (type === 'cured_flower') requiredMachineId = 'freeze_dryer_subzero';
    if (type === 'full_spec_oil') requiredMachineId = 'rotovap_extractor';

    const machine = machines.find(m => m.id === requiredMachineId);
    if (machine && machine.wearPercentage <= 15) {
      showNotification(`La máquina ${machine.name} está averiada (desgaste crítico). ¡Repárala primero quemando $FLORA!`, 'info');
      return false;
    }

    playClickSound();
    setRawFlowerGrams(prev => prev - gramsInput);

    // Degrade machine wear
    setMachines(prev => prev.map(m => {
      if (m.id === requiredMachineId) {
        const nextWear = Math.max(0, m.wearPercentage - m.wearRatePerCycle);
        return {
          ...m,
          wearPercentage: nextWear,
          status: nextWear <= 20 ? 'averiado' : (nextWear <= 40 ? 'mantenimiento_requerido' : 'operativo')
        };
      }
      return m;
    }));

    // Generate output product
    let productYieldGrams = 0;
    let name = '';
    let potency = '';
    let value = 0;

    const currentStrainName = activePlant?.strain.name || strains[0].name;

    if (type === 'live_rosin') {
      productYieldGrams = Number((gramsInput * 0.22).toFixed(2));
      name = `${currentStrainName} Live Rosin Sin Solventes (90u)`;
      potency = '82.4% THC | 7.8% Terpenos';
      value = Math.round(productYieldGrams * 45);
    } else if (type === 'cured_flower') {
      productYieldGrams = gramsInput;
      name = `${currentStrainName} Flor Curada Prémium en Frío`;
      potency = '23.8% THC | 3.2% Terpenos';
      value = Math.round(productYieldGrams * 9);
    } else if (type === 'full_spec_oil') {
      productYieldGrams = Number((gramsInput * 0.4).toFixed(2));
      name = `${currentStrainName} Aceite Concentrado Full Spectrum`;
      potency = '65.0% Cannabinoides Totales';
      value = Math.round(productYieldGrams * 25);
    } else {
      productYieldGrams = Number((gramsInput * 0.08).toFixed(2));
      name = `Terpenos Puros Aislados de ${currentStrainName}`;
      potency = '99.2% Terpenos Volátiles Preservados';
      value = Math.round(productYieldGrams * 85);
    }

    const newProd: ProcessedProduct = {
      id: `prod-${Date.now()}`,
      name,
      type,
      strainOrigin: currentStrainName,
      quantityGrams: productYieldGrams,
      potency,
      qualityScore: 92 + Math.floor(Math.random() * 8),
      marketValueFlora: value,
      createdAt: Date.now(),
      batchHash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`
    };

    setProcessedProducts(prev => [newProd, ...prev]);
    reportEvent('lab', 1);
    addXp(80, 'Extracción Industrial');
    showNotification(`¡Extracción completada! Se crearon ${productYieldGrams}g de ${name} (Valor: ${value} $FLORA, +80 XP)`, 'success');
    return true;
  };


  // Industrial lab cycle: consumes flower/trim, burns a $FLORA fee (deflationary sink), wears the machine
  // and mints a product batch. Used by the animated Planta Industrial stations.
  const runLabProcess = (spec: LabRunSpec): ProcessedProduct | null => {
    const stock = spec.inputKind === 'flower' ? rawFlowerGrams : trimGrams;
    if (spec.grams <= 0 || stock < spec.grams) {
      showNotification(`No tienes suficiente ${spec.inputKind === 'flower' ? 'flor seca' : 'biomasa trim'} (requiere ${spec.grams}g)`, 'info');
      return null;
    }
    const machine = machines.find(m => m.id === spec.machineId);
    if (machine && machine.wearPercentage <= 15) {
      showNotification(`${machine.name} está averiada (desgaste crítico). ¡Repárala primero quemando $FLORA!`, 'info');
      return null;
    }
    if (floraBalance < spec.feeFlora) {
      showNotification(`Saldo insuficiente: el ciclo quema ${spec.feeFlora} $FLORA`, 'info');
      return null;
    }
    if (!takeStation(spec.stationId)) return null;

    playClickSound();
    if (spec.inputKind === 'flower') setRawFlowerGrams(prev => Math.max(0, Number((prev - spec.grams).toFixed(2))));
    else setTrimGrams(prev => Math.max(0, Number((prev - spec.grams).toFixed(2))));
    recordBurnTransaction('BURN_PROCESS', spec.feeFlora, `Yield Bud Empire Lab: ${spec.label} (${spec.grams}g)`);

    const wear = machine?.wearPercentage ?? 100;
    setMachines(prev => prev.map(m => {
      if (m.id !== spec.machineId) return m;
      const next = Math.max(0, m.wearPercentage - m.wearRatePerCycle);
      return { ...m, wearPercentage: next, status: next <= 20 ? 'averiado' : (next <= 40 ? 'mantenimiento_requerido' : 'operativo') };
    }));

    // worn machines lose yield and quality
    const wearFactor = wear > 60 ? 1 : wear > 40 ? 0.93 : 0.85;
    const strainName = activePlant?.strain.name || strains[0].name;
    const outGrams = Number((spec.grams * spec.yieldRatio * wearFactor).toFixed(2));
    const quality = Math.min(100, Math.round((90 + Math.random() * 9) * (wear > 40 ? 1 : 0.94)));
    const value = Math.round(outGrams * spec.pricePerGram * (0.9 + quality / 500));

    const prod: ProcessedProduct = {
      id: `prod-lab-${Date.now()}`,
      name: `${strainName} · ${spec.label}`,
      type: spec.type,
      strainOrigin: strainName,
      quantityGrams: outGrams,
      potency: spec.potency,
      qualityScore: quality,
      marketValueFlora: value,
      createdAt: Date.now(),
      batchHash: `0x${Math.random().toString(16).substring(2, 10)}...${Math.random().toString(16).substring(2, 6)}`
    };
    setProcessedProducts(prev => [prod, ...prev]);
    reportEvent('lab', 1);
    addXp(spec.xp ?? 90, 'Laboratorio Industrial');
    showNotification(`Lote acuñado: ${outGrams}g de ${spec.label} (valor ${value} $FLORA, calidad ${quality}%). Se quemaron ${spec.feeFlora} $FLORA.`, 'success');
    return prod;
  };

  // HPLC certification: burns a fee and stamps a certificate of analysis (+18% market value) on a batch
  const certifyProduct = (productId: string, feeFlora: number = 15): ProcessedProduct | null => {
    const prod = processedProducts.find(p => p.id === productId);
    if (!prod || prod.certified) return null;
    const machine = machines.find(m => m.id === 'hplc_analyzer');
    if (machine && machine.wearPercentage <= 15) {
      showNotification('El cromatógrafo está averiado. ¡Repáralo primero quemando $FLORA!', 'info');
      return null;
    }
    if (floraBalance < feeFlora) {
      showNotification(`Saldo insuficiente: el análisis quema ${feeFlora} $FLORA`, 'info');
      return null;
    }
    if (!takeStation('hplc')) return null;
    recordBurnTransaction('BURN_PROCESS', feeFlora, `Yield Bud Empire Lab: Análisis HPLC de ${prod.name}`);
    setMachines(prev => prev.map(m => {
      if (m.id !== 'hplc_analyzer') return m;
      const next = Math.max(0, m.wearPercentage - m.wearRatePerCycle);
      return { ...m, wearPercentage: next, status: next <= 20 ? 'averiado' : (next <= 40 ? 'mantenimiento_requerido' : 'operativo') };
    }));

    // realistic cannabinoid fingerprint per product family (deterministic-ish jitter)
    const jitter = (base: number, spread: number) => Number((base + (Math.random() - 0.5) * spread).toFixed(1));
    const family: Record<string, { thc: number; cbd: number; cbn: number; cbg: number; terpenes: number }> = {
      cured_flower: { thc: 23, cbd: 0.6, cbn: 0.2, cbg: 0.9, terpenes: 2.8 },
      preroll: { thc: 22, cbd: 0.6, cbn: 0.3, cbg: 0.8, terpenes: 2.4 },
      cigar: { thc: 30, cbd: 0.5, cbn: 0.3, cbg: 1.0, terpenes: 2.6 },
      live_rosin: { thc: 78, cbd: 1.8, cbn: 0.6, cbg: 2.1, terpenes: 7.4 },
      bubble_hash: { thc: 62, cbd: 1.2, cbn: 0.5, cbg: 1.6, terpenes: 5.2 },
      kief: { thc: 52, cbd: 1.0, cbn: 0.4, cbg: 1.4, terpenes: 3.9 },
      terpene_sauce: { thc: 68, cbd: 1.4, cbn: 0.4, cbg: 1.8, terpenes: 11.5 },
      rso: { thc: 76, cbd: 2.2, cbn: 1.6, cbg: 2.4, terpenes: 1.1 },
      full_spec_oil: { thc: 58, cbd: 4.5, cbn: 0.8, cbg: 2.0, terpenes: 2.2 },
      gummies: { thc: 8, cbd: 0.3, cbn: 0.1, cbg: 0.2, terpenes: 0.2 },
      pure_terpenes: { thc: 0.1, cbd: 0, cbn: 0, cbg: 0, terpenes: 97 },
    };
    const base = family[prod.type] ?? family.cured_flower;
    const coa = { thc: jitter(base.thc, 3), cbd: jitter(base.cbd, 0.4), cbn: jitter(base.cbn, 0.2), cbg: jitter(base.cbg, 0.3), terpenes: jitter(base.terpenes, 0.8) };
    const updated: ProcessedProduct = {
      ...prod,
      certified: true,
      coa,
      coaHash: `COA-${Math.random().toString(16).substring(2, 8).toUpperCase()}-${Math.random().toString(16).substring(2, 6).toUpperCase()}`,
      qualityScore: Math.min(100, prod.qualityScore + 2),
      marketValueFlora: Math.round(prod.marketValueFlora * 1.18),
    };
    setProcessedProducts(prev => prev.map(p => (p.id === productId ? updated : p)));
    reportEvent('certify', 1);
    addXp(70, 'Análisis de Laboratorio');
    showNotification(`Certificado ${updated.coaHash} emitido: THC ${coa.thc}%, CBD ${coa.cbd}% (+18% valor, quema ${feeFlora} $FLORA)`, 'success');
    return updated;
  };

  // Manual interactive arcade press from LabVisualizer
  const executeManualRosinPress = (yieldBonus: number, quality: number, isCritical: boolean) => {
    const gramsInput = 20;
    if (rawFlowerGrams < gramsInput) {
      showNotification(`Se requieren al menos ${gramsInput}g de flor seca para prensar`, 'info');
      return;
    }

    setRawFlowerGrams(prev => Math.max(0, prev - gramsInput));

    // Degrade rosin press
    setMachines(prev => prev.map(m => {
      if (m.id === 'rosin_press_10t') {
        const next = Math.max(0, m.wearPercentage - (isCritical ? 3 : 5));
        return {
          ...m,
          wearPercentage: next,
          status: next <= 20 ? 'averiado' : (next <= 40 ? 'mantenimiento_requerido' : 'operativo')
        };
      }
      return m;
    }));

    const currentStrainName = activePlant?.strain.name || strains[0].name;
    const baseGrams = Number((gramsInput * 0.22).toFixed(2));
    const finalGrams = Number((baseGrams * (1 + yieldBonus / 100)).toFixed(2));
    const marketVal = Math.round(finalGrams * (isCritical ? 65 : 45));

    const newProd: ProcessedProduct = {
      id: `prod-manual-${Date.now()}`,
      name: isCritical 
        ? `${currentStrainName} Live Rosin 90u (Prensado Crítico Zona Dorada)` 
        : `${currentStrainName} Live Rosin Artesanal (Prensado Manual)`,
      type: 'live_rosin',
      strainOrigin: currentStrainName,
      quantityGrams: finalGrams,
      potency: isCritical ? '86.8% THC | 9.1% Terpenos Puros' : '81.4% THC | 7.2% Terpenos',
      qualityScore: quality,
      marketValueFlora: marketVal,
      createdAt: Date.now(),
      batchHash: `0x${Math.random().toString(16).substring(2, 8)}...gold`
    };

    setProcessedProducts(prev => [newProd, ...prev]);

    if (isCritical) {
      updateQuestProgress('quest_rosin_gold', 1);
      addXp(140, 'Extracción Crítica en Zona Dorada');
    } else {
      addXp(70, 'Prensado Manual');
    }

    showNotification(
      `¡Prensado guardado en inventario! Obtenido +${finalGrams}g de Live Rosin (Valor: ${marketVal} $FLORA)`, 
      'success'
    );
  };

  // Repair machine by burning $FLORA
  const repairMachine = (machineId: string): boolean => {
    const machine = machines.find(m => m.id === machineId);
    if (!machine) return false;
    if (floraBalance < machine.repairCostFlora) {
      showNotification(`Saldo insuficiente: Requiere ${machine.repairCostFlora} $FLORA para reparar`, 'info');
      return false;
    }

    recordBurnTransaction('BURN_REPAIR', machine.repairCostFlora, `Yield Bud Empire: Mantenimiento y Restauración de ${machine.name}`);

    setMachines(prev => prev.map(m => {
      if (m.id === machineId) {
        return {
          ...m,
          wearPercentage: 100,
          status: 'operativo'
        };
      }
      return m;
    }));

    updateQuestProgress('quest_machine_repair', 1);
    addXp(120, 'Mantenimiento Deflacionario');

    showNotification(`¡${machine.name} reparada al 100%! Se quemaron ${machine.repairCostFlora} $FLORA de forma permanente (+120 XP)`, 'burn');
    return true;
  };

  // Breed two strains in Genetics Lab
  const breedStrains = (parentA: Strain, parentB: Strain, name: string): Strain => {
    playHarvestChime();
    const hybridThc = Number(((parentA.thcPercentage + parentB.thcPercentage) / 2 + (Math.random() * 2 - 0.5)).toFixed(1));
    const hybridCbd = Number(((parentA.cbdPercentage + parentB.cbdPercentage) / 2 + (Math.random() * 0.8 - 0.2)).toFixed(1));

    const hybridTerpenes = {
      myrcene: Number(((parentA.terpenes.myrcene + parentB.terpenes.myrcene) / 2).toFixed(2)),
      limonene: Number(((parentA.terpenes.limonene + parentB.terpenes.limonene) / 2).toFixed(2)),
      caryophyllene: Number(((parentA.terpenes.caryophyllene + parentB.terpenes.caryophyllene) / 2).toFixed(2)),
      pinene: Number(((parentA.terpenes.pinene + parentB.terpenes.pinene) / 2).toFixed(2)),
      linalool: Number(((parentA.terpenes.linalool + parentB.terpenes.linalool) / 2).toFixed(2))
    };

    const newStrain: Strain = {
      id: `strain-hybrid-${Date.now()}`,
      name: name.trim() || `Gen ${parentA.name.slice(0, 4)} x ${parentB.name.slice(0, 4)}`,
      lineage: `${parentA.name} x ${parentB.name}`,
      type: 'Híbrido',
      thcPercentage: Math.min(32, Math.max(16, hybridThc)),
      cbdPercentage: Math.max(0.2, hybridCbd),
      terpenes: hybridTerpenes,
      difficulty: 'Maestro',
      cycleDurationSeconds: Math.round((parentA.cycleDurationSeconds + parentB.cycleDurationSeconds) / 2),
      resinYieldMultiplier: Number((Math.max(parentA.resinYieldMultiplier, parentB.resinYieldMultiplier) * 1.15).toFixed(2)),
      colorTheme: '#ec4899',
      description: `Cruzamiento genético experimental desarrollado en el laboratorio Yield Bud Empire entre ${parentA.name} y ${parentB.name}.`
    };

    setStrains(prev => [...prev, newStrain]);
    updateQuestProgress('quest_genomic_breed', 1);
    reportEvent('breed', 1);
    addXp(220, 'Hibridación Genética');
    showNotification(`¡Nueva genética creada con éxito: ${newStrain.name}! (+220 XP)`, 'success');
    return newStrain;
  };

  // Register patent on Solana (Burns 250 $FLORA)
  const registerPatent = (strain: Strain): boolean => {
    if (floraBalance < 250) {
      showNotification('Saldo insuficiente: Registrar una patente genómica on-chain requiere quemar 250 $FLORA', 'info');
      return false;
    }

    const sig = generateSolanaSignature();
    recordBurnTransaction('BURN_PATENT', 250, `Yield Bud Empire: Registro On-Chain de Patente Genómica (${strain.name})`);

    const newPatent: GenomicPatent = {
      id: `pat-${Date.now()}`,
      strainName: strain.name,
      patentNumber: `SOL-PAT-${Math.floor(1000 + Math.random() * 9000)}-CF`,
      solanaSignature: sig,
      parentA: strain.lineage.split(' x ')[0] || 'Genética Silvestre',
      parentB: strain.lineage.split(' x ')[1] || 'Cultivar Solana',
      creatorWallet: `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`,
      registeredDate: new Date().toISOString().split('T')[0],
      thc: strain.thcPercentage,
      cbd: strain.cbdPercentage,
      dominantTerpene: 'Limoneno y Cariofileno',
      floraBurnedFee: 250
    };

    setPatents(prev => [newPatent, ...prev]);
    setStrains(prev => prev.map(s => s.id === strain.id ? { ...s, isPatented: true, patentId: newPatent.patentNumber } : s));

    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.5 },
      colors: ['#3b82f6', '#10b981', '#f59e0b']
    });

    updateQuestProgress('quest_genomic_breed', 1);
    reportEvent('patent', 1);
    addXp(300, 'Patente Genómica On-Chain');

    showNotification(`¡Patente ${newPatent.patentNumber} registrada en Solana! Se quemaron 250 $FLORA (+300 XP)`, 'burn');
    return true;
  };

  // Brand update
  const updateBrand = (name: string, tagline: string) => {
    setBrand(prev => ({
      ...prev,
      name,
      tagline
    }));
    showNotification('Marca virtual actualizada correctamente', 'info');
  };

  // Sell product in Virtual Dispensary
  const sellProduct = (productId: string) => {
    const prod = processedProducts.find(p => p.id === productId);
    if (!prod) return;

    playHarvestChime();
    const fee = Math.max(1, Math.round(prod.marketValueFlora * USE.marketFee));
    setFloraBalance(prev => prev + prod.marketValueFlora);
    recordBurnTransaction('BURN_PROCESS', fee, `Yield Bud Empire Dispensario: comisión de mercado ${(USE.marketFee * 100).toFixed(1)} % (${prod.name})`);
    setProcessedProducts(prev => prev.filter(p => p.id !== productId));
    setBrand(prev => ({
      ...prev,
      totalSalesFlora: prev.totalSalesFlora + prod.marketValueFlora,
      reputation: Math.min(100, prev.reputation + 1)
    }));

    reportEvent('sell', 1);
    showNotification(`¡Venta realizada en el Dispensario! Recibiste +${prod.marketValueFlora - fee} $FLORA (comisión de mercado ${fee} quemados)`, 'success');
  };

  // Redeem V2P (Virtual to Physical)
  const redeemV2p = (item: V2pRedemptionItem, shippingDetails: { name: string; country: string }): boolean => {
    if (floraBalance < item.requiredFlora) {
      showNotification(`Saldo insuficiente: Requiere ${item.requiredFlora} $FLORA para canjear este producto físico`, 'info');
      return false;
    }
    if (item.stockPhysical <= 0) {
      showNotification('Agotado temporalmente en el almacén físico', 'info');
      return false;
    }

    const sig = generateSolanaSignature();
    recordBurnTransaction('V2P_CLAIM', item.requiredFlora, `Yield Bud Empire: Canje Físico V2P (${item.title}) a ${shippingDetails.country}`);

    setV2pItems(prev => prev.map(i => i.id === item.id ? { ...i, stockPhysical: i.stockPhysical - 1 } : i));
    setRedeemedV2pList(prev => [
      { item, timestamp: Date.now(), txSig: sig, recipient: `${shippingDetails.name} (${shippingDetails.country})` },
      ...prev
    ]);
    setBrand(prev => ({ ...prev, totalV2pShipped: prev.totalV2pShipped + 1 }));

    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5 }
    });

    showNotification(`¡Orden V2P confirmada! Se quemaron ${item.requiredFlora} $FLORA. Certificado emitido en Solana`, 'success');
    return true;
  };

  // --- NPC MISSIONS: resources for playing, never free $FLORA ---
  const grantReward = (r: MissionReward, title: string) => {
    const lots = (r.lots ?? []).flatMap(l => Array.from({ length: l.qty ?? 1 }, () => newAsset(l.id)));
    if (lots.length) setAssets(prev => [...prev, ...lots]);
    if (r.seeds) {
      const seeds = r.seeds;
      setSeedInventory(prev => {
        const next = { ...prev };
        for (const [id, n] of Object.entries(seeds)) next[id] = (next[id] || 0) + n;
        return next;
      });
    }
    addXp(r.xp, `Misión: ${title}`);
    playHarvestChime();
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#fbbf24', '#38bdf8'] });
    const list = rewardSummary(r, id => CATALOG_BY_ID[id]?.name ?? id, id => seedBank.find(x => x.id === id)?.name ?? id).join(' · ');
    showNotification(`🎁 Misión cumplida: ${title} — ${list}`, 'success');
  };

  const claimStoryMission = (id: string): string | null => {
    const c = claimStory(missionsRef.current, id);
    if (!c) return null;
    applyMissions(c.state);
    grantReward(c.reward, c.title);
    return c.say;
  };

  const claimErrandMission = (npc: NpcKind): string | null => {
    const c = claimErrand(missionsRef.current, npc);
    if (!c) return null;
    applyMissions(c.state);
    grantReward(c.reward, c.title);
    return c.say;
  };

  // --- CHRONO'S TUTORIAL ---
  const startTutorial = () => applyTutorial(startTutState(tutorialRef.current, missionsRef.current));
  const claimTutorialStep = (): string | null => {
    const c = claimTutStep(tutorialRef.current, missionsRef.current);
    if (!c) return null;
    applyTutorial(c.state);
    grantReward(c.reward, c.title);
    return c.say;
  };
  const skipTutorialStep = () => applyTutorial(skipTutStep(tutorialRef.current, missionsRef.current));
  const patchTutorial = (p: Partial<TutorialState>) => applyTutorial({ ...tutorialRef.current, ...p });

  return (
    <GameContext.Provider
      value={{
        walletAddress,
        isWalletConnected,
        solanaNetwork,
        setSolanaNetwork,
        connectedWalletType,
        connectWallet,
        connectSpecificWallet,
        generateVirtualKeypair,
        signAuthMessageTest,
        refreshLiveBalance,
        disconnectWallet,
        floraBalance,
        solBalance,
        totalFloraBurned,
        burnStats,
        transactions,
        requestAirdrop,

        // User Accounts & Data Isolation
        currentUser,
        isAuthenticated,
        allUserProfiles,
        loginUser,
        registerUser,
        loginWithSolanaWallet,
        switchUserAccount,
        importLocalSave,
        logoutUser,
        updateUserProfile,

        facilities,
        currentFacility,
        upgradeFacility,
        construction,
        speedUpConstruction,
        strains,
        activePlant,
        indoorPlants,
        selectedPlantIndex,
        selectPlant,
        waterAllPlants,
        feedAllPlants,
        harvestAllReadyPlants,
        plantIndoorBatch,
        speedUpIndoorRoom,
        trainIndoorCanopy,
        plantNewSeed,
        waterPlant,
        assets,
        equipStats,
        resources,
        buyAsset,
        setAssetEquipped,
        repairAsset,
        ownsStation: (stationId: string) => ownsStation(assets, stationId),
        care: careInfo,
        missions,
        reportEvent,
        claimStoryMission,
        claimErrandMission,
        tutorial,
        startTutorial,
        claimTutorialStep,
        skipTutorialStep,
        patchTutorial,
        plots,
        plotsForSale,
        buyPlot,
        plantPlot,
        waterPlot,
        feedPlot,
        harvestPlot,
        plotEta,
        removeMales,
        avatars,
        chestPity,
        showNotification,
        openChest,
        equipAvatar,
        keepMaleAsFather,
        treatPests,
        cleanRoom,
        recycleGarbage,
        feedNutrients,
        setTemperature,
        setHumidity,
        setPpfd,
        setLightSchedule,
        trainPlant,
        speedUpGrowth,
        harvestPlant,

        rawFlowerGrams,
        trimGrams,
        processedProducts,
        machines,
        processRawFlower,
        runLabProcess,
        getPlantEta: (plant: PlantInGrow) => etaSeconds(plant, simEnvRef.current),
        certifyProduct,
        repairMachine,

        patents,
        breedStrains,
        registerPatent,

        // Seed Bank & Supplies
        seedBank,
        seedInventory,
        buySeed,
        plantFromSeedBank,
        suppliesMarket,
        buySupply,

        // Nutrients
        nutrientBrands,
        selectedNutrientBrand,
        setSelectedNutrientBrand,
        applyNutrientStage,
        applyFertigation,

        // Rooms & Microclimate Automation
        currentRoom,
        switchGrowRoom,
        co2Ppm,
        setCo2Ppm,
        autoWaterActive,
        toggleAutoWater,
        autoClimateActive,
        toggleAutoClimate,
        calibrateMeter,

        // Mothers & Fathers
        mothersFathers,
        saveCurrentPlantAsMotherOrFather,
        takeCloneFromMother,
        collectPollenFromFather,
        hybridizeParents,

        brand,
        updateBrand,
        sellProduct,
        v2pItems,
        redeemV2p,
        redeemedV2pList,

        soundEnabled: sound,
        toggleSound,

        // Gaming Progression
        playerLevel,
        playerXp,
        xpNeeded,
        rankTitle,
        addXp,
        quests,
        claimQuestReward,
        executeManualRosinPress,

        notification,
        clearNotification
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
