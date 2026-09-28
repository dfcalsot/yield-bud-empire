/**
 * The world clock of one account: plants grow by the real time elapsed (also while nobody plays), the grow room spends water,
 * energy, nutrient, treatments and gardener days, gear wears, the room gets dirty, forge jobs and chamber crosses deliver.
 * Ported from the old GameContext `runTick`; now the server runs it before every action and every state read.
 */
import type { PlantInGrow, ProcessedProduct, SeedBankItem, Strain, RegionId } from '../types';
import { GROW_ROOMS_CONFIG, INITIAL_STRAINS } from '../data/initialData';
import {
  CATALOG_BY_ID, USE, bestFeedBonus, equipStatsOf, gardenerLevelOf, garbageOf, pestStock, spendPest, spendResource, stockOf,
} from '../economy/catalog';
import { advanceWorld, formatDuration, isMale, pestCount, sexRevealed, PEST_INFO, type SimEnv } from '../sim/engine';
import { siteConditions } from '../sim/terroir';
import { BALANCE } from '../sim/balance';
import { fitToCapacity } from '../sim/facilities';
import { craftTotals, FORGE_RECIPE_BY_ID } from '../sim/forge';
import { GEN_LABEL, inheritTraits, lineageLabel, mulberry32, seedBatchSize } from '../sim/breeding';
import { PRODUCT_PRICE, TYPE_OF_KEY } from '../sim/products';
import { ECON } from '../sim/economy';
import { t as tr } from '../i18n/core';
import { NeedsServer, type Ext } from './ctx';
import { CAPS, roomSlotPlant, type GameState } from './state';
import { addXp, event, say, type Run } from './run';

/** the simulation environment the room lives in (equipment, facility, staff, cleanliness, gardener) */
export function deriveEnv(s: GameState, ext: Ext): SimEnv {
  const eq = equipStatsOf(s.assets);
  const gl = gardenerLevelOf(s.assets);
  return {
    autoWater: s.autoWaterActive && eq.autoWater,
    autoClimate: s.autoClimateActive && eq.hasAc,
    facilityBonus: ext.facility.environmentBonus * (1 + ext.mods.growth),
    useFactor: ext.facility.resourceUse ?? 1,
    co2Ppm: Math.max(420, eq.co2Ppm),   // ambient air unless there is CO₂ gear installed
    lightOn: 1,
    equip: eq,
    cleanliness: s.care.rating,
    gardener: gl > 0 ? { water: true, feed: true, treat: gl >= 2, feedBonus: bestFeedBonus(s.assets) } : undefined,
    getRoomTarget: (roomId) => {
      const r = GROW_ROOMS_CONFIG.find((x) => x.id === (roomId || s.currentRoom));
      return r ? { tempC: r.targetTempC, rh: r.targetRhPercent } : undefined;
    },
  };
}

/** the room is exactly as big as the facility; plants past its capacity wait frozen and come back when it grows */
export function fitRoom(s: GameState, capacity: number, now: number) {
  if (s.indoorPlants.length === capacity) return;
  const strain = s.indoorPlants[0]?.strain ?? INITIAL_STRAINS[0];
  const r = fitToCapacity<PlantInGrow>(s.indoorPlants, s.dormantPlants, capacity, (slot) => roomSlotPlant(slot, strain, now));
  s.indoorPlants = r.active;
  s.dormantPlants = r.dormant;
}

/**
 * The warehouse batches made to match the grams the economy holds per product key (the truth a sale checks): batches beyond it go
 * away, a partly covered one is trimmed, grams no batch shows appear as one batch per product.
 */
