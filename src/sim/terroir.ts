import type { RegionId } from '../types';
import { hash01 } from './hash';
import { t, k, localize } from '../i18n/core';

/**
 * The planet: seven growing regions (the HashKings map, re-imagined), their climate, the deterministic daily weather,
 * how well each strain suits each land ("terroir") and the land plots themselves. Pure: no React, no globals.
 */

export interface Region {
  id: RegionId;
  name: string;
  short: string;        // plot name prefix, e.g. "Jam" → "JamAB12"
  emoji: string;
  climate: string;
  blurb: string;
  temp: number;         // mean °C
  swing: number;        // day/night amplitude °C
  rh: number;           // mean relative humidity %
  rain: number;         // chance a day is rainy (0..1)
  /** typical plot ratings 0–100 (each plot varies a little) */
  base: { water: number; sunlight: number; soil: number };
  color: string;
  /** map position on a 1000×500 equirectangular map */
  lon: number;
  lat: number;
  /** landrace strain native to this region (see initialData) */
  landrace: string;
  /** price of an average plot ($FLORA) */
  price: number;
  /** how many plots exist in total */
  supply: number;
}

export const REGIONS: Region[] = localize<Region[]>([
  { id: 'afghanistan', name: k('Afganistán'), short: k('Afg'), emoji: '⛰️', climate: k('Montaña árida'), color: '#f59e0b', lon: 67, lat: 34, landrace: 'hindu_kush', price: 380, supply: 40,
    temp: 22, swing: 12, rh: 35, rain: 0.08, base: { water: 55, sunlight: 98, soil: 86 },
    blurb: k('Valles secos a gran altura, días cálidos y noches frías. Cuna de las indicas: resina densa, poca lluvia.') },
  { id: 'mexico', name: k('México'), short: k('Mex'), emoji: '🌵', climate: k('Semiárido cálido'), color: '#f97316', lon: -102, lat: 23, landrace: 'acapulco_gold', price: 350, supply: 40,
    temp: 27, swing: 8, rh: 45, rain: 0.18, base: { water: 60, sunlight: 96, soil: 82 },
    blurb: k('Sierra soleada y seca. Aquí nació el Acapulco Gold; mucho sol, riego atento.') },
  { id: 'jamaica', name: k('Jamaica'), short: k('Jam'), emoji: '🏝️', climate: k('Isla tropical'), color: '#22c55e', lon: -77, lat: 18, landrace: 'lambs_bread', price: 520, supply: 40,
    temp: 28, swing: 4, rh: 78, rain: 0.4, base: { water: 92, sunlight: 82, soil: 90 },
    blurb: k('Calor húmedo constante y suelos ricos. Lluvias frecuentes: cuidado con el moho.') },
  { id: 'central_america', name: k('Centroamérica'), short: k('Cam'), emoji: '🌴', climate: k('Tropical húmedo'), color: '#ef4444', lon: -85, lat: 12, landrace: 'panama_red', price: 420, supply: 40,
    temp: 27, swing: 5, rh: 75, rain: 0.5, base: { water: 95, sunlight: 72, soil: 86 },
    blurb: k('Selva y aguaceros. Panama Red crece aquí como en casa; el sol es el recurso escaso.') },
  { id: 'south_america', name: k('Sudamérica'), short: k('Sam'), emoji: '🦙', climate: k('Andino templado'), color: '#eab308', lon: -74, lat: 4, landrace: 'colombian_gold_strain', price: 560, supply: 40,
    temp: 22, swing: 9, rh: 60, rain: 0.3, base: { water: 82, sunlight: 88, soil: 94 },
    blurb: k('Laderas templadas de suelo fértil, el clima más equilibrado. Colombian Gold, dulce y luminosa.') },
  { id: 'africa', name: k('África'), short: k('Afr'), emoji: '🦁', climate: k('Sabana'), color: '#a3e635', lon: 28, lat: -10, landrace: 'durban_poison', price: 340, supply: 40,
    temp: 29, swing: 9, rh: 50, rain: 0.2, base: { water: 58, sunlight: 97, soil: 78 },
    blurb: k('Sabana abierta con sol a raudales y estaciones de lluvia. Durban Poison, sativa enérgica.') },
  { id: 'asia', name: k('Asia'), short: k('Asi'), emoji: '🐘', climate: k('Monzón tropical'), color: '#38bdf8', lon: 101, lat: 15, landrace: 'thai_stick', price: 450, supply: 40,
    temp: 28, swing: 5, rh: 80, rain: 0.45, base: { water: 90, sunlight: 76, soil: 84 },
    blurb: k('Monzones y humedad. Thai Stick, sativa alta que agradece el calor pero teme al moho.') },
], ['name', 'short', 'climate', 'blurb']);

