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
import { k } from '../i18n/core';

export const INITIAL_STRAINS: Strain[] = [
  {
    id: 'chrono_foundation_og',
    name: k('Yield Foundation OG'),
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
    description: k('La cepa fundacional F2P. Gran resistencia biológica a fluctuaciones de microclima y producción equilibrada para cultivadores novatos.')
  },
  {
    id: 'solana_super_silver',
    name: k('Solana Super Silver'),
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
    description: k('Perfil terpénico cítrico y electrizante. Excelente elongación en floración y rendimiento resinoso de alta pureza.')
  },
  {
    id: 'neon_kush_rosin',
    name: k('Neon Kush Live Rosin Cut'),
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
    description: k('Optimizada específicamente para extracción de Live Rosin sin solventes. Glándulas de resina bulbosas de gran tamaño.')
  },
  {
    id: 'emerald_terp_queen',
    name: k('Emerald Terp Queen'),
    lineage: 'Gelato 41 x Yield Bud Gene v2',
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
    description: k('Cepa patentada de grado laboratorio con perfil cannabinoide balanceado y espectro de terpenos medicinales ultra-raros.')
  }
];

export const INITIAL_FACILITIES: GrowFacility[] = [
  {
    id: 'tent_starter',
    name: k('Armario de cultivo (60x60cm)'),
    tier: 1,
    costFlora: 0,
    capacityPlants: 1,
    environmentBonus: 1.0,
    description: k('Tu punto de partida gratuito: un armario de madera con una lámpara pequeña y un ventilador de clip. Una sola planta, mucho mimo y paciencia.'),
    unlocked: true,
    art: 'tent_starter'
  },
  {
    id: 'tent_pro',
    name: k('Carpa de cultivo Mylar (120x120cm)'),
    tier: 2,
    costFlora: 250,
    capacityPlants: 4,
    environmentBonus: 1.15,
    description: k('Paredes reflectantes, extractor con filtro de carbón y barra LED amplia. Cuatro plantas y por fin control de olor y temperatura.'),
    unlocked: false,
    art: 'tent_starter'
  },
  {
    id: 'greenhouse_commercial',
    name: k('Invernadero Solar Automatizado'),
    tier: 3,
    costFlora: 900,
    capacityPlants: 8,
    environmentBonus: 1.35,
    description: k('Techo de cristal con ventilación natural, paneles solares y nebulización. Ocho plantas bajo el cielo real, con clima casi automático.'),
    unlocked: false,
    art: 'greenhouse_commercial'
  },
  {
    id: 'lab_pharma_hydro',
    name: k('Instalación Hidropónica Pharma Grade'),
    tier: 4,
    costFlora: 3000,
    capacityPlants: 12,
    environmentBonus: 1.9,
    description: k('Cuarto limpio con racks NFT, tanques de nutrientes, esterilización UV, enfriadora y pantalla de control. Doce plantas de calidad farmacéutica.'),
    unlocked: false,
    art: 'lab_pharma_hydro',
    resourceUse: 0.6
  },
  // sedes del imperio: más allá de la hidropónica, cada una pide un rango de imperio (sim/empire.ts)
  {
    id: 'hydro_complex',
    name: k('Complejo Hidropónico'),
    tier: 5,
    costFlora: 5000,
    capacityPlants: 18,
    environmentBonus: 2.0,
    description: k('Dos salas hidropónicas unidas por un pasillo limpio, con su propio laboratorio de control. Dieciocho plantas.'),
    unlocked: false,
    art: 'lab_pharma_hydro',
    resourceUse: 0.6,
    minEmpireRank: 5
  },
  {
    id: 'grow_campus',
    name: k('Campus de Cultivo'),
    tier: 6,
    costFlora: 12000,
    capacityPlants: 24,
    environmentBonus: 2.1,
    description: k('Un campus entero: invernaderos, salas de clonación y un centro de datos que ajusta cada sala. Veinticuatro plantas.'),
    unlocked: false,
    art: 'lab_pharma_hydro',
    resourceUse: 0.6,
    minEmpireRank: 7
  },
  {
    id: 'empire_seat',
    name: k('Sede del Imperio'),
    tier: 7,
    costFlora: 25000,
    capacityPlants: 30,
    environmentBonus: 2.2,
    description: k('El corazón del imperio: tres filas de diez plantas bajo el mejor clima que se puede construir.'),
    unlocked: false,
    art: 'lab_pharma_hydro',
    resourceUse: 0.6,
    minEmpireRank: 9
  }
];

