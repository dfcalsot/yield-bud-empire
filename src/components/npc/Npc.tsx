import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NpcV2, NPC_NAMES_V2 } from './rig/NpcV2';
import type { Mood2 } from './rig/parts';
import { shopkeeperName, type Shopkeeper } from './shopkeeper';
import { t } from '../../i18n';

/**
 * The cast: the people of the cannabis industry (grow shop, outdoor grower, lab, genetics, dispensary) plus Chrono, the guide.
 * They are drawn by the layered SVG rig in `./rig` (eyes that follow the cursor, lip-sync, six moods); this file keeps the
 * public API every view already uses: the `Npc` component and the `useNpc` / `useNpcSay` speech hooks.
 */
/** the characters that hand out missions (Chrono, the guide, has its own tutorial) */
export type NpcKind = 'merchant' | 'farmer' | 'scientist' | 'geneticist' | 'budtender';
export type Mood = Mood2;

export const NPC_NAMES: Record<NpcKind, string> = {
  merchant: NPC_NAMES_V2.merchant,
  farmer: NPC_NAMES_V2.farmer,
  scientist: NPC_NAMES_V2.scientist,
  geneticist: NPC_NAMES_V2.geneticist,
  budtender: NPC_NAMES_V2.budtender,
};

/** Display name of a character; the grow-shop keeper depends on the player's choice (Flor / Rudy; internal ids 'flora' / 'floro'). */
export const npcName = (kind: NpcKind, shop: Shopkeeper = 'flora') => (kind === 'merchant' ? t('{v0} · Grow Shop', { v0: shopkeeperName(shop) }) : NPC_NAMES[kind]);

/** Speech state for a character: `speak(text, mood)` restarts the reaction animation even when the mood repeats. */
export function useNpcSay(initial: string, mood: Mood = 'idle') {
  const [say, setSay] = useState<{ text: string; mood: Mood; key: number }>({ text: initial, mood, key: 0 });
  const speak = useCallback((text: string, m: Mood = 'idle') => setSay((s) => ({ text, mood: m, key: s.key + 1 })), []);
  return { say, speak };
}

/**
 * A character with its own memory: `speak` (reacting to something you did) and periodic tips drawn from `tips.current()`,
 * which the view reassigns on every render so the advice always reflects the current game state.
 */
export function useNpc(initial: string) {
  const { say, speak } = useNpcSay(initial);
  const last = useRef(Date.now());
  const tips = useRef<() => string[]>(() => []);
  const say2 = useCallback((text: string, m: Mood = 'idle') => { last.current = Date.now(); speak(text, m); }, [speak]);
  useEffect(() => {
    const tip = () => {
      if (Date.now() - last.current < 14000) return;
      const list = tips.current();
      if (list.length) speak(list[Math.floor(Math.random() * list.length)], 'idle');
    };
    const id = window.setInterval(tip, 10000);
    const first = window.setTimeout(tip, 7000);
    return () => { window.clearInterval(id); window.clearTimeout(first); };
  }, [speak]);
  return { say, speak: say2, tips };
}

export const Npc: React.FC<{
  kind: NpcKind | 'chrono' | 'foreman';
  variant?: Shopkeeper;
  text: string;
  mood: Mood;
  moodKey: number;
  /** figure only, no speech bubble (small corner cameo) */
  bare?: boolean;
  className?: string;
  noScene?: boolean;
  scene?: string;
}> = (props) => <NpcV2 {...props} />;