export function reconcileProducts(s: GameState, products: Record<string, number>, now: number) {
  const left: Record<string, number> = { ...products };
  const out: ProcessedProduct[] = [];
  for (const b of s.products) {
    if (b.type === 'v2p_merch') { out.push(b); continue; }
    const key = b.recipeId && PRODUCT_PRICE[b.recipeId] ? b.recipeId : b.type;
    const have = left[key] ?? 0;
    if (have <= 0.009) continue;
    const grams = Math.min(b.quantityGrams, have);
    left[key] = have - grams;
    out.push(grams < b.quantityGrams - 0.009 ? { ...b, quantityGrams: Number(grams.toFixed(2)), marketValueFlora: Math.round(b.marketValueFlora * (grams / b.quantityGrams)) } : b);
  }
  for (const [key, grams] of Object.entries(left)) {
    if (grams <= 0.009) continue;
    const type = (TYPE_OF_KEY[key] ?? key) as ProcessedProduct['type'];
    const price = PRODUCT_PRICE[key] ?? PRODUCT_PRICE[type] ?? 0;
    out.push({
      id: `srv-${key}`, name: tr('Lote guardado · {key}', { key }), type, recipeId: key !== type ? key : undefined, strainOrigin: 'Yield Bud Empire',
      quantityGrams: Number(grams.toFixed(2)), potency: '', qualityScore: 90, marketValueFlora: Math.round(grams * price * ECON.priceScale),
      createdAt: now, batchHash: `srv-${key}`,
    });
  }
  s.products = out.slice(0, CAPS.products + 20);
}

/**
 * Advance the world to `ctx.now`. `quiet` (the browser's display tick) skips the notifications and the deliveries that need the
 * server (the server's own tick says them).
 */
export function tick(r: Run, opts: { quiet?: boolean; extraSeconds?: number } = {}) {
  const { s, ctx } = r;
  const now = ctx.now;
  const ext = ctx.ext();
  fitRoom(s, ext.facility.capacityPlants, now);
  const dt = (now - s.lastSimAt) / 1000 + (opts.extraSeconds ?? 0);
  if (dt >= 0.5) {
    s.lastSimAt = now;
    grow(r, ext, dt, !!opts.quiet);
  }
  deliverBreeding(r, !!opts.quiet);
  if (!opts.quiet) deliverForge(r);
}

