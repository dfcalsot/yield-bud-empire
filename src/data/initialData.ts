import { 
  Strain, 
  GrowFacility, 
  MachineEquipment, 
  V2pRedemptionItem,
  SeedBankItem,
  GrowSupplyItem,
  NutrientBrand,
  GrowRoomConfig,
  MotherFatherPlant,
  RegionId
} from '../types';

export const INITIAL_STRAINS: Strain[] = [
  {
    id: 'chrono_foundation_og',
    name: 'Chrono Foundation OG',
    lineage: 'Solana Landrace x Northern Lights',
    type: 'Híbrido',
    thcPercentage: 19.5,
    cbdPercentage: 1.2,
    terpenes: {
      myrcene: 0.85,
      limonene: 0.62,
      caryophyllene: 0.45,
      pinene: 0.28,
      linalool: 0.15,
    },
    difficulty: 'F2P Fácil',
    cycleDurationSeconds: 45,
    resinYieldMultiplier: 1.1,
    colorTheme: '#10b981', // emerald
    description: 'La cepa fundacional F2P. Gran resistencia biológica a fluctuaciones de microclima y producción equilibrada para cultivadores novatos.'
  },
  {
    id: 'solana_super_silver',
    name: 'Solana Super Silver',
    lineage: 'Haze x Skunk #1 x Solana Pheno #4',
    type: 'Sativa',
    thcPercentage: 24.2,
    cbdPercentage: 0.4,
    terpenes: {
      myrcene: 0.35,
      limonene: 1.15,
      caryophyllene: 0.50,
      pinene: 0.72,
      linalool: 0.20,
    },
    difficulty: 'Intermedio',
    cycleDurationSeconds: 60,
    resinYieldMultiplier: 1.35,
    colorTheme: '#38bdf8', // sky blue
    description: 'Perfil terpénico cítrico y electrizante. Excelente elongación en floración y rendimiento resinoso de alta pureza.'
  },
  {
    id: 'neon_kush_rosin',
    name: 'Neon Kush Live Rosin Cut',
    lineage: 'Hindu Kush x Neon Gas Express',
    type: 'Indica',
    thcPercentage: 27.8,
    cbdPercentage: 0.8,
    terpenes: {
      myrcene: 1.40,
      limonene: 0.40,
      caryophyllene: 1.10,
      pinene: 0.18,
      linalool: 0.65,
    },
    difficulty: 'Maestro',
    cycleDurationSeconds: 75,
    resinYieldMultiplier: 1.85,
    colorTheme: '#a855f7', // purple
    description: 'Optimizada específicamente para extracción de Live Rosin sin solventes. Glándulas de resina bulbosas de gran tamaño.'
  },
  {
    id: 'emerald_terp_queen',
    name: 'Emerald Terp Queen',
    lineage: 'Gelato 41 x Chrono Flora Gene v2',
    type: 'Híbrido',
    thcPercentage: 25.4,
    cbdPercentage: 3.5,
    terpenes: {
      myrcene: 0.95,
      limonene: 0.88,
      caryophyllene: 0.80,
      pinene: 0.55,
      linalool: 0.90,
    },
    difficulty: 'Exótico',
    cycleDurationSeconds: 90,
    resinYieldMultiplier: 2.1,
    isPatented: true,
    patentId: 'SOL-PAT-9941-X',
    colorTheme: '#f59e0b', // amber
    description: 'Cepa patentada de grado laboratorio con perfil cannabinoide balanceado y espectro de terpenos medicinales ultra-raros.'
  }
];

export const INITIAL_FACILITIES: GrowFacility[] = [
  {
    id: 'tent_starter',
    name: 'Carpa F2P Cultivador Casero (80x80cm)',
    tier: 1,
    costFlora: 0,
    capacityPlants: 1,
    environmentBonus: 1.0,
    description: 'Kit de inicio digital gratuito. Carpa de tela mylar reflectante, extractor básico y panel LED 150W.',
    unlocked: true,
    art: 'tent_starter'
  },
  {
    id: 'greenhouse_commercial',
    name: 'Invernadero Solar Automatizado',
    tier: 2,
    costFlora: 500,
    capacityPlants: 4,
    environmentBonus: 1.4,
    description: 'Control de clima computarizado, inyección de CO2 regulada (1200 ppm) y deshumidificación de alta capacidad.',
    unlocked: false,
    art: 'greenhouse_commercial'
  },
  {
    id: 'lab_pharma_hydro',
    name: 'Instalación Hidropónica Pharma Grade',
    tier: 3,
    costFlora: 2000,
    capacityPlants: 12,
    environmentBonus: 2.2,
    description: 'Sistemas aeropónicos verticales, espectro LED dinámico Samsung LM301H EVO y esterilización UV continua.',
    unlocked: false,
    art: 'lab_pharma_hydro'
  }
];

