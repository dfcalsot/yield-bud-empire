/**
 * Central balance sheet for the real-time simulation. Everything is expressed in
 * real hours / days so tuning the game never means touching the engine.
 */
export const BALANCE = {
  /** a full seed→harvest cycle takes between these many real days (per genetic) */
  cycleDaysMin: 3,
  cycleDaysMax: 5,
  /** genetics data uses cycleDurationSeconds in this range (see initialData.ts) */
  strainCycleMin: 40,
  strainCycleMax: 90,

  /** substrate moisture lost per real hour of a mature plant (%, at 100% lamp exposure / lamps off) */
  moistureDrainPerHourLit: 3.3,
  moistureDrainPerHourDark: 1.6,
  /** small plants drink less: multiplier = base + perProgress * progress/100 */
  drinkBase: 0.7,
  drinkPerProgress: 0.6,
  /** moisture the auto-drip system tops up to, and the threshold that triggers it */
  autoWaterTrigger: 45,
  autoWaterTarget: 85,
  /** growth speed is scaled by moisture: full above `ok`, stalled below `stress` */
  moistureOk: 40,
  moistureStress: 25,

  /** health drops (down to the floor: plants never die) when dry, recovers slowly when cared for */
  healthLossPerHourDry: 1.5,
  healthGainPerHourCared: 0.6,
  healthFloor: 30,

  /** nutrient solution (EC mS/cm) fades with time; feeding brings it back */
  ecDecayPerHour: 0.045,
  ecFloor: 0.2,
  ecOk: 1.2,
  ecFed: 2.1,

  /** plagues: base hazard per plant-hour for each kind (≈ 3 % a day in total under normal conditions) */
  pestBaseHazardPerHour: 0.0006,
  /** growth multiplier / health lost per hour while infested */
  pestGrowth: { mites: 0.7, mold: 0.5, rot: 0.4 },
  pestHealthLossPerHour: { mites: 0.35, mold: 0.5, rot: 0.45 },
  /** hours a plant stays protected after being treated by a gardener */
  guardHoursGardener: 48,

  /** what one plant consumes per action (also used by the gardener) */
  waterPerWatering: 0.5,
  feedMl: 3,
  treatMl: 8,

  /** offline catch-up: never simulate more than this, in chunks of this size */
  maxCatchUpSeconds: 7 * 24 * 3600,
  chunkSeconds: 300,
  /** how often the live game advances the world (real seconds) */
  liveTickSeconds: 10,
  /** water need alerts */
  thirstyBelow: 40,
  warnBelow: 55,
} as const;

/** Fraction of the day the lamps are on for each photoperiod. */
export const LIGHT_FRACTION: Record<string, number> = { '18/6': 0.75, '12/12': 0.5, '24/0': 1 };
