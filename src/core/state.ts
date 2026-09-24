/**
 * The whole game of one account, as the SERVER keeps it (server/game.mjs, table `game_state`). The browser only shows it and asks
 * for actions; it never sends state. What money is worth (the $FLORA wallet, the NFTs, the facility, the goods in the warehouse,
 * forge jobs) still lives in the economy tables (server/economy.mjs) and reaches this code through `Ext` (see ctx.ts).
 *
 * Pure: no React, no storage, no clock. `normalizeGame` turns anything (an old browser save, a broken row) into a valid state with
 * caps, so a tampered save can never bring more than an honest player could have.
 */
import type {
  GameQuest, GenomicPatent, GrowRoomId, MachineEquipment, MotherFatherPlant, PlantInGrow, ProcessedProduct, SeedBankItem, SolanaTransaction,
  Strain, UserProfile, V2pRedemptionItem, VirtualBrand, GrowSupplyItem,
} from '../types';
import {
  GROW_ROOMS_CONFIG, INITIAL_FACILITIES, INITIAL_MACHINES, INITIAL_MOTHERS_FATHERS, INITIAL_QUESTS, INITIAL_SEED_BANK, INITIAL_STRAINS,
  INITIAL_GROW_SUPPLIES, INITIAL_V2P_ITEMS, NUTRIENT_BRANDS_DATABASE,
} from '../data/initialData';
import { CATALOG_BY_ID, starterAssets, type OwnedAsset } from '../economy/catalog';
import { emptyMissions, normalizeMissions, type MissionState } from '../sim/missions';
import { emptyTutorial, normalizeTutorial, type TutorialState } from '../sim/tutorial';
import { stageOf } from '../sim/phases';
import { calculateVpd } from '../sim/engine';
import { MAX_RESIN_MULT } from '../sim/harvestCap';
import { BALANCE } from '../sim/balance';
import { BREEDING_LIMITS, CROSS_MINUTES, capGeneration, type Generation } from '../sim/breeding';
import { MAX_ROOM_PLANTS } from '../sim/facilities';
import { PLOT_SIZE } from '../sim/terroir';
import { t as tr } from '../i18n/core';

export interface BreedingJob { id: string; motherId: string; fatherId: string; name: string; generation: Generation; useReagent: boolean; seed: number; startedAt: number; endsAt: number }
export interface BreedingLogEntry { id: string; label: string; strainName: string; generation: Generation; mutated: boolean; seeds: number; createdAt: number }
export interface Redeemed { item: V2pRedemptionItem; timestamp: number; txSig: string; recipient: string }
export interface QuestProgress { id: string; currentCount: number; isCompleted: boolean; isClaimed: boolean }
export interface MachineWear { id: string; wearPercentage: number }

/** what the player shows of themselves (name, picture); kept by the server too */
export interface GameProfile {
  displayName: string; avatar: string; avatarImage?: string; avatarNft?: string; bio?: string; facilityName: string; role: UserProfile['role'];
}

export interface GameState {
  v: 1;
  /** the world clock: plants have lived up to this moment */
  lastSimAt: number;
  indoorPlants: PlantInGrow[];
  /** plants beyond the current facility's capacity wait here, frozen */
  dormantPlants: PlantInGrow[];
  /** plants growing on each land plot (the plot NFT itself is the economy's) */
  plotPlants: Record<string, PlantInGrow[]>;
  currentRoom: GrowRoomId;
  co2Ppm: number;
  autoWaterActive: boolean;
  autoClimateActive: boolean;
  care: { rating: number; lastCleanAt: number };
  /** NFT lots: equipment, consumables (water / nutrient / energy / treatments / gardener days) and lab licences */
  assets: OwnedAsset[];
  seedInventory: Record<string, number>;
  /** seeds and strains made by the player (the catalogue ones come from the game data) */
  customSeeds: SeedBankItem[];
  customStrains: Strain[];
  /** strain id → patent number */
  patentMarks: Record<string, string>;
  installedSupplies: string[];
  mothersFathers: MotherFatherPlant[];
  patents: GenomicPatent[];
  breedingJobs: BreedingJob[];
  breedingLog: BreedingLogEntry[];
  machines: MachineWear[];
  /** lab batches in the warehouse (their grams are also kept in the economy's inventory, which is what a sale checks) */
  products: ProcessedProduct[];
  brand: VirtualBrand;
  v2pStock: Record<string, number>;
  redeemed: Redeemed[];
  playerLevel: number;
  playerXp: number;
  quests: QuestProgress[];
  missions: MissionState;
  tutorial: TutorialState;
  /** tutorial steps already paid (restarting the guide never pays twice) */
  tutorialPaid: string[];
  /** one-off and cooldown XP / actions: key → time it was last granted */
  once: Record<string, number>;
  solBalance: number;
  totalFloraBurned: number;
  burnStats: { speedUp: number; repairs: number; patents: number; v2p: number };
  transactions: SolanaTransaction[];
  profile: GameProfile;
}

