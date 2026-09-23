
import { k, localize } from '../i18n/core';/** the game wallet and the external wallets linked to the account (server/wallet.mjs) */
export type Chain = 'solana' | 'ronin';
export interface WalletLink { chain: Chain; address: string; linkedAt: number }
export interface WalletInfo { account: { id: number; username: string; email: string | null }; gameAddress: string; chains: Record<Chain, { name: string; network: string }>; links: WalletLink[] }

const call = async <T>(path: string, body?: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> => {
  try {
    const r = await fetch(path, body === undefined ? { credentials: 'same-origin' } : { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-cf-csrf': '1' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, data: j as T } : { ok: false, error: (j as { error?: string }).error ?? 'error' };
  } catch { return { ok: false, error: 'offline' }; }
};

export const getWallet = () => call<WalletInfo>('/api/wallet');
export const challenge = (chain: Chain, address: string) => call<{ nonce: string; message: string; address: string; exp: number }>('/api/wallet/challenge', { chain, address });
export const link = (chain: Chain, address: string, nonce: string, signature: string) => call<WalletInfo>('/api/wallet/link', { chain, address, nonce, signature });
export const unlink = (chain: Chain) => call<WalletInfo>('/api/wallet/unlink', { chain });

export const WALLET_ERRORS: Record<string, string> = localize<Record<string, string>>({
  bad_signature: k('La firma no corresponde a esa billetera.'), bad_nonce: k('El desafío no es válido: vuelve a intentarlo.'), nonce_expired: k('El desafío caducó: vuelve a intentarlo.'),
  already_linked: k('Ya tienes una billetera de esa red: desvincúlala primero.'), wallet_taken: k('Esa billetera ya está vinculada a otra cuenta.'),
  bad_address: k('La dirección no es válida.'), bad_chain: k('Red no soportada.'), offline: k('Sin conexión con el servidor.'), unauthenticated: k('Inicia sesión primero.'), rate_limited: k('Demasiado rápido, espera un momento.'),
}, ['bad_signature', 'bad_nonce', 'nonce_expired', 'already_linked', 'wallet_taken', 'bad_address', 'bad_chain', 'offline', 'unauthenticated', 'rate_limited']);

export const b64 = (bytes: Uint8Array): string => { let s = ''; bytes.forEach((b) => { s += String.fromCharCode(b); }); return btoa(s); };
