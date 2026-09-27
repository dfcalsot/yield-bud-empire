import { artBase, artFilter } from '../empire/seatArt';
import React from 'react';
import './hud.css';
import type { EquipStats } from '../../economy/catalog';
import { t } from '../../i18n';

/**
 * The room behind the plant. Every facility tier is a different place with different machinery, and the machines drawn are the
 * ones the player really has installed (`equip`): lamp size, air conditioner, drip line, CO₂ tank, solar.
 *  armario → wooden wardrobe with a small lamp and a clip fan
 *  carpa → reflective mylar tent, carbon filter + duct, wide LED bar
 *  invernadero → glass roof over the real sky, solar panels, vents, misting
 *  hidropónica → clean-room with NFT racks, nutrient tanks, control screen, chiller
 */
export type FacilityId = 'tent_starter' | 'tent_pro' | 'greenhouse_commercial' | 'lab_pharma_hydro' | string;

interface Props { facilityId: FacilityId; lampColor: string; lightPct: number; equip: EquipStats; hour: number }

const LEDS = (n: number, x0: number, x1: number, y: number, c: string) => Array.from({ length: n }, (_, i) => <circle key={i} cx={x0 + ((x1 - x0) * i) / Math.max(1, n - 1)} cy={y} r="3.2" fill={i % 5 === 2 ? '#ef4444' : i % 5 === 4 ? '#818cf8' : `rgb(${c})`} className="fb-pulse" style={{ animationDelay: `${(i % 7) * 0.18}s` }} />);