/* ───────────── caps ───────────── */
export const CAPS = {
  seedsPerKind: 60, seedKinds: 40, assets: 150, donors: 30, patents: 60, products: 80, strains: 60, transactions: 25, redeemed: 50,
  sol: 5, displayName: 24, bio: 200, facilityName: 40, avatarImage: 200_000, brandName: 40, tagline: 90, strainName: 40,
} as const;

export const XP_NEEDED = (level: number): number => (level === 1 ? 300 : level === 2 ? 750 : level === 3 ? 1600 : level === 4 ? 3200 : 6000);
export const rankTitleOf = (level: number): string =>
  level === 1 ? tr('Novato del Sustrato') : level === 2 ? tr('Horticultor Botánico') : level === 3 ? tr('Alquimista de Terpenos') : level === 4 ? tr('Maestro Extractor Rosin') : tr('Titán Genético Multiverso');

/* ───────────── selectors: the catalogue data merged with what the account changed ───────────── */
export const strainsOf = (s: GameState): Strain[] =>
  [...INITIAL_STRAINS, ...s.customStrains].map((x) => (s.patentMarks[x.id] ? { ...x, isPatented: true, patentId: s.patentMarks[x.id] } : x));
export const seedBankOf = (s: GameState): SeedBankItem[] => [...s.customSeeds, ...INITIAL_SEED_BANK];
export const seedItemOf = (s: GameState, id: string): SeedBankItem | undefined => s.customSeeds.find((x) => x.id === id) ?? INITIAL_SEED_BANK.find((x) => x.id === id);
export const machinesOf = (s: GameState): MachineEquipment[] => INITIAL_MACHINES.map((m) => {
  const w = s.machines.find((x) => x.id === m.id);
  if (!w) return m;
  const wear = w.wearPercentage;
  return { ...m, wearPercentage: wear, status: wear <= 20 ? 'averiado' : wear <= 40 ? 'mantenimiento_requerido' : 'operativo' };
});
export const questsOf = (s: GameState): GameQuest[] => INITIAL_QUESTS.map((q) => {
  const p = s.quests.find((x) => x.id === q.id);
  return p ? { ...q, currentCount: p.currentCount, isCompleted: p.isCompleted, isClaimed: p.isClaimed } : { ...q };
});
export const suppliesOf = (s: GameState): GrowSupplyItem[] => INITIAL_GROW_SUPPLIES.map((x) => ({ ...x, installed: s.installedSupplies.includes(x.id) }));
export const v2pItemsOf = (s: GameState): V2pRedemptionItem[] => INITIAL_V2P_ITEMS.map((x) => ({ ...x, stockPhysical: s.v2pStock[x.id] ?? x.stockPhysical }));