export const INITIAL_MACHINES: MachineEquipment[] = [
  {
    id: 'rosin_press_10t',
    name: 'Prensa Térmica Hidráulica 10 Toneladas',
    category: 'press',
    wearPercentage: 88,
    wearRatePerCycle: 6,
    repairCostFlora: 65,
    efficiencyBonus: 1.25,
    description: 'Prensado de resina sin solventes a temperatura controlada (82°C) con placas de aluminio anodizado.',
    status: 'operativo'
  },
  {
    id: 'rotovap_extractor',
    name: 'Destilador Rotativo de Terpenos (Rotavapor)',
    category: 'extractor',
    wearPercentage: 92,
    wearRatePerCycle: 8,
    repairCostFlora: 90,
    efficiencyBonus: 1.45,
    description: 'Aislamiento fraccionado de terpenos puros al vacío para conservar el perfil aromático volátil original.',
    status: 'operativo'
  },
  {
    id: 'freeze_dryer_subzero',
    name: 'Liofilizador Criogénico SubZero',
    category: 'dryer',
    wearPercentage: 75,
    wearRatePerCycle: 5,
    repairCostFlora: 80,
    efficiencyBonus: 1.30,
    description: 'Secado en frío que preserva el 99% de los tricomas y evita la oxidación de cannabinoides.',
    status: 'operativo'
  },
  {
    id: 'bubble_washer',
    name: 'Lavadora Bubble Hash de Agua-Hielo (3 mallas)',
    category: 'washer',
    wearPercentage: 94,
    wearRatePerCycle: 5,
    repairCostFlora: 60,
    efficiencyBonus: 1.2,
    description: 'Agitador con bolsas de 190/120/73 micras que separa las cabezas de tricoma con agua helada, sin solventes.',
    status: 'operativo'
  },
  {
    id: 'terp_reactor',
    name: 'Reactor de Sopa de Terpenos (Live Resin & THCa)',
    category: 'reactor',
    wearPercentage: 90,
    wearRatePerCycle: 7,
    repairCostFlora: 85,
    efficiencyBonus: 1.35,
    description: 'Reactor con agitador magnético y placa térmica que cristaliza diamantes de THCa dentro de una salsa rica en terpenos.',
    status: 'operativo'
  },
  {
    id: 'kief_sifter',
    name: 'Tamizadora Vibratoria de Kief (150 µm)',
    category: 'sifter',
    wearPercentage: 97,
    wearRatePerCycle: 3,
    repairCostFlora: 35,
    efficiencyBonus: 1.1,
    description: 'Malla de acero inoxidable con motor excéntrico que desprende el polvo de tricomas seco sin dañarlo.',
    status: 'operativo'
  },
  {
    id: 'rolling_machine',
    name: 'Enrolladora Industrial de Conos y Puros',
    category: 'roller',
    wearPercentage: 91,
    wearRatePerCycle: 4,
    repairCostFlora: 45,
    efficiencyBonus: 1.15,
    description: 'Rodillos de precisión que llenan y enrollan pre-rolls cónicos y puros de flor con papel de cáñamo.',
    status: 'operativo'
  },
  {
    id: 'hplc_analyzer',
    name: 'Cromatógrafo Líquido HPLC-UV (Análisis de Cannabinoides)',
    category: 'analyzer',
    wearPercentage: 98,
    wearRatePerCycle: 2,
    repairCostFlora: 120,
    efficiencyBonus: 1.0,
    description: 'Separa e identifica THC, CBD, CBN, CBG y terpenos; emite el certificado de análisis (COA) del lote on-chain.',
    status: 'operativo'
  },
  {
    id: 'quantum_led_system',
    name: 'Matriz Quantum Board UV & Far-Red',
    category: 'lighting',
    wearPercentage: 96,
    wearRatePerCycle: 4,
    repairCostFlora: 50,
    efficiencyBonus: 1.20,
    description: 'Emisión de espectro biológico enriquecido para maximizar la síntesis de resina y tricomas en pre-cosecha.',
    status: 'operativo'
  }
];

export const INITIAL_V2P_ITEMS: V2pRedemptionItem[] = [
  {
    id: 'v2p_terp_bottle',
    title: 'Frasco 15ml Terpenos Botánicos Puros (Chrono Terps)',
    category: 'Botanical Terpenes',
    requiredFlora: 850,
    stockPhysical: 142,
    art: 'v2p_terp_bottle',
    description: 'Perfil de terpenos idéntico al cultivado en juego, 100% orgánico certificado, grado alimentario y cosmético.',
    nftCertificateId: 'CERT-SOL-TRP-001'
  },
  {
    id: 'v2p_cbd_drops',
    title: 'Aceite Sublingual Full Spectrum Hemp 1500mg',
    category: 'Premium Hemp CBD',
    requiredFlora: 1400,
    stockPhysical: 89,
    art: 'v2p_cbd_drops',
    description: 'Extraído de cáñamo premium con cromatografía verificada por laboratorio externo y trazabilidad on-chain.',
    nftCertificateId: 'CERT-SOL-CBD-882'
  },
  {
    id: 'v2p_grow_hoodie',
    title: 'Sudadera Orgánica de Cáñamo "Master Cultivator"',
    category: 'Chrono Merch',
    requiredFlora: 600,
    stockPhysical: 55,
    art: 'v2p_grow_hoodie',
    description: 'Tejido 55% fibra de cáñamo natural y 45% algodón orgánico con chip NFC integrado vinculado a tu billetera Solana.',
    nftCertificateId: 'CERT-SOL-MRCH-109'
  }
];

export const INITIAL_QUESTS = [
  {
    id: 'quest_water_micro',
    title: 'Calibración de Sustrato',
    description: 'Riega la planta activa para mantener la humedad sobre el 75%.',
    category: 'cultivo' as const,
    targetCount: 1,
    currentCount: 0,
    rewardFlora: 40,
    rewardXp: 80,
    isCompleted: false,
    isClaimed: false,
    iconType: 'plant' as const
  },
  {
    id: 'quest_rosin_gold',
    title: 'Alquimista de la Zona Dorada',
    description: 'Prensa un lote de Live Rosin en la Zona Dorada (85 - 125 PSI) en el Laboratorio.',
    category: 'extraccion' as const,
    targetCount: 1,
    currentCount: 0,
    rewardFlora: 95,
    rewardXp: 160,
    isCompleted: false,
    isClaimed: false,
    iconType: 'press' as const
  },
  {
    id: 'quest_harvest_run',
    title: 'Cosecha F2P & Biomasa',
    description: 'Completa un ciclo de crecimiento y cosecha flores secas para el laboratorio.',
    category: 'cultivo' as const,
    targetCount: 1,
    currentCount: 0,
    rewardFlora: 75,
    rewardXp: 140,
    isCompleted: false,
    isClaimed: false,
    iconType: 'plant' as const
  },
  {
    id: 'quest_machine_repair',
    title: 'Mantenimiento Deflacionario',
    description: 'Repara una máquina desgastada quemando $FLORA de forma permanente en Solana.',
    category: 'deflacion' as const,
    targetCount: 1,
    currentCount: 0,
    rewardFlora: 60,
    rewardXp: 120,
    isCompleted: false,
    isClaimed: false,
    iconType: 'flame' as const
  },
  {
    id: 'quest_genomic_breed',
    title: 'Pionero Genético',
    description: 'Realiza un cruzamiento botánico o registra una patente genómica on-chain.',
    category: 'genetica' as const,
    targetCount: 1,
    currentCount: 0,
    rewardFlora: 150,
    rewardXp: 250,
    isCompleted: false,
    isClaimed: false,
    iconType: 'dna' as const
  }
];