/* ── shared machines (drawn only when the player owns them) ── */
const AcUnit: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect width="150" height="46" rx="8" fill="#e8ecf4" stroke="#8a97ad" strokeWidth="2" /><rect x="8" y="30" width="134" height="8" rx="3" fill="#9aa8bf" />
    <rect x="10" y="9" width="46" height="9" rx="2" fill="#0a0716" /><circle cx="128" cy="14" r="4" fill="#5eead4" className="fb-blink" />
    {[0, 1, 2, 3].map((i) => <ellipse key={i} className="fb-cold" cx={30 + i * 32} cy="46" rx="6" ry="3" fill="#bae6fd" style={{ animationDelay: `${i * 0.8}s` }} />)}
  </g>
);
const Co2Tank: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`}><rect x="0" y="14" width="30" height="70" rx="12" fill="#3f5b3a" stroke="#0a0716" strokeWidth="2.4" /><rect x="8" y="2" width="14" height="16" rx="3" fill="#a3a3a3" stroke="#0a0716" strokeWidth="2" /><text x="15" y="56" fontSize="11" fontWeight="900" textAnchor="middle" fill="#d9f99d">CO₂</text><circle cx="15" cy="70" r="3" fill="#b8f35a" className="fb-blink" /></g>
);
const DripLine: React.FC<{ x0: number; x1: number; y: number }> = ({ x0, x1, y }) => (
  <g><path d={`M${x0} ${y} H${x1}`} stroke="#0a0716" strokeWidth="6" strokeLinecap="round" /><path d={`M${x0} ${y} H${x1}`} stroke="#38bdf8" strokeWidth="2.6" strokeLinecap="round" className="fb-flow" />
    {Array.from({ length: 6 }, (_, i) => <circle key={i} className="fb-drip" cx={x0 + ((x1 - x0) * (i + 0.5)) / 6} cy={y + 4} r="2.4" fill="#7dd3fc" style={{ animationDelay: `${i * 0.31}s` }} />)}</g>
);

/* ── the four environments ── */
const Closet: React.FC<Props> = ({ lampColor, equip }) => (
  <>
    <rect width="1000" height="600" fill="#2a1a10" />
    {Array.from({ length: 16 }, (_, i) => <rect key={i} x={i * 62.5} y="0" width="62" height="600" fill={i % 2 ? '#5d3c25' : '#684328'} stroke="#3a2412" strokeWidth="2" />)}
    <rect y="470" width="1000" height="130" fill="#3b2614" /><path d="M0 470 H1000" stroke="#22150a" strokeWidth="6" />
    {Array.from({ length: 7 }, (_, i) => <path key={i} d={`M${i * 170 - 40} 600 L${i * 170 + 30} 470`} stroke="#2a190d" strokeWidth="3" />)}
    {/* the wardrobe frame: door edges and shadow make it feel like a small closet */}
    <rect x="0" width="96" height="600" fill="#1c1109" /><rect x="904" width="96" height="600" fill="#1c1109" />
    <rect x="96" y="0" width="10" height="600" fill="#0d0805" /><rect x="894" y="0" width="10" height="600" fill="#0d0805" />
    <rect y="0" width="1000" height="52" fill="#20130a" /><rect y="52" width="1000" height="8" fill="#0d0805" />
    <g><rect x="120" y="128" width="26" height="150" rx="4" fill="#3b2a18" stroke="#0d0805" strokeWidth="3" /><rect x="112" y="118" width="42" height="14" rx="3" fill="#7a5a34" /></g>
    {/* small lamp on a cord */}
    <path d="M500 60 V96" stroke="#0d0805" strokeWidth="3" /><rect x="420" y="96" width="160" height="16" rx="6" fill="#2b2b33" stroke="#0d0805" strokeWidth="2.4" />{LEDS(9, 436, 564, 104, lampColor)}
    {/* clip fan */}
    <g transform="translate(790 214)"><rect x="-6" y="34" width="12" height="46" fill="#333" /><circle r="40" fill="#1a1a22" stroke="#555" strokeWidth="3" /><g className="fb-fan">{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-20" rx="9" ry="20" fill="#9aa8bf" opacity=".85" transform={`rotate(${a})`} />)}</g><circle r="7" fill="#e5e7eb" /></g>
    {/* cardboard extraction duct */}
    <rect x="820" y="60" width="52" height="98" fill="#9a7a4b" stroke="#5d4426" strokeWidth="2" /><path d="M820 84 H872 M820 110 H872 M820 134 H872" stroke="#7a5f38" strokeWidth="2" />
    {equip.hasAc && <AcUnit x={150} y={70} />}
    {equip.co2Ppm > 700 && <Co2Tank x={150} y={330} />}
    {equip.autoWater && <DripLine x0={310} x1={690} y={460} />}
  </>
);

const Tent: React.FC<Props> = ({ lampColor, equip }) => (
  <>
    <rect width="1000" height="600" fill="#15151c" />
    <defs><pattern id="fbMylar" width="46" height="46" patternUnits="userSpaceOnUse"><rect width="46" height="46" fill="#232734" /><path d="M0 23 L23 0 L46 23 L23 46Z" fill="none" stroke="#3a4257" strokeWidth="2" /></pattern>
      <linearGradient id="fbSheen" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity=".16" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#fff" stopOpacity=".1" /></linearGradient></defs>
    <rect x="60" y="0" width="880" height="560" fill="url(#fbMylar)" /><rect x="60" y="0" width="880" height="560" fill="url(#fbSheen)" />
    <rect width="60" height="600" fill="#0c0c12" /><rect x="940" width="60" height="600" fill="#0c0c12" />
    <rect x="56" y="0" width="8" height="600" fill="#08080d" /><rect x="936" y="0" width="8" height="600" fill="#08080d" /><rect y="0" width="1000" height="28" fill="#08080d" />
    <path d="M500 28 V560" stroke="#0a0a10" strokeWidth="3" strokeDasharray="10 6" opacity=".5" />
    <rect y="500" width="1000" height="100" fill="#0d0d13" /><path d="M0 500 H1000" stroke="#000" strokeWidth="5" />
    {/* wide LED bar */}
    {[300, 700].map((x) => <path key={x} d={`M${x} 28 V70`} stroke="#3a3a48" strokeWidth="3" />)}
    <rect x="240" y="70" width="520" height="22" rx="8" fill="#2c2c38" stroke="#0a0a10" strokeWidth="3" />{LEDS(16, 262, 738, 81, lampColor)}
    {/* carbon filter + inline fan + duct */}
    <g transform="translate(820 60)"><rect width="76" height="130" rx="10" fill="#2f3340" stroke="#0a0a10" strokeWidth="3" /><path d="M8 30 H68 M8 56 H68 M8 82 H68" stroke="#454b5d" strokeWidth="3" /><circle cx="38" cy="112" r="6" fill="#b8f35a" className="fb-blink" /></g>
    <path d="M858 60 V28 H610" fill="none" stroke="#3a3f52" strokeWidth="14" strokeLinecap="round" /><path d="M858 60 V28 H610" fill="none" stroke="#5a617a" strokeWidth="6" strokeLinecap="round" opacity=".6" />
    <g transform="translate(700 21)"><rect width="42" height="16" rx="4" fill="#1d2029" stroke="#0a0a10" strokeWidth="2" /><g className="fb-fan"><circle cx="21" cy="8" r="0.1" /></g></g>
    {/* thermo-hygrometer */}
    <g transform="translate(140 130)"><rect width="74" height="44" rx="6" fill="#0a0a10" stroke="#5a617a" strokeWidth="2" /><text x="8" y="19" fontSize="12" fontWeight="800" fill="#b8f35a" fontFamily="monospace">26°C</text><text x="8" y="36" fontSize="12" fontWeight="800" fill="#5eead4" fontFamily="monospace">62%</text></g>
    {equip.hasAc && <AcUnit x={110} y={200} />}
    {equip.co2Ppm > 700 && <Co2Tank x={150} y={380} />}
    {equip.autoWater && <DripLine x0={270} x1={730} y={505} />}
  </>
);

const Greenhouse: React.FC<Props> = ({ equip, hour }) => {
  const day = hour >= 6 && hour < 18, t = day ? (hour - 6) / 12 : ((hour - 18 + 24) % 24) / 12;
  const sky = day ? (hour < 8 || hour > 16 ? ['#ff9d6a', '#ffd6a5'] : ['#3d8ee0', '#bfe3ff']) : ['#0b1030', '#26265e'];
  const bx = 120 + t * 760, by = 250 - Math.sin(Math.PI * t) * 190;
  return (
    <>
      <defs><linearGradient id="fbSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} /></linearGradient></defs>
      <rect width="1000" height="600" fill="url(#fbSky)" />
      {!day && Array.from({ length: 30 }, (_, i) => <circle key={i} className="fb-pulse" cx={(i * 97) % 1000} cy={(i * 53) % 260} r={1 + (i % 3) * 0.6} fill="#fff" style={{ animationDelay: `${i * 0.13}s` }} />)}
      {day ? <g><circle cx={bx} cy={by} r="46" fill="#fff4b8" opacity=".35" /><circle cx={bx} cy={by} r="20" fill="#fff7c2" /></g> : <g><circle cx={bx} cy={by} r="20" fill="#e2e8f0" /><circle cx={bx + 7} cy={by - 3} r="17" fill={sky[0]} /></g>}
      {[0, 1, 2].map((i) => <g key={i} className="fb-cloud" style={{ animationDelay: `${-i * 30}s` }}><ellipse cx="0" cy={70 + i * 50} rx="90" ry="20" fill="#fff" opacity={day ? 0.6 : 0.12} /><ellipse cx="50" cy={58 + i * 50} rx="60" ry="16" fill="#fff" opacity={day ? 0.55 : 0.1} /></g>)}
      {/* glass roof: arched trusses and panes */}
      {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${i * 125 - 25} 600 V300 Q${i * 125 + 37} 40 ${i * 125 + 100} 300 V600`} fill="none" stroke="#dfe7ef" strokeWidth="6" opacity=".9" />)}
      <path d="M0 210 H1000 M0 320 H1000" stroke="#dfe7ef" strokeWidth="4" opacity=".55" />
      <rect width="1000" height="600" fill="#bfe6ff" opacity=".08" />
      {/* roof vents that open by day */}
      {[220, 500, 780].map((x) => <g key={x} transform={`translate(${x} 96)`}><rect width="90" height="14" rx="3" fill="#cfd8e3" stroke="#7b8797" strokeWidth="2" /><path d={day ? 'M0 14 L-10 -14 M90 14 L100 -14' : 'M0 14 L0 14'} stroke="#7b8797" strokeWidth="3" /></g>)}
      <rect y="470" width="1000" height="130" fill="#3d3a33" />{Array.from({ length: 30 }, (_, i) => <circle key={i} cx={(i * 71) % 1000} cy={490 + ((i * 37) % 100)} r="3" fill="#57534a" />)}
      <rect x="180" y="470" width="640" height="22" rx="4" fill="#6b4a2c" stroke="#22150a" strokeWidth="3" />
      {/* solar panels along the side wall (empty mounts when the player owns none) */}
      <g transform="translate(24 300)">{[0, 1, 2].map((i) => <g key={i} transform={`translate(0 ${i * 52})`}><rect width="130" height="44" rx="4" fill={equip.solarKw > 0 ? '#1d3a78' : '#2a2f3a'} stroke="#9fb0c8" strokeWidth="2" strokeDasharray={equip.solarKw > 0 ? undefined : '6 4'} />{equip.solarKw > 0 && <path d="M0 15 H130 M0 30 H130 M43 0 V44 M86 0 V44" stroke="#5f7fc0" strokeWidth="1.5" />}</g>)}</g>
      {/* misting line over the plants */}
      <path d="M260 210 H740" stroke="#7b8797" strokeWidth="6" strokeLinecap="round" />{Array.from({ length: 8 }, (_, i) => <circle key={i} className="fb-drip" cx={290 + i * 60} cy="216" r="2.6" fill="#bae6fd" style={{ animationDelay: `${i * 0.24}s` }} />)}
      {equip.hasAc && <AcUnit x={830} y={100} />}
      {equip.co2Ppm > 700 && <Co2Tank x={880} y={380} />}
      {equip.autoWater && <DripLine x0={260} x1={740} y={476} />}
    </>
  );
};

