import React, { useEffect, useState } from 'react';
import { Compass, Sprout, Sparkles } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { NpcV2 } from '../npc/rig/NpcV2';

/** First-time welcome: what the game is, how to move, and what to do first. Skippable; the guide can be replayed from the profile. */
export const WelcomeSheet: React.FC = () => {
  const { tutorial, startTutorial, patchTutorial, isAuthenticated } = useGame();
  const [ready, setReady] = useState(false);
  useEffect(() => { const t = window.setTimeout(() => setReady(true), 1400); return () => window.clearTimeout(t); }, []);
  if (!ready || !isAuthenticated || tutorial.started || tutorial.dismissed) return null;

  const cards = [
    { icon: <Sprout className="w-5 h-5" />, title: 'Cultiva y crece', text: 'Cuida tu planta en tiempo real: riega, abona y cosecha. Lo que cosechas se procesa, se vende y se reinvierte.' },
    { icon: <Compass className="w-5 h-5" />, title: 'Cómo moverte', text: 'El dock de abajo tiene las zonas y cada zona tiene pestañas. Teclas: I abre tu maletín.' },
    { icon: <Sparkles className="w-5 h-5" />, title: 'Tu primer objetivo', text: 'Yo te guío paso a paso. Cada paso da una recompensa pequeña y puedes saltarte los que quieras.' },
  ];
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Bienvenida">
      <div className="absolute inset-0 bg-black/70 animate-fade-in" />
      {/* alto máximo = pantalla: en celulares (o con letra grande) el contenido hace scroll y los botones quedan siempre a la vista */}
      <div className="hud-panel relative w-full max-w-2xl max-h-[calc(100dvh-2rem)] flex flex-col animate-fade-in">
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-2 sm:pb-2">
          <div className="flex items-end gap-1">
            <NpcV2 kind="chrono" text="¡Bienvenido a Yield Bud Empire! Soy Chrono y te enseño lo básico en un minuto." mood="wave" moodKey={1} />
          </div>
          <div className="mt-4 grid gap-2 sm:gap-3 sm:grid-cols-3">
            {cards.map((c) => (
              <div key={c.title} className="rounded-xl border border-white/10 bg-black/25 p-3 flex gap-3 sm:block">
                <div className="shrink-0 grid place-items-center w-9 h-9 rounded-lg bg-emerald-400/15 text-emerald-300 sm:mb-2">{c.icon}</div>
                <div>
                  <div className="text-sm font-bold text-white">{c.title}</div>
                  <p className="mt-1 text-[12px] leading-snug text-neutral-300">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0 border-t border-white/10 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-end gap-3">
          <button onClick={() => patchTutorial({ dismissed: true })} className="text-xs text-neutral-400 hover:text-white underline underline-offset-2 cursor-pointer py-2">Ya sé jugar, gracias</button>
          <button onClick={startTutorial} className="mk-buy !w-auto !px-6 !text-[12px]"><span className="mk-buy-shine" /><span>¡Empezar la guía!</span></button>
        </div>
      </div>
    </div>
  );
};
