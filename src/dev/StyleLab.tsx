import React, { useState } from 'react';
import { AlertTriangle, Check, Coins, Crown, Droplets, FlaskConical, Flame, Scissors, Sprout, Zap } from 'lucide-react';
import { CannabisPlant } from '../components/CannabisPlant';
import { NpcV2, type NpcKindV2 } from '../components/npc/rig/NpcV2';
import type { Mood2 } from '../components/npc/rig/parts';

/**
 * Style lab (open with #stylelab): three colour directions applied to the same mock of the Cultivo screen, a contrast
 * meter, and the new NPC rig next to the current one. Nothing here touches the game; it exists so the direction is
 * chosen by eye before the tokens are applied to the real UI.
 */

interface Zone { id: string; label: string; color: string }
interface Palette { id: 'A' | 'B' | 'C'; name: string; tag: string; blurb: string; v: Record<string, string>; zones: Zone[] }

const PALETTES: Palette[] = [
  {
    id: 'A', name: 'Bosque Neón', tag: 'La segura', blurb: 'El verde-negro de hoy, refinado: mismo carácter, pero cada zona del juego gana su propio color de acento y el texto apagado sube de contraste.',
    v: { '--bg': '#030907', '--s1': '#0a1a15', '--s2': '#10261e', '--s3': '#163227', '--line': '#1f4a3a', '--text': '#e6f4ee', '--muted': '#9bb0a6', '--primary': '#34d399', '--ink': '#03130d', '--coin': '#fbbf24', '--glow1': 'rgba(16,185,129,.20)', '--glow2': 'rgba(139,92,246,.13)' },
    zones: [{ id: 'cultivo', label: 'Cultivo', color: '#34d399' }, { id: 'planeta', label: 'Planeta', color: '#38bdf8' }, { id: 'lab', label: 'Laboratorio', color: '#a78bfa' }, { id: 'mercado', label: 'Mercado', color: '#fbbf24' }, { id: 'genetica', label: 'Genética', color: '#f472b6' }, { id: 'disp', label: 'Dispensario', color: '#fb923c' }],
  },
  {
    id: 'B', name: 'Noche Botánica', tag: 'La diferente', blurb: 'Base índigo-violeta profundo con lima y oro. Se aleja del verde genérico de los juegos cripto y hace que la planta y las monedas destaquen mucho más.',
    v: { '--bg': '#0a0716', '--s1': '#130f26', '--s2': '#1b1636', '--s3': '#261e4a', '--line': '#3a2f6b', '--text': '#ece9fb', '--muted': '#a9a3cf', '--primary': '#b8f35a', '--ink': '#10170a', '--coin': '#fcd34d', '--glow1': 'rgba(167,139,250,.26)', '--glow2': 'rgba(184,243,90,.11)' },
    zones: [{ id: 'cultivo', label: 'Cultivo', color: '#b8f35a' }, { id: 'planeta', label: 'Planeta', color: '#5eead4' }, { id: 'lab', label: 'Laboratorio', color: '#c4b5fd' }, { id: 'mercado', label: 'Mercado', color: '#fcd34d' }, { id: 'genetica', label: 'Genética', color: '#f9a8d4' }, { id: 'disp', label: 'Dispensario', color: '#fdba74' }],
  },
  {
    id: 'C', name: 'Vivero Solar', tag: 'La cálida', blurb: 'Carbón cálido con verde hoja y ámbar. Más orgánica y amable, se siente a huerto y a producto real (encaja con el ungüento WOLI CBD).',
    v: { '--bg': '#0f0c08', '--s1': '#1a150e', '--s2': '#241d13', '--s3': '#30271a', '--line': '#4a3b25', '--text': '#f6efe2', '--muted': '#b9ab92', '--primary': '#8fd14f', '--ink': '#10190a', '--coin': '#f2b134', '--glow1': 'rgba(242,177,52,.15)', '--glow2': 'rgba(143,209,79,.11)' },
    zones: [{ id: 'cultivo', label: 'Cultivo', color: '#8fd14f' }, { id: 'planeta', label: 'Planeta', color: '#6cc4d9' }, { id: 'lab', label: 'Laboratorio', color: '#b79cf0' }, { id: 'mercado', label: 'Mercado', color: '#f2b134' }, { id: 'genetica', label: 'Genética', color: '#ef8fb0' }, { id: 'disp', label: 'Dispensario', color: '#f08a5d' }],
  },
];

