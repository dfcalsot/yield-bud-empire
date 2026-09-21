import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Gift, SkipForward, X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { NpcV2 } from '../npc/rig/NpcV2';
import type { Mood2 } from '../npc/rig/parts';
import { STEPS, isFinished, stepProgress } from '../../sim/tutorial';
import { groupOfTab } from '../../nav';
import { CATALOG_BY_ID } from '../../economy/catalog';
import { TourRing } from './TourRing';

/** where Chrono points: the dock to get to the right zone, then the sub-tab, then the thing to press */
const anchorFor = (stepTab: string, tour: string | undefined, currentTab: string): string | null => {
  if (stepTab === 'any') return tour ?? null;
  const goal = groupOfTab(stepTab), here = groupOfTab(currentTab);
  if (goal.id !== here.id) return `dock-${goal.id}`;
  if (stepTab !== currentTab) return `subtab-${stepTab}`;
  return tour ?? null;
};

/**
 * Chrono the guide: a companion in the corner that says what to do next, points at it with a ring, and lets the player
 * claim a small reward per step. Never blocks: every step can be skipped and the guide can be minimised or closed.
 */
export const GuideChrono: React.FC<{ currentTab: string }> = ({ currentTab }) => {
  const { tutorial, missions, claimTutorialStep, skipTutorialStep, patchTutorial } = useGame();
  const prog = stepProgress(tutorial, missions);
  const [flash, setFlash] = useState<{ text: string; key: number } | null>(null);
  const timer = useRef<number | null>(null);
  const wasReady = useRef(false);
  const [moodKey, setMoodKey] = useState(0);

  useEffect(() => {
    if (prog?.ready && !wasReady.current) setMoodKey((k) => k + 1);
    wasReady.current = !!prog?.ready;
  }, [prog?.ready]);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  if (!tutorial.started || tutorial.dismissed) return null;

  const claim = () => {
    const say = claimTutorialStep();
    if (say) {
      setFlash({ text: say, key: Date.now() });
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setFlash(null), 5200);
    }
  };

  if (isFinished(tutorial)) {
    if (!flash) return null;
    return <FloatingChrono text={flash.text} mood="happy" moodKey={moodKey} onClose={() => setFlash(null)} />;
  }
  if (!prog) return null;

  const { step } = prog;
  const anchor = prog.ready ? null : anchorFor(step.tab, step.tour, currentTab);
  const mood: Mood2 = prog.ready ? 'happy' : flash ? 'happy' : 'idle';
  const rewardText = [...(step.reward.lots ?? []).map((l) => CATALOG_BY_ID[l.id]?.name), ...(step.reward.seeds ? ['1 semilla'] : []), `+${step.reward.xp} XP`].filter(Boolean).join(' · ');

  if (tutorial.minimized) {
    return (
      <>
        <TourRing anchor={anchor} />
        <button onClick={() => patchTutorial({ minimized: false })} aria-label="Abrir la guía de Chrono" className="fixed left-3 sm:left-[4.9rem] bottom-3 z-[60] w-[72px] h-[88px] cursor-pointer">
          <NpcV2 kind="chrono" bare text="" mood={mood} moodKey={moodKey} />
          {prog.ready && <span className="absolute top-0 right-0 grid place-items-center w-5 h-5 rounded-full bg-amber-300 text-neutral-950 animate-pulse"><Gift className="w-3 h-3" /></span>}
        </button>
      </>
    );
  }

  return (
    <>
      <TourRing anchor={anchor} />
      <section className="fixed left-3 sm:left-[4.9rem] bottom-3 z-[60] flex items-end gap-1 max-w-[min(22rem,calc(100vw-1.5rem))]" aria-label="Guía de Chrono">
        <div className="shrink-0 -mb-1"><NpcV2 kind="chrono" bare text={flash?.text ?? step.say} mood={mood} moodKey={moodKey} /></div>
        <div className="v2-bubble !mb-4 !max-w-none text-[12px] leading-snug">
          <div className="flex items-center gap-2 text-[9.5px] font-mono uppercase tracking-[0.16em] opacity-75">
            Chrono · paso {tutorial.index + 1}/{STEPS.length}
            <button onClick={() => patchTutorial({ minimized: true })} aria-label="Minimizar la guía" className="ml-auto p-0.5 hover:opacity-100 opacity-70 cursor-pointer"><ChevronDown className="w-3.5 h-3.5" /></button>
            <button onClick={() => patchTutorial({ dismissed: true })} aria-label="Cerrar la guía" className="p-0.5 hover:opacity-100 opacity-70 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
          {flash ? <p className="mt-1 text-[12.5px]">{flash.text}</p> : (
            <>
              <div className="mt-0.5 text-[13px] font-bold text-white">{step.title}</div>
              <p className="mt-0.5 opacity-90">{prog.ready ? '¡Lo lograste! Reclama tu recompensa.' : step.say}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full bg-emerald-300 transition-[width] duration-500" style={{ width: `${Math.round((prog.done / prog.goal) * 100)}%` }} /></div>
                <span className="text-[10.5px] font-mono">{prog.done}/{prog.goal}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {prog.ready ? (
                  <button onClick={claim} className="inline-flex items-center gap-1.5 rounded-md bg-amber-300 px-3 py-1 text-[11.5px] font-bold text-neutral-950 hover:bg-amber-200 cursor-pointer shadow-[0_0_14px_-2px_rgba(252,211,77,.7)]"><Gift className="w-3.5 h-3.5" />Reclamar · {rewardText}</button>
                ) : (
                  <>
                    <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-[10.5px]">{step.hint}</span>
                    <button onClick={skipTutorialStep} className="ml-auto inline-flex items-center gap-1 text-[10.5px] opacity-70 hover:opacity-100 cursor-pointer"><SkipForward className="w-3 h-3" />Saltar</button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
};

const FloatingChrono: React.FC<{ text: string; mood: Mood2; moodKey: number; onClose: () => void }> = ({ text, mood, moodKey, onClose }) => (
  <section className="fixed left-3 sm:left-[4.9rem] bottom-3 z-[60] flex items-end gap-1 max-w-[min(22rem,calc(100vw-1.5rem))]" aria-label="Guía de Chrono">
    <div className="shrink-0 -mb-1"><NpcV2 kind="chrono" bare text={text} mood={mood} moodKey={moodKey} /></div>
    <div className="v2-bubble !mb-4 !max-w-none text-[12.5px]"><button onClick={onClose} aria-label="Cerrar" className="float-right opacity-70 hover:opacity-100 cursor-pointer"><X className="w-3.5 h-3.5" /></button>{text}</div>
  </section>
);
