/**
 * Every action of the game, validated and applied on the server's copy of the account (`r.s`, mutable: the caller works on a clone).
 * Ported one by one from the old GameContext: same numbers, same messages. What changed is who decides: params are only choices
 * (which plant, which recipe), never results — yields, prices, qualities and dice come from here.
 */
import type { GrowRoomId, MotherFatherPlant, PestKind, PlantInGrow, ProcessedProduct, SeedBankItem, Strain, TechniqueId, GenomicPatent } from '../types';
import { GROW_ROOMS_CONFIG, INITIAL_FACILITIES, INITIAL_V2P_ITEMS, NUTRIENT_BRANDS_DATABASE } from '../data/initialData';
import {
  CATALOG_BY_ID, USE, newAsset, bestFeedBonus, repairCostOf, ownsStation, spendPest, garbageOf, stockOf,
} from '../economy/catalog';
import { applyTechnique, canTrain, TECHNIQUE_BY_ID } from '../sim/techniques';
import { canCraft, craftTotals, FORGE_RECIPE_BY_ID, MATERIAL_BY_ID, type MaterialId } from '../sim/forge';
import { breedingCost, canBreed, capGeneration, CHAMBER_FEE, CROSS_MINUTES, lineageLabel, BREEDING_LIMITS } from '../sim/breeding';
import { productKey, PRODUCT_PRICE } from '../sim/products';
import { boostWithinPhase, isHarvestable, phaseOf, PHASES, stageOf } from '../sim/phases';
import { calculateVpd, isMale, sexFor, sexRevealed, SEEDS_PER_POLLINATED, PEST_INFO } from '../sim/engine';
import { terroirOf, REGION_BY_ID, PLOT_SIZE } from '../sim/terroir';
import { ECON } from '../sim/economy';
import { MAX_RESIN_MULT } from '../sim/harvestCap';
import { CHESTS, DESIGN_BY_ID } from '../sim/avatars';
import { ROLE_INFO, STAFF_CHESTS, wageOf, type StaffNft, type StaffRole } from '../sim/staff';
import { claimErrand, claimStory, rewardSummary, type MissionEvent, type MissionReward } from '../sim/missions';
import { claimStep, skipStep, startTutorial as startTut } from '../sim/tutorial';
import {
  CHALLENGES, INGREDIENTS, MEDIUM_BY_ID, STAGE_BY_ID, WATER_BY_ID, SYMPTOM_BY_ID, diagnose, dosesFromTable, feedEffect, phCorrection, solve,
  stageOfProgress, strengthForEc, type Mix, type MediumId, type StageId, type WaterId,
} from '../sim/nutrition';
import { RECIPE_BY_ID, HPLC_FEE } from '../lab/recipes';
import { RELIC_RARITY_LABEL, RELIC_TYPE_BY_ID, rollWeek, type Relic } from '../sim/relics';
import { t as tr } from '../i18n/core';
import { GameError, type Ctx } from './ctx';
import {
  CAPS, machinesOf, normalizeProfile, questsOf, seedBankOf, seedItemOf, strainsOf, suppliesOf, v2pItemsOf,
} from './state';
import {
  P, addXp, boom, burn, catalogName, event, giveSeeds, no, once, onceLeftHours, paySol, plantAt, pushTx, questProgress, reborn, say, sfx,
  takeResource, takeStation, type Run,
} from './run';

type Params = Record<string, unknown>;
export type Action = (r: Run, p: Params) => unknown;

const PHASE_NAMES: Record<string, string> = Object.fromEntries(PHASES.map((x) => [x.id, x.label]));
const plural = (n: number) => (n > 1 ? 's' : '');
const SINGLE_SLOT = ['lamp', 'ac', 'irrigation'];
/** water / nutrient used in the indoor room per plant: hydroponic facilities recirculate (see GrowFacility.resourceUse) */
const roomUse = (r: Run) => r.ctx.ext().facility.resourceUse ?? 1;
const fmtH = (h: number) => { const m = Math.max(1, Math.ceil(h * 60)); return m >= 60 ? tr('{v0} h {v1} min', { v0: Math.floor(m / 60), v1: m % 60 }) : `${m} min`; };

/* ───────────── shared pieces ───────────── */

/** flower (and trim, stem fibre) into the warehouse: the economy caps it by what the account can grow */
function harvestIn(r: Run, flower: number, trim: number, source: 'room' | 'plot') {
  if (flower <= 0 && trim <= 0) return;
  const res = r.ctx.econ<{ flower: number; clipped: boolean }>('harvest', { flower, trim, source });
  if (res.clipped) say(r, tr('Tu instalación todavía no da para tanta cosecha: se guardaron {v0} g de flor. Con el tiempo (o acelerando) vuelve a rendir.', { v0: Math.round(res.flower) }));
}

/** a lab batch: the economy takes the input and keeps the product's grams; the batch is how the warehouse shows it */
function mintBatch(r: Run, b: Omit<ProcessedProduct, 'id' | 'createdAt' | 'batchHash'>, input: { grams: number }) {
  const key = productKey(b.type, b.recipeId);
  r.ctx.econ('process', { product: key, grams: input.grams, out: b.quantityGrams });
  const prod: ProcessedProduct = { ...b, id: r.ctx.uid('prod'), createdAt: r.ctx.now, batchHash: `0x${hex(r, 8)}...${hex(r, 4)}` };
  r.s.products.unshift(prod);
  return prod;
}
const hex = (r: Run, n: number) => Array.from({ length: n }, () => Math.floor(r.ctx.rng() * 16).toString(16)).join('');

function wearMachine(r: Run, id: string, amount?: number) {
  const m = machinesOf(r.s).find((x) => x.id === id);
  if (!m) return;
  const next = Math.max(0, m.wearPercentage - (amount ?? m.wearRatePerCycle));
  const w = r.s.machines.find((x) => x.id === id);
  if (w) w.wearPercentage = next; else r.s.machines.push({ id, wearPercentage: next });
}
const machineBroken = (r: Run, id: string) => { const m = machinesOf(r.s).find((x) => x.id === id); return m && m.wearPercentage <= 15 ? m : null; };

