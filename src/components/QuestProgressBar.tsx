import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { openDiary } from '../ui/events';
import { 
  Trophy, 
  Sparkles, 
  CheckCircle, 
  Clock, 
  Flame, 
  Sprout, 
  FlaskConical, 
  Dna, 
  ChevronDown, 
  ChevronUp,
  Award,
  Zap,
  Gift
} from 'lucide-react';
import { t } from '../i18n';

export const QuestProgressBar: React.FC = () => {
  const {
    playerLevel,
    playerXp,
    xpNeeded,
    rankTitle,
    quests,
    claimQuestReward
  } = useGame();

  const [isExpanded, setIsExpanded] = useState(false);

  const completedUnclaimed = quests.filter(q => q.isCompleted && !q.isClaimed);
  const totalCompleted = quests.filter(q => q.isCompleted).length;
  const xpPercent = Math.min(100, Math.round((playerXp / xpNeeded) * 100));

  const getIcon = (type: string) => {
    switch (type) {
      case 'press':
        return <FlaskConical className="w-3.5 h-3.5 text-amber-400" />;
      case 'dna':
        return <Dna className="w-3.5 h-3.5 text-pink-400" />;
      case 'flame':
        return <Flame className="w-3.5 h-3.5 text-amber-500" />;
      case 'plant':
      default:
        return <Sprout className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="hud-panel p-3 sm:p-4 transition-all duration-300 shadow-md">
      {/* Level & Quest Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Level & Rank */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-amber-500 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-neutral-950 rounded-[10px] flex flex-col items-center justify-center">
                <span className="text-[9px] text-neutral-400 uppercase font-mono font-bold leading-none">LVL</span>
                <span className="text-sm font-black text-emerald-400 font-mono leading-none">{playerLevel}</span>
              </div>
            </div>
            {completedUnclaimed.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-neutral-950 text-[10px] font-black rounded-full flex items-center justify-center animate-bounce shadow-[0_0_16px_-4px_rgba(251,191,36,0.6)]">
                {completedUnclaimed.length}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                {rankTitle}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">
                {playerXp} / {xpNeeded} XP
              </span>
            </div>

            {/* XP Progress Bar */}
            <div className="w-40 sm:w-56 h-1.5 bg-neutral-800 rounded-full overflow-hidden mt-1.5">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Center/Right: Quests pill and expand button */}
        <div className="flex items-center gap-2.5 ml-auto sm:ml-0">
          {completedUnclaimed.length > 0 ? (
            <button
              onClick={openDiary}
              className="flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 rounded-lg text-xs font-bold font-mono transition cursor-pointer shadow-sm animate-pulse"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>{t('{length} Recompensa{v1} Lista{v2}!', { length: completedUnclaimed.length, v1: completedUnclaimed.length > 1 ? 's' : '', v2: completedUnclaimed.length > 1 ? 's' : '' })}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono bg-neutral-950/80 px-2.5 py-1 rounded-lg border border-neutral-800">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('Misiones: {totalCompleted}/{length}', { totalCompleted, length: quests.length })}</span>
            </div>
          )}

          <button
            onClick={openDiary}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white bg-neutral-800/80 hover:bg-neutral-800 px-2.5 py-1.5 rounded-lg transition cursor-pointer font-mono"
            aria-label={t('Abrir el diario (tecla D)')}
          >
            <span className="hidden sm:inline">{isExpanded ? t('Ocultar') : t('Ver Misiones')}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Quest Drawer */}
      {isExpanded && (
        <div className="mt-4 pt-3 border-t border-neutral-800/80 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="font-mono font-semibold uppercase tracking-wider text-[11px] text-neutral-300">
              {t('Misiones Botánicas Activas & Objetivos de Juego')}
            </span>
            <span className="text-[10px] font-mono text-emerald-400">
              {t('Gana $FLORA y Experiencia al completar tareas')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {quests.map((q) => {
              const isDone = q.isCompleted;
              const isClaimed = q.isClaimed;

              return (
                <div
                  key={q.id}
                  className={`p-3 rounded-xl border transition flex flex-col justify-between space-y-2 ${
                    isClaimed
                      ? 'bg-neutral-950/40 border-neutral-900 opacity-60'
                      : isDone
                      ? 'bg-amber-950/25 border-amber-500/40 shadow-sm'
                      : 'bg-neutral-950/80 border-neutral-800'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 rounded bg-neutral-800 border border-neutral-700">
                          {getIcon(q.iconType)}
                        </div>
                        <h4 className="text-xs font-bold text-white leading-tight">{t(q.title)}</h4>
                      </div>

                      {isClaimed ? (
                        <span className="text-[10px] font-mono text-neutral-500 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-neutral-600" />{' '}{t('Cobrado')}
                        </span>
                      ) : isDone ? (
                        <span className="text-[10px] font-mono text-amber-400 font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />{' '}{t('¡Completado!')}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-neutral-400">
                          {q.currentCount}/{q.targetCount}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-neutral-400 leading-snug">
                      {t(q.description)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-neutral-900">
                    <div className="flex items-center gap-2 font-mono text-[10px]">
                      <span className="text-emerald-400 font-bold">+{q.rewardFlora} $FLORA</span>
                      <span className="text-neutral-500">•</span>
                      <span className="text-amber-400">+{q.rewardXp} XP</span>
                    </div>

                    {isDone && !isClaimed && (
                      <button
                        onClick={() => claimQuestReward(q.id)}
                        className="px-2.5 py-0.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold rounded text-[11px] font-mono shadow transition cursor-pointer"
                      >
                        {t('Reclamar')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
