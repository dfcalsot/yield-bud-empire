import type { GenomicPatent, MotherFatherPlant, SeedBankItem, Strain } from '../types';
import type { Rarity } from '../components/game/GameUI';
import { t as tr, k, localize } from '../i18n/core';

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
  /** short chips shown on the front (species, difficulty, pack size...) */
  meta: string[];
  /** every real characteristic of the genetic, shown on the back "ficha técnica" */
  attributes: CardAttr[];
  /** full terpene profile (% by weight), highest first */
  terpeneProfile: Array<{ label: string; pct: number }>;
  description?: string;
}

export interface CardAttr {
  label: string;
  value: string;
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
  const labels: Record<string, string> = { myrcene: tr('Mirceno'), limonene: tr('Limoneno'), caryophyllene: tr('Cariofileno'), pinene: tr('Pineno'), linalool: tr('Linalool') };
  return Object.entries(t)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => labels[k] ?? k);
};

const pct = (v: number, max: number) => Math.max(0, Math.min(100, (v / max) * 100));

const TERPENE_LABELS: Record<string, string> = localize<Record<string, string>>({ myrcene: k('Mirceno'), limonene: k('Limoneno'), caryophyllene: k('Cariofileno'), pinene: k('Pineno'), linalool: k('Linalool') }, ['myrcene', 'limonene', 'caryophyllene', 'pinene', 'linalool']);

const terpeneProfileOf = (t: Strain['terpenes']): GeneticCardData['terpeneProfile'] =>
  Object.entries(t)
    .map(([k, v]) => ({ label: TERPENE_LABELS[k] ?? k, pct: v as number }))
    .sort((a, b) => b.pct - a.pct);

/** Characteristics every Strain carries (used by seeds, hybrids, patents and donors). */
const strainAttrs = (st: Strain): CardAttr[] => [
  { label: tr('Fenotipo'), value: tr(st.type) },
  { label: tr('Linaje'), value: tr(st.lineage) },
  { label: 'THC', value: `${st.thcPercentage}%` },
  { label: 'CBD', value: `${st.cbdPercentage}%` },
  { label: tr('Dificultad'), value: tr(st.difficulty) },
  { label: tr('Ciclo simulado'), value: `${Math.round(st.cycleDurationSeconds / 60)} min` },
  { label: tr('Multiplicador de resina'), value: `x${st.resinYieldMultiplier}` },
  { label: tr('Patente'), value: st.isPatented ? st.patentId ?? tr('Registrada') : tr('Sin patente') },
];

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
    { label: tr('Rend.'), value: pct(seed.yieldGramsPerPlant, 250), text: `~${seed.yieldGramsPerPlant}g`, color: '#fbbf24' },
    { label: tr('Ciclo'), value: pct(14 - seed.floweringWeeks, 8), text: `${seed.floweringWeeks} sem`, color: '#c084fc' },
  ],
  meta: [tr(seed.strainTemplate.type), tr('Dif. {difficulty}', { difficulty: tr(seed.difficulty) }), `${seed.seedsPerPack} sem/pack`],
  description: seed.description,
  terpeneProfile: terpeneProfileOf(seed.strainTemplate.terpenes),
  attributes: [
    { label: tr('Genética'), value: seed.name },
    { label: tr('Criador'), value: tr(seed.breeder) },
    { label: tr('Tipo de semilla'), value: tr(seed.seedType) },
    { label: tr('Fenotipo'), value: tr(seed.strainTemplate.type) },
    { label: tr('Linaje'), value: tr(seed.lineage) },
    { label: 'THC', value: `${seed.thcPercentage}%` },
    { label: 'CBD', value: `${seed.cbdPercentage}%` },
    { label: tr('Floración'), value: `${seed.floweringWeeks} semanas` },
    { label: tr('Rendimiento'), value: `~${seed.yieldGramsPerPlant} g/planta` },
    { label: tr('Dificultad'), value: tr(seed.difficulty) },
    { label: tr('Ciclo simulado'), value: `${Math.round(seed.strainTemplate.cycleDurationSeconds / 60)} min` },
    { label: tr('Multiplicador de resina'), value: `x${seed.strainTemplate.resinYieldMultiplier}` },
    { label: tr('Terpenos dominantes'), value: seed.dominantTerpenes.join(', ') },
    { label: tr('Pack'), value: `${seed.seedsPerPack} semillas` },
    { label: tr('Precio'), value: `${seed.priceFlora} $FLORA · ${seed.priceSol} SOL` },
    { label: tr('Patente'), value: seed.strainTemplate.isPatented ? seed.strainTemplate.patentId ?? tr('Registrada') : tr('Sin patente') },
    { label: tr('Stock'), value: seed.inStock ? tr('Disponible') : tr('Agotado') },
  ],
});

