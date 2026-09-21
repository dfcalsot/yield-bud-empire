import React, { useMemo } from 'react';
import { RarityFrame, RARITY_STYLE } from './game/GameUI';
import { FarmScene } from './planet/FarmScene';
import { dayIndexOf, REGION_BY_ID, weatherOn } from '../sim/terroir';
import { shortAddress } from '../utils/nft';
import type { LandCardData } from '../utils/land';

const Meter: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center gap-1.5 text-[9.5px] font-mono">
    <span className="w-9 text-neutral-400">{label}</span>
    <span className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden"><i className="block h-full rounded-full" style={{ width: `${value}%`, background: color }} /></span>
    <span className="w-6 text-right text-neutral-200">{value}</span>
  </div>
);

/** The land as a collectible card: rarity frame, the real landscape of its region, its three ratings, its number in the supply. */
export const LandCard: React.FC<{
  card: LandCardData;
  selected?: boolean;
  faceDown?: boolean;
  onClick?: () => void;
  /** anything under the card body: a buy button, plant counters… */
  footer?: React.ReactNode;
  badges?: React.ReactNode;
  className?: string;
}> = ({ card, selected, faceDown, onClick, footer, badges, className = '' }) => {
  const { color: rc, label } = RARITY_STYLE[card.rarity];
  const region = REGION_BY_ID[card.region];
  const now = useMemo(() => Date.now(), []);
  const weather = useMemo(() => weatherOn(region, dayIndexOf(now)).kind, [region, now]);
  const Body: React.ElementType = onClick ? 'button' : 'div';

  if (faceDown) {
    return (
      <RarityFrame rarity={card.rarity} className={`nft-card ${className}`}>
        <div className="grid place-items-center text-6xl" style={{ aspectRatio: '5 / 7', background: `radial-gradient(circle at 50% 40%, ${card.color}55, #030907 75%)` }}>{card.emoji}</div>
      </RarityFrame>
    );
  }
  return (
    <RarityFrame rarity={card.rarity} selected={selected} className={`nft-card overflow-hidden ${className}`}>
      <Body type={onClick ? 'button' : undefined} onClick={onClick} className={`block w-full text-left ${onClick ? 'cursor-pointer' : ''}`} data-land-card={card.id}>
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 text-[10px] font-mono uppercase tracking-wider">
          <span className="font-black" style={{ color: rc, textShadow: `0 0 10px ${rc}88` }}>◆ {label}</span>
          <span className="text-neutral-400">Tierra NFT · {card.serial}</span>
        </div>
        <div className="relative mx-2.5 rounded-xl overflow-hidden border border-white/10" style={{ aspectRatio: '16 / 8' }}>
          <FarmScene regionId={card.region} color={card.color} lon={region.lon} nowMs={now} weather={weather} />
          <span className="absolute left-2 top-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-black/60 border border-white/15 text-white">{card.emoji} {card.regionName}</span>
          <span className="absolute right-2 top-1.5 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-black/60 border" style={{ color: rc, borderColor: rc }}>nota {card.landRating}</span>
          {badges && <span className="absolute left-2 bottom-1.5 flex gap-1">{badges}</span>}
        </div>
        <div className="px-3 pt-2 pb-2.5 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="font-mono font-black text-white text-[15px] truncate">{card.name}</h4>
            <span className="text-[10px] font-mono text-neutral-400 shrink-0">{card.edition}</span>
          </div>
          <Meter label="Agua" value={card.ratings.water} color="linear-gradient(90deg,#0284c7,#7dd3fc)" />
          <Meter label="Sol" value={card.ratings.sunlight} color="linear-gradient(90deg,#ca8a04,#fde047)" />
          <Meter label="Suelo" value={card.ratings.soil} color="linear-gradient(90deg,#059669,#6ee7b7)" />
          <div className="flex items-center justify-between text-[9.5px] font-mono text-neutral-500 pt-0.5">
            <span>{card.slots} plantas · {card.climate}</span>
            <span title="Identificador simulado">SIM {shortAddress(card.mint, 3, 3)}</span>
          </div>
        </div>
      </Body>
      {footer && <div className="px-3 pb-3">{footer}</div>}
    </RarityFrame>
  );
};
