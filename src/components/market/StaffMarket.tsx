import React, { useMemo, useState } from 'react';
import { Flame, Users } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { StaffCard } from '../staff/StaffCard';
import { MintCeremony } from '../MintCeremony';
import { StaffChestId, STAFF_CHESTS, hireFromBoard, jobBoard, type StaffNft } from '../../sim/staff';
import { dayIndexOf } from '../../sim/terroir';
import { RARITY_STYLE } from '../game/GameUI';

/**
 * Where hires come from. The job board offers a few common (sometimes rare) candidates a day at a fixed price; the recruitment
 * chests can bring anyone, with a guarantee so bad luck never lasts forever. Every hire is an NFT that then replaces the
 * character of its job (assign it in the briefcase, Plantilla tab).
 */
export const StaffMarket: React.FC<{ onSay: (text: string, mood: 'idle' | 'happy' | 'sad') => void; onOpenBag?: () => void }> = ({ onSay, onOpenBag }) => {
  const { staff, staffPity, floraBalance, hireCandidate, openStaffChest } = useGame();
  const [minted, setMinted] = useState<StaffNft | null>(null);
  const day = dayIndexOf(Date.now());
  const board = useMemo(() => jobBoard(day).filter((c) => !staff.some((s) => s.id === c.id)), [day, staff]);

  const hire = (id: string) => {
    const c = board.find((x) => x.id === id);
    if (!c) return;
    const h = hireCandidate(c);
    if (h) { setMinted(h); onSay(`¡Buen fichaje! ${h.name} sabe lo suyo.`, 'happy'); } else onSay('No te alcanza para ese fichaje, jefe.', 'sad');
  };
  const open = (id: StaffChestId) => {
    const h = openStaffChest(id);
    if (h) { setMinted(h); onSay(h.rarity === 'legendary' ? '¡Una estrella! ¡Esto no se ve todos los días!' : `Llega ${h.name}. A ver qué tal trabaja.`, 'happy'); } else onSay('Junta más $FLORA y volvemos con los cofres.', 'sad');
  };

  return (
    <div className="mk-panel p-3 sm:p-4 space-y-4" data-testid="staff-market">
      <div className="flex flex-wrap items-center gap-2">
        <Users className="w-5 h-5 text-sky-300" />
        <h3 className="font-serif text-base font-black tracking-[0.12em] uppercase text-sky-100">Personal NFT</h3>
        <span className="text-[11px] font-mono text-neutral-400">Sustituye a los personajes por profesionales con habilidades. Tienes {staff.length}. Cobran un sueldo diario que se quema.</span>
        {onOpenBag && <button type="button" onClick={onOpenBag} className="ml-auto text-[11px] font-mono text-sky-200 underline underline-offset-2 cursor-pointer hover:text-white">Asignar en el Maletín →</button>}
      </div>

      <section className="space-y-2">
        <h4 className="text-[11px] font-mono uppercase tracking-[0.18em] text-neutral-400">Bolsa de trabajo · candidatos de hoy</h4>
        {board.length === 0 && <p className="text-sm text-neutral-500 py-4 text-center">Hoy ya contrataste a todos. Mañana hay candidatos nuevos.</p>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {board.map((c) => {
            const preview = hireFromBoard(c, 0);
            const ok = floraBalance >= c.priceFlora;
            return (
              <StaffCard key={c.id} staff={preview} footer={
                <button type="button" className={`mk-buy !py-2.5 !text-[11px] ${ok ? '' : 'is-poor'}`} onClick={() => hire(c.id)} data-hire={c.id}>
                  <span className="mk-buy-shine" /><span>Contratar</span><span className="ml-auto flex items-center gap-1 font-mono"><Flame className="w-3.5 h-3.5" />{c.priceFlora}</span>
                </button>
              } />
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h4 className="text-[11px] font-mono uppercase tracking-[0.18em] text-neutral-400">Cofres de reclutamiento</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.values(STAFF_CHESTS)).map((ch) => {
            const p = staffPity[ch.id];
            const ok = floraBalance >= ch.priceFlora;
            return (
              <div key={ch.id} className="rounded-2xl border p-3.5 space-y-2" style={{ borderColor: `${ch.colors[0]}66`, background: `linear-gradient(160deg, ${ch.colors[1]}55, rgba(8,5,20,.9))` }}>
                <div className="flex items-center justify-between"><h5 className="font-serif font-black text-white">{ch.name}</h5><span className="text-2xl">🧰</span></div>
                <p className="text-[11.5px] text-neutral-300 leading-snug">{ch.blurb}</p>
                <div className="flex flex-wrap gap-1">
                  {(['common', 'rare', 'epic', 'legendary'] as const).filter((r) => ch.odds[r] > 0).map((r) => <span key={r} className="px-1.5 py-0.5 rounded-full text-[10px] font-mono border" style={{ color: RARITY_STYLE[r].color, borderColor: `${RARITY_STYLE[r].color}66` }}>{RARITY_STYLE[r].label} {ch.odds[r]}%</span>)}
                </div>
                <p className="text-[10.5px] font-mono text-neutral-400">Garantía: épico o mejor en {Math.max(1, ch.epicEvery - p.sinceEpic)} · legendario en {Math.max(1, ch.legendEvery - p.sinceLegend)}</p>
                <button type="button" className={`mk-buy !py-2.5 !text-[11px] ${ok ? '' : 'is-poor'}`} onClick={() => open(ch.id)} data-chest={ch.id}>
                  <span className="mk-buy-shine" /><span>Abrir cofre</span><span className="ml-auto flex items-center gap-1 font-mono"><Flame className="w-3.5 h-3.5" />{ch.priceFlora}</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {minted && (
        <MintCeremony card={{ id: minted.id, rarity: minted.rarity, color: RARITY_STYLE[minted.rarity].color }} variant="onchain" feeText="$FLORA quemados"
          render={(down) => <StaffCard staff={minted} faceDown={down} />} onClose={() => setMinted(null)} closeLabel="A trabajar" />
      )}
    </div>
  );
};
