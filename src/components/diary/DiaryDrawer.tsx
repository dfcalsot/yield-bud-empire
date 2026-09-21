import React, { useEffect, useState } from 'react';
import { BookOpen, Check, Gift, ScrollText, Trophy, X, Compass, Circle, Minus } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { NpcMissions } from '../missions/NpcMissions';
import { STEPS, isFinished, stepProgress } from '../../sim/tutorial';
import { claimableCount } from '../../sim/missions';
import type { NpcKind } from '../../components/npc/Npc';

/**
 * The diary (key D): one place for everything the player can work towards.
 *  - Camino: Chrono's tutorial path
 *  - Misiones: the story line + daily errand of each character
 *  - Retos: the long-term challenges
 */
type Tab = 'camino' | 'misiones' | 'retos';
const NPCS: NpcKind[] = ['merchant', 'farmer', 'scientist', 'geneticist', 'budtender'];

export const useDiaryBadge = (): number => {
  const { missions, quests } = useGame();
  return NPCS.reduce((n, k) => n + claimableCount(missions, k), 0) + quests.filter((q) => q.isCompleted && !q.isClaimed).length;
};

export const DiaryDrawer: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { tutorial, missions, quests, claimQuestReward, startTutorial } = useGame();
  const [tab, setTab] = useState<Tab>('camino');
  const badge = useDiaryBadge();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;

  const prog = stepProgress(tutorial, missions);
  const finished = tutorial.started && isFinished(tutorial);
  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'camino', label: 'Camino', icon: <Compass className="w-4 h-4" /> },
    { id: 'misiones', label: 'Misiones', icon: <ScrollText className="w-4 h-4" /> },
    { id: 'retos', label: 'Retos', icon: <Trophy className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-[85]" role="dialog" aria-modal="true" aria-label="Diario del jugador">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <aside className="bag-drawer absolute right-0 top-0 h-full w-full sm:w-[34rem] flex flex-col">
        <header className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/10">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-emerald-400/15 border border-emerald-300/40 text-emerald-300"><BookOpen className="w-5 h-5" /></span>
          <div className="min-w-0">
            <h2 className="font-serif text-lg font-black text-white leading-none">Tu diario</h2>
            <p className="text-[11px] font-mono text-neutral-400 mt-1">Guía, misiones y retos · <kbd className="px-1 rounded bg-white/10">D</kbd> abre y cierra</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar diario" className="ml-auto p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"><X className="w-5 h-5" /></button>
        </header>
        <nav className="flex gap-1 px-3 pt-3" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${tab === t.id ? 'bg-emerald-400/15 border-emerald-300/50 text-emerald-200' : 'border-transparent text-neutral-400 hover:text-white'}`}>
              {t.icon}{t.label}
            </button>
          ))}
          {badge > 0 && <span className="ml-auto self-center inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-300/50 px-2 py-0.5 text-[10.5px] font-mono text-amber-200"><Gift className="w-3 h-3" />{badge} por reclamar</span>}
        </nav>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {tab === 'camino' && (
            <>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-[12.5px] text-neutral-300 leading-relaxed">
                {!tutorial.started ? 'Chrono te acompaña en tus primeros pasos: cada uno da una pequeña recompensa y puedes saltarte los que quieras.'
                  : finished ? '¡Completaste el camino! Puedes repetirlo cuando quieras.' : `Vas por el paso ${tutorial.index + 1} de ${STEPS.length}.`}
                <button onClick={() => { startTutorial(); onClose(); }} className="mt-2 block px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-400 text-neutral-950 hover:bg-emerald-300 cursor-pointer">
                  {!tutorial.started ? 'Empezar la guía' : finished ? 'Repetir la guía' : 'Reiniciar la guía'}
                </button>
              </div>
              <ol className="space-y-2">
                {STEPS.map((s, i) => {
                  const claimed = tutorial.claimed.includes(s.id);
                  const skipped = tutorial.started && i < tutorial.index && !claimed;
                  const current = tutorial.started && i === tutorial.index;
                  return (
                    <li key={s.id} className={`flex items-start gap-3 rounded-xl border p-3 ${current ? 'border-emerald-300/50 bg-emerald-400/[0.06]' : 'border-white/10 bg-black/20'}`}>
                      <span className={`mt-0.5 grid place-items-center w-6 h-6 rounded-full shrink-0 ${claimed ? 'bg-emerald-400 text-neutral-950' : skipped ? 'bg-white/10 text-neutral-400' : current ? 'border-2 border-emerald-300 text-emerald-300' : 'border border-white/20 text-neutral-500'}`}>
                        {claimed ? <Check className="w-3.5 h-3.5" /> : skipped ? <Minus className="w-3.5 h-3.5" /> : <Circle className="w-2.5 h-2.5" />}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">{s.title}{skipped && <span className="ml-2 text-[10px] font-mono text-neutral-500">saltado</span>}</div>
                        <div className="text-[11.5px] text-neutral-400 leading-snug">{current && prog?.ready ? '¡Listo! Reclámalo con Chrono.' : s.hint}</div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </>
          )}

          {tab === 'misiones' && NPCS.map((k) => <NpcMissions key={k} npc={k} defaultOpen />)}

          {tab === 'retos' && (
            quests.length === 0 ? <p className="text-sm text-neutral-400">Aún no hay retos.</p> : quests.map((q) => (
              <div key={q.id} className={`rounded-xl border p-3 ${q.isCompleted && !q.isClaimed ? 'border-amber-300/50 bg-amber-400/[0.06]' : 'border-white/10 bg-black/20'}`}>
                <div className="flex items-center gap-2"><span className="text-sm font-semibold text-white">{q.title}</span>{q.isClaimed && <Check className="w-4 h-4 text-emerald-300" />}</div>
                <p className="text-[11.5px] text-neutral-400 leading-snug mt-0.5">{q.description}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.min(100, (q.currentCount / q.targetCount) * 100)}%` }} /></div>
                  <span className="text-[11px] font-mono text-neutral-300">{Math.min(q.currentCount, q.targetCount)}/{q.targetCount}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10.5px] font-mono text-neutral-400">
                  <span>+{q.rewardFlora} $FLORA · +{q.rewardXp} XP</span>
                  {q.isCompleted && !q.isClaimed && <button onClick={() => claimQuestReward(q.id)} className="ml-auto rounded-md bg-amber-300 px-3 py-1 text-[11.5px] font-bold text-neutral-950 hover:bg-amber-200 cursor-pointer">Reclamar</button>}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
};