const Hydro: React.FC<Props> = ({ lampColor, equip }) => (
  <>
    <defs><linearGradient id="fbWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e8f4f8" /><stop offset="1" stopColor="#b9d3dd" /></linearGradient>
      <linearGradient id="fbTank" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7dd3fc" /><stop offset="1" stopColor="#0284c7" /></linearGradient>
      <linearGradient id="fbTank2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c4b5fd" /><stop offset="1" stopColor="#6d28d9" /></linearGradient></defs>
    <rect width="1000" height="600" fill="url(#fbWall)" />
    {Array.from({ length: 10 }, (_, i) => <path key={i} d={`M${i * 100} 0 V520`} stroke="#9bb8c4" strokeWidth="2" />)}{[110, 220, 330, 440].map((y) => <path key={y} d={`M0 ${y} H1000`} stroke="#9bb8c4" strokeWidth="2" />)}
    <rect y="0" width="1000" height="70" fill="#2b3a4a" /><path d="M0 70 H1000" stroke="#0a0716" strokeWidth="5" />
    {/* ceiling LED arrays and UV bars */}
    {[70, 340, 610].map((x) => <g key={x}><rect x={x} y="22" width="250" height="26" rx="8" fill="#20202c" stroke="#0a0716" strokeWidth="3" />{LEDS(11, x + 18, x + 232, 35, lampColor)}</g>)}
    <rect x="18" y="20" width="30" height="120" rx="8" fill="#a78bfa" opacity=".75" className="fb-pulse" /><rect x="952" y="20" width="30" height="120" rx="8" fill="#a78bfa" opacity=".75" className="fb-pulse" />
    {/* control screen with live graph */}
    <g transform="translate(400 96)"><rect width="200" height="110" rx="10" fill="#0a1220" stroke="#5a7a92" strokeWidth="4" /><path d="M14 80 L48 56 L80 68 L114 34 L150 52 L184 28" fill="none" stroke="#5eead4" strokeWidth="3" strokeLinecap="round" className="fb-flow" /><path d="M14 92 L184 92" stroke="#2e4a5e" strokeWidth="2" /><text x="14" y="24" fontSize="11" fontWeight="800" fill="#b8f35a" fontFamily="monospace">{t('PHARMA · GRADE')}</text></g>
    {/* nutrient tanks with level and pipes */}
    {[{ x: 70, g: 'fbTank' }, { x: 150, g: 'fbTank2' }].map((t) => <g key={t.x} transform={`translate(${t.x} 230)`}><rect width="62" height="190" rx="14" fill="#dbe7ee" stroke="#0a0716" strokeWidth="3" /><rect x="7" y="40" width="48" height="140" rx="9" fill={`url(#${t.g})`} className="fb-bob" opacity=".9" /><rect x="14" y="16" width="34" height="12" rx="4" fill="#8aa1b1" /></g>)}
    <path d="M150 230 V190 H300 V330" fill="none" stroke="#0a0716" strokeWidth="9" strokeLinecap="round" /><path d="M150 230 V190 H300 V330" fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" className="fb-flow" />
    {/* NFT racks with channels */}
    {[0, 1].map((r) => <g key={r} transform={`translate(${r ? 640 : 250} 260)`}><rect width="150" height="16" rx="4" fill="#cdd9e0" stroke="#0a0716" strokeWidth="2.4" /><rect y="64" width="150" height="16" rx="4" fill="#cdd9e0" stroke="#0a0716" strokeWidth="2.4" /><rect x="6" y="-4" width="10" height="120" fill="#7d94a4" /><rect x="134" y="-4" width="10" height="120" fill="#7d94a4" />
      {[0, 1].map((k) => <path key={k} d={`M14 ${8 + k * 64} H136`} stroke="#38bdf8" strokeWidth="3" className="fb-flow" />)}</g>)}
    {/* chiller */}
    <g transform="translate(846 250)"><rect width="110" height="170" rx="12" fill="#e5eef2" stroke="#0a0716" strokeWidth="3" /><circle cx="55" cy="52" r="30" fill="#0a1220" stroke="#5a7a92" strokeWidth="3" /><g className="fb-fan" style={{ transformOrigin: '55px 52px' }}>{[0, 90, 180, 270].map((a) => <ellipse key={a} cx="55" cy="36" rx="6" ry="15" fill="#5eead4" transform={`rotate(${a} 55 52)`} />)}</g><rect x="14" y="110" width="82" height="10" rx="3" fill="#9bb8c4" /><circle cx="24" cy="146" r="5" fill="#5eead4" className="fb-blink" /></g>
    <rect y="500" width="1000" height="100" fill="#8fb0bf" /><path d="M0 500 H1000" stroke="#0a0716" strokeWidth="5" /><rect y="500" width="1000" height="18" fill="#fff" opacity=".18" />
    {equip.hasAc && <AcUnit x={230} y={100} />}
    {equip.co2Ppm > 700 && <Co2Tank x={30} y={430} />}
    {equip.autoWater && <DripLine x0={250} x1={790} y={508} />}
  </>
);

