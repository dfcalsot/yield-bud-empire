import { maxProgressFrom, stageOf } from './phases';
import type { GrowStage, PestKind, PlantInGrow, RegionId, Strain } from '../types';
import { BALANCE as B, LIGHT_FRACTION } from './balance';
import { hash01 } from './hash';
import { averageLight, REGION_BY_ID, terroirOf, type PlotRatings, type SiteConditions } from './terroir';
import { phGrowthFactor } from './nutrition';
import { t as tr, k, localize } from '../i18n/core';

export { hash01 };

/**
 * Pure real-time simulation of the grow room. No React, no globals: the live tick, the
 * offline catch-up and the node tests all call the same functions.
 */

// Calculate Vapor Pressure Deficit (VPD) in kPa
export function calculateVpd(tempC: number, rhPercent: number): number {
  // Saturation Vapor Pressure (Tetens formula)
  const svp = 0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  const avp = svp * (rhPercent / 100);
  const vpd = svp - avp;
  return Math.max(0.1, Number(vpd.toFixed(2)));
}

/** Installed equipment, as numbers (see economy/catalog.ts equipStatsOf). */
export interface EquipInput {
  lampWatts: number;
  lampMaxPpfd: number;
  acKw: number;
  pumpKw: number;
  solarKw: number;
  waterPerPlantAuto: number;
}

/** Consumable stock the simulation may spend (mutated by advanceWorld; the caller applies the difference). */
export interface Budget {
  waterL: number;
  energyKwh: number;
  /** optional stocks, only needed when a gardener is hired */
  nutrientMl?: number;
  treatMl?: Partial<Record<PestKind, number>>;
  /** days of contract left; ticks down with every simulated chunk that has plants */
  gardenerDays?: number;
}

/** What the hired gardener does (level 1: water + feed, level 2: also treats plagues). */
export interface GardenerInput { water: boolean; feed: boolean; treat: boolean; feedBonus: number }

export const PEST_INFO: Record<PestKind, { label: string; emoji: string; cause: string; cure: string }> = localize<Record<PestKind, { label: string; emoji: string; cause: string; cure: string }>>({
  mites: { label: k('Ácaros'), emoji: '🕷️', cause: k('calor, aire seco y sala sucia'), cure: k('Aceite de Neem') },
  mold: { label: k('Moho'), emoji: '🍄', cause: k('humedad alta, sobre todo en floración'), cure: k('Fungicida Bacillus') },
  rot: { label: k('Pudrición de raíz'), emoji: '🦠', cause: k('sustrato encharcado'), cure: k('Trichoderma') },
}, ['label', 'cause', 'cure']);

