import React, { useEffect, useState } from 'react';
import { Npc, type Mood } from '../components/npc/Npc';
import { sceneArt3d } from '../components/npc/art3d';

/** Dev only (`/#npclab`): the 3D characters in their panels, with their expressions, without signing in. */
const MOODS: Mood[] = ['idle', 'happy', 'think'];
const LINES = ['¡Hola! Bienvenido al laboratorio. Aquí mezclamos nutrientes con precisión científica.', 'Mide la EC y el pH antes de regar: las raíces lo agradecen.'];

export const NpcLab: React.FC = () => {
  const [n, setN] = useState(0);
  useEffect(() => { const i = window.setInterval(() => setN((x) => x + 1), 4500); return () => window.clearInterval(i); }, []);
  const mood = MOODS[n % MOODS.length];
  const text = `${LINES[n % LINES.length]} (${mood})`;
  return (
    <div className="min-h-screen p-6 space-y-6" style={{ background: '#0a0716' }}>
      <h1 className="text-white font-mono text-sm">NPC lab · ánimo: {mood}</h1>
      {/* the Mixing lab hero, same markup as NutrientTablesView */}
      <section className="hud-panel nu-hero p-4 sm:p-6 nu-hero--lab">
        <div className="nu-hero-scene" style={{ backgroundImage: `url(${sceneArt3d('mezclas')})` }} aria-hidden />
        <div className="relative grid gap-4 items-center lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)_minmax(0,1fr)] lg:items-end">
          <div className="space-y-2 min-w-0">
            <span className="nu-pill" style={{ color: '#6ee7b7', borderColor: '#34d399' }}>Nutrición científica · EC · pH · N-P-K</span>
            <h1 className="font-serif text-2xl sm:text-3xl font-black text-white tracking-tight">Centro de Nutrición</h1>
            <p className="text-sm text-neutral-300 leading-relaxed max-w-2xl">Mezcla como un grower de verdad: tu agua manda en el pH, los nutrientes se bloquean o compiten entre sí.</p>
          </div>
          <div className="nu-hero-npc"><Npc kind="scientist" noScene center full text={text} mood={mood} moodKey={n} /></div>
          <div className="nu-plantcard"><div className="nu-lbl">Planta seleccionada</div><b className="font-serif text-white">Gelato Auto</b><div className="text-[11px] font-mono text-emerald-300">Vegetativo · 42%</div></div>
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="mk-panel px-2 pt-2 max-w-xl"><Npc kind="scientist" scene="mezclas" center text={text} mood={mood} moodKey={n} /></div>
        <div className="mk-panel px-2 pt-2 max-w-xl"><Npc kind="scientist" scene="tablas" text={text} mood={mood} moodKey={n} /></div>
        <div className="mk-panel px-2 pt-2 max-w-xl"><Npc kind="merchant" variant="floro" text={text} mood={mood} moodKey={n} /></div>
        <div className="mk-panel px-2 pt-2 max-w-xl"><Npc kind="farmer" text={text} mood={mood} moodKey={n} /></div>
        <div className="mk-panel px-2 pt-2 max-w-xl"><Npc kind="geneticist" text={text} mood={mood} moodKey={n} /></div>
      </div>
    </div>
  );
};
