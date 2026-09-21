import React from 'react';
import { Check, Lock, Scissors, X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { PHASES, phaseOf } from '../../sim/phases';
import { canTrain, TECHNIQUES, whenLabel } from '../../sim/techniques';
import type { PlantInGrow } from '../../types';

const NAMES: Record<string, string> = Object.fromEntries(PHASES.map((p) => [p.id, p.label]));

/**
 * The training techniques for the selected plant. Each one shows the phase(s) where it works; the ones that do not fit the plant's
 * current phase are locked (and say why), and a plant takes each technique once.
 */
export const TechniqueMenu: React.FC<{ plant: PlantInGrow; onClose: () => void }> = ({ plant, onClose }) => {
  const { trainPlant } = useGame();
  const now = phaseOf(plant.stage)?.label ?? 'Lista para cosecha';
  return (
    <div className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm grid place-items-center p-3" role="dialog" aria-modal aria-label="Técnicas de entrenamiento" onClick={onClose} data-testid="technique-menu">
      <div className="fp-shell w-full max-w-lg p-4 space-y-3 max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-lg font-black text-white flex items-center gap-2"><Scissors className="w-5 h-5 text-fuchsia-300" />Técnicas de entrenamiento</h3>
            <p className="text-[11.5px] text-neutral-400 leading-snug">Cada técnica solo se aplica en su fase, y una vez por planta. Tu planta está en <b className="text-emerald-300">{now}</b>.</p>
          </div>
          <button type="button" className="fp-x" onClick={onClose} aria-label="Cerrar"><X className="w-4 h-4" /></button>
        </div>
        <ul className="space-y-2">
          {TECHNIQUES.map((t) => {
            const c = canTrain(plant, t.id, NAMES);
            const done = !c.ok && c.reason === 'done';
            return (
              <li key={t.id} className={`rounded-xl border p-3 flex gap-3 items-start ${c.ok ? 'border-fuchsia-300/40 bg-fuchsia-950/15' : 'border-white/10 bg-black/25 opacity-80'}`} data-technique={t.id} data-available={c.ok ? '1' : '0'}>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-bold text-white">{t.label}</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono border border-emerald-300/30 bg-emerald-400/10 text-emerald-200">{whenLabel(t, NAMES)}</span>
                    <span className="text-[10.5px] font-mono text-amber-300">+{Math.round(t.yieldBonus * 100)}% rend.</span>
                  </div>
                  <p className="text-[11.5px] text-neutral-300 leading-snug">{t.how}</p>
                  {!c.ok && !done && <p className="text-[11px] text-rose-300/90 leading-snug">{c.message}</p>}
                </div>
                {done ? (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-mono text-emerald-300"><Check className="w-3.5 h-3.5" />Hecha</span>
                ) : (
                  <button type="button" disabled={!c.ok} onClick={() => { if (trainPlant(t.id)) onClose(); }} className="shrink-0 sr-btn sr-btn--lime" style={!c.ok ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}>
                    {c.ok ? <Scissors className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}{c.ok ? 'Aplicar' : 'Bloqueada'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
