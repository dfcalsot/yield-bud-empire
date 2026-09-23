import React from 'react';
import { useGame } from '../../context/GameContext';
import { isFinished } from '../../sim/tutorial';
import { NpcV2 } from '../npc/rig/NpcV2';
import { t } from '../../i18n';

/** Profile card: replay Chrono's tutorial. */
export const RestartGuide: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { tutorial, startTutorial } = useGame();
  const label = !tutorial.started ? t('Empezar la guía') : isFinished(tutorial) ? t('Repetir la guía') : tutorial.dismissed ? t('Reanudar la guía') : t('Reiniciar la guía');
  return (
    <section className={`hud-panel p-4 flex flex-wrap items-center gap-4 ${className}`} aria-label={t('Guía de Chrono')}>
      <NpcV2 kind="chrono" bare text="" mood="wave" moodKey={0} />
      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-sm font-bold tracking-[0.14em] uppercase text-emerald-200">{t('La guía de Chrono')}</h3>
        <p className="mt-1 text-xs text-neutral-400 leading-relaxed">{t('Un recorrido corto por el juego con una pequeña recompensa en cada paso. Puedes repetirlo cuando quieras.')}</p>
      </div>
      <button onClick={startTutorial} className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-400 text-neutral-950 hover:bg-emerald-300 cursor-pointer">{label}</button>
    </section>
  );
};