/* ───────────── fresh plants ───────────── */
/** one slot of the indoor room (3 rows × 10, in pairs), starting at germination */
export function roomSlotPlant(slot: number, strain: Strain, now: number): PlantInGrow {
  const r = Math.floor(slot / 10) + 1, p = Math.floor((slot % 10) / 2) + 1, pos = slot % 2 === 0 ? 'A' as const : 'B' as const;
  const temp = Number((24.0 + r * 0.2 + (slot % 3) * 0.1).toFixed(1));
  const rh = Number((58 - r + (slot % 4) * 0.5).toFixed(1));
  return {
    id: `indoor-r${r}-p${p}-${pos}`, slotIndex: slot, rowIndex: r, pairIndex: p, positionInPair: pos, strain, plantedAt: now,
    stage: stageOf(0), progressPercent: 0, health: 100, soilMoisture: 85, temperatureC: temp, relativeHumidity: rh, vpdKpa: calculateVpd(temp, rh),
    ppfdLightIntensity: 650 + p * 25, luxLumens: Math.round((650 + p * 25) * 54), co2Ppm: 750, currentRoom: 'vegetative', lightSchedule: '18/6',
    ecLevel: 1.8, phLevel: 6.2, nutrientBrand: 'advanced_nutrients', autoWateringEnabled: false, autoClimateEnabled: false,
    trichomeMaturity: { clear: 100, milky: 0, amber: 0 }, lastWatered: now, lastFed: now,
    estimatedDryYieldGrams: Math.round(75 * strain.resinYieldMultiplier + (slot % 10)),
  };
}

export function freshGame(now: number, username = ''): GameState {
  return {
    v: 1, lastSimAt: now,
    indoorPlants: [roomSlotPlant(0, INITIAL_STRAINS[0], now)], dormantPlants: [], plotPlants: {},
    currentRoom: 'vegetative', co2Ppm: 750, autoWaterActive: false, autoClimateActive: false,
    care: { rating: 100, lastCleanAt: 0 }, assets: starterAssets(),
    seedInventory: { seed_chrono_og: 3, seed_gelato_auto: 1 }, customSeeds: [], customStrains: [], patentMarks: {}, installedSupplies: [],
    mothersFathers: JSON.parse(JSON.stringify(INITIAL_MOTHERS_FATHERS)), patents: [], breedingJobs: [], breedingLog: [],
    machines: [], products: [],
    brand: { name: username ? `${username} Botanicals`.slice(0, CAPS.brandName) : 'YieldSol Botanicals', tagline: tr('Genéticas puras cultivadas en Yield Bud Empire'), level: 1, reputation: 100, dispensaryOpen: true, totalSalesFlora: 0, totalV2pShipped: 0, accentColor: '#10b981' },
    v2pStock: {}, redeemed: [],
    playerLevel: 1, playerXp: 0, quests: [], missions: emptyMissions(), tutorial: emptyTutorial(), tutorialPaid: [], once: {},
    solBalance: 1.85, totalFloraBurned: 0, burnStats: { speedUp: 0, repairs: 0, patents: 0, v2p: 0 }, transactions: [],
    profile: { displayName: username.slice(0, CAPS.displayName) || 'Grower', avatar: '🌱', facilityName: 'Carpa Casera 80x80cm', role: 'Principiante Botánico' },
  };
}

/* ───────────── normalization (also the migration of the old browser saves) ───────────── */
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
const arr = <T = unknown>(v: unknown): T[] => (Array.isArray(v) ? v as T[] : []);
const num = (v: unknown, lo: number, hi: number, def: number): number => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def; };
const str = (v: unknown, max: number, def = ''): string => (typeof v === 'string' ? v.slice(0, max) : def);
const bool = (v: unknown): boolean => v === true;

const STRAIN_TYPES = new Set(['Sativa', 'Indica', 'Híbrido', 'Autofloreciente']);
const DIFFS = new Set(['F2P Fácil', 'Intermedio', 'Maestro', 'Exótico']);
const ROOMS = new Set(GROW_ROOMS_CONFIG.map((r) => r.id));
const SCHEDULES = new Set(['18/6', '12/12', '24/0']);
const BRANDS = new Set(NUTRIENT_BRANDS_DATABASE.map((b) => b.id));
const PROFILE_ROLES = new Set(['Master Grower', 'Breeder Botánico', 'Genetista Comercial', 'Inversionista Web3', 'Principiante Botánico']);

