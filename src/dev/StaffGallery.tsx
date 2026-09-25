import React, { useState } from 'react';
import { PremiumBust } from '../components/staff/premium/PremiumBust';
import { LOOKS } from '../components/staff/premium/looks';
import { staffArt3d, useNpcArt3d } from '../components/npc/art3d';
import { ROLE_INFO, STAFF_ROLES, VARIANT_TIER, type StaffRarity } from '../sim/staff';
import type { Mood2 } from '../components/npc/rig/parts';

const RAR: Array<{ r: StaffRarity; label: string }> = [{ r: 'common', label: 'Común' }, { r: 'common', label: 'Común' }, { r: 'rare', label: 'Rara' }, { r: 'rare', label: 'Rara' }, { r: 'epic', label: 'Épica' }, { r: 'legendary', label: 'Legendaria' }];
const COLOR: Record<StaffRarity, string> = { common: '#94a3b8', rare: '#38bdf8', epic: '#c084fc', legendary: '#fbbf24' };

/** #staff: the 36 characters of the staff NFTs, six per job, from a plain hire to a legend */
export const StaffGallery: React.FC = () => {
  const [mood, setMood] = useState<Mood2>('idle');
  const [animated, setAnimated] = useState(true);
  const art3d = useNpcArt3d();
  return (
    <div className="min-h-screen text-neutral-100 p-4 sm:p-8 space-y-8" style={{ background: 'radial-gradient(900px 500px at 15% -10%, rgba(167,139,250,.25), transparent 60%), #0a0716' }}>
      <header className="max-w-[1400px] mx-auto space-y-3">
        <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-lime-300">Personal NFT · galería</p>
        <h1 className="font-serif text-4xl font-black">36 personajes, seis por oficio</h1>
        <p className="text-neutral-400 max-w-2xl text-sm">Cada oficio tiene dos diseños comunes, dos raros, uno épico y uno legendario. A más rareza, más equipo, más adornos y más efectos alrededor.</p>
        <div className="flex flex-wrap gap-2">
          {(['idle', 'happy', 'sad', 'busy', 'think'] as Mood2[]).map((m) => <button key={m} onClick={() => setMood(m)} className={`px-3 py-1 rounded-lg border text-xs font-mono ${mood === m ? 'bg-lime-300 text-neutral-950 border-lime-200' : 'border-white/15 text-neutral-300'}`}>{m}</button>)}
          <button onClick={() => setAnimated((v) => !v)} className="px-3 py-1 rounded-lg border border-white/15 text-xs font-mono text-neutral-300">{animated ? 'animado' : 'estático'}</button>
        </div>
      </header>
      {STAFF_ROLES.map((role) => (
        <section key={role} className="max-w-[1400px] mx-auto" data-role={role}>
          <h2 className="font-serif text-xl font-black mb-3 text-amber-200">{ROLE_INFO[role].label} <span className="text-xs font-mono text-neutral-500">· {ROLE_INFO[role].place}</span></h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {LOOKS[role].map((look, v) => (
              <figure key={v} className="rounded-2xl overflow-hidden border" style={{ borderColor: `${COLOR[RAR[v].r]}88`, boxShadow: `0 0 26px -10px ${COLOR[RAR[v].r]}` }}>
                <div className="relative aspect-[4/5] bg-black">{art3d && staffArt3d(role, v) ? <img className="staff3d" src={staffArt3d(role, v)!} alt="" /> : <PremiumBust role={role} variant={v} rarity={RAR[v].r} mood={mood} animated={animated} seed={v + 3} />}</div>
                <figcaption className="px-3 py-2 bg-black/50">
                  <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: COLOR[RAR[v].r] }}>◆ {RAR[v].label} · #{v}</div>
                  <div className="text-sm font-bold">{look.title}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      ))}
      <p className="max-w-[1400px] mx-auto text-[11px] font-mono text-neutral-500">Diseños por rareza: {Object.entries(VARIANT_TIER).map(([r, v]) => `${r} → ${v.join(', ')}`).join(' · ')}</p>
    </div>
  );
};
