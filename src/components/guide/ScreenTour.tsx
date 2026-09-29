import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { NpcV2 } from '../npc/rig/NpcV2';
import { TourRing } from './TourRing';
import { t } from '../../i18n';

/**
 * A walk-through of one screen with Chrono: he explains each part in turn while a ring marks it (elements with
 * `data-tour="<anchor>"`), scrolling it into view. It opens by itself the first time a player sees the screen (remembered
 * on this device) and can be replayed from a button. Never blocks the screen: it can be skipped at any step.
 */
export interface TourStep { anchor?: string; title: string; say: string }
const KEY = (id: string) => `ybe_tour_${id}`;
export const tourSeen = (id: string) => { try { return localStorage.getItem(KEY(id)) === '1'; } catch { return true; } };
const markSeen = (id: string) => { try { localStorage.setItem(KEY(id), '1'); } catch { /* private mode */ } };

export const ScreenTour: React.FC<{ id: string; steps: TourStep[]; open: boolean; onClose: () => void }> = ({ id, steps, open, onClose }) => {
  const [i, setI] = useState(0);
  const [moodKey, setMoodKey] = useState(0);
  useEffect(() => { if (open) setI(0); }, [open]);
  const step = steps[Math.min(i, steps.length - 1)];
  // bring the part Chrono talks about into view
  useEffect(() => {
    if (!open || !step?.anchor) return;
    const el = document.querySelector(`[data-tour="${step.anchor}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setMoodKey((k) => k + 1);
  }, [open, i, step?.anchor]);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1)); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  });
  if (!open || !step) return null;
  const last = i >= steps.length - 1;
  const close = () => { markSeen(id); onClose(); };
  const next = () => { if (last) close(); else setI((n) => n + 1); };

  return createPortal(
    <>
      <TourRing anchor={step.anchor ?? null} />
      <section className="fixed right-2 sm:right-4 bottom-24 sm:bottom-4 z-[70] flex items-end gap-1 w-[min(26rem,calc(100vw-1rem))]" aria-label={t('Guía de Chrono')} role="dialog">
        <div className="shrink-0 -mb-1 hidden sm:block"><NpcV2 kind="chrono" bare text={step.say} mood={last ? 'happy' : 'idle'} moodKey={moodKey} /></div>
        <div className="flex-1 rounded-2xl border border-amber-300/40 bg-neutral-950/95 backdrop-blur-xl shadow-2xl p-3.5">
          <div className="flex items-center gap-2 text-[9.5px] font-mono uppercase tracking-[0.16em] text-amber-200/80">
            {t('Chrono · {v0} de {v1}', { v0: i + 1, v1: steps.length })}
            <button type="button" onClick={close} aria-label={t('Cerrar la guía')} className="ml-auto p-1 -m-1 rounded hover:bg-white/10 text-neutral-400 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
          <h4 className="font-bold text-white text-[14px] mt-1">{t(step.title)}</h4>
          <p className="text-[12.5px] leading-snug text-neutral-200 mt-1">{t(step.say)}</p>
          <div className="flex items-center gap-1 mt-2.5">
            {steps.map((_, n) => <i key={n} className={`h-1 rounded-full transition-all ${n === i ? 'w-5 bg-amber-300' : n < i ? 'w-1.5 bg-amber-300/60' : 'w-1.5 bg-white/15'}`} />)}
          </div>
          <div className="flex items-center gap-2 mt-3">
            {!last && <button type="button" onClick={close} className="text-[11.5px] text-neutral-400 hover:text-white cursor-pointer">{t('Saltar guía')}</button>}
            <div className="ml-auto flex gap-1.5">
              {i > 0 && <button type="button" onClick={() => setI((n) => n - 1)} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[12px] text-neutral-200 cursor-pointer"><ChevronLeft className="w-3.5 h-3.5" />{t('Atrás')}</button>}
              <button type="button" onClick={next} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-300 hover:bg-amber-200 text-neutral-950 text-[12.5px] font-bold cursor-pointer">{last ? t('¡Entendido!') : <>{t('Siguiente')}<ChevronRight className="w-3.5 h-3.5" /></>}</button>
            </div>
          </div>
        </div>
      </section>
    </>,
    document.body,
  );
};
