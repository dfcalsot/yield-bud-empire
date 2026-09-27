/**
 * The browser's side of the Founder Pack (server/founder.mjs): a Solana Pay order in USDC, paid by scanning its QR or with the
 * browser wallet, and the server delivering the pack when it sees the payment on the chain.
 */
import { useCallback, useEffect, useState } from 'react';
import { Connection, Transaction } from '@solana/web3.js';
import { connectBrowserWallet, detectSolanaProviders } from '../utils/solana';
import { t, k } from '../i18n';

export interface FounderOrder { id: number; status: 'open' | 'expired' | 'delivered' | 'underpaid' | 'refund_needed' | 'refunded'; amount: number; reference: string; url: string; expiresAt: number; sig: string | null; explorer: string | null }
export interface FounderMe { number: number; credits: boolean; title: FounderTitle | null; titles: FounderTitle[]; earlyAccess: boolean }
export type FounderTitle = 'arquitecto' | 'maestro';
/** the pack's titles: name and art */
export const FOUNDER_TITLE: Record<FounderTitle, { name: string; img: string }> = {
  arquitecto: { name: k('Arquitecto del Imperio'), img: '/founder/perk-arquitecto.webp' },
  maestro: { name: k('Maestro del Cultivo'), img: '/founder/perk-maestro.webp' },
};
export interface FounderStatus { enabled: boolean; network: string; price: number; supply: number; sold: number; left: number; mint: string; receiver: string | null; me: FounderMe | null; order: FounderOrder | null }
export interface FounderCredits { supply: number; sold: number; price: number; founders: Array<{ number: number; name: string; title: FounderTitle | null }> }

const get = async <T,>(path: string): Promise<T | null> => { try { const r = await fetch(path, { credentials: 'same-origin' }); return r.ok ? (await r.json()) as T : null; } catch { return null; } };
const post = async <T,>(path: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> => {
  try {
    const r = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-cf-csrf': '1' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, data: j as T } : { ok: false, error: String((j as { error?: string }).error ?? 'error') };
  } catch { return { ok: false, error: 'offline' }; }
};

const REASON: Record<string, string> = {
  founder_off: k('El Pack de Fundador todavía no está a la venta.'), founder_already: k('Ya eres fundador: el pack es uno por cuenta.'),
  founder_sold_out: k('No quedan packs libres ahora mismo. Si alguien no paga su pedido en 30 minutos, se libera.'),
  founder_order_closed: k('Ese pedido ya venció. Crea uno nuevo.'), founder_no_usdc: k('Esa billetera no tiene USDC suficiente en esta red.'),
  bad_address: k('Esa dirección de billetera no es válida.'), offline: k('Sin conexión con el servidor'), rate_limited: k('Demasiados intentos. Espera un momento.'),
};
export const founderText = (code: string) => (REASON[code] ? t(REASON[code]) : code);

export const fetchFounder = () => get<FounderStatus>('/api/founder/status');
export const fetchCredits = () => get<FounderCredits>('/api/public/founders');
export const createOrder = () => post<{ order: FounderOrder }>('/api/founder/order', {});
export const fetchOrder = (id: number) => get<{ order: FounderOrder; me: FounderMe | null }>(`/api/founder/order?id=${id}`);
export const setCredits = (show: boolean) => post<{ show: boolean }>('/api/founder/credits', { show });
export const setTitle = (title: FounderTitle | null) => post<{ me: FounderMe }>('/api/founder/title', { title });

/** the founder status, shared by the badge and the Founders page (one request per mount) */
export function useFounder() {
  const [status, setStatus] = useState<FounderStatus | null>(null);
  const reload = useCallback(async () => { setStatus(await fetchFounder()); }, []);
  useEffect(() => { void reload(); }, [reload]);
  return { status, reload, setStatus };
}

/** pay an open order with the wallet in this browser: the server builds the USDC transfer, the wallet signs and sends it */
export async function payWithWallet(order: FounderOrder, network: string, onStep: (s: string) => void): Promise<{ ok: true } | { ok: false; error: string }> {
  const kind = detectSolanaProviders().find((p) => p.isInstalled && p.id !== 'virtual')?.id as 'phantom' | 'solflare' | 'backpack' | 'injected' | undefined;
  if (!kind) return { ok: false, error: t('No hay una billetera Solana en este navegador. Escanea el QR con Phantom o Solflare en tu celular.') };
  let w;
  try { w = await connectBrowserWallet(kind); } catch (e) { return { ok: false, error: (e as Error).message }; }
  onStep(t('Preparando el pago…'));
  const built = await post<{ tx: string }>('/api/founder/pay-tx', { id: order.id, payer: w.publicKey });
  if (!built.ok) return { ok: false, error: founderText(built.error) };
  const tx = Transaction.from(Uint8Array.from(atob(built.data.tx), (c) => c.charCodeAt(0)));
  onStep(t('Confirma el pago de {v0} USDC en tu billetera…', { v0: order.amount }));
  try {
    if (typeof w.provider.signAndSendTransaction === 'function') await w.provider.signAndSendTransaction(tx);
    else {
      const signed = await w.provider.signTransaction(tx);
      await new Connection(network === 'devnet' ? 'https://api.devnet.solana.com' : 'https://api.mainnet-beta.solana.com').sendRawTransaction(signed.serialize());
    }
  } catch (e) { return { ok: false, error: (e as Error)?.message || t('La billetera rechazó el pago.') }; }
  return { ok: true };
}