export const GROW_ROOMS_CONFIG: GrowRoomConfig[] = [
  {
    id: 'germination',
    name: 'Cámara de Germinación & Propagación',
    subtitle: 'Enraizamiento & Plántulas (0-14 días)',
    recommendedLightSchedule: '18/6',
    targetTempC: 24,
    targetRhPercent: 80,
    targetPpfd: 200,
    targetCo2Ppm: 500,
    description: 'Ambiente hiper-húmedo con cúpula de propagación y calor basal (24°C). Estimula el rápido despliegue de cotiledones y raíces primarias.',
    accentColor: '#34d399',
    iconType: 'sprout'
  },
  {
    id: 'vegetative',
    name: 'Cuarto de Crecimiento Vegetativo',
    subtitle: 'Desarrollo Foliar & Ramificación (18/6)',
    recommendedLightSchedule: '18/6',
    targetTempC: 26,
    targetRhPercent: 65,
    targetPpfd: 600,
    targetCo2Ppm: 800,
    description: 'Espectro azul frío (5000K) y alta transpiración. Fomenta tallos gruesos, entrenudos cortos y asimilación masiva de nitrógeno.',
    accentColor: '#10b981',
    iconType: 'sun'
  },
  {
    id: 'flowering',
    name: 'Sala de Floración & Engorde de Tricomas',
    subtitle: 'Fotoperiodo 12/12 & Maduración de Resina',
    recommendedLightSchedule: '12/12',
    targetTempC: 23,
    targetRhPercent: 45,
    targetPpfd: 1000,
    targetCo2Ppm: 1200,
    description: 'Luz roja profunda (660nm) y Far Red (730nm) enriquecida con 1200 PPM de CO2. Máxima biosíntesis de cannabinoides y engorde de cálices.',
    accentColor: '#f59e0b',
    iconType: 'flower'
  },
  {
    id: 'mothers_fathers',
    name: 'Santuario de Madres & Padres Donantes',
    subtitle: 'Genotecas Élite & Hibridación Botánica',
    recommendedLightSchedule: '18/6',
    targetTempC: 25,
    targetRhPercent: 60,
    targetPpfd: 450,
    targetCo2Ppm: 700,
    description: 'Espacio dedicado a conservar fenotipos campeones para la extracción de esquejes/clones y recolección de polen de machos seleccionados.',
    accentColor: '#ec4899',
    iconType: 'dna'
  }
];

export const INITIAL_SEED_BANK: SeedBankItem[] = [
  {
    id: 'seed_chrono_og',
    name: 'Chrono Foundation OG (Fem)',
    breeder: 'ChronoFlora Genetics',
    seedType: 'Feminizada',
    lineage: 'Solana Landrace x Northern Lights #5',
    thcPercentage: 21.0,
    cbdPercentage: 1.2,
    floweringWeeks: 8,
    yieldGramsPerPlant: 140,
    difficulty: 'Fácil',
    dominantTerpenes: ['Mirceno', 'Limoneno', 'Cariofileno'],
    priceFlora: 50,
    priceSol: 0.05,
    description: 'Genética pilar ideal para arrancar en cualquier carpa o sala. Gran resistencia a novatadas en pH y riegos.',
    seedsPerPack: 3,
    imageTheme: 'emerald',
    inStock: true,
    strainTemplate: INITIAL_STRAINS[0]
  },
  {
    id: 'seed_super_silver_haze',
    name: 'Solana Super Silver Haze (Fem)',
    breeder: 'Green House / Chrono Vault',
    seedType: 'Feminizada',
    lineage: 'Skunk #1 x Northern Lights x Haze',
    thcPercentage: 24.5,
    cbdPercentage: 0.3,
    floweringWeeks: 10,
    yieldGramsPerPlant: 180,
    difficulty: 'Intermedio',
    dominantTerpenes: ['Terpinoleno', 'Limoneno', 'Pineno'],
    priceFlora: 85,
    priceSol: 0.09,
    description: 'Sativa galardonada de efecto cerebral eléctrico. Necesita buen control de altura y fotoperiodo estricto 12/12.',
    seedsPerPack: 3,
    imageTheme: 'cyan',
    inStock: true,
    strainTemplate: INITIAL_STRAINS[1]
  },
  {
    id: 'seed_neon_kush_rosin',
    name: 'Neon Kush Live Rosin Cut (Fem)',
    breeder: 'Exotic Genetix x Chrono',
    seedType: 'Feminizada',
    lineage: 'Hindu Kush x Neon Gas #8',
    thcPercentage: 28.2,
    cbdPercentage: 0.6,
    floweringWeeks: 8.5,
    yieldGramsPerPlant: 160,
    difficulty: 'Avanzado',
    dominantTerpenes: ['Mirceno', 'Cariofileno', 'Linalol'],
    priceFlora: 140,
    priceSol: 0.15,
    description: 'Especialmente seleccionada por su densidad de tricomas glandulares de 90-120 micras. Retorno de rosin superior al 22%.',
    seedsPerPack: 3,
    imageTheme: 'purple',
    inStock: true,
    strainTemplate: INITIAL_STRAINS[2]
  },
  {
    id: 'seed_gelato_auto',
    name: 'Royal Gelato Auto (Fast Flowering)',
    breeder: 'FastBuds Botánica',
    seedType: 'Autofloreciente',
    lineage: 'Gelato 33 x Chrono Ruderalis F4',
    thcPercentage: 23.0,
    cbdPercentage: 1.0,
    floweringWeeks: 9,
    yieldGramsPerPlant: 110,
    difficulty: 'Fácil',
    dominantTerpenes: ['Cariofileno', 'Limoneno', 'Humuleno'],
    priceFlora: 70,
    priceSol: 0.07,
    description: 'No depende de cambio de fotoperiodo. Lista de semilla a cosecha en 9 semanas exactas con sabor a postre dulce.',
    seedsPerPack: 3,
    imageTheme: 'amber',
    inStock: true,
    strainTemplate: {
      id: 'gelato_auto_strain',
      name: 'Royal Gelato Auto',
      lineage: 'Gelato 33 x Ruderalis',
      type: 'Autofloreciente',
      thcPercentage: 23.0,
      cbdPercentage: 1.0,
      terpenes: { myrcene: 0.6, limonene: 1.1, caryophyllene: 0.9, pinene: 0.2, linalool: 0.4 },
      difficulty: 'F2P Fácil',
      cycleDurationSeconds: 40,
      resinYieldMultiplier: 1.3,
      colorTheme: '#f59e0b',
      description: 'Autofloreciente rápida con sabor dulce a pastelería californiana y alta concentración de resina.'
    }
  },
  {
    id: 'seed_colombian_gold_landrace',
    name: 'Santa Marta Colombian Gold (Regular)',
    breeder: 'World of Seeds Landrace',
    seedType: 'Landrace',
    lineage: 'Sierra Nevada de Santa Marta (Pura Landrace)',
    thcPercentage: 18.5,
    cbdPercentage: 2.2,
    floweringWeeks: 12,
    yieldGramsPerPlant: 220,
    difficulty: 'Maestro',
    dominantTerpenes: ['Limoneno', 'Sabineno', 'Ocimeno'],
    priceFlora: 180,
    priceSol: 0.20,
    description: 'Genética pura no adulterada. Semillas regulares con proporción 50/50 machos y hembras, indispensables para breeding y padres de élite.',
    seedsPerPack: 5,
    imageTheme: 'yellow',
    inStock: true,
    strainTemplate: {
      id: 'colombian_gold_strain',
      origin: 'south_america',
      name: 'Santa Marta Colombian Gold',
      lineage: 'Sierra Nevada Landrace',
      type: 'Sativa',
      thcPercentage: 18.5,
      cbdPercentage: 2.2,
      terpenes: { myrcene: 0.4, limonene: 1.3, caryophyllene: 0.3, pinene: 0.8, linalool: 0.2 },
      difficulty: 'Maestro',
      cycleDurationSeconds: 85,
      resinYieldMultiplier: 1.2,
      colorTheme: '#eab308',
      description: 'Legendaria landrace pura colombiana. Aroma a incienso cítrico y vigor híbrido extraordinario para cruzamientos.'
    }
  },
  {
    id: 'seed_runtz_terp_bomb',
    name: 'Runtz Terpene Bomb S1 (Fem)',
    breeder: 'Barney’s Farm x Chrono',
    seedType: 'Feminizada',
    lineage: 'Zkittlez x Gelato #33',
    thcPercentage: 29.0,
    cbdPercentage: 0.2,
    floweringWeeks: 8.5,
    yieldGramsPerPlant: 155,
    difficulty: 'Avanzado',
    dominantTerpenes: ['Linalol', 'Limoneno', 'Mirceno'],
    priceFlora: 160,
    priceSol: 0.18,
    description: 'Perfil terpénico a caramelo de frutas tropicales. Cálices recubiertos de resina blanca escarchada de máxima potencia.',
    seedsPerPack: 3,
    imageTheme: 'pink',
    inStock: true,
    strainTemplate: INITIAL_STRAINS[3]
  }
];

