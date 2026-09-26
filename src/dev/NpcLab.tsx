import React, { useEffect, useState } from 'react';
import { Npc, type Mood } from '../components/npc/Npc';

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