/** a strain, with the numbers that matter for yield kept inside what the game allows */
export function normalizeStrain(raw: unknown): Strain | null {
  const r = obj(raw);
  const known = INITIAL_STRAINS.find((x) => x.id === r.id);
  if (known) return known;
  if (typeof r.id !== 'string' || typeof r.name !== 'string') return null;
  const tp = obj(r.terpenes);
  return {
    id: str(r.id, 80), name: str(r.name, CAPS.strainName), lineage: str(r.lineage, 120),
    type: (STRAIN_TYPES.has(r.type as string) ? r.type : 'Híbrido') as Strain['type'],
    thcPercentage: num(r.thcPercentage, 0, 35, 18), cbdPercentage: num(r.cbdPercentage, 0, 25, 1),
    terpenes: { myrcene: num(tp.myrcene, 0, 3, 0.5), limonene: num(tp.limonene, 0, 3, 0.5), caryophyllene: num(tp.caryophyllene, 0, 3, 0.3), pinene: num(tp.pinene, 0, 3, 0.2), linalool: num(tp.linalool, 0, 3, 0.1) },
    difficulty: (DIFFS.has(r.difficulty as string) ? r.difficulty : 'Maestro') as Strain['difficulty'],
    cycleDurationSeconds: num(r.cycleDurationSeconds, BALANCE.strainCycleMin, BALANCE.strainCycleMax, 60),
    resinYieldMultiplier: num(r.resinYieldMultiplier, 0.5, MAX_RESIN_MULT, 1.1),
    colorTheme: /^#[0-9a-f]{6}$/i.test(String(r.colorTheme)) ? String(r.colorTheme) : '#c084fc',
    description: str(r.description, 240),
    origin: typeof r.origin === 'string' ? r.origin as Strain['origin'] : undefined,
  };
}

/** a plant: every number inside its range, yield never above what its strain can give in the best facility */
export function normalizePlant(raw: unknown, now: number): PlantInGrow | null {
  const r = obj(raw);
  const strain = normalizeStrain(r.strain);
  if (!strain) return null;
  const progress = num(r.progressPercent, 0, 100, 0);
  const temp = num(r.temperatureC, 10, 40, 24), rh = num(r.relativeHumidity, 10, 95, 60);
  const ppfd = num(r.ppfdLightIntensity, 0, 2000, 600);
  const pest = obj(r.pest);
  const tri = obj(r.trichomeMaturity);
  const sim = obj(r.sim);
  const maxYield = Math.round(75 * MAX_RESIN_MULT * 2 * 1.2);
  const p: PlantInGrow = {
    id: typeof r.id === 'string' ? r.id.slice(0, 80) : undefined,
    slotIndex: r.slotIndex === undefined ? undefined : Math.floor(num(r.slotIndex, 0, 64, 0)),
    rowIndex: r.rowIndex === undefined ? undefined : Math.floor(num(r.rowIndex, 1, 3, 1)),
    pairIndex: r.pairIndex === undefined ? undefined : Math.floor(num(r.pairIndex, 1, 5, 1)),
    positionInPair: r.positionInPair === 'B' ? 'B' : r.positionInPair === 'A' ? 'A' : undefined,
    strain, plantedAt: num(r.plantedAt, 0, now, now), stage: stageOf(progress),
    techniques: arr<string>(r.techniques).filter((x) => typeof x === 'string').slice(0, 6) as PlantInGrow['techniques'],
    progressPercent: progress, health: num(r.health, 0, 100, 100), soilMoisture: num(r.soilMoisture, 0, 100, 80),
    temperatureC: temp, relativeHumidity: rh, vpdKpa: calculateVpd(temp, rh), ppfdLightIntensity: ppfd, luxLumens: Math.round(ppfd * 54),
    co2Ppm: num(r.co2Ppm, 300, 1600, 750), currentRoom: (ROOMS.has(r.currentRoom as GrowRoomId) ? r.currentRoom : 'vegetative') as GrowRoomId,
    lightSchedule: (SCHEDULES.has(r.lightSchedule as string) ? r.lightSchedule : '18/6') as PlantInGrow['lightSchedule'],
    ecLevel: num(r.ecLevel, 0, 6, 1.6), phLevel: num(r.phLevel, 3, 9, 6.2), nutrientBrand: str(r.nutrientBrand, 60, 'advanced_nutrients'),
    autoWateringEnabled: bool(r.autoWateringEnabled), autoClimateEnabled: bool(r.autoClimateEnabled),
    trichomeMaturity: { clear: num(tri.clear, 0, 100, 100), milky: num(tri.milky, 0, 100, 0), amber: num(tri.amber, 0, 100, 0) },
    lastWatered: num(r.lastWatered, 0, now, now), lastFed: num(r.lastFed, 0, now, now),
    estimatedDryYieldGrams: Math.round(num(r.estimatedDryYieldGrams, 0, maxYield, 60)),
    feedBonus: r.feedBonus === undefined ? undefined : num(r.feedBonus, 0.5, 1.15, 1),
    pest: typeof pest.kind === 'string' && ['mites', 'mold', 'rot'].includes(pest.kind) ? { kind: pest.kind as 'mites', hours: num(pest.hours, 0, 10_000, 0) } : undefined,
    guard: r.guard === undefined ? undefined : num(r.guard, 0, 200, 0),
    age: r.age === undefined ? undefined : num(r.age, 0, 1e6, 0),
    siteId: typeof r.siteId === 'string' ? r.siteId.slice(0, 60) : undefined,
    sex: r.sex === 'male' ? 'male' : r.sex === 'female' ? 'female' : undefined,
    pollinated: bool(r.pollinated),
  };
  if (Object.keys(sim).length) p.sim = { progress: num(sim.progress, 0, 100, progress), moisture: num(sim.moisture, 0, 100, p.soilMoisture), ec: num(sim.ec, 0, 6, p.ecLevel), health: num(sim.health, 0, 100, p.health) };
  return p;
}