/** A pure landrace, native to one region of the planet (it thrives on land plots there — see sim/terroir.ts). */
const landraceSeed = (o: {
  id: string; name: string; short: string; origin: RegionId; lineage: string; type: Strain['type']; thc: number; cbd: number; weeks: number; yieldG: number;
  terp: string[]; terpenes: Strain['terpenes']; price: number; cycle: number; resin: number; color: string; desc: string; strainDesc: string;
}): SeedBankItem => ({
  id: `seed_${o.id}`, name: `${o.name} (Regular)`, breeder: 'Landrace del Mundo', seedType: 'Landrace', lineage: o.lineage,
  thcPercentage: o.thc, cbdPercentage: o.cbd, floweringWeeks: o.weeks, yieldGramsPerPlant: o.yieldG, difficulty: 'Avanzado', dominantTerpenes: o.terp,
  priceFlora: o.price, priceSol: Number((o.price / 1000).toFixed(3)), description: o.desc, seedsPerPack: 5, imageTheme: 'emerald', inStock: true,
  strainTemplate: {
    id: o.id, name: o.short, lineage: o.lineage, type: o.type, thcPercentage: o.thc, cbdPercentage: o.cbd, terpenes: o.terpenes, difficulty: 'Maestro',
    cycleDurationSeconds: o.cycle, resinYieldMultiplier: o.resin, colorTheme: o.color, description: o.strainDesc, origin: o.origin,
  },
});

