import React, { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Sparkles } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { Npc, useNpc } from '../npc/Npc';
import { ELEMENTS, SYMPTOMS, SYMPTOM_BY_ID, type Symptom } from '../../sim/nutrition';
import { LeafArt } from './art';
import type { NutriPrefs } from './prefs';
import { t, t as tr, k, localize } from '../../i18n';

const WHERE = localize({ old: k('Hojas viejas (de abajo)'), new: k('Hojas nuevas (de arriba)'), all: k('Toda la planta') } as const, ['old', 'new', 'all']);
const KIND = localize({ deficiency: k('Carencia'), excess: k('Exceso'), lockout: k('Bloqueo'), burn: k('Quemadura') } as const, ['deficiency', 'excess', 'lockout', 'burn']);
const colorOf = (s: Symptom) => (s.element && s.element !== 'pH' && s.element !== 'EC' ? ELEMENTS[s.element].color : s.element === 'pH' ? '#60a5fa' : '#f87171');

const GLOSSARY: { t: string; d: string }[] = localize([
  { t: k('EC, ppm y TDS'), d: k('La EC (mS/cm) mide cuántas sales hay disueltas. Los ppm son la misma medida con un factor: ×500 o ×700 según el aparato. Compara siempre con la misma escala: 1,0 mS = 500 ppm (escala 500) = 700 ppm (escala 700).') },
  { t: k('pH y alcalinidad'), d: k('El pH no lo decide el agua sola: lo decide su alcalinidad (bicarbonatos). Un agua dura necesita más ácido y, si te pasas, el pH se desploma. El agua de ósmosis casi no tiene colchón: cualquier gota lo mueve.') },
  { t: k('Bloqueo de nutrientes'), d: k('Con el pH fuera de rango, la raíz no puede tomar algunos elementos aunque estén en la solución: pH alto bloquea hierro y fósforo; pH bajo, calcio y magnesio. Por eso primero se corrige el pH y luego se ajusta la EC.') },
  { t: k('Nutrientes móviles e inmóviles'), d: k('N, P, K y Mg son móviles: la planta los mueve a lo nuevo, y la carencia se ve en hojas VIEJAS. Ca, S y Fe son inmóviles: la carencia se ve en hojas NUEVAS.') },
  { t: k('Calcio y magnesio'), d: k('Con agua de ósmosis o con coco casi siempre falta Ca-Mg. Mantén una relación Ca:Mg entre 2 y 4 a 1. El exceso de potasio también los bloquea.') },
  { t: k('Quelatos'), d: k('Un quelato es una “jaula” que mantiene un metal (hierro) soluble. EDTA aguanta hasta pH ≈ 6,5; EDDHA hasta pH ≈ 9: útil con agua alcalina.') },
  { t: k('Orgánico vs. mineral'), d: k('Los orgánicos alimentan al suelo vivo y liberan lento; los minerales entran directo a la raíz. Con orgánicos la EC engaña: mide poco porque muchos nutrientes no están todavía disueltos.') },
  { t: k('Lavado (flush)'), d: k('Los últimos 7–10 días solo agua limpia (y a veces un quelante) para arrastrar sales acumuladas. Mejora sabor y ceniza; no sustituye una buena nutrición durante todo el ciclo.') },
], ['t', 'd']);