const RARITY = [{ id: 'Común', c: '#9ca3af' }, { id: 'Rara', c: '#38bdf8' }, { id: 'Épica', c: '#c084fc' }, { id: 'Legendaria', c: '#fbbf24' }];

/* WCAG contrast ratio */
const lum = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const grade = (r: number) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA grande' : 'falla');

const CSS = `
.sl-root { --zone: var(--primary); position: relative; isolation: isolate; color: var(--text); background: var(--bg); border-radius: 18px; padding: 14px; overflow: hidden;
  border: 1px solid var(--line); font-family: ui-sans-serif, system-ui, sans-serif; }
.sl-root::before { content: ''; position: absolute; inset: 0; z-index: -1; background: radial-gradient(700px 320px at 10% -10%, var(--glow1), transparent 62%), radial-gradient(600px 300px at 100% 0%, var(--glow2), transparent 60%); }
.sl-hud { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.sl-brand { font: 800 15px/1 'Cinzel', serif; letter-spacing: .12em; } .sl-brand b { color: var(--primary); }
.sl-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 10px; background: var(--s2); border: 1px solid var(--line); font: 600 12px/1 ui-monospace, monospace; }
.sl-chip small { color: var(--muted); font-size: 9.5px; letter-spacing: .12em; text-transform: uppercase; display: block; margin-bottom: 2px; }
.sl-xp { flex: 1; min-width: 120px; height: 6px; border-radius: 9px; background: var(--s3); overflow: hidden; } .sl-xp i { display: block; height: 100%; width: 62%; background: linear-gradient(90deg, var(--primary), var(--coin)); }
.sl-zones { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.sl-zone { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 10px; font: 600 12px/1 ui-sans-serif, system-ui; color: var(--muted); border: 1px solid transparent; background: transparent; }
.sl-zone i { width: 8px; height: 8px; border-radius: 50%; background: var(--z); box-shadow: 0 0 8px var(--z); }
.sl-zone.on { color: var(--text); background: color-mix(in srgb, var(--z) 16%, var(--s1)); border-color: color-mix(in srgb, var(--z) 55%, transparent); }
.sl-panel { position: relative; border-radius: 14px; border: 1px solid color-mix(in srgb, var(--zone) 34%, var(--line)); background: linear-gradient(180deg, var(--s1), color-mix(in srgb, var(--bg) 70%, var(--s1)));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.04), 0 0 30px -16px var(--zone); }
.sl-scene { display: grid; grid-template-columns: 104px minmax(0,1fr) 138px; gap: 10px; padding: 10px; }
@media (max-width: 1100px) { .sl-scene { grid-template-columns: 84px minmax(0,1fr) 116px; } }
.sl-rail { display: flex; flex-direction: column; gap: 6px; }
.sl-rail h6, .sl-gauges h6 { margin: 4px 0 0; font: 700 9.5px/1 ui-monospace, monospace; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
.sl-btn { display: flex; align-items: center; gap: 7px; padding: 8px 9px; border-radius: 10px; border: 1px solid var(--line); background: var(--s2); color: var(--text); font: 600 11.5px/1.1 ui-sans-serif, system-ui; text-align: left; }
.sl-btn svg { flex: none; color: var(--z, var(--zone)); }
.sl-btn.primary { background: var(--zone); border-color: var(--zone); color: var(--ink); box-shadow: 0 0 18px -4px var(--zone); } .sl-btn.primary svg { color: var(--ink); }
.sl-btn.gold { border-color: color-mix(in srgb, var(--coin) 55%, transparent); } .sl-btn.gold svg { color: var(--coin); }
.sl-btn small { display: block; color: var(--muted); font-weight: 500; font-size: 9.5px; margin-top: 2px; } .sl-btn.primary small { color: color-mix(in srgb, var(--ink) 70%, transparent); }
.sl-center { position: relative; min-height: 250px; border-radius: 12px; background: radial-gradient(70% 60% at 50% 100%, color-mix(in srgb, var(--zone) 20%, transparent), transparent 70%), var(--s1); overflow: hidden; display: flex; flex-direction: column; align-items: center; }
.sl-card { margin-top: 8px; padding: 6px 12px; border-radius: 10px; background: color-mix(in srgb, var(--bg) 70%, transparent); border: 1px solid var(--line); text-align: center; }
.sl-card b { font: 700 13px/1.2 'Cinzel', serif; display: block; } .sl-card span { font: 600 9.5px/1 ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; color: var(--zone); }
.sl-bar { height: 5px; border-radius: 9px; background: var(--s3); overflow: hidden; margin-top: 6px; } .sl-bar i { display: block; height: 100%; background: var(--ok, #4ade80); }
.sl-plant { flex: 1; width: 100%; min-height: 0; } .sl-plant svg { width: 100%; height: 100%; }
.sl-next { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px 7px 10px; border-radius: 999px; background: var(--zone); color: var(--ink);
  font: 700 12px/1 ui-sans-serif, system-ui; box-shadow: 0 0 22px -3px var(--zone); animation: slPulse 1.8s ease-in-out infinite; white-space: nowrap; }
@keyframes slPulse { 50% { transform: translateX(-50%) scale(1.04); } }
.sl-gauges { display: flex; flex-direction: column; gap: 6px; }
.sl-grp { padding: 7px 8px; border-radius: 10px; background: var(--s2); border: 1px solid var(--line); }
.sl-grp header { display: flex; align-items: center; gap: 6px; font: 700 10.5px/1 ui-sans-serif, system-ui; margin-bottom: 5px; } .sl-grp header i { width: 7px; height: 7px; border-radius: 50%; margin-left: auto; }
.sl-g { display: flex; align-items: center; gap: 6px; font: 600 10px/1 ui-monospace, monospace; color: var(--muted); margin-top: 4px; } .sl-g em { font-style: normal; color: var(--text); margin-left: auto; }
.sl-g .t { position: relative; flex: 1; height: 4px; border-radius: 9px; background: var(--s3); } .sl-g .t u { position: absolute; top: 0; bottom: 0; background: color-mix(in srgb, var(--ok) 34%, transparent); } .sl-g .t s { position: absolute; top: -2px; width: 3px; height: 8px; border-radius: 2px; background: var(--text); }
.sl-row { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; margin-top: 10px; }
.sl-rare { border-radius: 12px; padding: 9px; background: linear-gradient(170deg, color-mix(in srgb, var(--rc) 14%, var(--s1)), var(--s1)); border: 1px solid color-mix(in srgb, var(--rc) 55%, transparent); box-shadow: 0 0 22px -12px var(--rc); }
.sl-rare b { display: block; font: 700 11.5px/1.2 ui-sans-serif, system-ui; } .sl-rare span { font: 600 9px/1 ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; color: var(--rc); }
.sl-rare div { margin-top: 8px; display: flex; align-items: center; gap: 5px; font: 700 11px/1 ui-monospace, monospace; color: var(--coin); }
.sl-sem { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; align-items: center; }
.sl-tag { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px; font: 700 10.5px/1 ui-sans-serif, system-ui; color: var(--c); border: 1px solid color-mix(in srgb, var(--c) 50%, transparent); background: color-mix(in srgb, var(--c) 12%, transparent); }
.sl-sw { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; margin-top: 10px; } .sl-sw div { height: 30px; border-radius: 8px; display: grid; place-items: end start; padding: 3px 5px; font: 700 8.5px/1 ui-monospace, monospace; color: #0006; background: var(--c); }
.sl-bubble-vars { --bubble-bg: var(--s2); --bubble-line: color-mix(in srgb, var(--primary) 55%, transparent); --bubble-ink: var(--text); }
`;