export const LANDRACE_SEEDS: SeedBankItem[] = [
  landraceSeed({ id: 'hindu_kush', name: 'Hindu Kush Afgano', short: 'Hindu Kush', origin: 'afghanistan', lineage: 'Cordillera del Hindu Kush (Landrace pura)', type: 'Indica', thc: 17, cbd: 0.8, weeks: 9, yieldG: 150,
    terp: ['Mirceno', 'Pineno', 'Cariofileno'], terpenes: { myrcene: 1.1, limonene: 0.2, caryophyllene: 0.7, pinene: 0.5, linalool: 0.3 }, price: 120, cycle: 70, resin: 1.4, color: '#d97706',
    desc: 'La madre de las indicas: resina densa y gruesa, nacida entre valles secos y noches frías. Ama el sol y el aire seco de Afganistán.', strainDesc: 'Indica de montaña, resinosa y resistente al frío. Rinde mucho en tierras áridas.' }),
  landraceSeed({ id: 'acapulco_gold', name: 'Acapulco Gold', short: 'Acapulco Gold', origin: 'mexico', lineage: 'Sierra de Guerrero (Landrace pura)', type: 'Sativa', thc: 19, cbd: 0.3, weeks: 11, yieldG: 170,
    terp: ['Limoneno', 'Pineno', 'Terpinoleno'], terpenes: { myrcene: 0.3, limonene: 1.2, caryophyllene: 0.3, pinene: 0.7, linalool: 0.2 }, price: 130, cycle: 85, resin: 1.1, color: '#f97316',
    desc: 'La sativa dorada de México: efecto luminoso y aroma cítrico-dulce. Pide sol fuerte y riego atento en la sierra seca.', strainDesc: 'Sativa dorada de clima cálido y seco.' }),
  landraceSeed({ id: 'lambs_bread', name: "Lamb's Bread Jamaicana", short: "Lamb's Bread", origin: 'jamaica', lineage: 'Colinas de Jamaica (Landrace pura)', type: 'Sativa', thc: 20, cbd: 0.2, weeks: 11, yieldG: 180,
    terp: ['Mirceno', 'Ocimeno', 'Cariofileno'], terpenes: { myrcene: 0.9, limonene: 0.5, caryophyllene: 0.6, pinene: 0.3, linalool: 0.4 }, price: 150, cycle: 88, resin: 1.15, color: '#22c55e',
    desc: 'Sativa isleña de calor húmedo y suelos ricos. Vigorosa, aromática y agradecida con las lluvias… si vigilas el moho.', strainDesc: 'Sativa tropical, vigorosa y aromática.' }),
  landraceSeed({ id: 'panama_red', name: 'Panama Red', short: 'Panama Red', origin: 'central_america', lineage: 'Selvas de Panamá (Landrace pura)', type: 'Sativa', thc: 18, cbd: 0.3, weeks: 12, yieldG: 190,
    terp: ['Pineno', 'Limoneno', 'Mirceno'], terpenes: { myrcene: 0.6, limonene: 0.8, caryophyllene: 0.4, pinene: 0.9, linalool: 0.2 }, price: 140, cycle: 90, resin: 1.1, color: '#ef4444',
    desc: 'Sativa de selva con pistilos rojizos. Aguanta lluvias y sombra como ninguna y es la reina del trópico húmedo.', strainDesc: 'Sativa de selva, tolera lluvias y poca luz.' }),
  landraceSeed({ id: 'durban_poison', name: 'Durban Poison Sudafricana', short: 'Durban Poison', origin: 'africa', lineage: 'Puerto de Durban (Landrace pura)', type: 'Sativa', thc: 20, cbd: 0.1, weeks: 10, yieldG: 170,
    terp: ['Terpinoleno', 'Ocimeno', 'Mirceno'], terpenes: { myrcene: 0.5, limonene: 0.6, caryophyllene: 0.3, pinene: 0.4, linalool: 0.2 }, price: 140, cycle: 78, resin: 1.2, color: '#a3e635',
    desc: 'Sativa enérgica de la sabana africana: crece rápido bajo el sol implacable y es de las landrace más productivas.', strainDesc: 'Sativa de sabana, rápida y enérgica.' }),
  landraceSeed({ id: 'thai_stick', name: 'Thai Stick', short: 'Thai Stick', origin: 'asia', lineage: 'Llanuras de Tailandia (Landrace pura)', type: 'Sativa', thc: 19, cbd: 0.2, weeks: 13, yieldG: 200,
    terp: ['Ocimeno', 'Terpinoleno', 'Limoneno'], terpenes: { myrcene: 0.3, limonene: 0.9, caryophyllene: 0.3, pinene: 0.4, linalool: 0.3 }, price: 150, cycle: 90, resin: 1.1, color: '#38bdf8',
    desc: 'Sativa alta y esbelta del monzón. Agradece el calor y la humedad del sudeste asiático; lenta pero generosa.', strainDesc: 'Sativa alta de monzón, lenta y generosa.' }),
];

INITIAL_SEED_BANK.push(...LANDRACE_SEEDS);