function normalizeAssets(raw: unknown): OwnedAsset[] {
  const out: OwnedAsset[] = [];
  for (const x of arr(raw)) {
    const a = obj(x); const it = CATALOG_BY_ID[a.catalogId as string];
    if (!it || typeof a.id !== 'string') continue;
    out.push({
      id: a.id.slice(0, 80), catalogId: it.id, mintedAt: num(a.mintedAt, 0, 9e15, 0),
      remaining: it.kind === 'consumable' ? num(a.remaining, 0, it.amount ?? 0, 0) : undefined,
      durability: it.kind === 'equipment' ? num(a.durability, 0, 100, 100) : undefined,
      equipped: it.kind === 'equipment' && a.equipped === true ? true : undefined,
      starter: a.starter === true ? true : undefined,
    });
    if (out.length >= CAPS.assets) break;
  }
  return out;
}

function normalizeDonor(raw: unknown, now: number): MotherFatherPlant | null {
  const r = obj(raw); const strain = normalizeStrain(r.strain);
  if (!strain || typeof r.id !== 'string') return null;
  const role = r.role === 'Padre (Donante de Polen)' || r.role === 'Hembra Revertida (STS)' ? r.role : 'Madre (Esquejes / Clones)';
  return {
    id: r.id.slice(0, 80), role, strain, name: str(r.name, 80, strain.name), health: num(r.health, 0, 100, 95),
    generation: r.generation === undefined ? undefined : capGeneration(Number(r.generation) || 1),
    vigorRating: r.vigorRating === undefined ? undefined : num(r.vigorRating, 0, 100, 60),
    clonesCutCount: Math.floor(num(r.clonesCutCount, 0, 1e5, 0)), pollenCollectedMg: num(r.pollenCollectedMg, 0, 5000, 0),
    savedAt: num(r.savedAt, 0, now, now), traits: arr<string>(r.traits).filter((x) => typeof x === 'string').slice(0, 6).map((x) => x.slice(0, 80)),
  };
}

