import React, { useMemo } from 'react';
import {
  ELEMENT_IDS, ELEMENTS, INGREDIENTS, type Diagnosis, type ElementId, type LeafSpec, type Solution, type Status,
} from '../../sim/nutrition';
import { t as tr } from '../../i18n';

/* ───────────────────────────── colores ───────────────────────────── */

const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const toHex = (c: number[]) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const darken = (h: string, k: number) => toHex(hex(h).map((v) => v * k));

/** Color del líquido: mezcla de los colores de los ingredientes por su dosis; más EC = más denso y oscuro. */
export function mixColor(doses: Record<string, number>, ec: number): string {
  let r = 0, g = 0, b = 0, w = 0;
  for (const [id, d] of Object.entries(doses)) {
    const ing = INGREDIENTS[id];
    if (!ing || !(d > 0)) continue;
    const weight = ing.kind === 'acid' || ing.kind === 'base' ? d * 0.3 : d / Math.max(0.5, ing.max) + 0.15;
    const [cr, cg, cb] = hex(ing.color);
    r += cr * weight; g += cg * weight; b += cb * weight; w += weight;
  }
  const clear: [number, number, number] = [150, 210, 235];
  const strength = Math.min(1, w / 2.2);
  const base = w > 0 ? [r / w, g / w, b / w] : clear;
  const mixed = base.map((v, i) => clear[i] + (v - clear[i]) * strength);
  const avg = (mixed[0] + mixed[1] + mixed[2]) / 3;
  const vivid = mixed.map((v) => avg + (v - avg) * 1.45); // los tintes se mezclan hacia el gris: se devuelve algo de color
  const dark = 1 - Math.min(0.28, ec * 0.09);
  return toHex(vivid.map((v) => v * dark));
}

/* ───────────────────────────── vaso de laboratorio ───────────────────────────── */

export const Beaker: React.FC<{ color: string; level?: number; ec: number; pulse: number; dropColor?: string }> = ({ color, level = 0.66, ec, pulse, dropColor }) => {
  const y = 232 - level * 170;
  const bubbles = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ x: 62 + ((i * 37) % 96), d: 2.6 + (i % 4) * 0.7, s: 2 + (i % 3), delay: i * 0.45 })), []);
  return (
    <svg viewBox="0 0 220 270" className="nu-beaker" role="img" aria-label={tr('Vaso de laboratorio con la solución')}>
      <defs>
        <clipPath id="nuGlass"><path d="M52 40 L52 226 Q52 240 66 240 L154 240 Q168 240 168 226 L168 40 Z" /></clipPath>
        <linearGradient id="nuLiq" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.85" /><stop offset="1" stopColor={darken(color, 0.62)} stopOpacity="0.96" />
        </linearGradient>
        <linearGradient id="nuShine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0.32" /><stop offset="0.35" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" stopOpacity="0.08" /></linearGradient>
      </defs>
      <ellipse cx="110" cy="252" rx="70" ry="9" fill="#000" opacity="0.35" />
      <g clipPath="url(#nuGlass)">
        <g className="nu-liquid" style={{ transform: `translateY(${y}px)` }}>
          <rect x="40" y="0" width="140" height="260" fill="url(#nuLiq)" />
          <path className="nu-wave" d="M-40 0 Q-10 -8 20 0 T80 0 T140 0 T200 0 T260 0 V14 H-40 Z" fill={color} opacity="0.9" />
          <path className="nu-wave nu-wave--b" d="M-40 2 Q-10 8 20 2 T80 2 T140 2 T200 2 T260 2 V14 H-40 Z" fill="#fff" opacity="0.12" />
        </g>
        {bubbles.map((b, i) => (
          <circle key={i} className="nu-bubble" cx={b.x} cy={232} r={b.s} fill="#fff" opacity={0.5} style={{ animationDuration: `${b.d}s`, animationDelay: `${b.delay}s` }} />
        ))}
        <rect x="52" y="40" width="116" height="200" fill="url(#nuShine)" />
      </g>
      <path d="M52 40 L52 226 Q52 240 66 240 L154 240 Q168 240 168 226 L168 40" fill="none" stroke="#a7f3d0" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
      <path d="M46 38 H174" stroke="#a7f3d0" strokeOpacity="0.7" strokeWidth="4" strokeLinecap="round" />
      {[0.25, 0.5, 0.75, 1].map((f) => <g key={f}><line x1="168" x2={f === 0.5 || f === 1 ? 152 : 158} y1={232 - f * 170} y2={232 - f * 170} stroke="#a7f3d0" strokeOpacity="0.5" /></g>)}
      {pulse > 0 && dropColor && <circle key={pulse} className="nu-drop" cx="110" cy="6" r="6" fill={dropColor} />}
      {pulse > 0 && <ellipse key={`r${pulse}`} className="nu-ripple" cx="110" cy={y + 6} rx="8" ry="3" fill="none" stroke="#fff" strokeOpacity="0.7" />}
    </svg>
  );
};

