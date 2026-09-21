/**
 * Ronin Wallet (browser extension) speaks EIP-1193 through `window.ronin.provider`. We only ever ask it for the account and a
 * `personal_sign` of a message the server issued: no transactions, nothing that moves funds.
 */
interface Eip1193 { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> }
declare global { interface Window { ronin?: { provider?: Eip1193 } & Partial<Eip1193> } }

export const roninProvider = (): Eip1193 | null => {
  if (typeof window === 'undefined') return null;
  const r = window.ronin;
  if (r?.provider && typeof r.provider.request === 'function') return r.provider;
  if (r && typeof r.request === 'function') return r as Eip1193;
  return null;
};

const toHex = (s: string): string => '0x' + Array.from(new TextEncoder().encode(s)).map((b) => b.toString(16).padStart(2, '0')).join('');

export async function connectRonin(): Promise<{ address: string; provider: Eip1193 }> {
  const provider = roninProvider();
  if (!provider) throw new Error('No se encontró Ronin Wallet. Instala la extensión desde wallet.roninchain.com.');
  try {
    const accts = (await provider.request({ method: 'eth_requestAccounts' })) as string[];
    const address = accts?.[0];
    if (!address) throw new Error('Ronin Wallet no devolvió ninguna cuenta.');
    return { address, provider };
  } catch (e) {
    const err = e as { code?: number; message?: string };
    throw new Error(err.code === 4001 ? 'Rechazaste la conexión en Ronin Wallet.' : err.message || 'No se pudo conectar Ronin Wallet.');
  }
}

/** EIP-191 personal_sign; the message goes as hex so no wallet has to guess its encoding */
export async function signRonin(provider: Eip1193, address: string, message: string): Promise<string> {
  try { return (await provider.request({ method: 'personal_sign', params: [toHex(message), address] })) as string; }
  catch (e) {
    const err = e as { code?: number; message?: string };
    throw new Error(err.code === 4001 ? 'Rechazaste la firma en Ronin Wallet.' : err.message || 'No se pudo firmar.');
  }
}