export const INITIAL_GROW_SUPPLIES: GrowSupplyItem[] = [
  // CO2
  {
    id: 'supply_co2_tank_system',
    name: 'Sistema de CO2 Presurizado con Solenoide & Sensor NDIR',
    category: 'co2',
    categoryLabel: 'Sistemas de CO2',
    brand: 'TrolMaster / ChronoGas',
    priceFlora: 280,
    priceSol: 0.35,
    spec: 'Botella 10kg + Regulador Dual + Sensor Infrarrojo NDIR (0-2500 PPM)',
    description: 'Inyecta dióxido de carbono de forma controlada para alcanzar 1200-1500 PPM en floración, acelerando el metabolismo y fotosíntesis en un +35%.',
    installed: false,
    features: ['Inyección automática a 1200 PPM', '+35% Fotosíntesis y Resistencia Térmica hasta 30°C', 'Sensor NDIR calibrado']
  },
  {
    id: 'supply_co2_mycelium_bag',
    name: 'Bolsas Orgánicas de CO2 Micelio Activo (Pack x2)',
    category: 'co2',
    categoryLabel: 'Sistemas de CO2',
    brand: 'ExHale HomeGrow',
    priceFlora: 60,
    priceSol: 0.08,
    spec: 'Emisión pasiva constante de 700-900 PPM durante 6 meses',
    description: 'Generación natural y silenciosa de CO2 por respiración de micelio fúngico no patógeno. Ideal para carpas medianas.',
    installed: false,
    features: ['Económico F2P', 'Sin electricidad', '+15% crecimiento vegetativo']
  },

  // RIEGO
  {
    id: 'supply_autopot_drip',
    name: 'Sistema de Riego Automático por Goteo Gravitacional',
    category: 'irrigation',
    categoryLabel: 'Automatización de Riego',
    brand: 'AutoPot Hydroponics SmartValve',
    priceFlora: 220,
    priceSol: 0.28,
    spec: 'Tanque 47L + Válvula AquaValve de demanda radicular',
    description: 'Riega automáticamente cuando el sustrato lo necesita sin bombas eléctricas ni temporizadores complejos. Evita encharcamientos.',
    installed: false,
    features: ['Riego automático continuo', 'Humedad de sustrato estabilizada en 70-80%', 'Cero desperdicio de solución']
  },
  {
    id: 'supply_fertigation_peripod',
    name: 'Bomba Dosificadora Automática de Nutrientes A+B',
    category: 'irrigation',
    categoryLabel: 'Automatización de Riego',
    brand: 'Bluelab PeriPod & Pro Controller',
    priceFlora: 390,
    priceSol: 0.45,
    spec: 'Controlador PID con 3 bombas peristálticas para pH Up/Down y Nutrientes A+B',
    description: 'Inyecta automáticamente mililitros precisos para mantener el agua en la EC y pH exactos requeridos según la etapa.',
    installed: false,
    features: ['Dosificación automática de fertirriego', 'Ajuste dinámico de EC y pH', 'Evita bloqueos de sales']
  },

  // MEDIDORES
  {
    id: 'supply_bluelab_ph_meter',
    name: 'Medidor Digital de pH de Grado Laboratorio con ATC',
    category: 'meters',
    categoryLabel: 'Instrumental Científico',
    brand: 'Bluelab pH Pen Pro',
    priceFlora: 120,
    priceSol: 0.14,
    spec: 'Precisión ±0.05 pH, Calibración en 2 puntos (4.01 / 7.01), Compensación Térmica ATC',
    description: 'Mide con precisión atómica la acidez del sustrato y solución nutritiva para garantizar absorción plena de Fósforo y Calcio.',
    installed: true,
    features: ['Lectura en tiempo real', 'Alerta de rango óptimo (5.8 - 6.5)', 'Sonda sumergible de vidrio']
  },
  {
    id: 'supply_apera_ec_meter',
    name: 'Conductímetro Digital EC / PPM (Electroconductividad)',
    category: 'meters',
    categoryLabel: 'Instrumental Científico',
    brand: 'Apera Instruments EC60 Pocket Tester',
    priceFlora: 135,
    priceSol: 0.16,
    spec: 'Sensor de platino negro, escala mS/cm y conversión PPM 500 / 700',
    description: 'Determina la concentración total de sales y nutrientes disponibles. Previene tanto la desnutrición como la sobrefertilización.',
    installed: true,
    features: ['Medición exacta en mS/cm', 'Detector de salinidad en tiempo real', 'Compensación automática de temperatura']
  },
  {
    id: 'supply_apogee_par_meter',
    name: 'Sensor Cuántico PAR / PPFD & Medidor de Lúmenes Full-Spectrum',
    category: 'meters',
    categoryLabel: 'Instrumental Científico',
    brand: 'Apogee Instruments MQ-500',
    priceFlora: 310,
    priceSol: 0.38,
    spec: 'Respuesta espectral 400-700nm + ePAR 700-750nm (μmol/m²s y lux lúmenes)',
    description: 'El estándar de oro científico para medir los fotones fotosintéticos exactos que inciden en el dosel de la planta.',
    installed: false,
    features: ['Mapeo exacto de PPFD y Lux', 'Evita clorosis apical y quemaduras por luz', 'Cálculo de DLI (Daily Light Integral)']
  },

  // CLIMA
  {
    id: 'supply_ac_infinity_controller',
    name: 'Controlador Climático Integrado Inteligente con Sensor VPD',
    category: 'climate',
    categoryLabel: 'Controladores Climáticos',
    brand: 'AC Infinity Controller 69 PRO',
    priceFlora: 240,
    priceSol: 0.30,
    spec: 'Sensor suizo Sensirion de Temp, Humedad y VPD con 4 salidas PWM programables',
    description: 'Ajusta automáticamente ventiladores, extractores y humidificadores según el déficit de presión de vapor deseado para cada fase.',
    installed: false,
    features: ['Regulación climática autónoma', 'Monitoreo dinámico de VPD (0.8 - 1.4 kPa)', 'Presión negativa constante']
  },
  {
    id: 'supply_commercial_dehumidifier',
    name: 'Deshumidificador Criogénico Comercial 50L/día',
    category: 'climate',
    categoryLabel: 'Controladores Climáticos',
    brand: 'Quest Climate Dual Tech',
    priceFlora: 340,
    priceSol: 0.42,
    spec: 'Compresor rotativo eficiente, drenaje continuo y rango 35-80% RH',
    description: 'Mantiene la humedad estricta por debajo del 45% en semanas finales de floración, garantizando cogollos densos libres de botrytis.',
    installed: false,
    features: ['Protección anti-botrytis y oídio', 'Extracción de 50L de humedad diaria', 'Ahorro energético']
  },

  // NUTRIENTES
  {
    id: 'supply_pack_advanced_nutrients',
    name: 'Línea Completa Advanced Nutrients pH Perfect (Micro-Grow-Bloom + Big Bud)',
    category: 'nutrients',
    categoryLabel: 'Nutrición Botánica',
    brand: 'Advanced Nutrients',
    priceFlora: 175,
    priceSol: 0.22,
    spec: 'Fórmula quelada con tecnología auto-amortiguadora de pH (pH Perfect)',
    description: 'Mantiene automáticamente el pH entre 5.8 y 6.3 sin necesidad de ácidos correctores. Incluye estimulador de floración Big Bud.',
    installed: false,
    features: ['Tecnología pH Perfect', '+25% tamaño de cálices con Big Bud', 'Quelatos de aminoácidos']
  },
  {
    id: 'supply_pack_athena_pro',
    name: 'Línea de Fertilizantes Sales Grado Comercial Athena Pro Line',
    category: 'nutrients',
    categoryLabel: 'Nutrición Botánica',
    brand: 'Athena Ag Pro Line',
    priceFlora: 260,
    priceSol: 0.32,
    spec: 'Athena Core, Grow y Bloom solubles en polvo para máxima pureza sin sedimentos',
    description: 'El estándar de las macro-instalaciones de California. Cero residuos, biodisponibilidad del 100% y tricomas superlimpios para rosin.',
    installed: false,
    features: ['Ideal para extracción Live Rosin', 'Cero sedimentos en goteros', 'Pureza de laboratorio farmacéutico']
  }
];

