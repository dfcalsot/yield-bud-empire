import React from 'react';
import { RarityFrame, RARITY_STYLE } from '../game/GameUI';
import { RELIC_TYPE_BY_ID, relicValue, type Relic } from '../../sim/relics';
import { STAT_LABEL } from '../../sim/staff';
import { t } from '../../i18n';

/** what a relic adds, in words */
export const relicBonusText = (r: Pick<Relic, 'stat' | 'rarity'>): string => {
  const v = relicValue(r.stat, r.rarity);
  return r.stat === 'seedBonus' ? t('+{n} semilla por cruce', { n: v }) : `+${Math.round(v * 1000) / 10} % · ${STAT_LABEL[r.stat]}`;
};

/** a relic as a collectible card: its emblem on a rarity-tinted crest, name, bonus and serial */
export const RelicCard: React.FC<{ relic: Relic; faceDown?: boolean; footer?: React.ReactNode; equipped?: boolean }> = ({ relic, faceDown, footer, equipped }) => {
  const type = RELIC_TYPE_BY_ID[relic.typeId];
  const { color: rc, label } = RARITY_STYLE[relic.rarity];
  const tint = type?.color ?? rc;
  return (
    <RarityFrame rarity={relic.rarity} selected={equipped} className="p-2.5 flex flex-col gap-2 h-full">
      <div className="relative aspect-[4/3] rounded-lg overflow-hidden grid place-items-center" style={{ background: `radial-gradient(circle at 50% 40%, ${tint}55, #0a0716 72%)` }} data-testid="relic-card">
        {faceDown ? <span className="text-5xl opacity-60">❔</span> : (
          <svg viewBox="0 0 100 100" className="w-24 h-24" aria-hidden>
            <defs><radialGradient id={`rg-${relic.id}`} cx="50%" cy="40%" r="60%"><stop offset="0%" stopColor={tint} stopOpacity="0.9" /><stop offset="100%" stopColor={rc} stopOpacity="0.25" /></radialGradient></defs>
            <polygon points="50,6 90,28 90,72 50,94 10,72 10,28" fill={`url(#rg-${relic.id})`} stroke={rc} strokeWidth="3" />
            <polygon points="50,16 81,33 81,67 50,84 19,67 19,33" fill="none" stroke="#0a0716" strokeOpacity="0.45" strokeWidth="2" />
            <text x="50" y="62" textAnchor="middle" fontSize="36">{type?.icon ?? '✦'}</text>
          </svg>
        )}
        <span className="absolute top-1.5 left-1.5 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/60" style={{ color: rc }}>{label}</span>
        <span className="absolute top-1.5 right-1.5 text-[9px] font-mono text-neutral-300 px-1.5 py-0.5 rounded bg-black/60">#{relic.serial}</span>
        {relic.bound && <span className="absolute bottom-1.5 left-1.5 text-[9px] font-mono text-amber-200 px-1.5 py-0.5 rounded bg-black/70">{t('Ligada')}</span>}
        {equipped && <span className="absolute bottom-1.5 right-1.5 text-[9px] font-mono font-bold text-emerald-200 px-1.5 py-0.5 rounded bg-emerald-900/80">{t('Equipada')}</span>}
      </div>
      <div className="min-w-0">
        <div className="text-[12.5px] font-bold text-white leading-tight truncate">{type?.name ?? relic.typeId}</div>
        {!faceDown && <div className="text-[11px] font-mono text-emerald-300">{relicBonusText(relic)}</div>}
        <div className="text-[10px] text-neutral-500 leading-snug">{type?.blurb}</div>
      </div>
      {footer && <div className="mt-auto">{footer}</div>}
    </RarityFrame>
  );
};
