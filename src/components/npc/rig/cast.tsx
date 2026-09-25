import React from 'react';
import { Brows, Cheeks, Eyes, Leaf, Mouth, OUTLINE } from './parts';
import type { FigProps, FigureV2 } from './figures';
import { Clipboard, Dna, Flask, Jar, Loupe, MiniPlant, Molecule, PreRoll, Shears } from './props';

/**
 * The cast of the cannabis industry: the grow-shop owner, the outdoor grower, the lab scientist, the geneticist and the
 * dispensary budtender. Same rig as Chrono (shared eyes / brows / mouth, cel shading, dark outline) but each one is dressed
 * and equipped for the trade so the silhouettes read at a glance.
 */
const TORSO = 'M30 194 Q28 130 80 112 Q132 130 130 194Z';

const Tube: React.FC<{ d: string; outer: number; inner: number; fill: string; light?: string }> = ({ d, outer, inner, fill, light }) => (
  <g strokeLinecap="round" fill="none">
    <path d={d} stroke={OUTLINE} strokeWidth={outer} />
    <path d={d} stroke={fill} strokeWidth={inner} />
    {light && <path d={d} stroke={light} strokeWidth={Math.max(1.6, inner * 0.2)} opacity=".5" transform="translate(-1.6 -1.2)" />}
  </g>
);

const Torso: React.FC<{ fill: string; shade?: string; rim?: string }> = ({ fill, shade = '#000', rim = '#fff' }) => (
  <g>
    <path d={TORSO} fill={fill} stroke={OUTLINE} strokeWidth="2.6" strokeLinejoin="round" />
    <path d="M80 112 Q132 130 130 194 L98 194 Q108 142 80 112Z" fill={shade} opacity=".28" />
    <path d="M36 188 Q34 134 68 117" stroke={rim} strokeWidth="2.6" fill="none" strokeLinecap="round" opacity=".45" />
  </g>
);

const Hand: React.FC<{ x: number; y: number; fill?: string; edge?: string; r?: number }> = ({ x, y, fill = 'url(#v2Skin)', edge = '#7a4a2a', r = 6.4 }) => (
  <circle cx={x} cy={y} r={r} fill={fill} stroke={edge} strokeWidth="1.9" />
);

const HeadBase: React.FC<{ skin: string; edge?: string; ear?: string; earring?: string }> = ({ skin, edge = '#7a4a2a', ear = '#e2ad80', earring }) => (
  <g>
    <ellipse cx="49.5" cy="88" rx="4.4" ry="6.4" fill={ear} stroke={edge} strokeWidth="1.6" />
    <ellipse cx="110.5" cy="88" rx="4.4" ry="6.4" fill={ear} stroke={edge} strokeWidth="1.6" />
    {earring && <><circle cx="49.5" cy="97.5" r="2.6" fill="none" stroke={earring} strokeWidth="1.6" /><circle cx="110.5" cy="97.5" r="2.6" fill="none" stroke={earring} strokeWidth="1.6" /></>}
    <circle cx="80" cy="85" r="31" fill={skin} stroke={edge} strokeWidth="2" />
    <path d="M80 54 A31 31 0 0 1 80 116 Q100 100 102 76 Q96 62 80 54Z" fill="#7a3f14" opacity=".15" />
  </g>
);

const Face: React.FC<FigProps & { iris: string; brow?: string; nose?: string; lashes?: boolean; cheek?: string; mouthS?: number; browW?: number }> = ({ mood, talking, viseme, look, iris, brow = '#3b2414', nose = '#b9805a', lashes, cheek = '#fb7185', mouthS = 0.85, browW = 7 }) => (
  <g>
    <Brows lx={68} rx={92} y={75} w={browW} mood={mood} color={brow} />
    <Eyes left={{ cx: 68, cy: 87, rx: 5.6, ry: 7 }} right={{ cx: 92, cy: 87, rx: 5.6, ry: 7 }} iris={iris} sclera="#fffaf0" look={look} mood={mood} lashes={lashes} delay={1.2} />
    <path d="M80 92 q-3.4 4.4 0 5.6" stroke={nose} strokeWidth="1.9" fill="none" strokeLinecap="round" />
    <Cheeks y={99} lx={58} rx={102} r={5.6} color={cheek} />
    <Mouth cx={80} cy={106} s={mouthS} mood={mood} talking={talking} viseme={viseme} />
  </g>
);