export const NUTRIENT_BRANDS_DATABASE: NutrientBrand[] = [
  {
    id: 'advanced_nutrients',
    name: 'Advanced Nutrients',
    line: 'pH Perfect & Grand Master Level',
    category: 'Mineral Quelada',
    colorTheme: '#06b6d4',
    description: 'Fórmula basada en quelatos sintéticos y orgánicos con tecnología pH Perfect que estabiliza la solución en 5.8-6.2 de forma automática.',
    baseProducts: ['pH Perfect Grow', 'pH Perfect Micro', 'pH Perfect Bloom', 'B-52 B-Complex', 'Big Bud', 'Overdrive', 'Flawless Finish'],
    stages: [
      {
        stageName: 'Germinación & Plántulas',
        phaseCode: 'Semana 1',
        targetPh: '5.8 - 6.0',
        targetEc: '0.6 - 0.8 mS/cm',
        targetPpm500: '300 - 400 PPM',
        recommendedNpk: '1-1-1 suave',
        dosageMlPerLiter: [
          { productName: 'pH Perfect Micro', mlPerL: 0.5 },
          { productName: 'pH Perfect Grow', mlPerL: 0.5 },
          { productName: 'pH Perfect Bloom', mlPerL: 0.5 },
          { productName: 'B-52 Booster', mlPerL: 1.0 }
        ],
        instructions: 'Solución muy suave para no quemar las raíces tiernas. Humedecer jiffys o lana de roca.'
      },
      {
        stageName: 'Vegetativo Temprano',
        phaseCode: 'Semanas 2-3',
        targetPh: '5.8 - 6.2',
        targetEc: '1.2 - 1.5 mS/cm',
        targetPpm500: '600 - 750 PPM',
        recommendedNpk: '3-1-2',
        dosageMlPerLiter: [
          { productName: 'pH Perfect Grow', mlPerL: 2.0 },
          { productName: 'pH Perfect Micro', mlPerL: 2.0 },
          { productName: 'pH Perfect Bloom', mlPerL: 1.0 },
          { productName: 'B-52 Booster', mlPerL: 2.0 }
        ],
        instructions: 'Promueve follaje verde oscuro, ramas fuertes y expansión del sistema radicular.'
      },
      {
        stageName: 'Vegetativo Tardío (Pre-Flo)',
        phaseCode: 'Semanas 4-5',
        targetPh: '6.0 - 6.3',
        targetEc: '1.6 - 1.9 mS/cm',
        targetPpm500: '800 - 950 PPM',
        recommendedNpk: '3-1-3',
        dosageMlPerLiter: [
          { productName: 'pH Perfect Grow', mlPerL: 4.0 },
          { productName: 'pH Perfect Micro', mlPerL: 4.0 },
          { productName: 'pH Perfect Bloom', mlPerL: 2.0 },
          { productName: 'B-52 Booster', mlPerL: 2.0 }
        ],
        instructions: 'Máximo vigor previo al cambio de fotoperiodo a 12/12. Preparación estructural.'
      },
      {
        stageName: 'Pre-Floración & Transición',
        phaseCode: 'Semanas 6-7 (12/12)',
        targetPh: '6.0 - 6.4',
        targetEc: '1.8 - 2.1 mS/cm',
        targetPpm500: '900 - 1050 PPM',
        recommendedNpk: '1-3-2',
        dosageMlPerLiter: [
          { productName: 'pH Perfect Micro', mlPerL: 3.0 },
          { productName: 'pH Perfect Grow', mlPerL: 2.0 },
          { productName: 'pH Perfect Bloom', mlPerL: 4.0 },
          { productName: 'Bud Ignitor', mlPerL: 2.0 }
        ],
        instructions: 'Multiplica los puntos de floración (nudos) durante el estirón inicial (stretch).'
      },
      {
        stageName: 'Floración Plena & Engorde',
        phaseCode: 'Semanas 8-9 (Peak Bloom)',
        targetPh: '6.2 - 6.5',
        targetEc: '2.0 - 2.4 mS/cm',
        targetPpm500: '1000 - 1200 PPM',
        recommendedNpk: '0-5-4 (Alto PK)',
        dosageMlPerLiter: [
          { productName: 'pH Perfect Micro', mlPerL: 4.0 },
          { productName: 'pH Perfect Bloom', mlPerL: 4.0 },
          { productName: 'Big Bud (PK Booster)', mlPerL: 2.0 },
          { productName: 'Overdrive (End Bloom)', mlPerL: 1.5 }
        ],
        instructions: 'Aporte masivo de Fósforo y Potasio quelado. Los cálices engordan y se llenan de glándulas resinosas.'
      },
      {
        stageName: 'Lavado de Raíces (Flushing)',
        phaseCode: 'Últimos 7-10 días',
        targetPh: '6.2 - 6.5',
        targetEc: '0.2 - 0.4 mS/cm',
        targetPpm500: '100 - 200 PPM',
        recommendedNpk: '0-0-0 (Agua Pura)',
        dosageMlPerLiter: [
          { productName: 'Flawless Finish Quelante', mlPerL: 2.0 }
        ],
        instructions: 'Elimina residuos minerales retenidos en el tejido celular para asegurar ceniza blanca limpia y humo aromático.'
      }
    ]
  },
  {
    id: 'biobizz_organic',
    name: 'BioBizz Worldwide',
    line: '100% Certified Organic & Micro-Life',
    category: 'Orgánica 100%',
    colorTheme: '#10b981',
    description: 'Filosofía holística holandesa con extractos de remolacha azucarera, vinaza y algas marinas que alimentan la microbiología viva del suelo.',
    baseProducts: ['Bio-Grow', 'Bio-Bloom', 'Top-Max', 'Root-Juice', 'Alg-A-Mic', 'Bio-Heaven'],
    stages: [
      {
        stageName: 'Germinación & Plántulas',
        phaseCode: 'Semana 1',
        targetPh: '6.2 - 6.5',
        targetEc: '0.5 - 0.7 mS/cm',
        targetPpm500: '250 - 350 PPM',
        recommendedNpk: 'Orgánico Suave',
        dosageMlPerLiter: [
          { productName: 'Root-Juice (Estimulador)', mlPerL: 2.0 },
          { productName: 'Bio-Heaven', mlPerL: 1.0 }
        ],
        instructions: 'Estimula el desarrollo de raíces y micorrizas sin alterar el pH orgánico del sustrato.'
      },
      {
        stageName: 'Vegetativo Temprano',
        phaseCode: 'Semanas 2-3',
        targetPh: '6.2 - 6.6',
        targetEc: '1.0 - 1.3 mS/cm',
        targetPpm500: '500 - 650 PPM',
        recommendedNpk: 'Bio-Nitrógeno',
        dosageMlPerLiter: [
          { productName: 'Bio-Grow', mlPerL: 1.5 },
          { productName: 'Bio-Heaven', mlPerL: 2.0 },
          { productName: 'Alg-A-Mic', mlPerL: 1.0 }
        ],
        instructions: 'Proporciona nitrógeno de asimilación lenta derivado de melazas y microelementos marinos.'
      },
      {
        stageName: 'Vegetativo Tardío',
        phaseCode: 'Semanas 4-5',
        targetPh: '6.3 - 6.7',
        targetEc: '1.3 - 1.6 mS/cm',
        targetPpm500: '650 - 800 PPM',
        recommendedNpk: 'Crecimiento Robusto',
        dosageMlPerLiter: [
          { productName: 'Bio-Grow', mlPerL: 2.5 },
          { productName: 'Bio-Heaven', mlPerL: 2.0 },
          { productName: 'Alg-A-Mic', mlPerL: 1.5 }
        ],
        instructions: 'Incrementar riego para acondicionar el sustrato vivo antes del pase a floración.'
      },
      {
        stageName: 'Pre-Floración & Estirón',
        phaseCode: 'Semanas 6-7',
        targetPh: '6.3 - 6.8',
        targetEc: '1.6 - 1.8 mS/cm',
        targetPpm500: '800 - 900 PPM',
        recommendedNpk: 'Transición Floral',
        dosageMlPerLiter: [
          { productName: 'Bio-Grow', mlPerL: 2.0 },
          { productName: 'Bio-Bloom', mlPerL: 2.0 },
          { productName: 'Top-Max', mlPerL: 1.0 }
        ],
        instructions: 'Top-Max moviliza nutrientes y acelera el transporte de azúcares a las pre-flores.'
      },
      {
        stageName: 'Floración Plena',
        phaseCode: 'Semanas 8-9',
        targetPh: '6.4 - 6.8',
        targetEc: '1.8 - 2.0 mS/cm',
        targetPpm500: '900 - 1000 PPM',
        recommendedNpk: 'Fósforo y Potasio Natural',
        dosageMlPerLiter: [
          { productName: 'Bio-Grow', mlPerL: 1.5 },
          { productName: 'Bio-Bloom', mlPerL: 3.5 },
          { productName: 'Top-Max', mlPerL: 3.0 },
          { productName: 'Bio-Heaven', mlPerL: 3.0 }
        ],
        instructions: 'Intensa producción de terpenos orgánicos y resina de color ámbar natural.'
      },
      {
        stageName: 'Lavado / Desfogue Orgánico',
        phaseCode: 'Últimos 10-14 días',
        targetPh: '6.5',
        targetEc: '0.3 - 0.5 mS/cm',
        targetPpm500: '150 - 250 PPM',
        recommendedNpk: 'Agua Filtrada',
        dosageMlPerLiter: [
          { productName: 'Agua pura sin nutrientes', mlPerL: 0 }
        ],
        instructions: 'En cultivo orgánico basta regar con agua no clorada. La planta metaboliza sus reservas de clorofila.'
      }
    ]
  },
  {
    id: 'athena_pro',
    name: 'Athena Ag Pro Line',
    line: 'Clean & Soluble Commercial Standard',
    category: 'Sales Grado Comercial',
    colorTheme: '#8b5cf6',
    description: 'El sistema preferido por cultivadores comerciales de California y extractores de Rosin. Cero impurezas, sedimentos ni metales pesados.',
    baseProducts: ['Athena Core', 'Athena Grow', 'Athena Bloom', 'Athena Cleanse', 'Athena CaMg'],
    stages: [
      {
        stageName: 'Germinación & Propagación',
        phaseCode: 'Semana 1',
        targetPh: '5.8 - 6.0',
        targetEc: '0.8 - 1.0 mS/cm',
        targetPpm500: '400 - 500 PPM',
        recommendedNpk: 'Bajo EC Ultra Limpio',
        dosageMlPerLiter: [
          { productName: 'Athena Core', mlPerL: 1.0 },
          { productName: 'Athena Grow', mlPerL: 1.0 },
          { productName: 'Athena Cleanse', mlPerL: 0.5 }
        ],
        instructions: 'Athena Cleanse mantiene la línea de riego estéril contra patógenos y biofilm.'
      },
      {
        stageName: 'Vegetativo Fuerte',
        phaseCode: 'Semanas 2-4',
        targetPh: '5.8 - 6.1',
        targetEc: '2.0 - 2.5 mS/cm',
        targetPpm500: '1000 - 1250 PPM',
        recommendedNpk: 'Core + Grow 3:5',
        dosageMlPerLiter: [
          { productName: 'Athena Core', mlPerL: 3.0 },
          { productName: 'Athena Grow', mlPerL: 5.0 },
          { productName: 'Athena Cleanse', mlPerL: 0.5 }
        ],
        instructions: 'Athena tolera altas ECs gracias a sales ultra refinadas sin generar puntas quemadas.'
      },
      {
        stageName: 'Floración Plena',
        phaseCode: 'Semanas 5-9',
        targetPh: '5.9 - 6.2',
        targetEc: '2.5 - 3.0 mS/cm',
        targetPpm500: '1250 - 1500 PPM',
        recommendedNpk: 'Core + Bloom 3:5',
        dosageMlPerLiter: [
          { productName: 'Athena Core', mlPerL: 3.0 },
          { productName: 'Athena Bloom', mlPerL: 5.0 },
          { productName: 'Athena Cleanse', mlPerL: 1.0 }
        ],
        instructions: 'En combinación con 1200 PPM de CO2 genera glándulas de resina con tricomas gigantes.'
      },
      {
        stageName: 'Fade / Lavado Limpio',
        phaseCode: 'Semana Final',
        targetPh: '6.0',
        targetEc: '0.2 - 0.4 mS/cm',
        targetPpm500: '100 - 200 PPM',
        recommendedNpk: 'Cleanse Puro',
        dosageMlPerLiter: [
          { productName: 'Athena Cleanse', mlPerL: 2.0 }
        ],
        instructions: 'Remueve precipitaciones minerales de raíz a copa.'
      }
    ]
  }
];

