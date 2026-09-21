import React from 'react';
import { YieldLockup, YieldLogo, YieldMark } from '../components/brand/YieldLogo';

/**
 * Logo lab (open with #logo): the animated seal, its one-colour versions for printing, and T-shirt / cap mock-ups.
 * The downloadable files live in /brand (SVG with outlined lettering + transparent PNG).
 */

const TEE = 'M120 22 L22 74 L58 146 L102 122 L102 382 Q102 402 122 402 L278 402 Q298 402 298 382 L298 122 L342 146 L378 74 L280 22 Q262 62 200 62 Q138 62 120 22Z';

const Tee: React.FC<{ color: string; shade: string; children: React.ReactNode; label: string; note: string }> = ({ color, shade, children, label, note }) => (
  <figure className="space-y-2">
    <svg viewBox="0 0 400 430" className="w-full h-auto drop-shadow-[0_18px_30px_rgba(0,0,0,.55)]" role="img" aria-label={`Camiseta ${label}`}>
      <path d={TEE} fill={color} />
      <path d="M200 62 Q262 62 280 22 L120 22 Q138 62 200 62Z" fill={shade} opacity=".55" />
      <path d="M120 22 Q138 62 200 62 Q262 62 280 22" fill="none" stroke={shade} strokeWidth="7" opacity=".8" />
      <path d="M102 122 Q140 150 102 232 M298 122 Q260 150 298 232" fill="none" stroke={shade} strokeWidth="3" opacity=".45" />
      <path d="M58 146 L102 122 M342 146 L298 122" stroke={shade} strokeWidth="3" opacity=".5" />
      <path d="M102 382 Q102 402 122 402 L278 402 Q298 402 298 382" fill="none" stroke={shade} strokeWidth="4" opacity=".5" />
      <g transform="translate(112 96)">{children}</g>
    </svg>
    <figcaption className="text-center text-xs text-neutral-400"><b className="text-neutral-200">{label}</b> · {note}</figcaption>
  </figure>
);

const Tile: React.FC<{ bg: string; label: string; children: React.ReactNode; file?: string }> = ({ bg, label, children, file }) => (
  <div className="rounded-2xl border border-white/10 overflow-hidden">
    <div className="grid place-items-center p-6" style={{ background: bg }}>{children}</div>
    <div className="flex items-center justify-between gap-2 px-3 py-2 bg-black/40 text-xs">
      <span className="text-neutral-300">{label}</span>
      {file && <span className="flex gap-2 font-mono"><a className="text-lime-300 hover:underline" href={`/brand/${file}.svg`} download>SVG</a><a className="text-lime-300 hover:underline" href={`/brand/${file}.png`} download>PNG</a></span>}
    </div>
  </div>
);

