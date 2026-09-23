import React from 'react';
import './hud.css';
import { t as tr } from '../../i18n';

/** Reusable pieces of the game HUD (Cultivo scene, Sala...). Presentation only: the caller passes data and handlers. */

export const Orb: React.FC<{ kind: 'water' | 'nutrient' | 'energy'; label: string; value: string; fill: number; icon: React.ReactNode; low?: boolean; onClick?: () => void; title?: string }> = ({ kind, label, value, fill, icon, low, onClick, title }) => (
  <button type="button" onClick={onClick} title={title} aria-label={`${label}: ${value}`} className={`gh-orb gh-orb--${kind} ${low ? 'is-low' : ''}`} style={{ ['--fill' as string]: Math.max(0, Math.min(1, fill)) }}>
    <span className="gh-orb-glass">
      <span className="gh-orb-liquid"><i className="gh-wave" /><i className="gh-wave gh-wave--b" /></span>
      <span className="gh-orb-icon">{icon}</span>
      <span className="gh-orb-shine" />
    </span>
    <span className="gh-orb-val">{value}</span>
    <span className="gh-orb-lbl">{label}</span>
  </button>
);

/** Segmented "health bar" with a moving shine. */
export const SegBar: React.FC<{ label: string; value: number; segments?: number; c: string; hi: string }> = ({ label, value, segments = 20, c, hi }) => {
  const on = Math.round((Math.max(0, Math.min(100, value)) / 100) * segments);
  return (
    <div className="gh-bar-row" style={{ ['--c' as string]: c, ['--c-hi' as string]: hi }}>
      <span>{label}</span>
      <div className="gh-seg flex-1" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>{Array.from({ length: segments }, (_, i) => <i key={i} className={i < on ? 'on' : ''} />)}</div>
      <b>{Math.round(value)}%</b>
    </div>
  );
};

/** The plant's nameplate: growth ring around an emblem, name, stage and health. */
export const Nameplate: React.FC<{ name: string; stage: string; stageColor: string; index: number; thc: number; health: number; progress: number; emblem: React.ReactNode; clocks: Array<{ icon: string; text: string; warn?: boolean }> }> = ({ name, stage, stageColor, index, thc, health, progress, emblem, clocks }) => {
  const R = 26, C = 2 * Math.PI * R;
  const hc = health > 70 ? ['#a3e635', '#ecfccb'] : health > 45 ? ['#fbbf24', '#fef3c7'] : ['#f87171', '#fecaca'];
  return (
    <div className="gh-frame gh-plate" style={{ ['--stage' as string]: stageColor }}>
      <div className="gh-emblem">
        <svg viewBox="0 0 60 60" aria-hidden><circle cx="30" cy="30" r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="5" /><circle cx="30" cy="30" r={R} fill="none" stroke={stageColor} strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(Math.min(100, progress) / 100) * C} ${C}`} transform="rotate(-90 30 30)" style={{ transition: 'stroke-dasharray .8s ease', filter: `drop-shadow(0 0 4px ${stageColor})` }} /></svg>
        <div className="gh-emblem-core">{emblem}</div>
        <span className="gh-emblem-lvl">#{index}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="gh-title truncate">{name}</div>
        <div className="gh-sub">{stage} · THC {thc}%</div>
        <SegBar label="SALUD" value={health} c={hc[0]} hi={hc[1]} />
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] font-mono">{clocks.map((r) => <span key={r.icon} className={r.warn ? 'text-amber-300' : 'text-neutral-300'}>{r.icon} {tr(r.text)}</span>)}</div>
      </div>
    </div>
  );
};

export interface ToolSpec { key: string; label: string; icon: React.ReactNode; color: string; onClick: () => void; badge?: number | string; badgeColor?: string; tour?: string; title?: string }

export const HudToolbar: React.FC<{ tools: ToolSpec[]; flower: number; trim: number }> = ({ tools, flower, trim }) => (
  <div className="flex flex-col items-end">
    <div className="gh-frame gh-toolbar">
      {tools.map((t) => (
        <button key={t.key} type="button" onClick={t.onClick} title={t.title ?? t.label} data-tour={t.tour} className="gh-tool" style={{ ['--tc' as string]: t.color }}>
          {t.icon}<span>{tr(t.label)}</span>
          {!!t.badge && <b className="gh-tool-badge" style={{ ['--bc' as string]: t.badgeColor }}>{t.badge}</b>}
        </button>
      ))}
    </div>
    <div className="gh-frame gh-loot">
      <div><small>{tr('FLOR')}</small><b className="text-lime-300">{flower} g</b></div>
      <span className="w-px bg-white/15" />
      <div><small>{tr('TRIM')}</small><b className="text-amber-300">{trim} g</b></div>
    </div>
  </div>
);

export interface SlotSpec { key: string; label: string; sub?: string; tone: 'cyan' | 'lime' | 'pink' | 'amber' | 'violet' | 'neutral'; icon: React.ReactNode; cost?: string; hot?: boolean; tour?: string; onClick: () => void }

/** RPG-style skill bar: big keys 1–6, cost badge, and a glow + "SIGUIENTE" tag on the recommended action. */
export const Hotbar: React.FC<{ slots: SlotSpec[] }> = ({ slots }) => (
  <div className="gh-frame gh-hotbar" role="toolbar" aria-label={tr('Habilidades del cultivo')} data-tour="hotbar">
    {slots.map((s, i) => (
      <button key={s.key} type="button" onClick={s.onClick} data-tour={s.tour} aria-label={tr('{label} (tecla {v1})', { label: s.label, v1: i + 1 })} title={tr('{label} · tecla {v1}', { label: s.label, v1: i + 1 })} className={`gh-slot gh-slot--${s.tone} ${s.hot ? 'is-hot' : ''}`}>
        <kbd className="gh-key">{i + 1}</kbd>
        {s.cost && <b className="gh-cost">{s.cost}</b>}
        {s.icon}
        <span className="gh-slot-lbl">{tr(s.label)}</span>
        {s.sub && <span className="gh-slot-sub">{s.sub}</span>}
      </button>
    ))}
  </div>
);