function grow(r: Run, ext: Ext, dt: number, quiet: boolean) {
  const { s, ctx } = r;
  const now = ctx.now;
  const stock = s.assets;
  const treat0 = pestStock(stock);
  const budget = { waterL: stockOf(stock, 'water'), energyKwh: stockOf(stock, 'energy'), nutrientMl: stockOf(stock, 'nutrient'), treatMl: { ...treat0 }, gardenerDays: stockOf(stock, 'service') };
  const log = { auto: 0, water: 0, feed: 0, treat: 0 };
  const plots = ext.plots.filter((pl) => s.plotPlants[pl.id]?.length);
  const plotList = plots.flatMap((pl) => s.plotPlants[pl.id]);
  const env: SimEnv = {
    ...deriveEnv(s, ext),
    budget: { ...budget, treatMl: { ...treat0 }, log },
    clockMs: now - Math.min(dt, BALANCE.maxCatchUpSeconds) * 1000,
    site: (siteId, ms) => { const pl = plots.find((x) => x.id === siteId); return pl ? siteConditions(pl.region as RegionId, pl.ratings, ms) : undefined; },
  };
  const before = s.indoorPlants;
  const everything = advanceWorld([...before, ...plotList], dt, env);
  const after = everything.slice(0, before.length);
  let off = before.length;
  for (const pl of plots) { const n = s.plotPlants[pl.id].length; s.plotPlants[pl.id] = everything.slice(off, off + n); off += n; }
  const plotAfterList = plots.flatMap((pl) => s.plotPlants[pl.id]);
  const eb = env.budget!;
  const usedWater = budget.waterL - eb.waterL;
  const usedEnergy = budget.energyKwh - eb.energyKwh;
  const usedNutrient = budget.nutrientMl - (eb.nutrientMl ?? 0);
  const usedDays = budget.gardenerDays - (eb.gardenerDays ?? 0);
  const usedTreat = (['mites', 'mold', 'rot'] as const).map((k) => [k, treat0[k] - (eb.treatMl?.[k] ?? 0)] as const).filter(([, v]) => v > 1e-6);
  const days = Math.min(dt, BALANCE.maxCatchUpSeconds) / 86400;
  let next = s.assets;
  if (usedWater > 1e-6) next = spendResource(next, 'water', Math.min(usedWater, stockOf(next, 'water'))) ?? next;
  if (usedEnergy > 1e-6) next = spendResource(next, 'energy', Math.min(usedEnergy, stockOf(next, 'energy'))) ?? next;
  if (usedNutrient > 1e-6) next = spendResource(next, 'nutrient', Math.min(usedNutrient, stockOf(next, 'nutrient'))) ?? next;
  if (usedDays > 1e-9) next = spendResource(next, 'service', Math.min(usedDays, stockOf(next, 'service'))) ?? next;
  for (const [k, v] of usedTreat) next = spendPest(next, k, v).assets;
  // installed gear wears with time (a lamp only while there was power to run it)
  s.assets = next.map((a) => {
    const it = CATALOG_BY_ID[a.catalogId];
    if (!a.equipped || it?.kind !== 'equipment' || (a.durability ?? 0) <= 0) return a;
    const running = it.category === 'lamp' ? usedEnergy > 1e-6 || (env.equip?.solarKw ?? 0) > 0 : true;
    if (!running) return a;
    return { ...a, durability: Math.max(0, Number(((a.durability ?? 100) - (it.wearPerDay ?? 0) * days).toFixed(3))) };
  });
  // gardener rating: falls with neglect and garbage while there are plants (a master gardener nearly stops it)
  if (before.length > 0 || plotList.length > 0) {
    const decay = (USE.ratingDecayPerDay + USE.garbageDecayPerDay * garbageOf(stock).length) * days * (gardenerLevelOf(stock) >= 2 ? 0.1 : 1);
    if (decay > 0) s.care = { ...s.care, rating: Math.max(0, Number((s.care.rating - decay).toFixed(3))) };
  }
  s.indoorPlants = after;
  // what the automation did today (the server's tick is the truth; the browser's quiet display tick doesn't count)
  if (!quiet && log.auto + log.water + log.feed + log.treat > 0) {
    const day = new Date(now).toISOString().slice(0, 10);
    const t0 = s.care.today?.day === day ? s.care.today : { day, auto: 0, water: 0, feed: 0, treat: 0 };
    s.care = { ...s.care, today: { day, auto: t0.auto + log.auto, water: t0.water + log.water, feed: t0.feed + log.feed, treat: t0.treat + log.treat } };
  }
  if (quiet) return;

  const newPests = [...after.filter((p, i) => p.pest && !before[i]?.pest), ...plotAfterList.filter((p, i) => p.pest && !plotList[i]?.pest)];
  if (budget.energyKwh > 0 && eb.energyKwh <= 0 && (env.equip?.lampWatts ?? 0) > 0 && (env.equip?.solarKw ?? 0) * 0.25 < 0.3) {
    say(r, tr('⚡ Se acabó la electricidad: las lámparas se apagaron y las plantas dejan de crecer. Compra un Bono de Energía en el Grow Market.'), 'burn');
  } else if (budget.waterL > 0 && eb.waterL <= 0 && (env.autoWater || env.gardener?.water)) {
    say(r, tr('💧 El tanque de agua está vacío: el riego automático se detuvo.'), 'burn');
  } else if (budget.gardenerDays > 0 && (eb.gardenerDays ?? 0) <= 0 && before.length > 0) {
    say(r, tr('🧑‍🌾 Terminó el contrato de tu jardinero. Renuévalo en el Grow Market → Servicios de vivero.'));
  } else if (newPests.length > 0 && dt <= 1800) {
    const kinds = newPests.reduce<Record<string, number>>((m, p) => { const k = PEST_INFO[p.pest!.kind].label; m[k] = (m[k] ?? 0) + 1; return m; }, {});
    say(r, tr('🐛 Plaga detectada en {length} planta{v1} ({v2}). Trátalas desde el botón Cuidado.', { length: newPests.length, v1: newPests.length > 1 ? 's' : '', v2: Object.entries(kinds).map(([k, n]) => `${k} ×${n}`).join(', ') }), 'burn');
  }
  const allBefore = [...before, ...plotList];
  const allAfter = [...after, ...plotAfterList];
  // plants that became ready to harvest while the player is here (a long absence gets the summary below instead)
  const newReady = allAfter.filter((p, i) => p.stage === 'ready_harvest' && allBefore[i] && allBefore[i].stage !== 'ready_harvest');
  if (dt <= 1800 && newReady.length > 0) {
    say(r, newReady.length === 1
      ? tr('🌾 ¡{name} está lista para cosechar!', { name: tr(newReady[0].strain.name) })
      : tr('🌾 ¡{n} plantas están listas para cosechar!', { n: newReady.length }), 'success');
  }
  const newMales = allAfter.filter((p, i) => isMale(p) && sexRevealed(p) && !(allBefore[i] && isMale(allBefore[i]) && sexRevealed(allBefore[i])));
  const newPollinated = allAfter.filter((p, i) => p.pollinated && !allBefore[i]?.pollinated);
  const pl = (n: number) => (n > 1 ? 's' : '');
  if (dt <= 1800 && newPollinated.length > 0) {
    say(r, tr('🐝 ¡Polinización! {length} hembra{v1} recibieron polen: darán un 40 % menos de flor pero también semillas. Habrá que quitar el macho a tiempo la próxima vez.', { length: newPollinated.length, v1: pl(newPollinated.length) }), 'burn');
  } else if (dt <= 1800 && newMales.length > 0) {
    say(r, tr('♂ ¡Macho detectado en {length} planta{v1}! Quítalo antes de que llegue a flor (55 %) o polinizará a las hembras. También puedes guardarlo como padre.', { length: newMales.length, v1: pl(newMales.length) }), 'burn');
  }
  if (dt > 1800) {
    const avg = (arr: PlantInGrow[], f: (p: PlantInGrow) => number) => arr.reduce((a, p) => a + f(p), 0) / Math.max(1, arr.length);
    const grew = avg(after, (p) => p.progressPercent) - avg(before, (p) => p.progressPercent);
    const thirsty = after.filter((p) => p.stage !== 'ready_harvest' && p.soilMoisture < BALANCE.thirstyBelow).length;
    const ready = after.filter((p) => p.stage === 'ready_harvest').length;
    const sick = pestCount(after);
    say(r,
      tr('Han pasado {v0}: tus plantas crecieron +{v1}%{v2}{v3}{v4}{v5}{v6}', { v0: formatDuration(Math.min(dt, BALANCE.maxCatchUpSeconds)), v1: grew.toFixed(1), v2: ready ? tr(' ({ready} listas para cosechar)', { ready }) : '', v3: thirsty ? tr('. ¡{thirsty} necesitan agua!', { thirsty }) : '.', v4: sick ? tr(' 🐛 {sick} con plaga.', { sick }) : '', v5: newMales.length ? tr(' ♂ {length} macho{v1} por quitar.', { length: newMales.length, v1: pl(newMales.length) }) : '', v6: newPollinated.length ? tr(' 🐝 {length} polinizada{v1}.', { length: newPollinated.length, v1: pl(newPollinated.length) }) : '' }),
      thirsty || sick ? 'info' : 'success');
    // and what the gardener / automatic drip did meanwhile
    const parts = [log.auto ? tr('{n} riegos automáticos', { n: log.auto }) : '', log.water ? tr('{n} riegos', { n: log.water }) : '', log.feed ? tr('{n} abonadas', { n: log.feed }) : '', log.treat ? tr('{n} plagas tratadas', { n: log.treat }) : ''].filter(Boolean);
    if (parts.length) say(r, tr('🧑‍🌾 Mientras no estabas: {list}.', { list: parts.join(' · ') }), 'success');
  }
}

