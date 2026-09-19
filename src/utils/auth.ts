import { UserProfile, UserAccountData, PlantInGrow, Strain } from '../types';

export const DEFAULT_DEMO_USERS: UserProfile[] = [
  {
    id: 'usr-satoshi',
    username: 'satoshi_grower',
    email: 'satoshi@chronoflora.sol',
    displayName: 'Satoshi Grower',
    avatar: '👨‍🌾',
    role: 'Master Grower',
    walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    preferredNetwork: 'devnet',
    bio: 'Pionero de la botánica descentralizada. Especialista en fenocaza de tricomas glandulares en Solana.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 45,
    experienceLevel: 14,
    facilityName: 'Satoshi Genetic Sanctuary'
  },
  {
    id: 'usr-elena',
    username: 'elena_botanist',
    email: 'elena.rosin@chronoflora.sol',
    displayName: 'Dra. Elena Ramos',
    avatar: '👩‍🔬',
    role: 'Genetista Comercial',
    walletAddress: 'GSo1anaBioLab99ZpQo24hRtMvWzKpN5e8yUcTa492Xw1',
    preferredNetwork: 'mainnet-beta',
    bio: 'Doctora en fitoquímica cannábica y extracción de colofonia viva sin solventes (Solventless Rosin).',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 20,
    experienceLevel: 9,
    facilityName: 'Laboratorio Fitoquímico Ramos'
  },
  {
    id: 'usr-novice',
    username: 'novato_verde',
    email: 'aprendiz@chronoflora.sol',
    displayName: 'Carlos Aprendiz',
    avatar: '🌱',
    role: 'Principiante Botánico',
    walletAddress: '9NoviceSproutKeyDevnet7718293746251624890123',
    preferredNetwork: 'testnet',
    bio: 'Comenzando mi primer ciclo de cultivo hidropónico guiado por las tablas de nutrición oficiales.',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    experienceLevel: 2,
    facilityName: 'Carpa Casera 80x80'
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
