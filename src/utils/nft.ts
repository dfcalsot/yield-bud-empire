import type { GenomicPatent, SeedBankItem, Strain } from '../types';
import type { Rarity } from '../components/game/GameUI';

/**
 * View-model + helpers for the collectible genetics cards.
 * Mint addresses here are deterministic *simulated* identifiers (the game runs on a
 * simulated Devnet), so the UI labels them as such instead of linking to a real explorer.
 */

export interface GeneticCardData {
  id: string;
  name: string;
  subtitle: string;          // lineage / breeder
  tag: string;               // seed type, "Híbrido F1", "Patente"...
  kind: 'seed' | 'hybrid' | 'patent';
  color: string;             // strain colour (hex)
  rarity: Rarity;
  thc: number;
  cbd: number;
  terpenes: string[];
  stats: Array<{ label: string; value: number; text: string; color: string }>;
  owned?: number;
  patentNumber?: string;
}

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const rngFrom = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Deterministic base58-looking 44-char address for a genetic. */
export const mintAddressFor = (id: string): string => {
  const r = rngFrom(hash('mint:' + id));
  return Array.from({ length: 44 }, () => B58[Math.floor(r() * B58.length)]).join('');
};

export const shortAddress = (a: string, head = 4, tail = 4): string =>
  a.length <= head + tail + 1 ? a : `${a.slice(0, head)}…${a.slice(-tail)}`;

/** Edition number shown on the card, stable per genetic. */
export const serialFor = (id: string): string => `#${String(hash('sn:' + id) % 9000 + 100).padStart(4, '0')}`;

const DIFFICULTY_BONUS = (d: string): number =>
  /Ex[oó]tico/i.test(d) ? 4 : /Maestro/i.test(d) ? 3.5 : /Avanzado/i.test(d) ? 2.5 : /Intermedio/i.test(d) ? 1.5 : 0;

export const rarityOf = (thc: number, difficulty: string, opts: { patented?: boolean; landrace?: boolean } = {}): Rarity => {
  if (opts.patented) return 'legendary';
  const score = thc + DIFFICULTY_BONUS(difficulty) + (opts.landrace ? 4 : 0);
  return score >= 31 ? 'legendary' : score >= 26 ? 'epic' : score >= 22 ? 'rare' : 'common';
};

const topTerpenes = (t: Strain['terpenes']): string[] => {
  const labels: Record<string, string> = { myrcene: 'Mirceno', limonene: 'Limoneno', caryophyllene: 'Cariofileno', pinene: 'Pineno', linalool: 'Linalool' };
  return Object.entries(t)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => labels[k] ?? k);
};

const pct = (v: number, max: number) => Math.max(0, Math.min(100, (v / max) * 100));

export const cardFromSeed = (seed: SeedBankItem, owned = 0): GeneticCardData => ({
  id: seed.id,
  name: seed.name,
  subtitle: seed.lineage,
  tag: seed.seedType,
  kind: 'seed',
  color: seed.strainTemplate.colorTheme || '#34d399',
  rarity: rarityOf(seed.thcPercentage, seed.difficulty, { patented: !!seed.strainTemplate.isPatented, landrace: seed.seedType === 'Landrace' }),
  thc: seed.thcPercentage,
  cbd: seed.cbdPercentage,
  terpenes: seed.dominantTerpenes.slice(0, 3),
  owned,
  stats: [
    { label: 'THC', value: pct(seed.thcPercentage, 32), text: `${seed.thcPercentage}%`, color: '#34d399' },
    { label: 'CBD', value: pct(seed.cbdPercentage, 12), text: `${seed.cbdPercentage}%`, color: '#22d3ee' },
    { label: 'Rend.', value: pct(seed.yieldGramsPerPlant, 250), text: `~${seed.yieldGramsPerPlant}g`, color: '#fbbf24' },
    { label: 'Ciclo', value: pct(14 - seed.floweringWeeks, 8), text: `${seed.floweringWeeks} sem`, color: '#c084fc' },
  ],
});

export const cardFromStrain = (strain: Strain, kind: 'hybrid' | 'patent' = 'hybrid', patentNumber?: string): GeneticCardData => ({
  id: strain.id,
  name: strain.name,
  subtitle: strain.lineage,
  tag: kind === 'patent' ? 'Patente On-Chain' : strain.type === 'Híbrido' ? 'Híbrido F1' : strain.type,
  kind,
  color: strain.colorTheme || '#ec4899',
  rarity: rarityOf(strain.thcPercentage, strain.difficulty, { patented: kind === 'patent' || !!strain.isPatented }),
  thc: strain.thcPercentage,
  cbd: strain.cbdPercentage,
  terpenes: topTerpenes(strain.terpenes),
  patentNumber,
  stats: [
    { label: 'THC', value: pct(strain.thcPercentage, 32), text: `${strain.thcPercentage}%`, color: '#34d399' },
    { label: 'CBD', value: pct(strain.cbdPercentage, 12), text: `${strain.cbdPercentage}%`, color: '#22d3ee' },
    { label: 'Resina', value: pct(strain.resinYieldMultiplier, 2), text: `x${strain.resinYieldMultiplier}`, color: '#fbbf24' },
    { label: 'Ciclo', value: pct(3600 - strain.cycleDurationSeconds, 3000), text: `${Math.round(strain.cycleDurationSeconds / 60)} min`, color: '#c084fc' },
  ],
});

export const cardFromPatent = (pat: GenomicPatent, strain?: Strain): GeneticCardData => {
  const base = strain ? cardFromStrain(strain, 'patent', pat.patentNumber) : null;
  return (
    base ?? {
      id: pat.id,
      name: pat.strainName,
      subtitle: `${pat.parentA} x ${pat.parentB}`,
      tag: 'Patente On-Chain',
      kind: 'patent',
      color: '#fbbf24',
      rarity: 'legendary',
      thc: pat.thc,
      cbd: pat.cbd,
      terpenes: pat.dominantTerpene.split(/ y |, /).slice(0, 3),
      patentNumber: pat.patentNumber,
      stats: [
        { label: 'THC', value: pct(pat.thc, 32), text: `${pat.thc}%`, color: '#34d399' },
        { label: 'CBD', value: pct(pat.cbd, 12), text: `${pat.cbd}%`, color: '#22d3ee' },
      ],
    }
  );
};