export const REGION_BY_ID: Record<RegionId, Region> = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<RegionId, Region>;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* ───────────────────────────── weather ───────────────────────────── */

export type WeatherKind = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'heat' | 'cold';
export interface Weather {
  kind: WeatherKind;
  label: string;
  emoji: string;
  tempD: number;      // °C added to the region's mean
  rhD: number;        // % added to the region's humidity
  sunMul: number;     // fraction of the sunshine that gets through
  rain: number;       // % of substrate moisture gained per hour
  storm: number;      // health lost per hour by the plants
}

const FX: Record<WeatherKind, Omit<Weather, 'kind'>> = localize<Record<WeatherKind, Omit<Weather, 'kind'>>>({
  sunny: { label: k('Soleado'), emoji: '☀️', tempD: 1.5, rhD: -4, sunMul: 1, rain: 0, storm: 0 },
  cloudy: { label: k('Nublado'), emoji: '⛅', tempD: -1.5, rhD: 6, sunMul: 0.6, rain: 0, storm: 0 },
  rain: { label: k('Lluvia'), emoji: '🌧️', tempD: -3.5, rhD: 18, sunMul: 0.35, rain: 3.5, storm: 0 },
  storm: { label: k('Tormenta'), emoji: '⛈️', tempD: -4, rhD: 22, sunMul: 0.2, rain: 6, storm: 0.6 },
  heat: { label: k('Ola de calor'), emoji: '🔥', tempD: 7, rhD: -12, sunMul: 1.05, rain: 0, storm: 0 },
  cold: { label: k('Frente frío'), emoji: '🥶', tempD: -9, rhD: 4, sunMul: 0.75, rain: 0, storm: 0 },
}, ['label']);

/** Weather of a region on a given day (UTC day index): the same for every player and every replay. */
export function weatherOn(region: Region, dayIndex: number): Weather {
  const u = hash01(`wx-${region.id}`, dayIndex);
  const storm = region.rain * 0.18;
  const rain = region.rain * 0.82;
  const heat = region.temp >= 27 ? 0.12 : 0.05;
  const cold = region.temp <= 23 ? 0.1 : 0.03;
  const cloudy = 0.18;
  let kind: WeatherKind = 'sunny';
  let acc = 0;
  for (const [k, p] of [['storm', storm], ['rain', rain], ['heat', heat], ['cold', cold], ['cloudy', cloudy]] as Array<[WeatherKind, number]>) {
    acc += p;
    if (u < acc) { kind = k; break; }
  }
  return { kind, ...FX[kind] };
}

export const dayIndexOf = (nowMs: number) => Math.floor(nowMs / 86400000);

/** Conditions on a plot at an instant: what the plants feel this simulated chunk. */
export interface SiteConditions {
  region: RegionId;
  ratings: PlotRatings;
  weather: WeatherKind;
  tempC: number;
  rh: number;
  daylight: boolean;
  /** sunshine reaching the plants (0 at night) — already includes the plot's sunlight rating and the weather */
  light: number;
  rainPerHour: number;
  stormLoss: number;
}

export interface PlotRatings { water: number; sunlight: number; soil: number }

export function siteConditions(regionId: RegionId, ratings: PlotRatings, nowMs: number): SiteConditions {
  const region = REGION_BY_ID[regionId];
  const w = weatherOn(region, dayIndexOf(nowMs));
  // local solar time of the region (every plot has its own day and night)
  const hour = (((nowMs / 3600000 + region.lon / 15) % 24) + 24) % 24;
  const wave = Math.sin((2 * Math.PI * (hour - 9)) / 24);           // peaks at 15:00, lowest at 03:00
  const daylight = hour >= 6 && hour < 18;
  return {
    region: regionId,
    ratings,
    weather: w.kind,
    tempC: Number((region.temp + w.tempD + region.swing * wave).toFixed(1)),
    rh: clamp(Math.round(region.rh + w.rhD - region.swing * 0.9 * wave), 15, 98),
    daylight,
    light: daylight ? 1.8 * w.sunMul * (ratings.sunlight / 100) : 0,
    rainPerHour: w.rain,
    stormLoss: w.storm,
  };
}