/* ───────────────────────────── instrumentos ───────────────────────────── */

/** Medidor de pH: arco 3–10 con la zona objetivo del medio resaltada y aguja con inercia. */
export const PhPen: React.FC<{ ph: number; range: [number, number] }> = ({ ph, range }) => {
  const MIN = 3, MAX = 10;
  const ang = (v: number) => -90 + ((Math.min(MAX, Math.max(MIN, v)) - MIN) / (MAX - MIN)) * 180;
  const pt = (v: number, r: number) => { const a = (ang(v) - 90) * (Math.PI / 180); return [100 + r * Math.cos(a), 100 + r * Math.sin(a)]; };
  const arc = (a: number, b: number, r: number) => { const [x1, y1] = pt(a, r), [x2, y2] = pt(b, r); return `M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`; };
  const ok = ph >= range[0] && ph <= range[1];
  return (
    <div className="nu-inst" aria-label={`pH ${ph}`}>
      <svg viewBox="0 0 200 118" className="w-full">
        <path d={arc(3, 10, 78)} stroke="#1f2937" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d={arc(3, 5.5, 78)} stroke="#ef4444" strokeOpacity="0.55" strokeWidth="14" fill="none" />
        <path d={arc(5.5, 7.5, 78)} stroke="#22c55e" strokeOpacity="0.28" strokeWidth="14" fill="none" />
        <path d={arc(7.5, 10, 78)} stroke="#3b82f6" strokeOpacity="0.5" strokeWidth="14" fill="none" />
        <path d={arc(range[0], range[1], 78)} stroke="#4ade80" strokeWidth="14" fill="none" className="nu-target" />
        {[3, 4, 5, 6, 7, 8, 9, 10].map((v) => { const [x, y] = pt(v, 62), [x2, y2] = pt(v, 70); return <g key={v}><line x1={x} y1={y} x2={x2} y2={y2} stroke="#94a3b8" /><text x={pt(v, 52)[0]} y={pt(v, 52)[1] + 3} fontSize="8" textAnchor="middle" fill="#94a3b8">{v}</text></g>; })}
        <g className="nu-needle" style={{ transform: `rotate(${ang(ph)}deg)` }}><line x1="100" y1="100" x2="100" y2="34" stroke="#fef3c7" strokeWidth="3" strokeLinecap="round" /><circle cx="100" cy="100" r="6" fill="#fef3c7" /></g>
      </svg>
      <div className={`nu-lcd ${ok ? 'nu-lcd--ok' : 'nu-lcd--warn'}`}><small>pH</small><b>{ph.toFixed(2)}</b></div>
    </div>
  );
};

export type EcUnit = 'ec' | 'ppm500' | 'ppm700';
export const ecValue = (sol: Solution, unit: EcUnit) => (unit === 'ec' ? sol.ec : unit === 'ppm500' ? sol.ppm500 : sol.ppm700);
export const ecFromTarget = (ec: number, unit: EcUnit) => (unit === 'ec' ? ec : unit === 'ppm500' ? Math.round(ec * 500) : Math.round(ec * 700));
export const EC_UNIT_LABEL: Record<EcUnit, string> = { ec: 'mS/cm', ppm500: 'ppm (500)', ppm700: 'ppm (700)' };