export const LogoLab: React.FC = () => (
  <div className="min-h-screen text-neutral-100 p-4 sm:p-8 space-y-10" style={{ background: 'radial-gradient(900px 500px at 15% -10%, rgba(167,139,250,.25), transparent 60%), radial-gradient(800px 500px at 100% 10%, rgba(184,243,90,.10), transparent 60%), #0a0716' }}>
    <header className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] items-center">
      <div className="space-y-4">
        <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-lime-300">Identidad · v1</p>
        <h1 className="font-serif text-4xl sm:text-5xl font-black leading-[1.05]">Yield Bud <span className="text-lime-300">Empire</span></h1>
        <p className="text-neutral-300 max-w-xl leading-relaxed">Una hoja de cannabis coronada que crece de una pila de monedas, sobre rayos de imperio, dentro de un sello. <b>Hoja</b> = el cultivo, <b>monedas</b> = el rendimiento (yield), <b>corona y rayos</b> = el imperio. Es un sello, así que funciona igual de bien en el juego, en una camiseta, en un parche o en una gorra.</p>
        <ul className="text-sm text-neutral-400 space-y-1 list-disc pl-5">
          <li>Animado en el juego: los rayos giran, la hoja respira, la corona brilla, salen chispas de tricomas y una luz recorre el aro.</li>
          <li>Todo es vector con las letras convertidas a trazados: no depende de ninguna fuente y se estampa nítido.</li>
          <li>Versión de <b>una sola tinta</b> para serigrafía y bordado (con huecos reales, sin degradados).</li>
        </ul>
      </div>
      <div className="justify-self-center"><YieldLogo animated size={380} /></div>
    </header>

    <section className="max-w-6xl mx-auto space-y-3">
      <h2 className="text-xl font-black">Versiones</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile bg="#0a0716" label="Color · sobre oscuro" file="yield-bud-empire-seal-color"><YieldLogo size={200} /></Tile>
        <Tile bg="#f1effb" label="Color · sobre claro" file="yield-bud-empire-seal-color"><YieldLogo size={200} /></Tile>
        <Tile bg="#111111" label="Una tinta · blanco" file="yield-bud-empire-seal-white"><YieldLogo size={200} mono ink="#ffffff" /></Tile>
        <Tile bg="#f5f3ea" label="Una tinta · negro" file="yield-bud-empire-seal-black"><YieldLogo size={200} mono ink="#111111" /></Tile>
        <Tile bg="#b8f35a" label="Una tinta · índigo sobre lima" file="yield-bud-empire-seal-indigo"><YieldLogo size={200} mono ink="#1b1636" /></Tile>
        <Tile bg="#0a0716" label="Emblema solo (iconos, avatar)" file="yield-bud-empire-mark-color"><YieldMark size={170} /></Tile>
        <Tile bg="#0a0716" label="Rótulo apilado" file="yield-bud-empire-lockup-color"><YieldLockup width={210} /></Tile>
        <Tile bg="#111111" label="Rótulo · una tinta blanca" file="yield-bud-empire-lockup-white"><YieldLockup width={210} mono ink="#ffffff" /></Tile>
      </div>
    </section>

    <section className="max-w-6xl mx-auto space-y-3">
      <h2 id="tees" className="text-xl font-black">En una camiseta</h2>
      <p className="text-sm text-neutral-400">Estampado al pecho a todo color y en una tinta. Los colores de la tela son ejemplos.</p>
      <div id="tee-grid" className="space-y-5"><div className="grid gap-5 grid-cols-2 lg:grid-cols-4">
        <Tee color="#141414" shade="#000" label="Negra" note="sello a color"><YieldLogo size={176} /></Tee>
        <Tee color="#241a5a" shade="#0f0a2e" label="Índigo" note="sello a color"><YieldLogo size={176} /></Tee>
        <Tee color="#efece0" shade="#b9b5a3" label="Hueso" note="sello a color"><YieldLogo size={176} /></Tee>
        <Tee color="#b8f35a" shade="#7fa82a" label="Lima" note="una tinta índigo"><YieldLogo size={176} mono ink="#1b1636" /></Tee>
      </div>
      <div className="grid gap-5 grid-cols-2 lg:grid-cols-4 pt-2">
        <Tee color="#141414" shade="#000" label="Negra · rótulo" note="estampado grande"><g transform="translate(0 40)"><YieldLockup width={176} /></g></Tee>
        <Tee color="#efece0" shade="#b9b5a3" label="Hueso · una tinta" note="serigrafía negra"><YieldLogo size={176} mono ink="#141414" /></Tee>
        <Tee color="#2a2250" shade="#130f26" label="Violeta · una tinta" note="tinta lima"><YieldLogo size={176} mono ink="#b8f35a" /></Tee>
        <Tee color="#f3d34a" shade="#c19d18" label="Dorada" note="una tinta negra"><YieldLogo size={176} mono ink="#141414" /></Tee>
      </div></div>
    </section>

    <section className="max-w-6xl mx-auto space-y-3 pb-10">
      <h2 className="text-xl font-black">Dentro del juego</h2>
      <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-white/10 bg-black/30 p-5">
        <div className="flex items-center gap-3"><YieldMark size={52} animated /><div><div className="font-serif text-xl font-black tracking-wide">YIELD BUD <span className="text-lime-300">EMPIRE</span></div><div className="text-[11px] text-neutral-400">Multiverso Botánico Descentralizado</div></div></div>
        <div className="flex items-center gap-3">{[64, 40, 28, 20].map((s) => <YieldMark key={s} size={s} />)}<span className="text-xs text-neutral-500">tamaños pequeños (icono, pestaña, avatar)</span></div>
      </div>
    </section>
  </div>
);

/** #logo-stage: just the animated seal on the brand background (used to record the animated clip). */
export const LogoStage: React.FC = () => (
  <div className="min-h-screen grid place-items-center" style={{ background: 'radial-gradient(700px 500px at 50% 40%, rgba(167,139,250,.28), transparent 65%), radial-gradient(600px 400px at 50% 100%, rgba(184,243,90,.12), transparent 60%), #0a0716' }}>
    <YieldLogo animated size={820} />
  </div>
);