/** a mission / tutorial reward: lots, seeds and XP (never $FLORA) */
function grantReward(r: Run, rw: MissionReward, title: string) {
  for (const l of rw.lots ?? []) for (let i = 0; i < (l.qty ?? 1); i++) if (CATALOG_BY_ID[l.id] && r.s.assets.length < CAPS.assets) r.s.assets.push({ ...newAsset(l.id), id: r.ctx.uid(`nft-${l.id}`), mintedAt: r.ctx.now });
  for (const [id, n] of Object.entries(rw.seeds ?? {})) if (seedItemOf(r.s, id)) r.s.seedInventory[id] = Math.min(CAPS.seedsPerKind, (r.s.seedInventory[id] ?? 0) + n);
  addXp(r, Math.round(rw.xp * (1 + r.ctx.ext().mods.missionBonus)));
  sfx(r, 'harvest');
  boom(r, { particleCount: 70, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#fbbf24', '#38bdf8'] });
  const list = rewardSummary(rw, catalogName, (id) => seedItemOf(r.s, id)?.name ?? id).join(' · ');
  say(r, tr('🎁 Misión cumplida: {title} — {list}', { title, list }), 'success');
}

/** a fresh indoor plant of a strain in slot `i` (planting a seed or a clone) */
function plantInSlot(r: Run, i: number, strain: Strain, seedType?: string) {
  const p = r.s.indoorPlants[i];
  const now = r.ctx.now;
  const ext = r.ctx.ext();
  r.s.indoorPlants[i] = {
    ...p, strain, plantedAt: now, stage: 'seed', progressPercent: 0, health: 100, soilMoisture: 85, sim: undefined,
    temperatureC: 24.0, relativeHumidity: 65, vpdKpa: calculateVpd(24.0, 65), ppfdLightIntensity: 450, luxLumens: Math.round(450 * 54),
    co2Ppm: r.s.co2Ppm || 700, currentRoom: r.s.currentRoom, lightSchedule: '18/6', ecLevel: 1.4, phLevel: 6.2,
    autoWateringEnabled: r.s.autoWaterActive, autoClimateEnabled: r.s.autoClimateActive, trichomeMaturity: { clear: 100, milky: 0, amber: 0 },
    lastWatered: now, lastFed: now, estimatedDryYieldGrams: Math.round(75 * Math.min(MAX_RESIN_MULT, strain.resinYieldMultiplier) * ext.facility.environmentBonus),
    sex: sexFor(`${p.id ?? i}-${now}`, seedType), pollinated: false, pest: undefined, techniques: [], feedBonus: undefined, guard: undefined,
  };
  event(r, 'plant', 1);
  say(r, tr('Semilla plantada en Planta #{v0}: {name}. ¡Inicia el monitoreo de microclima!', { v0: i + 1, name: strain.name }), 'info');
}

function sanitizeMix(raw: unknown, only?: string[]): Mix {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const waterId = (o.waterId as string) in WATER_BY_ID ? o.waterId as WaterId : 'soft';
  const liters = P.num(o.liters ?? 1, 0.1, 1000);
  const doses: Record<string, number> = {};
  for (const [id, v] of Object.entries((o.doses && typeof o.doses === 'object' ? o.doses : {}) as Record<string, unknown>).slice(0, 40)) {
    const ing = INGREDIENTS[id];
    if (!ing || (only && !only.includes(id))) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) doses[id] = Math.min(ing.max, n);
  }
  return { waterId, liters, doses };
}

/** apply a nutrient solution the server has measured itself (from the mix, not from the browser's numbers) */
function fertigate(r: Run, idx: unknown, scope: 'one' | 'all', e: { feedBonus: number; healthDelta: number; ec: number; ph: number }, score: number, label: string, brandName?: string) {
  const s = r.s;
  if (s.indoorPlants.length === 0) no(tr('Siembra una planta para aplicarle la solución'));
  const { i: sel } = plantAt(r, idx);
  const n = scope === 'all' ? s.indoorPlants.length : 1;
  takeResource(r, 'nutrient', USE.nutrientPerPlant * n * roomUse(r));
  sfx(r, 'water');
  const feedBonus = Math.min(1.15, e.feedBonus * (1 + (bestFeedBonus(s.assets) - 1) * 0.5));
  const ec = Number(e.ec.toFixed(2)), ph = Number(e.ph.toFixed(2));
  s.indoorPlants = s.indoorPlants.map((p, i) => (scope === 'all' || i === sel)
    ? { ...p, feedBonus, ecLevel: ec, phLevel: ph, health: Math.max(30, Math.min(100, p.health + e.healthDelta)), lastFed: r.ctx.now, nutrientBrand: brandName ?? p.nutrientBrand }
    : p);
  const xp = Math.round(10 + score / 5);
  event(r, 'fertigate', 1);
  addXp(r, xp);
  say(r, tr('{label}: EC {ec} mS/cm · pH {ph} · calidad {score}/100 (+{xp} XP)', { label, ec, ph, score, xp }), score >= 55 ? 'success' : 'info');
  return true;
}

function treatList(r: Run, targets: PlantInGrow[]): { jobs: Array<{ p: PlantInGrow; guard: number }>; missing: Set<string> } {
  let cur = r.s.assets;
  const jobs: Array<{ p: PlantInGrow; guard: number }> = [];
  const missing = new Set<string>();
  for (const p of targets) {
    const res = spendPest(cur, p.pest!.kind as PestKind, USE.pestPerPlant);
    if (res.spent + 1e-9 >= USE.pestPerPlant) { cur = res.assets; jobs.push({ p, guard: res.guardHours || 48 }); }
    else missing.add(PEST_INFO[p.pest!.kind].cure);
  }
  if (jobs.length === 0) no(tr('No tienes tratamiento: necesitas {v0}. Cómpralo en el Grow Market → Control de plagas.', { v0: [...missing].join(' / ') }), 'burn');
  r.s.assets = cur;
  return { jobs, missing };
}

const plotOf = (r: Run, plotId: unknown) => {
  const id = P.str(plotId, 60);
  const pl = r.ctx.ext().plots.find((x) => x.id === id);
  if (!pl) no(tr('Esa parcela no es tuya.'));
  if (!r.s.plotPlants[id]) r.s.plotPlants[id] = [];
  return { plot: pl!, plants: r.s.plotPlants[id] };
};

const donorName = (m: MotherFatherPlant) => m.name;

/* ───────────── the actions ───────────── */

export const ACTIONS: Record<string, Action> = {
  /* ── indoor room ── */
  waterPlant(r, p) {
    const { i } = plantAt(r, p.idx);
    takeResource(r, 'water', USE.waterPerPlantManual * roomUse(r));
    sfx(r, 'water');
    const x = r.s.indoorPlants[i];
    r.s.indoorPlants[i] = { ...x, soilMoisture: Math.min(100, x.soilMoisture + 55), health: Math.min(100, x.health + 5), lastWatered: r.ctx.now };
    questProgress(r, 'quest_water_micro', 1);
    event(r, 'water', 1);
    addXp(r, 20);
    say(r, tr('Riego completado en Planta #{v0} (+20 XP)', { v0: i + 1 }));
    return true;
  },
  waterAllPlants(r) {
    const n = r.s.indoorPlants.length;
    takeResource(r, 'water', USE.waterPerPlantManual * n * roomUse(r));
    sfx(r, 'water');
    r.s.indoorPlants = r.s.indoorPlants.map((x) => ({ ...x, soilMoisture: Math.min(100, x.soilMoisture + 55), health: Math.min(100, x.health + 5), lastWatered: r.ctx.now }));
    questProgress(r, 'quest_water_micro', 5);
    event(r, 'water', n);
    addXp(r, 60);
    say(r, tr('¡Riego por goteo activado en las 3 filas (30 plantas de la sala)! (+60 XP)'));
    return true;
  },
  feedNutrients(r, p) {
    const { i } = plantAt(r, p.idx);
    takeResource(r, 'nutrient', USE.nutrientPerPlant * roomUse(r));
    sfx(r, 'click');
    const feedBonus = bestFeedBonus(r.s.assets);
    const x = r.s.indoorPlants[i];
    r.s.indoorPlants[i] = { ...x, feedBonus, ecLevel: 2.1, phLevel: 6.2, health: Math.min(100, x.health + 10), lastFed: r.ctx.now };
    event(r, 'feed', 1);
    addXp(r, 25);
    say(r, tr('Nutrición N-P-K optimizada en Planta #{v0} (+25 XP)', { v0: i + 1 }));
    return true;
  },
  feedAllPlants(r) {
    const n = r.s.indoorPlants.length;
    takeResource(r, 'nutrient', USE.nutrientPerPlant * n * roomUse(r));
    sfx(r, 'click');
    const feedBonus = bestFeedBonus(r.s.assets);
    r.s.indoorPlants = r.s.indoorPlants.map((x) => ({ ...x, feedBonus, ecLevel: 2.1, phLevel: 6.2, health: Math.min(100, x.health + 10), lastFed: r.ctx.now }));
    event(r, 'feed', n);
    addXp(r, 75);
    say(r, tr('Fertirriego N-P-K aplicado a las 30 plantas de la sala (+75 XP)'));
    return true;
  },
  setTemperature(r, p) {
    const { i } = plantAt(r, p.idx); const temp = P.num(p.temp, 10, 40);
    const x = r.s.indoorPlants[i];
    r.s.indoorPlants[i] = { ...x, temperatureC: temp, vpdKpa: calculateVpd(temp, x.relativeHumidity) };
  },
  setHumidity(r, p) {
    const { i } = plantAt(r, p.idx); const rh = P.num(p.rh, 10, 95);
    const x = r.s.indoorPlants[i];
    r.s.indoorPlants[i] = { ...x, relativeHumidity: rh, vpdKpa: calculateVpd(x.temperatureC, rh) };
  },
  setPpfd(r, p) {
    const ppfd = P.num(p.ppfd, 0, 2000);
    r.s.indoorPlants = r.s.indoorPlants.map((x) => ({ ...x, ppfdLightIntensity: ppfd, luxLumens: Math.round(ppfd * 54) }));
  },
  setLightSchedule(r, p) {
    const schedule = P.oneOf(p.schedule, ['18/6', '12/12', '24/0'] as const);
    sfx(r, 'click');
    r.s.indoorPlants = r.s.indoorPlants.map((x) => ({ ...x, lightSchedule: schedule }));
    say(r, tr('Ciclo fotoperiódico de la sala indoor ajustado a {schedule}', { schedule }));
  },
  trainPlant(r, p) {
    const { p: target, i } = plantAt(r, p.idx);
    const technique = P.oneOf(p.technique, Object.keys(TECHNIQUE_BY_ID) as TechniqueId[]);
    const check = canTrain(target, technique, PHASE_NAMES);
    if (!check.ok) no(check.message);
    const t = TECHNIQUE_BY_ID[technique];
    sfx(r, 'click');
    r.s.indoorPlants[i] = applyTechnique(target, technique);
    addXp(r, t.xp);
    say(r, tr('{label} en la planta #{v1}: +{v2}% de rendimiento (+{xp} XP)', { label: t.label, v1: i + 1, v2: Math.round(t.yieldBonus * 100), xp: t.xp }));
    return true;
  },
  trainIndoorCanopy(r) {
    const eligible = r.s.indoorPlants.filter((x) => canTrain(x, 'scrog', PHASE_NAMES).ok);
    if (eligible.length === 0) no(tr('El SCROG solo se instala en el vegetativo y una vez por planta: ahora ninguna planta de la sala cumple.'));
    sfx(r, 'click');
    r.s.indoorPlants = r.s.indoorPlants.map((x) => (canTrain(x, 'scrog', PHASE_NAMES).ok ? applyTechnique(x, 'scrog') : x));
    addXp(r, TECHNIQUE_BY_ID.scrog.xp + eligible.length * 5);
    say(r, tr('SCROG instalado en {length} planta{v1} en vegetativo (+{v2}% de rendimiento cada una)', { length: eligible.length, v1: plural(eligible.length), v2: Math.round(TECHNIQUE_BY_ID.scrog.yieldBonus * 100) }));
  },
  speedUpGrowth(r, p) {
    const { p: target, i } = plantAt(r, p.idx);
    if (isHarvestable(target)) no(tr('Esta planta ya terminó de crecer: solo falta cosecharla.'));
    if (boostWithinPhase(target.progressPercent, 35) - target.progressPercent < 1) no(tr('Está al final de la fase de {v0}: entra en la siguiente y vuelve a acelerar. Nada se cobró.', { v0: phaseOf(target.stage)?.label ?? 'crecimiento' }));
    if (r.ctx.ext().flora < 25) no(tr('Saldo insuficiente: Necesitas al menos 25 $FLORA para acelerar el cultivo'));
    r.ctx.econ('grow_speedup', { scope: 'plant' });
    burn(r, 'BURN_SPEEDUP', 25, tr('Yield Bud Empire: Aceleración Fotónica Planta Individual (Quema de 25 $FLORA)'), false);
    const next = boostWithinPhase(target.progressPercent, 35);
    r.s.indoorPlants[i] = { ...target, progressPercent: next, stage: stageOf(next), sim: undefined };
    say(r, tr('¡25 $FLORA quemados! Planta #{v0} avanza dentro de su fase actual (nunca se salta una).', { v0: i + 1 }), 'burn');
    return true;
  },
  speedUpIndoorRoom(r) {
    if (!r.s.indoorPlants.some((x) => !isHarvestable(x) && boostWithinPhase(x.progressPercent, 30) - x.progressPercent >= 1)) no(tr('Ninguna planta puede avanzar ahora: las que están al final de su fase deben entrar en la siguiente. Nada se cobró.'));
    if (r.ctx.ext().flora < 50) no(tr('Saldo insuficiente: Necesitas al menos 50 $FLORA para acelerar la sala completa'));
    r.ctx.econ('grow_speedup', { scope: 'room' });
    burn(r, 'BURN_SPEEDUP', 50, tr('Yield Bud Empire: Aceleración Fotónica Sala Indoor Completa (30 Plantas)'), false);
    r.s.indoorPlants = r.s.indoorPlants.map((x) => { const next = boostWithinPhase(x.progressPercent, 30); return { ...x, progressPercent: next, stage: stageOf(next), sim: undefined }; });
    say(r, tr('¡50 $FLORA quemados! Aceleración cuántica aplicada a las 3 filas (30 plantas de la sala)'), 'burn');
    return true;
  },
  harvestPlant(r, p) {
    const { p: target, i } = plantAt(r, p.idx);
    if (!isHarvestable(target)) {
      const ph = phaseOf(target.stage);
      no(tr('Aún no se puede cortar: la planta está en {v0}. Debe pasar por {order} y terminar la maduración.', { v0: ph?.label ?? 'crecimiento', order: PHASES.map((x) => x.label).join(' → ') }));
    }
    sfx(r, 'harvest');
    boom(r, { particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#f59e0b', '#a855f7'] });
    const male = target.sex === 'male';
    const flower = male ? 0 : Math.round(target.estimatedDryYieldGrams * (target.health / 100) * (1 + r.ctx.ext().mods.roomYield));
    const trim = Math.round(flower * 0.4);
    const seeds = !male && target.pollinated ? giveSeeds(r, target.strain, SEEDS_PER_POLLINATED) : 0;
    harvestIn(r, flower, trim, 'room');
    questProgress(r, 'quest_harvest_run', 1);
    if (!male) event(r, 'harvest', 1);
    addXp(r, 180);
    say(r, male ? tr('Planta #{v0} era macho: no da flor. La sala queda libre para una hembra.', { v0: i + 1 }) : tr('¡Cosecha exitosa! Planta #{v0}: +{flowerHarvested}g Flor Seca y +{trimHarvested}g Biomasa{v3} (+180 XP)', { v0: i + 1, flowerHarvested: flower, trimHarvested: trim, v3: seeds ? tr(' y 🌰 {seedsGot} semillas (fue polinizada)', { seedsGot: seeds }) : '' }), 'success');
    r.s.indoorPlants[i] = reborn(target, r.ctx.now);
  },
  harvestAllReadyPlants(r) {
    const ready = r.s.indoorPlants.map((x, i) => ({ x, i })).filter(({ x }) => isHarvestable(x));
    if (ready.length === 0) no(tr('Aún no hay plantas listas para corte en la sala indoor.'));
    sfx(r, 'harvest');
    boom(r, { particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#f59e0b', '#a855f7', '#6366f1'] });
    let totalFlower = 0, totalTrim = 0, totalSeeds = 0, maleCut = 0;
    const mods = r.ctx.ext().mods;
    for (const { x } of ready) {
      if (x.sex === 'male') { maleCut++; continue; }
      const f = Math.round(x.estimatedDryYieldGrams * (x.health / 100) * (1 + mods.roomYield));
      totalFlower += f; totalTrim += Math.round(f * 0.4);
      if (x.pollinated) totalSeeds += giveSeeds(r, x.strain, SEEDS_PER_POLLINATED);
    }
    const set = new Set(ready.map((x) => x.i));
    r.s.indoorPlants = r.s.indoorPlants.map((x, i) => (set.has(i) ? reborn(x, r.ctx.now) : x));
    harvestIn(r, totalFlower, totalTrim, 'room');
    questProgress(r, 'quest_harvest_run', ready.length);
    event(r, 'harvest', ready.length - maleCut);
    addXp(r, ready.length * 150);
    say(r, tr('¡Cosecha de Sala Completa! {length} plantas cosechadas: +{totalFlower}g Flor Seca y +{totalTrim}g Biomasa{v3}{v4}', { length: ready.length, totalFlower, totalTrim, v3: totalSeeds ? tr(' · 🌰 +{totalSeeds} semillas', { totalSeeds }) : '', v4: maleCut ? tr(' · {maleCut} macho{v1} (sin flor)', { maleCut, v1: plural(maleCut) }) : '' }), 'success');
  },
  /** plant one of the account's strains in a slot (the room is always planted: this swaps what grows there) */
  plantNewSeed(r, p) {
    const { i } = plantAt(r, p.idx);
    const strain = strainsOf(r.s).find((x) => x.id === p.strainId);
    if (!strain) throw new GameError('bad_params');
    sfx(r, 'click');
    plantInSlot(r, i, strain);
  },
  plantFromSeedBank(r, p) {
    const { i } = plantAt(r, p.idx);
    const seedId = P.str(p.seedId, 90);
    if ((r.s.seedInventory[seedId] ?? 0) <= 0) no(tr('No tienes semillas disponibles de este tipo. Adquiere más en el Banco de Semillas.'));
    const item = seedItemOf(r.s, seedId);
    if (!item) throw new GameError('bad_params');
    r.s.seedInventory[seedId] = Math.max(0, (r.s.seedInventory[seedId] ?? 0) - 1);
    sfx(r, 'click');
    plantInSlot(r, i, item.strainTemplate, item.seedType);
    return true;
  },

  /* ── plagues, cleaning, males ── */
  treatPests(r, p) {
    if (p.plotId) return ACTIONS.treatPlot(r, { plotId: p.plotId });
    const scope = p.scope === 'selected' ? 'selected' : 'all';
    const { i: sel } = plantAt(r, p.idx);
    const targets = r.s.indoorPlants.filter((x, i) => x.pest && (scope === 'all' || i === sel));
    if (targets.length === 0) no(scope === 'selected' ? tr('Esta planta no tiene plagas.') : tr('No hay plagas que tratar. ¡Bien cuidado!'));
    const { jobs, missing } = treatList(r, targets);
    r.s.indoorPlants = r.s.indoorPlants.map((x) => { const j = jobs.find((y) => y.p === x); return j && x.pest ? { ...x, pest: undefined, guard: j.guard, health: Math.min(100, x.health + 5) } : x; });
    sfx(r, 'click');
    addXp(r, 15 * jobs.length);
    say(r, tr('🧴 {length} planta{v1} tratada{v1} y protegida{v1} {v3} h{v4}.', { length: jobs.length, v1: plural(jobs.length), v3: Math.max(...jobs.map((j) => j.guard)), v4: missing.size ? tr('. Faltó: {v0}', { v0: [...missing].join(' / ') }) : '' }), missing.size ? 'info' : 'success');
  },
  treatPlot(r, p) {
    const { plot, plants } = plotOf(r, p.plotId);
    const targets = plants.filter((x) => x.pest);
    if (targets.length === 0) no(tr('No hay plagas en esta parcela.'));
    const { jobs, missing } = treatList(r, targets);
    r.s.plotPlants[plot.id] = plants.map((x) => { const j = jobs.find((y) => y.p === x); return j && x.pest ? { ...x, pest: undefined, guard: j.guard, health: Math.min(100, x.health + 5) } : x; });
    sfx(r, 'click');
    addXp(r, 15 * jobs.length);
    say(r, tr('🧴 {length} planta{v1} tratada{v1} en {name}{v3}.', { length: jobs.length, v1: plural(jobs.length), name: plot.name, v3: missing.size ? tr('. Faltó: {v0}', { v0: [...missing].join(' / ') }) : '' }), missing.size ? 'info' : 'success');
  },
  cleanRoom(r) {
    const since = (r.ctx.now - r.s.care.lastCleanAt) / 3600000;
    if (since < USE.cleanCooldownHours) no(tr('La sala ya está limpia. Podrás volver a limpiar en {v0}.', { v0: fmtH(USE.cleanCooldownHours - since) }));
    sfx(r, 'click');
    const gain = Math.min(USE.cleanGain, 100 - Math.round(r.s.care.rating));
    r.s.care = { rating: Math.min(100, r.s.care.rating + USE.cleanGain), lastCleanAt: r.ctx.now };
    addXp(r, 20);
    say(r, tr('🧹 Sala limpia: calificación de jardinero +{v0}.', { v0: gain }), 'success');
    return true;
  },
  recycleGarbage(r) {
    const trash = garbageOf(r.s.assets);
    if (trash.length === 0) no(tr('No hay basura que reciclar.'));
    const ids = new Set(trash.map((a) => a.id));
    sfx(r, 'click');
    r.s.assets = r.s.assets.filter((a) => !ids.has(a.id));
    r.s.care = { ...r.s.care, rating: Math.min(100, r.s.care.rating + trash.length * USE.recycleGain) };
    say(r, tr('♻️ Reciclaste {length} objeto{v1} (frascos vacíos y equipo averiado): +{v2} de calificación.', { length: trash.length, v1: plural(trash.length), v2: trash.length * USE.recycleGain }), 'success');
  },
  removeMales(r, p) {
    if (p.plotId) {
      const { plot, plants } = plotOf(r, p.plotId);
      const males = plants.filter((x) => isMale(x) && sexRevealed(x));
      if (males.length === 0) no(tr('No hay machos por quitar en esta parcela.'));
      r.s.plotPlants[plot.id] = plants.filter((x) => !males.includes(x));
      sfx(r, 'click');
      addXp(r, males.length * 10);
      say(r, tr('♂ {length} macho{v1} arrancado{v2} de {name}. Las hembras están a salvo de la polinización.', { length: males.length, v1: plural(males.length), v2: plural(males.length), name: plot.name }), 'success');
      return;
    }
    const idx = r.s.indoorPlants.map((x, i) => ({ x, i })).filter(({ x }) => isMale(x) && sexRevealed(x)).map((x) => x.i);
    if (idx.length === 0) no(tr('No hay machos por quitar en la sala.'));
    const set = new Set(idx);
    r.s.indoorPlants = r.s.indoorPlants.map((x, i) => (set.has(i) ? { ...reborn(x, r.ctx.now), pest: undefined } : x));
    sfx(r, 'click');
    addXp(r, idx.length * 10);
    say(r, tr('♂ {length} macho{v1} retirado{v2} de la sala; su hueco vuelve a empezar como hembra.', { length: idx.length, v1: plural(idx.length), v2: plural(idx.length) }), 'success');
  },
  keepMaleAsFather(r, p) {
    const { plot, plants } = plotOf(r, p.plotId);
    const slot = P.int(p.slot, 0, PLOT_SIZE - 1);
    const plant = plants.find((x) => x.slotIndex === slot);
    if (!plant || !isMale(plant)) throw new GameError('bad_params');
    if (r.s.mothersFathers.length >= CAPS.donors) no(tr('El Santuario está lleno ({n} ejemplares). Libera espacio antes de guardar otro.', { n: CAPS.donors }));
    const donor: MotherFatherPlant = {
      id: r.ctx.uid('donor'), role: 'Padre (Donante de Polen)', strain: plant.strain, name: tr('Padre Donante {name}', { name: plant.strain.name }),
      health: plant.health, clonesCutCount: 0, pollenCollectedMg: 250, savedAt: r.ctx.now,
      traits: [`THC: ${plant.strain.thcPercentage}%`, tr('Terpeno Dominante: {v0}', { v0: Object.keys(plant.strain.terpenes)[0] }), plant.strain.origin ? tr('Landrace de {name}', { name: REGION_BY_ID[plant.strain.origin].name }) : tr('Híbrido adaptable')],
    };
    r.s.mothersFathers.unshift(donor);
    r.s.plotPlants[plot.id] = plants.filter((x) => x !== plant);
    sfx(r, 'levelup');
    addXp(r, 75);
    say(r, tr('♂ {name} guardado en el Santuario de Madres & Padres: ya puedes cruzarlo en Genética (+75 XP).', { name: donor.name }), 'success');
  },

  /* ── nutrition ── */
  /** a solution from the Nutrition lab: the browser sends the recipe (water, litres, doses), the server measures it */
  applyFertigation(r, p) {
    const scope = p.scope === 'all' ? 'all' : 'one';
    const mix = sanitizeMix(p.mix);
    const stage = (p.stage as string) in STAGE_BY_ID ? p.stage as StageId : stageOfProgress(plantAt(r, p.idx).p.progressPercent);
    const medium = (p.medium as string) in MEDIUM_BY_ID ? p.medium as MediumId : 'soil';
    const sol = solve(mix);
    const d = diagnose(sol, stage, medium);
    const e = feedEffect(sol, d);
    return fertigate(r, p.idx, scope, e, d.score, P.opt(p.label, 60) || tr('Receta propia'), P.opt(p.brandName, 40) || undefined);
  },
  /** a brand's feeding table, applied with real chemistry (the old "apply stage" button) */
  applyNutrientStage(r, p) {
    const { p: plant } = plantAt(r, p.idx);
    const brand = NUTRIENT_BRANDS_DATABASE.find((b) => b.id === p.brandId);
    const stage = brand?.stages[P.int(p.stageIndex, 0, 40)];
    if (!brand || !stage) throw new GameError('bad_params');
    const mid = (x: string) => { const v = (x.match(/[\d.]+/g) ?? []).map(Number); return v.length ? v.reduce((a, y) => a + y, 0) / v.length : NaN; };
    const ecMid = mid(stage.targetEc) || 1.8, phMid = mid(stage.targetPh) || 6.2;
    const strength = strengthForEc(stage.dosageMlPerLiter, 'soft', ecMid);
    const base: Mix = { waterId: 'soft', liters: 1, doses: dosesFromTable(stage.dosageMlPerLiter, strength) };
    const corr = phCorrection(base, phMid, 'acid_nitric');
    if (corr.ingredient) base.doses[corr.ingredient] = corr.dose;
    const sol = solve(base);
    const d = diagnose(sol, stageOfProgress(plant.progressPercent), 'soil');
    return fertigate(r, p.idx, 'one', feedEffect(sol, d), d.score, `${brand.name} · ${stage.stageName}`, brand.name);
  },
  /** a table row from the Tables tab: the same mix the tab shows, measured here */
  applyTableMix(r, p) {
    const scope = p.scope === 'all' ? 'all' : 'one';
    const mix = sanitizeMix(p.mix);
    const stage = (p.stage as string) in STAGE_BY_ID ? p.stage as StageId : 'veg_early';
    const medium = (p.medium as string) in MEDIUM_BY_ID ? p.medium as MediumId : 'soil';
    const sol = solve(mix); const d = diagnose(sol, stage, medium);
    return fertigate(r, p.idx, scope, feedEffect(sol, d), d.score, P.opt(p.label, 60) || tr('Receta propia'), P.opt(p.brandName, 40) || undefined);
  },
  challengeXp(r, p) {
    const c = CHALLENGES.find((x) => x.id === p.challengeId);
    if (!c) throw new GameError('bad_params');
    const mix = { ...sanitizeMix(p.mix, c.only), waterId: c.water };
    const sol = solve(mix); const d = diagnose(sol, c.stage, c.medium);
    if (!c.goal(sol, d, mix).ok) no(tr('Todavía no cumple el reto.'));
    if (!once(r, `challenge:${c.id}`)) no(tr('Ese reto ya lo superaste.'));
    addXp(r, c.xp);
    say(r, tr('Reto superado: {title} (+{xp} XP)', { title: c.title, xp: c.xp }), 'success');
    return true;
  },
  quizXp(r, p) {
    const sym = SYMPTOM_BY_ID[P.str(p.symptomId, 40)];
    if (!sym || p.answer !== sym.id) return false;
    if (!once(r, `quiz:${sym.id}`)) return false;
    addXp(r, 12);
    const why = tr('Diagnóstico acertado: {title}', { title: sym.title });
    say(r, `${why} (+12 XP)`, 'success');
    return true;
  },

  /* ── room climate and automation ── */
  switchGrowRoom(r, p) {
    const roomId = P.oneOf(p.roomId, GROW_ROOMS_CONFIG.map((x) => x.id) as GrowRoomId[]);
    sfx(r, 'click');
    r.s.currentRoom = roomId;
    const cfg = GROW_ROOMS_CONFIG.find((x) => x.id === roomId)!;
    if (r.s.indoorPlants.length) {
      const { i, p: x } = plantAt(r, p.idx);
      r.s.indoorPlants[i] = { ...x, currentRoom: roomId, lightSchedule: cfg.recommendedLightSchedule, ppfdLightIntensity: cfg.targetPpfd, luxLumens: Math.round(cfg.targetPpfd * 54), co2Ppm: cfg.targetCo2Ppm };
    }
    say(r, tr('Traslado de sala: {name}. Ajustando microclima a {recommendedLightSchedule} ({targetTempC}°C)', { name: cfg.name, recommendedLightSchedule: cfg.recommendedLightSchedule, targetTempC: cfg.targetTempC }));
  },
  setCo2Ppm(r, p) {
    const ppm = P.num(p.ppm, 300, 1600);
    r.s.co2Ppm = ppm;
    if (r.s.indoorPlants.length) { const { i, p: x } = plantAt(r, p.idx); r.s.indoorPlants[i] = { ...x, co2Ppm: ppm }; }
  },
  toggleAutoWater(r) {
    sfx(r, 'click');
    r.s.autoWaterActive = !r.s.autoWaterActive;
    say(r, tr('Riego Automático: {v0}', { v0: r.s.autoWaterActive ? tr('ACTIVADO (Goteo inteligente cuando sustrato < 45%)') : tr('DESACTIVADO (Manual)') }));
  },
  toggleAutoClimate(r) {
    sfx(r, 'click');
    r.s.autoClimateActive = !r.s.autoClimateActive;
    say(r, tr('Control Climático Autónomo: {v0}', { v0: r.s.autoClimateActive ? tr('ACTIVADO (Termostato / Higrostato PID)') : tr('DESACTIVADO (Manual)') }));
  },
  calibrateMeter(r, p) {
    const meter = P.oneOf(p.meter, ['ph', 'ec', 'par', 'lux'] as const);
    sfx(r, 'click');
    const descriptions = {
      ph: tr('Sonda de pH calibrada con buffer patrón 4.01 / 7.01 (Precisión ±0.01 pH)'),
      ec: tr('Electroconductímetro calibrado en 1413 μS/cm (Lectura exacta mS/cm)'),
      par: tr('Sensor cuántico Quanta nivelado a 180° y calibrado en ePAR 400-750nm'),
      lux: tr('Luxómetro calibrado contra sensor fotométrico CIE (Factor x54)'),
    };
    // XP once a day per meter (it used to be free XP on every click)
    if (once(r, `calibrate:${meter}`, 20)) { addXp(r, 15); say(r, `${descriptions[meter]} (+15 XP)`, 'success'); }
    else say(r, descriptions[meter], 'success');
  },

  /* ── shop ── */
  buySeed(r, p) {
    const seed = seedBankOf(r.s).find((x) => x.id === p.seedId && x.priceFlora > 0);
    if (!seed) throw new GameError('bad_params');
    if ((r.s.seedInventory[seed.id] ?? 0) + seed.seedsPerPack > CAPS.seedsPerKind) no(tr('Ya tienes muchas semillas de esta genética (máximo {n}). Siembra antes de comprar más.', { n: CAPS.seedsPerKind }));
    if (p.currency === 'SOL') paySol(r, seed.priceSol, 'BURN_PATENT', `Yield Bud Empire: Adquisición de Semillas ${seed.name} con SOL`);
    else {
      if (r.ctx.ext().flora < seed.priceFlora) no(tr('Saldo insuficiente: Requiere {priceFlora} $FLORA', { priceFlora: seed.priceFlora }));
      burn(r, 'BURN_PATENT', seed.priceFlora, tr('Yield Bud Empire: Compra de Pack de Semillas ({name})', { name: seed.name }));
    }
    r.s.seedInventory[seed.id] = (r.s.seedInventory[seed.id] ?? 0) + seed.seedsPerPack;
    sfx(r, 'harvest');
    event(r, 'seedbuy', 1);
    addXp(r, 35);
    say(r, tr('¡Pack de {seedsPerPack}x semillas de {name} añadido a tu inventario! (+35 XP)', { seedsPerPack: seed.seedsPerPack, name: seed.name }), 'success');
    return true;
  },
  buySupply(r, p) {
    const supply = suppliesOf(r.s).find((x) => x.id === p.supplyId);
    if (!supply) throw new GameError('bad_params');
    if (supply.installed) no(tr('Este equipo ya está instalado en tu instalación.'));
    if (p.currency === 'SOL') paySol(r, supply.priceSol, 'BURN_REPAIR', `Yield Bud Empire: Compra de Hardware Botánico ${supply.name}`);
    else {
      if (r.ctx.ext().flora < supply.priceFlora) no(tr('Saldo insuficiente: Requiere {priceFlora} $FLORA', { priceFlora: supply.priceFlora }));
      burn(r, 'BURN_REPAIR', supply.priceFlora, tr('Yield Bud Empire: Instalación de Equipo de Cultivo ({name})', { name: supply.name }));
    }
    r.s.installedSupplies.push(supply.id);
    if (supply.category === 'irrigation') r.s.autoWaterActive = true;
    else if (supply.category === 'climate') r.s.autoClimateActive = true;
    else if (supply.category === 'co2') { r.s.co2Ppm = 1200; if (r.s.indoorPlants.length) { const { i, p: x } = plantAt(r, p.idx); r.s.indoorPlants[i] = { ...x, co2Ppm: 1200 }; } }
    boom(r, { particleCount: 60, spread: 70 });
    addXp(r, 60);
    say(r, tr('¡Hardware instalado: {name}! Automatización y sensores activos (+60 XP)', { name: supply.name }), 'success');
    return true;
  },
  buyAsset(r, p) {
    const item = CATALOG_BY_ID[P.str(p.catalogId, 60)];
    if (!item) throw new GameError('bad_params');
    const n = item.kind === 'consumable' ? Math.max(1, Math.min(20, Math.floor(Number(p.qty)) || 1)) : 1;
    if (item.kind === 'license' && item.stationId && ownsStation(r.s.assets, item.stationId)) no(tr('Ya tienes esta licencia.'));
    if (r.s.assets.length + n > CAPS.assets) no(tr('Tu bodega está llena ({n} lotes). Recicla la basura o usa lo que tienes antes de comprar más.', { n: CAPS.assets }));
    const disc = r.ctx.ext().mods.shopDiscount;
    const totalFlora = Math.round(item.priceFlora * n * (1 - disc));
    const totalSol = Number((item.priceSol * n * (1 - disc)).toFixed(3));
    const label = `${n > 1 ? `${n}× ` : ''}${item.name}`;
    if (p.currency === 'SOL') paySol(r, totalSol, 'BURN_PURCHASE', `Yield Bud Empire: Mint NFT ${label}`);
    else {
      if (r.ctx.ext().flora < totalFlora) no(tr('Saldo insuficiente: requiere {totalFlora} $FLORA', { totalFlora }));
      burn(r, 'BURN_PURCHASE', totalFlora, tr('Yield Bud Empire: Mint NFT {label} ({v1})', { label, v1: item.kind === 'consumable' ? 'consumible' : item.kind === 'license' ? 'licencia' : 'equipo' }));
    }
    const slotTaken = r.s.assets.some((a) => a.equipped && CATALOG_BY_ID[a.catalogId]?.category === item.category);
    const equip = item.kind === 'equipment' && (!SINGLE_SLOT.includes(item.category) || !slotTaken);
    for (let k = 0; k < n; k++) r.s.assets.push({ ...newAsset(item.id, { equipped: equip || undefined }), id: r.ctx.uid(`nft-${item.id}`), mintedAt: r.ctx.now });
    if (equip && item.category === 'irrigation') r.s.autoWaterActive = true;
    if (equip && item.category === 'ac') r.s.autoClimateActive = true;
    boom(r, { particleCount: 40, spread: 60 });
    event(r, 'buy', 1);
    addXp(r, item.tier * 15 * n);
    say(r, tr('NFT minteado: {label}{v1}{v2}', { label, v1: equip ? tr(' — instalado') : '', v2: item.kind === 'consumable' ? ` (+${(item.amount ?? 0) * n} ${item.unit})` : '' }), 'success');
    return true;
  },
  setAssetEquipped(r, p) {
    const target = r.s.assets.find((a) => a.id === p.assetId);
    const item = target && CATALOG_BY_ID[target.catalogId];
    if (!target || item?.kind !== 'equipment') throw new GameError('bad_params');
    const equipped = p.equipped === true;
    sfx(r, 'click');
    r.s.assets = r.s.assets.map((a) => {
      if (a.id === target.id) return { ...a, equipped };
      if (equipped && SINGLE_SLOT.includes(item.category) && CATALOG_BY_ID[a.catalogId]?.category === item.category) return { ...a, equipped: false };
      return a;
    });
    if (equipped && item.category === 'irrigation') r.s.autoWaterActive = true;
    if (equipped && item.category === 'ac') r.s.autoClimateActive = true;
  },
  repairAsset(r, p) {
    const asset = r.s.assets.find((a) => a.id === p.assetId);
    const item = asset && CATALOG_BY_ID[asset.catalogId];
    if (!asset || !item || asset.durability === undefined) throw new GameError('bad_params');
    if (asset.durability >= 99) no(tr('Este equipo está como nuevo.'));
    const cost = repairCostOf(asset);
    if (r.ctx.ext().flora < cost) no(tr('Saldo insuficiente: la reparación cuesta {cost} $FLORA', { cost }));
    burn(r, 'BURN_REPAIR', cost, tr('Yield Bud Empire: Reparación de {name} (quema permanente)', { name: item.name }));
    asset.durability = 100;
    say(r, tr('{name} reparado al 100 % ({cost} $FLORA quemados)', { name: item.name, cost }), 'success');
    return true;
  },

  /* ── land plots ── */
  buyPlot(r, p) {
    if (p.currency === 'SOL') no(tr('Las parcelas se compran con $FLORA.'));
    const res = r.ctx.econ<{ plot: { name: string; landRating: number; region: keyof typeof REGION_BY_ID }; cost: number }>('buy_plot', { offerId: P.str(p.offerId, 60) });
    burn(r, 'BURN_PURCHASE', res.cost, tr('Yield Bud Empire Planeta: Mint NFT parcela {name}', { name: res.plot.name }), false);
    boom(r, { particleCount: 90, spread: 80, origin: { y: 0.6 } });
    event(r, 'plot', 1);
    addXp(r, 80);
    say(r, tr('🌎 Parcela minteada: {name} en {v1} · nota {landRating}/10 · 36 plantas', { name: res.plot.name, v1: REGION_BY_ID[res.plot.region].name, landRating: res.plot.landRating }), 'success');
    return true;
  },
  plantPlot(r, p) {
    const { plot, plants } = plotOf(r, p.plotId);
    const seedId = P.str(p.seedId, 90);
    const item = seedItemOf(r.s, seedId);
    if (!item) throw new GameError('bad_params');
    const have = r.s.seedInventory[seedId] ?? 0;
    const taken = new Set(plants.map((x) => x.slotIndex));
    const empty = Array.from({ length: PLOT_SIZE }, (_, i) => i).filter((i) => !taken.has(i));
    const want = p.count === undefined || p.count === null ? empty.length : P.int(p.count, 1, PLOT_SIZE);
    const n = Math.min(want, have, empty.length);
    if (n <= 0) no(empty.length === 0 ? tr('La parcela está llena: cosecha antes de sembrar.') : tr('No tienes semillas de esa genética. Cómpralas en el Banco de Semillas.'));
    const strain = item.strainTemplate;
    const ter = terroirOf(strain.origin, plot.region as never, plot.ratings);
    const now = r.ctx.now;
    const yieldEach = Math.round(item.yieldGramsPerPlant * 0.32 * ter.yield);
    const brand = NUTRIENT_BRANDS_DATABASE.some((b) => b.id === p.brand) ? String(p.brand) : 'advanced_nutrients';
    for (const slot of empty.slice(0, n)) {
      plants.push({
        id: `${plot.id}-s${slot}-${now}`, slotIndex: slot, siteId: plot.id, strain, plantedAt: now, stage: 'seed', progressPercent: 0, health: 100, soilMoisture: 80,
        temperatureC: 24, relativeHumidity: 60, vpdKpa: calculateVpd(24, 60), ppfdLightIntensity: 900, luxLumens: 900 * 54, co2Ppm: 420, currentRoom: 'vegetative', lightSchedule: '24/0',
        ecLevel: 1.6, phLevel: 6.2, nutrientBrand: brand, trichomeMaturity: { clear: 100, milky: 0, amber: 0 }, lastWatered: now, lastFed: now, estimatedDryYieldGrams: yieldEach,
        sex: sexFor(`${plot.id}-s${slot}-${now}`, item.seedType), pollinated: false,
      });
    }
    r.s.seedInventory[seedId] = Math.max(0, have - n);
    sfx(r, 'click');
    event(r, 'plant', n);
    addXp(r, n * 5);
    say(r, tr('🌱 {n} semilla{v1} de {name} en {v3}: {label}. ~{yieldEach} g por planta.', { n, v1: plural(n), name: strain.name, v3: plot.name, label: ter.label, yieldEach }), ter.tone === 'down' ? 'info' : 'success');
    return true;
  },
  waterPlot(r, p) {
    const { plot, plants } = plotOf(r, p.plotId);
    const all = p.all === true;
    const targets = plants.filter((x) => x.stage !== 'ready_harvest' && (all || x.soilMoisture < 60));
    if (targets.length === 0) no(plants.length ? tr('Ninguna planta necesita riego ahora (todas ≥ 60 % de humedad).') : tr('La parcela está vacía.'));
    takeResource(r, 'water', USE.waterPerPlantManual * targets.length);
    const set = new Set(targets);
    sfx(r, 'water');
    r.s.plotPlants[plot.id] = plants.map((x) => (set.has(x) ? { ...x, soilMoisture: Math.min(100, x.soilMoisture + 55), health: Math.min(100, x.health + 3), lastWatered: r.ctx.now } : x));
    event(r, 'water', targets.length);
    addXp(r, targets.length * 3);
    say(r, tr('💧 {length} planta{v1} regada{v1} en {name} ({v3} L)', { length: targets.length, v1: plural(targets.length), name: plot.name, v3: (USE.waterPerPlantManual * targets.length).toFixed(1) }));
  },
  feedPlot(r, p) {
    const { plot, plants } = plotOf(r, p.plotId);
    const targets = plants.filter((x) => x.stage !== 'ready_harvest' && x.ecLevel < 1.6);
    if (targets.length === 0) no(tr('Ninguna planta necesita abono ahora.'));
    takeResource(r, 'nutrient', USE.nutrientPerPlant * targets.length);
    const set = new Set(targets);
    const feedBonus = bestFeedBonus(r.s.assets);
    sfx(r, 'click');
    r.s.plotPlants[plot.id] = plants.map((x) => (set.has(x) ? { ...x, ecLevel: 2.1, phLevel: 6.2, feedBonus, health: Math.min(100, x.health + 5), lastFed: r.ctx.now } : x));
    event(r, 'feed', targets.length);
    addXp(r, targets.length * 4);
    say(r, tr('🧪 {length} planta{v1} abonada{v1} en {name}', { length: targets.length, v1: plural(targets.length), name: plot.name }));
  },
  harvestPlot(r, p) {
    const { plot, plants } = plotOf(r, p.plotId);
    const ready = plants.filter((x) => x.stage === 'ready_harvest');
    if (ready.length === 0) no(tr('Aún no hay plantas listas para cosechar en esta parcela.'));
    let flower = 0, trim = 0, seeds = 0, maleCut = 0;
    const mods = r.ctx.ext().mods;
    for (const x of ready) {
      if (isMale(x)) { maleCut++; continue; }
      const f = Math.round(x.estimatedDryYieldGrams * (x.health / 100) * (1 + mods.plotYield));
      flower += f; trim += Math.round(f * 0.4);
      if (x.pollinated) seeds += giveSeeds(r, x.strain, SEEDS_PER_POLLINATED);
    }
    r.s.plotPlants[plot.id] = plants.filter((x) => x.stage !== 'ready_harvest');
    harvestIn(r, flower, trim, 'plot');
    questProgress(r, 'quest_harvest_run', ready.length);
    event(r, 'harvest', ready.length - maleCut);
    addXp(r, ready.length * 180);
    sfx(r, 'harvest');
    boom(r, { particleCount: 140, spread: 90, origin: { y: 0.6 }, colors: ['#10b981', '#34d399', '#f59e0b', '#a855f7', '#6366f1'] });
    say(r, tr('🌾 Cosecha en {name}: {length} plantas → +{flower} g de flor y +{trim} g de biomasa{v4}{v5}. La parcela queda libre para sembrar.', { name: plot.name, length: ready.length, flower, trim, v4: seeds ? tr(' · 🌰 +{seeds} semillas', { seeds }) : '', v5: maleCut ? tr(' · {maleCut} macho{v1} sin flor', { maleCut, v1: plural(maleCut) }) : '' }), 'success');
  },

  /* ── avatars and profile ── */
  openChest(r, p) {
    if (p.currency === 'SOL') no(tr('Los cofres se abren con $FLORA.'));
    const chest = CHESTS[P.str(p.chestId, 20) as keyof typeof CHESTS];
    if (!chest) throw new GameError('bad_params');
    const res = r.ctx.econ<{ designId: string; isNew: boolean; refund: number; owned: Record<string, unknown> }>('avatar_chest', { chestId: chest.id });
    burn(r, 'BURN_PURCHASE', chest.priceFlora, tr('Yield Bud Empire: {name} (mint de avatar NFT)', { name: chest.name }), false);
    const design = DESIGN_BY_ID[res.designId];
    sfx(r, 'levelup');
    addXp(r, design.rarity === 'legendary' ? 200 : design.rarity === 'epic' ? 80 : 30);
    return res;
  },
  equipAvatar(r, p) {
    const designId = p.designId === null || p.designId === undefined ? null : P.str(p.designId, 40);
    if (designId && !r.ctx.ext().avatars.includes(designId)) no(tr('Ese avatar no es tuyo.'));
    r.s.profile = { ...r.s.profile, avatarNft: designId ?? undefined };
    say(r, designId ? tr('Avatar equipado: {v0}', { v0: DESIGN_BY_ID[designId]?.name ?? designId }) : tr('Avatar NFT desequipado.'), 'success');
  },
  updateProfile(r, p) {
    const u = (p.updates && typeof p.updates === 'object' ? p.updates : {}) as Record<string, unknown>;
    const next = normalizeProfile({ ...r.s.profile, ...u, avatarNft: r.s.profile.avatarNft }, r.s.profile.displayName);
    if ('avatarNft' in u && (u.avatarNft === null || u.avatarNft === undefined)) next.avatarNft = undefined;
    if ('avatarImage' in u && (u.avatarImage === null || u.avatarImage === undefined)) next.avatarImage = undefined;
    r.s.profile = next;
  },

  /* ── lab ── */
  processRawFlower(r, p) {
    const type = P.oneOf(p.type, ['cured_flower', 'live_rosin', 'full_spec_oil', 'pure_terpenes'] as const);
    const grams = P.num(p.grams, 1, 5000);
    if (r.ctx.ext().inventory.flower < grams) no(tr('No tienes suficiente flor cruda (requiere {gramsInput}g)', { gramsInput: grams }));
    const machineId = type === 'pure_terpenes' || type === 'full_spec_oil' ? 'rotovap_extractor' : type === 'cured_flower' ? 'freeze_dryer_subzero' : 'rosin_press_10t';
    const broken = machineBroken(r, machineId);
    if (broken) no(tr('La máquina {name} está averiada (desgaste crítico). ¡Repárala primero quemando $FLORA!', { name: broken.name }));
    sfx(r, 'click');
    wearMachine(r, machineId);
    const labMul = 1 + r.ctx.ext().mods.labYield;
    const strainName = r.s.indoorPlants[0]?.strain.name || strainsOf(r.s)[0].name;
    const spec = {
      live_rosin: { ratio: 0.22, price: 45, name: tr('{currentStrainName} Live Rosin Sin Solventes (90u)', { currentStrainName: strainName }), potency: tr('82.4% THC | 7.8% Terpenos') },
      cured_flower: { ratio: 1, price: 9, name: tr('{currentStrainName} Flor Curada Prémium en Frío', { currentStrainName: strainName }), potency: tr('23.8% THC | 3.2% Terpenos') },
      full_spec_oil: { ratio: 0.4, price: 25, name: tr('{currentStrainName} Aceite Concentrado Full Spectrum', { currentStrainName: strainName }), potency: tr('65.0% Cannabinoides Totales') },
      pure_terpenes: { ratio: 0.08, price: 85, name: tr('Terpenos Puros Aislados de {currentStrainName}', { currentStrainName: strainName }), potency: tr('99.2% Terpenos Volátiles Preservados') },
    }[type];
    const out = Number((grams * labMul * spec.ratio).toFixed(2));
    const value = Math.round(out * ECON.priceScale * spec.price);
    const prod = mintBatch(r, { name: spec.name, type, strainOrigin: strainName, quantityGrams: out, potency: spec.potency, qualityScore: 92 + Math.floor(r.ctx.rng() * 8), marketValueFlora: value }, { grams });
    event(r, 'lab', 1);
    addXp(r, 80);
    say(r, tr('¡Extracción completada! Se crearon {productYieldGrams}g de {name} (Valor: {value} $FLORA, +80 XP)', { productYieldGrams: out, name: spec.name, value }), 'success');
    return prod;
  },
  /** a lab-floor station cycle; the recipe (yield, fee, price) is the server's, the browser only picks it and the grams */
  runLabProcess(r, p) {
    const found = RECIPE_BY_ID[P.str(p.recipeId, 40)];
    if (!found) throw new GameError('bad_params');
    const { recipe, stationId, machineId } = found;
    const grams = P.num(p.grams, recipe.minGrams, recipe.maxGrams);
    const inv = r.ctx.ext().inventory;
    const stock = recipe.inputKind === 'flower' ? inv.flower : inv.trim;
    if (stock < grams) no(tr('No tienes suficiente {v0} (requiere {grams}g)', { v0: recipe.inputKind === 'flower' ? tr('flor seca') : tr('biomasa trim'), grams }));
    const broken = machineBroken(r, machineId);
    if (broken) no(tr('{name} está averiada (desgaste crítico). ¡Repárala primero quemando $FLORA!', { name: broken.name }));
    if (r.ctx.ext().flora < recipe.feeFlora) no(tr('Saldo insuficiente: el ciclo quema {feeFlora} $FLORA', { feeFlora: recipe.feeFlora }));
    takeStation(r, stationId);
    sfx(r, 'click');
    burn(r, 'BURN_PROCESS', recipe.feeFlora, tr('Yield Bud Empire Lab: {label} ({grams}g)', { label: recipe.name, grams }));
    const wear = machinesOf(r.s).find((m) => m.id === machineId)?.wearPercentage ?? 100;
    wearMachine(r, machineId);
    const wearFactor = wear > 60 ? 1 : wear > 40 ? 0.93 : 0.85;
    const strainName = r.s.indoorPlants[0]?.strain.name || strainsOf(r.s)[0].name;
    const out = Number((grams * recipe.yieldRatio * wearFactor).toFixed(2));
    const quality = Math.min(100, Math.round((90 + r.ctx.rng() * 9) * (wear > 40 ? 1 : 0.94)));
    const value = Math.round(out * recipe.pricePerGram * ECON.priceScale);
    const prod = mintBatch(r, { name: `${strainName} · ${recipe.name}`, type: recipe.type, recipeId: recipe.id, strainOrigin: strainName, quantityGrams: out, potency: recipe.potency, qualityScore: quality, marketValueFlora: value }, { grams });
    event(r, 'lab', 1);
    addXp(r, 90);
    say(r, tr('Lote acuñado: {outGrams}g de {label} (valor {value} $FLORA, calidad {quality}%). Se quemaron {feeFlora} $FLORA.', { outGrams: out, label: recipe.name, value, quality, feeFlora: recipe.feeFlora }), 'success');
    return prod;
  },
  certifyProduct(r, p) {
    const prod = r.s.products.find((x) => x.id === p.productId);
    if (!prod || prod.certified) throw new GameError('bad_params');
    if (machineBroken(r, 'hplc_analyzer')) no(tr('El cromatógrafo está averiado. ¡Repáralo primero quemando $FLORA!'));
    if (r.ctx.ext().flora < HPLC_FEE) no(tr('Saldo insuficiente: el análisis quema {feeFlora} $FLORA', { feeFlora: HPLC_FEE }));
    takeStation(r, 'hplc');
    burn(r, 'BURN_PROCESS', HPLC_FEE, tr('Yield Bud Empire Lab: Análisis HPLC de {name}', { name: prod.name }));
    wearMachine(r, 'hplc_analyzer');
    const jitter = (base: number, spread: number) => Number((base + (r.ctx.rng() - 0.5) * spread).toFixed(1));
    const family: Record<string, { thc: number; cbd: number; cbn: number; cbg: number; terpenes: number }> = {
      cured_flower: { thc: 23, cbd: 0.6, cbn: 0.2, cbg: 0.9, terpenes: 2.8 }, preroll: { thc: 22, cbd: 0.6, cbn: 0.3, cbg: 0.8, terpenes: 2.4 },
      cigar: { thc: 30, cbd: 0.5, cbn: 0.3, cbg: 1.0, terpenes: 2.6 }, live_rosin: { thc: 78, cbd: 1.8, cbn: 0.6, cbg: 2.1, terpenes: 7.4 },
      bubble_hash: { thc: 62, cbd: 1.2, cbn: 0.5, cbg: 1.6, terpenes: 5.2 }, kief: { thc: 52, cbd: 1.0, cbn: 0.4, cbg: 1.4, terpenes: 3.9 },
      terpene_sauce: { thc: 68, cbd: 1.4, cbn: 0.4, cbg: 1.8, terpenes: 11.5 }, rso: { thc: 76, cbd: 2.2, cbn: 1.6, cbg: 2.4, terpenes: 1.1 },
      full_spec_oil: { thc: 58, cbd: 4.5, cbn: 0.8, cbg: 2.0, terpenes: 2.2 }, gummies: { thc: 8, cbd: 0.3, cbn: 0.1, cbg: 0.2, terpenes: 0.2 },
      pure_terpenes: { thc: 0.1, cbd: 0, cbn: 0, cbg: 0, terpenes: 97 },
    };
    const base = family[prod.type] ?? family.cured_flower;
    const coa = { thc: jitter(base.thc, 3), cbd: jitter(base.cbd, 0.4), cbn: jitter(base.cbn, 0.2), cbg: jitter(base.cbg, 0.3), terpenes: jitter(base.terpenes, 0.8) };
    Object.assign(prod, { certified: true, coa, coaHash: `COA-${hex(r, 6).toUpperCase()}-${hex(r, 4).toUpperCase()}`, qualityScore: Math.min(100, prod.qualityScore + 2), marketValueFlora: Math.round(prod.marketValueFlora * 1.18) });
    event(r, 'certify', 1);
    addXp(r, 70);
    say(r, tr('Certificado {coaHash} emitido: THC {thc}%, CBD {cbd}% (+18% valor, quema {feeFlora} $FLORA)', { coaHash: prod.coaHash, thc: coa.thc, cbd: coa.cbd, feeFlora: HPLC_FEE }), 'success');
    return { ...prod };
  },
  /** the press mini-game: the browser reports how the press went (bounded to the game's two outcomes) */
  executeManualRosinPress(r, p) {
    const critical = p.result === 'critical';
    if (!critical && p.result !== 'good') throw new GameError('bad_params');
    const grams = 20;
    if (r.ctx.ext().inventory.flower < grams) no(tr('Se requieren al menos {gramsInput}g de flor seca para prensar', { gramsInput: grams }));
    wearMachine(r, 'rosin_press_10t', critical ? 3 : 5);
    const strainName = r.s.indoorPlants[0]?.strain.name || strainsOf(r.s)[0].name;
    const finalGrams = Number((grams * 0.22 * (1 + (critical ? 35 : 15) / 100)).toFixed(2));
    const marketVal = Math.round(finalGrams * (critical ? 65 : 45));
    mintBatch(r, {
      name: critical ? tr('{currentStrainName} Live Rosin 90u (Prensado Crítico Zona Dorada)', { currentStrainName: strainName }) : tr('{currentStrainName} Live Rosin Artesanal (Prensado Manual)', { currentStrainName: strainName }),
      type: 'live_rosin', strainOrigin: strainName, quantityGrams: finalGrams, potency: critical ? tr('86.8% THC | 9.1% Terpenos Puros') : tr('81.4% THC | 7.2% Terpenos'),
      qualityScore: critical ? 99 : 90, marketValueFlora: marketVal,
    }, { grams });
    if (critical) { questProgress(r, 'quest_rosin_gold', 1); addXp(r, 140); } else addXp(r, 70);
    say(r, tr('¡Prensado guardado en inventario! Obtenido +{finalGrams}g de Live Rosin (Valor: {marketVal} $FLORA)', { finalGrams, marketVal }), 'success');
    return true;
  },
  repairMachine(r, p) {
    const m = machinesOf(r.s).find((x) => x.id === p.machineId);
    if (!m) throw new GameError('bad_params');
    if (r.ctx.ext().flora < m.repairCostFlora) no(tr('Saldo insuficiente: Requiere {repairCostFlora} $FLORA para reparar', { repairCostFlora: m.repairCostFlora }));
    burn(r, 'BURN_REPAIR', m.repairCostFlora, tr('Yield Bud Empire: Mantenimiento y Restauración de {name}', { name: m.name }));
    const w = r.s.machines.find((x) => x.id === m.id);
    if (w) w.wearPercentage = 100; else r.s.machines.push({ id: m.id, wearPercentage: 100 });
    questProgress(r, 'quest_machine_repair', 1);
    addXp(r, 120);
    say(r, tr('¡{name} reparada al 100%! Se quemaron {repairCostFlora} $FLORA de forma permanente (+120 XP)', { name: m.name, repairCostFlora: m.repairCostFlora }), 'burn');
    return true;
  },
  forgeCraft(r, p) {
    const rec = FORGE_RECIPE_BY_ID[P.str(p.recipeId, 40)];
    if (!rec) throw new GameError('bad_params');
    const qty = P.int(p.qty, 1, 10);
    const ext = r.ctx.ext();
    const check = canCraft({ flower: ext.inventory.flower, trim: ext.inventory.trim, materials: ext.inventory.materials, flora: ext.flora, tier: ext.tier, hasForge: ownsStation(r.s.assets, 'forge'), jobs: ext.forgeJobs.length, extraJobs: ext.empire?.perks.forgeJobs ?? 0 }, rec, qty);
    if (!check.ok) no(check.message);
    takeStation(r, 'forge');
    const t = craftTotals(rec, qty);
    sfx(r, 'click');
    r.ctx.econ('forge_start', { recipe: rec.id, qty });
    burn(r, 'BURN_PROCESS', t.fee, tr('Yield Bud Empire Forja: {name} ×{qty}', { name: rec.name, qty }), false);
    say(r, tr('Forja: {name} ×{qty} en marcha ({minutes} min). Se quemaron {fee} $FLORA.', { name: rec.name, qty, minutes: t.minutes, fee: t.fee }), 'success');
    return true;
  },
  crossBreed(r, p) {
    const mother = r.s.mothersFathers.find((m) => m.id === p.motherId);
    const father = r.s.mothersFathers.find((m) => m.id === p.fatherId);
    if (!mother || !father) no(tr('Selecciona una Madre y un Padre válidos.'));
    const useReagent = p.useReagent === true;
    const ext = r.ctx.ext();
    const check = canBreed({ tier: ext.tier, hasChamber: ownsStation(r.s.assets, 'breeding'), jobs: r.s.breedingJobs.length, materials: ext.inventory.materials, extraJobs: ext.empire?.perks.breedingJobs ?? 0 }, mother!.id, father!.id, useReagent);
    if (!check.ok) no(check.message);
    if (ext.flora < CHAMBER_FEE) no(tr('Saldo insuficiente: el cruce quema {fee} $FLORA', { fee: CHAMBER_FEE }));
    takeStation(r, 'breeding');
    const generation = capGeneration(Math.max(mother!.generation ?? 1, father!.generation ?? 1));
    r.ctx.econ('consume', { items: Object.fromEntries(Object.entries(breedingCost(useReagent)).map(([m, n]) => [`mat:${m}`, n])) });
    burn(r, 'BURN_PROCESS', CHAMBER_FEE, tr('Yield Bud Empire Cría: cruce en cámara {v0}', { v0: lineageLabel(mother!.strain, father!.strain, generation) }));
    const now = r.ctx.now;
    const name = P.opt(p.name, CAPS.strainName).trim() || `${mother!.strain.name} x ${father!.strain.name}`.slice(0, CAPS.strainName);
    r.s.breedingJobs.push({ id: r.ctx.uid('bj'), motherId: mother!.id, fatherId: father!.id, generation, useReagent, seed: Math.floor(r.ctx.rng() * 2 ** 32) >>> 0, name, startedAt: now, endsAt: now + CROSS_MINUTES * 60_000 });
    say(r, tr('Cría: cruce en cámara de {name} x {v1} en marcha ({v2} h). Se quemaron {CHAMBER_FEE} $FLORA.', { name: donorName(mother!), v1: donorName(father!), v2: Math.round(CROSS_MINUTES / 60), CHAMBER_FEE }), 'success');
    return true;
  },

  /* ── genetics lab ── */
  breedStrains(r, p) {
    const all = strainsOf(r.s);
    const a = all.find((x) => x.id === p.parentAId), b = all.find((x) => x.id === p.parentBId);
    if (!a || !b) throw new GameError('bad_params');
    const left = onceLeftHours(r, 'breedStrains', 2);
    if (left > 0) no(tr('El laboratorio genético está ocupado: el próximo cruce se puede hacer en {v0}.', { v0: fmtH(left) }));
    if (r.s.customStrains.length >= CAPS.strains) no(tr('Tu banco de genéticas está lleno ({n}).', { n: CAPS.strains }));
    once(r, 'breedStrains', 2);
    sfx(r, 'harvest');
    const rnd = () => r.ctx.rng();
    const avg = (x: number, y: number) => (x + y) / 2;
    const strain: Strain = {
      id: r.ctx.uid('strain-hybrid'), name: P.opt(p.name, CAPS.strainName).trim() || tr('Gen {v0} x {v1}', { v0: a.name.slice(0, 4), v1: b.name.slice(0, 4) }),
      lineage: `${a.name} x ${b.name}`, type: 'Híbrido',
      thcPercentage: Math.min(32, Math.max(16, Number((avg(a.thcPercentage, b.thcPercentage) + (rnd() * 2 - 0.5)).toFixed(1)))),
      cbdPercentage: Math.max(0.2, Number((avg(a.cbdPercentage, b.cbdPercentage) + (rnd() * 0.8 - 0.2)).toFixed(1))),
      terpenes: {
        myrcene: Number(avg(a.terpenes.myrcene, b.terpenes.myrcene).toFixed(2)), limonene: Number(avg(a.terpenes.limonene, b.terpenes.limonene).toFixed(2)),
        caryophyllene: Number(avg(a.terpenes.caryophyllene, b.terpenes.caryophyllene).toFixed(2)), pinene: Number(avg(a.terpenes.pinene, b.terpenes.pinene).toFixed(2)),
        linalool: Number(avg(a.terpenes.linalool, b.terpenes.linalool).toFixed(2)),
      },
      difficulty: 'Maestro', cycleDurationSeconds: Math.round(avg(a.cycleDurationSeconds, b.cycleDurationSeconds)),
      // the resin bonus never compounds past the ceiling the harvest cap assumes
      resinYieldMultiplier: Math.min(MAX_RESIN_MULT, Number((Math.max(a.resinYieldMultiplier, b.resinYieldMultiplier) * 1.15).toFixed(2))),
      colorTheme: '#ec4899',
      description: tr('Cruzamiento genético experimental desarrollado en el laboratorio Yield Bud Empire entre {name} y {v1}.', { name: a.name, v1: b.name }),
    };
    r.s.customStrains.push(strain);
    questProgress(r, 'quest_genomic_breed', 1);
    event(r, 'breed', 1);
    addXp(r, 220);
    say(r, tr('¡Nueva genética creada con éxito: {name}! (+220 XP)', { name: strain.name }), 'success');
    return strain;
  },
  registerPatent(r, p) {
    const strain = strainsOf(r.s).find((x) => x.id === p.strainId);
    if (!strain) throw new GameError('bad_params');
    if (strain.isPatented) no(tr('Esta genética ya está patentada.'));
    if (r.s.patents.length >= CAPS.patents) no(tr('Llegaste al máximo de patentes ({n}).', { n: CAPS.patents }));
    if (r.ctx.ext().flora < 250) no(tr('Saldo insuficiente: registrar una patente genómica requiere quemar 250 $FLORA'));
    burn(r, 'BURN_PATENT', 250, tr('Registro de patente genómica ({name})', { name: strain.name }));
    const wallet = P.opt(p.wallet, 60);
    const pat: GenomicPatent = {
      id: r.ctx.uid('pat'), strainName: strain.name, patentNumber: `SOL-PAT-${Math.floor(1000 + r.ctx.rng() * 9000)}-CF`, solanaSignature: r.s.transactions[0]?.signature ?? '',
      parentA: strain.lineage.split(' x ')[0] || tr('Genética Silvestre'), parentB: strain.lineage.split(' x ')[1] || tr('Cultivar Solana'),
      creatorWallet: wallet ? `${wallet.slice(0, 4)}...${wallet.slice(-4)}` : '—', registeredDate: new Date(r.ctx.now).toISOString().split('T')[0],
      thc: strain.thcPercentage, cbd: strain.cbdPercentage, dominantTerpene: 'Limoneno y Cariofileno', floraBurnedFee: 250,
    };
    r.s.patents.unshift(pat);
    r.s.patentMarks[strain.id] = pat.patentNumber;
    boom(r, { particleCount: 90, spread: 80, origin: { y: 0.5 }, colors: ['#3b82f6', '#10b981', '#f59e0b'] });
    questProgress(r, 'quest_genomic_breed', 1);
    event(r, 'patent', 1);
    addXp(r, 300);
    say(r, tr('¡Patente {patentNumber} registrada! Se quemaron 250 $FLORA (+300 XP)', { patentNumber: pat.patentNumber }), 'burn');
    return true;
  },
  saveCurrentPlantAsMotherOrFather(r, p) {
    const { p: plant } = plantAt(r, p.idx);
    const role = P.oneOf(p.role, ['Madre (Esquejes / Clones)', 'Padre (Donante de Polen)'] as const);
    if (r.s.mothersFathers.length >= CAPS.donors) no(tr('El Santuario está lleno ({n} ejemplares). Libera espacio antes de guardar otro.', { n: CAPS.donors }));
    if (!once(r, `donor:${plant.id}:${plant.plantedAt}`)) no(tr('Esta planta ya está guardada en el Santuario.'));
    const donor: MotherFatherPlant = {
      id: r.ctx.uid('donor'), role, strain: plant.strain, name: `${role.includes('Madre') ? tr('Madre Élite') : tr('Padre Donante')} ${plant.strain.name}`,
      health: plant.health, clonesCutCount: 0, pollenCollectedMg: role.includes('Padre') ? 250 : 0, savedAt: r.ctx.now,
      traits: [`THC: ${plant.strain.thcPercentage}%`, tr('Terpeno Dominante: {v0}', { v0: Object.keys(plant.strain.terpenes)[0] }), tr('Resistencia a plagas')],
    };
    r.s.mothersFathers.unshift(donor);
    sfx(r, 'levelup');
    addXp(r, 75);
    say(r, tr('¡{name} guardado en el Santuario de Madres & Padres! (+75 XP)', { name: donor.name }), 'success');
    return true;
  },
  takeCloneFromMother(r, p) {
    const mother = r.s.mothersFathers.find((m) => m.id === p.motherId);
    if (!mother) throw new GameError('bad_params');
    const left = onceLeftHours(r, `clone:${mother.id}`, 4);
    if (left > 0) no(tr('Esta madre necesita reponerse: el próximo esqueje se puede cortar en {v0}.', { v0: fmtH(left) }));
    const { i } = plantAt(r, p.idx);
    once(r, `clone:${mother.id}`, 4);
    mother.clonesCutCount += 1;
    sfx(r, 'harvest');
    addXp(r, 40);
    plantInSlot(r, i, mother.strain);
    say(r, tr('¡Esqueje enraizado cortado de {name}! Plantado exitosamente (+40 XP)', { name: mother.name }), 'success');
    return true;
  },
  collectPollenFromFather(r, p) {
    const father = r.s.mothersFathers.find((m) => m.id === p.fatherId);
    if (!father) throw new GameError('bad_params');
    const left = onceLeftHours(r, `pollen:${father.id}`, 6);
    if (left > 0) no(tr('Este padre todavía no tiene polen maduro: vuelve en {v0}.', { v0: fmtH(left) }));
    once(r, `pollen:${father.id}`, 6);
    const mg = 150;
    father.pollenCollectedMg = Math.min(5000, father.pollenCollectedMg + mg);
    sfx(r, 'click');
    addXp(r, 35);
    say(r, tr('Se recolectaron +{collectedMg}mg de polen fértil de {name} (+35 XP)', { collectedMg: mg, name: father.name }), 'success');
    return mg;
  },
  /** quick cross: uses the father's pollen (150 mg) and gives a pack of F1 seeds */
  hybridizeParents(r, p) {
    const mother = r.s.mothersFathers.find((m) => m.id === p.motherId);
    const father = r.s.mothersFathers.find((m) => m.id === p.fatherId);
    if (!mother || !father) no(tr('Selecciona una Madre receptora y un Padre donante de polen válidos.'));
    if (mother!.id === father!.id) no(tr('Debes seleccionar dos individuos distintos para cruzar.'));
    if (father!.pollenCollectedMg < 150) no(tr('{name} no tiene polen suficiente (150 mg). Recolecta polen antes de cruzar.', { name: father!.name }));
    if (r.s.customStrains.length >= CAPS.strains) no(tr('Tu banco de genéticas está lleno ({n}).', { n: CAPS.strains }));
    father!.pollenCollectedMg -= 150;
    const name = P.opt(p.name, CAPS.strainName).trim() || `${mother!.strain.name} x ${father!.strain.name}`.slice(0, CAPS.strainName);
    const strain = ACTIONS.breedStrainsFree(r, { a: mother!.strain, b: father!.strain, name }) as Strain;
    const seedId = `hybrid_seed_${strain.id}`;
    const item: SeedBankItem = {
      id: seedId, name: tr('{name} (F1 Hybrid)', { name: strain.name }), breeder: `${r.s.brand.name} Lab Master`, seedType: 'Regular',
      lineage: `${mother!.strain.name} x ${father!.strain.name}`, thcPercentage: strain.thcPercentage, cbdPercentage: strain.cbdPercentage,
      floweringWeeks: 9, yieldGramsPerPlant: 165, difficulty: 'Avanzado', dominantTerpenes: [tr('Mirceno'), tr('Limoneno'), tr('Cariofileno')],
      priceFlora: 0, priceSol: 0, description: tr('Cruzamiento botánico F1 estabilizado entre {name} y {v1}.', { name: mother!.strain.name, v1: father!.strain.name }),
      seedsPerPack: 5, imageTheme: 'emerald', inStock: true, strainTemplate: strain,
    };
    r.s.customSeeds.unshift(item);
    r.s.seedInventory[seedId] = Math.min(CAPS.seedsPerKind, 5 + r.ctx.ext().mods.seedBonus);
    boom(r, { particleCount: 150, spread: 100 });
    addXp(r, 160);
    say(r, tr('¡Hibridación F1 Completada! Se generaron 5 semillas exclusivas de "{name}" en tu inventario (+160 XP)', { name: strain.name }), 'success');
    return strain;
  },
  /** internal: the hybrid strain of a quick cross (not callable from the browser, see PUBLIC) */
  breedStrainsFree(r, p) {
    const a = p.a as Strain, b = p.b as Strain;
    const rnd = () => r.ctx.rng();
    const strain: Strain = {
      id: r.ctx.uid('strain-hybrid'), name: String(p.name), lineage: `${a.name} x ${b.name}`, type: 'Híbrido',
      thcPercentage: Math.min(32, Math.max(16, Number(((a.thcPercentage + b.thcPercentage) / 2 + (rnd() * 2 - 0.5)).toFixed(1)))),
      cbdPercentage: Math.max(0.2, Number(((a.cbdPercentage + b.cbdPercentage) / 2 + (rnd() * 0.8 - 0.2)).toFixed(1))),
      terpenes: { ...a.terpenes }, difficulty: 'Maestro', cycleDurationSeconds: Math.round((a.cycleDurationSeconds + b.cycleDurationSeconds) / 2),
      resinYieldMultiplier: Math.min(MAX_RESIN_MULT, Number((Math.max(a.resinYieldMultiplier, b.resinYieldMultiplier) * 1.15).toFixed(2))),
      colorTheme: '#ec4899', description: tr('Cruzamiento genético experimental desarrollado en el laboratorio Yield Bud Empire entre {name} y {v1}.', { name: a.name, v1: b.name }),
    };
    r.s.customStrains.push(strain);
    questProgress(r, 'quest_genomic_breed', 1);
    event(r, 'breed', 1);
    return strain;
  },

  /* ── brand, dispensary, V2P ── */
  updateBrand(r, p) {
    r.s.brand = { ...r.s.brand, name: P.opt(p.name, CAPS.brandName).trim() || r.s.brand.name, tagline: P.opt(p.tagline, CAPS.tagline) };
    say(r, tr('Marca virtual actualizada correctamente'));
  },
  sellProduct(r, p) {
    const prod = r.s.products.find((x) => x.id === p.productId);
    if (!prod || prod.type === 'v2p_merch') throw new GameError('bad_params');
    const res = r.ctx.econ<{ gross: number; fee: number; net: number; ratio: number }>('sell', { type: prod.type, recipe: prod.recipeId, grams: prod.quantityGrams });
    sfx(r, 'harvest');
    r.s.products = r.s.products.filter((x) => x.id !== prod.id);
    r.s.brand = { ...r.s.brand, totalSalesFlora: r.s.brand.totalSalesFlora + res.gross, reputation: Math.min(100, r.s.brand.reputation + 1) };
    event(r, 'sell', 1);
    burn(r, 'BURN_PROCESS', res.fee, tr('Yield Bud Empire Dispensario: comisión y licencia ({name})', { name: prod.name }), false);
    const sat = res.ratio < 0.8 ? tr(' · el mercado está saturado: pagó al {v0} % del precio', { v0: Math.round(res.ratio * 100) }) : '';
    say(r, tr('¡Venta realizada en el Dispensario! Recibiste +{net} $FLORA (comisión y licencia {fee} quemados{sat})', { net: res.net, fee: res.fee, sat }), 'success');
    return res;
  },
  redeemV2p(r, p) {
    const item = v2pItemsOf(r.s).find((x) => x.id === p.itemId);
    if (!item) throw new GameError('bad_params');
    if (r.ctx.ext().dev) no(tr('Las cuentas de desarrollador no pueden canjear productos reales con $FLORA.'));
    if (r.ctx.ext().flora < item.requiredFlora) no(tr('Saldo insuficiente: Requiere {requiredFlora} $FLORA para canjear este producto físico', { requiredFlora: item.requiredFlora }));
    if (item.stockPhysical <= 0) no(tr('Agotado temporalmente en el almacén físico'));
    const name = P.opt(p.name, 60), country = P.opt(p.country, 40);
    burn(r, 'V2P_CLAIM', item.requiredFlora, tr('Yield Bud Empire: Canje Físico V2P ({title}) a {country}', { title: item.title, country }));
    r.s.v2pStock[item.id] = item.stockPhysical - 1;
    const def = INITIAL_V2P_ITEMS.find((x) => x.id === item.id)!;
    r.s.redeemed.unshift({ item: { ...def }, timestamp: r.ctx.now, txSig: r.s.transactions[0]?.signature ?? '', recipient: `${name} (${country})` });
    r.s.redeemed = r.s.redeemed.slice(0, CAPS.redeemed);
    r.s.brand = { ...r.s.brand, totalV2pShipped: r.s.brand.totalV2pShipped + 1 };
    boom(r, { particleCount: 120, spread: 90, origin: { y: 0.5 } });
    say(r, tr('¡Orden V2P confirmada! Se quemaron {requiredFlora} $FLORA. Certificado emitido', { requiredFlora: item.requiredFlora }), 'success');
    return true;
  },

  /** a UFO over the planet: a little XP, three times a day */
  ufoCaught(r) {
    const day = Math.floor(r.ctx.now / 86400000);
    const n = [1, 2, 3].find((i) => r.s.once[`ufo:${day}:${i}`] === undefined);
    if (!n) return 0;
    r.s.once[`ufo:${day}:${n}`] = r.ctx.now;
    addXp(r, 40);
    return 40;
  },

  /* ── relics: the weekly activity chest and the relics it gives ── */
  openActivityChest(r) {
    r.s.activity = rollWeek(r.s.activity, r.ctx.now);
    if (r.s.activity.pending <= 0) no(tr('No tienes cofres de actividad por abrir. Juega esta semana para ganar uno.'));
    const res = r.ctx.econ<{ relic: Relic }>('relic_chest', {});
    r.s.activity = { ...r.s.activity, pending: r.s.activity.pending - 1, opened: r.s.activity.opened + 1 };
    sfx(r, 'levelup');
    const type = RELIC_TYPE_BY_ID[res.relic.typeId];
    say(r, tr('Reliquia acuñada: {name} ({rarity}). Equípala o véndela en el Maletín → Reliquias.', { name: type?.name ?? res.relic.typeId, rarity: RELIC_RARITY_LABEL[res.relic.rarity] ?? res.relic.rarity }), 'success');
    return res.relic;
  },
  equipRelic(r, p) { r.ctx.econ('relic_equip', { relicId: P.str(p.relicId, 80), on: true }); sfx(r, 'click'); },
  unequipRelic(r, p) { r.ctx.econ('relic_equip', { relicId: P.str(p.relicId, 80), on: false }); sfx(r, 'click'); },
  meltRelic(r, p) {
    const res = r.ctx.econ<{ materials: Record<string, number> }>('relic_melt', { relicId: P.str(p.relicId, 80) });
    sfx(r, 'burn');
    say(r, tr('Reliquia fundida: recibiste {what}.', { what: Object.entries(res.materials).map(([m, n]) => `${n}× ${MATERIAL_BY_ID[m as MaterialId]?.name ?? m}`).join(', ') }), 'info');
    return res.materials;
  },

  /* ── progress ── */
  claimQuestReward(r, p) {
    const q = questsOf(r.s).find((x) => x.id === p.questId);
    if (!q || !q.isCompleted || q.isClaimed) no(tr('Esa misión todavía no se puede reclamar.'));
    const res = r.ctx.econ<{ amount: number }>('reward', { kind: 'quest', id: q!.id });
    const prog = r.s.quests.find((x) => x.id === q!.id)!;
    prog.isClaimed = true;
    sfx(r, 'quest');
    addXp(r, q!.rewardXp);
    say(r, tr('¡Recompensa reclamada! +{rewardFlora} $FLORA y +{rewardXp} XP', { rewardFlora: res.amount, rewardXp: q!.rewardXp }), 'success');
    return true;
  },
  claimStoryMission(r, p) {
    const c = claimStory(r.s.missions, P.str(p.id, 60));
    if (!c) return null;
    r.s.missions = c.state;
    grantReward(r, c.reward, tr(c.title));
    return tr(c.say);
  },
  claimErrandMission(r, p) {
    const c = claimErrand(r.s.missions, P.str(p.npc, 20) as never, r.ctx.now);
    if (!c) return null;
    r.s.missions = c.state;
    grantReward(r, c.reward, tr(c.title));
    return tr(c.say);
  },
  startTutorial(r) { r.s.tutorial = startTut(r.s.tutorial, r.s.missions); },
  claimTutorialStep(r) {
    const c = claimStep(r.s.tutorial, r.s.missions);
    if (!c) return null;
    r.s.tutorial = c.state;
    const stepId = c.state.claimed[c.state.claimed.length - 1];
    // restarting the guide replays it, but each step pays once
    if (!r.s.tutorialPaid.includes(stepId)) { r.s.tutorialPaid.push(stepId); grantReward(r, c.reward, tr(c.title)); }
    return tr(c.say);
  },
  skipTutorialStep(r) { r.s.tutorial = skipStep(r.s.tutorial, r.s.missions); },
  patchTutorial(r, p) {
    const t = { ...r.s.tutorial };
    if (typeof p.dismissed === 'boolean') t.dismissed = p.dismissed;
    if (typeof p.minimized === 'boolean') t.minimized = p.minimized;
    r.s.tutorial = t;
  },
  /** moments only the interface sees (opening a tab, the bag, the planet, the gauges): they count for the guide */
  reportEvent(r, p) {
    const ev = P.oneOf(p.event, ['visit', 'planet', 'openbag', 'gauges'] as const);
    event(r, ev as MissionEvent, 1);
  },

  /* ── economy actions with their game side (XP, history) ── */
  upgradeFacility(r, p) {
    const target = INITIAL_FACILITIES.find((f) => f.id === p.facilityId);
    if (!target) throw new GameError('bad_params');
    const ext = r.ctx.ext();
    if (target.tier <= ext.tier) no(target.tier < ext.tier ? tr('{name} ya la superaste: tu instalación actual es mejor.', { name: target.name }) : tr('Esa es tu instalación actual.'));
    if (target.minEmpireRank && (ext.empire?.rank ?? 1) < target.minEmpireRank) no(tr('{name} pide rango de imperio {rank}. Súbelo cosechando, vendiendo y creciendo.', { name: target.name, rank: target.minEmpireRank }));
    const res = r.ctx.econ<{ hours: number; cost: number }>('start_build', { facilityId: target.id });
    burn(r, 'BURN_SPEEDUP', res.cost ?? target.costFlora, tr('Yield Bud Empire: Obra de {name}', { name: target.name }), false);
    const h = res.hours;
    say(r, tr('¡Obra iniciada: {name}! Tardará {v1}. Puedes seguir cultivando mientras tanto.', { name: target.name, v1: h >= 24 ? tr('{v0} días', { v0: Math.round(h / 24 * 10) / 10 }) : `${h} h` }), 'success');
  },
  speedUpConstruction(r) {
    const res = r.ctx.econ<{ cutMs: number; cost: number; left: number }>('speedup_build', {});
    const cutH = Math.round(res.cutMs / 360000) / 10;
    burn(r, 'BURN_SPEEDUP', res.cost, tr('Yield Bud Empire: Aceleración de obra (−{cutH} h)', { cutH }), false);
    say(r, tr('Obra acelerada: −{cutH} h por {cost} $FLORA quemados. Te quedan {left} aceleraciones hoy.', { cutH, cost: res.cost, left: res.left }), 'burn');
    return true;
  },
  hireCandidate(r, p) {
    const res = r.ctx.econ<{ staff: StaffNft; cost: number }>('hire', { candidateId: P.str(p.candidateId, 60) });
    burn(r, 'BURN_PURCHASE', res.cost, tr('Yield Bud Empire: Mint NFT de personal ({label} {name})', { label: ROLE_INFO[res.staff.role].label, name: res.staff.name }), false);
    boom(r, { particleCount: 70, spread: 70, origin: { y: 0.6 } });
    say(r, tr('¡{name} se une como {label}! Asígnale su puesto en el Maletín → Plantilla.', { name: res.staff.name, label: ROLE_INFO[res.staff.role].label }), 'success');
    return res.staff;
  },
  openStaffChest(r, p) {
    const chest = STAFF_CHESTS[P.str(p.chestId, 20) as keyof typeof STAFF_CHESTS];
    if (!chest) throw new GameError('bad_params');
    const res = r.ctx.econ<{ staff: StaffNft }>('staff_chest', { chestId: chest.id });
    burn(r, 'BURN_PURCHASE', chest.priceFlora, tr('Yield Bud Empire: {name}', { name: chest.name }), false);
    return res.staff;
  },
  assignStaff(r, p) {
    const role = P.str(p.role, 20) as StaffRole;
    const staffId = p.staffId === null || p.staffId === undefined ? null : P.str(p.staffId, 60);
    const res = r.ctx.econ<{ staff?: StaffNft }>('assign', { role, staffId });
    if (res.staff) say(r, tr('{name} ocupa el puesto de {label} · sueldo {v2} $FLORA/día', { name: res.staff.name, label: ROLE_INFO[role].label, v2: wageOf(res.staff) }), 'success');
  },
  rankUpStaff(r, p) {
    const res = r.ctx.econ<{ staff: StaffNft; cost: number }>('rank_up', { staffId: P.str(p.staffId, 60) });
    burn(r, 'BURN_PURCHASE', res.cost, tr('Yield Bud Empire: Ascenso de {name} a rango {v1}', { name: res.staff.name, v1: res.staff.rank }), false);
    say(r, tr('{name} asciende a rango {rank}. Su sueldo sube a {v2} $FLORA/día.', { name: res.staff.name, rank: res.staff.rank, v2: wageOf(res.staff) }), 'success');
    return true;
  },
  claimDaily(r) {
    const res = r.ctx.econ<{ amount: number }>('claim_daily', {});
    pushTx(r, { type: 'AIRDROP', amountFlora: res.amount, amountSol: 0, memo: `Yield Bud Empire: reclamo diario +${res.amount} $FLORA` });
    say(r, tr('Reclamo diario: +{amount} $FLORA. Vuelve mañana; lo demás se gana cultivando.', { amount: res.amount }), 'success');
    return res;
  },
  openGift(r, p) { return r.ctx.econ('open_gift', { giftId: p.giftId }); },
  listNft(r, p) {
    const res = r.ctx.econ<{ listingId: number; price: number }>('list', { nftId: p.nftId, designId: p.designId, price: p.price });
    say(r, tr('Puesto en el mercado por {price} $FLORA. Queda en depósito hasta que se venda o lo retires.', { price: res.price }), 'success');
    return true;
  },
  cancelListing(r, p) {
    r.ctx.econ('cancel_listing', { listingId: p.listingId });
    say(r, tr('Oferta retirada: el NFT vuelve a tu colección.'), 'success');
    return true;
  },
  buyListing(r, p) {
    const res = r.ctx.econ<{ kind: string; nftId: string; price: number; fee: number; data: Record<string, unknown> }>('buy_listing', { listingId: p.listingId });
    burn(r, 'BURN_PROCESS', res.fee, tr('Mercado entre jugadores: comisión de la venta'), false);
    say(r, tr('¡Compra hecha! −{price} $FLORA (la comisión de {fee} se quema).', { price: res.price, fee: res.fee }), 'success');
    return res;
  },
};

/** actions the browser may ask for (the rest are internal helpers) */
export const PUBLIC = new Set(Object.keys(ACTIONS).filter((k) => k !== 'breedStrainsFree'));

/** actions the browser can't predict (they need the server's tables or dice): it sends them and waits */
export const SERVER_ONLY = new Set([
  'buyPlot', 'openChest', 'upgradeFacility', 'speedUpConstruction', 'hireCandidate', 'openStaffChest', 'assignStaff', 'rankUpStaff',
  'claimDaily', 'openGift', 'listNft', 'cancelListing', 'buyListing', 'claimQuestReward',
  'openActivityChest', 'equipRelic', 'unequipRelic', 'meltRelic',
]);

export { stockOf };
