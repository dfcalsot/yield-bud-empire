import { useEffect, useState } from 'react';

/**
 * Which room the grow scene shows. It is a look only: the plants, the capacity and the climate bonus always come from the best
 * facility the player has (the economy's tier). Any facility already reached can be picked as the backdrop; the choice is kept
 * per device (like the shopkeeper) and falls back to the current facility when it isn't valid any more.
 */
const KEY = 'ybe_scene';
const EVENT = 'ybe:scene';

const read = (): string | null => { try { return localStorage.getItem(KEY); } catch { return null; } };

export function setScene(id: string | null) {
  try { if (id) localStorage.setItem(KEY, id); else localStorage.removeItem(KEY); } catch { /* private mode: the choice just isn't kept */ }
  window.dispatchEvent(new Event(EVENT));
}

/** the facility id to draw: the chosen one when the player has reached it, otherwise the current one */
export function useSceneId(current: { id: string; tier: number }, facilities: Array<{ id: string; tier: number }>): string {
  const [chosen, setChosen] = useState<string | null>(read);
  useEffect(() => {
    const f = () => setChosen(read());
    window.addEventListener(EVENT, f); window.addEventListener('storage', f);
    return () => { window.removeEventListener(EVENT, f); window.removeEventListener('storage', f); };
  }, []);
  const pick = chosen ? facilities.find((f) => f.id === chosen) : undefined;
  return pick && pick.tier <= current.tier ? pick.id : current.id;
}
