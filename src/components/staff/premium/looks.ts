import type { StaffRole } from '../../../sim/staff';
import { k, localize } from '../../../i18n';

/**
 * The 36 characters of the staff NFTs: six per role, from a plain hire to a legend. They are drawn by `PremiumBust` from these
 * descriptions: a semi-realistic, painterly bust (soft gradients, rim light, detailed eyes, fabrics) that is deliberately unlike
 * the chunky, thick-outlined NPCs. The higher the rarity, the more elaborate the gear, the trim and the effects around them.
 * Index: 0-1 common · 2-3 rare · 4 epic · 5 legendary (see VARIANT_TIER in sim/staff.ts).
 */
export type SkinKey = 'fair' | 'light' | 'tan' | 'olive' | 'brown' | 'deep';
export type FaceShape = 'oval' | 'square' | 'round' | 'long';
export type HairStyle = 'none' | 'buzz' | 'short' | 'slick' | 'wavy' | 'long' | 'bun' | 'braid' | 'dreads' | 'afro' | 'curly';
export type Beard = 'none' | 'stubble' | 'mustache' | 'goatee' | 'full';
export type Glasses = 'none' | 'round' | 'square' | 'sun' | 'goggles' | 'monocle' | 'cyber' | 'visor';
export type Gear = 'none' | 'hardhat' | 'cap' | 'strawhat' | 'beanie' | 'kerchief' | 'headset' | 'helmet' | 'crown' | 'hood' | 'laurel' | 'goggleshead' | 'sunvisor';
export type Outfit = 'tee' | 'labcoat' | 'hivis' | 'flannel' | 'apron' | 'hoodie' | 'suit' | 'coat' | 'robe' | 'exo' | 'dress' | 'overalls';
export type Prop = 'none' | 'clipboard' | 'flask' | 'dna' | 'jar' | 'sprout' | 'coin' | 'shears' | 'tablet' | 'loupe' | 'molecule' | 'preroll';

export interface Look {
  /** the character's archetype, shown on the card */
  title: string;
  skin: SkinKey; face: FaceShape;
  hair: HairStyle; hairColor: [string, string];
  beard: Beard; beardColor?: string;
  brow: string; eye: string; lashes?: boolean; lips?: string;
  glasses: Glasses; glassColor?: string;
  gear: Gear; gearColor?: [string, string];
  outfit: Outfit; colors: [string, string, string]; prop: Prop;
  age?: 'mid' | 'old'; freckles?: boolean; scar?: boolean;
  /** what the piece of the outfit that glows is called: epic and legendary only */
  glow?: string;
}

const H = {
  black: ['#1c1714', '#4a3f38'] as [string, string], brown: ['#4b3021', '#8a5a3a'] as [string, string], chestnut: ['#6a3b22', '#b36a3c'] as [string, string],
  blond: ['#c8a15a', '#f1d38a'] as [string, string], gray: ['#8d8f96', '#dfe1e8'] as [string, string], white: ['#cfd2da', '#ffffff'] as [string, string],
  red: ['#8a3018', '#d3683c'] as [string, string], plum: ['#4a2340', '#a84d8f'] as [string, string], teal: ['#155e63', '#4fd1c5'] as [string, string],
};

