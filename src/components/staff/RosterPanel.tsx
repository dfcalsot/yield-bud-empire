import React from 'react';
import { ArrowUp, Flame, Plus, UserMinus, Users } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { StaffCard, StaffPortrait, fmtStat } from './StaffCard';
import { CAPS, ROLE_INFO, STAFF_ROLES, STAT_LABEL, rankUpCost, wageOf, type StatId } from '../../sim/staff';
import { RARITY_STYLE } from '../game/GameUI';

/** The briefcase's "Plantilla" tab: who works where, what it costs a day, the bonuses in force, and the hires waiting on the bench. */
export const RosterPanel: React.FC<{ onHire: () => void }> = ({ onHire }) => {
  const { staff, staffAssign, staffMods, staffWagesPerDay, staffIn, assignStaff, rankUpStaff, floraBalance } = useGame();
  const active = (Object.keys(staffMods) as StatId[]).filter((k) => staffMods[k] > 0);
  const assignedIds = new Set(Object.values(staffAssign));
  const bench = staff.filter((s) => !assignedIds.has(s.id));

  if (staff.length === 0) {
    return (
      <div className="text-center py-10 space-y-3" data-testid="roster-empty">
        <span className="mx-auto grid place-items-center w-12 h-12 rounded-2xl bg-sky-400/10 border border-sky-300/30 text-sky-300"><Users className="w-6 h-6" /></span>
        <p className="text-sm font-semibold text-white">Aún no tienes personal NFT</p>
        <p className="text-xs text-neutral-400 max-w-xs mx-auto">Contrata profesionales en el Mercado: cada uno sustituye al personaje de su puesto y te da un bono, a cambio de un sueldo diario.</p>
        <button type="button" onClick={onHire} className="care-btn care-btn--gold mx-auto"><Plus className="w-4 h-4" />Ir a la bolsa de trabajo</button>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="roster">
      <div className="rounded-xl border border-white/10 bg-black/25 p-3 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono"><span className="text-neutral-400">Sueldos por día (se queman)</span><span className="text-amber-300 font-bold flex items-center gap-1"><Flame className="w-3 h-3" />{staffWagesPerDay} $FLORA</span></div>
        {active.length === 0 ? <p className="text-[11px] text-neutral-500">Ningún bono activo: asigna a alguien a su puesto.</p> : (
          <div className="flex flex-wrap gap-1.5">
            {active.map((k) => <span key={k} className="px-2 py-0.5 rounded-full border border-emerald-300/30 bg-emerald-400/10 text-[10.5px] font-mono text-emerald-100" title={`tope ${k === 'seedBonus' ? CAPS[k] : `${Math.round(CAPS[k] * 100)} %`}`}>{STAT_LABEL[k]} {fmtStat(k, staffMods[k])}</span>)}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-neutral-400">Puestos</h4>
        {STAFF_ROLES.map((role) => {
          const cur = staffIn(role);
          const candidates = staff.filter((s) => s.role === role && s.id !== cur?.staff.id);
          return (
            <div key={role} className="rounded-xl border border-white/10 bg-black/20 p-2.5 flex items-center gap-3" data-role-slot={role}>
              {cur ? <StaffPortrait staff={cur.staff} animated={false} className="w-12 h-14 rounded-lg border border-white/10 shrink-0" /> : <span className="grid place-items-center w-12 h-14 rounded-lg border border-dashed border-white/15 text-neutral-500 text-lg shrink-0">?</span>}
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">{ROLE_INFO[role].label} · {ROLE_INFO[role].place}</div>
                {cur ? (
                  <>
                    <div className="text-sm font-bold text-white truncate"><span style={{ color: RARITY_STYLE[cur.staff.rarity].color }}>◆</span> {cur.staff.name} <span className="text-[10px] font-mono text-neutral-400">rango {cur.staff.rank}</span></div>
                    <div className={`text-[10.5px] font-mono ${cur.working ? 'text-emerald-300' : 'text-rose-300'}`}>{cur.working ? 'Trabajando' : 'Sin pagar: no trabaja'} · {wageOf(cur.staff)} $FLORA/día</div>
                  </>
                ) : <div className="text-[12px] text-neutral-400">Vacante · el personaje base te ayuda gratis con consejos</div>}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {cur && <button type="button" onClick={() => assignStaff(role, null)} className="sr-btn !py-1 !text-[10.5px]" title="Quitar del puesto"><UserMinus className="w-3 h-3" />Quitar</button>}
                {candidates.slice(0, 1).map((c) => <button key={c.id} type="button" onClick={() => assignStaff(role, c.id)} className="sr-btn sr-btn--lime !py-1 !text-[10.5px]" data-assign={c.id}>{cur ? 'Cambiar' : 'Asignar'}</button>)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <h4 className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-neutral-400">Tu personal ({staff.length})</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {staff.map((s) => {
            const cost = rankUpCost(s);
            const on = assignedIds.has(s.id);
            return (
              <StaffCard key={s.id} staff={s} badge={on ? <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-neutral-950 text-[10px] font-black">EN EL PUESTO</span> : undefined}
                footer={
                  <div className="flex gap-1.5">
                    {!on && <button type="button" className="sr-btn sr-btn--lime flex-1 justify-center" onClick={() => assignStaff(s.role, s.id)}>Asignar</button>}
                    {cost !== null
                      ? <button type="button" className="sr-btn flex-1 justify-center" disabled={floraBalance < cost} onClick={() => rankUpStaff(s.id)} data-rankup={s.id} style={floraBalance < cost ? { opacity: 0.5 } : undefined}><ArrowUp className="w-3.5 h-3.5" />Rango · {cost}</button>
                      : <span className="flex-1 text-center text-[10.5px] font-mono text-amber-300 py-1.5">Rango máximo</span>}
                  </div>
                } />
            );
          })}
        </div>
        {bench.length === 0 && <p className="text-[11px] text-neutral-500">Todo tu personal está en su puesto.</p>}
        <button type="button" onClick={onHire} className="text-[11px] font-mono text-sky-200 underline underline-offset-2 cursor-pointer hover:text-white">Contratar más →</button>
      </div>
    </div>
  );
};
