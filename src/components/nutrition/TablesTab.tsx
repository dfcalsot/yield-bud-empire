import React, { useMemo, useState } from 'react';
import { Beaker as BeakerIcon, FlaskConical, Leaf, Sprout } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { USE } from '../../economy/catalog';
import {
  diagnose, dosesFromTable, feedEffect, ingredientForProduct, INGREDIENTS, MEDIA, MEDIUM_BY_ID, phCorrection, solve, stageIdOfBrandStage, stageOfProgress,
  STAGE_BY_ID, strengthForEc, WATERS, type AcidId, type Mix, type StageId,
} from '../../sim/nutrition';
import type { NutrientBrand } from '../../types';
import { Bottle, EcMeter, ecFromTarget, EC_UNIT_LABEL, ElementBars, PhPen, ScoreRing, type EcUnit } from './art';
import type { NutriPrefs } from './prefs';
import { t, k, localize } from '../../i18n';

const nums = (s: string) => (s.match(/[\d.]+/g) ?? []).map(Number);
const mid = (s: string, fb: number) => { const v = nums(s); return v.length ? v.reduce((a, x) => a + x, 0) / v.length : fb; };
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const ACIDS: { id: AcidId; label: string }[] = localize([{ id: 'acid_nitric', label: k('Nítrico') }, { id: 'acid_sulfuric', label: k('Sulfúrico') }, { id: 'ph_down', label: k('Fosfórico') }], ['label']);

interface Row { idx: number; name: string; weeks: string; stageId: StageId; printedEc: string; printedPh: string; targetEc: number; strength: number; mix: Mix; corr: { ingredient: string | null; dose: number }; sol: ReturnType<typeof solve>; d: ReturnType<typeof diagnose>; dosage: { productName: string; mlPerL: number }[] }

