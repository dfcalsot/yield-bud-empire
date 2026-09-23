import { UserProfile, UserAccountData, PlantInGrow, Strain } from '../types';
import { k } from '../i18n/core';

export const DEFAULT_DEMO_USERS: UserProfile[] = [
  {
    id: 'usr-satoshi',
    username: 'satoshi_grower',
    email: 'satoshi@chronoflora.sol',
    displayName: k('Satoshi Grower'),
    avatar: '👨‍🌾',
    role: 'Master Grower',
    walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    preferredNetwork: 'devnet',
    bio: k('Pionero de la botánica descentralizada. Especialista en fenocaza de tricomas glandulares en Solana.'),
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 45,
    experienceLevel: 14,
    facilityName: k('Satoshi Genetic Sanctuary')
  },
  {
    id: 'usr-elena',
    username: 'elena_botanist',
    email: 'elena.rosin@chronoflora.sol',
    displayName: k('Dra. Elena Ramos'),
    avatar: '👩‍🔬',
    role: 'Genetista Comercial',
    walletAddress: 'GSo1anaBioLab99ZpQo24hRtMvWzKpN5e8yUcTa492Xw1',
    preferredNetwork: 'mainnet-beta',
    bio: k('Doctora en fitoquímica cannábica y extracción de colofonia viva sin solventes (Solventless Rosin).'),
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
    experienceLevel: 9,
    facilityName: k('Laboratorio Fitoquímico Ramos')
  },
  {
    id: 'usr-novice',
    username: 'novato_verde',
    email: 'aprendiz@chronoflora.sol',
    displayName: k('Carlos Aprendiz'),
    avatar: '🌱',
    role: 'Principiante Botánico',
    walletAddress: '9NoviceSproutKeyDevnet7718293746251624890123',
    preferredNetwork: 'testnet',
    bio: k('Comenzando mi primer ciclo de cultivo hidropónico guiado por las tablas de nutrición oficiales.'),
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    experienceLevel: 2,
    facilityName: k('Carpa Casera 80x80')
  }
];

const STORAGE_USERS_KEY = 'chronoflora_all_users_v2';
const STORAGE_CURRENT_USER_KEY = 'chronoflora_current_user_id_v2';
const STORAGE_USER_DATA_PREFIX = 'chronoflora_userdata_v2_';

// Retrieve all profiles
export function getStoredUserProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_DEMO_USERS));
      return DEFAULT_DEMO_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_DEMO_USERS;
  } catch {
    return DEFAULT_DEMO_USERS;
  }
}

// Save a profile
export function saveUserProfile(user: UserProfile): void {
  const users = getStoredUserProfiles();
  const index = users.findIndex(u => u.id === user.id);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
}

// Active user ID
export function getActiveUserId(): string {
  try {
    const id = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    return id || DEFAULT_DEMO_USERS[0].id;
  } catch {
    return DEFAULT_DEMO_USERS[0].id;
  }
}

export function setActiveUserId(userId: string): void {
  localStorage.setItem(STORAGE_CURRENT_USER_KEY, userId);
}

// User-isolated game data
export function loadUserData(userId: string): Partial<UserAccountData> | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_USER_DATA_PREFIX}${userId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading user data for', userId, err);
    return null;
  }
}

export function saveUserData(userId: string, data: Partial<UserAccountData>): void {
  try {
    localStorage.setItem(`${STORAGE_USER_DATA_PREFIX}${userId}`, JSON.stringify({
      ...data,
      savedAt: Date.now()
    }));
  } catch (err) {
    console.error('Error saving user data for', userId, err);
  }
}

export interface LocalSaveSummary { id: string; name: string; plots: number; plants: number; flora: number; sol: number; level: number; savedAt: number }

/** Partidas guardadas en ESTE navegador que no son de la cuenta activa (p. ej. las de antes de existir las cuentas de servidor).
 *  Solo las que tienen progreso real y no fueron ya traídas a otra cuenta. */
export function listLocalSaves(exceptId: string): LocalSaveSummary[] {
  const out: LocalSaveSummary[] = [];
  try {
    const profiles = getStoredUserProfiles();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_USER_DATA_PREFIX)) continue;
      const id = key.slice(STORAGE_USER_DATA_PREFIX.length);
      if (id === exceptId) continue;
      const d = loadUserData(id);
      if (!d || d.migratedTo) continue;
      const plots = Array.isArray(d.plots) ? d.plots.length : 0;
      const plants = (Array.isArray(d.indoorPlants) && d.indoorPlants.length > 0 ? d.indoorPlants.length : d.activePlant ? 1 : 0)
        + (Array.isArray(d.plots) ? d.plots.reduce((n, p) => n + (p.plants?.length ?? 0), 0) : 0);
      const level = typeof d.playerLevel === 'number' ? d.playerLevel : 1;
      if (plots === 0 && plants === 0 && level <= 1) continue;
      out.push({
        id, name: d.profile?.displayName ?? profiles.find((u) => u.id === id)?.displayName ?? id, plots, plants,
        flora: Math.round(d.floraBalance ?? 0), sol: Number((d.solBalance ?? 0).toFixed(2)), level, savedAt: d.savedAt ?? 0,
      });
    }
  } catch { /* storage unavailable */ }
  return out.sort((a, b) => b.plots - a.plots || b.savedAt - a.savedAt);
}