const Gauge: React.FC<{ label: string; value: number; min: number; max: number; okMin: number; okMax: number; unit?: string }> = ({ label, value, min, max, okMin, okMax, unit = '' }) => {
  const pos = (v: number) => `${((v - min) / (max - min)) * 100}%`;
  return (
    <div className="sl-g">{label}<span className="t"><u style={{ left: pos(okMin), width: `${((okMax - okMin) / (max - min)) * 100}%` }} /><s style={{ left: `calc(${pos(value)} - 1px)` }} /></span><em>{value}{unit}</em></div>
  );
};

const Group: React.FC<{ title: string; state: 'ok' | 'warn' | 'danger'; children: React.ReactNode }> = ({ title, state, children }) => (
  <div className="sl-grp"><header>{title}<i style={{ background: `var(--${state})`, boxShadow: `0 0 8px var(--${state})` }} /></header>{children}</div>
);

const Screen: React.FC<{ p: Palette }> = ({ p }) => {
  const style = { ...p.v, '--ok': '#4ade80', '--warn': p.v['--coin'], '--danger': '#f87171', '--z': p.zones[0].color, '--zone': p.zones[0].color } as React.CSSProperties;
  return (
    <div className="sl-root sl-bubble-vars" style={style}>
      <div className="sl-hud">
        <span className="sl-brand">YIELD BUD <b>EMPIRE</b></span>
        <span className="sl-chip" style={{ borderColor: 'color-mix(in srgb, var(--coin) 50%, transparent)' }}><Coins size={14} color="var(--coin)" /><span><small>$FLORA</small>350</span></span>
        <span className="sl-chip"><span><small>SOL</small>1.85</span></span>
        <span className="sl-chip"><span><small>Nv. 2</small>Horticultor</span></span>
        <span className="sl-xp"><i /></span>
      </div>
      <nav className="sl-zones">
        {p.zones.map((z, i) => <span key={z.id} className={`sl-zone ${i === 0 ? 'on' : ''}`} style={{ ['--z' as string]: z.color }}><i />{z.label}</span>)}
      </nav>

      <div className="sl-panel sl-scene">
        <div className="sl-rail">
          <h6>Cuidar</h6>
          <div className="sl-btn primary"><Droplets size={15} /><span>Regar<small>Hum 41%</small></span></div>
          <div className="sl-btn"><FlaskConical size={15} /><span>Abonar<small>EC 1.4</small></span></div>
          <div className="sl-btn"><Scissors size={15} /><span>LST<small>+12%</small></span></div>
          <h6>Acelerar</h6>
          <div className="sl-btn gold"><Flame size={15} /><span>Ciclo<small>25 $FLORA</small></span></div>
          <h6>Genética</h6>
          <div className="sl-btn"><Crown size={15} /><span>Madre</span></div>
        </div>
        <div className="sl-center">
          <div className="sl-card"><span>Vegetativo · #1</span><b>Chrono Foundation OG</b><div className="sl-bar"><i style={{ width: '92%' }} /></div></div>
          <div className="sl-plant"><CannabisPlant seedKey="stylelab" stage="vegetative" progress={38} health={92} soilMoisture={64} vpdOptimal strainColor="#22c55e" amberPct={0} className="w-full h-full" /></div>
          <div className="sl-next"><Sprout size={15} /> Siguiente: regar ahora</div>
        </div>
        <div className="sl-gauges">
          <h6>Estado</h6>
          <Group title="Clima" state="ok"><Gauge label="Temp" value={24} min={15} max={35} okMin={22} okMax={28} unit="°" /><Gauge label="HR" value={57} min={20} max={90} okMin={40} okMax={65} unit="%" /><Gauge label="VPD" value={1.3} min={0} max={2.5} okMin={0.8} okMax={1.4} /></Group>
          <Group title="Raíz" state="warn"><Gauge label="Sust." value={41} min={0} max={100} okMin={40} okMax={85} unit="%" /><Gauge label="pH" value={6.2} min={5} max={8} okMin={5.8} okMax={6.5} /><Gauge label="EC" value={1.8} min={0} max={4} okMin={1} okMax={2.4} /></Group>
          <Group title="Luz y aire" state="ok"><Gauge label="PPFD" value={675} min={0} max={1200} okMin={400} okMax={1000} /><Gauge label="CO₂" value={750} min={300} max={1600} okMin={700} okMax={1400} /></Group>
        </div>
      </div>

      <div className="sl-row">
        {RARITY.map((r) => (
          <div key={r.id} className="sl-rare" style={{ ['--rc' as string]: r.c }}><span>{r.id}</span><b>Gelato Auto</b><div><Coins size={12} />{120 + RARITY.indexOf(r) * 180}</div></div>
        ))}
      </div>

      <div className="sl-sem">
        <span className="sl-tag" style={{ ['--c' as string]: 'var(--ok)' }}><Check size={11} />Óptimo</span>
        <span className="sl-tag" style={{ ['--c' as string]: 'var(--warn)' }}><AlertTriangle size={11} />Atención</span>
        <span className="sl-tag" style={{ ['--c' as string]: 'var(--danger)' }}><AlertTriangle size={11} />Crítico</span>
        <span className="sl-tag" style={{ ['--c' as string]: 'var(--primary)' }}><Zap size={11} />Acción principal</span>
        <span className="sl-tag" style={{ ['--c' as string]: 'var(--coin)' }}><Coins size={11} />Moneda</span>
      </div>
      <div className="sl-sw">{p.zones.map((z) => <div key={z.id} style={{ ['--c' as string]: z.color }}>{z.label.slice(0, 6)}</div>)}</div>
    </div>
  );
};

