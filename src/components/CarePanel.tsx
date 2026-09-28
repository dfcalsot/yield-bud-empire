import React from 'react';
import { Bug, Recycle, ShieldCheck, Sparkles, Sprout, X, Brush } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { PEST_INFO } from '../sim/engine';
import { pestStock, USE } from '../economy/catalog';
import type { PestKind } from '../types';
import { t } from '../i18n';

const ratingColor = (r: number) => (r >= 75 ? '#34d399' : r >= 45 ? '#fbbf24' : '#f87171');
const KINDS: PestKind[] = ['mites', 'mold', 'rot'];

/** "Cuidado de la sala": plagues, gardener rating, cleaning, recycling and the hired gardener. */
export const CarePanel: React.FC<{ onClose: () => void; onOpenMarket: (cat?: string) => void }> = ({ onClose, onOpenMarket }) => {
  const { care, indoorPlants, selectedPlantIndex, assets, treatPests, cleanRoom, recycleGarbage, removeMales, saveCurrentPlantAsMotherOrFather } = useGame();
  const selected = indoorPlants[selectedPlantIndex];
  const byKind = KINDS.map((k) => ({ k, n: indoorPlants.filter((p) => p.pest?.kind === k).length }));
  const stock = pestStock(assets);
  const rc = ratingColor(care.rating);
  const cleanWait = care.cleanReadyInHours;

  return (
    <div className="hud-panel p-4 w-[19.5rem] max-w-[calc(100vw-1.5rem)] space-y-3.5 shadow-[0_0_40px_-10px_rgba(0,0,0,0.9)]" style={{ background: 'rgba(3, 14, 11, 0.97)' }}>
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-sm font-bold tracking-[0.14em] uppercase text-emerald-200 flex items-center gap-2"><ShieldCheck className="w-4 h-4" />{' '}{t('Cuidado de la sala')}</h3>
        <button onClick={onClose} aria-label={t('Cerrar')} className="text-neutral-400 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>
      </div>

      {/* rating */}
      <div>
        <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">
          <span>{t('Calificación de jardinero')}</span><span style={{ color: rc }}>{care.rating} %</span>
        </div>
        <div className="h-2.5 rounded-full bg-neutral-900 border border-neutral-700/70 overflow-hidden">
          <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${care.rating}%`, background: `linear-gradient(90deg, ${rc}, ${rc}cc)`, boxShadow: `0 0 10px ${rc}` }} />
        </div>
        <p className="text-[10.5px] text-neutral-400 leading-snug mt-1.5">
          {care.rating >= 75 ? t('Sala impecable: las plagas casi no aparecen.') : care.rating >= 45 ? t('Se está descuidando: las plagas son más probables.') : t('¡Sala sucia! Las plagas aparecen mucho más rápido.')}
        </p>
      </div>

      {/* plagues */}
      <div className="rounded-lg border border-neutral-700/60 bg-neutral-950/60 p-2.5 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-neutral-400">
          <span className="flex items-center gap-1.5"><Bug className="w-3.5 h-3.5 text-pink-300" />{' '}{t('Plagas en la sala')}</span>
          <span className={care.pests > 0 ? 'text-pink-300 font-bold' : 'text-emerald-300'}>{care.pests > 0 ? `${care.pests} planta${care.pests > 1 ? 's' : ''}` : 'ninguna'}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {byKind.map(({ k, n }) => (
            <div key={k} className={`rounded-md border px-1.5 py-1 text-center ${n > 0 ? 'border-pink-400/50 bg-pink-500/10' : 'border-neutral-800 bg-neutral-900/50'}`} title={t('{label}: {cause}. Cura: {cure}', { label: PEST_INFO[k].label, cause: PEST_INFO[k].cause, cure: PEST_INFO[k].cure })}>
              <div className="text-base leading-none">{PEST_INFO[k].emoji}</div>
              <div className="text-[9px] font-mono text-neutral-300 mt-0.5 truncate">{t(PEST_INFO[k].label)}</div>
              <div className={`text-[11px] font-mono font-bold ${n > 0 ? 'text-pink-300' : 'text-neutral-500'}`}>{n}</div>
              <div className="text-[8.5px] font-mono text-neutral-500">{t('{v0} dosis', { v0: Math.floor(stock[k] / USE.pestPerPlant) })}</div>
            </div>
          ))}
        </div>
        {selected?.pest && (
          <p className="text-[10.5px] text-pink-200/90 leading-snug">
            {t('{emoji} Esta planta:', { emoji: PEST_INFO[selected.pest.kind].emoji })}{' '}<b>{t(PEST_INFO[selected.pest.kind].label)}</b>{' '}{t('desde hace {v0} h · causa: {cause}. Cura: {cure}.', { v0: Math.max(1, Math.round(selected.pest.hours)), cause: PEST_INFO[selected.pest.kind].cause, cure: PEST_INFO[selected.pest.kind].cure })}
          </p>
        )}
        <div className="flex gap-1.5">
          <button onClick={() => treatPests('selected')} disabled={!selected?.pest} className="care-btn flex-1">{t('Tratar esta')}</button>
          <button onClick={() => treatPests('all')} disabled={care.pests === 0} className="care-btn flex-1 care-btn--hot">{t('Tratar toda la sala')}</button>
        </div>
      </div>

      {/* sexing */}
      {(care.males > 0 || care.pollinated > 0 || (selected && selected.sex === 'male')) && (
        <div className="rounded-lg border border-sky-400/30 bg-sky-400/5 p-2.5 space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-sky-300">{t('♂ Sexado')}</div>
          <p className="text-[10.5px] text-neutral-300 leading-snug">
            {care.males > 0 ? t('{males} macho{v1} revelado{v2} en la sala. Quítalos antes de la floración (55 %) o polinizarán a las hembras.', { males: care.males, v1: care.males > 1 ? 's' : '', v2: care.males > 1 ? 's' : '' }) : t('Sin machos revelados.')}
            {care.pollinated > 0 && t(' 🐝 {pollinated} polinizada{v1}: dan menos flor pero también semillas.', { pollinated: care.pollinated, v1: care.pollinated > 1 ? 's' : '' })}
          </p>
          <div className="flex gap-1.5">
            <button className="care-btn care-btn--male flex-1" disabled={care.males === 0} onClick={() => removeMales()}>{t('Quitar machos')}</button>
            <button className="care-btn flex-1" disabled={!(selected && selected.sex === 'male')} onClick={() => saveCurrentPlantAsMotherOrFather('Padre (Donante de Polen)')}>{t('Guardar como padre')}</button>
          </div>
        </div>
      )}

      {/* cleaning */}
      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={() => cleanRoom()} className={`care-btn ${cleanWait > 0 ? 'opacity-60' : ''}`} title={t('+{cleanGain} de calificación cada {cleanCooldownHours} h', { cleanGain: USE.cleanGain, cleanCooldownHours: USE.cleanCooldownHours })}>
          <Brush className="w-3.5 h-3.5" />{' '}{t('Limpiar sala')}{cleanWait > 0 ? <span className="text-[9px] opacity-70">· {cleanWait >= 1 ? `${Math.ceil(cleanWait)} h` : `${Math.max(1, Math.round(cleanWait * 60))} min`}</span> : null}
        </button>
        <button onClick={() => recycleGarbage()} disabled={care.garbage === 0} className="care-btn" title={t('Frascos vacíos y equipo averiado bajan tu calificación hasta que los recicles')}>
          <Recycle className="w-3.5 h-3.5" />{' '}{t('Reciclar{v0}', { v0: care.garbage > 0 ? ` (${care.garbage})` : '' })}
        </button>
      </div>

      {/* gardener */}
      <div className="rounded-lg border border-emerald-400/25 bg-emerald-400/5 p-2.5">
        <div className="flex items-center gap-2">
          <Sprout className="w-4 h-4 text-emerald-300 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold text-emerald-100 leading-tight">
              {care.gardenerLevel === 0 ? t('Modo manual') : t('Jardinero {v0} · {v1} d', { v0: care.gardenerLevel === 2 ? 'maestro' : 'aprendiz', v1: care.gardenerDays.toFixed(1) })}
            </div>
            <div className="text-[10px] text-neutral-400 leading-snug">
              {care.gardenerLevel === 0 ? t('Contrata un jardinero: riega y abona por ti.') : care.gardenerLevel === 2 ? t('Riega, abona y trata plagas usando tu agua, abono y tratamientos.') : t('Riega y abona usando tu agua y tu abono.')}
            </div>
            {(care.gardenerLevel > 0 || care.today.auto > 0) && (
              <div className="flex flex-wrap gap-1 mt-1.5" data-testid="gardener-today">
                <span className="text-[9.5px] font-mono uppercase tracking-wider text-neutral-500">{t('Hoy:')}</span>
                {[[care.today.water + care.today.auto, '💧', t('riegos')], [care.today.feed, '🧪', t('abonadas')], [care.today.treat, '🐛', t('plagas tratadas')]].map(([n, e, l]) => (
                  <span key={String(l)} className="px-1.5 py-px rounded-md bg-emerald-400/10 border border-emerald-400/25 text-[10px] font-mono text-emerald-100">{e} {n} {l}</span>
                ))}
              </div>
            )}
            {care.gardenerLevel > 0 && (
              <div className="text-[10px] text-neutral-500 leading-snug mt-0.5">{t('Tú sigues cosechando, sembrando, quitando machos y reciclando la basura. Si se acaba el agua o el abono, deja de trabajar.')}</div>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 mt-2">
          <button onClick={() => onOpenMarket('service')} className="care-btn flex-1"><Sparkles className="w-3.5 h-3.5" /> {care.gardenerLevel === 0 ? t('Contratar jardinero') : t('Renovar contrato')}</button>
          <button onClick={() => onOpenMarket('pest')} className="care-btn flex-1 care-btn--hot"><Bug className="w-3.5 h-3.5" />{' '}{t('Tratamientos')}</button>
        </div>
      </div>
    </div>
  );
};
