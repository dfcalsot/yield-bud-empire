import React from 'react';
import type { Look } from './looks';
import type { StaffRarity } from '../../../sim/staff';

/** hair, headgear, eyewear and beards of the premium bust. Coordinates are the bust's 240×300 canvas. */
type LP = { id: string; look: Look };
const g = (id: string, n: string) => `url(#${id}${n})`;

/** a few soft highlight strands over a hair mass */
const Strands: React.FC<{ d: string; color: string; op?: number }> = ({ d, color, op = 0.5 }) => <path d={d} stroke={color} strokeWidth="1.3" strokeLinecap="round" fill="none" opacity={op} />;

export const Hair: React.FC<LP & { layer: 'back' | 'front' }> = ({ id, look, layer }) => {
  const f = g(id, 'hair'), hl = look.hairColor[1];
  const style = look.hair;
  if (style === 'none') return null;
  if (layer === 'back') {
    switch (style) {
      case 'wavy': return <path d="M76 100 C64 132 70 152 82 158 L92 120Z M164 100 C176 132 170 152 158 158 L148 120Z" fill={f} />;
      case 'long': return <path d="M72 90 C58 142 60 192 76 218 L106 202 L104 120Z M168 90 C182 142 180 192 164 218 L134 202 L136 120Z" fill={f} />;
      case 'afro': return <g><ellipse cx="120" cy="84" rx="66" ry="60" fill={f} /><Strands d="M70 70 C80 50 100 42 120 40" color={hl} /><Strands d="M120 40 C146 42 164 56 172 76" color={hl} op={0.35} /></g>;
      case 'curly': return <g fill={f}>{[[78, 96], [70, 112], [76, 130], [162, 96], [170, 112], [164, 130]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="11" />)}</g>;
      case 'braid': return <g fill={f}>{Array.from({ length: 9 }, (_, i) => <ellipse key={i} cx={78 - i * 1.2} cy={128 + i * 12} rx="8.5" ry="7.5" transform={`rotate(${i % 2 ? 14 : -14} ${78 - i * 1.2} ${128 + i * 12})`} />)}<circle cx="70" cy="238" r="5" fill="#c94a7a" /></g>;
      case 'dreads': return <g stroke={f} strokeWidth="9" strokeLinecap="round" fill="none">{[[80, 90, 66, 200], [86, 96, 76, 220], [92, 100, 90, 226], [160, 90, 174, 200], [154, 96, 164, 220], [148, 100, 150, 226], [74, 84, 58, 176], [166, 84, 182, 176]].map(([x1, y1, x2, y2], i) => <path key={i} d={`M${x1} ${y1} C${x1 - 8} ${(y1 + y2) / 2} ${x2 + 6} ${(y1 + y2) / 2 + 10} ${x2} ${y2}`} />)}</g>;
      default: return null;
    }
  }
  // front layer
  const short = 'M78 106 C72 70 96 50 120 50 C148 50 168 70 162 106 C158 90 150 80 138 76 C126 84 110 84 100 76 C90 80 82 92 78 106Z';
  switch (style) {
    case 'buzz': return <path d="M80 100 C78 72 98 56 120 56 C142 56 162 72 160 100 C156 86 148 78 120 74 C92 78 84 86 80 100Z" fill={f} opacity=".78" />;
    case 'short': return <g><path d={short} fill={f} /><Strands d="M96 62 C108 56 124 54 140 60" color={hl} /><Strands d="M88 76 C94 68 104 64 112 62" color={hl} op={0.35} /></g>;
    case 'slick': return <g><path d="M78 106 C72 68 98 48 126 48 C152 48 170 70 162 106 C158 84 146 72 124 70 C104 72 88 84 78 106Z" fill={f} /><Strands d="M92 66 C108 56 130 54 150 62" color={hl} op={0.6} /><Strands d="M88 74 C104 64 128 62 152 72" color={hl} op={0.4} /></g>;
    case 'wavy': return <g><path d="M74 114 C66 70 92 46 122 48 C152 48 172 72 166 114 C162 92 150 78 138 74 C124 84 108 84 96 76 C84 84 78 96 74 114Z" fill={f} /><Strands d="M88 60 C100 50 118 46 134 50" color={hl} /><Strands d="M96 70 C110 60 128 60 146 68" color={hl} op={0.4} /></g>;
    case 'long': return <g><path d="M76 110 C68 70 96 50 122 50 C150 50 172 72 164 110 C158 88 140 76 122 74 C104 76 84 88 76 110Z" fill={f} /><Strands d="M90 62 C104 54 124 52 144 60" color={hl} /></g>;
    case 'bun': return <g><path d={short} fill={f} /><circle cx="120" cy="44" r="16" fill={f} /><circle cx="114" cy="38" r="6" fill={hl} opacity=".4" /><rect x="106" y="56" width="28" height="4" rx="2" fill={look.gearColor?.[0] ?? '#c94a7a'} opacity=".9" /></g>;
    case 'braid': return <g><path d="M78 106 C72 68 98 48 126 48 C152 48 170 70 162 106 C158 84 146 72 124 70 C104 72 88 84 78 106Z" fill={f} /><Strands d="M92 64 C108 56 128 54 148 62" color={hl} op={0.55} /></g>;
    case 'dreads': return <g><path d="M78 106 C72 66 98 46 122 46 C150 46 170 68 162 106 C156 84 142 72 122 70 C102 72 86 84 78 106Z" fill={f} />{[92, 104, 116, 128, 140].map((x, i) => <path key={x} d={`M${x} ${58 + (i % 2) * 3} C${x + 3} 66 ${x - 2} 74 ${x + 2} 82`} stroke={hl} strokeWidth="1.2" fill="none" opacity=".45" />)}</g>;
    case 'afro': return <path d="M76 104 C72 74 96 58 120 58 C146 58 168 74 164 104 C158 88 148 80 138 76 C126 84 110 84 100 76 C90 80 82 90 76 104Z" fill={f} />;
    case 'curly': return <g fill={f}><path d="M78 106 C72 72 96 54 120 54 C148 54 168 72 162 106 C158 90 150 80 120 78 C90 80 82 90 78 106Z" />{[[84, 74], [98, 62], [114, 56], [130, 56], [146, 62], [158, 74], [90, 86], [152, 86]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="9" />)}<circle cx="106" cy="64" r="3.2" fill={hl} opacity=".5" /><circle cx="138" cy="66" r="3" fill={hl} opacity=".45" /></g>;
    default: return null;
  }
};