export const GuideTab: React.FC<{ prefs: NutriPrefs; setPrefs: (p: Partial<NutriPrefs> | ((p: NutriPrefs) => Partial<NutriPrefs>)) => void; focus: { id: string; key: number } | null }> = ({ prefs, setPrefs, focus }) => {
  const { addXp, showNotification } = useGame();
  const [sel, setSel] = useState<string>(SYMPTOMS[0].id);
  const [mode, setMode] = useState<'explore' | 'quiz'>('explore');
  const s = SYMPTOM_BY_ID[sel];
  const npc = useNpc(tr('Observa la hoja: DÓNDE aparece el síntoma (vieja o nueva) casi siempre delata al culpable.'));
  useEffect(() => { if (focus && SYMPTOM_BY_ID[focus.id]) { setSel(focus.id); setMode('explore'); } }, [focus]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button className={`nu-chip ${mode === 'explore' ? 'is-on' : ''}`} onClick={() => setMode('explore')}>{t('📖 Guía de síntomas')}</button>
        <button className={`nu-chip ${mode === 'quiz' ? 'is-on' : ''}`} onClick={() => setMode('quiz')}>{t('🎯 ¿Qué le pasa a esta planta?')}</button>
      </div>

      {mode === 'explore' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
          <div className="hud-panel p-3 space-y-1.5 lg:max-h-[34rem] lg:overflow-y-auto nu-scroll" role="listbox" aria-label={tr('Síntomas')}>
            {SYMPTOMS.map((x) => (
              <button key={x.id} role="option" aria-selected={sel === x.id} onClick={() => setSel(x.id)} className={`nu-sym ${sel === x.id ? 'is-on' : ''}`} style={{ ['--c' as string]: colorOf(x) }}>
                <i /><span><b>{tr(x.title)}</b><small>{KIND[x.kind]} · {WHERE[x.where]}</small></span>
              </button>
            ))}
          </div>
          <section className="hud-panel p-4 sm:p-5 grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] items-start" key={s.id}>
            <div className="nu-leafstage"><LeafArt spec={s.leaf} size={250} id={`g-${s.id}`} /><span className="nu-leafstage__tag" style={{ ['--c' as string]: colorOf(s) }}>{WHERE[s.where]}</span></div>
            <div className="space-y-2.5 text-sm min-w-0">
              <h3 className="font-serif text-xl font-bold text-white">{tr(s.title)}</h3>
              <Fact k={tr('Cómo se ve')} v={s.look} /><Fact k={tr('Por qué pasa')} v={s.cause} /><Fact k={tr('Cómo confirmarlo')} v={s.confirm} /><Fact k={tr('Cómo se arregla')} v={s.fix} good />
            </div>
          </section>
        </div>
      ) : (
        <Quiz prefs={prefs} setPrefs={setPrefs} onXp={(n, why) => { addXp(n, why); showNotification(`${why} (+${n} XP)`, 'success'); }} npcSpeak={npc.speak} npc={npc} />
      )}

      <section className="hud-panel p-4 sm:p-5">
        <h4 className="font-serif font-bold text-white flex items-center gap-2 mb-2"><GraduationCap className="w-4 h-4 text-emerald-300" />{' '}{t('Aula del grower')}</h4>
        <div className="grid gap-2 md:grid-cols-2">{GLOSSARY.map((g) => <details key={g.t} className="nu-gloss"><summary>{g.t}</summary><p>{g.d}</p></details>)}</div>
      </section>
    </div>
  );
};

const Fact: React.FC<{ k: string; v: string; good?: boolean }> = ({ k, v, good }) => (
  <div className={`nu-fact ${good ? 'is-good' : ''}`}><span>{k}</span><p>{v}</p></div>
);

const shuffle = <T,>(a: T[], seed: number): T[] => { const r = [...a]; let x = seed; for (let i = r.length - 1; i > 0; i--) { x = (x * 1664525 + 1013904223) % 4294967296; const j = x % (i + 1); [r[i], r[j]] = [r[j], r[i]]; } return r; };

