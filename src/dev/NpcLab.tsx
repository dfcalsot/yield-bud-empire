import React, { useEffect, useState } from 'react';
import { Npc, type Mood } from '../components/npc/Npc';
import { sceneArt3d } from '../components/npc/art3d';
import { BadgeNumber, FounderCertificate, Perk, PlateText } from '../components/founder/FounderView';

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
      {/* the Dynamic tables hero, same markup as NutrientTablesView */}
      <section className="hud-panel nu-hero p-4 sm:p-6 nu-hero--lab">
        <div className="nu-hero-scene" style={{ backgroundImage: `url(${sceneArt3d('tablas')})` }} aria-hidden />
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
      {/* the Mixing lab hero, same markup as NutrientTablesView */}
      <section className="hud-panel nu-hero p-4 sm:p-6 nu-hero--lab">
        <div className="nu-hero-scene" style={{ backgroundImage: `url(${sceneArt3d('mezclas')})` }} aria-hidden />
        <div className="relative grid gap-4 items-center lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)_minmax(0,1fr)] lg:items-end">
          <div className="space-y-2 min-w-0">
            <span className="nu-pill" style={{ color: '#6ee7b7', borderColor: '#34d399' }}>Nutrición científica · EC · pH · N-P-K</span>
            <h1 className="font-serif text-2xl sm:text-3xl font-black text-white tracking-tight">Centro de Nutrición</h1>
            <p className="text-sm text-neutral-300 leading-relaxed max-w-2xl">Mezcla como un grower de verdad: tu agua manda en el pH, los nutrientes se bloquean o compiten entre sí.</p>
          </div>
          <div className="nu-hero-npc"><Npc kind="scientist" art="scientist-lab" noScene center full text={text} mood={mood} moodKey={n} /></div>
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

/** Dev only (`/#founderlab`): the Founder Pack pieces with made-up data */
export const FounderLab: React.FC = () => (
  <div className="min-h-screen p-6 space-y-6" style={{ background: '#0a0716' }}>
    <FounderCertificate number={7} name="GrowerMaster" />
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 max-w-4xl">
      <Perk img="/founder/badge.webp" title="Insignia «Fundador #N»" text="Junto a tu nombre en el perfil y en el mercado."><BadgeNumber number={7} /></Perk>
      <Perk img="/founder/medallion.webp" title="Avatar «Fundador del Imperio»" text="Exclusivo y ligado a tu cuenta." />
      <Perk img="/founder/perk-arquitecto.webp" title="Título «Arquitecto del Imperio»" text="Un título para mostrar."><PlateText top={74.3} width={56} lines={[{ text: 'Arquitecto del Imperio', tone: 'gold', size: 7.2 }]} /></Perk>
      <Perk img="/founder/perk-maestro.webp" title="Título «Maestro del Cultivo»" text="O este otro."><PlateText top={78.2} width={50} lines={[{ text: 'Maestro del Cultivo', tone: 'green', size: 7.6 }]} /></Perk>
      <Perk img="/founder/perk-acceso.webp" ratio="4250 / 2750" title="Acceso anticipado" text="Pruebas las funciones nuevas antes que nadie."><PlateText top={80.9} width={74} lines={[{ text: 'Recompensa:', tone: 'gold', size: 3.4 }, { text: 'Acceso anticipado', tone: 'green', size: 5 }]} /></Perk>
      <Perk img="/founder/perk-creditos.webp" title="Tu nombre en los créditos" text="En el juego y en el sitio." />
    </div>
  </div>
);
