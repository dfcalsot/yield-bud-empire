import { useEffect, useState } from 'react';

/**
 * Trial of the new 3D-mascot portraits for the base cast (Chrono, Nico, Flora/Floro, Tomás, Lucía, Rafa, Marta).
 * Off by default: `?arte=3d` turns it on for this browser, `?arte=clasico` back off (kept in localStorage).
 */
const KEY = 'ybe_npc_art';
const EVENT = 'ybe:npc-art';

const read = (): boolean => {
  try {
    const q = new URLSearchParams(window.location.search).get('arte');
    if (q === '3d' || q === 'clasico') localStorage.setItem(KEY, q);
    return localStorage.getItem(KEY) === '3d';
  } catch { return false; }
};

export const NPC_ART_3D: Record<string, string> = {
  chrono: '/npc3d/chrono.webp', foreman: '/npc3d/foreman.webp', flora: '/npc3d/flora.webp', floro: '/npc3d/floro.webp',
  farmer: '/npc3d/farmer.webp', scientist: '/npc3d/scientist.webp', geneticist: '/npc3d/geneticist.webp', budtender: '/npc3d/budtender.webp',
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
