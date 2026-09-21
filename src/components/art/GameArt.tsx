import React, { useId } from 'react';

/**
 * Ilustraciones animadas del juego (SVG puro, sin fotos): instalaciones de cultivo, productos V2P y arte del whitepaper.
 * Las animaciones son CSS (.fa-*) y se apagan con prefers-reduced-motion.
 */

const uid = (raw: string) => raw.replace(/[^a-zA-Z0-9]/g, '');

const Plant: React.FC<{ x: number; y: number; s?: number; delay?: number; color?: string }> = ({ x, y, s = 1, delay = 0, color = '#22c55e' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <g className="fa-sway" style={{ animationDelay: `${delay}s` }}>
      <path d="M0 0 V-22" stroke="#166534" strokeWidth="2.2" strokeLinecap="round" />
      {[[-9, -14, -40], [9, -14, 40], [-7, -22, -25], [7, -22, 25], [0, -30, 0]].map(([dx, dy, r], i) => (
        <path key={i} d="M0 0 C4 -5 5 -12 0 -18 C-5 -12 -4 -5 0 0 Z" transform={`translate(${dx} ${dy}) rotate(${r})`} fill={color} stroke="#14532d" strokeWidth="0.6" />
      ))}
    </g>
  </g>
);

const Fan: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 13 }) => (
  <g transform={`translate(${x} ${y})`}>
    <circle r={r + 2} fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
    <g className="fa-spin">{[0, 60, 120, 180, 240, 300].map((a) => <path key={a} d={`M0 0 Q${r * 0.55} -${r * 0.2} ${r * 0.9} -${r * 0.55}`} transform={`rotate(${a})`} stroke="#94a3b8" strokeWidth="2.6" fill="none" strokeLinecap="round" />)}</g>
    <circle r="2.6" fill="#e2e8f0" />
  </g>
);

const Shine: React.FC<{ id: string; x: number; y: number; w: number; h: number }> = ({ id, x, y, w, h }) => (
  <g clipPath={`url(#${id})`}><rect className="fa-shine" x={x} y={y} width={w * 0.28} height={h} fill="#fff" opacity="0.16" transform="skewX(-20)" /></g>
);

/* ───────────────────────────── instalaciones ───────────────────────────── */

export type FacilityKind = 'tent_starter' | 'greenhouse_commercial' | 'lab_pharma_hydro';