/** finished forge jobs: the economy moves the goods; here they become batches, XP and a notice */
function deliverForge(r: Run) {
  const ext = r.ctx.ext();
  if (!ext.forgeJobs.some((j) => j.endsAt <= r.ctx.now)) return;
  let delivered: Array<{ id: string; recipeId: string; qty: number }>;
  try { delivered = r.ctx.econ<{ delivered: Array<{ id: string; recipeId: string; qty: number }> }>('forge_collect', {}).delivered; }
  catch (e) { if (e instanceof NeedsServer) return; throw e; }
  for (const j of delivered) {
    const rec = FORGE_RECIPE_BY_ID[j.recipeId];
    if (!rec) continue;
    if (rec.out.product) {
      const pr = rec.out.product; const grams = craftTotals(rec, j.qty).outProductGrams;
      r.s.products.unshift({
        id: `prod-forge-${j.id}`, name: `${pr.name.replace(/ \(.*\)$/, '')} ×${j.qty}`, type: pr.type, recipeId: rec.id, strainOrigin: 'Forja',
        quantityGrams: grams, potency: pr.potency, qualityScore: 90, marketValueFlora: Math.round(grams * PRODUCT_PRICE[pr.type] * ECON.priceScale),
        createdAt: r.ctx.now, batchHash: `forge-${j.id}`,
      });
    }
    addXp(r, 40 * j.qty);
    event(r, 'lab', 1);
    say(r, tr('Forja terminada: {name} ×{qty}. Míralo en el Maletín.', { name: rec.name, qty: j.qty }), 'success');
  }
}