/** Average sunshine factor over a day (for ETAs, where "night" would otherwise read as "never"). */
export const averageLight = (ratings: PlotRatings) => 0.5 * 1.8 * 0.8 * (ratings.sunlight / 100);

/* ───────────────────────────── terroir ───────────────────────────── */

/** 0 = same climate, 1 = opposite. */
export function regionDistance(a: RegionId, b: RegionId): number {
  if (a === b) return 0;
  const A = REGION_BY_ID[a], B = REGION_BY_ID[b];
  const d = (Math.abs(A.temp - B.temp) / 10 + Math.abs(A.rh - B.rh) / 40 + Math.abs(A.base.sunlight - B.base.sunlight) / 30) / 3;
  return clamp(d * 1.5, 0, 1);
}

export interface Terroir {
  growth: number;      // multiplies the growth rate
  yield: number;       // multiplies the harvest
  label: string;
  tone: 'up' | 'neutral' | 'down';
  detail: string;
}

/** How well a strain (by native region, undefined = adaptable hybrid) does on a plot with these ratings. */
export function terroirOf(origin: RegionId | undefined, regionId: RegionId, ratings: PlotRatings): Terroir {
  const soilG = 0.88 + 0.12 * (ratings.soil / 100);
  const soilY = 0.85 + 0.15 * (ratings.soil / 100);
  const sunY = 0.9 + 0.1 * (ratings.sunlight / 100);
  if (!origin) return { growth: 0.97 * soilG, yield: 1 * soilY * sunY, label: t('Híbrida adaptable'), tone: 'neutral', detail: t('Se adapta a cualquier clima sin bonus ni castigo fuerte.') };
  if (origin === regionId) return { growth: 1.12 * soilG, yield: 1.3 * soilY * sunY, label: t('¡En su tierra!'), tone: 'up', detail: t('Landrace en su región de origen: +12 % de crecimiento y +30 % de cosecha.') };
  const d = regionDistance(origin, regionId);
  return {
    growth: (1 - 0.25 * d) * soilG,
    yield: (1 - 0.4 * d) * soilY * sunY,
    label: d < 0.35 ? t('Clima compatible') : t('Clima ajeno'),
    tone: d < 0.35 ? 'neutral' : 'down',
    detail: t('Su clima de origen se parece {v0} % a este: crece {v1} % y rinde {v2} %.', { v0: Math.round((1 - d) * 100), v1: Math.round((1 - 0.25 * d) * 100), v2: Math.round((1 - 0.4 * d) * 100) }),
  };
}

/* ───────────────────────────── plots ───────────────────────────── */

export const PLOT_SIZE = 36; // 6 × 6 plants

export interface PlotOffer {
  id: string;
  region: RegionId;
  index: number;          // 1-based number of the plot in its region
  name: string;           // "Jam AB12"
  ratings: PlotRatings;
  landRating: number;     // 0–10
  priceFlora: number;
  priceSol: number;
}

const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ';

/** The n-th plot of a region (deterministic): same numbers on every replay, like HashKings' Token JSON. */
export function plotOffer(regionId: RegionId, index: number): PlotOffer {
  const r = REGION_BY_ID[regionId];
  const jitter = (k: string) => Math.round((hash01(`${regionId}-${index}-${k}`, 7) * 2 - 1) * 8);
  const ratings: PlotRatings = {
    water: clamp(r.base.water + jitter('w'), 40, 100),
    sunlight: clamp(r.base.sunlight + jitter('s'), 40, 100),
    soil: clamp(r.base.soil + jitter('o'), 40, 100),
  };
  const landRating = Number(((ratings.water + ratings.sunlight + ratings.soil) / 30).toFixed(1));
  const l1 = LETTERS[Math.floor(hash01(`${regionId}-${index}-L1`, 3) * LETTERS.length)];
  const l2 = LETTERS[Math.floor(hash01(`${regionId}-${index}-L2`, 4) * LETTERS.length)];
  const priceFlora = Math.round(r.price * (0.7 + (landRating / 10) * 0.6) / 5) * 5;
  return {
    id: `plot-${regionId}-${index}`, region: regionId, index, name: `${r.short}${l1}${l2}${index}`, ratings, landRating,
    priceFlora, priceSol: Number((priceFlora / 1000).toFixed(3)),
  };
}