const ContrastMeter: React.FC<{ p: Palette }> = ({ p }) => {
  const rows: Array<[string, string, string]> = [['Texto / fondo', p.v['--text'], p.v['--bg']], ['Texto apagado / panel', p.v['--muted'], p.v['--s1']], ['Color principal / fondo', p.v['--primary'], p.v['--bg']], ['Texto sobre botón principal', p.v['--ink'], p.v['--primary']], ...p.zones.map((z): [string, string, string] => [`${z.label} / panel`, z.color, p.v['--s1']])];
  return (
    <table className="w-full text-[11px] font-mono border-collapse">
      <tbody>
        {rows.map(([label, fg, bg]) => { const r = contrast(fg, bg); return (
          <tr key={label} className="border-t border-white/5"><td className="py-1 pr-2 text-neutral-400">{label}</td><td className="py-1 text-right text-neutral-200">{r.toFixed(1)}:1</td><td className={`py-1 pl-2 text-right ${r >= 4.5 ? 'text-emerald-300' : r >= 3 ? 'text-amber-300' : 'text-red-300'}`}>{grade(r)}</td></tr>
        ); })}
      </tbody>
    </table>
  );
};

const MOODS: Mood2[] = ['idle', 'happy', 'sad', 'busy', 'think', 'wave'];
const CAST: Array<{ kind: NpcKindV2; variant?: 'flora' | 'floro'; role: string; line: string }> = [
  { kind: 'chrono', role: 'La guía · mascota', line: '¡Hola, cultivador! Soy Chrono y voy a enseñarte a empezar. Primero: mira tu planta, tiene sed.' },
  { kind: 'foreman', role: 'Capataz de la sala de cultivo · casco, chaleco reflectante y lista de tareas', line: 'Sala en orden, jefe. Riego a tiempo, plagas fuera y cosecha cuando el tricoma esté lechoso.' },
  { kind: 'merchant', variant: 'flora', role: 'Grow shop (versión femenina) · gorra, delantal y un frasco de flor', line: 'Bienvenido, jefe. Aquí hay de todo para tu cuarto: luces, nutrientes y aire. ¡Mira este frasco!' },
  { kind: 'merchant', variant: 'floro', role: 'Grow shop (versión masculina) · el jugador elige quién atiende', line: 'Bienvenido, jefe. Aquí hay de todo para tu cuarto: luces, nutrientes y aire. ¡Mira este frasco!' },
  { kind: 'farmer', role: 'Cultivador de exterior · sombrero, tijeras y lupa de tricomas', line: 'La tierra no miente, patrón. Riegue temprano y revise los tricomas con la lupa antes de cortar.' },
  { kind: 'scientist', role: 'Laboratorio · bata, gafas de seguridad y un matraz', line: 'Cada extracto se analiza. Sin certificado de laboratorio, tu lote no vale lo que debería.' },
  { kind: 'geneticist', role: 'Genetista · gafas, frasco de semillas y ADN', line: 'De un buen cruce sale una genética nueva. Registra tu patente y queda a tu nombre.' },
  { kind: 'budtender', role: 'Dispensaria · delantal, pre-roll y un frasco', line: '¡Bienvenido al dispensario! Te cambio tus lotes por $FLORA y por premios de verdad.' },
];

