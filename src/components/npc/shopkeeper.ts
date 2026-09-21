import { useEffect, useState } from 'react';

/** Who runs the grow shop: Flora or Floro, chosen by the player (kept per device in localStorage). */
export type Shopkeeper = 'flora' | 'floro';
const KEY = 'ybe_shopkeeper';
const EVENT = 'ybe:shopkeeper';

export const getShopkeeper = (): Shopkeeper => {
  try { return localStorage.getItem(KEY) === 'floro' ? 'floro' : 'flora'; } catch { return 'flora'; }
};

export const setShopkeeper = (v: Shopkeeper) => {
  try { localStorage.setItem(KEY, v); } catch { /* private mode: the choice lasts until reload */ }
  window.dispatchEvent(new Event(EVENT));
};

export const shopkeeperName = (v: Shopkeeper) => (v === 'floro' ? 'Floro' : 'Flora');

export function useShopkeeper(): [Shopkeeper, (v: Shopkeeper) => void] {
  const [v, setV] = useState<Shopkeeper>(getShopkeeper);
  useEffect(() => {
    const on = () => setV(getShopkeeper());
    window.addEventListener(EVENT, on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener(EVENT, on); window.removeEventListener('storage', on); };
  }, []);
  return [v, setShopkeeper];
}