export const TablesTab: React.FC<{ prefs: NutriPrefs; setPrefs: (p: Partial<NutriPrefs>) => void; onSendToLab: (doses: Record<string, number>, stage: StageId) => void }> = ({ prefs, setPrefs, onSendToLab }) => {
  const { nutrientBrands, selectedNutrientBrand, setSelectedNutrientBrand, activePlant, applyFertigation, resources } = useGame();
  const brand: NutrientBrand = nutrientBrands.find((b) => b.id === selectedNutrientBrand) ?? nutrientBrands[0];
  const medium = MEDIUM_BY_ID[prefs.medium];
  const plantStage: StageId | null = activePlant ? stageOfProgress(activePlant.progressPercent) : null;
  const [strengthPct, setStrengthPct] = useState<number | null>(null); // null = automática (a la EC objetivo)
  const [pick, setPick] = useState<number | null>(null);

  const rows: Row[] = useMemo(() => brand.stages.map((st, idx) => {
    const stageId = stageIdOfBrandStage(st.stageName);
    const sci = STAGE_BY_ID[stageId];
    const printedMid = mid(st.targetEc, sci.ec[1]);
    const targetEc = Number(clamp(printedMid, sci.ec[0] * medium.ecMul, sci.ec[1] * medium.ecMul * 0.97).toFixed(2));
    const strength = strengthPct === null ? strengthForEc(st.dosageMlPerLiter, prefs.water, targetEc) : strengthPct / 100;
    const doses = dosesFromTable(st.dosageMlPerLiter, strength);
    const base: Mix = { waterId: prefs.water, liters: prefs.liters, doses };
    const phTarget = stageId === 'flush' ? 6.3 : (medium.ph[0] + medium.ph[1]) / 2;
    const corr = phCorrection(base, phTarget, prefs.acid);
    const mix: Mix = corr.ingredient ? { ...base, doses: { ...doses, [corr.ingredient]: corr.dose } } : base;
    const sol = solve(mix);
    return { idx, name: t(st.stageName), weeks: t(st.phaseCode), stageId, printedEc: st.targetEc, printedPh: st.targetPh, targetEc, strength, mix, corr, sol, d: diagnose(sol, stageId, prefs.medium), dosage: st.dosageMlPerLiter };
  }), [brand, prefs.water, prefs.liters, prefs.acid, prefs.medium, medium, strengthPct]);

  const plantIdx = plantStage ? Math.max(0, rows.findIndex((r) => r.stageId === plantStage)) : -1;
  const sel = rows[pick ?? (plantIdx >= 0 ? plantIdx : 0)] ?? rows[0];
  const ecUnit = prefs.ecUnit;
  const nutrientStock = resources.nutrient;
  const canApply = !!activePlant;
  const apply = (scope: 'one' | 'all') => {
    const e = feedEffect(sel.sol, sel.d);
    applyFertigation({ ...e, score: sel.d.score, label: `${brand.name} · ${sel.name}`, scope, brandName: brand.name });
  };

  return (
    <div className="space-y-5">
      {/* Ajustes que mueven todos los números */}
      <section className="hud-panel p-4 space-y-3" aria-label={t('Ajustes de la mezcla')}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <div className="nu-lbl">{t('Agua de origen')}</div>
            <div className="nu-chips">{WATERS.map((w) => <button key={w.id} className={`nu-chip ${prefs.water === w.id ? 'is-on' : ''}`} onClick={() => setPrefs({ water: w.id })} title={t(w.blurb)}>{w.emoji} {t(w.name)}</button>)}</div>
          </div>
          <div>
            <div className="nu-lbl">{t('Medio de cultivo')}</div>
            <div className="nu-chips">{MEDIA.map((m) => <button key={m.id} className={`nu-chip ${prefs.medium === m.id ? 'is-on' : ''}`} onClick={() => setPrefs({ medium: m.id })} title={t(m.blurb)}>{m.emoji} {t(m.name)}</button>)}</div>
          </div>
          <div>
            <div className="nu-lbl">{t('Depósito · {liters} L', { liters: prefs.liters })}</div>
            <div className="nu-chips">{[1, 5, 10, 20, 50].map((l) => <button key={l} className={`nu-chip ${prefs.liters === l ? 'is-on' : ''}`} onClick={() => setPrefs({ liters: l })}>{l} L</button>)}</div>
          </div>
          <div>
            <div className="nu-lbl">{t('Fuerza de la mezcla')}</div>
            <div className="flex items-center gap-2">
              <button className={`nu-chip ${strengthPct === null ? 'is-on' : ''}`} onClick={() => setStrengthPct(null)} title={t('Ajusta las dosis a la EC objetivo con tu agua')}>{t('Auto (EC)')}</button>
              <input type="range" min={40} max={140} step={5} value={strengthPct ?? Math.round(sel.strength * 100)} onChange={(e) => setStrengthPct(Number(e.target.value))} aria-label={t('Fuerza de la mezcla en % de la dosis impresa')} className="nu-range flex-1" />
              <span className="font-mono text-xs text-emerald-300 w-10 text-right">{strengthPct ?? Math.round(sel.strength * 100)}%</span>
            </div>
          </div>
        </div>
        <p className="text-[11.5px] text-neutral-400 leading-relaxed"><b className="text-emerald-300">{t(WATERS.find((w) => w.id === prefs.water)?.name)}:</b> {t(WATERS.find((w) => w.id === prefs.water)?.blurb)} <span className="text-neutral-500">· {t(medium.name)}: {t(medium.blurb)}</span></p>
      </section>

      {/* Marcas */}
      <div className="grid gap-3 md:grid-cols-3">
        {nutrientBrands.map((b) => {
          const on = b.id === brand.id;
          const prods = Array.from(new Set(b.stages.flatMap((s) => s.dosageMlPerLiter.map((d) => d.productName)))).map((n) => ingredientForProduct(n)).filter(Boolean).slice(0, 4);
          return (
            <button key={b.id} onClick={() => { setSelectedNutrientBrand(b.id); setPick(null); }} className={`nu-brand ${on ? 'is-on' : ''}`} style={{ ['--brand' as string]: b.colorTheme }} aria-pressed={on}>
              <div className="nu-brand__bottles">{prods.map((p, i) => <Bottle key={p!.id} color={p!.color} size={30 + (i % 2) * 4} />)}</div>
              <div className="min-w-0 text-left">
                <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">{t(b.line)}</div>
                <div className="font-serif font-bold text-white leading-tight">{t(b.name)}</div>
                <span className="nu-pill" style={{ color: b.colorTheme, borderColor: b.colorTheme }}>{t(b.category)}</span>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug line-clamp-3">{t(b.description)}</p>
              </div>
            </button>
          );
        })}
      </div>
      {brand.category === 'Orgánica 100%' && <p className="nu-note">{t('🌿 Los abonos orgánicos liberan su N-P-K solo cuando los microbios los mineralizan: el juego cuenta un')}{' '}<b>60 %</b>{' '}{t('disponible. Por eso las mismas dosis dan menos EC que una mineral.')}</p>}

      {/* Línea de tiempo de etapas */}
      <div className="nu-stages" role="tablist" aria-label={t('Etapas')}>
        {rows.map((r) => {
          const on = r === sel;
          return (
            <button key={r.idx} role="tab" aria-selected={on} onClick={() => setPick(r.idx)} className={`nu-stage ${on ? 'is-on' : ''} ${r.idx === plantIdx ? 'is-plant' : ''}`}>
              {r.idx === plantIdx && <span className="nu-stage__you"><Sprout className="w-3 h-3" />{' '}{t('tu planta')}</span>}
              <b>{t(r.name)}</b><small>{t(r.weeks)}</small>
              <i style={{ ['--to' as string]: clamp(r.sol.ec / 3, 0.05, 1) } as React.CSSProperties} />
            </button>
          );
        })}
      </div>

      {sel && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          {/* Receta */}
          <section className="hud-panel p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2"><FlaskConical className="w-5 h-5 text-emerald-300" /> {t(sel.name)}</h3>
              <span className="text-[11px] font-mono text-neutral-400">N-P-K {brand.stages[sel.idx].recommendedNpk ?? STAGE_BY_ID[sel.stageId].npk} · {t(sel.weeks)}</span>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">{t(brand.stages[sel.idx].instructions ?? STAGE_BY_ID[sel.stageId].note)}</p>

            <div className="nu-recipe">
              <div className="nu-recipe__head"><span>{t('Producto')}</span><span>{t('Tabla')}</span><span>{t('Tu mezcla')}</span><span>{t('Para {liters} L', { liters: prefs.liters })}</span></div>
              {sel.dosage.map((d) => {
                const ing = ingredientForProduct(d.productName);
                const adj = d.mlPerL * sel.strength;
                return (
                  <div key={d.productName} className="nu-recipe__row">
                    <span className="flex items-center gap-2 min-w-0"><Bottle color={ing?.color ?? '#94a3b8'} size={18} /><span className="truncate">{t(d.productName)}</span></span>
                    <span className="font-mono text-neutral-400">{d.mlPerL} ml/L</span>
                    <span className="font-mono text-emerald-300 font-bold">{adj.toFixed(2)} ml/L</span>
                    <span className="font-mono text-amber-200">{(adj * prefs.liters).toFixed(1)} ml</span>
                  </div>
                );
              })}
              <div className="nu-recipe__row nu-recipe__row--acid">
                <span className="flex items-center gap-2"><Bottle color="#fca5a5" size={18} />
                  <select value={prefs.acid} onChange={(e) => setPrefs({ acid: e.target.value as AcidId })} className="nu-select" aria-label={t('Ácido para bajar el pH')}>{ACIDS.map((a) => <option key={a.id} value={a.id}>{t(a.label)}</option>)}</select></span>
                <span className="font-mono text-neutral-500">—</span>
                {sel.corr.ingredient ? <><span className="font-mono text-sky-300 font-bold">{sel.corr.dose.toFixed(2)} ml/L</span><span className="font-mono text-amber-200">{(sel.corr.dose * prefs.liters).toFixed(1)} ml</span></> : <><span className="font-mono text-neutral-500">{t('no hace falta')}</span><span /></>}
              </div>
              {sel.corr.ingredient && <p className="text-[10.5px] text-neutral-500 px-1 pt-1">{t('{name} para llevar el pH a {ph}. Añade siempre el ácido al agua, nunca al revés.', { name: INGREDIENTS[sel.corr.ingredient].name, ph: sel.sol.ph })}</p>}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
              <div className="mk-panel p-2"><div className="text-neutral-500 uppercase">{t('EC de la tabla')}</div><b className="text-cyan-300">{sel.printedEc.replace('mS/cm', '').trim()}</b></div>
              <div className="mk-panel p-2"><div className="text-neutral-500 uppercase">{t('EC con tu agua')}</div><b className="text-emerald-300">{ecFromTarget(sel.sol.ec, ecUnit)} <small>{EC_UNIT_LABEL[ecUnit]}</small></b></div>
              <div className="mk-panel p-2"><div className="text-neutral-500 uppercase">{t('pH objetivo')}</div><b className="text-purple-300">{sel.printedPh}</b></div>
            </div>
            {sel.targetEc < mid(sel.printedEc, 0) - 0.05 && <p className="nu-note">{t('⚠️ Esta tabla del fabricante pide más EC de la que tolera esta etapa ({targetEc} mS/cm): la receta se limita para no quemar las raíces. Los fabricantes tienden a recomendar dosis altas.', { targetEc: sel.targetEc })}</p>}
            {sel.strength <= 0.05 && <p className="nu-note">{t('💧 Tu agua ya trae casi toda la EC necesaria: no hace falta añadir base.')}</p>}

            <div className="flex flex-wrap gap-2 pt-1">
              <button className="care-btn care-btn--gold" disabled={!canApply} onClick={() => apply('one')}><Leaf className="w-3.5 h-3.5" />{' '}{t('Aplicar a mi planta')}</button>
              <button className="care-btn" disabled={!canApply} onClick={() => apply('all')}>{t('A toda la sala')}</button>
              <button className="care-btn" onClick={() => onSendToLab({ ...sel.mix.doses }, sel.stageId)}><BeakerIcon className="w-3.5 h-3.5" />{' '}{t('Probar en el laboratorio')}</button>
            </div>
            <p className="text-[10.5px] font-mono text-neutral-500">{canApply ? t('Gasta {nutrientPerPlant} ml de abono por planta (tienes {v1} ml) y agua del depósito.', { nutrientPerPlant: USE.nutrientPerPlant, v1: Math.round(nutrientStock) }) : t('Siembra una planta para aplicar la mezcla.')}</p>
          </section>

          {/* Medición */}
          <section className="hud-panel p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-[auto_1fr] gap-4 items-center">
              <ScoreRing score={sel.d.score} stars={sel.d.stars} label={t(sel.d.headline)} />
              <div className="grid grid-cols-2 gap-3"><PhPen ph={sel.sol.ph} range={medium.ph} /><EcMeter sol={sel.sol} range={sel.d.ecRange} state={sel.d.ecState} unit={ecUnit} onUnit={(u: EcUnit) => setPrefs({ ecUnit: u })} /></div>
            </div>
            <div><div className="nu-lbl mb-1.5">{t('Elementos frente al rango ideal de {v0}', { v0: STAGE_BY_ID[sel.stageId].name.toLowerCase() })}</div><ElementBars sol={sel.sol} d={sel.d} /></div>
            <ul className="space-y-1.5">{sel.d.findings.slice(0, 3).map((f) => <li key={f.id} className={`nu-find nu-find--${f.level}`}><b>{t(f.title)}</b>{f.fix && <span>{t(f.fix)}</span>}</li>)}</ul>
          </section>
        </div>
      )}

      <FeedingCurve rows={rows} plantIdx={plantIdx} ecUnit={ecUnit} sel={sel} onPick={setPick} />
      <ChartTable rows={rows} ecUnit={ecUnit} selIdx={sel?.idx ?? 0} plantIdx={plantIdx} onPick={setPick} liters={prefs.liters} />
    </div>
  );
};