export const INITIAL_MACHINES: MachineEquipment[] = [
  {
    id: 'rosin_press_10t',
    name: k('Prensa Térmica Hidráulica 10 Toneladas'),
    category: 'press',
    wearPercentage: 88,
    wearRatePerCycle: 6,
    repairCostFlora: 65,
    efficiencyBonus: 1.25,
    description: k('Prensado de resina sin solventes a temperatura controlada (82°C) con placas de aluminio anodizado.'),
    status: 'operativo'
  },
  {
    id: 'rotovap_extractor',
    name: k('Destilador Rotativo de Terpenos (Rotavapor)'),
    category: 'extractor',
    wearPercentage: 92,
    wearRatePerCycle: 8,
    repairCostFlora: 90,
    efficiencyBonus: 1.45,
    description: k('Aislamiento fraccionado de terpenos puros al vacío para conservar el perfil aromático volátil original.'),
    status: 'operativo'
  },
  {
    id: 'freeze_dryer_subzero',
    name: k('Liofilizador Criogénico SubZero'),
    category: 'dryer',
    wearPercentage: 75,
    wearRatePerCycle: 5,
    repairCostFlora: 80,
    efficiencyBonus: 1.30,
    description: k('Secado en frío que preserva el 99% de los tricomas y evita la oxidación de cannabinoides.'),
    status: 'operativo'
  },
  {
    id: 'bubble_washer',
    name: k('Lavadora Bubble Hash de Agua-Hielo (3 mallas)'),
    category: 'washer',
    wearPercentage: 94,
    wearRatePerCycle: 5,
    repairCostFlora: 60,
    efficiencyBonus: 1.2,
    description: k('Agitador con bolsas de 190/120/73 micras que separa las cabezas de tricoma con agua helada, sin solventes.'),
    status: 'operativo'
  },
  {
    id: 'terp_reactor',
    name: k('Reactor de Sopa de Terpenos (Live Resin & THCa)'),
    category: 'reactor',
    wearPercentage: 90,
    wearRatePerCycle: 7,
    repairCostFlora: 85,
    efficiencyBonus: 1.35,
    description: k('Reactor con agitador magnético y placa térmica que cristaliza diamantes de THCa dentro de una salsa rica en terpenos.'),
    status: 'operativo'
  },
  {
    id: 'kief_sifter',
    name: k('Tamizadora Vibratoria de Kief (150 µm)'),
    category: 'sifter',
    wearPercentage: 97,
    wearRatePerCycle: 3,
    repairCostFlora: 35,
    efficiencyBonus: 1.1,
    description: k('Malla de acero inoxidable con motor excéntrico que desprende el polvo de tricomas seco sin dañarlo.'),
    status: 'operativo'
  },
  {
    id: 'rolling_machine',
    name: k('Enrolladora Industrial de Conos y Puros'),
    category: 'roller',
    wearPercentage: 91,
    wearRatePerCycle: 4,
    repairCostFlora: 45,
    efficiencyBonus: 1.15,
    description: k('Rodillos de precisión que llenan y enrollan pre-rolls cónicos y puros de flor con papel de cáñamo.'),
    status: 'operativo'
  },
  {
    id: 'hplc_analyzer',
    name: k('Cromatógrafo Líquido HPLC-UV (Análisis de Cannabinoides)'),
    category: 'analyzer',
    wearPercentage: 98,
    wearRatePerCycle: 2,
    repairCostFlora: 120,
    efficiencyBonus: 1.0,
    description: k('Separa e identifica THC, CBD, CBN, CBG y terpenos; emite el certificado de análisis (COA) del lote.'),
    status: 'operativo'
  },
  {
    id: 'quantum_led_system',
    name: k('Matriz Quantum Board UV & Far-Red'),
    category: 'lighting',
    wearPercentage: 96,
    wearRatePerCycle: 4,
    repairCostFlora: 50,
    efficiencyBonus: 1.20,
    description: k('Emisión de espectro biológico enriquecido para maximizar la síntesis de resina y tricomas en pre-cosecha.'),
    status: 'operativo'
  }
];

export const INITIAL_V2P_ITEMS: V2pRedemptionItem[] = [
  {
    id: 'v2p_terp_bottle',
    title: k('Frasco 15ml Terpenos Botánicos Puros (Yield Terps)'),
    category: 'Botanical Terpenes',
    requiredFlora: 850,
    stockPhysical: 142,
    art: 'v2p_terp_bottle',
    description: k('Perfil de terpenos idéntico al cultivado en juego, 100% orgánico certificado, grado alimentario y cosmético.'),
    nftCertificateId: 'CERT-SOL-TRP-001'
  },
  {
    id: 'v2p_cbd_drops',
    title: k('Aceite Sublingual Full Spectrum Hemp 1500mg'),
    category: 'Premium Hemp CBD',
    requiredFlora: 1400,
    stockPhysical: 89,
    art: 'v2p_cbd_drops',
    description: k('Extraído de cáñamo premium con cromatografía verificada por laboratorio externo y trazabilidad de lote.'),
    nftCertificateId: 'CERT-SOL-CBD-882'
  },
  {
    id: 'v2p_grow_hoodie',
    title: k('Sudadera Orgánica de Cáñamo "Master Cultivator"'),
    category: 'Yield Merch',
    requiredFlora: 600,
    stockPhysical: 55,
    art: 'v2p_grow_hoodie',
    description: k('Tejido 55% fibra de cáñamo natural y 45% algodón orgánico con etiqueta NFC de autenticidad.'),
    nftCertificateId: 'CERT-SOL-MRCH-109'
  }
];

export const INITIAL_QUESTS = [
  {
    id: 'quest_water_micro',
    title: k('Calibración de Sustrato'),
    description: k('Riega la planta activa para mantener la humedad sobre el 75%.'),
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
    title: k('Alquimista de la Zona Dorada'),
    description: k('Prensa un lote de Live Rosin en la Zona Dorada (85 - 125 PSI) en el Laboratorio.'),
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
    title: k('Cosecha F2P & Biomasa'),
    description: k('Completa un ciclo de crecimiento y cosecha flores secas para el laboratorio.'),
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
    title: k('Mantenimiento Deflacionario'),
    description: k('Repara una máquina desgastada quemando $FLORA de forma permanente.'),
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
    title: k('Pionero Genético'),
    description: k('Realiza un cruzamiento botánico o registra una patente genómica.'),
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
    name: k('Cámara de Germinación & Propagación'),
    subtitle: k('Enraizamiento & Plántulas (0-14 días)'),
    recommendedLightSchedule: '18/6',
    targetTempC: 24,
    targetRhPercent: 80,
    targetPpfd: 200,
    targetCo2Ppm: 500,
    description: k('Ambiente hiper-húmedo con cúpula de propagación y calor basal (24°C). Estimula el rápido despliegue de cotiledones y raíces primarias.'),
    accentColor: '#34d399',
    iconType: 'sprout'
  },
  {
    id: 'vegetative',
    name: k('Cuarto de Crecimiento Vegetativo'),
    subtitle: k('Desarrollo Foliar & Ramificación (18/6)'),
    recommendedLightSchedule: '18/6',
    targetTempC: 26,
    targetRhPercent: 65,
    targetPpfd: 600,
    targetCo2Ppm: 800,
    description: k('Espectro azul frío (5000K) y alta transpiración. Fomenta tallos gruesos, entrenudos cortos y asimilación masiva de nitrógeno.'),
    accentColor: '#10b981',
    iconType: 'sun'
  },
  {
    id: 'flowering',
    name: k('Sala de Floración & Engorde de Tricomas'),
    subtitle: k('Fotoperiodo 12/12 & Maduración de Resina'),
    recommendedLightSchedule: '12/12',
    targetTempC: 23,
    targetRhPercent: 45,
    targetPpfd: 1000,
    targetCo2Ppm: 1200,
    description: k('Luz roja profunda (660nm) y Far Red (730nm) enriquecida con 1200 PPM de CO2. Máxima biosíntesis de cannabinoides y engorde de cálices.'),
    accentColor: '#f59e0b',
    iconType: 'flower'
  },
  {
    id: 'mothers_fathers',
    name: k('Santuario de Madres & Padres Donantes'),
    subtitle: k('Genotecas Élite & Hibridación Botánica'),
    recommendedLightSchedule: '18/6',
    targetTempC: 25,
    targetRhPercent: 60,
    targetPpfd: 450,
    targetCo2Ppm: 700,
    description: k('Espacio dedicado a conservar fenotipos campeones para la extracción de esquejes/clones y recolección de polen de machos seleccionados.'),
    accentColor: '#ec4899',
    iconType: 'dna'
  }
];

