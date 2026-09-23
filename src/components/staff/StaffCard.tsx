import React from 'react';
import { Star } from 'lucide-react';
import { RarityFrame, RARITY_STYLE } from '../game/GameUI';
import { PremiumBust } from './premium/PremiumBust';
import { LOOKS } from './premium/looks';
import { effectsOf, ROLE_INFO, STAT_LABEL, TRAITS, variantOf, wageOf, type StaffNft, type StatId } from '../../sim/staff';
import { mintAddressFor, serialFor, shortAddress } from '../../utils/nft';
import { t as tr } from '../../i18n';

/** "+8.5 %" for the percentages, "+2" for the seeds */
export const fmtStat = (k: StatId, v: number): string => (k === 'seedBonus' ? `+${v}` : `${k === 'shopDiscount' ? '−' : '+'}${(v * 100).toFixed(v * 100 < 10 ? 1 : 0)} %`);

/** The hire's portrait: one of the six premium characters of its job (which one depends on its rarity and seed). */
export const StaffPortrait: React.FC<{ staff: StaffNft; className?: string; animated?: boolean }> = ({ staff, className = '', animated = true }) => (
  <div className={`overflow-hidden ${/\b(absolute|fixed)\b/.test(className) ? '' : 'relative'} ${className}`}>
    <PremiumBust role={staff.role} variant={variantOf(staff)} rarity={staff.rarity} seed={staff.seed} animated={animated} crop />
  </div>
);

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
          <span className="text-neutral-400">{tr('Personal NFT · {v0}', { v0: serialFor(staff.id) })}</span>
        </div>
        <div className="relative mx-2.5 rounded-xl overflow-hidden border border-white/10" style={{ aspectRatio: '6 / 7' }}>
          <StaffPortrait staff={staff} className="absolute inset-0" />
          <span className="absolute left-2 top-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/60 border border-white/15 text-white">{tr(info.label)}</span>
          <span className="absolute right-2 top-1.5 flex" aria-label={tr('Rango {rank}', { rank: staff.rank })}>
            {Array.from({ length: 5 }, (_, i) => <Star key={i} className="w-3 h-3" style={{ color: i < staff.rank ? color : '#475569', fill: i < staff.rank ? color : 'transparent' }} />)}
          </span>
          {badge && <span className="absolute left-2 bottom-1.5">{badge}</span>}
        </div>
        <div className="px-3 pt-2 pb-2.5 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2"><h4 className="font-serif font-black text-white text-[15px] truncate">{tr(staff.name)}</h4><span className="text-[10px] font-mono text-neutral-400 shrink-0">{tr(info.place)}</span></div>
          <div className="text-[10.5px] font-mono uppercase tracking-wider -mt-1" style={{ color }}>{tr(LOOKS[staff.role][variantOf(staff)].title)}</div>
          <ul className="space-y-0.5">
            {eff.map(([k, v]) => <li key={k} className="flex justify-between text-[11px] font-mono"><span className="text-neutral-300">{STAT_LABEL[k]}</span><span className="font-bold" style={{ color }}>{fmtStat(k, v)}</span></li>)}
          </ul>
          {staff.traits.length > 0 && <div className="flex flex-wrap gap-1">{staff.traits.map((t) => <span key={t} title={tr(TRAITS[t].blurb)} className="px-1.5 py-0.5 rounded-full border border-white/15 bg-white/5 text-[9.5px] font-mono text-neutral-200">{tr(TRAITS[t].name)}</span>)}</div>}
          <div className="flex items-center justify-between text-[9.5px] font-mono text-neutral-500 pt-0.5"><span>{tr('Sueldo {v0} $FLORA/día', { v0: wageOf(staff) })}</span><span title={tr('Identificador simulado')}>SIM {shortAddress(mintAddressFor(staff.id), 3, 3)}</span></div>
        </div>
      </Body>
      {footer && <div className="px-3 pb-3">{footer}</div>}
    </RarityFrame>
  );
};
