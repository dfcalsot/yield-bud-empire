import { useEffect, useState } from 'react';

/**
 * The 3D-mascot art for the base cast (Chrono, Nico, Flor/Rudy, Tomás, Lucía, Rafa, Marta), the staff and the scenes.
 * On for everyone since 2026-09-25; `?arte=clasico` brings back the drawn art in this browser and `?arte=3d` turns it on again (kept in localStorage).
 * Chrono is the seed with the pocket watch (King Bud is not approved yet); he has no backdrop, he is always a cut-out.
 */
export const NPC_ART3D = new Set(['chrono', 'foreman', 'flora', 'floro', 'farmer', 'scientist', 'geneticist', 'budtender']);

/** wide scenes painted for the panel behind a character (`public/npc3d/<file>-scene.webp`): by job, plus a few by page (`perfil`, `tablas`, `mezclas` = Nutrition → Mixing lab) */
const SCENES: Record<string, string> = { foreman: 'foreman', merchant: 'growshop', flora: 'growshop', floro: 'growshop', geneticist: 'geneticist', scientist: 'scientist', budtender: 'budtender', farmer: 'farmer', perfil: 'perfil', tablas: 'tablas', mezclas: 'mezclas' };
export const sceneArt3d = (id: string): string | null => (SCENES[id] ? `/npc3d/${SCENES[id]}-scene.webp` : null);

/** the 3D portrait of a staff design (`public/staff3d/<role>-<variant>.webp`; merchant-1 is retired, see RETIRED_VARIANTS) */
export const staffArt3d = (role: string, variant: number): string => `/staff3d/${role}-${variant}.webp`;

const KEY = 'ybe_npc_art';
const EVENT = 'ybe:npc-art';

const read = (): boolean => {
  try {
    const q = new URLSearchParams(window.location.search).get('arte');
    if (q === '3d' || q === 'clasico') localStorage.setItem(KEY, q);
    return localStorage.getItem(KEY) !== 'clasico';
  } catch { return true; }
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