const Tent: React.FC<{ p: string }> = ({ p }) => (
  <>
    <defs>
      <linearGradient id={`${p}bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#04130f" /><stop offset="1" stopColor="#0a2a20" /></linearGradient>
      <linearGradient id={`${p}cone`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f0abfc" stopOpacity="0.5" /><stop offset="1" stopColor="#c084fc" stopOpacity="0" /></linearGradient>
      <clipPath id={`${p}in`}><rect x="66" y="30" width="108" height="92" rx="4" /></clipPath>
    </defs>
    <rect width="240" height="150" fill={`url(#${p}bg)`} />
    <ellipse cx="120" cy="132" rx="92" ry="10" fill="#000" opacity="0.4" />
    {/* carpa */}
    <rect x="60" y="24" width="120" height="104" rx="6" fill="#26383a" stroke="#94a3b8" strokeOpacity="0.55" strokeWidth="2" />
    <rect x="66" y="30" width="108" height="92" rx="4" fill="#0b1f1a" />
    <g clipPath={`url(#${p}in)`}>
      <polygon className="fa-pulse" points="82,42 158,42 176,122 64,122" fill={`url(#${p}cone)`} />
      <Plant x={120} y={118} s={1.55} color="#34d399" />
      <Plant x={92} y={120} s={0.8} delay={0.7} color="#22c55e" />
      <Plant x={150} y={120} s={0.85} delay={1.3} color="#22c55e" />
      {[[80, 60], [98, 80], [146, 70], [160, 92], [110, 52], [132, 96]].map(([x, y], i) => <circle key={i} className="fa-rise" cx={x} cy={y + 30} r="1.3" fill="#f5d0fe" style={{ animationDelay: `${i * 0.5}s` }} />)}
      <Shine id={`${p}in`} x={60} y={30} w={110} h={92} />
    </g>
    {/* panel LED */}
    <rect x="80" y="34" width="80" height="8" rx="3" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
    {Array.from({ length: 10 }, (_, i) => <circle key={i} className="fa-pulse" cx={85 + i * 7.6} cy="38" r="1.9" fill={i % 3 === 0 ? '#60a5fa' : '#f0abfc'} style={{ animationDelay: `${i * 0.18}s` }} />)}
    <rect x="60" y="24" width="120" height="104" rx="6" fill="none" stroke="#e2e8f0" strokeOpacity="0.12" />
    <line x1="120" y1="24" x2="120" y2="128" stroke="#94a3b8" strokeOpacity="0.3" strokeDasharray="2 3" />
    {/* extractor */}
    <path d="M150 24 V14 Q150 8 156 8 H186" stroke="#475569" strokeWidth="6" fill="none" strokeLinecap="round" />
    <Fan x={196} y={12} r={11} />
    {[0, 1, 2].map((i) => <path key={i} className="fa-flow" d={`M208 ${8 + i * 4} H236`} stroke="#67e8f9" strokeOpacity="0.7" strokeWidth="1.6" fill="none" style={{ animationDelay: `${i * 0.25}s` }} />)}
    {/* termostato */}
    <rect x="186" y="98" width="44" height="26" rx="4" fill="#020617" stroke="#334155" />
    <text x="208" y="109" textAnchor="middle" fontSize="8" fill="#34d399" fontFamily="monospace">24.2°C</text>
    <text x="208" y="119" textAnchor="middle" fontSize="8" fill="#38bdf8" fontFamily="monospace">RH 62%</text>
    <text x="14" y="140" fontSize="7" fill="#64748b" fontFamily="monospace">CARPA 80×80</text>
  </>
);

const Greenhouse: React.FC<{ p: string }> = ({ p }) => (
  <>
    <defs>
      <linearGradient id={`${p}sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0c4a6e" /><stop offset="1" stopColor="#164e63" /></linearGradient>
      <linearGradient id={`${p}glass`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a5f3fc" stopOpacity="0.28" /><stop offset="1" stopColor="#6ee7b7" stopOpacity="0.1" /></linearGradient>
      <clipPath id={`${p}roof`}><path d="M40 118 V70 Q40 30 120 28 Q200 30 200 70 V118 Z" /></clipPath>
      <clipPath id={`${p}pv`}><polygon points="128,34 188,50 194,72 132,58" /></clipPath>
    </defs>
    <rect width="240" height="150" fill={`url(#${p}sky)`} />
    {/* sol */}
    <g transform="translate(206 26)"><g className="fa-spin fa-spin--slow">{Array.from({ length: 10 }, (_, i) => <line key={i} x1="0" y1="-13" x2="0" y2="-19" stroke="#fde047" strokeWidth="2.4" strokeLinecap="round" transform={`rotate(${i * 36})`} />)}</g><circle r="9" fill="#fde047" className="fa-pulse" /><circle r="6" fill="#fef9c3" /></g>
    <g className="fa-drift" style={{ animationDuration: '46s' }}><ellipse cx="20" cy="18" rx="16" ry="5" fill="#e0f2fe" opacity="0.5" /><ellipse cx="30" cy="14" rx="11" ry="5" fill="#e0f2fe" opacity="0.5" /></g>
    <rect x="0" y="118" width="240" height="32" fill="#052e16" /><rect x="0" y="118" width="240" height="3" fill="#166534" />
    {/* invernadero */}
    <path d="M40 118 V70 Q40 30 120 28 Q200 30 200 70 V118 Z" fill={`url(#${p}glass)`} stroke="#a7f3d0" strokeOpacity="0.7" strokeWidth="2" />
    {[64, 88, 112, 136, 160, 176].map((x) => <path key={x} d={`M${x} 118 V${x < 110 ? 44 : 40}`} stroke="#a7f3d0" strokeOpacity="0.35" />)}
    <path d="M40 92 H200 M44 66 H196" stroke="#a7f3d0" strokeOpacity="0.28" />
    <g clipPath={`url(#${p}roof)`}>
      {[[70, 106, 0], [96, 106, 0.6], [124, 106, 1.1], [150, 106, 0.3], [176, 106, 0.9]].map(([x, y, d], i) => <Plant key={i} x={x} y={y} s={1.15} delay={d} color={i % 2 ? '#22c55e' : '#4ade80'} />)}
      {[60, 88, 116, 144, 172].map((x, i) => <circle key={i} className="fa-rise" cx={x} cy={112} r="1.6" fill="#bbf7d0" style={{ animationDelay: `${i * 0.6}s` }} />)}
      <Shine id={`${p}roof`} x={30} y={28} w={180} h={90} />
    </g>
    {/* paneles solares */}
    <polygon points="128,34 188,50 194,72 132,58" fill="#1e3a8a" stroke="#93c5fd" strokeWidth="1.2" />
    {[0.25, 0.5, 0.75].map((t) => <line key={t} x1={128 + 60 * t} y1={34 + 16 * t} x2={132 + 62 * t} y2={58 + 14 * t} stroke="#93c5fd" strokeOpacity="0.55" />)}
    <line x1="130" y1="46" x2="191" y2="61" stroke="#93c5fd" strokeOpacity="0.55" />
    <Shine id={`${p}pv`} x={120} y={30} w={70} h={44} />
    {/* CO2 */}
    <g transform="translate(14 84)"><rect x="0" y="0" width="16" height="34" rx="6" fill="#334155" stroke="#94a3b8" /><rect x="5" y="-5" width="6" height="6" rx="1" fill="#94a3b8" /><text x="8" y="21" textAnchor="middle" fontSize="6.5" fill="#67e8f9" fontFamily="monospace">CO₂</text>{[0, 1, 2].map((i) => <circle key={i} className="fa-rise" cx={8 + i * 3 - 3} cy="-6" r="2" fill="none" stroke="#67e8f9" style={{ animationDelay: `${i * 0.9}s` }} />)}</g>
    {/* deshumidificador */}
    <g transform="translate(206 92)"><rect width="28" height="26" rx="4" fill="#1e293b" stroke="#64748b" /><circle cx="14" cy="10" r="6" fill="#0f172a" stroke="#38bdf8" /><g className="fa-spin"><path d="M14 10 m-4 0 h8 M14 6 v8" stroke="#38bdf8" strokeWidth="1.4" /></g>{[0, 1].map((i) => <path key={i} className="fa-fall" d={`M${9 + i * 10} 24 q2 3 0 5 q-2 -2 0 -5`} fill="#38bdf8" style={{ animationDelay: `${i * 0.7}s` }} />)}</g>
    <text x="120" y="142" textAnchor="middle" fontSize="7.5" fill="#67e8f9" fontFamily="monospace" className="fa-pulse">CO₂ 1200 ppm · SOLAR</text>
  </>
);

const Hydro: React.FC<{ p: string }> = ({ p }) => (
  <>
    <defs>
      <linearGradient id={`${p}bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#020617" /><stop offset="1" stopColor="#0b1a2a" /></linearGradient>
      <linearGradient id={`${p}uv`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a78bfa" stopOpacity="0.55" /><stop offset="1" stopColor="#7c3aed" stopOpacity="0" /></linearGradient>
    </defs>
    <rect width="240" height="150" fill={`url(#${p}bg)`} />
    {Array.from({ length: 12 }, (_, i) => <line key={i} x1={i * 22} y1="0" x2={i * 22} y2="150" stroke="#1e293b" strokeOpacity="0.6" />)}
    {Array.from({ length: 8 }, (_, i) => <line key={i} x1="0" y1={i * 22} x2="240" y2={i * 22} stroke="#1e293b" strokeOpacity="0.6" />)}
    <rect x="0" y="130" width="240" height="20" fill="#0a1220" /><rect x="0" y="130" width="240" height="2" fill="#0ea5e9" opacity="0.5" />
    {/* lámpara UV */}
    <rect x="34" y="8" width="172" height="7" rx="3" fill="#1e1b4b" stroke="#6d28d9" />
    <polygon className="fa-pulse" points="40,15 200,15 226,128 14,128" fill={`url(#${p}uv)`} />
    {/* torres verticales */}
    {[52, 96, 140, 184].map((x, t) => (
      <g key={x}>
        <rect x={x - 9} y="22" width="18" height="98" rx="6" fill="#0f2233" stroke="#38bdf8" strokeOpacity="0.55" />
        <rect className="fa-hue" x={x - 12} y="26" width="3" height="88" rx="1.5" fill="#c084fc" style={{ animationDelay: `${t * 0.9}s` }} />
        <rect className="fa-hue" x={x + 9} y="26" width="3" height="88" rx="1.5" fill="#c084fc" style={{ animationDelay: `${t * 0.9 + 0.4}s` }} />
        {[38, 66, 94].map((y, k) => (
          <g key={y}>
            <circle cx={x} cy={y} r="5" fill="#082f49" stroke="#7dd3fc" strokeWidth="1.2" />
            <Plant x={x} y={y + 1} s={0.62} delay={(t + k) * 0.35} color="#4ade80" />
            {[0, 1, 2].map((m) => <circle key={m} className="fa-mist" cx={x + (m - 1) * 6} cy={y + 6} r="1.4" fill="#bae6fd" style={{ animationDelay: `${(t + k + m) * 0.4}s` }} />)}
          </g>
        ))}
      </g>
    ))}
    {/* depósito y bomba */}
    <rect x="22" y="112" width="196" height="20" rx="6" fill="#082f49" stroke="#38bdf8" strokeOpacity="0.6" />
    <rect x="26" y="120" width="188" height="9" rx="4" fill="#0ea5e9" opacity="0.5" />
    {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} className="fa-rise" cx={44 + i * 30} cy="124" r="2" fill="#e0f2fe" opacity="0.7" style={{ animationDelay: `${i * 0.55}s` }} />)}
    <text x="120" y="145" textAnchor="middle" fontSize="7.5" fill="#7dd3fc" fontFamily="monospace">AEROPONÍA · UV · LED DINÁMICO</text>
  </>
);

export const FacilityArt: React.FC<{ kind: string; className?: string; slice?: boolean; label?: string }> = ({ kind, className, slice, label }) => {
  const p = uid(useId());
  return (
    <svg viewBox="0 0 240 150" className={`fa-art ${className ?? ''}`} preserveAspectRatio={slice ? 'xMidYMid slice' : 'xMidYMid meet'} role="img" aria-label={label ?? 'Instalación de cultivo'}>
      {kind === 'greenhouse_commercial' ? <Greenhouse p={p} /> : kind === 'lab_pharma_hydro' ? <Hydro p={p} /> : <Tent p={p} />}
    </svg>
  );
};

/* ───────────────────────────── productos V2P ───────────────────────────── */

const Leaf: React.FC<{ s?: number }> = ({ s = 1 }) => (
  <g transform={`scale(${s})`}>{[-70, -40, -15, 0, 15, 40, 70].map((a, i) => <path key={a} d={`M0 0 C3 -6 4 -13 0 -${[9, 14, 18, 22, 18, 14, 9][i]} C-4 -13 -3 -6 0 0 Z`} transform={`rotate(${a})`} fill="#22c55e" stroke="#14532d" strokeWidth="0.5" />)}</g>
);

export const V2pArt: React.FC<{ id: string; className?: string }> = ({ id, className }) => {
  const p = uid(useId());
  return (
    <svg viewBox="0 0 120 120" className={`fa-art ${className ?? ''}`} role="img" aria-label="Producto V2P">
      <defs>
        <radialGradient id={`${p}g`} cx="50%" cy="45%" r="60%"><stop offset="0" stopColor="#fbbf24" stopOpacity="0.3" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${p}amber`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f59e0b" /><stop offset="1" stopColor="#92400e" /></linearGradient>
        <linearGradient id={`${p}dark`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#14532d" /><stop offset="1" stopColor="#052e16" /></linearGradient>
      </defs>
      <rect width="120" height="120" fill="#03110d" />
      <circle cx="60" cy="62" r="52" fill={`url(#${p}g)`} className="fa-pulse" />
      {id === 'v2p_grow_hoodie' ? (
        <g>
          <path d="M34 34 L48 26 Q60 38 72 26 L86 34 L104 62 L90 68 L84 58 V102 H36 V58 L30 68 L16 62 Z" fill="#166534" stroke="#4ade80" strokeWidth="1.5" />
          <path d="M48 26 Q60 44 72 26" fill="none" stroke="#052e16" strokeWidth="4" />
          <path d="M55 40 V56 M65 40 V56" stroke="#dcfce7" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M44 84 H76 V102 H44 Z" fill="#14532d" stroke="#4ade80" strokeOpacity="0.5" />
          <g transform="translate(60 76)"><Leaf s={0.9} /></g>
          <g transform="translate(96 22)"><rect x="-9" y="-9" width="18" height="18" rx="4" fill="#0f172a" stroke="#38bdf8" /><text x="0" y="3" textAnchor="middle" fontSize="6" fill="#38bdf8" fontFamily="monospace">NFC</text>{[8, 13, 18].map((r, i) => <path key={r} className="fa-pulse" d={`M${r - 4} -${r - 4} A${r} ${r} 0 0 1 ${r - 4} ${r - 4 + 0.01}`} stroke="#38bdf8" fill="none" opacity="0.7" style={{ animationDelay: `${i * 0.3}s` }} />)}<circle className="fa-pulse" r="14" fill="none" stroke="#38bdf8" strokeOpacity="0.6" /></g>
        </g>
      ) : id === 'v2p_cbd_drops' ? (
        <g>
          <rect x="44" y="52" width="32" height="52" rx="8" fill={`url(#${p}dark)`} stroke="#4ade80" strokeWidth="1.5" />
          <rect x="50" y="42" width="20" height="12" rx="3" fill="#0f172a" stroke="#94a3b8" />
          <path d="M60 42 V28 Q60 20 66 20" stroke="#e2e8f0" strokeWidth="5" fill="none" strokeLinecap="round" />
          <rect x="48" y="70" width="24" height="22" rx="3" fill="#dcfce7" opacity="0.92" />
          <g transform="translate(60 84)"><Leaf s={0.55} /></g>
          <text x="60" y="76" textAnchor="middle" fontSize="6" fontWeight="700" fill="#14532d">CBD</text>
          <path className="fa-fall" d="M66 24 q3 5 0 8 q-3 -3 0 -8" fill="#fbbf24" />
          <path className="fa-fall" d="M66 24 q3 5 0 8 q-3 -3 0 -8" fill="#fbbf24" style={{ animationDelay: '1s' }} />
          <text x="60" y="114" textAnchor="middle" fontSize="7" fill="#86efac" fontFamily="monospace">1500 mg</text>
        </g>
      ) : (
        <g>
          <rect x="42" y="56" width="36" height="48" rx="9" fill={`url(#${p}amber)`} stroke="#fde68a" strokeWidth="1.5" />
          <rect x="49" y="44" width="22" height="14" rx="3" fill="#0f172a" stroke="#94a3b8" />
          <path d="M60 44 V30 Q60 22 66 22" stroke="#e2e8f0" strokeWidth="5" fill="none" strokeLinecap="round" />
          <rect x="47" y="72" width="26" height="20" rx="3" fill="#fffbeb" opacity="0.92" />
          <text x="60" y="80" textAnchor="middle" fontSize="5.4" fontWeight="700" fill="#78350f">TERPENOS</text>
          <text x="60" y="88" textAnchor="middle" fontSize="5" fill="#92400e">15 ml</text>
          {/* molécula */}
          <g transform="translate(96 40)" className="fa-bob"><polygon points="0,-9 8,-4.5 8,4.5 0,9 -8,4.5 -8,-4.5" fill="none" stroke="#fbbf24" strokeWidth="1.6" />{[[0, -9], [8, 4.5], [-8, 4.5]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.2" fill="#fbbf24" />)}</g>
          {[0, 1, 2].map((i) => <path key={i} className="fa-rise" d={`M${52 + i * 8} 40 q4 -6 0 -12 q-4 -6 0 -12`} stroke="#fcd34d" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7" style={{ animationDelay: `${i * 0.8}s` }} />)}
        </g>
      )}
    </svg>
  );
};

/* ───────────────────────────── whitepaper ───────────────────────────── */

/** Fondo del encabezado del whitepaper: red de nodos on-chain con hojas flotando. */
export const WhitepaperHeroArt: React.FC<{ className?: string }> = ({ className }) => {
  const p = uid(useId());
  const nodes = [[90, 70], [230, 150], [380, 60], [520, 140], [660, 50], [800, 130], [940, 70], [1080, 150], [1220, 60], [300, 250], [610, 260], [900, 250], [1160, 270]];
  const links = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [1, 9], [3, 10], [5, 11], [7, 12], [9, 10], [10, 11], [11, 12], [2, 4], [6, 8]];
  return (
    <svg viewBox="0 0 1400 320" className={`fa-art ${className ?? ''}`} preserveAspectRatio="xMidYMid slice" role="img" aria-label="Red de Yield Bud Empire">
      <defs><radialGradient id={`${p}n`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#34d399" stopOpacity="0.9" /><stop offset="1" stopColor="#34d399" stopOpacity="0" /></radialGradient></defs>
      {links.map(([a, b], i) => <line key={i} className="fa-flow" x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="#34d399" strokeOpacity="0.4" strokeWidth="1.4" style={{ animationDuration: `${1.6 + (i % 4) * 0.5}s` }} />)}
      {nodes.map(([x, y], i) => <g key={i}><circle className="fa-pulse" cx={x} cy={y} r="26" fill={`url(#${p}n)`} style={{ animationDelay: `${i * 0.3}s` }} /><circle cx={x} cy={y} r="4.5" fill="#a7f3d0" /></g>)}
      {[180, 470, 760, 1050, 1300].map((x, i) => <g key={x} transform={`translate(${x} ${200 + (i % 2) * 40})`} className="fa-bob" style={{ animationDelay: `${i * 0.6}s` }}><Leaf s={1.8} /></g>)}
    </svg>
  );
};
