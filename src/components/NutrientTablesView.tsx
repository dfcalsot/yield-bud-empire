import React, { useState } from 'react';
import { AlertTriangle, BookOpen, FlaskConical, Table2 } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { Npc, useNpc } from './npc/Npc';
import { NpcMissions } from './missions/NpcMissions';
import { phGrowthFactor, STAGE_BY_ID, stageOfProgress, type StageId } from '../sim/nutrition';
import { BALANCE } from '../sim/balance';
import { useNutriPrefs } from './nutrition/prefs';
import { TablesTab } from './nutrition/TablesTab';
import { LabTab } from './nutrition/LabTab';
import { GuideTab } from './nutrition/GuideTab';

type Tab = 'tables' | 'lab' | 'guide';

/** Centro de Nutrición: tablas dinámicas por marca, laboratorio de mezclas y guía de diagnóstico, con la ciencia real de un cultivo. */
export const NutrientTablesView: React.FC = () => {
  const { currentUser, activePlant } = useGame();
  const [prefs, setPrefs] = useNutriPrefs(currentUser?.id);
  const [tab, setTab] = useState<Tab>('tables');
  const [seed, setSeed] = useState<{ doses: Record<string, number>; stage: StageId; key: number } | null>(null);
  const [focus, setFocus] = useState<{ id: string; key: number } | null>(null);
  const npc = useNpc('Soy la Dra. Lucía. Aquí aprendes lo que un grower de verdad domina: EC, pH, agua y qué le falta a cada hoja.');

  const stage = activePlant ? stageOfProgress(activePlant.progressPercent) : null;
  const ph = activePlant?.phLevel ?? 6.2;
  const ec = activePlant?.ecLevel ?? 0;
  const burn = ec > BALANCE.ecBurn;
  const locked = activePlant ? phGrowthFactor(ph) < 1 : false;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'tables', label: 'Tablas dinámicas', icon: <Table2 className="w-4 h-4" /> },
    { id: 'lab', label: 'Laboratorio de mezclas', icon: <FlaskConical className="w-4 h-4" /> },
    { id: 'guide', label: 'Diagnóstico y aula', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <section className="hud-panel nu-hero p-4 sm:p-6">
        <div className="nu-molecules" aria-hidden>{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${i * 0.7}s`, ['--s' as string]: 6 + (i % 4) * 3 }} />)}</div>
        <div className="relative grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] items-center">
          <div className="space-y-2 min-w-0">
            <span className="nu-pill" style={{ color: '#6ee7b7', borderColor: '#34d399' }}>Nutrición científica · EC · pH · N-P-K</span>
            <h1 className="font-serif text-2xl sm:text-3xl font-black text-white tracking-tight">Centro de Nutrición</h1>
            <p className="text-sm text-neutral-300 leading-relaxed max-w-2xl">Mezcla como un grower de verdad: tu agua manda en el pH, los nutrientes se bloquean o compiten entre sí y cada etapa pide una receta distinta. Lo que aprendes aquí funciona igual en un cultivo real.</p>
            <div className="mk-panel px-2 pt-2 max-w-xl"><Npc kind="scientist" text={npc.say.text} mood={npc.say.mood} moodKey={npc.say.key} /></div>
          </div>
          <div className="nu-plantcard" aria-label="Estado de la planta">
            <div className="nu-lbl">Planta seleccionada</div>
            {activePlant ? (<>
              <b className="font-serif text-white leading-tight">{activePlant.strain.name}</b>
              <div className="text-[11px] font-mono text-emerald-300">{stage ? STAGE_BY_ID[stage as StageId].name : ''} · {Math.round(activePlant.progressPercent)}%</div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono mt-2">
                <div className="mk-panel p-1.5"><div className="text-neutral-500">EC</div><b className={burn ? 'text-red-300' : 'text-cyan-300'}>{ec}</b></div>
                <div className="mk-panel p-1.5"><div className="text-neutral-500">pH</div><b className={locked ? 'text-red-300' : 'text-emerald-300'}>{ph}</b></div>
                <div className="mk-panel p-1.5"><div className="text-neutral-500">Salud</div><b className="text-amber-200">{Math.round(activePlant.health)}%</b></div>
              </div>
              {(burn || locked) && <p className="nu-warn"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {burn ? 'EC demasiado alta: las raíces se queman. Riega con agua limpia para diluir.' : 'pH fuera de rango: la raíz bloquea nutrientes y crece más lento. Corrígelo con la próxima solución.'}</p>}
            </>) : <p className="text-xs text-neutral-400 italic">Siembra una semilla para aplicar tus soluciones a una planta real.</p>}
          </div>
        </div>
      </section>

      <NpcMissions npc="scientist" onSay={npc.speak} />

      <div className="nu-tabs" role="tablist">
        {tabs.map((t) => <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>{t.icon}<span>{t.label}</span></button>)}
      </div>

      <div className={tab === 'tables' ? '' : 'hidden'}><TablesTab prefs={prefs} setPrefs={setPrefs} onSendToLab={(doses, st) => { setSeed({ doses, stage: st, key: Date.now() }); setTab('lab'); }} /></div>
      <div className={tab === 'lab' ? '' : 'hidden'}><LabTab prefs={prefs} setPrefs={setPrefs} seed={seed} onOpenSymptom={(id) => { setFocus({ id, key: Date.now() }); setTab('guide'); }} /></div>
      <div className={tab === 'guide' ? '' : 'hidden'}><GuideTab prefs={prefs} setPrefs={setPrefs} focus={focus} /></div>
    </div>
  );
};
