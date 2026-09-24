/**
 * The browser's side of the relic bridge (server/bridge.mjs): status, take a relic out to Solana, bring one back. Bringing one back
 * is a transfer the player's own wallet signs (the server only builds it and then checks the chain).
 */
import { VersionedTransaction, Connection } from '@solana/web3.js';
import { connectBrowserWallet, detectSolanaProviders } from '../utils/solana';
import type { Relic } from '../sim/relics';
import { reasonText } from './ledger';
import { t, k } from '../i18n';

export interface BridgeStatus {
  enabled: boolean; network: string; vault: string | null; collection: string | null; wallet: string | null; dev: boolean;
  fees: Record<string, number>; left: number;
  outside: Array<{ relic: Relic; state: 'out' | 'onchain'; asset: string | null; explorer: string | null }>;
}
export interface MineAsset { asset: string; name: string; relic: Relic | null; explorer: string }

const get = async <T,>(path: string): Promise<T | null> => { try { const r = await fetch(path, { credentials: 'same-origin' }); return r.ok ? (await r.json()) as T : null; } catch { return null; } };
const post = async <T,>(path: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> => {
  try {
    const r = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-cf-csrf': '1' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, data: j as T } : { ok: false, error: String((j as { error?: string }).error ?? 'error') };
  } catch { return { ok: false, error: 'offline' }; }
};

export const BRIDGE_REASON: Record<string, string> = {
  bridge_off: k('El puente está apagado por ahora.'), bridge_no_wallet: k('Primero vincula una billetera Solana (Billetera → Vincular).'),
  bridge_dev: k('Las cuentas de desarrollador no sacan reliquias a Solana.'), bridge_equipped: k('Quítala antes de sacarla (está equipada).'),
  bridge_daily_cap: k('Llegaste al máximo de salidas de hoy. Vuelve mañana.'), bridge_not_ours: k('Ese NFT no es una reliquia de Yield Bud Empire.'),
  bridge_not_owner: k('Esa reliquia no está en tu billetera vinculada.'), bridge_not_in_vault: k('Todavía no llegó a la bóveda del juego.'),
  bridge_not_sender: k('La transferencia no la firmó tu billetera vinculada.'), bridge_already_in: k('Esa reliquia ya está en el juego.'),
  relic_bound: k('Esa reliquia está ligada a tu cuenta: no se puede vender'), not_yours: k('Eso no es tuyo'), insufficient: k('Saldo insuficiente'),
};
export const bridgeText = (code: string) => (BRIDGE_REASON[code] ? t(BRIDGE_REASON[code]) : reasonText(code) ?? code);

export const fetchBridge = () => get<BridgeStatus>('/api/bridge/status');
export const fetchMine = () => get<{ wallet: string | null; assets: MineAsset[] }>('/api/bridge/mine');
export const withdrawRelic = (relicId: string) => post<{ fee: number; asset: string }>('/api/bridge/withdraw', { relicId });

/**
 * Bring a relic back: the server builds the transfer to the vault, the player's wallet (the linked one) signs and sends it,
 * then the server is asked until it sees the relic in the vault.
 */
export async function depositRelic(asset: string, linkedWallet: string, network: string, onStep: (s: string) => void): Promise<{ ok: true } | { ok: false; error: string }> {
  const built = await post<{ tx: string }>('/api/bridge/deposit-tx', { asset });
  if (!built.ok) return built;
  const kind = detectSolanaProviders().find((p) => p.isInstalled && p.id !== 'virtual')?.id as 'phantom' | 'solflare' | 'backpack' | 'injected' | undefined;
  if (!kind) return { ok: false, error: t('Necesitas una billetera Solana en el navegador (Phantom, Solflare o Backpack).') };
  onStep(t('Firma la transferencia en tu billetera…'));
  const w = await connectBrowserWallet(kind);
  if (w.publicKey !== linkedWallet) return { ok: false, error: t('La billetera conectada no es la vinculada a tu cuenta ({v0}…).', { v0: linkedWallet.slice(0, 6) }) };
  const tx = VersionedTransaction.deserialize(Uint8Array.from(atob(built.data.tx), (c) => c.charCodeAt(0)));
  try {
    if (typeof w.provider.signAndSendTransaction === 'function') await w.provider.signAndSendTransaction(tx);
    else {
      const signed = await w.provider.signTransaction(tx);
      await new Connection(network === 'devnet' ? 'https://api.devnet.solana.com' : 'https://api.mainnet-beta.solana.com').sendRawTransaction(signed.serialize());
    }
  } catch (e) { return { ok: false, error: (e as Error)?.message || t('La billetera rechazó la transferencia.') }; }
  onStep(t('Esperando la confirmación de Solana…'));
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const d = await post('/api/bridge/deposit', { asset });
    if (d.ok) return { ok: true };
    if (d.error !== 'bridge_not_in_vault' && d.error !== 'bridge_not_sender') return d;
  }
  return { ok: false, error: t('Solana tarda en confirmar. Vuelve a intentarlo en un minuto: la reliquia no se pierde.') };
}
