import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './hud.css';
import { t } from '../../i18n';

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export interface GaugeSpec { label: string; value: number; display: string; min: number; max: number; okMin: number; okMax: number }

const MiniGauge: React.FC<GaugeSpec> = ({ label, value, display, min, max, okMin, okMax }) => {
  const ok = value >= okMin && value <= okMax;
  const color = ok ? '#34d399' : '#fbbf24';
  const C = 2 * Math.PI * 15;
  const dash = clamp((value - min) / (max - min)) * C;
  return (
    <div className="flex items-center gap-2 pl-1.5 pr-2.5 py-0.5 rounded-xl bg-neutral-950/75 border" style={{ borderColor: ok ? 'rgba(52,211,153,0.25)' : 'rgba(251,191,36,0.45)' }} title={t('{label}: {display} (ideal {okMin}–{okMax})', { label, display, okMin, okMax })}>
      <svg viewBox="0 0 36 36" className="w-7 h-7 -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" stroke="#16342a" strokeWidth="4" />
        <circle cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${dash} ${C}`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div className="leading-none">
        <div className="text-[9px] uppercase tracking-wider text-neutral-400 font-mono">{label}</div>
        <div className="text-xs font-bold font-mono mt-0.5" style={{ color }}>{display}</div>
      </div>
    </div>
  );
};

/** One of the gauge groups (Clima / Raíz / Luz y aire): a status dot, a one-line summary, and the detail on demand.
 *  A group with something out of range opens by itself and says what is wrong. */
export const GaugeGroup: React.FC<{ title: string; items: GaugeSpec[]; onOpen?: () => void }> = ({ title, items, onOpen }) => {
  const [open, setOpen] = useState(false);
  const bad = items.filter((g) => g.value < g.okMin || g.value > g.okMax);
  const show = open || bad.length > 0;
  const dot = bad.length ? '#fbbf24' : '#a3e635';
  return (
    <div className="gh-frame !rounded-xl" style={bad.length ? { borderColor: 'rgba(251,191,36,0.6)' } : undefined}>
      <button onClick={() => { if (!open) onOpen?.(); setOpen((v) => !v); }} aria-expanded={show} className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-left cursor-pointer">
        <span className="text-[9.5px] font-mono uppercase tracking-[0.16em] text-neutral-200">{title}</span>
        <span className="ml-auto w-2 h-2 rounded-full" style={{ background: dot, boxShadow: `0 0 8px ${dot}` }} aria-label={bad.length ? t('Atención') : t('Óptimo')} />
        <ChevronDown className={`w-3 h-3 text-neutral-400 transition ${show ? 'rotate-180' : ''}`} />
      </button>
      {!show && <div className="px-2.5 pb-1.5 -mt-0.5 text-[10px] font-mono text-neutral-400 truncate">{items.map((g) => g.display).join(' · ')}</div>}
      {show && (
        <div className="px-1.5 pb-1.5 space-y-1">
          {items.map((g) => <MiniGauge key={g.label} {...g} />)}
          {bad.map((g) => <p key={g.label} className="px-1 text-[10px] leading-snug text-amber-300">{t(g.label)} {g.value < g.okMin ? 'bajo' : 'alto'}: lo ideal es {g.okMin}–{g.okMax}.</p>)}
        </div>
      )}
    </div>
  );
};