function normalizeProduct(raw: unknown, now: number): ProcessedProduct | null {
  const r = obj(raw);
  if (typeof r.id !== 'string' || typeof r.type !== 'string') return null;
  const coa = obj(r.coa);
  return {
    id: r.id.slice(0, 90), name: str(r.name, 90), type: r.type as ProcessedProduct['type'], recipeId: typeof r.recipeId === 'string' ? r.recipeId.slice(0, 40) : undefined,
    strainOrigin: str(r.strainOrigin, 60), quantityGrams: num(r.quantityGrams, 0, 5000, 0), potency: str(r.potency, 60),
    qualityScore: Math.round(num(r.qualityScore, 0, 100, 90)), marketValueFlora: Math.round(num(r.marketValueFlora, 0, 1e6, 0)),
    createdAt: num(r.createdAt, 0, now, now), batchHash: str(r.batchHash, 40),
    certified: r.certified === true ? true : undefined, coaHash: typeof r.coaHash === 'string' ? r.coaHash.slice(0, 30) : undefined,
    coa: r.certified === true ? { thc: num(coa.thc, 0, 100, 0), cbd: num(coa.cbd, 0, 100, 0), cbn: num(coa.cbn, 0, 100, 0), cbg: num(coa.cbg, 0, 100, 0), terpenes: num(coa.terpenes, 0, 100, 0) } : undefined,
  };
}

export function normalizeProfile(raw: unknown, fallbackName: string): GameProfile {
  const r = obj(raw);
  const img = typeof r.avatarImage === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(r.avatarImage) && r.avatarImage.length <= CAPS.avatarImage ? r.avatarImage : undefined;
  return {
    displayName: str(r.displayName, CAPS.displayName).trim() || fallbackName.slice(0, CAPS.displayName) || 'Grower',
    avatar: str(r.avatar, 16, '🌱') || '🌱', avatarImage: img,
    avatarNft: typeof r.avatarNft === 'string' ? r.avatarNft.slice(0, 40) : undefined,
    bio: typeof r.bio === 'string' ? r.bio.slice(0, CAPS.bio) : undefined,
    facilityName: str(r.facilityName, CAPS.facilityName, 'Carpa Casera 80x80cm'),
    role: (PROFILE_ROLES.has(r.role as string) ? r.role : 'Principiante Botánico') as GameProfile['role'],
  };
}

/**
 * Anything → a valid GameState. Accepts the current format and the old browser save (`UserAccountData`). `paidLevel` is the highest
 * level the economy already paid: the level never goes above it (a save's own level is only its word).
 */