/** Curva de alimentación: EC recomendada por etapa con tu agua, y las barras de N-P-K. */
const FeedingCurve: React.FC<{ rows: Row[]; plantIdx: number; ecUnit: EcUnit; sel?: Row; onPick: (i: number) => void }> = ({ rows, plantIdx, ecUnit, sel, onPick }) => {
  const W = 700, H = 200, padL = 42, padR = 46, top = 16, base = 150;
  const n = rows.length;
  const x = (i: number) => padL + (n === 1 ? 0 : (i / (n - 1)) * (W - padL - padR));
  const maxEc = Math.max(3, ...rows.map((r) => Math.max(r.sol.ec, nums(r.printedEc).slice(-1)[0] ?? 0))) * 1.08;
  const y = (ec: number) => base - (ec / maxEc) * (base - top);
  const line = rows.map((r, i) => `${i ? 'L' : 'M'}${x(i)} ${y(r.sol.ec)}`).join(' ');
  const band = [...rows.map((r, i) => `${i ? 'L' : 'M'}${x(i)} ${y(nums(r.printedEc).slice(-1)[0] ?? r.sol.ec)}`), ...rows.slice().reverse().map((r, i) => `L${x(n - 1 - i)} ${y(nums(r.printedEc)[0] ?? r.sol.ec)}`), 'Z'].join(' ');
  return (
    <section className="hud-panel p-4 sm:p-5" aria-label={t('Curva de alimentación')}>
      <div className="flex items-baseline justify-between gap-2 mb-2"><h4 className="font-serif font-bold text-white">{t('Curva de alimentación')}</h4><span className="text-[10.5px] font-mono text-neutral-500">{t('línea = tu EC · banda = tabla del fabricante · barras = N-P-K (ppm)')}</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t('EC por etapa')}>
        {[0, 1, 2, 3].map((g) => <g key={g}><line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke="#334155" strokeOpacity="0.4" /><text x={padL - 6} y={y(g) + 3} fontSize="9" textAnchor="end" fill="#94a3b8">{ecFromTarget(g, ecUnit)}</text></g>)}
        <path d={band} fill="#22d3ee" opacity="0.14" />
        <path d={line} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinejoin="round" className="nu-curve" />
        {rows.map((r, i) => (
          <g key={r.idx} onClick={() => onPick(i)} style={{ cursor: 'pointer' }}>
            <circle cx={x(i)} cy={y(r.sol.ec)} r={r === sel ? 6 : 4} fill={r === sel ? '#fbbf24' : '#34d399'} stroke="#022c22" strokeWidth="2" />
            {(['N', 'P', 'K'] as const).map((e, k) => { const h = Math.min(34, (r.sol.ppm[e] / 320) * 34); const col = e === 'N' ? '#34d399' : e === 'P' ? '#c084fc' : '#fbbf24'; return <rect key={e} x={x(i) - 15 + k * 11} y={base + 40 - h} width="9" height={Math.max(1, h)} rx="2" fill={col} opacity="0.85"><title>{`${e}: ${r.sol.ppm[e]} ppm`}</title></rect>; })}
            <text x={x(i)} y={H - 4} fontSize="9" textAnchor={i === n - 1 ? 'end' : i === 0 ? 'start' : 'middle'} fill={r === sel ? '#fde68a' : '#94a3b8'}>{r.name.length > 14 ? r.name.slice(0, 13) + '…' : r.name}</text>
            {i === plantIdx && <text x={x(i)} y={y(r.sol.ec) - 12} fontSize="10" textAnchor="middle" fill="#86efac">🌱</text>}
          </g>
        ))}
      </svg>
    </section>
  );
};

