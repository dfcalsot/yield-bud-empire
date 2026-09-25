import { useEffect, useState } from 'react';

/**
 * Trial of the new 3D-mascot portraits for the base cast (Nico, Flora/Floro, Tomás, Lucía, Rafa, Marta) and the staff.
 * Off by default: `?arte=3d` turns it on for this browser, `?arte=clasico` back off (kept in localStorage).
 * Chrono keeps the classic art: his 3D design (King Bud) is not approved yet.
 */
export const NPC_ART3D = new Set(['foreman', 'flora', 'floro', 'farmer', 'scientist', 'geneticist', 'budtender']);

/** staff designs with a 3D portrait (`public/staff3d/<role>-<variant>.webp`); the rest keep the drawn bust */
const STAFF_MISSING = new Set(['merchant-1']);
export const staffArt3d = (role: string, variant: number): string | null => (STAFF_MISSING.has(`${role}-${variant}`) ? null : `/staff3d/${role}-${variant}.webp`);

const KEY = 'ybe_npc_art';
const EVENT = 'ybe:npc-art';

const read = (): boolean => {
  try {
    const q = new URLSearchParams(window.location.search).get('arte');
    if (q === '3d' || q === 'clasico') localStorage.setItem(KEY, q);
    return localStorage.getItem(KEY) === '3d';
  } catch { return false; }
};

export function useNpcArt3d(): boolean {
  const [on, setOn] = useState<boolean>(read);
  useEffect(() => {
    const f = () => setOn(read());
    window.addEventListener(EVENT, f); window.addEventListener('storage', f);
    return () => { window.removeEventListener(EVENT, f); window.removeEventListener('storage', f); };
  }, []);
  return on;
}