export function normalizeGame(raw: unknown, now: number, opts: { paidLevel?: number; username?: string; plotIds?: string[] } = {}): GameState {
  const r = obj(raw);
  const base = freshGame(now, opts.username);
  if (!Object.keys(r).length) return base;
  const legacy = r.v !== 1;
  const s: GameState = { ...base };

  // plants
  const plants = (list: unknown, cap: number) => arr(list).map((x) => normalizePlant(x, now)).filter((x): x is PlantInGrow => !!x).slice(0, cap);
  const indoor = plants(r.indoorPlants, MAX_ROOM_PLANTS);
  s.indoorPlants = indoor.length ? indoor.map((p, i) => ({ ...p, siteId: undefined, slotIndex: p.slotIndex ?? i })) : base.indoorPlants;
  s.dormantPlants = plants(r.dormantPlants, MAX_ROOM_PLANTS).map((p) => ({ ...p, siteId: undefined }));
  const owned = opts.plotIds ? new Set(opts.plotIds) : null;
  const plotSrc: Record<string, unknown> = legacy
    ? Object.fromEntries(arr(r.plots).map((pl) => [String(obj(pl).id), obj(pl).plants]))
    : obj(r.plotPlants);
  s.plotPlants = {};
  for (const [id, list] of Object.entries(plotSrc).slice(0, 24)) {
    if (!/^plot-[a-z_]+-\d+$/.test(id) || (owned && !owned.has(id))) continue;
    const seen = new Set<number>();
    s.plotPlants[id] = plants(list, PLOT_SIZE).map((p) => ({ ...p, siteId: id, slotIndex: Math.floor(num(p.slotIndex, 0, PLOT_SIZE - 1, 0)) }))
      .filter((p) => (seen.has(p.slotIndex!) ? false : (seen.add(p.slotIndex!), true)));
  }

  s.currentRoom = (ROOMS.has(r.currentRoom as GrowRoomId) ? r.currentRoom : 'vegetative') as GrowRoomId;
  s.co2Ppm = num(r.co2Ppm, 300, 1600, 750);
  s.autoWaterActive = bool(r.autoWaterActive);
  s.autoClimateActive = bool(r.autoClimateActive);
  const care = obj(r.care);
  s.care = { rating: num(care.rating, 0, 100, 100), lastCleanAt: num(care.lastCleanAt, 0, now, 0) };
  s.assets = Array.isArray(r.assets) ? normalizeAssets(r.assets) : base.assets;

  // seeds and genetics
  s.customStrains = arr(r.customStrains).map(normalizeStrain).filter((x): x is Strain => !!x && !INITIAL_STRAINS.some((i) => i.id === x.id)).slice(0, CAPS.strains);
  s.customSeeds = arr(r.customSeeds).map((x) => {
    const o = obj(x); const tpl = normalizeStrain(o.strainTemplate);
    if (!tpl || typeof o.id !== 'string' || !/^(hybrid|cria)_seed_/.test(o.id)) return null;
    return { ...(o as unknown as SeedBankItem), id: o.id.slice(0, 90), name: str(o.name, 90), priceFlora: 0, priceSol: 0, seedsPerPack: Math.floor(num(o.seedsPerPack, 1, 30, 5)), strainTemplate: tpl, inStock: true };
  }).filter((x): x is SeedBankItem => !!x).slice(0, CAPS.strains);
  const pm = obj(r.patentMarks);
  s.patentMarks = Object.fromEntries(Object.entries(pm).filter(([, v]) => typeof v === 'string').slice(0, CAPS.patents).map(([k2, v]) => [k2.slice(0, 80), String(v).slice(0, 40)]));
  const known = new Set(seedBankOf(s).map((x) => x.id));
  s.seedInventory = {};
  for (const [id, n] of Object.entries(obj(r.seedInventory))) {
    if (!known.has(id)) continue;                        // seeds of a bank item this account doesn't have (lost hybrids) are dropped
    const c = Math.floor(num(n, 0, CAPS.seedsPerKind, 0));
    if (c > 0) s.seedInventory[id] = c;
    if (Object.keys(s.seedInventory).length >= CAPS.seedKinds) break;
  }
  if (!Object.keys(obj(r.seedInventory)).length && legacy) s.seedInventory = base.seedInventory;
  s.installedSupplies = legacy
    ? arr(r.suppliesMarket).filter((x) => obj(x).installed === true).map((x) => String(obj(x).id)).filter((id) => INITIAL_GROW_SUPPLIES.some((g) => g.id === id))
    : arr<string>(r.installedSupplies).filter((id) => INITIAL_GROW_SUPPLIES.some((g) => g.id === id));
  const donors = arr(r.mothersFathers).map((x) => normalizeDonor(x, now)).filter((x): x is MotherFatherPlant => !!x);
  s.mothersFathers = Array.isArray(r.mothersFathers) ? donors.slice(0, CAPS.donors) : base.mothersFathers;
  s.patents = arr(r.patents).filter((x) => typeof obj(x).id === 'string').slice(0, CAPS.patents) as GenomicPatent[];
  s.breedingJobs = arr(r.breedingJobs).map((x) => {
    const j = obj(x);
    if (typeof j.id !== 'string' || typeof j.motherId !== 'string' || typeof j.fatherId !== 'string') return null;
    const startedAt = num(j.startedAt, 0, now, now);
    return { id: j.id.slice(0, 60), motherId: j.motherId, fatherId: j.fatherId, name: str(j.name, CAPS.strainName, 'Cruce'), generation: capGeneration(Number(j.generation) || 1),
      useReagent: bool(j.useReagent), seed: Math.floor(num(j.seed, 0, 2 ** 32, 1)) >>> 0, startedAt, endsAt: Math.max(startedAt + CROSS_MINUTES * 60_000, num(j.endsAt, 0, 9e15, 0)) };
  }).filter((x): x is BreedingJob => !!x).slice(0, BREEDING_LIMITS.jobs);
  s.breedingLog = arr(r.breedingLog).filter((x) => typeof obj(x).id === 'string').slice(0, 100) as BreedingLogEntry[];
  s.machines = legacy
    ? arr(r.machines).map((x) => ({ id: String(obj(x).id), wearPercentage: num(obj(x).wearPercentage, 0, 100, 100) })).filter((m) => INITIAL_MACHINES.some((i) => i.id === m.id))
    : arr(r.machines).map((x) => ({ id: String(obj(x).id), wearPercentage: num(obj(x).wearPercentage, 0, 100, 100) })).filter((m) => INITIAL_MACHINES.some((i) => i.id === m.id));
  s.products = arr(legacy ? r.processedProducts : r.products).map((x) => normalizeProduct(x, now)).filter((x): x is ProcessedProduct => !!x).slice(0, CAPS.products);

  const b = obj(r.brand);
  s.brand = {
    ...base.brand, name: str(b.name, CAPS.brandName, base.brand.name) || base.brand.name, tagline: str(b.tagline, CAPS.tagline, base.brand.tagline),
    level: Math.floor(num(b.level, 1, 10, 1)), reputation: num(b.reputation, 0, 100, 100),
    totalSalesFlora: Math.round(num(b.totalSalesFlora, 0, 1e9, 0)), totalV2pShipped: Math.floor(num(b.totalV2pShipped, 0, 1e5, 0)),
  };
  s.v2pStock = Object.fromEntries(Object.entries(obj(r.v2pStock)).filter(([id]) => INITIAL_V2P_ITEMS.some((i) => i.id === id)).map(([id, n]) => [id, Math.floor(num(n, 0, 1000, 0))]));
  s.redeemed = arr(legacy ? r.redeemedV2pList : r.redeemed).slice(0, CAPS.redeemed) as Redeemed[];

  // progress: the level is at most what the economy already paid
  const paid = Math.max(1, Math.floor(opts.paidLevel ?? 1));
  const lvl = Math.floor(num(r.playerLevel, 1, 200, 1));
  s.playerLevel = Math.min(lvl, paid);
  s.playerXp = s.playerLevel < lvl ? 0 : Math.floor(num(r.playerXp, 0, XP_NEEDED(s.playerLevel) - 1, 0));
  s.quests = arr(r.quests).map((x) => {
    const q = obj(x); const def = INITIAL_QUESTS.find((d) => d.id === q.id);
    if (!def) return null;
    const count = Math.floor(num(q.currentCount, 0, def.targetCount, 0));
    return { id: def.id, currentCount: count, isCompleted: count >= def.targetCount, isClaimed: bool(q.isClaimed) && count >= def.targetCount };
  }).filter((x): x is QuestProgress => !!x);
  s.missions = normalizeMissions(r.missions);
  s.tutorial = normalizeTutorial(r.tutorial);
  s.tutorialPaid = Array.from(new Set([...arr<string>(r.tutorialPaid), ...s.tutorial.claimed].filter((x) => typeof x === 'string'))).slice(0, 40);
  s.once = Object.fromEntries(Object.entries(obj(r.once)).filter(([, v]) => typeof v === 'number').slice(0, 400)) as Record<string, number>;

  s.solBalance = num(r.solBalance, 0, CAPS.sol, base.solBalance);
  s.totalFloraBurned = Math.round(num(r.totalFloraBurned, 0, 1e9, 0));
  const bs = obj(r.burnStats);
  s.burnStats = { speedUp: num(bs.speedUp, 0, 1e9, 0), repairs: num(bs.repairs, 0, 1e9, 0), patents: num(bs.patents, 0, 1e9, 0), v2p: num(bs.v2p, 0, 1e9, 0) };
  s.transactions = arr(r.transactions).filter((x) => typeof obj(x).id === 'string').slice(0, CAPS.transactions) as SolanaTransaction[];
  s.profile = normalizeProfile(r.profile, opts.username ?? '');

  // the clock: a save resumes where it stopped (offline catch-up), never in the future and never more than the catch-up window ago
  s.lastSimAt = Math.min(now, Math.max(now - BALANCE.maxCatchUpSeconds * 1000, num(r.lastSimAt ?? r.savedAt, 0, now, now)));
  return s;
}

/** the facility the economy says the account uses (its best unlocked tier) */
export const facilityOfTier = (tier: number) => INITIAL_FACILITIES.filter((f) => f.tier <= tier).sort((a, b) => b.tier - a.tier)[0] ?? INITIAL_FACILITIES[0];

export { BRANDS as NUTRIENT_BRAND_IDS };
