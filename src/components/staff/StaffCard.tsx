import React from 'react';
import { Star } from 'lucide-react';
import { RarityFrame, RARITY_STYLE } from '../game/GameUI';
import { NpcV2 } from '../npc/rig/NpcV2';
import { effectsOf, lookFor, ROLE_INFO, STAT_LABEL, TRAITS, wageOf, type StaffNft, type StatId } from '../../sim/staff';
import { mintAddressFor, serialFor, shortAddress } from '../../utils/nft';

/** "+8.5 %" for the percentages, "+2" for the seeds */
export const fmtStat = (k: StatId, v: number): string => (k === 'seedBonus' ? `+${v}` : `${k === 'shopDiscount' ? '−' : '+'}${(v * 100).toFixed(v * 100 < 10 ? 1 : 0)} %`);

/** The hire's face: the role's character with this NFT's personal variation and a rarity glow. */
export const StaffPortrait: React.FC<{ staff: StaffNft; className?: string }> = ({ staff, className = '' }) => {
  const look = lookFor(staff.seed);
  const color = RARITY_STYLE[staff.rarity].color;
  return (
    <div className={`overflow-hidden ${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} ${className}`} style={{ background: `radial-gradient(circle at 50% 35%, ${color}44, #060412 78%)` }}>
      <div className="absolute inset-0 flex items-end justify-center" style={{ filter: `hue-rotate(${look.hue}deg) saturate(${look.sat}) brightness(${look.bright})` }}>
        {/* the character alone, without the speech bubble; it never takes the assigned-hire look itself (this is the preview) */}
        <div className="scale-[1.3] origin-bottom translate-y-3"><NpcV2 kind={staff.role} variant={staff.seed % 2 ? 'floro' : 'flora'} bare plain text="" mood="idle" moodKey={staff.seed} /></div>
      </div>
    </div>
  );
};

/** The staff NFT as a collectible card: portrait, rarity, rank stars, effects, traits, wage and its (simulated) mint. */
export const StaffCard: React.FC<{ staff: StaffNft; faceDown?: boolean; selected?: boolean; footer?: React.ReactNode; badge?: React.ReactNode; onClick?: () => void; className?: string }> = ({ staff, faceDown, selected, footer, badge, onClick, className = '' }) => {
  const { color, label } = RARITY_STYLE[staff.rarity];
  const info = ROLE_INFO[staff.role];
  if (faceDown) {
    return <RarityFrame rarity={staff.rarity} className={`nft-card ${className}`}><div className="grid place-items-center text-6xl" style={{ aspectRatio: '5 / 7', background: `radial-gradient(circle at 50% 40%, ${color}55, #030907 75%)` }}>🧑‍🌾</div></RarityFrame>;
  }
  const eff = Object.entries(effectsOf(staff)) as Array<[StatId, number]>;
  const Body: React.ElementType = onClick ? 'button' : 'div';
  return (
    <RarityFrame rarity={staff.rarity} selected={selected} className={`nft-card overflow-hidden ${className}`}>
      <Body type={onClick ? 'button' : undefined} onClick={onClick} className={`block w-full text-left ${onClick ? 'cursor-pointer' : ''}`} data-staff-card={staff.id}>
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 text-[10px] font-mono uppercase tracking-wider">
          <span className="font-black" style={{ color, textShadow: `0 0 10px ${color}88` }}>◆ {label}</span>
          <span className="text-neutral-400">Personal NFT · {serialFor(staff.id)}</span>
        </div>
        <div className="relative mx-2.5 rounded-xl overflow-hidden border border-white/10" style={{ height: 150 }}>
          <StaffPortrait staff={staff} className="absolute inset-0" />
          <span className="absolute left-2 top-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/60 border border-white/15 text-white">{info.label}</span>
          <span className="absolute right-2 top-1.5 flex" aria-label={`Rango ${staff.rank}`}>
            {Array.from({ length: 5 }, (_, i) => <Star key={i} className="w-3 h-3" style={{ color: i < staff.rank ? color : '#475569', fill: i < staff.rank ? color : 'transparent' }} />)}
          </span>
          {badge && <span className="absolute left-2 bottom-1.5">{badge}</span>}
        </div>
        <div className="px-3 pt-2 pb-2.5 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2"><h4 className="font-serif font-black text-white text-[15px] truncate">{staff.name}</h4><span className="text-[10px] font-mono text-neutral-400 shrink-0">{info.place}</span></div>
          <ul className="space-y-0.5">
            {eff.map(([k, v]) => <li key={k} className="flex justify-between text-[11px] font-mono"><span className="text-neutral-300">{STAT_LABEL[k]}</span><span className="font-bold" style={{ color }}>{fmtStat(k, v)}</span></li>)}
          </ul>
          {staff.traits.length > 0 && <div className="flex flex-wrap gap-1">{staff.traits.map((t) => <span key={t} title={TRAITS[t].blurb} className="px-1.5 py-0.5 rounded-full border border-white/15 bg-white/5 text-[9.5px] font-mono text-neutral-200">{TRAITS[t].name}</span>)}</div>}
          <div className="flex items-center justify-between text-[9.5px] font-mono text-neutral-500 pt-0.5"><span>Sueldo {wageOf(staff)} $FLORA/día</span><span title="Identificador simulado">SIM {shortAddress(mintAddressFor(staff.id), 3, 3)}</span></div>
        </div>
      </Body>
      {footer && <div className="px-3 pb-3">{footer}</div>}
    </RarityFrame>
  );
};