/** La tabla completa, recalculada con tu agua: cada fila se puede pulsar. */
const ChartTable: React.FC<{ rows: Row[]; ecUnit: EcUnit; selIdx: number; plantIdx: number; onPick: (i: number) => void; liters: number }> = ({ rows, ecUnit, selIdx, plantIdx, onPick, liters }) => (
  <section className="hud-panel p-4 sm:p-5 overflow-x-auto" aria-label={t('Tabla completa')}>
    <h4 className="font-serif font-bold text-white mb-2">{t('Tabla completa · recalculada con tu agua')}</h4>
    <table className="nu-table">
      <thead><tr><th>{t('Etapa')}</th><th>{t('Semanas')}</th><th>{t('pH obj.')}</th><th>{t('EC tabla')}</th><th>{t('Tu EC ({v0})', { v0: EC_UNIT_LABEL[ecUnit] })}</th><th>{t('Fuerza')}</th><th>{t('Calidad')}</th><th>{t('Dosis por litro (→ {liters} L)', { liters })}</th></tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.idx} className={`${r.idx === selIdx ? 'is-on' : ''} ${r.idx === plantIdx ? 'is-plant' : ''}`} onClick={() => onPick(r.idx)}>
            <td><b>{t(r.name)}</b></td><td>{t(r.weeks)}</td><td>{r.printedPh}</td><td>{r.printedEc.replace('mS/cm', '').trim()}</td>
            <td className="text-emerald-300 font-bold">{ecFromTarget(r.sol.ec, ecUnit)}</td><td>{Math.round(r.strength * 100)}%</td>
            <td><span className={`nu-score nu-score--${r.d.stars}`}>{r.d.score}</span></td>
            <td className="text-neutral-400">{r.dosage.map((d) => `${d.productName.split(' (')[0]} ${(d.mlPerL * r.strength).toFixed(1)}`).join(' · ')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);