/** headgear. `back` is what sits behind the head (a hood), `front` what sits on it */
export const Gear: React.FC<LP & { layer: 'back' | 'front'; rarity?: StaffRarity }> = ({ id, look, layer, rarity }) => {
  const gear = look.gear;
  const c = g(id, 'gear'), a = look.gearColor?.[0] ?? '#ddd', b = look.gearColor?.[1] ?? '#888';
  if (gear === 'none') return null;
  if (layer === 'back') {
    if (gear === 'hood') return <path d="M56 214 C42 130 66 40 120 40 C174 40 198 130 184 214Z" fill={c} />;
    return null;
  }
  switch (gear) {
    case 'hardhat': return (
      <g>
        <ellipse cx="120" cy="96" rx="52" ry="9" fill="#000" opacity=".18" />
        <path d="M76 92 C76 60 98 44 120 44 C142 44 164 60 164 92 L164 98 L76 98Z" fill={c} />
        <path d="M84 84 C86 62 102 52 116 50" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".45" />
        <path d="M112 44 L128 44 L130 98 L110 98Z" fill={b} opacity=".55" /><path d="M66 98 L174 98 C174 104 164 107 150 107 L90 107 C76 107 66 104 66 98Z" fill={c} /><path d="M66 98 L174 98" stroke={b} strokeWidth="2" />
        <circle cx="140" cy="76" r="7" fill="#1f6a3a" opacity=".9" /><path d="M140 82 L140 70 M140 76 L135 72 M140 76 L145 72" stroke="#d9f99d" strokeWidth="1.4" strokeLinecap="round" />
      </g>);
    case 'cap': return (
      <g>
        <path d="M78 96 C78 62 100 48 120 48 C142 48 162 62 162 96 C140 88 100 88 78 96Z" fill={c} />
        <path d="M84 84 C90 66 104 58 118 56" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".35" />
        <path d="M84 94 C104 104 146 104 178 96 C172 110 132 112 96 106Z" fill={b} /><circle cx="120" cy="49" r="3.4" fill={b} />
        <circle cx="120" cy="74" r="8" fill="#0d3a26" opacity=".85" /><path d="M120 79 L120 68 M120 74 L115 70 M120 74 L125 70" stroke="#d9f99d" strokeWidth="1.3" strokeLinecap="round" />
      </g>);
    case 'strawhat': return (
      <g>
        <ellipse cx="120" cy="90" rx="80" ry="15" fill={c} /><ellipse cx="120" cy="90" rx="80" ry="15" fill="none" stroke={b} strokeWidth="1.4" />
        {[-60, -30, 0, 30, 60].map((dx) => <path key={dx} d={`M${120 + dx} 78 Q${120 + dx * 1.2} 90 ${120 + dx} 104`} stroke={b} strokeWidth=".9" opacity=".4" fill="none" />)}
        <path d="M84 88 C84 56 156 56 156 88Z" fill={c} /><path d="M84 88 L156 88 L156 80 L84 80Z" fill={look.colors[0]} opacity=".85" /><path d="M92 70 C98 62 112 60 122 60" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity=".4" />
      </g>);
    case 'beanie': return (
      <g>
        <path d="M80 92 C78 60 100 46 120 46 C140 46 162 60 160 92 C140 84 100 84 80 92Z" fill={c} />
        <rect x="76" y="82" width="88" height="17" rx="8" fill={b} />{Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${84 + i * 9} 83 L${84 + i * 9} 98`} stroke="#000" strokeWidth=".8" opacity=".22" />)}
        <circle cx="120" cy="44" r="6" fill={b} /><path d="M92 62 C100 54 112 52 122 52" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity=".35" />
      </g>);
    case 'kerchief': return (
      <g>
        <path d="M76 96 C88 66 152 66 164 96 C150 88 90 88 76 96Z" fill={c} />
        {[[92, 82], [110, 76], [130, 76], [148, 82], [100, 88], [140, 88]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" fill="#fff" opacity=".8" />)}
        <path d="M162 92 L182 84 L176 102 Z M162 92 L184 100 L172 108Z" fill={b} /><circle cx="162" cy="93" r="5" fill={b} />
      </g>);
    case 'headset': return (
      <g>
        <path d="M78 118 C74 46 166 46 162 118" stroke={b} strokeWidth="6" fill="none" strokeLinecap="round" /><path d="M80 112 C80 54 160 54 160 112" stroke={c} strokeWidth="2" fill="none" opacity=".6" />
        <rect x="68" y="102" width="14" height="30" rx="7" fill={c} /><rect x="158" y="102" width="14" height="30" rx="7" fill={c} /><rect x="70" y="106" width="4" height="22" rx="2" fill="#fff" opacity=".3" />
        <path d="M162 130 C164 148 148 154 132 152" stroke={b} strokeWidth="3" fill="none" strokeLinecap="round" /><circle cx="131" cy="152" r="4" fill={c} />
      </g>);
    case 'helmet': return (
      <g>
        <path d="M74 104 C72 62 98 42 120 42 C142 42 168 62 166 104 L160 104 C158 72 140 56 120 56 C100 56 82 72 80 104Z" fill={c} />
        <path d="M108 42 L132 42 L128 58 L112 58Z" fill={b} /><path d="M120 44 L120 58" stroke="#22d3ee" strokeWidth="1.6" opacity=".9" />
        <path d="M82 96 C84 74 100 60 118 58" stroke="#fff" strokeWidth="2" fill="none" opacity=".4" /><path d="M74 104 L84 104 L88 116 L74 116Z M166 104 L156 104 L152 116 L166 116Z" fill={b} />
        <path d="M76 100 L86 100 M164 100 L154 100" stroke="#22d3ee" strokeWidth="1.6" opacity=".9" />
      </g>);
    case 'crown': return (
      <g>
        <path d="M82 76 L88 44 L104 66 L120 36 L136 66 L152 44 L158 76Z" fill={c} stroke={b} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M84 76 L156 76 L156 84 L84 84Z" fill={c} /><path d="M84 76 L156 76" stroke="#fff" strokeWidth="1.2" opacity=".6" />
        {[[88, 46, '#f43f5e'], [120, 38, '#38bdf8'], [152, 46, '#34d399']].map(([x, y, col], i) => <circle key={i} cx={x as number} cy={y as number} r="4.2" fill={col as string} stroke="#fff" strokeWidth=".8" />)}
        {[100, 120, 140].map((x, i) => <circle key={x} cx={x} cy="80" r="2.6" fill={['#f43f5e', '#fff', '#38bdf8'][i]} />)}
        <path d="M90 60 L98 74 M120 46 L120 70 M150 60 L142 74" stroke="#fff" strokeWidth="1" opacity=".5" />
        {rarity === 'legendary' && <path d="M84 84 C100 90 140 90 156 84" stroke="#fff2b0" strokeWidth="1.5" fill="none" opacity=".7" />}
      </g>);
    case 'hood': return (
      <g>
        <path d="M70 116 C70 76 92 58 120 58 C148 58 170 76 170 116 C160 88 144 76 120 76 C96 76 80 88 70 116Z" fill={c} />
        <path d="M76 100 C84 80 100 70 120 70" stroke="#fff" strokeWidth="2" fill="none" opacity=".25" />
      </g>);
    case 'laurel': return (
      <g>
        {[0, 1, 2, 3, 4, 5, 6].flatMap((i) => [-1, 1].map((s) => {
          const t = i / 6, x = 120 + s * (48 - t * 6) * Math.cos(t * 1.25) , y = 104 - t * 52 * Math.sin(1.1 + t * 0.5) - t * 4;
          return <ellipse key={`${i}${s}`} cx={x} cy={y} rx="9" ry="4.2" fill={i % 2 ? b : c} transform={`rotate(${s * (-40 + t * 84)} ${x} ${y})`} stroke="#fff" strokeOpacity=".25" strokeWidth=".6" />;
        }))}
        <circle cx="120" cy="52" r="4" fill={c} stroke="#fff" strokeOpacity=".5" strokeWidth=".8" />
      </g>);
    case 'goggleshead': return (
      <g>
        <rect x="74" y="80" width="92" height="9" rx="4" fill="#20303a" />
        {[104, 136].map((cx) => <g key={cx}><circle cx={cx} cy="76" r="13" fill="#20303a" /><circle cx={cx} cy="76" r="10" fill={c} opacity=".85" /><path d={`M${cx - 6} ${72} A8 8 0 0 1 ${cx + 2} ${67}`} stroke="#fff" strokeWidth="1.6" fill="none" opacity=".7" strokeLinecap="round" /></g>)}
      </g>);
    case 'sunvisor': return (
      <g>
        <path d="M80 78 C100 70 140 70 160 78 L160 86 C140 80 100 80 80 86Z" fill={c} /><path d="M78 80 C100 90 140 90 182 82 C176 94 132 98 96 94 C86 90 80 86 78 80Z" fill={b} opacity=".95" />
      </g>);
    default: return null;
  }
};

export const Glasses: React.FC<LP & { animated?: boolean }> = ({ id, look, animated }) => {
  const gc = look.glassColor ?? '#2b3340', lens = g(id, 'glass');
  switch (look.glasses) {
    case 'round': return <g fill="none"><circle cx="100" cy="112" r="14" fill={lens} stroke={gc} strokeWidth="2.2" /><circle cx="140" cy="112" r="14" fill={lens} stroke={gc} strokeWidth="2.2" /><path d="M114 111 Q120 107 126 111 M86 110 L80 106 M154 110 L160 106" stroke={gc} strokeWidth="2" /></g>;
    case 'square': return <g fill="none"><rect x="85" y="103" width="29" height="20" rx="5" fill={lens} stroke={gc} strokeWidth="2.4" /><rect x="126" y="103" width="29" height="20" rx="5" fill={lens} stroke={gc} strokeWidth="2.4" /><path d="M114 110 L126 110 M85 108 L79 105 M155 108 L161 105" stroke={gc} strokeWidth="2.2" /></g>;
    case 'sun': return <g><path d="M84 104 L116 104 C116 120 106 126 98 126 C90 126 84 118 84 104Z M124 104 L156 104 C156 118 150 126 142 126 C134 126 124 120 124 104Z" fill={gc} /><path d="M88 106 L100 106 L92 118Z M128 106 L140 106 L132 118Z" fill="#fff" opacity=".28" /><path d="M116 106 L124 106 M84 105 L78 102 M156 105 L162 102" stroke="#111" strokeWidth="2.4" /></g>;
    case 'goggles': return <g><path d="M74 108 L166 108" stroke="#20303a" strokeWidth="7" strokeLinecap="round" />{[100, 140].map((cx) => <g key={cx}><circle cx={cx} cy="112" r="15" fill="#20303a" /><circle cx={cx} cy="112" r="12" fill={gc} opacity=".55" /><circle cx={cx} cy="112" r="12" fill={lens} /><path d={`M${cx - 7} 106 A9 9 0 0 1 ${cx + 1} 101`} stroke="#fff" strokeWidth="1.8" fill="none" opacity=".8" strokeLinecap="round" /></g>)}</g>;
    case 'monocle': return <g fill="none"><circle cx="140" cy="112" r="15" fill={lens} stroke={gc} strokeWidth="2.4" /><path d="M152 122 C160 140 156 158 150 176" stroke={gc} strokeWidth="1.2" opacity=".85" /><path d="M134 106 A9 9 0 0 1 142 102" stroke="#fff" strokeWidth="1.6" opacity=".8" strokeLinecap="round" /></g>;
    case 'cyber': return <g><circle cx="140" cy="112" r="14" fill="#0e131a" stroke={gc} strokeWidth="2" /><circle cx="140" cy="112" r="8" fill="none" stroke={gc} strokeWidth="1.2" opacity=".8" /><circle cx="140" cy="112" r="3.6" fill={gc} className={animated ? 'pb-pulse' : ''} /><path d="M152 100 L160 92 M152 124 L160 132" stroke={gc} strokeWidth="1.4" opacity=".8" /><path d="M126 112 L154 112" stroke={gc} strokeWidth=".8" opacity=".4" /></g>;
    case 'visor': return <g><path d="M78 100 L162 100 C166 114 158 126 148 126 L92 126 C82 126 74 114 78 100Z" fill="#0d1620" /><path d="M82 104 L158 104 C160 114 154 122 146 122 L94 122 C86 122 80 114 82 104Z" fill={lens} /><path d="M82 104 L158 104" stroke={gc} strokeWidth="1.6" className={animated ? 'pb-pulse' : ''} /><path d="M92 108 L110 108 M128 118 L150 118" stroke="#fff" strokeWidth="1.2" opacity=".6" /></g>;
    default: return null;
  }
};

export const BeardLayer: React.FC<LP> = ({ look }) => {
  const col = look.beardColor ?? '#2a1f18';
  const jaw = 'M82 122 C84 152 100 172 120 172 C140 172 156 152 158 122 C152 142 140 150 120 150 C100 150 88 142 82 122Z';
  const must = 'M100 140 C108 134 114 138 120 140 C126 138 132 134 140 140 C134 148 126 144 120 145 C114 144 106 148 100 140Z';
  switch (look.beard) {
    case 'stubble': return <path d="M82 124 C84 154 100 174 120 174 C140 174 156 154 158 124 C150 146 138 158 120 158 C102 158 90 146 82 124Z" fill={col} opacity=".3" />;
    case 'mustache': return <path d={must} fill={col} />;
    case 'goatee': return <g fill={col}><path d={must} /><path d="M108 156 C112 168 128 168 132 156 C126 160 114 160 108 156Z" /></g>;
    case 'full': return <g fill={col}><path d={jaw} /><path d={must} /><path d="M108 156 C112 166 128 166 132 156Z" opacity=".9" /><path d="M96 154 C104 162 112 164 120 164" stroke="#fff" strokeWidth="1" fill="none" opacity=".16" /></g>;
    default: return null;
  }
};