export const INITIAL_SEED_BANK: SeedBankItem[] = [
  {
    id: 'seed_chrono_og',
    name: k('Yield Foundation OG (Fem)'),
    breeder: 'Yield Bud Empire Genetics',
    seedType: 'Feminizada',
    lineage: 'Solana Landrace x Northern Lights #5',
    thcPercentage: 21.0,
    cbdPercentage: 1.2,
    floweringWeeks: 8,
    yieldGramsPerPlant: 140,
    difficulty: 'Fácil',
    dominantTerpenes: [k('Mirceno'), k('Limoneno'), k('Cariofileno')],
    priceFlora: 50,
    priceSol: 0.05,
    description: k('Genética pilar ideal para arrancar en cualquier carpa o sala. Gran resistencia a novatadas en pH y riegos.'),
    seedsPerPack: 3,
    imageTheme: 'emerald',
    inStock: true,
    strainTemplate: INITIAL_STRAINS[0]
  },
  {
    id: 'seed_super_silver_haze',
    name: k('Solana Super Silver Haze (Fem)'),
    breeder: 'Yield Vault Genetics',
    seedType: 'Feminizada',
    lineage: 'Skunk #1 x Northern Lights x Haze',
    thcPercentage: 24.5,
    cbdPercentage: 0.3,
    floweringWeeks: 10,
    yieldGramsPerPlant: 180,
    difficulty: 'Intermedio',
    dominantTerpenes: [k('Terpinoleno'), k('Limoneno'), k('Pineno')],
    priceFlora: 85,
    priceSol: 0.09,
    description: k('Sativa galardonada de efecto cerebral eléctrico. Necesita buen control de altura y fotoperiodo estricto 12/12.'),
    seedsPerPack: 3,
    imageTheme: 'cyan',
    inStock: true,
    strainTemplate: INITIAL_STRAINS[1]
  },
  {
    id: 'seed_neon_kush_rosin',
    name: k('Neon Kush Live Rosin Cut (Fem)'),
    breeder: 'Neon Genetix Lab x Yield',
    seedType: 'Feminizada',
    lineage: 'Hindu Kush x Neon Gas #8',
    thcPercentage: 28.2,
    cbdPercentage: 0.6,
    floweringWeeks: 8.5,
    yieldGramsPerPlant: 160,
    difficulty: 'Avanzado',
    dominantTerpenes: [k('Mirceno'), k('Cariofileno'), k('Linalol')],
    priceFlora: 140,
    priceSol: 0.15,
    description: k('Especialmente seleccionada por su densidad de tricomas glandulares de 90-120 micras. Retorno de rosin superior al 22%.'),
    seedsPerPack: 3,
    imageTheme: 'purple',
    inStock: true,
    strainTemplate: INITIAL_STRAINS[2]
  },
  {
    id: 'seed_gelato_auto',
    name: k('Royal Gelato Auto (Fast Flowering)'),
    breeder: 'RapidBud Botánica',
    seedType: 'Autofloreciente',
    lineage: 'Gelato 33 x Yield Ruderalis F4',
    thcPercentage: 23.0,
    cbdPercentage: 1.0,
    floweringWeeks: 9,
    yieldGramsPerPlant: 110,
    difficulty: 'Fácil',
    dominantTerpenes: [k('Cariofileno'), k('Limoneno'), k('Humuleno')],
    priceFlora: 70,
    priceSol: 0.07,
    description: k('No depende de cambio de fotoperiodo. Lista de semilla a cosecha en 9 semanas exactas con sabor a postre dulce.'),
    seedsPerPack: 3,
    imageTheme: 'amber',
    inStock: true,
    strainTemplate: {
      id: 'gelato_auto_strain',
      name: k('Royal Gelato Auto'),
      lineage: 'Gelato 33 x Ruderalis',
      type: 'Autofloreciente',
      thcPercentage: 23.0,
      cbdPercentage: 1.0,
      terpenes: { myrcene: 0.6, limonene: 1.1, caryophyllene: 0.9, pinene: 0.2, linalool: 0.4 },
      difficulty: 'F2P Fácil',
      cycleDurationSeconds: 40,
      resinYieldMultiplier: 1.3,
      colorTheme: '#f59e0b',
      description: k('Autofloreciente rápida con sabor dulce a pastelería californiana y alta concentración de resina.')
    }
  },
  {
    id: 'seed_colombian_gold_landrace',
    name: k('Santa Marta Colombian Gold (Regular)'),
    breeder: 'Semillas del Mundo Landrace',
    seedType: 'Landrace',
    lineage: 'Sierra Nevada de Santa Marta (Pura Landrace)',
    thcPercentage: 18.5,
    cbdPercentage: 2.2,
    floweringWeeks: 12,
    yieldGramsPerPlant: 220,
    difficulty: 'Maestro',
    dominantTerpenes: [k('Limoneno'), k('Sabineno'), k('Ocimeno')],
    priceFlora: 180,
    priceSol: 0.20,
    description: k('Genética pura no adulterada. Semillas regulares con proporción 50/50 machos y hembras, indispensables para breeding y padres de élite.'),
    seedsPerPack: 5,
    imageTheme: 'yellow',
    inStock: true,
    strainTemplate: {
      id: 'colombian_gold_strain',
      origin: 'south_america',
      name: k('Santa Marta Colombian Gold'),
      lineage: 'Sierra Nevada Landrace',
      type: 'Sativa',
      thcPercentage: 18.5,
      cbdPercentage: 2.2,
      terpenes: { myrcene: 0.4, limonene: 1.3, caryophyllene: 0.3, pinene: 0.8, linalool: 0.2 },
      difficulty: 'Maestro',
      cycleDurationSeconds: 85,
      resinYieldMultiplier: 1.2,
      colorTheme: '#eab308',
      description: k('Legendaria landrace pura colombiana. Aroma a incienso cítrico y vigor híbrido extraordinario para cruzamientos.')
    }
  },
  {
    id: 'seed_runtz_terp_bomb',
    name: k('Rainbow Candy Terp Bomb S1 (Fem)'),
    breeder: 'Barnyard Farm x Yield',
    seedType: 'Feminizada',
    lineage: 'Zkittlez x Gelato #33',
    thcPercentage: 29.0,
    cbdPercentage: 0.2,
    floweringWeeks: 8.5,
    yieldGramsPerPlant: 155,
    difficulty: 'Avanzado',
    dominantTerpenes: [k('Linalol'), k('Limoneno'), k('Mirceno')],
    priceFlora: 160,
    priceSol: 0.18,
    description: k('Perfil terpénico a caramelo de frutas tropicales. Cálices recubiertos de resina blanca escarchada de máxima potencia.'),
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
  landraceSeed({ id: 'hindu_kush', name: k('Hindu Kush Afgano'), short: k('Hindu Kush'), origin: 'afghanistan', lineage: 'Cordillera del Hindu Kush (Landrace pura)', type: 'Indica', thc: 17, cbd: 0.8, weeks: 9, yieldG: 150,
    terp: [k('Mirceno'), k('Pineno'), k('Cariofileno')], terpenes: { myrcene: 1.1, limonene: 0.2, caryophyllene: 0.7, pinene: 0.5, linalool: 0.3 }, price: 120, cycle: 70, resin: 1.4, color: '#d97706',
    desc: k('La madre de las indicas: resina densa y gruesa, nacida entre valles secos y noches frías. Ama el sol y el aire seco de Afganistán.'), strainDesc: k('Indica de montaña, resinosa y resistente al frío. Rinde mucho en tierras áridas.') }),
  landraceSeed({ id: 'acapulco_gold', name: k('Acapulco Gold'), short: k('Acapulco Gold'), origin: 'mexico', lineage: 'Sierra de Guerrero (Landrace pura)', type: 'Sativa', thc: 19, cbd: 0.3, weeks: 11, yieldG: 170,
    terp: [k('Limoneno'), k('Pineno'), k('Terpinoleno')], terpenes: { myrcene: 0.3, limonene: 1.2, caryophyllene: 0.3, pinene: 0.7, linalool: 0.2 }, price: 130, cycle: 85, resin: 1.1, color: '#f97316',
    desc: k('La sativa dorada de México: efecto luminoso y aroma cítrico-dulce. Pide sol fuerte y riego atento en la sierra seca.'), strainDesc: k('Sativa dorada de clima cálido y seco.') }),
  landraceSeed({ id: 'lambs_bread', name: k('Lamb\'s Bread Jamaicana'), short: k('Lamb\'s Bread'), origin: 'jamaica', lineage: 'Colinas de Jamaica (Landrace pura)', type: 'Sativa', thc: 20, cbd: 0.2, weeks: 11, yieldG: 180,
    terp: [k('Mirceno'), k('Ocimeno'), k('Cariofileno')], terpenes: { myrcene: 0.9, limonene: 0.5, caryophyllene: 0.6, pinene: 0.3, linalool: 0.4 }, price: 150, cycle: 88, resin: 1.15, color: '#22c55e',
    desc: k('Sativa isleña de calor húmedo y suelos ricos. Vigorosa, aromática y agradecida con las lluvias… si vigilas el moho.'), strainDesc: k('Sativa tropical, vigorosa y aromática.') }),
  landraceSeed({ id: 'panama_red', name: k('Panama Red'), short: k('Panama Red'), origin: 'central_america', lineage: 'Selvas de Panamá (Landrace pura)', type: 'Sativa', thc: 18, cbd: 0.3, weeks: 12, yieldG: 190,
    terp: [k('Pineno'), k('Limoneno'), k('Mirceno')], terpenes: { myrcene: 0.6, limonene: 0.8, caryophyllene: 0.4, pinene: 0.9, linalool: 0.2 }, price: 140, cycle: 90, resin: 1.1, color: '#ef4444',
    desc: k('Sativa de selva con pistilos rojizos. Aguanta lluvias y sombra como ninguna y es la reina del trópico húmedo.'), strainDesc: k('Sativa de selva, tolera lluvias y poca luz.') }),
  landraceSeed({ id: 'durban_poison', name: k('Durban Poison Sudafricana'), short: k('Durban Poison'), origin: 'africa', lineage: 'Puerto de Durban (Landrace pura)', type: 'Sativa', thc: 20, cbd: 0.1, weeks: 10, yieldG: 170,
    terp: [k('Terpinoleno'), k('Ocimeno'), k('Mirceno')], terpenes: { myrcene: 0.5, limonene: 0.6, caryophyllene: 0.3, pinene: 0.4, linalool: 0.2 }, price: 140, cycle: 78, resin: 1.2, color: '#a3e635',
    desc: k('Sativa enérgica de la sabana africana: crece rápido bajo el sol implacable y es de las landrace más productivas.'), strainDesc: k('Sativa de sabana, rápida y enérgica.') }),
  landraceSeed({ id: 'thai_stick', name: k('Thai Stick'), short: k('Thai Stick'), origin: 'asia', lineage: 'Llanuras de Tailandia (Landrace pura)', type: 'Sativa', thc: 19, cbd: 0.2, weeks: 13, yieldG: 200,
    terp: [k('Ocimeno'), k('Terpinoleno'), k('Limoneno')], terpenes: { myrcene: 0.3, limonene: 0.9, caryophyllene: 0.3, pinene: 0.4, linalool: 0.3 }, price: 150, cycle: 90, resin: 1.1, color: '#38bdf8',
    desc: k('Sativa alta y esbelta del monzón. Agradece el calor y la humedad del sudeste asiático; lenta pero generosa.'), strainDesc: k('Sativa alta de monzón, lenta y generosa.') }),
];

INITIAL_SEED_BANK.push(...LANDRACE_SEEDS);

export const INITIAL_GROW_SUPPLIES: GrowSupplyItem[] = [
  // CO2
  {
    id: 'supply_co2_tank_system',
    name: k('Sistema de CO2 Presurizado con Solenoide & Sensor NDIR'),
    category: 'co2',
    categoryLabel: k('Sistemas de CO2'),
    brand: 'YieldGas Controls',
    priceFlora: 280,
    priceSol: 0.35,
    spec: k('Botella 10kg + Regulador Dual + Sensor Infrarrojo NDIR (0-2500 PPM)'),
    description: k('Inyecta dióxido de carbono de forma controlada para alcanzar 1200-1500 PPM en floración, acelerando el metabolismo y fotosíntesis en un +35%.'),
    installed: false,
    features: [k('Inyección automática a 1200 PPM'), k('+35% Fotosíntesis y Resistencia Térmica hasta 30°C'), k('Sensor NDIR calibrado')]
  },
  {
    id: 'supply_co2_mycelium_bag',
    name: k('Bolsas Orgánicas de CO2 Micelio Activo (Pack x2)'),
    category: 'co2',
    categoryLabel: k('Sistemas de CO2'),
    brand: 'MycoBreath',
    priceFlora: 60,
    priceSol: 0.08,
    spec: k('Emisión pasiva constante de 700-900 PPM durante 6 meses'),
    description: k('Generación natural y silenciosa de CO2 por respiración de micelio fúngico no patógeno. Ideal para carpas medianas.'),
    installed: false,
    features: [k('Económico F2P'), k('Sin electricidad'), k('+15% crecimiento vegetativo')]
  },

  // RIEGO
  {
    id: 'supply_autopot_drip',
    name: k('Sistema de Riego Automático por Goteo Gravitacional'),
    category: 'irrigation',
    categoryLabel: k('Automatización de Riego'),
    brand: 'GravityPot SmartValve',
    priceFlora: 220,
    priceSol: 0.28,
    spec: k('Tanque 47L + Válvula AquaValve de demanda radicular'),
    description: k('Riega automáticamente cuando el sustrato lo necesita sin bombas eléctricas ni temporizadores complejos. Evita encharcamientos.'),
    installed: false,
    features: [k('Riego automático continuo'), k('Humedad de sustrato estabilizada en 70-80%'), k('Cero desperdicio de solución')]
  },
  {
    id: 'supply_fertigation_peripod',
    name: k('Bomba Dosificadora Automática de Nutrientes A+B'),
    category: 'irrigation',
    categoryLabel: k('Automatización de Riego'),
    brand: 'AquaLab DosePro Controller',
    priceFlora: 390,
    priceSol: 0.45,
    spec: k('Controlador PID con 3 bombas peristálticas para pH Up/Down y Nutrientes A+B'),
    description: k('Inyecta automáticamente mililitros precisos para mantener el agua en la EC y pH exactos requeridos según la etapa.'),
    installed: false,
    features: [k('Dosificación automática de fertirriego'), k('Ajuste dinámico de EC y pH'), k('Evita bloqueos de sales')]
  },

  // MEDIDORES
  {
    id: 'supply_bluelab_ph_meter',
    name: k('Medidor Digital de pH de Grado Laboratorio con ATC'),
    category: 'meters',
    categoryLabel: k('Instrumental Científico'),
    brand: 'AquaLab pH Pen Pro',
    priceFlora: 120,
    priceSol: 0.14,
    spec: k('Precisión ±0.05 pH, Calibración en 2 puntos (4.01 / 7.01), Compensación Térmica ATC'),
    description: k('Mide con precisión atómica la acidez del sustrato y solución nutritiva para garantizar absorción plena de Fósforo y Calcio.'),
    installed: true,
    features: [k('Lectura en tiempo real'), k('Alerta de rango óptimo (5.8 - 6.5)'), k('Sonda sumergible de vidrio')]
  },
  {
    id: 'supply_apera_ec_meter',
    name: k('Conductímetro Digital EC / PPM (Electroconductividad)'),
    category: 'meters',
    categoryLabel: k('Instrumental Científico'),
    brand: 'Conducta EC60 Pocket Tester',
    priceFlora: 135,
    priceSol: 0.16,
    spec: k('Sensor de platino negro, escala mS/cm y conversión PPM 500 / 700'),
    description: k('Determina la concentración total de sales y nutrientes disponibles. Previene tanto la desnutrición como la sobrefertilización.'),
    installed: true,
    features: [k('Medición exacta en mS/cm'), k('Detector de salinidad en tiempo real'), k('Compensación automática de temperatura')]
  },
  {
    id: 'supply_apogee_par_meter',
    name: k('Sensor Cuántico PAR / PPFD & Medidor de Lúmenes Full-Spectrum'),
    category: 'meters',
    categoryLabel: k('Instrumental Científico'),
    brand: 'Quanta Instruments PAR-500',
    priceFlora: 310,
    priceSol: 0.38,
    spec: k('Respuesta espectral 400-700nm + ePAR 700-750nm (μmol/m²s y lux lúmenes)'),
    description: k('El estándar de oro científico para medir los fotones fotosintéticos exactos que inciden en el dosel de la planta.'),
    installed: false,
    features: [k('Mapeo exacto de PPFD y Lux'), k('Evita clorosis apical y quemaduras por luz'), k('Cálculo de DLI (Daily Light Integral)')]
  },

  // CLIMA
  {
    id: 'supply_ac_infinity_controller',
    name: k('Controlador Climático Integrado Inteligente con Sensor VPD'),
    category: 'climate',
    categoryLabel: k('Controladores Climáticos'),
    brand: 'ClimaCore Controller 69 PRO',
    priceFlora: 240,
    priceSol: 0.30,
    spec: k('Sensor suizo Sensirion de Temp, Humedad y VPD con 4 salidas PWM programables'),
    description: k('Ajusta automáticamente ventiladores, extractores y humidificadores según el déficit de presión de vapor deseado para cada fase.'),
    installed: false,
    features: [k('Regulación climática autónoma'), k('Monitoreo dinámico de VPD (0.8 - 1.4 kPa)'), k('Presión negativa constante')]
  },
  {
    id: 'supply_commercial_dehumidifier',
    name: k('Deshumidificador Criogénico Comercial 50L/día'),
    category: 'climate',
    categoryLabel: k('Controladores Climáticos'),
    brand: 'DryMax Dual Tech',
    priceFlora: 340,
    priceSol: 0.42,
    spec: k('Compresor rotativo eficiente, drenaje continuo y rango 35-80% RH'),
    description: k('Mantiene la humedad estricta por debajo del 45% en semanas finales de floración, garantizando cogollos densos libres de botrytis.'),
    installed: false,
    features: [k('Protección anti-botrytis y oídio'), k('Extracción de 50L de humedad diaria'), k('Ahorro energético')]
  },

  // NUTRIENTES
  {
    id: 'supply_pack_advanced_nutrients',
    name: k('Línea Completa NutriPro pH Master (Micro-Grow-Bloom + Bloom Max)'),
    category: 'nutrients',
    categoryLabel: k('Nutrición Botánica'),
    brand: 'NutriPro Labs',
    priceFlora: 175,
    priceSol: 0.22,
    spec: k('Fórmula quelada con tecnología auto-amortiguadora de pH (pH Master)'),
    description: k('Mantiene automáticamente el pH entre 5.8 y 6.3 sin necesidad de ácidos correctores. Incluye estimulador de floración Bloom Max.'),
    installed: false,
    features: [k('Tecnología pH Master'), k('+25% tamaño de cálices con Bloom Max'), k('Quelatos de aminoácidos')]
  },
  {
    id: 'supply_pack_athena_pro',
    name: k('Línea de Fertilizantes Sales Grado Comercial Atlas Pro Line'),
    category: 'nutrients',
    categoryLabel: k('Nutrición Botánica'),
    brand: 'Atlas Ag Pro Line',
    priceFlora: 260,
    priceSol: 0.32,
    spec: k('Atlas Core, Grow y Bloom solubles en polvo para máxima pureza sin sedimentos'),
    description: k('El estándar de las macro-instalaciones de California. Cero residuos, biodisponibilidad del 100% y tricomas superlimpios para rosin.'),
    installed: false,
    features: [k('Ideal para extracción Live Rosin'), k('Cero sedimentos en goteros'), k('Pureza de laboratorio farmacéutico')]
  }
];

export const NUTRIENT_BRANDS_DATABASE: NutrientBrand[] = [
  {
    id: 'advanced_nutrients',
    name: k('NutriPro Labs'),
    line: k('pH Master & Grand Line'),
    category: 'Mineral Quelada',
    colorTheme: '#06b6d4',
    description: k('Fórmula basada en quelatos sintéticos y orgánicos con tecnología pH Master que estabiliza la solución en 5.8-6.2 de forma automática.'),
    baseProducts: [k('pH Master Grow'), k('pH Master Micro'), k('pH Master Bloom'), k('B-Complex Boost'), k('Bloom Max'), k('Final Push'), k('Clean Finish')],
    stages: [
      {
        stageName: k('Germinación & Plántulas'),
        phaseCode: k('Semana 1'),
        targetPh: '5.8 - 6.0',
        targetEc: k('0.6 - 0.8 mS/cm'),
        targetPpm500: k('300 - 400 PPM'),
        recommendedNpk: '1-1-1 suave',
        dosageMlPerLiter: [
          { productName: k('pH Master Micro'), mlPerL: 0.5 },
          { productName: k('pH Master Grow'), mlPerL: 0.5 },
          { productName: k('pH Master Bloom'), mlPerL: 0.5 },
          { productName: k('B-Complex Boost'), mlPerL: 1.0 }
        ],
        instructions: k('Solución muy suave para no quemar las raíces tiernas. Humedecer jiffys o lana de roca.')
      },
      {
        stageName: k('Vegetativo Temprano'),
        phaseCode: k('Semanas 2-3'),
        targetPh: '5.8 - 6.2',
        targetEc: k('1.2 - 1.5 mS/cm'),
        targetPpm500: k('600 - 750 PPM'),
        recommendedNpk: '3-1-2',
        dosageMlPerLiter: [
          { productName: k('pH Master Grow'), mlPerL: 2.0 },
          { productName: k('pH Master Micro'), mlPerL: 2.0 },
          { productName: k('pH Master Bloom'), mlPerL: 1.0 },
          { productName: k('B-Complex Boost'), mlPerL: 2.0 }
        ],
        instructions: k('Promueve follaje verde oscuro, ramas fuertes y expansión del sistema radicular.')
      },
      {
        stageName: k('Vegetativo Tardío (Pre-Flo)'),
        phaseCode: k('Semanas 4-5'),
        targetPh: '6.0 - 6.3',
        targetEc: k('1.6 - 1.9 mS/cm'),
        targetPpm500: k('800 - 950 PPM'),
        recommendedNpk: '3-1-3',
        dosageMlPerLiter: [
          { productName: k('pH Master Grow'), mlPerL: 4.0 },
          { productName: k('pH Master Micro'), mlPerL: 4.0 },
          { productName: k('pH Master Bloom'), mlPerL: 2.0 },
          { productName: k('B-Complex Boost'), mlPerL: 2.0 }
        ],
        instructions: k('Máximo vigor previo al cambio de fotoperiodo a 12/12. Preparación estructural.')
      },
      {
        stageName: k('Pre-Floración & Transición'),
        phaseCode: k('Semanas 6-7 (12/12)'),
        targetPh: '6.0 - 6.4',
        targetEc: k('1.8 - 2.1 mS/cm'),
        targetPpm500: k('900 - 1050 PPM'),
        recommendedNpk: '1-3-2',
        dosageMlPerLiter: [
          { productName: k('pH Master Micro'), mlPerL: 3.0 },
          { productName: k('pH Master Grow'), mlPerL: 2.0 },
          { productName: k('pH Master Bloom'), mlPerL: 4.0 },
          { productName: k('Bloom Starter'), mlPerL: 2.0 }
        ],
        instructions: k('Multiplica los puntos de floración (nudos) durante el estirón inicial (stretch).')
      },
      {
        stageName: k('Floración Plena & Engorde'),
        phaseCode: k('Semanas 8-9 (Peak Bloom)'),
        targetPh: '6.2 - 6.5',
        targetEc: k('2.0 - 2.4 mS/cm'),
        targetPpm500: k('1000 - 1200 PPM'),
        recommendedNpk: k('0-5-4 (Alto PK)'),
        dosageMlPerLiter: [
          { productName: k('pH Master Micro'), mlPerL: 4.0 },
          { productName: k('pH Master Bloom'), mlPerL: 4.0 },
          { productName: k('Bloom Max (PK Booster)'), mlPerL: 2.0 },
          { productName: k('Final Push (End Bloom)'), mlPerL: 1.5 }
        ],
        instructions: k('Aporte masivo de Fósforo y Potasio quelado. Los cálices engordan y se llenan de glándulas resinosas.')
      },
      {
        stageName: k('Lavado de Raíces (Flushing)'),
        phaseCode: k('Últimos 7-10 días'),
        targetPh: '6.2 - 6.5',
        targetEc: k('0.2 - 0.4 mS/cm'),
        targetPpm500: k('100 - 200 PPM'),
        recommendedNpk: k('0-0-0 (Agua Pura)'),
        dosageMlPerLiter: [
          { productName: k('Clean Finish Quelante'), mlPerL: 2.0 }
        ],
        instructions: k('Elimina residuos minerales retenidos en el tejido celular para asegurar ceniza blanca limpia y humo aromático.')
      }
    ]
  },
  {
    id: 'biobizz_organic',
    name: k('TerraViva Orgánica'),
    line: k('100% Certified Organic & Micro-Life'),
    category: 'Orgánica 100%',
    colorTheme: '#10b981',
    description: k('Filosofía holística holandesa con extractos de remolacha azucarera, vinaza y algas marinas que alimentan la microbiología viva del suelo.'),
    baseProducts: [k('Terra-Grow'), k('Terra-Bloom'), k('Terra-Max'), k('Raíz-Viva'), k('Alga-Vital'), k('Terra-Vita')],
    stages: [
      {
        stageName: k('Germinación & Plántulas'),
        phaseCode: k('Semana 1'),
        targetPh: '6.2 - 6.5',
        targetEc: k('0.5 - 0.7 mS/cm'),
        targetPpm500: k('250 - 350 PPM'),
        recommendedNpk: k('Orgánico Suave'),
        dosageMlPerLiter: [
          { productName: k('Raíz-Viva (Estimulador)'), mlPerL: 2.0 },
          { productName: k('Terra-Vita'), mlPerL: 1.0 }
        ],
        instructions: k('Estimula el desarrollo de raíces y micorrizas sin alterar el pH orgánico del sustrato.')
      },
      {
        stageName: k('Vegetativo Temprano'),
        phaseCode: k('Semanas 2-3'),
        targetPh: '6.2 - 6.6',
        targetEc: k('1.0 - 1.3 mS/cm'),
        targetPpm500: k('500 - 650 PPM'),
        recommendedNpk: k('Bio-Nitrógeno'),
        dosageMlPerLiter: [
          { productName: k('Terra-Grow'), mlPerL: 1.5 },
          { productName: k('Terra-Vita'), mlPerL: 2.0 },
          { productName: k('Alga-Vital'), mlPerL: 1.0 }
        ],
        instructions: k('Proporciona nitrógeno de asimilación lenta derivado de melazas y microelementos marinos.')
      },
      {
        stageName: k('Vegetativo Tardío'),
        phaseCode: k('Semanas 4-5'),
        targetPh: '6.3 - 6.7',
        targetEc: k('1.3 - 1.6 mS/cm'),
        targetPpm500: k('650 - 800 PPM'),
        recommendedNpk: k('Crecimiento Robusto'),
        dosageMlPerLiter: [
          { productName: k('Terra-Grow'), mlPerL: 2.5 },
          { productName: k('Terra-Vita'), mlPerL: 2.0 },
          { productName: k('Alga-Vital'), mlPerL: 1.5 }
        ],
        instructions: k('Incrementar riego para acondicionar el sustrato vivo antes del pase a floración.')
      },
      {
        stageName: k('Pre-Floración & Estirón'),
        phaseCode: k('Semanas 6-7'),
        targetPh: '6.3 - 6.8',
        targetEc: k('1.6 - 1.8 mS/cm'),
        targetPpm500: k('800 - 900 PPM'),
        recommendedNpk: k('Transición Floral'),
        dosageMlPerLiter: [
          { productName: k('Terra-Grow'), mlPerL: 2.0 },
          { productName: k('Terra-Bloom'), mlPerL: 2.0 },
          { productName: k('Terra-Max'), mlPerL: 1.0 }
        ],
        instructions: k('Terra-Max moviliza nutrientes y acelera el transporte de azúcares a las pre-flores.')
      },
      {
        stageName: k('Floración Plena'),
        phaseCode: k('Semanas 8-9'),
        targetPh: '6.4 - 6.8',
        targetEc: k('1.8 - 2.0 mS/cm'),
        targetPpm500: k('900 - 1000 PPM'),
        recommendedNpk: k('Fósforo y Potasio Natural'),
        dosageMlPerLiter: [
          { productName: k('Terra-Grow'), mlPerL: 1.5 },
          { productName: k('Terra-Bloom'), mlPerL: 3.5 },
          { productName: k('Terra-Max'), mlPerL: 3.0 },
          { productName: k('Terra-Vita'), mlPerL: 3.0 }
        ],
        instructions: k('Intensa producción de terpenos orgánicos y resina de color ámbar natural.')
      },
      {
        stageName: k('Lavado / Desfogue Orgánico'),
        phaseCode: k('Últimos 10-14 días'),
        targetPh: '6.5',
        targetEc: k('0.3 - 0.5 mS/cm'),
        targetPpm500: k('150 - 250 PPM'),
        recommendedNpk: k('Agua Filtrada'),
        dosageMlPerLiter: [
          { productName: k('Agua pura sin nutrientes'), mlPerL: 0 }
        ],
        instructions: k('En cultivo orgánico basta regar con agua no clorada. La planta metaboliza sus reservas de clorofila.')
      }
    ]
  },
  {
    id: 'athena_pro',
    name: k('Atlas Ag Pro Line'),
    line: k('Clean & Soluble Commercial Standard'),
    category: 'Sales Grado Comercial',
    colorTheme: '#8b5cf6',
    description: k('El sistema preferido por cultivadores comerciales de California y extractores de Rosin. Cero impurezas, sedimentos ni metales pesados.'),
    baseProducts: [k('Atlas Core'), k('Atlas Grow'), k('Atlas Bloom'), k('Atlas Cleanse'), k('Atlas CaMg')],
    stages: [
      {
        stageName: k('Germinación & Propagación'),
        phaseCode: k('Semana 1'),
        targetPh: '5.8 - 6.0',
        targetEc: k('0.8 - 1.0 mS/cm'),
        targetPpm500: k('400 - 500 PPM'),
        recommendedNpk: k('Bajo EC Ultra Limpio'),
        dosageMlPerLiter: [
          { productName: k('Atlas Core'), mlPerL: 1.0 },
          { productName: k('Atlas Grow'), mlPerL: 1.0 },
          { productName: k('Atlas Cleanse'), mlPerL: 0.5 }
        ],
        instructions: k('Atlas Cleanse mantiene la línea de riego estéril contra patógenos y biofilm.')
      },
      {
        stageName: k('Vegetativo Fuerte'),
        phaseCode: k('Semanas 2-4'),
        targetPh: '5.8 - 6.1',
        targetEc: k('2.0 - 2.5 mS/cm'),
        targetPpm500: k('1000 - 1250 PPM'),
        recommendedNpk: k('Core + Grow 3:5'),
        dosageMlPerLiter: [
          { productName: k('Atlas Core'), mlPerL: 3.0 },
          { productName: k('Atlas Grow'), mlPerL: 5.0 },
          { productName: k('Atlas Cleanse'), mlPerL: 0.5 }
        ],
        instructions: k('Atlas tolera altas ECs gracias a sales ultra refinadas sin generar puntas quemadas.')
      },
      {
        stageName: k('Floración Plena'),
        phaseCode: k('Semanas 5-9'),
        targetPh: '5.9 - 6.2',
        targetEc: k('2.5 - 3.0 mS/cm'),
        targetPpm500: k('1250 - 1500 PPM'),
        recommendedNpk: k('Core + Bloom 3:5'),
        dosageMlPerLiter: [
          { productName: k('Atlas Core'), mlPerL: 3.0 },
          { productName: k('Atlas Bloom'), mlPerL: 5.0 },
          { productName: k('Atlas Cleanse'), mlPerL: 1.0 }
        ],
        instructions: k('En combinación con 1200 PPM de CO2 genera glándulas de resina con tricomas gigantes.')
      },
      {
        stageName: k('Fade / Lavado Limpio'),
        phaseCode: k('Semana Final'),
        targetPh: '6.0',
        targetEc: k('0.2 - 0.4 mS/cm'),
        targetPpm500: k('100 - 200 PPM'),
        recommendedNpk: k('Cleanse Puro'),
        dosageMlPerLiter: [
          { productName: k('Atlas Cleanse'), mlPerL: 2.0 }
        ],
        instructions: k('Remueve precipitaciones minerales de raíz a copa.')
      }
    ]
  }
];

export const INITIAL_MOTHERS_FATHERS: MotherFatherPlant[] = [
  {
    id: 'mother_chrono_og_cut',
    role: 'Madre (Esquejes / Clones)',
    strain: INITIAL_STRAINS[0],
    name: k('Madre #1 Yield Foundation OG (Fenotipo Campeón)'),
    health: 98,
    clonesCutCount: 14,
    pollenCollectedMg: 0,
    savedAt: Date.now() - 86400000 * 30,
    traits: [k('Enraizamiento en 7 días'), k('Resistencia alta a oídio'), k('Entrenudos compactos')]
  },
  {
    id: 'father_santa_marta_male',
    role: 'Padre (Donante de Polen)',
    strain: INITIAL_STRAINS[1],
    name: k('Padre Seleccionado Colombian Gold Landrace Male'),
    health: 95,
    clonesCutCount: 0,
    pollenCollectedMg: 450,
    savedAt: Date.now() - 86400000 * 20,
    traits: [k('Polen hiper-fértil'), k('Transmisión dominante de Limoneno'), k('Vigor híbrido F1')]
  },
  {
    id: 'mother_neon_kush_elite',
    role: 'Madre (Esquejes / Clones)',
    strain: INITIAL_STRAINS[2],
    name: k('Madre Élite Neon Kush Rosin #4 Cut'),
    health: 100,
    clonesCutCount: 8,
    pollenCollectedMg: 0,
    savedAt: Date.now() - 86400000 * 12,
    traits: [k('Cabezas de tricoma 120u'), k('Gusto a combustible gaseoso'), k('Floración rápida 55 días')]
  }
];