export const StyleLab: React.FC = () => {
  const [mode, setMode] = useState<'A' | 'B' | 'C' | 'all'>('B');
  const [mood, setMood] = useState<{ v: Mood2; k: number }>({ v: 'idle', k: 0 });
  const [line, setLine] = useState(0);
  const [pal, setPal] = useState<'A' | 'B' | 'C'>('B');
  const shown = mode === 'all' ? PALETTES : PALETTES.filter((p) => p.id === mode);
  const npcPalette = PALETTES.find((p) => p.id === pal)!;

  return (
    <div className="min-h-screen bg-[#05060a] text-neutral-100 p-4 sm:p-6 space-y-8">
      <style>{CSS}</style>
      <header className="max-w-7xl mx-auto space-y-2">
        <h1 className="text-2xl font-black tracking-wide">Laboratorio de estilo · Yield Bud Empire</h1>
        <p className="text-sm text-neutral-400 max-w-3xl">Paleta elegida: <b className="text-neutral-200">B · Noche Botánica</b>. Abajo, el elenco rehecho con identidad de grower y de industria del cannabis. Aquí no cambia todavía el juego: cuando los apruebes los pongo en todas las pantallas.</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {(['B', 'all', 'A', 'C'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${mode === m ? 'bg-white text-black border-white' : 'border-white/20 text-neutral-300 hover:border-white/50'}`}>{m === 'all' ? 'Comparar las 3' : `${m} · ${PALETTES.find((p) => p.id === m)!.name}`}</button>
          ))}
        </div>
      </header>

      <section className={`max-w-[1500px] mx-auto grid gap-5 ${mode === 'all' ? 'xl:grid-cols-3' : 'max-w-5xl'}`}>
        {shown.map((p) => (
          <div key={p.id} className="space-y-3 min-w-0">
            <div>
              <div className="flex items-baseline gap-2"><span className="text-lg font-black">{p.id}</span><span className="font-bold">{p.name}</span><span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/20 text-neutral-300">{p.tag}</span></div>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{p.blurb}</p>
            </div>
            <Screen p={p} />
            <details className="text-xs"><summary className="cursor-pointer text-neutral-300 font-semibold">Medidor de contraste (WCAG)</summary><div className="mt-2"><ContrastMeter p={p} /></div></details>
          </div>
        ))}
      </section>

      <section className="max-w-6xl mx-auto space-y-4">
        <div>
          <h2 className="text-xl font-black">El elenco: gente de la industria</h2>
          <p className="text-sm text-neutral-400 max-w-3xl">Cada personaje se reconoce por su silueta y su herramienta de trabajo. Los ojos te siguen (mueve el ratón), parpadean y la boca sincroniza con lo que dicen. Prueba los ánimos y pide otra frase.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {MOODS.map((m) => <button key={m} onClick={() => setMood((s) => ({ v: m, k: s.k + 1 }))} className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${mood.v === m ? 'bg-white text-black border-white' : 'border-white/20 text-neutral-300 hover:border-white/50'}`}>{m}</button>)}
          <button onClick={() => setLine((l) => l + 1)} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-400/60 text-emerald-200 hover:bg-emerald-400/10">Que hablen otra vez</button>
          <span className="text-xs text-neutral-500 ml-2">Fondo con la paleta:</span>
          {(['A', 'B', 'C'] as const).map((id) => <button key={id} onClick={() => setPal(id)} className={`px-2.5 py-1 rounded-md text-xs font-bold border ${pal === id ? 'bg-white text-black border-white' : 'border-white/20 text-neutral-300'}`}>{id}</button>)}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {CAST.map((c) => (
            <div key={c.kind + (c.variant ?? '')} className="sl-root sl-bubble-vars rounded-2xl" style={{ ...npcPalette.v, padding: 12 } as React.CSSProperties}>
              <div className="text-[10px] font-mono uppercase tracking-widest mb-1" style={{ color: 'var(--muted)' }}>{c.role}</div>
              <NpcV2 kind={c.kind} variant={c.variant} text={c.line} mood={mood.v} moodKey={mood.k + line} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