export const EcMeter: React.FC<{ sol: Solution; range: [number, number]; state: Diagnosis['ecState']; unit: EcUnit; onUnit: (u: EcUnit) => void }> = ({ sol, range, state, unit, onUnit }) => {
  const max = Math.max(3, range[1] * 1.7);
  const pct = (v: number) => Math.min(100, (v / max) * 100);
  return (
    <div className="nu-inst">
      <div className={`nu-lcd nu-lcd--ec nu-lcd--${state === 'ok' ? 'ok' : state === 'low' ? 'low' : 'warn'}`}>
        <small>EC</small><b>{unit === 'ec' ? sol.ec.toFixed(2) : ecValue(sol, unit)}</b><em>{EC_UNIT_LABEL[unit]}</em>
      </div>
      <div className="nu-ecbar" aria-hidden><i className="nu-ecbar__ok" style={{ left: `${pct(range[0])}%`, width: `${pct(range[1]) - pct(range[0])}%` }} /><i className="nu-ecbar__now" style={{ left: `${pct(sol.ec)}%` }} /></div>
      <div className="nu-seg">
        {(['ec', 'ppm500', 'ppm700'] as EcUnit[]).map((u) => <button key={u} className={unit === u ? 'is-on' : ''} onClick={() => onUnit(u)}>{u === 'ec' ? 'mS' : u === 'ppm500' ? '500' : '700'}</button>)}
      </div>
    </div>
  );
};

/** Barras de cada elemento frente a su rango ideal (banda verde). El punto blanco es lo que la raíz realmente puede tomar. */
export const ElementBars: React.FC<{ sol: Solution; d: Diagnosis; compact?: boolean }> = ({ sol, d, compact }) => (
  <div className="space-y-1.5">
    {ELEMENT_IDS.map((e) => {
      const [lo, hi] = d.ranges[e];
      const max = Math.max(hi * 1.8, sol.ppm[e] * 1.05, 1);
      const p = (v: number) => Math.min(100, (v / max) * 100);
      const st: Status = d.status[e];
      const blocked = Math.abs(d.effective[e] - sol.ppm[e]) > Math.max(1, sol.ppm[e] * 0.08);
      return (
        <div key={e} className="nu-el" title={tr('{name}: {v1} ppm en la solución, {v2} absorbibles. Ideal {lo}–{hi}', { name: ELEMENTS[e].name, v1: sol.ppm[e], v2: d.effective[e], lo, hi })}>
          <span className="nu-el__sym" style={{ color: ELEMENTS[e].color }}>{e}</span>
          <div className="nu-el__track">
            <i className="nu-el__ideal" style={{ left: `${p(lo)}%`, width: `${Math.max(2, p(hi) - p(lo))}%` }} />
            <i className={`nu-el__fill nu-el__fill--${st}`} style={{ width: `${p(sol.ppm[e])}%`, background: ELEMENTS[e].color }} />
            {blocked && <b className="nu-el__eff" style={{ left: `${p(d.effective[e])}%` }} />}
          </div>
          {!compact && <span className="nu-el__num">{sol.ppm[e]}</span>}
          <span className={`nu-el__st nu-el__st--${st}`}>{st === 'ok' ? '✔' : st === 'low' ? '▼' : st === 'deficient' ? '▼▼' : st === 'high' ? '▲' : '▲▲'}</span>
        </div>
      );
    })}
  </div>
);

export const ScoreRing: React.FC<{ score: number; stars: number; label: string }> = ({ score, stars, label }) => {
  const R = 44, C = 2 * Math.PI * R;
  const col = score >= 90 ? '#34d399' : score >= 75 ? '#a3e635' : score >= 55 ? '#fbbf24' : '#f87171';
  return (
    <div className="nu-ring" role="img" aria-label={tr('Calidad {score} de 100', { score })}>
      <svg viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={R} stroke="#1f2937" strokeWidth="9" fill="none" />
        <circle cx="55" cy="55" r={R} stroke={col} strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} transform="rotate(-90 55 55)" className="nu-ring__arc" />
      </svg>
      <div className="nu-ring__txt"><b style={{ color: col }}>{score}</b><span>{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</span></div>
      <p>{label}</p>
    </div>
  );
};

/* ───────────────────────────── botella animada (marcas) ───────────────────────────── */

