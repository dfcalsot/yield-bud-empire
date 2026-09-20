import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Beaker as BeakerIcon, BookOpen, CheckCircle2, Eraser, Leaf, Save, Trophy, Trash2 } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { Npc, useNpc, type Mood } from '../npc/Npc';
import { USE } from '../../economy/catalog';
import {
  BRAND_INGREDIENTS, CHALLENGES, diagnose, dosesFromTable, feedEffect, INGREDIENTS, MEDIA, MEDIUM_BY_ID, phCorrection, SALTS, solve, stageOfProgress, STAGES, STAGE_BY_ID,
  stageIdOfBrandStage, strengthForEc, WATERS, type AcidId, type Challenge, type Ingredient, type Mix, type StageId,
} from '../../sim/nutrition';
import { Beaker, Bottle, EcMeter, ElementBars, mixColor, PhPen, ScoreRing } from './art';
import type { NutriPrefs } from './prefs';

const ACIDS: { id: AcidId; label: string }[] = [{ id: 'acid_nitric', label: 'Nítrico' }, { id: 'acid_sulfuric', label: 'Sulfúrico' }, { id: 'ph_down', label: 'Fosfórico' }];
const round = (v: number, step: number) => Number((Math.round(v / step) * step).toFixed(3));
const fmt = (v: number) => (v >= 10 ? v.toFixed(1) : v.toFixed(2)).replace(/\.?0+$/, (m) => (m === '.00' ? '' : m));

const Row: React.FC<{ ing: Ingredient; dose: number; disabled?: boolean; onChange: (v: number) => void }> = ({ ing, dose, disabled, onChange }) => (
  <div className={`nu-ing ${dose > 0 ? 'is-used' : ''} ${disabled ? 'is-off' : ''}`} title={ing.blurb + (ing.approx ? ' (análisis típico aproximado de su clase)' : '')}>
    <Bottle color={ing.color} size={20} />
    <div className="min-w-0 flex-1">
      <div className="nu-ing__name">{ing.name}</div>
      <input type="range" min={0} max={ing.max} step={ing.step} value={dose} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} aria-label={`${ing.name} en ${ing.unit}/L`} className="nu-range" />
    </div>
    <button className="nu-step" disabled={disabled || dose <= 0} onClick={() => onChange(dose - ing.step)} aria-label="menos">−</button>
    <span className="nu-ing__val">{dose > 0 ? fmt(dose) : '0'}<small>{ing.unit}/L</small></span>
    <button className="nu-step" disabled={disabled || dose >= ing.max} onClick={() => onChange(dose + ing.step)} aria-label="más">+</button>
  </div>
);