export const INITIAL_MOTHERS_FATHERS: MotherFatherPlant[] = [
  {
    id: 'mother_chrono_og_cut',
    role: 'Madre (Esquejes / Clones)',
    strain: INITIAL_STRAINS[0],
    name: 'Madre #1 Chrono Foundation OG (Fenotipo Campeón)',
    health: 98,
    clonesCutCount: 14,
    pollenCollectedMg: 0,
    savedAt: Date.now() - 86400000 * 30,
    traits: ['Enraizamiento en 7 días', 'Resistencia alta a oídio', 'Entrenudos compactos']
  },
  {
    id: 'father_santa_marta_male',
    role: 'Padre (Donante de Polen)',
    strain: INITIAL_STRAINS[1],
    name: 'Padre Seleccionado Colombian Gold Landrace Male',
    health: 95,
    clonesCutCount: 0,
    pollenCollectedMg: 450,
    savedAt: Date.now() - 86400000 * 20,
    traits: ['Polen hiper-fértil', 'Transmisión dominante de Limoneno', 'Vigor híbrido F1']
  },
  {
    id: 'mother_neon_kush_elite',
    role: 'Madre (Esquejes / Clones)',
    strain: INITIAL_STRAINS[2],
    name: 'Madre Élite Neon Kush Rosin #4 Cut',
    health: 100,
    clonesCutCount: 8,
    pollenCollectedMg: 0,
    savedAt: Date.now() - 86400000 * 12,
    traits: ['Cabezas de tricoma 120u', 'Gusto a combustible gaseoso', 'Floración rápida 55 días']
  }
];


