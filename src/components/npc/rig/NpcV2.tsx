import React, { useEffect, useRef, useState } from 'react';
import './rig.css';
import { RigDefs, reducedMotion, useLook, visemeOf, type Mood2 } from './parts';
import { Chrono, type FigureV2 } from './figures';
import { Flora, Floro, Tomas, Lucia, Rafa, Marta, Nico } from './cast';
import { shopkeeperName, useShopkeeper, type Shopkeeper } from '../shopkeeper';

/**
 * NPC rig v2. Same contract as `Npc` (kind, text, mood, moodKey, bare) so it can replace it call site by call site,
 * plus the new moods `think` and `wave`. Eyes follow the cursor and the mouth lip-syncs to the typed letters.
 * Cast: Chrono (guide) plus the five industry characters (grow shop, outdoor grower, lab, genetics, dispensary).
 */
export type NpcKindV2 = 'chrono' | 'foreman' | 'merchant' | 'farmer' | 'scientist' | 'geneticist' | 'budtender';

const FIGURES: Record<NpcKindV2, FigureV2> = { chrono: Chrono, foreman: Nico, merchant: Flora, farmer: Tomas, scientist: Lucia, geneticist: Rafa, budtender: Marta };

export const NPC_NAMES_V2: Record<NpcKindV2, string> = {
  chrono: 'Chrono · Guía',
  foreman: 'Nico · Capataz',
  merchant: 'Flora · Grow Shop',
  farmer: 'Tomás · Cultivador',
  scientist: 'Dra. Lucía · Laboratorio',
  geneticist: 'Prof. Rafa · Genetista',
  budtender: 'Marta · Dispensaria',
};

export const NpcV2: React.FC<{
  kind: NpcKindV2;
  text: string;
  mood: Mood2;
  moodKey: number;
  bare?: boolean;
  className?: string;
  /** force a grow-shop keeper (previews); by default it follows the player's choice */
  variant?: Shopkeeper;
}> = ({ kind, text, mood, moodKey, bare, className = '', variant }) => {
  const [chosen] = useShopkeeper();
  const shop = variant ?? chosen;
  const [shown, setShown] = useState(text);
  const ref = useRef<HTMLDivElement>(null);
  const look = useLook(ref);

  useEffect(() => {
    if (reducedMotion()) { setShown(text); return; }
    setShown('');
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) window.clearInterval(id);
    }, 24);
    return () => window.clearInterval(id);
  }, [text]);

  const talking = shown.length < text.length;
  const Fig = kind === 'merchant' && shop === 'floro' ? Floro : FIGURES[kind];
  const label = kind === 'merchant' ? `${shopkeeperName(shop)} · Grow Shop` : NPC_NAMES_V2[kind];

  return (
    <div className={`flex items-end gap-1 min-w-0 ${className}`}>
      <div ref={ref} key={`${mood}-${moodKey}`} className={`v2-npc v2-npc--${mood} shrink-0`}>
        <svg viewBox="0 0 160 200" className={`overflow-visible ${bare ? 'w-[92px] h-[115px]' : 'w-[132px] h-[165px] sm:w-[156px] sm:h-[195px]'}`} aria-hidden>
          <RigDefs />
          <Fig mood={mood} talking={talking} viseme={visemeOf(shown[shown.length - 1])} look={look} />
        </svg>
      </div>
      {!bare && (
        <div key={text} className="v2-bubble text-[12.5px] leading-snug min-h-[3.2rem]">
          <span className="block text-[9.5px] font-mono uppercase tracking-[0.18em] opacity-70 mb-0.5">{label}</span>
          {shown}
          {talking && <span className="v2-caret" />}
        </div>
      )}
    </div>
  );
};
