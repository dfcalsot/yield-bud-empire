import type { GrowStage, PlantInGrow, Strain } from '../types';
import { BALANCE as B, LIGHT_FRACTION } from './balance';

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

export interface SimEnv {
  autoWater: boolean;
  autoClimate: boolean;
  facilityBonus: number;
  /** global CO2 fallback when a plant has none */
  co2Ppm: number;
  /** 0 = lamps off (no energy), 1 = lamps on */
  lightOn: number;
  getRoomTarget: (roomId: string | undefined) => { tempC: number; rh: number } | undefined;
}

/** Real seconds a genetic needs from seed to harvest at nominal conditions (3–5 days). */
export function cycleSecondsOf(strain: Pick<Strain, 'cycleDurationSeconds'>): number {
  const t = Math.min(1, Math.max(0, (strain.cycleDurationSeconds - B.strainCycleMin) / (B.strainCycleMax - B.strainCycleMin)));
  return (B.cycleDaysMin + (B.cycleDaysMax - B.cycleDaysMin) * t) * 86400;
}

export const stageOf = (p: number): GrowStage => (p < 15 ? 'seedling' : p < 50 ? 'vegetative' : p < 95 ? 'flowering' : 'ready_harvest');

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
  return (100 / cycleSecondsOf(p.strain)) * env.facilityBonus * vpdF * moistureF * ecF * healthF * co2F * (env.lightOn > 0 ? 1 : 0);
}

/** Seconds left until harvest at the current rate (Infinity if stalled). */
export function etaSeconds(p: PlantInGrow, env: SimEnv): number {
  if (p.stage === 'ready_harvest') return 0;
  const rate = growthPerSecond(p, env);
  if (rate <= 0) return Infinity;
  return (100 - readSim(p).progress) / rate;
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
export const isHungry = (p: PlantInGrow) => p.stage !== 'ready_harvest' && p.ecLevel < B.ecOk + 0.15;

/** Advance one plant by `dt` real seconds (dt ≤ chunkSeconds keeps the integration accurate). */
export function advancePlant(p: PlantInGrow, dt: number, env: SimEnv): PlantInGrow {
  if (p.stage === 'ready_harvest' || dt <= 0) return p;
  const hours = dt / 3600;
  const s = readSim(p);

  // --- substrate: drinks with lamp exposure and size; auto-drip tops it up ---
  const lit = (LIGHT_FRACTION[p.lightSchedule] ?? 0.75) * env.lightOn;
  const drain = (B.moistureDrainPerHourDark + (B.moistureDrainPerHourLit - B.moistureDrainPerHourDark) * lit) * (B.drinkBase + B.drinkPerProgress * (s.progress / 100));
  let moisture = Math.max(5, s.moisture - drain * hours);
  if (env.autoWater && moisture < B.autoWaterTrigger) moisture = B.autoWaterTarget;

  // --- nutrient solution fades ---
  const ec = Math.max(B.ecFloor, s.ec - B.ecDecayPerHour * hours);

  // --- climate ---
  let temp = p.temperatureC;
  let rh = p.relativeHumidity;
  if (env.autoClimate) {
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
  const probe: PlantInGrow = { ...p, soilMoisture: moisture, ecLevel: ec, vpdKpa: vpd, sim: { progress: s.progress, moisture, ec, health: s.health } };
  const progress = Math.min(100, s.progress + growthPerSecond(probe, env) * dt);
  const stage = stageOf(progress);

  // --- health: dry plants suffer down to a floor; cared-for plants recover ---
  let health = s.health;
  if (moisture < B.moistureStress) health = Math.max(B.healthFloor, health - B.healthLossPerHourDry * hours);
  else if (optimal && moisture >= B.moistureOk && ec >= B.ecOk) health = Math.min(100, health + B.healthGainPerHourCared * hours);

  // --- trichomes ripen in flower ---
  let clear = 90, milky = 10, amber = 0;
  if (stage === 'flowering') {
    const fp = (progress - 50) / 45;
    clear = Math.max(5, Math.round(90 - fp * 75));
    milky = Math.round(fp * 70);
    amber = Math.max(0, Math.round(fp * 25));
  } else if (stage === 'ready_harvest') {
    clear = 5; milky = 65; amber = 30;
  }

  return {
    ...p,
    stage,
    progressPercent: r1(progress),
    soilMoisture: r1(moisture),
    ecLevel: r1(ec),
    temperatureC: r1(temp),
    relativeHumidity: r1(rh),
    vpdKpa: vpd,
    luxLumens: Math.round(p.ppfdLightIntensity * 54),
    health: Math.round(health),
    trichomeMaturity: { clear, milky, amber },
    sim: { progress, moisture, ec, health },
  };
}

/** Advance every plant by `dt` real seconds, in chunks (so long absences stay accurate). */
export function advanceWorld(plants: PlantInGrow[], dtSeconds: number, env: SimEnv): PlantInGrow[] {
  let remaining = Math.min(Math.max(0, dtSeconds), B.maxCatchUpSeconds);
  let cur = plants;
  while (remaining > 0.5) {
    const step = Math.min(B.chunkSeconds, remaining);
    cur = cur.map((p) => advancePlant(p, step, env));
    remaining -= step;
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
  if (h > 0) return `${h} h ${mm} min`;
  return `${mm} min`;
}
