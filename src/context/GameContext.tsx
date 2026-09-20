import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import {
  Strain,
  GrowFacility,
  MachineEquipment,
  PlantInGrow,
  ProcessedProduct,
  LabRunSpec,
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

// Calculate Vapor Pressure Deficit (VPD) in kPa
export function calculateVpd(tempC: number, rhPercent: number): number {
  // Saturation Vapor Pressure (Tetens formula)
  const svp = 0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  // Actual Vapor Pressure
  const avp = svp * (rhPercent / 100);
  const vpd = svp - avp;
  return Math.max(0.1, Number(vpd.toFixed(2)));
}

// Generate realistic Solana signature
export function generateSolanaSignature(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let sig = '';
  for (let i = 0; i < 88; i++) {
    sig += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sig;
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
  logoutUser: () => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;

  // Cultivation & Indoor Grow Room (3 filas de 10 plantas en pares de 2)
  facilities: GrowFacility[];
  currentFacility: GrowFacility;
  upgradeFacility: (facilityId: string) => void;
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
  plantNewSeed: (strain: Strain) => void;
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

  // Nutrient Tables & Feeding
  nutrientBrands: NutrientBrand[];
  selectedNutrientBrand: string;
  setSelectedNutrientBrand: (brandId: string) => void;
  applyNutrientStage: (stageIndex: number) => void;

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
      memo: 'ChronoFlora: Speedup Boost (Anchor Instruction #4)'
    },
    {
      id: 'tx-init-2',
      signature: '3vK9xZbWp12LMn98RtU12...burnAnchor',
      type: 'BURN_REPAIR',
      amountFlora: 65,
      timestamp: Date.now() - 3600000 * 2,
      status: 'finalized',
      blockSlot: 248914890,
      memo: 'ChronoFlora: Prensa Hidráulica 10T Overhaul (Permanent Burn)'
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
  const [autoWaterActive, setAutoWaterActive] = useState<boolean>(false);
  const [autoClimateActive, setAutoClimateActive] = useState<boolean>(false);

  // Mothers, Fathers & Breeding Genotypes
  const [mothersFathers, setMothersFathers] = useState<MotherFatherPlant[]>(INITIAL_MOTHERS_FATHERS);

  // Indoor Grow Room: 3 Rows of 10 Plants in pairs of 2 (30 plants total)
  const [indoorPlants, setIndoorPlants] = useState<PlantInGrow[]>(() => {
    return createInitialIndoorRoom(INITIAL_STRAINS[0]);
  });
  const [selectedPlantIndex, setSelectedPlantIndex] = useState<number>(0);

  // Active plant refers to currently selected plant in the indoor room
  const activePlant = indoorPlants[selectedPlantIndex] || indoorPlants[0] || null;

  const selectPlant = useCallback((index: number) => {
    if (index >= 0 && index < 30) {
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
      name: 'Chrono OG Live Rosin 90u',
      type: 'live_rosin',
      strainOrigin: 'Chrono Foundation OG',
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
      parentB: 'Chrono Flora Gene v2',
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
    name: 'ChronoSol Botanicals',
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
    } else if (type === 'BURN_REPAIR' || type === 'BURN_PROCESS') {
      setBurnStats(prev => ({ ...prev, repairs: prev.repairs + amount }));
    } else if (type === 'BURN_PATENT') {
      setBurnStats(prev => ({ ...prev, patents: prev.patents + amount }));
    } else if (type === 'V2P_CLAIM') {
      setBurnStats(prev => ({ ...prev, v2p: prev.v2p + amount }));
    }
  }, []);

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
    brand
  ]);

  const loadUserDataForUser = useCallback((userId: string) => {
    const saved = loadUserData(userId);
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
    } else {
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
  }, []);

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
      const msg = `ChronoFlora Botanical Web3 Auth | Cultivador: ${currentUser?.displayName || 'Anónimo'} | Red: ${solanaNetwork} | Timestamp: ${Date.now()}`;
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
        tagline: 'Genéticas puras cultivadas en ChronoFlora',
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
    showNotification(`¡Bienvenido a ChronoFlora, ${newProfile.displayName}! Paquete de inicio activado (+500 $FLORA, 2.0 SOL).`, 'success');
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

  // Real-time ticking simulation loop for all 30 indoor room plants (3 rows of 10 in pairs of 2)
  useEffect(() => {
    const interval = setInterval(() => {
      setIndoorPlants(currentPlants => {
        return currentPlants.map(current => {
          if (current.stage === 'ready_harvest') return current;

          // Soil moisture decreases slightly, replenished by auto-drip if enabled
          let newSoilMoisture = Math.max(10, current.soilMoisture - 0.25);
          if (autoWaterActive && newSoilMoisture < 45) {
            newSoilMoisture = 85;
          }

          // Auto climate regulation towards room target if active
          let currentTemp = current.temperatureC;
          let currentRh = current.relativeHumidity;
          if (autoClimateActive) {
            const roomConf = GROW_ROOMS_CONFIG.find(r => r.id === (current.currentRoom || currentRoom));
            if (roomConf) {
              if (Math.abs(currentTemp - roomConf.targetTempC) > 0.2) {
                currentTemp += currentTemp < roomConf.targetTempC ? 0.2 : -0.2;
              }
              if (Math.abs(currentRh - roomConf.targetRhPercent) > 0.4) {
                currentRh += currentRh < roomConf.targetRhPercent ? 0.4 : -0.4;
              }
            }
          }
          
          // Growth progression rate influenced by facility bonus, VPD, moisture, and CO2
          const vpd = calculateVpd(currentTemp, currentRh);
          const isVpdOptimal = vpd >= 0.8 && vpd <= 1.4;
          const moistureFactor = newSoilMoisture > 40 ? 1.0 : 0.4;
          const healthFactor = current.health / 100;
          const co2Multiplier = (current.co2Ppm || co2Ppm) >= 1100 ? 1.35 : ((current.co2Ppm || co2Ppm) >= 800 ? 1.18 : 1.0);
          
          const growthIncrement = (100 / (current.strain.cycleDurationSeconds * 2.5)) 
            * currentFacility.environmentBonus 
            * (isVpdOptimal ? 1.2 : 0.8) 
            * moistureFactor 
            * healthFactor
            * co2Multiplier;

          const newProgress = Math.min(100, current.progressPercent + growthIncrement);
          
          // Stage transitions
          let newStage: GrowStage = current.stage;
          if (newProgress < 15) {
            newStage = 'seedling';
          } else if (newProgress < 50) {
            newStage = 'vegetative';
          } else if (newProgress < 95) {
            newStage = 'flowering';
          } else {
            newStage = 'ready_harvest';
          }

          // Trichome maturity shifts in flowering stage
          let clear = 90;
          let milky = 10;
          let amber = 0;
          if (newStage === 'flowering') {
            const flowerProgress = (newProgress - 50) / 45; // 0 to 1
            clear = Math.max(5, Math.round(90 - flowerProgress * 75));
            milky = Math.round(flowerProgress * 70);
            amber = Math.max(0, Math.round(flowerProgress * 25));
          } else if (newStage === 'ready_harvest') {
            clear = 5;
            milky = 65;
            amber = 30;
          }

          // Health adjustments if dry or out of VPD
          let newHealth = current.health;
          if (newSoilMoisture < 25) {
            newHealth = Math.max(30, newHealth - 0.2);
          } else if (isVpdOptimal && newHealth < 100) {
            newHealth = Math.min(100, newHealth + 0.1);
          }

          return {
            ...current,
            progressPercent: Number(newProgress.toFixed(1)),
            stage: newStage,
            soilMoisture: Number(newSoilMoisture.toFixed(1)),
            temperatureC: Number(currentTemp.toFixed(1)),
            relativeHumidity: Number(currentRh.toFixed(1)),
            luxLumens: Math.round(current.ppfdLightIntensity * 54),
            health: Math.round(newHealth),
            vpdKpa: vpd,
            trichomeMaturity: { clear, milky, amber }
          };
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentFacility, autoWaterActive, autoClimateActive, currentRoom, co2Ppm]);

  // Actions on active plant & room-wide batch actions
  const waterPlant = () => {
    playWaterSound();
    setIndoorPlants(prev => prev.map((p, idx) => {
      if (idx !== selectedPlantIndex) return p;
      return {
        ...p,
        soilMoisture: Math.min(100, p.soilMoisture + 40),
        health: Math.min(100, p.health + 5),
        lastWatered: Date.now()
      };
    }));
    updateQuestProgress('quest_water_micro', 1);
    addXp(20, 'Riego y Calibración');
    showNotification(`Riego completado en Planta #${selectedPlantIndex + 1} (+20 XP)`, 'info');
  };

  const waterAllPlants = () => {
    playWaterSound();
    setIndoorPlants(prev => prev.map(p => ({
      ...p,
      soilMoisture: Math.min(100, p.soilMoisture + 40),
      health: Math.min(100, p.health + 5),
      lastWatered: Date.now()
    })));
    updateQuestProgress('quest_water_micro', 5);
    addXp(60, 'Riego Masivo Sala Indoor');
    showNotification('¡Riego por goteo activado en las 3 filas (30 plantas de la sala)! (+60 XP)', 'info');
  };

  const feedNutrients = () => {
    playClickSound();
    setIndoorPlants(prev => prev.map((p, idx) => {
      if (idx !== selectedPlantIndex) return p;
      return {
        ...p,
        ecLevel: 2.1,
        phLevel: 6.2,
        health: Math.min(100, p.health + 10),
        lastFed: Date.now()
      };
    }));
    addXp(25, 'Nutrición N-P-K');
    showNotification(`Nutrición N-P-K optimizada en Planta #${selectedPlantIndex + 1} (+25 XP)`, 'info');
  };

  const feedAllPlants = () => {
    playClickSound();
    setIndoorPlants(prev => prev.map(p => ({
      ...p,
      ecLevel: 2.1,
      phLevel: 6.2,
      health: Math.min(100, p.health + 10),
      lastFed: Date.now()
    })));
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

    recordBurnTransaction('BURN_SPEEDUP', 25, 'ChronoFlora: Aceleración Fotónica Planta Individual (Quema de 25 $FLORA)');
    
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

    recordBurnTransaction('BURN_SPEEDUP', 50, 'ChronoFlora: Aceleración Fotónica Sala Indoor Completa (30 Plantas)');

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

    const flowerHarvested = Math.round(target.estimatedDryYieldGrams * (target.health / 100));
    const trimHarvested = Math.round(flowerHarvested * 0.4);

    setRawFlowerGrams(prev => prev + flowerHarvested);
    setTrimGrams(prev => prev + trimHarvested);

    updateQuestProgress('quest_harvest_run', 1);
    addXp(180, 'Cosecha F2P');

    showNotification(`¡Cosecha exitosa! Planta #${selectedPlantIndex + 1}: +${flowerHarvested}g Flor Seca y +${trimHarvested}g Biomasa (+180 XP)`, 'success');

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
        trichomeMaturity: { clear: 95, milky: 5, amber: 0 }
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

    setIndoorPlants(prev => prev.map((p) => {
      if (p.stage === 'ready_harvest' || p.progressPercent >= 90) {
        const flower = Math.round(p.estimatedDryYieldGrams * (p.health / 100));
        const trim = Math.round(flower * 0.4);
        totalFlower += flower;
        totalTrim += trim;

        return {
          ...p,
          stage: 'seedling' as GrowStage,
          progressPercent: 5,
          health: 98,
          soilMoisture: 80,
          plantedAt: Date.now(),
          trichomeMaturity: { clear: 95, milky: 5, amber: 0 }
        };
      }
      return p;
    }));

    setRawFlowerGrams(prev => prev + totalFlower);
    setTrimGrams(prev => prev + totalTrim);
    updateQuestProgress('quest_harvest_run', readyIndices.length);
    addXp(readyIndices.length * 150, 'Cosecha Sala Indoor');
    showNotification(`¡Cosecha de Sala Completa! ${readyIndices.length} plantas cosechadas: +${totalFlower}g Flor Seca y +${totalTrim}g Biomasa`, 'success');
  };

  const plantNewSeed = (strain: Strain) => {
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
        estimatedDryYieldGrams: Math.round(75 * strain.resinYieldMultiplier * currentFacility.environmentBonus)
      };
    }));
    showNotification(`Semilla plantada en Planta #${selectedPlantIndex + 1}: ${strain.name}. ¡Inicia el monitoreo de microclima!`, 'info');
  };

  const plantIndoorBatch = (strain: Strain) => {
    playClickSound();
    setIndoorPlants(createInitialIndoorRoom(strain));
    addXp(50, 'Siembra Sala Completa');
    showNotification(`Sala Indoor resembrada con 30 plantas de ${strain.name} (3 filas en pares de 2)`, 'info');
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
      recordBurnTransaction('BURN_PATENT', seed.priceFlora, `ChronoFlora: Compra de Pack de Semillas (${seed.name})`);
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
        memo: `ChronoFlora: Adquisición de Semillas ${seed.name} con SOL`
      };
      setTransactions(prev => [newTx, ...prev]);
    }

    setSeedInventory(prev => ({
      ...prev,
      [seedId]: (prev[seedId] || 0) + seed.seedsPerPack
    }));

    playHarvestChime();
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
    plantNewSeed(seedItem.strainTemplate);
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
      recordBurnTransaction('BURN_REPAIR', supply.priceFlora, `ChronoFlora: Instalación de Equipo de Cultivo (${supply.name})`);
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
        memo: `ChronoFlora: Compra de Hardware Botánico ${supply.name}`
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

  // --- NUTRIENT DOSING & BRAND FEEDING TABLES ---
  const applyNutrientStage = (stageIndex: number) => {
    if (!activePlant) return;
    const brand = nutrientBrands.find(b => b.id === selectedNutrientBrand);
    if (!brand || !brand.stages[stageIndex]) return;

    const targetStage = brand.stages[stageIndex];
    playWaterSound();

    // Parse EC target approx
    const ecNum = parseFloat(targetStage.targetEc.split('-')[0]) || 1.8;
    const phNum = parseFloat(targetStage.targetPh.split('-')[0]) || 6.2;

    setActivePlant(prev => {
      if (!prev) return null;
      return {
        ...prev,
        nutrientBrand: brand.name,
        ecLevel: ecNum,
        phLevel: phNum,
        health: Math.min(100, prev.health + 8),
        lastFed: Date.now()
      };
    });

    addXp(30, `Nutrición ${brand.name}`);
    showNotification(`Tabla aplicada: ${targetStage.stageName} (${brand.name}). EC: ${ecNum} mS/cm, pH: ${phNum} (+30 XP)`, 'success');
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

  // Upgrade facility
  const upgradeFacility = (facilityId: string) => {
    const target = facilities.find(f => f.id === facilityId);
    if (!target) return;
    if (floraBalance < target.costFlora) {
      showNotification(`Saldo insuficiente: Requiere ${target.costFlora} $FLORA para desbloquear`, 'info');
      return;
    }

    if (target.costFlora > 0) {
      recordBurnTransaction('BURN_SPEEDUP', target.costFlora, `ChronoFlora: Desbloqueo de Instalación ${target.name}`);
    }

    setFacilities(prev => prev.map(f => f.id === facilityId ? { ...f, unlocked: true } : f));
    setCurrentFacility(target);
    showNotification(`¡Instalación actualizada a: ${target.name}!`, 'success');
  };

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

    playClickSound();
    if (spec.inputKind === 'flower') setRawFlowerGrams(prev => Math.max(0, Number((prev - spec.grams).toFixed(2))));
    else setTrimGrams(prev => Math.max(0, Number((prev - spec.grams).toFixed(2))));
    recordBurnTransaction('BURN_PROCESS', spec.feeFlora, `ChronoFlora Lab: ${spec.label} (${spec.grams}g)`);

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
    recordBurnTransaction('BURN_PROCESS', feeFlora, `ChronoFlora Lab: Análisis HPLC de ${prod.name}`);
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

    recordBurnTransaction('BURN_REPAIR', machine.repairCostFlora, `ChronoFlora: Mantenimiento y Restauración de ${machine.name}`);

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
      description: `Cruzamiento genético experimental desarrollado en el laboratorio ChronoFlora entre ${parentA.name} y ${parentB.name}.`
    };

    setStrains(prev => [...prev, newStrain]);
    updateQuestProgress('quest_genomic_breed', 1);
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
    recordBurnTransaction('BURN_PATENT', 250, `ChronoFlora: Registro On-Chain de Patente Genómica (${strain.name})`);

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
    setFloraBalance(prev => prev + prod.marketValueFlora);
    setProcessedProducts(prev => prev.filter(p => p.id !== productId));
    setBrand(prev => ({
      ...prev,
      totalSalesFlora: prev.totalSalesFlora + prod.marketValueFlora,
      reputation: Math.min(100, prev.reputation + 1)
    }));

    showNotification(`¡Venta realizada en el Dispensario! Recibiste +${prod.marketValueFlora} $FLORA`, 'success');
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
    recordBurnTransaction('V2P_CLAIM', item.requiredFlora, `ChronoFlora: Canje Físico V2P (${item.title}) a ${shippingDetails.country}`);

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
        logoutUser,
        updateUserProfile,

        facilities,
        currentFacility,
        upgradeFacility,
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