export const LabTab: React.FC<{
  prefs: NutriPrefs; setPrefs: (p: Partial<NutriPrefs> | ((p: NutriPrefs) => Partial<NutriPrefs>)) => void;
  seed: { doses: Record<string, number>; stage: StageId; key: number } | null; onOpenSymptom: (id: string) => void;
}> = ({ prefs, setPrefs, seed, onOpenSymptom }) => {
  const { nutrientBrands, selectedNutrientBrand, activePlant, applyFertigation, addXp, showNotification, resources } = useGame();
  const brand = nutrientBrands.find((b) => b.id === selectedNutrientBrand) ?? nutrientBrands[0];
  const medium = MEDIUM_BY_ID[prefs.medium];
  const [stage, setStage] = useState<StageId>(() => (activePlant ? stageOfProgress(activePlant.progressPercent) : 'veg_late'));
  const [doses, setDoses] = useState<Record<string, number>>({});
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [pulse, setPulse] = useState(0);
  const [dropColor, setDropColor] = useState<string | undefined>();
  const [others, setOthers] = useState(false);
  const [recipeName, setRecipeName] = useState('');
  const npc = useNpc('¡Bienvenido a mi laboratorio! Echa ingredientes al vaso y mira cómo cambian el pH, la EC y cada elemento. Nada se gasta hasta que la apliques a una planta.');

  // receta enviada desde las tablas
  const lastSeed = useRef(0);
  useEffect(() => {
    if (seed && seed.key !== lastSeed.current) { lastSeed.current = seed.key; setDoses(seed.doses); setStage(seed.stage); setChallenge(null); setPulse((p) => p + 1); }
  }, [seed]);

  const mix: Mix = useMemo(() => ({ waterId: prefs.water, liters: prefs.liters, doses }), [prefs.water, prefs.liters, doses]);
  const sol = useMemo(() => solve(mix), [mix]);
  const d = useMemo(() => diagnose(sol, stage, prefs.medium), [sol, stage, prefs.medium]);
  const goal = challenge ? challenge.goal(sol, d, mix) : null;
  const done = challenge ? prefs.challengesDone.includes(challenge.id) : false;
  const used = Object.entries(doses).filter(([, v]) => v > 0);

  const setDose = (id: string, v: number) => {
    const ing = INGREDIENTS[id];
    const nv = Math.min(ing.max, Math.max(0, round(v, ing.step)));
    if (nv > (doses[id] ?? 0)) { setPulse((p) => p + 1); setDropColor(ing.color); }
    setDoses((cur) => ({ ...cur, [id]: nv }));
  };
  const allowed = (id: string) => !challenge?.only || challenge.only.includes(id);

  // Dra. Lucía comenta lo importante, sin atosigar
  const say = useRef('');
  useEffect(() => {
    const top = d.findings[0];
    const key = `${d.headline}|${top?.id}`;
    const t = window.setTimeout(() => {
      if (key === say.current || used.length === 0) return;
      say.current = key;
      const mood: Mood = d.toxic || d.score < 40 ? 'sad' : d.score >= 90 ? 'happy' : 'busy';
      npc.speak(d.score >= 90 ? '¡Solución de campeonato! Pesa el pH otra vez antes de regar: la realidad manda.' : top ? `${top.title}. ${top.fix ?? ''}` : d.headline, mood);
    }, 700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.headline, d.findings[0]?.id, used.length]);
  npc.tips.current = () => [
    'Con agua dura, casi toda la EC ya viene del grifo: mide antes de añadir nada.',
    'El pH se mide DESPUÉS de mezclar los nutrientes, y se corrige al final.',
    'Cal-Mag y RO son inseparables: sin calcio ni magnesio la planta pasa hambre aunque la EC sea alta.',
    'Más no es mejor: una EC alta quema las puntas y bloquea otros elementos.',
    'Añade el ácido al agua, nunca el agua al ácido.',
  ];

  const autoPh = () => {
    const target = stage === 'flush' ? 6.3 : Number(((medium.ph[0] + medium.ph[1]) / 2).toFixed(2));
    const clean = { ...doses };
    for (const id of ['ph_down', 'acid_nitric', 'acid_sulfuric', 'ph_up']) clean[id] = 0;
    const c = phCorrection({ ...mix, doses: clean }, target, prefs.acid);
    if (c.ingredient) clean[c.ingredient] = c.dose;
    setDoses(clean); setPulse((p) => p + 1); setDropColor(c.ingredient ? INGREDIENTS[c.ingredient].color : undefined);
    npc.speak(c.ingredient ? `Listo: ${c.dose} ml/L de ${INGREDIENTS[c.ingredient].name.toLowerCase()} llevan el pH a ${target}. En la práctica ve poco a poco y vuelve a medir.` : 'El pH ya está en el punto. ¡Bien!', 'happy');
  };

  const loadTable = (idx: number) => {
    const st = brand.stages[idx]; if (!st) return;
    const sid = stageIdOfBrandStage(st.stageName);
    const ecMid = ((st.targetEc.match(/[\d.]+/g) ?? []).map(Number).reduce((a, x, _, arr) => a + x / arr.length, 0)) || 1.6;
    const sci = STAGE_BY_ID[sid];
    const ec = Math.min(sci.ec[1] * medium.ecMul * 0.97, Math.max(sci.ec[0] * medium.ecMul, ecMid));
    setDoses(dosesFromTable(st.dosageMlPerLiter, strengthForEc(st.dosageMlPerLiter, prefs.water, ec))); setStage(sid); setChallenge(null); setPulse((p) => p + 1);
  };

  const startChallenge = (c: Challenge) => {
    setChallenge(c); setStage(c.stage); setPrefs({ water: c.water, medium: c.medium }); setDoses({ ...(c.preset ?? {}) }); setPulse(0);
    npc.speak(`Reto: ${c.title}. ${c.brief}`, 'busy');
  };
  const claim = () => {
    if (!challenge || !goal?.ok || done) return;
    setPrefs((p) => ({ challengesDone: [...p.challengesDone, challenge.id] }));
    addXp(challenge.xp, `Reto: ${challenge.title}`);
    showNotification(`Reto superado: ${challenge.title} (+${challenge.xp} XP)`, 'success');
    npc.speak('¡Eso es ciencia de verdad! Anótalo: esta receta funciona en la vida real igual que aquí.', 'happy');
  };

  const saveRecipe = () => {
    if (used.length === 0) return;
    const name = recipeName.trim() || `Receta ${prefs.recipes.length + 1}`;
    setPrefs((p) => ({ recipes: [{ id: `r${Date.now()}`, name: name.slice(0, 28), water: p.water, medium: p.medium, stage, doses: { ...doses }, score: d.score, savedAt: Date.now() }, ...p.recipes].slice(0, 12) }));
    setRecipeName('');
  };
  const apply = (scope: 'one' | 'all') => {
    if (used.length === 0) { showNotification('Prepara una solución en el vaso primero', 'info'); return; }
    const e = feedEffect(sol, d);
    applyFertigation({ ...e, score: d.score, label: challenge ? challenge.title : 'Receta propia', scope, brandName: 'Receta propia' });
  };

  const group = (title: string, list: Ingredient[]) => (
    <div>
      <div className="nu-lbl">{title}</div>
      <div className="space-y-1.5 mt-1.5">{list.map((ing) => <Row key={ing.id} ing={ing} dose={doses[ing.id] ?? 0} disabled={!allowed(ing.id)} onChange={(v) => setDose(ing.id, v)} />)}</div>
    </div>
  );
  const brandIngs = BRAND_INGREDIENTS.filter((i) => i.brand === brand.id);
  const otherIngs = BRAND_INGREDIENTS.filter((i) => i.brand !== brand.id);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Estante */}
      <section className="hud-panel p-4 space-y-4 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto nu-scroll" aria-label="Estante de ingredientes">
        {challenge && <div className="nu-challenge"><Trophy className="w-4 h-4 text-amber-300 shrink-0" /><div className="min-w-0"><b>{challenge.title}</b><p>{challenge.brief}</p>{challenge.only && <p className="text-amber-200/80">Solo puedes usar sales puras y correctores.</p>}</div><button className="care-btn" onClick={() => { setChallenge(null); setDoses({}); }}>Salir</button></div>}
        {group(`Base de ${brand.name}`, brandIngs)}
        {group('Sales y suplementos', [...SALTS.filter((s) => s.kind === 'salt'), INGREDIENTS.calmag])}
        {group('Correctores de pH', [INGREDIENTS.ph_down, INGREDIENTS.acid_nitric, INGREDIENTS.acid_sulfuric, INGREDIENTS.ph_up])}
        <button className="nu-link" onClick={() => setOthers((v) => !v)}>{others ? 'Ocultar' : 'Mostrar'} productos de otras marcas ({otherIngs.length})</button>
        {others && group('Otras marcas', otherIngs)}
      </section>

      {/* Banco de trabajo */}
      <section className="hud-panel p-4 space-y-3" aria-label="Banco de trabajo">
        <div className="mk-panel px-2 pt-2"><Npc kind="scientist" text={npc.say.text} mood={npc.say.mood} moodKey={npc.say.key} /></div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="block"><span className="nu-lbl">Etapa objetivo</span>
            <select className="nu-select w-full" value={stage} onChange={(e) => setStage(e.target.value as StageId)} disabled={!!challenge}>{STAGES.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.weeks}</option>)}</select></label>
          <label className="block"><span className="nu-lbl">Cargar tabla de {brand.name.split(' ')[0]}</span>
            <select className="nu-select w-full" value="" onChange={(e) => e.target.value !== '' && loadTable(Number(e.target.value))} disabled={!!challenge}><option value="">Elegir etapa…</option>{brand.stages.map((s, i) => <option key={i} value={i}>{s.stageName}</option>)}</select></label>
          <label className="block"><span className="nu-lbl">Agua</span>
            <select className="nu-select w-full" value={prefs.water} onChange={(e) => setPrefs({ water: e.target.value as NutriPrefs['water'] })} disabled={!!challenge}>{WATERS.map((w) => <option key={w.id} value={w.id}>{w.emoji} {w.name}</option>)}</select></label>
          <label className="block"><span className="nu-lbl">Medio</span>
            <select className="nu-select w-full" value={prefs.medium} onChange={(e) => setPrefs({ medium: e.target.value as NutriPrefs['medium'] })} disabled={!!challenge}>{MEDIA.map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}</select></label>
        </div>

        <div className="nu-bench">
          <Beaker color={mixColor(doses, sol.ec)} ec={sol.ec} pulse={pulse} dropColor={dropColor} />
          <div className="space-y-2 min-w-0">
            <PhPen ph={sol.ph} range={medium.ph} />
            <EcMeter sol={sol} range={d.ecRange} state={d.ecState} unit={prefs.ecUnit} onUnit={(u) => setPrefs({ ecUnit: u })} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select className="nu-select" value={prefs.acid} onChange={(e) => setPrefs({ acid: e.target.value as AcidId })} aria-label="Ácido">{ACIDS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}</select>
          <button className="care-btn" onClick={autoPh}><BeakerIcon className="w-3.5 h-3.5" /> Ajustar pH</button>
          <button className="care-btn" onClick={() => setDoses({})}><Eraser className="w-3.5 h-3.5" /> Vaciar</button>
          <div className="flex gap-1 ml-auto">{[1, 5, 10, 20].map((l) => <button key={l} className={`nu-chip ${prefs.liters === l ? 'is-on' : ''}`} onClick={() => setPrefs({ liters: l })}>{l} L</button>)}</div>
        </div>

        <div className="nu-sheet" aria-label="Receta para el depósito">
          <div className="nu-lbl">Receta para {prefs.liters} L</div>
          {used.length === 0 ? <p className="text-[11px] text-neutral-500 py-1">El vaso solo tiene {WATERS.find((w) => w.id === prefs.water)?.name.toLowerCase()}. Añade ingredientes desde el estante.</p>
            : <ul>{used.map(([id, v]) => <li key={id}><span>{INGREDIENTS[id].name}</span><b>{(v * prefs.liters).toFixed(v * prefs.liters < 10 ? 2 : 1)} {INGREDIENTS[id].unit}</b></li>)}</ul>}
        </div>
      </section>

      {/* Resultados */}
      <section className="hud-panel p-4 space-y-4 xl:max-h-[calc(100vh-9rem)] xl:overflow-y-auto nu-scroll" aria-label="Resultados">
        <div className="flex items-center gap-4"><ScoreRing score={d.score} stars={d.stars} label={d.headline} /><div className="text-[11px] font-mono text-neutral-400 space-y-1">
          <div>Ca:Mg <b className="text-neutral-200">{d.ratios.caMg}:1</b></div><div>K / (Ca+Mg) <b className="text-neutral-200">{d.ratios.kToCaMg}</b></div><div>Alcalinidad <b className="text-neutral-200">{sol.alkMeq} mEq/L</b></div><div>ppm <b className="text-neutral-200">{sol.ppm500}</b> (500) · <b className="text-neutral-200">{sol.ppm700}</b> (700)</div></div></div>
        <div><div className="nu-lbl mb-1.5">Elementos · ideal {STAGE_BY_ID[stage].name.toLowerCase()} · ● absorbible</div><ElementBars sol={sol} d={d} /></div>
        <ul className="space-y-1.5">{d.findings.map((f) => (
          <li key={f.id} className={`nu-find nu-find--${f.level}`}><b>{f.title}</b><span>{f.detail}</span>{f.fix && <span className="nu-find__fix">→ {f.fix}</span>}
            {f.symptomId && <button className="nu-link" onClick={() => onOpenSymptom(f.symptomId!)}><BookOpen className="w-3 h-3" /> ver cómo se ve en la planta</button>}</li>))}</ul>

        {challenge && goal && (
          <div className={`nu-goal ${goal.ok ? 'is-ok' : ''}`}>
            {goal.ok ? <><CheckCircle2 className="w-4 h-4" /> ¡Objetivo cumplido! {done ? 'Ya cobraste este reto.' : <button className="care-btn care-btn--gold" onClick={claim}>Cobrar +{challenge.xp} XP</button>}</> : <>🎯 {goal.hint}</>}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button className="care-btn care-btn--gold" disabled={!activePlant || used.length === 0} onClick={() => apply('one')}><Leaf className="w-3.5 h-3.5" /> Aplicar a mi planta</button>
          <button className="care-btn" disabled={!activePlant || used.length === 0} onClick={() => apply('all')}>A toda la sala</button>
        </div>
        <p className="text-[10.5px] font-mono text-neutral-500">{activePlant ? `Gasta ${USE.nutrientPerPlant} ml de abono por planta (tienes ${Math.round(resources.nutrient)} ml). Una mala mezcla frena y daña a la planta.` : 'Siembra una planta para aplicar la solución.'}</p>

        <div>
          <div className="nu-lbl mb-1.5">Guardar receta</div>
          <div className="flex gap-2"><input className="nu-input flex-1" placeholder="Nombre (p. ej. Floración con agua dura)" value={recipeName} maxLength={28} onChange={(e) => setRecipeName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveRecipe()} /><button className="care-btn" disabled={used.length === 0} onClick={saveRecipe}><Save className="w-3.5 h-3.5" /></button></div>
          {prefs.recipes.length > 0 && <ul className="mt-2 space-y-1">{prefs.recipes.map((r) => (
            <li key={r.id} className="nu-recipe-saved"><button className="min-w-0 flex-1 text-left" onClick={() => { setChallenge(null); setPrefs({ water: r.water, medium: r.medium }); setStage(r.stage); setDoses(r.doses); setPulse((p) => p + 1); }}><b>{r.name}</b><small>{STAGE_BY_ID[r.stage].name} · {WATERS.find((w) => w.id === r.water)?.name} · {r.score}/100</small></button>
              <button className="nu-step" aria-label="Borrar" onClick={() => setPrefs((p) => ({ recipes: p.recipes.filter((x) => x.id !== r.id) }))}><Trash2 className="w-3 h-3" /></button></li>))}</ul>}
        </div>

        <div>
          <div className="nu-lbl mb-1.5">Retos de la Dra. Lucía · {prefs.challengesDone.length}/{CHALLENGES.length}</div>
          <ul className="space-y-1.5">{CHALLENGES.map((c) => { const ok = prefs.challengesDone.includes(c.id); return (
            <li key={c.id}><button className={`nu-chal ${challenge?.id === c.id ? 'is-on' : ''} ${ok ? 'is-done' : ''}`} onClick={() => startChallenge(c)}>
              <span>{ok ? '✔' : '🎯'}</span><span className="flex-1 text-left"><b>{c.title}</b><small>{STAGE_BY_ID[c.stage].name} · {MEDIUM_BY_ID[c.medium].name} · {WATERS.find((w) => w.id === c.water)?.name}</small></span><em>+{c.xp} XP</em></button></li>); })}</ul>
        </div>
      </section>
    </div>
  );
};