const TABLE: Record<StaffRole, Look[]> = {
  foreman: [
    { title: k('Obrero de turno'), skin: 'tan', face: 'square', hair: 'short', hairColor: H.black, beard: 'mustache', beardColor: '#2a2019', brow: '#231a14', eye: '#5a3a22', glasses: 'none', gear: 'hardhat', gearColor: ['#f5c518', '#b8900a'], outfit: 'hivis', colors: ['#f26b1d', '#2b3340', '#e8edf2'], prop: 'clipboard' },
    { title: k('Capataz veterano'), skin: 'light', face: 'square', hair: 'short', hairColor: H.gray, beard: 'full', beardColor: '#b9bcc4', brow: '#8f9299', eye: '#3f6a86', glasses: 'none', gear: 'cap', gearColor: ['#2f5d3a', '#1d3d26'], outfit: 'flannel', colors: ['#a3352b', '#2b2320', '#e8d9b8'], prop: 'clipboard', age: 'old' },
    { title: k('Ingeniera de sala'), skin: 'olive', face: 'oval', hair: 'bun', hairColor: H.brown, beard: 'none', brow: '#2b1d14', eye: '#3a2a1c', lashes: true, lips: '#b5524a', glasses: 'square', glassColor: '#1f2a37', gear: 'hardhat', gearColor: ['#f4f6f8', '#b8c0c9'], outfit: 'hivis', colors: ['#f8a51b', '#1f3a5a', '#e8edf2'], prop: 'tablet' },
    { title: k('Jefe de cuadrilla'), skin: 'deep', face: 'square', hair: 'none', hairColor: H.black, beard: 'goatee', beardColor: '#1a1412', brow: '#1a1412', eye: '#2a1a12', glasses: 'sun', glassColor: '#161b22', gear: 'headset', gearColor: ['#2b3340', '#141922'], outfit: 'hivis', colors: ['#ff7a1a', '#232a35', '#f1f5f9'], prop: 'clipboard' },
    { title: k('Maestro de obra'), skin: 'brown', face: 'square', hair: 'dreads', hairColor: H.black, beard: 'stubble', beardColor: '#1a1412', brow: '#171210', eye: '#33f0c8', glasses: 'goggles', glassColor: '#22d3ee', gear: 'helmet', gearColor: ['#3a4356', '#1a202c'], outfit: 'exo', colors: ['#2b3548', '#0f1520', '#22d3ee'], prop: 'tablet', glow: '#22d3ee' },
    { title: k('Titán de la sala'), skin: 'tan', face: 'square', hair: 'short', hairColor: H.blond, beard: 'full', beardColor: '#a98443', brow: '#8a6a30', eye: '#ffd54a', glasses: 'none', gear: 'crown', gearColor: ['#ffe27a', '#b8860b'], outfit: 'exo', colors: ['#c99a2e', '#3a2a0a', '#fff1a8'], prop: 'clipboard', glow: '#fcd34d', scar: true },
  ],
  farmer: [
    { title: k('Peón de campo'), skin: 'olive', face: 'round', hair: 'short', hairColor: H.brown, beard: 'stubble', beardColor: '#2c1f16', brow: '#2b1d14', eye: '#4a3020', glasses: 'none', gear: 'strawhat', gearColor: ['#e2c26a', '#a88a3a'], outfit: 'flannel', colors: ['#3f6b45', '#1f2f24', '#d7e6c4'], prop: 'shears', freckles: true },
    { title: k('Campesina'), skin: 'light', face: 'oval', hair: 'braid', hairColor: H.chestnut, beard: 'none', brow: '#5a3320', eye: '#4d7a4a', lashes: true, lips: '#c1655a', glasses: 'none', gear: 'kerchief', gearColor: ['#c94a3a', '#8f2d22'], outfit: 'overalls', colors: ['#3a5a7a', '#efe6d2', '#c9a23a'], prop: 'sprout', freckles: true },
    { title: k('Cultivador orgánico'), skin: 'tan', face: 'long', hair: 'wavy', hairColor: H.brown, beard: 'full', beardColor: '#3a2618', brow: '#2b1d14', eye: '#5a7a3a', glasses: 'round', glassColor: '#5a3f22', gear: 'strawhat', gearColor: ['#d8c98a', '#8f7a3a'], outfit: 'suit', colors: ['#4f6b3a', '#e9dcc0', '#2b3a22'], prop: 'sprout' },
    { title: k('Botánica de campo'), skin: 'brown', face: 'oval', hair: 'curly', hairColor: H.black, beard: 'none', brow: '#1c1512', eye: '#3a2618', lashes: true, lips: '#8f3f3a', glasses: 'none', gear: 'sunvisor', gearColor: ['#f4f1e6', '#b9b39a'], outfit: 'tee', colors: ['#5a8a3a', '#2a3f22', '#e8f3d0'], prop: 'loupe' },
    { title: k('Guardián del bosque'), skin: 'deep', face: 'square', hair: 'dreads', hairColor: H.black, beard: 'goatee', beardColor: '#15100e', brow: '#15100e', eye: '#7cf29a', glasses: 'none', gear: 'laurel', gearColor: ['#5fd06a', '#1f6a34'], outfit: 'robe', colors: ['#1f5a3a', '#0d2a1c', '#7cf29a'], prop: 'sprout', glow: '#7cf29a' },
    { title: k('Señor de la cosecha'), skin: 'olive', face: 'long', hair: 'long', hairColor: H.red, beard: 'full', beardColor: '#a5461f', brow: '#7a2f14', eye: '#ffd34a', glasses: 'none', gear: 'crown', gearColor: ['#9be05a', '#d9a520'], outfit: 'robe', colors: ['#2f7a3a', '#5a3a0a', '#ffd34a'], prop: 'sprout', glow: '#fcd34d' },
  ],
  merchant: [
    { title: k('Dependiente'), skin: 'light', face: 'round', hair: 'short', hairColor: H.chestnut, beard: 'none', brow: '#4a2a18', eye: '#4a6a8a', glasses: 'none', gear: 'cap', gearColor: ['#1f8a5a', '#0f5a3a'], outfit: 'apron', colors: ['#1f8a5a', '#2b3340', '#f4efe2'], prop: 'jar', freckles: true },
    { title: k('Dueño de grow shop'), skin: 'deep', face: 'square', hair: 'dreads', hairColor: H.black, beard: 'goatee', beardColor: '#15100e', brow: '#15100e', eye: '#2a1a12', glasses: 'none', gear: 'beanie', gearColor: ['#d94a2b', '#f2c12e'], outfit: 'tee', colors: ['#2a8f4a', '#141a17', '#f2c12e'], prop: 'jar' },
    { title: k('Comerciante'), skin: 'olive', face: 'oval', hair: 'slick', hairColor: H.black, beard: 'mustache', beardColor: '#1f1712', brow: '#1c1512', eye: '#3a2a1c', glasses: 'monocle', glassColor: '#d9b13a', gear: 'none', outfit: 'suit', colors: ['#5a2a3f', '#e8dcc0', '#d9b13a'], prop: 'coin' },
    { title: k('Magnate del mercado'), skin: 'tan', face: 'square', hair: 'slick', hairColor: H.gray, beard: 'stubble', beardColor: '#8d8f96', brow: '#6a6d75', eye: '#2b6a8f', glasses: 'sun', glassColor: '#101418', gear: 'none', outfit: 'coat', colors: ['#1d2a3a', '#d9c38a', '#f4d35e'], prop: 'coin', glow: '#f4d35e', age: 'mid' },
    { title: k('Rey del comercio'), skin: 'light', face: 'long', hair: 'wavy', hairColor: H.plum, beard: 'full', beardColor: '#5a2a4f', brow: '#4a2340', eye: '#d94fb8', glasses: 'none', gear: 'crown', gearColor: ['#ffe27a', '#b8860b'], outfit: 'robe', colors: ['#5a1f6a', '#2a0a3a', '#ffd54a'], prop: 'coin', glow: '#f0abfc' },
  ],
  scientist: [
    { title: k('Técnico de laboratorio'), skin: 'tan', face: 'oval', hair: 'short', hairColor: H.black, beard: 'none', brow: '#1c1512', eye: '#3a2a1c', glasses: 'goggles', glassColor: '#7dd3fc', gear: 'none', outfit: 'labcoat', colors: ['#f4f7fb', '#2b6a8f', '#cfd8e3'], prop: 'flask' },
    { title: k('Analista'), skin: 'fair', face: 'long', hair: 'long', hairColor: H.blond, beard: 'none', brow: '#8a6a30', eye: '#3f8a9a', lashes: true, lips: '#c8635a', glasses: 'round', glassColor: '#2b3340', gear: 'none', outfit: 'labcoat', colors: ['#f4f7fb', '#6a4f9a', '#cfd8e3'], prop: 'tablet' },
    { title: k('Química'), skin: 'brown', face: 'oval', hair: 'bun', hairColor: H.black, beard: 'none', brow: '#1c1512', eye: '#3a2618', lashes: true, lips: '#9a4a48', glasses: 'none', gear: 'goggleshead', gearColor: ['#22d3ee', '#0e7490'], outfit: 'labcoat', colors: ['#f4f7fb', '#10a37f', '#cfd8e3'], prop: 'molecule' },
    { title: k('Doctor'), skin: 'light', face: 'square', hair: 'short', hairColor: H.white, beard: 'full', beardColor: '#e6e8ee', brow: '#c9ccd4', eye: '#4a6a8a', glasses: 'round', glassColor: '#c0c6d0', gear: 'none', outfit: 'labcoat', colors: ['#f4f7fb', '#3a4a6a', '#cfd8e3'], prop: 'tablet', age: 'old' },
    { title: k('Alquimista'), skin: 'olive', face: 'long', hair: 'none', hairColor: H.black, beard: 'goatee', beardColor: '#2a1f18', brow: '#1c1512', eye: '#c084fc', glasses: 'monocle', glassColor: '#c084fc', gear: 'hood', gearColor: ['#3a2a6a', '#1a1238'], outfit: 'robe', colors: ['#4a3a8a', '#1a1238', '#c084fc'], prop: 'flask', glow: '#c084fc' },
    { title: k('Arquimago botánico'), skin: 'fair', face: 'long', hair: 'long', hairColor: H.white, beard: 'full', beardColor: '#f1f3f8', brow: '#dcdfe8', eye: '#5ef2d0', glasses: 'none', gear: 'laurel', gearColor: ['#7cf2c8', '#1f8a6a'], outfit: 'robe', colors: ['#1f4a6a', '#0a1f2f', '#5ef2d0'], prop: 'molecule', glow: '#5ef2d0', age: 'old' },
  ],
  geneticist: [
    { title: k('Becario'), skin: 'light', face: 'round', hair: 'curly', hairColor: H.red, beard: 'none', brow: '#7a3a1f', eye: '#3a7a4a', glasses: 'round', glassColor: '#2b3340', gear: 'none', outfit: 'hoodie', colors: ['#4a5a8a', '#2b3350', '#dfe6f5'], prop: 'dna', freckles: true },
    { title: k('Bióloga'), skin: 'deep', face: 'round', hair: 'afro', hairColor: H.black, beard: 'none', brow: '#15100e', eye: '#2a1a12', lashes: true, lips: '#7a3038', glasses: 'none', gear: 'none', outfit: 'labcoat', colors: ['#f4f7fb', '#b5455a', '#cfd8e3'], prop: 'dna' },
    { title: k('Genetista junior'), skin: 'tan', face: 'oval', hair: 'slick', hairColor: H.teal, beard: 'none', brow: '#155e63', eye: '#4fd1c5', glasses: 'visor', glassColor: '#22d3ee', gear: 'none', outfit: 'tee', colors: ['#20323f', '#0d1a24', '#22d3ee'], prop: 'dna' },
    { title: k('Profesor'), skin: 'fair', face: 'long', hair: 'wavy', hairColor: H.white, beard: 'mustache', beardColor: '#e6e8ee', brow: '#c9ccd4', eye: '#3a6a9a', glasses: 'round', glassColor: '#b9852a', gear: 'none', outfit: 'suit', colors: ['#7a2a3a', '#f0e6d0', '#3a1f26'], prop: 'dna', age: 'old' },
    { title: k('Ingeniero genómico'), skin: 'olive', face: 'square', hair: 'short', hairColor: H.black, beard: 'stubble', beardColor: '#241a14', brow: '#1c1512', eye: '#ff4d6a', glasses: 'cyber', glassColor: '#ff4d6a', gear: 'none', outfit: 'exo', colors: ['#2a2f45', '#111420', '#ff4d6a'], prop: 'dna', glow: '#ff4d6a' },
    { title: k('Creador de vida'), skin: 'brown', face: 'oval', hair: 'braid', hairColor: H.plum, beard: 'none', brow: '#2a1230', eye: '#a5f3fc', lashes: true, lips: '#a8407a', glasses: 'none', gear: 'crown', gearColor: ['#a5f3fc', '#7c3aed'], outfit: 'robe', colors: ['#2a1a6a', '#0d0a2a', '#a5f3fc'], prop: 'dna', glow: '#a5f3fc' },
  ],
  budtender: [
    { title: k('Ayudante'), skin: 'tan', face: 'round', hair: 'short', hairColor: H.chestnut, beard: 'none', brow: '#4a2a18', eye: '#3a2a1c', glasses: 'none', gear: 'cap', gearColor: ['#2a8f8a', '#0f5a56'], outfit: 'apron', colors: ['#1f8a80', '#2b3340', '#f4efe2'], prop: 'jar' },
    { title: k('Dependiente'), skin: 'brown', face: 'oval', hair: 'braid', hairColor: H.black, beard: 'none', brow: '#15100e', eye: '#2a1a12', lashes: true, lips: '#8a3a3f', glasses: 'none', gear: 'headset', gearColor: ['#d94fa0', '#8a1f5a'], outfit: 'tee', colors: ['#20323f', '#101a22', '#d94fa0'], prop: 'jar' },
    { title: k('Budtender experta'), skin: 'light', face: 'oval', hair: 'wavy', hairColor: H.plum, beard: 'none', brow: '#4a2340', eye: '#5a8a6a', lashes: true, lips: '#c04a70', glasses: 'none', gear: 'none', outfit: 'apron', colors: ['#14a394', '#1f2b33', '#f6f1e6'], prop: 'preroll', freckles: true },
    { title: k('Sommelier de flor'), skin: 'olive', face: 'long', hair: 'slick', hairColor: H.black, beard: 'mustache', beardColor: '#1f1712', brow: '#1c1512', eye: '#3a2a1c', glasses: 'none', gear: 'none', outfit: 'suit', colors: ['#1f4a3a', '#efe6d0', '#c9a23a'], prop: 'loupe' },
    { title: k('Curadora premium'), skin: 'tan', face: 'oval', hair: 'long', hairColor: H.chestnut, beard: 'none', brow: '#4a2a18', eye: '#e0a53a', lashes: true, lips: '#b5445a', glasses: 'none', gear: 'laurel', gearColor: ['#d9b13a', '#8a6a1a'], outfit: 'dress', colors: ['#1f6a5a', '#0d2a26', '#f4d35e'], prop: 'jar', glow: '#f4d35e' },
    { title: k('Leyenda del dispensario'), skin: 'deep', face: 'square', hair: 'afro', hairColor: H.black, beard: 'goatee', beardColor: '#15100e', brow: '#15100e', eye: '#ffd54a', glasses: 'sun', glassColor: '#ffb703', gear: 'crown', gearColor: ['#ffe27a', '#b8860b'], outfit: 'coat', colors: ['#7a1f3a', '#2a0a14', '#ffd54a'], prop: 'preroll', glow: '#ffd54a' },
  ],
};
// merchant #1 was retired (see RETIRED_VARIANTS in sim/staff.ts): the slot repeats #0 only so the other indexes don't shift; no hire gets it
TABLE.merchant.splice(1, 0, TABLE.merchant[0]);

export const LOOKS: Record<StaffRole, Look[]> = localize(TABLE, ['title']);

export const SKINS: Record<SkinKey, { base: string; light: string; shadow: string; blush: string; ear: string }> = {
  fair: { base: '#f0cdb6', light: '#fbe8da', shadow: '#d3a088', blush: '#f0968a', ear: '#e6b9a2' },
  light: { base: '#e7b999', light: '#f6d6bd', shadow: '#c0876a', blush: '#e88a78', ear: '#dba989' },
  tan: { base: '#d3a071', light: '#e8bd94', shadow: '#a97a4e', blush: '#d97a5a', ear: '#c4906a' },
  olive: { base: '#c08a5a', light: '#d6a577', shadow: '#94643c', blush: '#c86a4a', ear: '#b07a50' },
  brown: { base: '#9d6a44', light: '#b98459', shadow: '#744625', blush: '#b0563a', ear: '#8c5a38' },
  deep: { base: '#74472f', light: '#8f603f', shadow: '#4c2b18', blush: '#8a4028', ear: '#663d28' },
};