/** finished chamber crosses: a new stabilised strain and a seed batch (the dice were frozen when the cross started) */
function deliverBreeding(r: Run, quiet: boolean) {
  const { s } = r;
  const done = s.breedingJobs.filter((j) => j.endsAt <= r.ctx.now);
  if (!done.length) return;
  s.breedingJobs = s.breedingJobs.filter((j) => j.endsAt > r.ctx.now);
  for (const j of done) {
    const mother = s.mothersFathers.find((m) => m.id === j.motherId);
    const father = s.mothersFathers.find((m) => m.id === j.fatherId);
    if (!mother || !father) continue;
    const rng = mulberry32(j.seed);
    const { traits, mutated } = inheritTraits(mother.strain, father.strain, j.generation, j.useReagent, rng);
    const strain: Strain = {
      id: `strain-cria-${j.id}`, name: j.name, lineage: lineageLabel(mother.strain, father.strain, j.generation), type: 'Híbrido',
      thcPercentage: traits.thcPercentage, cbdPercentage: traits.cbdPercentage, terpenes: traits.terpenes, difficulty: 'Maestro',
      cycleDurationSeconds: traits.cycleDurationSeconds, resinYieldMultiplier: traits.resinYieldMultiplier, colorTheme: mutated ? '#fb7185' : '#c084fc',
      description: tr('Cruce de cámara {v0}{v1}.', { v0: lineageLabel(mother.strain, father.strain, j.generation), v1: mutated ? tr(' · mutación detectada') : '' }),
    };
    const seeds = seedBatchSize(mother.vigorRating ?? 60, true, r.ctx.ext().mods.seedBonus, rng);
    const seedId = `cria_seed_${j.id}`;
    const item: SeedBankItem = {
      id: seedId, name: `${strain.name} (${GEN_LABEL[j.generation]})`, breeder: `${s.brand.name} Cámara de Cría`, seedType: 'Regular', lineage: strain.lineage,
      thcPercentage: strain.thcPercentage, cbdPercentage: strain.cbdPercentage, floweringWeeks: 9, yieldGramsPerPlant: 165, difficulty: 'Avanzado',
      dominantTerpenes: [tr('Mirceno'), tr('Limoneno'), tr('Cariofileno')], priceFlora: 0, priceSol: 0, description: strain.description, seedsPerPack: seeds,
      imageTheme: 'emerald', inStock: true, strainTemplate: strain,
    };
    if (s.customStrains.length < CAPS.strains) s.customStrains.push(strain);
    if (s.customSeeds.length < CAPS.strains) { s.customSeeds.unshift(item); s.seedInventory[seedId] = Math.min(CAPS.seedsPerKind, (s.seedInventory[seedId] ?? 0) + seeds); }
    s.breedingLog = [{ id: j.id, label: `${mother.name} x ${father.name}`, strainName: strain.name, generation: j.generation, mutated, seeds, createdAt: r.ctx.now }, ...s.breedingLog].slice(0, 100);
    addXp(r, 260);
    event(r, 'breed', 1);
    if (!quiet) say(r, tr('Cría terminada: "{name}" ({v1}{v2}) — {seeds} semillas en tu inventario.', { name: strain.name, v1: GEN_LABEL[j.generation], v2: mutated ? tr(', mutación') : '', seeds }), 'success');
  }
}
