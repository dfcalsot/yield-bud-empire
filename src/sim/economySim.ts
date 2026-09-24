/**
 * A day-by-day player, used by the economy simulation test and by the tuning script. Pure and deterministic.
 * The production model is calibrated on sim/engine.ts (75 g per plant per cycle × strain resin × facility bonus × health, 4-day cycles).
 */
import { ECON, EMPTY_DEPTH, burnRateOfSale, saleRevenue, type Depth } from './economy';
import { SPEEDUP, applySpeedUp, startConstruction, isDone, type Construction } from './facilities';
import { INITIAL_FACILITIES } from '../data/initialData';
import { empirePoints, perksOf, rankOf, type EmpireStats } from './empire';

export const H = 3600_000, DAY = 24 * H;
export const T0 = Date.UTC(2026, 0, 1, 8);
export const TIERS = INITIAL_FACILITIES; // 1 armario, 2 carpa, 3 invernadero, 4 hidropónica, 5–7 sedes del imperio (piden rango)

/** what running each installation costs per day in market consumables ($FLORA): energy at ≈3 $FLORA/kWh, water and nutrients */
// hydroponics and the empire seats recirculate water and nutrient solution (GrowFacility.resourceUse 0.6)
const RUNNING_COST = [34, 46, 62, 70, 100, 130, 170];
/** production model calibrated on sim/engine.ts: 75 g per plant per cycle × strain resin (≈1.3) × facility bonus × health (≈0.94), 4-day cycles */
const gramsPerDay = (tier: number) => (TIERS[tier - 1].capacityPlants * 75 * 1.3 * TIERS[tier - 1].environmentBonus * 0.94) / 4;
export const pricePerGram = () => 9.9 * ECON.priceScale; // rosin is the best product: 0.22 yield × 45 per gram of flower

export type Kind = 'f2p' | 'payer';
export interface Result { kind: Kind; days: number[]; rankDays: number[]; lands: number; minted: number; burned: number; voluntary: number; running: number; endBalance: number; maxDailyNet: number; tierAt: (d: number) => number; log: Array<{ day: number; tier: number; balance: number }> }

export function play(kind: Kind, days = 120): Result {
  let balance: number = ECON.starterFlora, tier = 1, depth: Depth = EMPTY_DEPTH, build: Construction | null = null;
  let minted = 0, burned = 0, voluntary = 0, running = 0, maxDailyNet = 0;
  const reached: number[] = [0];
  const log: Result['log'] = [];
  const tierTimeline: number[] = [];
  let lastClaim = -1e12;
  // empire: what the server would count (flower harvested, gross sales, lands, facility) and the day each rank is reached
  const st: EmpireStats = { harvested: 0, sales: 0, lands: 0, tier: 1, patents: 0, crosses: 0, staff: 0, level: 1 };
  const rankDays: number[] = [0];
  let rank = 1;
  for (let d = 0; d < days; d++) {
    const now = T0 + d * DAY + 12 * H;
    const before = balance;
    // finish a build
    if (build && isDone(build, now)) { tier = TIERS.findIndex((f) => f.id === build!.facilityId) + 1; reached[tier - 1] = d; build = null; }
    // the daily claim
    if (now - lastClaim >= ECON.dailyClaimEveryHours * H) { balance += ECON.dailyClaim; minted += ECON.dailyClaim; lastClaim = now; }
    // running the room: the payer buys its consumables with SOL (no $FLORA burned); the free player pays $FLORA
    if (kind === 'f2p') { const c = RUNNING_COST[tier - 1]; balance -= c; burned += c; running += c; }
    // sell the day's production
    const g = gramsPerDay(tier);
    const sale = saleRevenue(pricePerGram(), g, depth, now); depth = sale.depth;
    st.harvested += g; st.sales += sale.revenue; st.tier = tier;
    const cut = sale.revenue * burnRateOfSale(tier);
    balance += sale.revenue - cut; minted += sale.revenue; burned += cut;
    // the free player cannot go below zero: an empty account just stops buying consumables (never negative)
    if (balance < 0) { burned += balance; running += balance; balance = 0; }
    // upgrade to the next rung as soon as it can be afforded (one build at a time, no skipping)
    const r0 = rankOf(empirePoints(st).total);
    while (rank < r0) { rank++; rankDays[rank - 1] = d; }
    const next = TIERS[tier];
    const nextOpen = !!next && rank >= (next.minEmpireRank ?? 0);
    if (!build && nextOpen && balance >= next.costFlora) { balance -= next.costFlora; burned += next.costFlora; build = startConstruction(next.id, now); }
    // the payer speeds the build up as far as the daily limit allows
    if (kind === 'payer' && build) {
      for (let k = 0; k < SPEEDUP.perDay; k++) {
        const r = applySpeedUp(build, now); if (!r || balance < r.quote.costFlora) break;
        balance -= r.quote.costFlora; burned += r.quote.costFlora; build = r.state;
      }
    }
    // once the ladder is done the player spends on the empire (a land plot ≈ 500 $FLORA): a voluntary sink that absorbs the surplus
    // while the next rung is locked by rank (or the ladder is done), the surplus goes to the empire: lands (≈500 $FLORA, they count
    // for the rank) and, once the lands are maxed, other voluntary spending (staff, gear) that does not
    if (!build && !nextOpen && tier >= 4 && balance >= 500) { balance -= 500; burned += 500; voluntary += 500; if (st.lands < perksOf(rank).maxLands) st.lands++; }
    maxDailyNet = Math.max(maxDailyNet, balance - before);
    log.push({ day: d, tier, balance: Math.round(balance) });
    tierTimeline.push(tier);
  }
  return { kind, days: reached, rankDays, lands: st.lands, minted, burned, voluntary, running, endBalance: balance, maxDailyNet, tierAt: (d) => tierTimeline[Math.min(days - 1, d)], log };
}