/** rooms with painted art (the plant is removed from the picture: the game draws its own plant on top); the rest are drawn above */
const PAINTED: Record<string, { src: string; pos: string }> = {
  tent_starter: { src: '/rooms/tent_starter.webp', pos: '50% 74%' },   // the cupboard floor lines up with the pot's base (the stage's bottom 28 %)
  tent_pro: { src: '/rooms/tent_pro.webp', pos: '38% 72%' },   // the tent's floor sits a bit left of centre
};

export const FacilityBackdrop: React.FC<Props> = (p) => {
  const base = artBase(p.facilityId);
  const T = base === 'lab_pharma_hydro' ? Hydro : base === 'greenhouse_commercial' ? Greenhouse : base === 'tent_pro' ? Tent : Closet;
  const tight = p.facilityId === 'tent_starter';
  const painted = PAINTED[p.facilityId];
  return (
    <div className="fb-root" aria-hidden data-facility={p.facilityId}>
      {painted
        ? <div className="fb-painted" style={{ backgroundImage: `url(${painted.src})`, backgroundPosition: painted.pos }} />
        : <svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" style={{ filter: artFilter(p.facilityId) }}><T {...p} /></svg>}
      {/* the lamp's light cone over the room */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse ${tight ? 46 : 70}% 62% at 50% 8%, rgba(${p.lampColor},${0.26 * p.lightPct}) 0%, rgba(${p.lampColor},${0.08 * p.lightPct}) 45%, transparent 78%)` }} />
      <div className="absolute inset-0" style={{ background: tight ? 'radial-gradient(ellipse 62% 74% at 50% 46%, transparent 40%, rgba(4,2,10,.86) 100%)' : 'radial-gradient(ellipse 80% 90% at 50% 46%, transparent 55%, rgba(4,2,10,.55) 100%)' }} />
    </div>
  );
};
