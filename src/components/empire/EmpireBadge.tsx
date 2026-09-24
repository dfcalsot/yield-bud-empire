import React from 'react';
import { Crown } from 'lucide-react';
import { rankInfo, MAX_EMPIRE_RANK } from '../../sim/empire';
import { t } from '../../i18n';

/** the empire rank as a small crest: stars fill with the rank, gold at the top */
export const EmpireBadge: React.FC<{ rank: number; compact?: boolean; onClick?: () => void }> = ({ rank, compact, onClick }) => {
  const info = rankInfo(rank);
  const top = rank >= MAX_EMPIRE_RANK;
  const color = top ? '#fbbf24' : rank >= 7 ? '#c084fc' : rank >= 4 ? '#38bdf8' : '#34d399';
  const body = (
    <>
      <Crown className="w-4 h-4 shrink-0" style={{ color }} />
      <span className="font-bold" style={{ color }}>{compact ? rank : t('Imperio {rank}', { rank })}</span>
    </>
  );
  const title = t('Rango de imperio {rank}/{max}: {title}', { rank, max: MAX_EMPIRE_RANK, title: info.title });
  return onClick
    ? <button type="button" onClick={onClick} title={title} aria-label={title} className="flex items-center gap-1 px-2.5 cursor-pointer hover:brightness-125" data-testid="empire-badge">{body}</button>
    : <span title={title} aria-label={title} className="inline-flex items-center gap-1" data-testid="empire-badge">{body}</span>;
};