export interface SimEnv {
  autoWater: boolean;
  autoClimate: boolean;
  facilityBonus: number;
  /** global CO2 fallback when a plant has none */
  co2Ppm: number;
  /** 0 = lamps off (no energy), 1 = lamps on. Ignored when `equip` is given (derived from electricity). */
  lightOn: number;
  getRoomTarget: (roomId: string | undefined) => { tempC: number; rh: number } | undefined;
  /** when present, lamps/AC/pumps draw electricity from `budget` and auto-drip spends water */
  equip?: EquipInput;
  budget?: Budget;
  /** 0–100 gardener rating of the room: the dirtier, the more plagues */
  cleanliness?: number;
  /** active gardener contract */
  gardener?: GardenerInput;
  /** outdoor plots: conditions at an instant for a plot id (undefined = unknown plot → treated as indoor) */
  site?: (siteId: string, nowMs: number) => SiteConditions | undefined;
  /** absolute time (ms) at the start of this advance; only needed when `site` is used */
  clockMs?: number;
  /** set by advanceWorld for plants on a plot: the conditions of this chunk */
  siteCond?: SiteConditions;
  /** sunshine multiplier for growth; when present it replaces the lamp switch */
  lightMul?: number;
  /** ambient weather: overrides the plant's temperature / humidity every chunk */
  ambient?: { tempC: number; rh: number };
  /** % of moisture gained per hour (rain) and health lost per hour (storm) */
  rainPerHour?: number;
  stormLoss?: number;
  /** multiplies the substrate's drying (heat, soil drainage) */
  evap?: number;
  /** water and nutrient solution spent per watering / feeding (hydroponics recirculate: < 1); default 1 */
  useFactor?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Average electrical draw (kW) over a day and kWh/day, for the runway shown to the player. */
export function powerDraw(equip: EquipInput, plant: Pick<PlantInGrow, 'lightSchedule' | 'ppfdLightIntensity'> | undefined, flags: { autoClimate: boolean; autoWater: boolean }) {
  const frac = LIGHT_FRACTION[plant?.lightSchedule ?? '18/6'] ?? 0.75;
  const ppfd = plant?.ppfdLightIntensity ?? 0;
  const lampKw = equip.lampMaxPpfd > 0 ? (equip.lampWatts / 1000) * clamp(ppfd / equip.lampMaxPpfd, 0.3, 1) * frac : 0;
  const acKw = flags.autoClimate ? equip.acKw * 0.5 : 0;
  const pumpKw = flags.autoWater ? equip.pumpKw * 0.25 : 0;
  const avgKw = lampKw + acKw + pumpKw;
  return { avgKw, kwhPerDay: avgKw * 24, solarKwhPerDay: equip.solarKw * 0.25 * 24 };
}

/** Real seconds a genetic needs from seed to harvest at nominal conditions (3–5 days). */
export function cycleSecondsOf(strain: Pick<Strain, 'cycleDurationSeconds'>): number {
  const t = Math.min(1, Math.max(0, (strain.cycleDurationSeconds - B.strainCycleMin) / (B.strainCycleMax - B.strainCycleMin)));
  return (B.cycleDaysMin + (B.cycleDaysMax - B.cycleDaysMin) * t) * 86400;
}

export { stageOf };

const r1 = (v: number) => Number(v.toFixed(1));

/** Hidden, full-precision values (the visible fields are rounded for the UI). */
interface Sim { progress: number; moisture: number; ec: number; health: number }

/** Use the precise copy unless something else (a watering, a speed-up…) changed the visible value. */
function readSim(p: PlantInGrow): Sim {
  const s = p.sim;
  return {
    progress: s && Math.abs(s.progress - p.progressPercent) < 0.06 ? s.progress : p.progressPercent,
    moisture: s && Math.abs(s.moisture - p.soilMoisture) < 0.06 ? s.moisture : p.soilMoisture,
    ec: s && Math.abs(s.ec - p.ecLevel) < 0.06 ? s.ec : p.ecLevel,
    health: s && Math.abs(s.health - p.health) < 0.6 ? s.health : p.health,
  };
}

/** Growth per real second at the plant's current conditions (used by the sim and by the UI countdown). */
export function growthPerSecond(p: PlantInGrow, env: SimEnv): number {
  const s = readSim(p);
  const optimal = p.vpdKpa >= 0.8 && p.vpdKpa <= 1.4;
  const moistureF = s.moisture >= B.moistureOk ? 1 : s.moisture >= B.moistureStress ? 0.4 : 0.15;
  const ecF = s.ec >= B.ecOk ? 1 : 0.8;
  const healthF = 0.5 + 0.5 * (s.health / 100);
  const vpdF = optimal ? 1 : 0.7;
  const co2 = p.co2Ppm || env.co2Ppm;
  const co2F = co2 >= 1100 ? 1.35 : co2 >= 800 ? 1.18 : 1;
  // stronger lamps grow faster, with diminishing returns (starter 600 W lamp = 1.0)
  const ppfdF = env.equip ? Math.sqrt(clamp(Math.min(p.ppfdLightIntensity, env.equip.lampMaxPpfd || 0) / 480, 0.4, 3)) : 1;
  const feedF = s.ec >= B.ecOk ? (p.feedBonus ?? 1) : 1;
  // un pH del sustrato fuera de 5,6–6,9 bloquea nutrientes (ver sim/nutrition.ts)
  const phF = phGrowthFactor(p.phLevel);
  const pestF = p.pest ? B.pestGrowth[p.pest.kind] : 1;
  // outdoors: the sun replaces the lamp, the plot + strain decide the terroir and the weather sets the temperature
  const sc = env.siteCond;
  const terroirF = sc ? terroirOf(p.strain.origin, sc.region, sc.ratings).growth : 1;
  const t = env.ambient?.tempC;
  const tempF = t === undefined ? 1 : t < 8 ? 0.15 : t < 16 ? 0.6 : t > 36 ? 0.4 : t > 32 ? 0.8 : 1;
  const lightF = env.lightMul !== undefined ? env.lightMul : (env.lightOn > 0 ? 1 : 0);
  return (100 / cycleSecondsOf(p.strain)) * env.facilityBonus * vpdF * moistureF * ecF * healthF * co2F * ppfdF * feedF * phF * pestF * terroirF * tempF * lightF;
}

/** Seconds left until harvest at the current rate (Infinity if stalled). */
export function etaSeconds(p: PlantInGrow, env: SimEnv): number {
  if (p.stage === 'ready_harvest') return 0;
  const rate = growthPerSecond(p, env);
  if (rate <= 0) return Infinity;
  return (100 - readSim(p).progress) / rate;
}

/** ETA of a plant on a plot at the average daily sunshine (at night the instant rate would read "never"). */
export function plotEtaSeconds(p: PlantInGrow, region: RegionId, ratings: PlotRatings): number {
  const r = REGION_BY_ID[region];
  const sc: SiteConditions = { region, ratings, weather: 'sunny', tempC: r.temp, rh: r.rh, daylight: true, light: 1, rainPerHour: 0, stormLoss: 0 };
  return etaSeconds(p, {
    autoWater: false, autoClimate: false, facilityBonus: 1, co2Ppm: 420, lightOn: 1, getRoomTarget: () => undefined,
    siteCond: sc, lightMul: averageLight(ratings), ambient: { tempC: r.temp, rh: r.rh },
  });
}

/** Hours until the substrate falls below `threshold` (no watering). */
export function hoursUntilMoisture(p: PlantInGrow, threshold: number, lightOn = 1): number {
  const s = readSim(p);
  if (s.moisture <= threshold) return 0;
  const lit = (LIGHT_FRACTION[p.lightSchedule] ?? 0.75) * lightOn;
  const drain = (B.moistureDrainPerHourDark + (B.moistureDrainPerHourLit - B.moistureDrainPerHourDark) * lit) * (B.drinkBase + B.drinkPerProgress * (s.progress / 100));
  return (s.moisture - threshold) / drain;
}

export const isThirsty = (p: PlantInGrow) => p.stage !== 'ready_harvest' && p.soilMoisture < B.thirstyBelow;
export const pestCount = (plants: PlantInGrow[]) => plants.filter((p) => p.pest).length;
export const isHungry = (p: PlantInGrow) => p.stage !== 'ready_harvest' && p.ecLevel < B.ecOk + 0.15;

/* ───────────────────────────── sexing ───────────────────────────── */

export type Sex = 'female' | 'male';
/** progress (%) at which the sex becomes visible */
export const SEX_REVEAL_AT = 30;
/** progress (%) from which a male releases pollen */
export const POLLEN_AT = 55;
/** flower left on a pollinated female (she puts energy into seeds instead) */
export const POLLINATED_YIELD = 0.6;
/** seeds a pollinated female gives at harvest */
export const SEEDS_PER_POLLINATED = 2;

/** Regular and landrace seeds are 50/50; feminized, autoflowering and fast-flowering seeds are always female. */
export function sexFor(seed: string, seedType?: string): Sex {
  return (seedType === 'Regular' || seedType === 'Landrace') && hash01(seed, 11) < 0.5 ? 'male' : 'female';
}
export const isMale = (p: PlantInGrow) => p.sex === 'male';
export const sexRevealed = (p: PlantInGrow) => p.progressPercent >= SEX_REVEAL_AT;
export const maleCount = (plants: PlantInGrow[]) => plants.filter((p) => isMale(p) && sexRevealed(p)).length;

/** Hourly chance of each plague for a plant in these conditions (0 while it is protected). */
export function pestHazards(p: PlantInGrow, cleanliness: number, temp: number, rh: number, moisture: number, stage: GrowStage): Record<PestKind, number> {
  if ((p.guard ?? 0) > 0 || stage === 'ready_harvest') return { mites: 0, mold: 0, rot: 0 };
  const dirt = 1 + (100 - clamp(cleanliness, 0, 100)) / 40;   // rating 0 → ×3.5
  const base = B.pestBaseHazardPerHour * dirt;
  const mites = base * (temp > 27 ? 1 + (temp - 27) * 0.5 : 1) * (rh < 45 ? 1 + (45 - rh) / 15 : 1);
  const mold = base * (rh > 65 ? 1 + (rh - 65) / 6 : 1) * (stage === 'flowering' || stage === 'maturation' ? 1.6 : 1) * (moisture > 90 ? 1.3 : 1);
  const rot = base * (moisture > 88 ? 1 + (moisture - 88) / 3 : 0.4);
  return { mites, mold, rot };
}

/** Advance one plant by `dt` real seconds (dt ≤ chunkSeconds keeps the integration accurate). */
export function advancePlant(p: PlantInGrow, dt: number, env: SimEnv): PlantInGrow {
  if (p.stage === 'ready_harvest' || dt <= 0) return p;
  const hours = dt / 3600;
  const s = readSim(p);

  // --- substrate: drinks with lamp exposure and size; auto-drip tops it up ---
  const lit = (LIGHT_FRACTION[p.lightSchedule] ?? 0.75) * env.lightOn;
  const drain = (B.moistureDrainPerHourDark + (B.moistureDrainPerHourLit - B.moistureDrainPerHourDark) * lit) * (B.drinkBase + B.drinkPerProgress * (s.progress / 100));
  let moisture = Math.max(5, s.moisture - drain * (env.evap ?? 1) * hours + (env.rainPerHour ?? 0) * hours);
  if (moisture > 90) moisture = Math.max(90, moisture - (moisture - 90) * 0.2 * Math.min(1, hours * 4));   // runoff
  moisture = Math.min(100, moisture);
  if (env.autoWater && moisture < B.autoWaterTrigger) {
    const cost = (env.equip?.waterPerPlantAuto ?? 0.5) * (env.useFactor ?? 1);
    if (!env.budget || env.budget.waterL >= cost) {
      if (env.budget) env.budget.waterL -= cost;
      moisture = B.autoWaterTarget;
    }
  }
  // a hired gardener waters by hand (from the tank) when the irrigation system does not
  const handWater = B.waterPerWatering * (env.useFactor ?? 1);
  if (moisture < B.autoWaterTrigger && env.gardener?.water && env.budget && env.budget.waterL >= handWater) {
    env.budget.waterL -= handWater;
    moisture = B.autoWaterTarget;
  }

  // --- nutrient solution fades (the gardener feeds when it runs low) ---
  let ec = Math.max(B.ecFloor, s.ec - B.ecDecayPerHour * hours);
  let feedBonus = p.feedBonus;
  let phLevel = p.phLevel;
  const feedMl = B.feedMl * (env.useFactor ?? 1);
  if (env.gardener?.feed && ec < B.ecOk + 0.15 && env.budget && (env.budget.nutrientMl ?? 0) >= feedMl) {
    env.budget.nutrientMl = (env.budget.nutrientMl ?? 0) - feedMl;
    ec = B.ecFed;
    feedBonus = env.gardener.feedBonus;
    phLevel = 6.2; // el jardinero prepara la solución con el pH corregido
  }

  // --- climate ---
  let temp = p.temperatureC;
  let rh = p.relativeHumidity;
  if (env.ambient) {
    temp = env.ambient.tempC;
    rh = env.ambient.rh;
  } else if (env.autoClimate) {
    const target = env.getRoomTarget(p.currentRoom);
    if (target) {
      const dT = target.tempC - temp;
      const dR = target.rh - rh;
      if (Math.abs(dT) > 0.2) temp += Math.sign(dT) * Math.min(Math.abs(dT), 0.2 * dt);
      if (Math.abs(dR) > 0.4) rh += Math.sign(dR) * Math.min(Math.abs(dR), 0.4 * dt);
    }
  }
  const vpd = calculateVpd(temp, rh);
  const optimal = vpd >= 0.8 && vpd <= 1.4;

  // --- growth (uses the state *after* this chunk's drying, like a real crop) ---
  const probe: PlantInGrow = { ...p, feedBonus, soilMoisture: moisture, ecLevel: ec, vpdKpa: vpd, sim: { progress: s.progress, moisture, ec, health: s.health } };
  // a plant may enter the next phase in one step but never jump over one: every phase is lived through, whatever the time step
  const progress = Math.min(100, Math.max(s.progress, maxProgressFrom(p.stage)), s.progress + growthPerSecond(probe, env) * dt);
  const stage = stageOf(progress);

  // --- health: dry plants suffer down to a floor; cared-for plants recover ---
  let health = s.health;
  if (moisture < B.moistureStress) health = Math.max(B.healthFloor, health - B.healthLossPerHourDry * hours);
  else if (optimal && moisture >= B.moistureOk && ec >= B.ecOk && ec <= B.ecBurn && !p.pest) health = Math.min(100, health + B.healthGainPerHourCared * hours);
  // sobredosis de sales: las puntas se queman y la salud cae hasta el mínimo (nunca muere)
  if (ec > B.ecBurn) health = Math.max(B.healthFloor, health - B.burnLossPerHour * hours);
  if (env.stormLoss) health = Math.max(B.healthFloor, health - env.stormLoss * hours);
  if (env.ambient && (env.ambient.tempC < 6 || env.ambient.tempC > 38)) health = Math.max(B.healthFloor, health - 0.8 * hours);

  // --- plagues: seeded dice per plant and simulated hour; a gardener (level 2) treats them from the stock ---
  const age = (p.age ?? 0) + hours;
  let pest = p.pest;
  let guard = Math.max(0, (p.guard ?? 0) - hours);
  if (pest) {
    pest = { kind: pest.kind, hours: pest.hours + hours };
    health = Math.max(B.healthFloor, health - B.pestHealthLossPerHour[pest.kind] * hours);
    const ml = env.budget?.treatMl?.[pest.kind] ?? 0;
    if (env.gardener?.treat && env.budget?.treatMl && ml >= B.treatMl) {
      env.budget.treatMl[pest.kind] = ml - B.treatMl;
      pest = undefined;
      guard = B.guardHoursGardener;
      health = Math.min(100, health + 5);
    }
  } else if (env.cleanliness !== undefined) {
    const hz = pestHazards({ ...p, guard }, env.cleanliness, temp, rh, moisture, stage);
    const total = hz.mites + hz.mold + hz.rot;
    if (total > 0) {
      const seed = `${p.id ?? ''}${p.strain.id ?? ''}${p.plantedAt}`;
      const slot = Math.floor(age * 12);   // one roll per 5 simulated minutes
      if (hash01(seed, slot) < 1 - Math.exp(-total * hours)) {
        const pick = hash01(seed + 'k', slot) * total;
        pest = { kind: pick < hz.mites ? 'mites' : pick < hz.mites + hz.mold ? 'mold' : 'rot', hours: 0 };
      }
    }
  }

  // --- trichomes ripen in flower ---
  // clear → milky through flowering, milky → amber through maturation
  let clear = 90, milky = 10, amber = 0;
  if (stage === 'flowering') {
    const fp = (progress - 50) / 35;
    clear = Math.round(90 - fp * 50); milky = Math.round(10 + fp * 45); amber = Math.round(fp * 5);
  } else if (stage === 'maturation') {
    const fp = (progress - 85) / 15;
    clear = Math.round(40 - fp * 35); milky = Math.round(55 + fp * 10); amber = Math.round(5 + fp * 25);
  } else if (stage === 'ready_harvest') {
    clear = 5; milky = 65; amber = 30;
  }

  return {
    ...p,
    stage,
    progressPercent: r1(progress),
    soilMoisture: r1(moisture),
    ecLevel: r1(ec),
    phLevel: r1(phLevel),
    temperatureC: r1(temp),
    relativeHumidity: r1(rh),
    vpdKpa: vpd,
    luxLumens: Math.round(p.ppfdLightIntensity * 54),
    health: Math.round(health),
    trichomeMaturity: { clear, milky, amber },
    sim: { progress, moisture, ec, health },
    feedBonus,
    pest,
    guard,
    age,
  };
}

/** The environment a plant on a plot lives in for one chunk. */
function siteEnvFor(base: SimEnv, sc: SiteConditions): SimEnv {
  return {
    ...base,
    siteCond: sc,
    useFactor: 1,
    autoWater: false,
    autoClimate: false,
    equip: undefined,
    facilityBonus: 1,
    lightOn: sc.daylight ? 1 : 0,
    lightMul: sc.light,
    ambient: { tempC: sc.tempC, rh: sc.rh },
    rainPerHour: sc.rainPerHour,
    stormLoss: sc.stormLoss,
    // hot, sunny days dry the soil faster; a high water rating retains it
    evap: Math.max(0.4, (1 + (sc.tempC - 24) * 0.04) * (1.25 - (sc.ratings.water / 100) * 0.6)),
  };
}

/** Advance every plant by `dt` real seconds, in chunks (so long absences stay accurate). Plants with a `siteId` grow outdoors. */
export function advanceWorld(plants: PlantInGrow[], dtSeconds: number, env: SimEnv): PlantInGrow[] {
  let remaining = Math.min(Math.max(0, dtSeconds), B.maxCatchUpSeconds);
  let cur = plants;
  let elapsed = 0;
  while (remaining > 0.5) {
    const step = Math.min(B.chunkSeconds, remaining);
    let chunkEnv = env;
    const indoorRef = cur.find((p) => !p.siteId);
    if (env.equip && env.budget && indoorRef) {
      // electricity: solar first, then the stock. Not enough power → the lamps (and AC) run only part of the chunk.
      const hours = step / 3600;
      const { avgKw } = powerDraw(env.equip, indoorRef, { autoClimate: env.autoClimate, autoWater: env.autoWater });
      const need = avgKw * hours;
      const have = env.budget.energyKwh + env.equip.solarKw * 0.25 * hours;
      const lightOn = env.equip.lampWatts <= 0 ? 0 : need <= 0 ? 1 : Math.min(1, have / need);
      env.budget.energyKwh = Math.max(0, have - Math.min(need, have));
      chunkEnv = { ...env, lightOn, autoClimate: env.autoClimate && lightOn > 0.5 };
    }
    if (env.gardener && env.budget && env.budget.gardenerDays !== undefined && cur.length > 0) {
      const on = env.budget.gardenerDays > 0;
      env.budget.gardenerDays = Math.max(0, env.budget.gardenerDays - step / 86400);
      chunkEnv = { ...chunkEnv, gardener: on ? env.gardener : undefined };
    }
    const nowMs = (env.clockMs ?? 0) + (elapsed + step / 2) * 1000;   // conditions at the middle of the chunk
    const siteCache = new Map<string, SimEnv | null>();
    cur = cur.map((p) => {
      let pe = chunkEnv;
      if (p.siteId && env.site) {
        let se = siteCache.get(p.siteId);
        if (se === undefined) {
          const sc = env.site(p.siteId, nowMs);
          se = sc ? siteEnvFor(chunkEnv, sc) : null;
          siteCache.set(p.siteId, se);
        }
        if (se) pe = se;
      }
      return advancePlant(p, step, pe);
    });
    // a male in flower pollinates the females of the same room / plot
    const pollen = new Set<string>();
    for (const p of cur) if (isMale(p) && p.progressPercent >= POLLEN_AT) pollen.add(p.siteId ?? 'indoor');
    if (pollen.size > 0) {
      cur = cur.map((p) => (!isMale(p) && !p.pollinated && p.progressPercent >= 40 && p.stage !== 'ready_harvest' && pollen.has(p.siteId ?? 'indoor'))
        ? { ...p, pollinated: true, estimatedDryYieldGrams: Math.round(p.estimatedDryYieldGrams * POLLINATED_YIELD) } : p);
    }
    remaining -= step;
    elapsed += step;
  }
  return cur;
}

/** "2 d 14 h", "5 h 20 min", "12 min" */
export function formatDuration(seconds: number): string {
  if (!isFinite(seconds)) return '—';
  const m = Math.max(0, Math.round(seconds / 60));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return tr('{h} h {mm} min', { h, mm });
  return `${mm} min`;
}
