import React, { useEffect, useRef, useState } from 'react';
import './rig.css';
import { RigDefs, reducedMotion, useLook, visemeOf, type Mood2 } from './parts';
import { Chrono, type FigureV2 } from './figures';
import { Flora, Floro, Tomas, Lucia, Rafa, Marta, Nico } from './cast';
import { shopkeeperName, useShopkeeper, type Shopkeeper } from '../shopkeeper';
import { useAssignedStaff } from '../../../context/GameContext';
import { ROLE_INFO, variantOf, type StaffRole } from '../../../sim/staff';
import { PremiumBust } from '../../staff/premium/PremiumBust';
import { RARITY_STYLE } from '../../game/GameUI';
import { t, k } from '../../../i18n';
import { NPC_ART3D, sceneArt3d, staffArt3d, useNpcArt3d } from '../art3d';
import { Portrait3d } from '../Portrait3d';

/**
 * NPC rig v2. Same contract as `Npc` (kind, text, mood, moodKey, bare) so it can replace it call site by call site,
 * plus the new moods `think` and `wave`. Eyes follow the cursor and the mouth lip-syncs to the typed letters.
 * Cast: Chrono (guide) plus the five industry characters (grow shop, outdoor grower, lab, genetics, dispensary).
 */
export type NpcKindV2 = 'chrono' | 'foreman' | 'merchant' | 'farmer' | 'scientist' | 'geneticist' | 'budtender';

const FIGURES: Record<NpcKindV2, FigureV2> = { chrono: Chrono, foreman: Nico, merchant: Flora, farmer: Tomas, scientist: Lucia, geneticist: Rafa, budtender: Marta };

export const NPC_NAMES_V2: Record<NpcKindV2, string> = {
  chrono: k('Chrono · Guía'),
  foreman: k('Nico · Capataz'),
  merchant: k('Flor · Grow Shop'),
  farmer: k('Tomás · Cultivador'),
  scientist: k('Dra. Lucía · Laboratorio'),
  geneticist: k('Prof. Rafa · Genetista'),
  budtender: k('Marta · Dispensaria'),
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
  /** draw the base character even when a hired NFT holds the job (used by the NFT card's own portrait) */
  plain?: boolean;
  /** 3D trial: the page already paints the scene behind (e.g. the whole market), so the row draws none */
  noScene?: boolean;
  /** 3D trial: a page's own scene instead of the job's (e.g. 'perfil', 'tablas') */
  scene?: string;
  /** 3D trial: a bigger figure (the market keeper, who has the whole shop behind) */
  large?: boolean;
  /** the character stands in the middle of the scene with the bubble above (scenes painted with a stage in the centre) */
  center?: boolean;
  /** the whole body (characters that have full-body frames), standing on the bottom edge */
  full?: boolean;
}> = ({ kind, text, mood, moodKey, bare, className = '', variant, plain, noScene, scene: pageScene, large, center, full }) => {
  const [chosen] = useShopkeeper();
  // when a hired NFT holds this character's job, its portrait (a personal variation of the character) replaces the default one
  const hiredRaw = useAssignedStaff(kind as StaffRole);
  const hired = kind === 'chrono' || plain ? null : hiredRaw;
  const shop = variant ?? (hired && kind === 'merchant' ? (hired.staff.seed % 2 ? 'floro' : 'flora') : chosen);
  const aura = hired ? RARITY_STYLE[hired.staff.rarity].color : undefined;
  const [shown, setShown] = useState(text);
  const ref = useRef<HTMLDivElement>(null);
  const gaze = useLook(ref);
  const art3d = useNpcArt3d();

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
  // 3D trial: the job's painted scene fills the whole panel behind the portrait and the bubble (a hire of a job without one gets
  // its own portrait blurred); characters without a scene stand on the plain panel
  const who = kind === 'merchant' ? shop : kind;
  const scene = bare || !art3d || noScene ? null
    : sceneArt3d(pageScene ?? (hired ? kind : who)) ? { src: sceneArt3d(pageScene ?? (hired ? kind : who))!, blur: false }
    : hired ? { src: staffArt3d(kind, variantOf(hired.staff)), blur: true } : null;
  // the 3D characters are always cut-outs (no box, no backdrop of their own), in panels and in the small cameos alike
  const cutout = true;
  const Fig = kind === 'merchant' && shop === 'floro' ? Floro : FIGURES[kind];
  const label = hired
    ? `${hired.staff.name} · ${t(ROLE_INFO[kind as StaffRole].label)} ${'★'.repeat(hired.staff.rank)}${hired.working ? '' : t(' · sin pagar')}`
    : kind === 'merchant' ? t('{v0} · Grow Shop', { v0: shopkeeperName(shop) }) : t(NPC_NAMES_V2[kind]);

  return (
    <div className={`${center && !bare ? 'npc-center flex flex-col-reverse items-center' : 'flex items-end'} gap-1 min-w-0 ${scene ? 'npc-scene' : ''} ${className}`}>
      {scene && <div className={`npc-scene-bg ${scene.blur ? 'npc-scene-bg--blur' : ''}`} style={{ backgroundImage: `url(${scene.src})` }} aria-hidden />}
      {hired ? (
        <div ref={ref} className={`relative shrink-0 rounded-2xl overflow-hidden ring-1 ${bare ? 'w-[92px] h-[115px]' : 'w-[132px] h-[165px] sm:w-[156px] sm:h-[195px]'}`} style={{ ['--tw-ring-color' as string]: aura, boxShadow: hired.staff.rarity === 'common' ? undefined : `0 0 22px -6px ${aura}` }} data-staff={hired.staff.id}>
          {art3d
            ? <img className={`staff3d ${talking ? 'staff3d--talk' : ''}`} src={staffArt3d(kind, variantOf(hired.staff))} alt="" draggable={false} />
            : <PremiumBust role={kind as StaffRole} variant={variantOf(hired.staff)} rarity={hired.staff.rarity} seed={hired.staff.seed} mood={mood} talking={talking} viseme={visemeOf(shown[shown.length - 1])} crop />}
        </div>
      ) : art3d && NPC_ART3D.has(kind === 'merchant' ? shop : kind) ? (
        <div ref={ref} key={`${mood}-${moodKey}`} className={`v2-npc v2-npc--${mood} npc3d ${cutout ? 'npc3d--cutout' : ''} shrink-0 ${bare ? 'w-[96px] h-[96px]' : full ? 'npc3d--full w-[170px] h-[302px] sm:w-[200px] sm:h-[356px]' : large || center ? 'w-[168px] h-[168px] sm:w-[220px] sm:h-[220px]' : 'w-[140px] h-[140px] sm:w-[164px] sm:h-[164px]'}`}>
          <Portrait3d id={kind === 'merchant' ? shop : kind} talking={talking} cutout={cutout} mood={mood} full={full} />
        </div>
      ) : (
      <div ref={ref} key={`${mood}-${moodKey}`} className={`v2-npc v2-npc--${mood} shrink-0`}>
        <svg viewBox="0 0 160 200" className={`overflow-visible ${bare ? 'w-[92px] h-[115px]' : 'w-[132px] h-[165px] sm:w-[156px] sm:h-[195px]'}`} aria-hidden>
          <RigDefs />
          <Fig mood={mood} talking={talking} viseme={visemeOf(shown[shown.length - 1])} look={gaze} />
        </svg>
      </div>
      )}
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
