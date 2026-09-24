import React from 'react';
import { Crown, Lock } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { EMPIRE_RANKS, EMPIRE_WEIGHTS, MAX_EMPIRE_RANK, rankInfo, type EmpireSource } from '../../sim/empire';
import { t, k, fmtNum } from '../../i18n';

const SOURCES: Array<{ id: EmpireSource; icon: string; label: string; how: string }> = [
  { id: 'harvested', icon: '🌾', label: k('Flor cosechada'), how: k('1 punto cada {n} g') },
  { id: 'sales', icon: '💰', label: k('Ventas en el dispensario'), how: k('1 punto cada {n} $FLORA') },
  { id: 'lands', icon: '🌎', label: k('Tierras'), how: k('{n} por tierra') },
  { id: 'tier', icon: '🏗️', label: k('Instalación'), how: k('{n} por escalón') },
  { id: 'patents', icon: '📜', label: k('Patentes'), how: k('{n} por patente') },
  { id: 'crosses', icon: '🧬', label: k('Cruces de cámara'), how: k('{n} por cruce') },
  { id: 'staff', icon: '👷', label: k('Personal'), how: k('{n} por contratado') },
  { id: 'level', icon: '⭐', label: k('Nivel de jugador'), how: k('{n} por nivel') },
];
const howN = (id: EmpireSource) => { const w = EMPIRE_WEIGHTS[id]; return w < 1 ? Math.round(1 / w) : w; };

/** the empire rank in the profile: where you are, what counts and what the next rank opens */
export const EmpireCard: React.FC = () => {
  const { empire } = useGame();
  if (!empire) return null;
  const info = rankInfo(empire.rank);
  const nextInfo = empire.rank < MAX_EMPIRE_RANK ? rankInfo(empire.rank + 1) : null;
  const from = info.at, to = nextInfo?.at ?? info.at;
  const pct = nextInfo ? Math.min(1, Math.max(0, (empire.points - from) / Math.max(1, to - from))) : 1;
  return (
    <section className="hud-panel p-4 space-y-3" aria-label={t('Rango de imperio')} data-testid="empire-card">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-12 h-12 rounded-full grid place-items-center border-2 border-amber-300/60 bg-amber-400/10"><Crown className="w-6 h-6 text-amber-300" /></div>
        <div className="flex-1 min-w-[12rem]">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-amber-300/80">{t('Rango de imperio {rank}/{max}', { rank: empire.rank, max: MAX_EMPIRE_RANK })}</div>
          <div className="font-serif text-xl font-black text-white">{info.title}</div>
          <div className="flex gap-0.5 mt-1" aria-hidden>{EMPIRE_RANKS.map((r) => <span key={r.rank} className={`h-1.5 w-5 rounded-full ${r.rank <= empire.rank ? 'bg-amber-300' : 'bg-neutral-700'}`} />)}</div>
        </div>
        <div className="text-right font-mono">
          <div className="text-2xl font-black text-white">{fmtNum(empire.points)}</div>
          <div className="text-[10.5px] text-neutral-400">{nextInfo ? t('de {n} puntos para el rango {rank}', { n: fmtNum(nextInfo.at), rank: nextInfo.rank }) : t('rango máximo')}</div>
        </div>
      </div>
      <div className="mk-bar"><i style={{ ['--to' as string]: pct, background: 'linear-gradient(90deg,#f59e0b,#fde68a)' } as React.CSSProperties} /></div>
      {nextInfo && nextInfo.unlocks.length > 0 && (
        <p className="text-[12px] text-neutral-300"><Lock className="inline w-3.5 h-3.5 text-amber-300 mr-1" />{t('El rango {rank} desbloquea: {what}', { rank: nextInfo.rank, what: nextInfo.unlocks.join(' · ') })}</p>
      )}
      <div className="grid gap-1.5 sm:grid-cols-2">
        {SOURCES.map((s) => (
          <div key={s.id} className="mk-panel px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11.5px]">
            <span className="text-neutral-200">{s.icon} {t(s.label)} <span className="text-neutral-500 text-[10.5px]">· {t(s.how, { n: howN(s.id) })}</span></span>
            <b className="font-mono text-amber-200">+{fmtNum(empire.breakdown[s.id] ?? 0)}</b>
          </div>
        ))}
      </div>
      <p className="text-[10.5px] text-neutral-500">{t('El servidor cuenta todo esto con lo que de verdad pasó en tu partida. El rango nunca baja.')}</p>
    </section>
  );
};