const Shadow: React.FC = () => <ellipse cx="80" cy="192" rx="54" ry="6.5" fill="#000" opacity=".38" />;

/* ═════════════ FLORA · dueña del grow shop ═════════════ */
const GrowShop: React.FC<FigProps & { male?: boolean }> = ({ male, ...p }) => (
  <g className="v2-tilt">
    <Shadow />
    <g className="v2-breath">
      {/* ponytail (Flor) */}
      {!male && <path d="M108 64 Q146 60 138 108 Q134 128 122 132 Q128 106 114 90Z" fill="url(#v2HairDark)" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />}
      <Torso fill="url(#v2Purple)" shade="#1e0a4a" rim="#d8c9ff" />
      {/* bunched hood */}
      <path d="M52 118 Q80 136 108 118 Q106 140 80 144 Q54 140 52 118Z" fill="#6034d0" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M62 124 Q80 134 98 124" stroke="#3b1c8f" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* canvas apron: straps, bib, pocket with pH pen and shears */}
      <g strokeLinecap="round" fill="none"><path d="M58 148 L63 122 M102 148 L97 122" stroke={OUTLINE} strokeWidth="8" /><path d="M58 148 L63 122 M102 148 L97 122" stroke="#66772f" strokeWidth="4.6" /></g>
      <path d="M50 194 L56 146 Q80 154 104 146 L110 194Z" fill="url(#v2Olive)" stroke="#39441a" strokeWidth="2" strokeLinejoin="round" />
      <path d="M50 194 L56 146 Q80 154 80 154 L80 194Z" fill="#fff" opacity=".08" />
      <Leaf x={80} y={168} s={0.62} light="#d9f99d" dark="#65a30d" />
      <rect x="61" y="172" width="38" height="17" rx="3" fill="#6b7a35" stroke="#39441a" strokeWidth="1.6" />
      <rect x="66" y="162" width="5" height="19" rx="2" fill="#38bdf8" stroke={OUTLINE} strokeWidth="1.2" /><rect x="66" y="160" width="5" height="5" rx="2" fill="#a3e635" stroke={OUTLINE} strokeWidth="1.2" />
      <path d="M86 176 L90 162 M92 176 L97 164" stroke="#dc2626" strokeWidth="3.6" strokeLinecap="round" />
      {/* Rudy's dreadlocks: twisted locks that come out from under the cap and fall over the shoulders, tipped with gold beads */}
      {male && (
        <g>
          {[-1, 1].map((side) => (
            <g key={side} className={side < 0 ? 'v2-dread v2-dread-l' : 'v2-dread v2-dread-r'}>
              {[
                'M50 82 C40 100 38 120 42 140', 'M52 88 C44 106 44 126 50 146', 'M55 93 C49 111 51 130 57 148',
                'M47 86 C36 104 32 122 34 137', 'M57 97 C53 114 60 131 66 144',
              ].map((d, i) => {
                const flip = (x: number) => (side < 0 ? x : 160 - x);
                const dd = d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_m, x, y) => `${flip(Number(x))} ${y}`);
                const end = d.trim().split(' ').slice(-2).map(Number);
                return (
                  <g key={i}>
                    <path d={dd} stroke={OUTLINE} strokeWidth="10.4" fill="none" strokeLinecap="round" />
                    <path d={dd} stroke="#3a2414" strokeWidth="7" fill="none" strokeLinecap="round" />
                    <path d={dd} stroke="#7a5432" strokeWidth="2" fill="none" strokeDasharray="2.2 4" strokeLinecap="round" opacity=".8" />
                    <circle cx={flip(end[0])} cy={end[1] + 2} r="2.8" fill="#fbbf24" stroke={OUTLINE} strokeWidth="1.2" />
                  </g>
                );
              })}
            </g>
          ))}
        </g>
      )}
      {/* left arm */}
      <g className="v2-arm-l v2-arm-wl" style={{ transformOrigin: '42px 130px' }}>
        <Tube d="M42 130 Q34 154 46 168" outer={16.5} inner={12.4} fill="#7a4ee8" light="#cdbdff" />
        <Hand x={46} y={171} fill="url(#v2SkinTan)" />
      </g>
      {/* right arm shows the jar */}
      <g className="v2-arm-r v2-arm-hold" style={{ transformOrigin: '120px 128px' }}>
        <Tube d="M120 128 Q140 130 145 110" outer={16.5} inner={12.4} fill="#7a4ee8" light="#cdbdff" />
        <Jar x={148} y={92} s={1.08} />
        <Hand x={144} y={107} fill="url(#v2SkinTan)" />
      </g>
      {/* head */}
      <g className="v2-head">
        {!male && <path d="M46 88 Q38 104 46 116 Q52 104 52 94Z" fill="url(#v2HairDark)" stroke={OUTLINE} strokeWidth="1.6" strokeLinejoin="round" />}
        <HeadBase skin="url(#v2SkinTan)" ear="#dca877" earring={male ? undefined : '#fbbf24'} />
        {male && <path d="M51 90 Q52 118 80 121 Q108 118 109 90 Q103 108 80 111 Q57 108 51 90Z" fill="#2a1a10" opacity=".72" />}
        <Face {...p} iris="#6b3a1c" lashes={!male} brow={male ? '#2a1a10' : undefined} browW={male ? 8 : 7} mouthS={male ? 0.9 : 0.85} cheek={male ? '#e0705a' : '#f0708a'} />
        {male && <>
          <path d="M65 99 Q80 94 95 99 Q88 104 80 102 Q72 104 65 99Z" fill="#2a1a10" />
          <path d="M49 76 Q45 92 50 103 Q55 91 54 78Z" fill="url(#v2HairDark)" stroke={OUTLINE} strokeWidth="1.4" /><path d="M111 76 Q115 92 110 103 Q105 91 106 78Z" fill="url(#v2HairDark)" stroke={OUTLINE} strokeWidth="1.4" />
        </>}
        {/* snapback cap */}
        <path d="M47 80 Q46 44 80 42 Q114 44 113 80 Q98 68 80 68 Q62 68 47 80Z" fill="#1f2937" stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M52 74 Q56 52 80 49" stroke="#6b7280" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".55" />
        <path d="M42 82 Q80 64 118 82 Q124 92 112 92 Q80 78 48 92 Q36 92 42 82Z" fill="#a3e635" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M46 84 Q80 70 114 84" stroke="#ecfccb" strokeWidth="2" fill="none" opacity=".6" strokeLinecap="round" />
        <Leaf x={80} y={64} s={0.66} light="#ecfccb" dark="#84cc16" />
      </g>
    </g>
  </g>
);

