import React from 'react';
import type { Look } from './looks';
import type { StaffRarity } from '../../../sim/staff';

/** the torso of the bust: the garments (with their trim, folds and, on epic and legendary hires, glowing or golden details) and the prop held low right */
const TORSO = 'M14 300 C18 236 54 204 96 194 L144 194 C186 204 222 236 226 300Z';
const g = (id: string, n: string) => `url(#${id}${n})`;

export const Outfit: React.FC<{ id: string; look: Look; rarity: StaffRarity }> = ({ id, look, rarity }) => {
  const [a, b, c] = look.colors;
  const trim = rarity === 'legendary' ? g(id, 'gold') : rarity === 'epic' ? (look.glow ?? c) : c;
  const glow = look.glow;
  const shade = <path d="M150 196 C190 208 222 238 226 300 L178 300 C176 250 166 214 150 196Z" fill="#000" opacity=".22" />;
  const fold = (d: string) => <path d={d} stroke="#000" strokeWidth="1.4" fill="none" opacity=".18" />;
  let body: React.ReactNode;
  switch (look.outfit) {
    case 'tee': body = <g><path d={TORSO} fill={g(id, 'ga')} /><path d="M96 194 Q120 226 144 194 L138 190 Q120 212 102 190Z" fill={b} opacity=".9" />{fold('M60 250 C70 262 78 280 80 300')}{fold('M180 250 C170 262 162 280 160 300')}</g>; break;
    case 'labcoat': body = (
      <g><path d={TORSO} fill="#eef2f7" /><path d="M104 194 L120 252 L136 194Z" fill={a === '#f4f7fb' ? b : a} /><path d="M104 194 L120 252 L136 194Z" fill="#000" opacity=".12" />
        <path d="M92 198 L118 266 L104 300 L58 300 C58 250 74 214 92 198Z" fill="#f9fbfe" stroke={c} strokeWidth=".8" /><path d="M148 198 L122 266 L136 300 L182 300 C182 250 166 214 148 198Z" fill="#e6ebf2" stroke={c} strokeWidth=".8" />
        <path d="M92 198 L104 194 L116 232 L108 236Z M148 198 L136 194 L124 232 L132 236Z" fill="#fff" stroke={c} strokeWidth=".8" />
        <rect x="150" y="248" width="26" height="24" rx="3" fill="#f4f8fc" stroke={c} strokeWidth=".9" /><path d="M158 248 L158 240 M164 248 L164 238" stroke={b} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="76" cy="256" r="6" fill={b} opacity=".9" /><path d="M73 256 h6 M76 253 v6" stroke="#fff" strokeWidth="1.2" />{fold('M120 262 L120 300')}</g>); break;
    case 'hivis': body = (
      <g><path d={TORSO} fill={b} /><path d="M104 194 L120 224 L136 194Z" fill={c} opacity=".55" />
        <path d="M58 300 L76 220 L104 194 L114 300Z" fill={g(id, 'ga')} /><path d="M182 300 L164 220 L136 194 L126 300Z" fill={g(id, 'ga')} />
        {[248, 270].map((y) => <g key={y}><path d={`M${64 - (y - 248) * 0.1} ${y} L112 ${y} L112 ${y + 8} L${62 - (y - 248) * 0.1} ${y + 8}Z`} fill={c} opacity=".92" /><path d={`M${178 + (y - 248) * 0.1} ${y} L128 ${y} L128 ${y + 8} L${180 + (y - 248) * 0.1} ${y + 8}Z`} fill={c} opacity=".92" /></g>)}
        <path d="M120 232 L120 300" stroke="#000" strokeWidth="1.4" opacity=".4" /><path d="M104 194 L96 212 M136 194 L144 212" stroke="#000" strokeWidth="1.2" opacity=".3" />
        {glow && <path d="M70 222 L104 200 M170 222 L136 200" stroke={glow} strokeWidth="2" opacity=".85" filter={g(id, 'glow')} />}</g>); break;
    case 'flannel': body = (
      <g><path d={TORSO} fill={g(id, 'plaid')} /><path d={TORSO} fill="#000" opacity=".08" /><path d="M102 194 L120 232 L138 194Z" fill={c} opacity=".9" /><path d="M96 192 L108 204 L100 218 L86 198Z M144 192 L132 204 L140 218 L154 198Z" fill={g(id, 'plaid')} stroke="#000" strokeOpacity=".2" strokeWidth=".8" />
        {[240, 262, 284].map((y) => <circle key={y} cx="120" cy={y} r="2.6" fill={c} />)}{fold('M120 232 L120 300')}</g>); break;
    case 'apron': body = (
      <g><path d={TORSO} fill={c} /><path d="M92 214 L148 214 L156 300 L84 300Z" fill={g(id, 'ga')} /><path d="M92 214 L104 192 M148 214 L136 192" stroke={g(id, 'ga')} strokeWidth="6" strokeLinecap="round" /><path d="M92 214 L148 214" stroke="#000" strokeWidth="1.2" opacity=".25" />
        <rect x="100" y="256" width="40" height="22" rx="4" fill="#000" opacity=".16" /><rect x="100" y="254" width="40" height="22" rx="4" fill={g(id, 'ga')} stroke="#fff" strokeOpacity=".2" />
        <circle cx="120" cy="234" r="8" fill={b} opacity=".9" /><path d="M120 240 L120 228 M120 234 L115 230 M120 234 L125 230" stroke="#d9f99d" strokeWidth="1.4" strokeLinecap="round" /></g>); break;
    case 'hoodie': body = (
      <g><path d={TORSO} fill={g(id, 'ga')} /><path d="M90 196 C98 232 142 232 150 196 C152 214 142 230 120 232 C98 230 88 214 90 196Z" fill={b} /><path d="M104 226 L102 262 M136 226 L138 262" stroke={c} strokeWidth="2.4" strokeLinecap="round" /><circle cx="102" cy="264" r="2.4" fill={c} /><circle cx="138" cy="264" r="2.4" fill={c} />
        <path d="M70 290 C90 272 150 272 170 290" stroke="#000" strokeWidth="1.4" fill="none" opacity=".25" /></g>); break;
    case 'suit': body = (
      <g><path d={TORSO} fill={g(id, 'ga')} /><path d="M100 194 L120 262 L140 194Z" fill={c} /><path d="M120 214 L112 236 L120 264 L128 236Z" fill={b} />
        <path d="M92 198 L116 268 L98 300 L56 300 C56 250 72 214 92 198Z" fill={g(id, 'ga')} stroke="#000" strokeOpacity=".25" /><path d="M148 198 L124 268 L142 300 L184 300 C184 250 168 214 148 198Z" fill={g(id, 'ga')} stroke="#000" strokeOpacity=".25" />
        <path d="M92 198 L104 194 L118 236 L110 240Z M148 198 L136 194 L122 236 L130 240Z" fill="#000" opacity=".22" />
        <rect x="150" y="248" width="16" height="8" rx="1.6" fill="#fff" opacity=".85" /><circle cx="120" cy="280" r="2.4" fill={b} />{trim && <path d="M92 198 L116 268" stroke={trim} strokeWidth="1.3" opacity=".9" />}</g>); break;
    case 'coat': body = (
      <g><path d="M4 300 C8 232 50 200 96 192 L144 192 C190 200 232 232 236 300Z" fill={g(id, 'ga')} /><path d="M100 194 L120 250 L140 194Z" fill={b} />
        <path d="M84 196 C76 220 82 256 96 276 L118 268 L100 218Z M156 196 C164 220 158 256 144 276 L122 268 L140 218Z" fill={c} opacity=".92" />
        <path d="M84 196 C76 220 82 256 96 276" stroke="#fff" strokeOpacity=".3" strokeWidth="1.4" fill="none" />{[84, 76, 70, 66, 64].map((x, i) => <circle key={i} cx={x + i * 2} cy={206 + i * 14} r="2" fill="#fff" opacity=".35" />)}
        {glow && <path d="M20 270 C24 240 50 216 90 206 M220 270 C216 240 190 216 150 206" stroke={glow} strokeWidth="2" fill="none" opacity=".85" filter={g(id, 'glow')} />}</g>); break;
    case 'robe': body = (
      <g><path d="M6 300 C10 232 52 200 96 192 L144 192 C188 200 230 232 234 300Z" fill={g(id, 'ga')} /><path d="M98 194 L120 260 L142 194Z" fill={b} />
        <path d="M84 194 C88 230 106 262 120 270 C134 262 152 230 156 194" stroke={typeof trim === 'string' && trim.startsWith('url') ? '#f5c542' : trim} strokeWidth="5" fill="none" strokeLinecap="round" /><path d="M84 194 C88 230 106 262 120 270 C134 262 152 230 156 194" stroke="#fff" strokeOpacity=".45" strokeWidth="1.2" fill="none" />
        <path d="M14 262 C34 226 68 210 92 214 L84 246 C58 246 32 254 14 262Z M226 262 C206 226 172 210 148 214 L156 246 C182 246 208 254 226 262Z" fill={c} opacity=".85" stroke="#fff" strokeOpacity=".3" strokeWidth="1" />
        {[[40, 240], [60, 232], [180, 232], [200, 240], [70, 282], [170, 282]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.4" fill={rarity === 'legendary' ? '#fff2b0' : c} opacity=".9" />)}
        {glow && <path d="M100 284 L120 272 L140 284 M104 296 L120 286 L136 296" stroke={glow} strokeWidth="2" fill="none" opacity=".85" filter={g(id, 'glow')} />}</g>); break;
    case 'exo': body = (
      <g><path d={TORSO} fill={b} />
        <path d="M14 268 C20 222 50 200 92 204 L86 252 C60 252 34 258 14 268Z M226 268 C220 222 190 200 148 204 L154 252 C180 252 206 258 226 268Z" fill={g(id, 'ga')} stroke="#fff" strokeOpacity=".22" strokeWidth="1" />
        <path d="M94 208 L146 208 L152 268 L120 284 L88 268Z" fill={g(id, 'ga')} stroke="#fff" strokeOpacity=".25" strokeWidth="1" /><path d="M104 214 L120 232 L136 214" fill="none" stroke={c} strokeWidth="2" filter={g(id, 'glow')} opacity=".95" />
        <path d="M102 252 L120 264 L138 252 M106 270 L120 280 L134 270" stroke={c} strokeWidth="1.8" fill="none" opacity=".9" filter={g(id, 'glow')} />
        <path d="M32 236 L70 214 M208 236 L170 214" stroke={c} strokeWidth="1.8" opacity=".9" filter={g(id, 'glow')} /><circle cx="120" cy="222" r="3.4" fill={c} filter={g(id, 'glow')} /></g>); break;
    case 'dress': body = (
      <g><path d={TORSO} fill={g(id, 'ga')} /><path d="M92 194 C100 230 140 230 148 194 C150 214 138 244 120 250 C102 244 90 214 92 194Z" fill={look.skin === 'deep' ? '#6a3e28' : '#d9a880'} opacity=".9" /><path d="M92 194 C100 230 140 230 148 194" stroke={trim} strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M92 194 L84 300 M148 194 L156 300" stroke="#000" strokeOpacity=".14" strokeWidth="1.4" /><circle cx="120" cy="238" r="5" fill={g(id, 'gold')} stroke="#fff" strokeOpacity=".5" strokeWidth=".8" /><path d="M104 214 Q120 246 136 214" stroke={g(id, 'gold')} strokeWidth="1.2" fill="none" />
        <path d="M60 262 C80 252 100 274 120 268 C140 274 160 252 180 262" stroke={c} strokeWidth="2" fill="none" opacity=".7" /></g>); break;
    case 'overalls': body = (
      <g><path d={TORSO} fill={c} /><path d="M92 222 L148 222 L154 300 L86 300Z" fill={g(id, 'ga')} /><path d="M96 222 L106 192 M144 222 L134 192" stroke={g(id, 'ga')} strokeWidth="9" strokeLinecap="round" />
        <circle cx="98" cy="232" r="3.4" fill={b} /><circle cx="142" cy="232" r="3.4" fill={b} /><rect x="106" y="252" width="28" height="18" rx="3" fill="none" stroke={b} strokeWidth="1.6" opacity=".7" /><path d="M92 222 L148 222" stroke="#000" strokeWidth="1.2" opacity=".25" /></g>); break;
    default: body = <path d={TORSO} fill={g(id, 'ga')} />;
  }
  return <g>{body}{shade}</g>;
};

/** the prop each role carries, low right */
export const PropArt: React.FC<{ id: string; look: Look; rarity: StaffRarity; animated?: boolean }> = ({ id, look, rarity, animated }) => {
  const gold = rarity === 'legendary' ? g(id, 'gold') : '#cbd5e1';
  const glowC = look.glow ?? '#7cf2c8';
  let art: React.ReactNode = null;
  switch (look.prop) {
    case 'clipboard': art = <g><rect x="-16" y="-20" width="32" height="40" rx="3" fill="#8a5a2a" /><rect x="-13" y="-16" width="26" height="34" rx="1.6" fill="#fbf8ee" /><rect x="-7" y="-23" width="14" height="8" rx="2" fill={gold} />{[-8, 0, 8].map((y, i) => <g key={y}><rect x="-10" y={y - 2} width="4" height="4" rx=".8" fill="none" stroke="#64748b" strokeWidth=".9" />{i < 2 && <path d={`M-9.4 ${y} l1.2 1.4 l2.6 -3`} stroke="#16a34a" strokeWidth="1.2" fill="none" strokeLinecap="round" />}<path d={`M-3 ${y} h11`} stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" /></g>)}</g>; break;
    case 'tablet': art = <g><rect x="-18" y="-24" width="36" height="46" rx="4" fill="#161d27" stroke={gold} strokeWidth="1.2" /><rect x="-15" y="-21" width="30" height="40" rx="2" fill="#0c1a26" /><path d="M-11 6 L-5 -2 L1 3 L6 -8 L12 -3" stroke={glowC} strokeWidth="1.8" fill="none" strokeLinecap="round" filter={g(id, 'glow')} /><rect x="-11" y="-16" width="14" height="3" rx="1.5" fill="#fff" opacity=".5" /><rect x="-11" y="10" width="22" height="3" rx="1.5" fill={glowC} opacity=".55" /></g>; break;
    case 'flask': art = <g><path d="M-6 -22 h12 v12 l12 24 q4 10 -6 10 h-24 q-10 0 -6 -10 l12 -24Z" fill="#dff3ff" fillOpacity=".3" stroke="#fff" strokeOpacity=".7" strokeWidth="1.4" /><path d="M-14 8 q7 -5 14 0 q7 5 14 0 l4 8 q2 6 -5 6 h-26 q-7 0 -5 -6Z" fill={glowC} opacity=".9" filter={g(id, 'glow')} /><circle cx="-3" cy="14" r="2" fill="#fff" opacity=".7" className={animated ? 'pb-bub' : ''} /><circle cx="4" cy="11" r="1.4" fill="#fff" opacity=".6" className={animated ? 'pb-bub' : ''} style={{ animationDelay: '-.8s' }} /><rect x="-7" y="-26" width="14" height="5" rx="2" fill="#94a3b8" /></g>; break;
    case 'dna': art = <g><g className={animated ? 'pb-dna' : ''}><path d="M-9 -24 C9 -14 9 -6 -9 4 C-27 14 -9 22 -9 28 M9 -24 C-9 -14 -9 -6 9 4 C27 14 9 22 9 28" stroke={glowC} strokeWidth="2.6" fill="none" strokeLinecap="round" filter={g(id, 'glow')} />{[-18, -10, -2, 6, 14, 22].map((y) => <path key={y} d={`M-6 ${y} H6`} stroke="#fff" strokeWidth="1.4" opacity=".8" />)}</g></g>; break;
    case 'jar': art = <g><rect x="-14" y="-16" width="28" height="34" rx="6" fill="#bfe6f5" fillOpacity=".22" stroke="#fff" strokeOpacity=".7" strokeWidth="1.4" /><path d="M-11 16 q-5 -10 0 -16 q5 -5 8 1 q3 -7 8 0 q5 -2 8 5 q3 7 -2 10 q-10 4 -22 0Z" fill="#84cc16" stroke="#3f6212" strokeWidth="1" /><path d="M-6 12 q-3 -5 0 -8 q4 -2 6 1" fill="#bef264" /><rect x="-15" y="-22" width="30" height="8" rx="3" fill={gold} /><rect x="-10" y="-4" width="20" height="10" rx="2" fill="#fbf8ee" opacity=".9" /></g>; break;
    case 'sprout': art = <g><path d="M-14 20 h28 l-4 -14 h-20Z" fill="#a4632a" /><path d="M0 6 C0 -6 -2 -14 0 -22" stroke="#4ade80" strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M0 -12 C-14 -14 -18 -24 -14 -28 C-6 -26 -1 -20 0 -12Z M0 -8 C14 -10 18 -20 14 -24 C6 -22 1 -16 0 -8Z" fill="#86efac" stroke="#166534" strokeWidth=".8" /></g>; break;
    case 'coin': art = <g>{[12, 3, -6].map((y, i) => <g key={y}><path d={`M-16 ${y} v6 a16 5 0 0 0 32 0 v-6Z`} fill="#b8860b" /><ellipse cx="0" cy={y} rx="16" ry="5" fill={g(id, 'gold')} stroke="#fff" strokeOpacity=".5" strokeWidth=".7" />{i === 2 && <text x="0" y={y + 2} fontSize="6.5" fontWeight="900" textAnchor="middle" fill="#8a5a00">F</text>}</g>)}</g>; break;
    case 'shears': art = <g strokeLinecap="round" fill="none">{[['M0 0 L18 -26', 'M0 0 L26 -14', '#e2e8f0'], ['M0 0 L-9 14', 'M0 0 L-15 5', '#dc2626']].map(([a, b, col], k) => <g key={k}><path d={a} stroke="#0a0716" strokeWidth={k ? 6 : 5} /><path d={b} stroke="#0a0716" strokeWidth={k ? 6 : 5} /><path d={a} stroke={col} strokeWidth={k ? 3.6 : 2.6} /><path d={b} stroke={col} strokeWidth={k ? 3.6 : 2.6} /></g>)}<circle r="2.6" fill="#fbbf24" /></g>; break;
    case 'loupe': art = <g><circle cx="0" cy="-8" r="13" fill="#cfeaff" fillOpacity=".35" stroke={gold} strokeWidth="3.4" /><path d="M-7 -14 A9 9 0 0 1 2 -19" stroke="#fff" strokeWidth="1.8" fill="none" opacity=".85" strokeLinecap="round" /><path d="M9 2 L20 16" stroke="#6b4a2a" strokeWidth="5" strokeLinecap="round" /></g>; break;
    case 'molecule': art = <g filter={g(id, 'glow')}><path d="M0 -14 L12 -7 L12 7 L0 14 L-12 7 L-12 -7Z" fill={glowC} fillOpacity=".22" stroke={glowC} strokeWidth="1.8" /><path d="M0 -14 V-24 M12 7 L20 12 M-12 7 L-20 12" stroke={glowC} strokeWidth="1.6" />{[[0, -25, '#f472b6'], [21, 13, '#34d399'], [-21, 13, '#fbbf24']].map(([x, y, col], i) => <circle key={i} cx={x as number} cy={y as number} r="3.6" fill={col as string} />)}</g>; break;
    default: return null;
  }
  return <g transform="translate(184 254)" className={animated ? 'pb-float' : ''}><ellipse cx="0" cy="26" rx="20" ry="4" fill="#000" opacity=".22" />{art}</g>;
};