export const Bottle: React.FC<{ color: string; label?: string; size?: number }> = ({ color, label, size = 46 }) => (
  <svg viewBox="0 0 40 64" width={size} height={size * 1.6} className="nu-bottle" aria-hidden>
    <rect x="14" y="2" width="12" height="9" rx="2" fill="#0f172a" stroke="#94a3b8" strokeOpacity="0.5" />
    <path d="M13 11 H27 V17 Q34 20 34 30 V56 Q34 62 28 62 H12 Q6 62 6 56 V30 Q6 20 13 17 Z" fill="#0b1f1a" stroke="#a7f3d0" strokeOpacity="0.55" />
    <path className="nu-bottle__liq" d="M8 36 Q20 32 32 36 V56 Q32 60 28 60 H12 Q8 60 8 56 Z" fill={color} opacity="0.9" />
    <rect x="10" y="40" width="20" height="12" rx="2" fill="#020617" opacity="0.55" />
    {label && <text x="20" y="49" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#e2e8f0">{label}</text>}
    <path d="M10 22 Q9 34 10 48" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

/* ───────────────────────────── hoja de síntomas ───────────────────────────── */

const LEAFLETS: { a: number; l: number; w: number }[] = [
  { a: -84, l: 46, w: 9 }, { a: -58, l: 68, w: 12 }, { a: -30, l: 88, w: 14 }, { a: 0, l: 100, w: 15 }, { a: 30, l: 88, w: 14 }, { a: 58, l: 68, w: 12 }, { a: 84, l: 46, w: 9 },
];
const leaflet = (l: number, w: number) => `M0 0 C${w} ${-l * 0.28} ${w * 1.05} ${-l * 0.68} 0 ${-l} C${-w * 1.05} ${-l * 0.68} ${-w} ${-l * 0.28} 0 0 Z`;

export const LeafArt: React.FC<{ spec: LeafSpec; size?: number; sway?: boolean; id?: string }> = ({ spec, size = 220, sway = true, id = 'lf' }) => {
  const veinCol = spec.veins ?? darken(spec.base, 0.72);
  const bold = !!spec.veins;
  const spots = useMemo(() => (spec.spots ? Array.from({ length: 14 }, (_, i) => ({ x: ((i * 53) % 120) - 60, y: -((i * 37) % 90) - 12, r: 1.6 + (i % 3) })) : []), [spec.spots]);
  return (
    <svg viewBox="-110 -125 220 150" width={size} height={size * 0.68} className={sway ? 'nu-leaf' : ''} role="img" aria-label={tr('Hoja de cannabis')}>
      <defs>
        {LEAFLETS.map((_, i) => (
          <linearGradient key={i} id={`${id}-g${i}`} x1="0" y1="0" x2="0" y2="-1">
            <stop offset="0" stopColor={spec.base} />
            <stop offset={spec.yellowFrom === 'tip' ? 0.35 : 0.7} stopColor={spec.base} />
            <stop offset="1" stopColor={spec.tipBurn ? spec.edge ?? '#8a5a1a' : spec.base} />
          </linearGradient>
        ))}
      </defs>
      <path d="M0 22 L0 -2" stroke={spec.purple ? '#8b3fbf' : darken(spec.base, 0.7)} strokeWidth="4" strokeLinecap="round" />
      {LEAFLETS.map((f, i) => {
        const claw = spec.claw ? 1 : 0;
        return (
          <g key={i} transform={`rotate(${f.a + (f.a > 0 ? claw * 6 : f.a < 0 ? -claw * 6 : 0)}) scale(1 ${spec.claw ? 0.86 : 1})`}>
            <path d={leaflet(f.l, f.w)} fill={`url(#${id}-g${i})`} stroke={spec.edge && spec.tipBurn ? spec.edge : darken(spec.base, 0.6)} strokeOpacity="0.7" strokeWidth={spec.tipBurn ? 1.6 : 1} />
            <line x1="0" y1="-2" x2="0" y2={-f.l * 0.9} stroke={veinCol} strokeWidth={bold ? 2.6 : 1.4} strokeLinecap="round" />
            {[0.3, 0.5, 0.7].map((t) => <g key={t}><line x1="0" y1={-f.l * t} x2={f.w * 0.75} y2={-f.l * (t + 0.12)} stroke={veinCol} strokeWidth={bold ? 1.6 : 0.8} opacity="0.8" /><line x1="0" y1={-f.l * t} x2={-f.w * 0.75} y2={-f.l * (t + 0.12)} stroke={veinCol} strokeWidth={bold ? 1.6 : 0.8} opacity="0.8" /></g>)}
          </g>
        );
      })}
      {spots.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={spec.spots} opacity="0.75" />)}
    </svg>
  );
};