export const cardFromStrain = (strain: Strain, kind: 'hybrid' | 'patent' = 'hybrid', patentNumber?: string): GeneticCardData => ({
  id: strain.id,
  name: strain.name,
  subtitle: strain.lineage,
  tag: kind === 'patent' ? tr('Patente registrada') : strain.type === 'Híbrido' ? tr('Híbrido F1') : strain.type,
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
    { label: tr('Resina'), value: pct(strain.resinYieldMultiplier, 2), text: `x${strain.resinYieldMultiplier}`, color: '#fbbf24' },
    { label: tr('Ciclo'), value: pct(3600 - strain.cycleDurationSeconds, 3000), text: `${Math.round(strain.cycleDurationSeconds / 60)} min`, color: '#c084fc' },
  ],
  meta: [tr(strain.type), tr('Dif. {difficulty}', { difficulty: tr(strain.difficulty) })],
  description: strain.description,
  terpeneProfile: terpeneProfileOf(strain.terpenes),
  attributes: [{ label: tr('Genética'), value: strain.name }, ...strainAttrs(strain)],
});

export const cardFromPatent = (pat: GenomicPatent, strain?: Strain): GeneticCardData => {
  const base = strain ? cardFromStrain(strain, 'patent', pat.patentNumber) : null;
  const patentAttrs: CardAttr[] = [
    { label: tr('N.º de patente'), value: pat.patentNumber },
    { label: tr('Registrada'), value: pat.registeredDate },
    { label: tr('Titular'), value: pat.creatorWallet },
    { label: tr('Parental A'), value: pat.parentA },
    { label: tr('Parental B'), value: pat.parentB },
    { label: tr('Terpeno dominante'), value: tr(pat.dominantTerpene) },
    { label: tr('Quema de registro'), value: `${pat.floraBurnedFee} $FLORA` },
  ];
  if (base) return { ...base, attributes: [{ label: tr('Genética'), value: tr(pat.strainName) }, ...patentAttrs, ...base.attributes.slice(1)] };
  return (
    {
      id: pat.id,
      name: pat.strainName,
      subtitle: `${pat.parentA} x ${pat.parentB}`,
      tag: 'Patente registrada',
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
      meta: [tr('Patente')],
      terpeneProfile: [],
      attributes: [{ label: tr('Genética'), value: tr(pat.strainName) }, ...patentAttrs, { label: 'THC', value: `${pat.thc}%` }, { label: 'CBD', value: `${pat.cbd}%` }],
    }
  );
};

/** Mother / father plants as collectible cards (id keeps the serial + mint unique per individual). */
export const cardFromDonor = (d: MotherFatherPlant): GeneticCardData => {
  const base = cardFromStrain(d.strain, 'hybrid');
  const isMother = d.role.startsWith(tr('Madre'));
  const thc = d.thcPercentage ?? d.strain.thcPercentage;
  return {
    ...base,
    id: d.id,
    name: d.strainName ?? d.name,
    tag: `${isMother ? tr('Madre') : d.role.startsWith(tr('Padre')) ? tr('Donante') : tr('Hembra rev.')} #${d.generation ?? 1}`,
    thc,
    stats: [
      { label: 'THC', value: pct(thc, 32), text: `${thc}%`, color: '#34d399' },
      { label: tr('Vigor'), value: pct((d.vigorRating ?? 5) * 10, 100), text: `${d.vigorRating ?? 5}/10`, color: '#c084fc' },
      { label: tr('Salud'), value: d.health, text: `${d.health}%`, color: '#22d3ee' },
      isMother
        ? { label: tr('Esquejes'), value: pct(d.clonesHarvested ?? d.clonesCutCount, 20), text: `${d.clonesHarvested ?? d.clonesCutCount}`, color: '#fbbf24' }
        : { label: tr('Polen'), value: pct(d.pollenGramsCollected ?? 0, 20), text: `${d.pollenGramsCollected ?? 0}g`, color: '#fbbf24' },
    ],
    meta: [tr(d.strain.type), isMother ? tr('Madre') : tr('Donante')],
    attributes: [
      { label: tr('Genética'), value: tr(d.strainName) ?? d.name },
      { label: tr('Rol'), value: tr(d.role) },
      { label: tr('Generación'), value: `${d.generation ?? 1}` },
      { label: tr('Edad'), value: `${d.ageDays ?? 0} días` },
      { label: tr('Vigor'), value: `${d.vigorRating ?? 5}/10` },
      { label: tr('Salud'), value: `${d.health}%` },
      isMother
        ? { label: tr('Esquejes tomados'), value: `${d.clonesHarvested ?? d.clonesCutCount}` }
        : { label: tr('Polen recolectado'), value: `${d.pollenGramsCollected ?? 0} g` },
      { label: tr('Rasgos'), value: d.traits?.length ? d.traits.join(', ') : '—' },
      ...strainAttrs(d.strain).slice(1),
    ],
  };
};