const Quiz: React.FC<{ prefs: NutriPrefs; setPrefs: (p: Partial<NutriPrefs> | ((p: NutriPrefs) => Partial<NutriPrefs>)) => void; onXp: (n: number, why: string) => void; npcSpeak: (t: string, m?: 'idle' | 'happy' | 'sad' | 'busy') => void; npc: ReturnType<typeof useNpc> }> = ({ prefs, setPrefs, onXp, npcSpeak, npc }) => {
  const [round, setRound] = useState(0);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const ROUNDS = 8;
  const order = useMemo(() => shuffle(SYMPTOMS.map((x) => x.id), seed).slice(0, ROUNDS), [seed]);
  const cur = SYMPTOM_BY_ID[order[Math.min(round, ROUNDS - 1)]];
  const options = useMemo(() => shuffle([cur.id, ...shuffle(SYMPTOMS.filter((x) => x.id !== cur.id).map((x) => x.id), seed + round).slice(0, 3)], seed * 7 + round), [cur.id, seed, round]);
  const finished = round >= ROUNDS;

  const answer = (id: string) => {
    if (picked) return;
    setPicked(id);
    if (id === cur.id) {
      setScore((v) => v + 1);
      if (!prefs.quizDone.includes(cur.id)) { setPrefs((p) => ({ quizDone: [...p.quizDone, cur.id] })); onXp(12, tr('Diagnóstico acertado: {title}', { title: cur.title })); }
      npcSpeak(tr('¡Correcto! {look}', { look: cur.look }), 'happy');
    } else npcSpeak(tr('Casi. Era «{title}»: {confirm}', { title: cur.title, confirm: cur.confirm }), 'sad');
  };
  const next = () => { setPicked(null); if (round + 1 >= ROUNDS) { setPrefs((p) => ({ quizBest: Math.max(p.quizBest, score) })); } setRound((r) => r + 1); };
  const again = () => { setSeed(Math.floor(Math.random() * 1e6)); setRound(0); setScore(0); setPicked(null); };

  if (finished) return (
    <section className="hud-panel p-6 text-center space-y-3">
      <Sparkles className="w-8 h-8 text-amber-300 mx-auto" />
      <h3 className="font-serif text-xl font-bold text-white">{score >= 7 ? tr('¡Ojo clínico de grower experto!') : score >= 4 ? tr('Buen diagnóstico') : tr('A repasar la guía')}</h3>
      <p className="text-neutral-300">{t('Aciertos:')}{' '}<b className="text-emerald-300">{score}/{ROUNDS}</b>{' '}{t('· Mejor marca:')}{' '}<b className="text-amber-300">{Math.max(prefs.quizBest, score)}/{ROUNDS}</b></p>
      <p className="text-[11px] text-neutral-500">{t('Cada síntoma que aciertas por primera vez da XP. Llevas {length}/{v1}.', { length: prefs.quizDone.length, v1: SYMPTOMS.length })}</p>
      <button className="care-btn care-btn--gold" onClick={again}>{t('Otra ronda')}</button>
    </section>
  );
  return (
    <section className="hud-panel p-4 sm:p-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-center">
      <div className="space-y-2">
        <div className="text-[11px] font-mono text-neutral-400 flex justify-between"><span>{t('Pregunta {v0}/{ROUNDS}', { v0: round + 1, ROUNDS })}</span><span>{t('Aciertos {score}', { score })}</span></div>
        <div className="nu-leafstage"><LeafArt spec={cur.leaf} size={250} id={`q-${cur.id}`} /><span className="nu-leafstage__tag" style={{ ['--c' as string]: '#94a3b8' }}>{picked ? WHERE[cur.where] : tr('Observa la hoja')}</span></div>
        <div className="mk-panel px-2 pt-2"><Npc kind="scientist" text={tr(npc.say.text)} mood={npc.say.mood} moodKey={npc.say.key} /></div>
      </div>
      <div className="space-y-2">
        <h3 className="font-serif text-lg font-bold text-white">{t('¿Qué le pasa a esta planta?')}</h3>
        {options.map((id) => {
          const o = SYMPTOM_BY_ID[id];
          const state = !picked ? '' : id === cur.id ? 'is-right' : id === picked ? 'is-wrong' : 'is-dim';
          return <button key={id} className={`nu-answer ${state}`} onClick={() => answer(id)} disabled={!!picked}>{tr(o.title)}</button>;
        })}
        {picked && <div className="pt-1 space-y-1.5"><Fact k={tr('Cómo se arregla')} v={cur.fix} good /><button className="care-btn care-btn--gold" onClick={next}>{round + 1 >= ROUNDS ? tr('Ver resultado') : tr('Siguiente')}</button></div>}
      </div>
    </section>
  );
};