export const Flora: FigureV2 = (p) => <GrowShop {...p} />;
/** Rudy (id 'floro'): the male version of the grow-shop owner (the player picks who runs the shop). */
export const Floro: FigureV2 = (p) => <GrowShop {...p} male />;

/* ═════════════ TOMÁS · cultivador de exterior ═════════════ */
export const Tomas: FigureV2 = (p) => (
  <g className="v2-tilt">
    <Shadow />
    <MiniPlant x={20} y={192} s={0.95} />
    <g className="v2-breath">
      <Torso fill="url(#v2Flannel)" shade="#3d0808" rim="#ffb4b4" />
      <g clipPath="url(#v2TorsoClip)" stroke="#000" strokeOpacity=".2" strokeWidth="3.4">
        {[130, 148, 166, 184].map((y) => <line key={y} x1="26" y1={y} x2="134" y2={y} />)}
        {[52, 70, 90, 108].map((x) => <line key={x} x1={x} y1="116" x2={x} y2="196" />)}
      </g>
      {/* work vest with pockets and the loupe around the neck */}
      <path d="M38 194 L44 138 Q56 130 68 140 L64 194Z" fill="url(#v2Vest)" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M122 194 L116 138 Q104 130 92 140 L96 194Z" fill="url(#v2Vest)" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="44" y="160" width="17" height="14" rx="2.5" fill="#8e6a34" stroke={OUTLINE} strokeWidth="1.5" /><rect x="99" y="160" width="17" height="14" rx="2.5" fill="#8e6a34" stroke={OUTLINE} strokeWidth="1.5" />
      <circle cx="66" cy="152" r="2.2" fill="#fbbf24" stroke={OUTLINE} strokeWidth="1" /><circle cx="94" cy="152" r="2.2" fill="#fbbf24" stroke={OUTLINE} strokeWidth="1" />
      <path d="M62 118 Q80 152 98 118" stroke="#5b3a1a" strokeWidth="2.2" fill="none" />
      <Loupe x={80} y={146} s={0.95} />
      {/* left arm: rolled sleeve, work glove */}
      <g className="v2-arm-l v2-arm-wl" style={{ transformOrigin: '42px 130px' }}>
        <Tube d="M42 130 Q34 154 46 168" outer={16.5} inner={12.4} fill="#c62d2d" light="#ff9a9a" />
        <Hand x={46} y={171} fill="#d6a35c" edge="#6b4a1a" r={7} />
      </g>
      {/* right arm raises the pruning shears */}
      <g className="v2-arm-r v2-arm-hold" style={{ transformOrigin: '120px 128px' }}>
        <Tube d="M120 128 Q140 130 145 110" outer={16.5} inner={12.4} fill="#c62d2d" light="#ff9a9a" />
        <Shears x={143} y={104} rot={12} s={0.9} />
        <Hand x={144} y={108} fill="#d6a35c" edge="#6b4a1a" r={7} />
      </g>
      <g className="v2-head">
        <HeadBase skin="url(#v2SkinRuddy)" ear="#e0a070" edge="#7a4a2a" />
        {/* short dark stubble beard */}
        <path d="M51 90 Q52 118 80 121 Q108 118 109 90 Q103 108 80 111 Q57 108 51 90Z" fill="#3b2414" opacity=".6" />
        <Face {...p} iris="#5a3a1c" brow="#3b2414" nose="#c0704a" cheek="#e0705a" mouthS={0.85} browW={7.5} />
        {/* dark moustache and sideburns */}
        <path d="M65 99 Q80 94 95 99 Q88 104 80 102 Q72 104 65 99Z" fill="#3b2414" stroke="#22130a" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M49 74 Q45 92 50 103 Q55 91 54 76Z" fill="url(#v2HairDark)" stroke={OUTLINE} strokeWidth="1.4" /><path d="M111 74 Q115 92 110 103 Q105 91 106 76Z" fill="url(#v2HairDark)" stroke={OUTLINE} strokeWidth="1.4" />
        {/* hat shadow on the forehead, brim, crown, band and a leaf pin */}
        <ellipse cx="80" cy="70" rx="44" ry="8" fill="#000" opacity=".16" />
        <path d="M52 62 Q52 32 80 30 Q108 32 108 62Z" fill="url(#v2Straw)" stroke="#7a5a1e" strokeWidth="2.2" strokeLinejoin="round" />
        <ellipse cx="80" cy="62" rx="58" ry="13" fill="url(#v2Straw)" stroke="#7a5a1e" strokeWidth="2.4" />
        <g stroke="#9a7228" strokeWidth="1.2" opacity=".55" fill="none"><path d="M30 62 Q80 74 130 62 M36 66 Q80 78 124 66 M62 44 Q80 40 98 44 M58 52 Q80 48 102 52" /></g>
        <path d="M52 56 Q80 66 108 56 L108 62 Q80 72 52 62Z" fill="#166534" stroke={OUTLINE} strokeWidth="1.8" strokeLinejoin="round" />
        <Leaf x={100} y={60} s={0.5} rot={20} light="#d9f99d" dark="#65a30d" />
      </g>
    </g>
  </g>
);

/* ═════════════ DRA. LUCÍA · laboratorio de extracción ═════════════ */
export const Lucia: FigureV2 = (p) => (
  <g className="v2-tilt">
    <Shadow />
    <g className="v2-breath">
      <Torso fill="url(#v2Coat)" shade="#4a5b78" rim="#ffffff" />
      {/* teal top under the coat, lapels, badge and pens */}
      <path d="M64 116 L80 152 L96 116 Q80 128 64 116Z" fill="#0f8f83" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M62 116 L76 156 L54 148Z" fill="#f4f7fb" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" /><path d="M98 116 L84 156 L106 148Z" fill="#e6ecf4" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M80 152 V194" stroke="#9aa9be" strokeWidth="1.6" />
      <rect x="98" y="158" width="15" height="19" rx="2.5" fill="#fff" stroke={OUTLINE} strokeWidth="1.6" /><circle cx="105.5" cy="165" r="3.4" fill="#a3e635" stroke={OUTLINE} strokeWidth="1" /><path d="M101 172 h9" stroke="#94a3b8" strokeWidth="1.6" />
      <rect x="46" y="166" width="22" height="15" rx="2.5" fill="#eef2f8" stroke="#8898b0" strokeWidth="1.5" />
      <path d="M52 166 L52 156 M58 166 L58 157 M64 166 L64 158" stroke="#a78bfa" strokeWidth="2.6" strokeLinecap="round" />
      <g className="v2-arm-l v2-arm-wl" style={{ transformOrigin: '42px 130px' }}>
        <Tube d="M42 130 Q34 154 46 168" outer={16.5} inner={12.4} fill="#f1f5fb" light="#ffffff" />
        <Hand x={46} y={171} fill="#a78bfa" edge="#4c1d95" r={6.8} />
      </g>
      <g className="v2-arm-r v2-arm-hold" style={{ transformOrigin: '120px 128px' }}>
        <Tube d="M120 128 Q140 130 145 110" outer={16.5} inner={12.4} fill="#f1f5fb" light="#ffffff" />
        <Flask x={149} y={90} s={1.02} />
        <Hand x={145} y={106} fill="#a78bfa" edge="#4c1d95" r={6.8} />
      </g>
      <Molecule x={134} y={40} s={0.82} />
      <g className="v2-head">
        <HeadBase skin="url(#v2SkinBrown)" ear="#b8794a" edge="#6b3f1f" />
        <Face {...p} iris="#3b2414" brow="#2a1a2e" nose="#9a6238" lashes cheek="#f0708a" />
        {/* dark hair with a bun and bangs */}
        <circle cx="80" cy="44" r="13" fill="url(#v2HairDark)" stroke={OUTLINE} strokeWidth="2" />
        <path d="M49 86 Q44 46 80 46 Q116 46 111 86 Q102 64 84 64 Q62 66 49 86Z" fill="url(#v2HairDark)" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
        {/* safety goggles pushed up on the forehead */}
        <path d="M50 66 Q80 56 110 66" stroke="#0f766e" strokeWidth="4.4" fill="none" strokeLinecap="round" />
        <rect x="55" y="55" width="21" height="14" rx="6.5" fill="#99f6e4" fillOpacity=".55" stroke="#0f766e" strokeWidth="2.6" /><rect x="84" y="55" width="21" height="14" rx="6.5" fill="#99f6e4" fillOpacity=".55" stroke="#0f766e" strokeWidth="2.6" />
        <path d="M76 61 H84" stroke="#0f766e" strokeWidth="2.6" /><path d="M59 59 q3 -2 7 -1.4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </g>
    </g>
  </g>
);

/* ═════════════ PROF. RAFA · genetista / breeder (joven) ═════════════ */
export const Rafa: FigureV2 = (p) => (
  <g className="v2-tilt">
    <Shadow />
    <g className="v2-breath">
      <Torso fill="url(#v2Burg)" shade="#2a0716" rim="#f0a0bb" />
      {/* open bomber over a lime tee with a little helix */}
      <path d="M62 116 L80 156 L98 116 Q80 128 62 116Z" fill="#bef264" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M76 132 q8 4 0 8 q-8 4 0 8" stroke="#3f6212" strokeWidth="2" fill="none" strokeLinecap="round" /><path d="M84 132 q-8 4 0 8 q8 4 0 8" stroke="#65a30d" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M62 116 L72 158 M98 116 L88 158" stroke="#3b0c20" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M56 146 L52 194 M104 146 L108 194" stroke="#3b0c20" strokeWidth="1.6" opacity=".5" />
      <rect x="44" y="164" width="20" height="16" rx="2.5" fill="#7a1d3b" stroke={OUTLINE} strokeWidth="1.4" /><rect x="96" y="164" width="20" height="16" rx="2.5" fill="#7a1d3b" stroke={OUTLINE} strokeWidth="1.4" />
      <g className="v2-arm-l v2-arm-wl" style={{ transformOrigin: '42px 130px' }}>
        <Tube d="M42 130 Q34 154 46 168" outer={16.5} inner={12.4} fill="#9b2c50" light="#e79ab5" />
        <Hand x={46} y={171} fill="url(#v2SkinPale)" edge="#8a5a3c" />
      </g>
      <g className="v2-arm-r v2-arm-hold" style={{ transformOrigin: '120px 128px' }}>
        <Tube d="M120 128 Q140 130 145 110" outer={16.5} inner={12.4} fill="#9b2c50" light="#e79ab5" />
        <Jar x={148} y={92} s={1.08} content="seeds" />
        <Hand x={144} y={107} fill="url(#v2SkinPale)" edge="#8a5a3c" />
      </g>
      <Dna x={136} y={42} s={0.85} />
      <g className="v2-head">
        <HeadBase skin="url(#v2SkinPale)" ear="#efc3a5" edge="#8a5a3c" />
        {/* short stubble beard and a light moustache */}
        <path d="M52 92 Q52 118 80 121 Q108 118 108 92 Q102 109 80 111 Q58 109 52 92Z" fill="#4a2f1a" opacity=".55" />
        <Face {...p} iris="#2f6f8f" brow="#3b2414" nose="#c58f6c" cheek="#f08a8a" browW={7.5} />
        <path d="M67 100 Q80 95 93 100 Q87 104 80 103 Q73 104 67 100Z" fill="#3b2414" opacity=".8" />
        {/* round glasses */}
        <g fill="#bfe6f5" fillOpacity=".2" stroke="#1f2937" strokeWidth="2.8"><circle cx="68" cy="87" r="10.5" /><circle cx="92" cy="87" r="10.5" /></g>
        <path d="M78.5 86 Q80 84 81.5 86" stroke="#1f2937" strokeWidth="2.4" fill="none" /><path d="M57.5 86 L50 84 M102.5 86 L110 84" stroke="#1f2937" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M61 82 q3 -3 7 -3" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".8" />
        {/* dark curly quiff with an undercut */}
        <g fill="url(#v2HairDark)" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round">
          <path d="M49 78 Q46 46 80 43 Q114 46 111 78 Q104 60 82 62 Q60 60 49 78Z" />
          <circle cx="64" cy="46" r="9" /><circle cx="80" cy="40" r="10" /><circle cx="97" cy="45" r="9" /><circle cx="108" cy="56" r="7" />
          <path d="M49 76 Q45 92 50 102 Q55 90 54 78Z" /><path d="M111 76 Q115 92 110 102 Q105 90 106 78Z" />
        </g>
      </g>
    </g>
  </g>
);

/* ═════════════ MARTA · dispensaria / budtender ═════════════ */
export const Marta: FigureV2 = (p) => (
  <g className="v2-tilt">
    <Shadow />
    <g className="v2-breath">
      <Torso fill="url(#v2Polo)" shade="#000" rim="#9ca3af" />
      <path d="M60 116 L80 132 L100 116 L96 112 Q80 122 64 112Z" fill="#e5e7eb" stroke={OUTLINE} strokeWidth="1.8" strokeLinejoin="round" />
      {/* teal apron with the shop's leaf */}
      <g strokeLinecap="round" fill="none"><path d="M60 146 L64 122 M100 146 L96 122" stroke={OUTLINE} strokeWidth="8" /><path d="M60 146 L64 122 M100 146 L96 122" stroke="#14a394" strokeWidth="4.6" /></g>
      <path d="M52 194 L57 144 Q80 152 103 144 L108 194Z" fill="url(#v2Teal)" stroke="#0a4f49" strokeWidth="2" strokeLinejoin="round" />
      <path d="M52 194 L57 144 Q80 152 80 152 L80 194Z" fill="#fff" opacity=".1" />
      <circle cx="80" cy="170" r="12" fill="#0a4f49" stroke={OUTLINE} strokeWidth="1.6" /><Leaf x={80} y={176} s={0.52} light="#d9f99d" dark="#84cc16" />
      <rect x="94" y="148" width="14" height="9" rx="2" fill="#fff" stroke={OUTLINE} strokeWidth="1.3" /><path d="M96.5 152.5 h9" stroke="#94a3b8" strokeWidth="1.4" />
      <g className="v2-arm-l v2-arm-wl" style={{ transformOrigin: '42px 130px' }}>
        <Tube d="M42 130 Q34 154 46 168" outer={16.5} inner={12.4} fill="#2b3444" light="#8892a3" />
        <Hand x={46} y={171} fill="url(#v2SkinTan)" />
      </g>
      <g className="v2-arm-r v2-arm-hold" style={{ transformOrigin: '120px 128px' }}>
        <Tube d="M120 128 Q140 130 145 110" outer={16.5} inner={12.4} fill="#2b3444" light="#8892a3" />
        <Jar x={148} y={92} s={1.08} />
        <Hand x={144} y={107} fill="url(#v2SkinTan)" />
      </g>
      <g className="v2-head">
        <circle cx="100" cy="42" r="13" fill="url(#v2HairDark)" stroke={OUTLINE} strokeWidth="2" />
        <path d="M92 36 Q100 32 108 40" stroke="#ec4899" strokeWidth="4.6" fill="none" strokeLinecap="round" />
        <HeadBase skin="url(#v2SkinTan)" ear="#dca877" earring="#a3e635" />
        <Face {...p} iris="#4a2a18" lashes cheek="#f0708a" mouthS={0.9} />
        {/* dark hair pulled up with a magenta streak, and a pre-roll behind the ear */}
        <path d="M48 88 Q42 46 80 44 Q118 46 112 88 Q104 64 86 64 Q64 66 48 88Z" fill="url(#v2HairDark)" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M60 60 Q72 52 86 56" stroke="#ec4899" strokeWidth="4.2" fill="none" strokeLinecap="round" />
        <PreRoll x={108} y={82} rot={-32} />
      </g>
    </g>
  </g>
);

/* ═════════════ NICO · capataz de la sala de cultivo ═════════════
   Hard hat with a leaf sticker, hi-vis vest with reflective stripes, headset, and a checklist on a clipboard. */
export const Nico: FigureV2 = (p) => (
  <g className="v2-tilt">
    <Shadow />
    <g className="v2-breath">
      <Torso fill="#3d4a5c" shade="#000" rim="#94a3b8" />
      {/* hi-vis vest with reflective bands */}
      <path d="M38 194 L44 138 Q56 130 68 140 L64 194Z" fill="#f97316" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M122 194 L116 138 Q104 130 92 140 L96 194Z" fill="#f97316" stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M40.5 172 L64.6 172 M39.4 184 L64.4 184 M119.5 172 L95.4 172 M120.6 184 L95.6 184" stroke="#e5e7eb" strokeWidth="4" strokeLinecap="round" />
      <path d="M44 172 L64 172 M43 184 L64 184 M116 172 L96 172 M117 184 L96 184" stroke="#fff" strokeOpacity=".7" strokeWidth="1.2" />
      <path d="M62 118 Q80 148 98 118" stroke="#1f2937" strokeWidth="2.6" fill="none" />
      {/* left arm: work glove */}
      <g className="v2-arm-l v2-arm-wl" style={{ transformOrigin: '42px 130px' }}>
        <Tube d="M42 130 Q34 154 46 168" outer={16.5} inner={12.4} fill="#3d4a5c" light="#94a3b8" />
        <Hand x={46} y={171} fill="#f5c542" edge="#7a5a10" r={7} />
      </g>
      {/* right arm holds the checklist */}
      <g className="v2-arm-r v2-arm-hold" style={{ transformOrigin: '120px 128px' }}>
        <Tube d="M120 128 Q140 130 145 110" outer={16.5} inner={12.4} fill="#3d4a5c" light="#94a3b8" />
        <Clipboard x={147} y={90} s={1.02} rot={10} />
        <Hand x={144} y={108} fill="url(#v2SkinBrown)" edge="#5a3520" r={6.6} />
      </g>
      <g className="v2-head">
        <HeadBase skin="url(#v2SkinBrown)" ear="#b9805a" edge="#5a3520" />
        <Face {...p} iris="#2b1a0e" brow="#1a1009" nose="#8a5a3a" cheek="#e0705a" mouthS={0.9} browW={7.5} />
        {/* short black hair, sideburns and a tidy goatee */}
        <path d="M49 74 Q45 90 50 100 Q55 88 54 76Z" fill="url(#v2HairDark)" stroke={OUTLINE} strokeWidth="1.4" /><path d="M111 74 Q115 90 110 100 Q105 88 106 76Z" fill="url(#v2HairDark)" stroke={OUTLINE} strokeWidth="1.4" />
        <path d="M70 112 Q80 122 90 112 Q88 118 80 120 Q72 118 70 112Z" fill="#1a1009" opacity=".85" />
        <path d="M66 100 Q80 96 94 100 Q88 103 80 102 Q72 103 66 100Z" fill="#1a1009" opacity=".8" />
        {/* headset */}
        <path d="M49 84 Q46 52 80 50 Q114 52 111 84" stroke="#111827" strokeWidth="3.6" fill="none" strokeLinecap="round" />
        <rect x="43" y="80" width="9" height="16" rx="4" fill="#1f2937" stroke={OUTLINE} strokeWidth="1.8" /><rect x="108" y="80" width="9" height="16" rx="4" fill="#1f2937" stroke={OUTLINE} strokeWidth="1.8" />
        <path d="M46 96 Q52 112 70 110" stroke="#111827" strokeWidth="2.2" fill="none" strokeLinecap="round" /><circle cx="70.5" cy="110" r="2.6" fill="#374151" stroke={OUTLINE} strokeWidth="1.2" />
        {/* hard hat */}
        <ellipse cx="80" cy="66" rx="44" ry="8" fill="#000" opacity=".16" />
        <path d="M49 66 Q48 30 80 28 Q112 30 111 66Z" fill="#facc15" stroke="#a16207" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M66 36 Q74 30 82 30 L82 64 L74 64 Q68 52 66 36Z" fill="#fde047" opacity=".9" />
        <path d="M76 30 Q80 28 84 30 L84 66 L76 66Z" fill="#eab308" stroke="#a16207" strokeWidth="1.4" />
        <path d="M100 42 Q108 50 108 62" stroke="#fff" strokeOpacity=".5" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M44 66 Q80 76 116 66 Q116 60 111 60 Q80 66 49 60 Q44 60 44 66Z" fill="#eab308" stroke="#a16207" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="94" cy="50" r="7" fill="#166534" stroke={OUTLINE} strokeWidth="1.6" /><Leaf x={94} y={54} s={0.42} light="#d9f99d" dark="#84cc16" />
      </g>
    </g>
  </g>
);
