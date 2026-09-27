import React, { useEffect, useState } from 'react';
import { Eye, Check, Clock, Flame, Hammer, Lock, Sprout, X, Zap } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { FacilityBackdrop } from './FacilityBackdrop';
import { buildHoursOf, progressOf, remainingMs, speedUpQuote, SPEEDUP } from '../../sim/facilities';
import { formatDuration } from '../../sim/engine';
import type { GrowFacility } from '../../types';
import './hud.css';
import { t, t as tr, k, localize } from '../../i18n';
import { setScene, useSceneId } from './sceneChoice';

/** what each rung adds, in words a player understands (the numbers come from the data, not from here) */
const PERKS: Record<string, string[]> = localize({
  tent_starter: ['1 planta: mucho mimo y paciencia', k('Lámpara pequeña y ventilador de clip')],
  tent_pro: [k('4 plantas a la vez'), k('Paredes reflectantes y filtro de carbón'), k('Control real de temperatura y olor')],
  greenhouse_commercial: [k('8 plantas bajo cielo real'), k('Paneles solares: energía casi gratis de día'), k('Ventilación natural y nebulización')],
  lab_pharma_hydro: [k('12 plantas de calidad farmacéutica'), k('Racks NFT y tanques de nutrientes'), k('Clima automático y esterilización UV')],
  hydro_complex: [k('18 plantas en dos salas hidropónicas'), k('Laboratorio de control propio'), k('Sede del imperio: pide rango 5')],
  grow_campus: [k('24 plantas en un campus entero'), k('Salas de clonación y centro de datos'), k('Sede del imperio: pide rango 7')],
  empire_seat: [k('30 plantas: la sala completa'), k('El mejor clima que se puede construir'), k('Sede del imperio: pide rango 9')],
}, ['tent_starter', 'tent_pro', 'greenhouse_commercial', 'lab_pharma_hydro', 'hydro_complex', 'grow_campus', 'empire_seat']);

const useNow = (ms: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
};

const hoursLabel = (h: number) => (h >= 48 ? tr('{v0} días', { v0: Math.round(h / 24) }) : h >= 24 ? tr('1 día') : `${h} h`);

export const FacilityPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { facilities, currentFacility, floraBalance, upgradeFacility, construction, speedUpConstruction, equipStats, empire } = useGame();
  const rank = empire?.rank ?? 1;
  const sceneId = useSceneId(currentFacility, facilities);
  const now = useNow(1000);
  const building = construction ? facilities.find((f) => f.id === construction.facilityId) : undefined;
  const quote = construction ? speedUpQuote(construction, now) : null;

  const stateOf = (f: GrowFacility): 'current' | 'passed' | 'building' | 'next' | 'locked' => {
    if (f.id === currentFacility.id) return 'current';
    if (f.unlocked && f.tier < currentFacility.tier) return 'passed';
    if (construction?.facilityId === f.id) return 'building';
    if (f.tier === currentFacility.tier + 1) return 'next';
    return 'locked';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" role="dialog" aria-modal aria-label={tr('Instalaciones de cultivo')} onClick={onClose}>
      <div className="fp-shell w-full max-w-5xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 px-4 sm:px-6 pt-4 sm:pt-5">
          <div>
            <h3 className="font-serif text-xl sm:text-2xl font-black text-white tracking-wide">{t('Instalaciones de cultivo')}</h3>
            <p className="text-[12px] text-neutral-400 mt-0.5">{t('De un armario a un complejo: cada escalón se construye con $FLORA')}{' '}<b className="text-amber-300">{t('y tiempo real')}</b>{t('. No se salta ninguno.')}</p>
          </div>
          <button type="button" onClick={onClose} className="fp-x" aria-label={tr('Cerrar')}><X className="w-4 h-4" /></button>
        </header>

        {/* the ladder */}
        <ol className="fp-ladder mx-4 sm:mx-6 mt-4" aria-label={tr('Escalera de instalaciones')}>
          {facilities.map((f, i) => {
            const st = stateOf(f);
            return (
              <li key={f.id} className={`fp-step fp-step--${st}`}>
                <span className="fp-dot">{st === 'current' || st === 'passed' ? <Check className="w-3 h-3" /> : st === 'building' ? <Hammer className="w-3 h-3" /> : i + 1}</span>
                <span className="fp-step-name">{t(f.name).split(' (')[0].replace(tr('Instalación '), '').replace(tr(' Automatizado'), '')}</span>
              </li>
            );
          })}
        </ol>

        <div className="grid gap-3 p-4 sm:p-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {facilities.map((f) => {
            const st = stateOf(f);
            const hours = buildHoursOf(f.id);
            const afford = floraBalance >= f.costFlora;
            const needRank = f.minEmpireRank && rank < f.minEmpireRank ? f.minEmpireRank : 0;
            return (
              <article key={f.id} className={`fp-card fp-card--${st}`} data-facility-card={f.id}>
                <div className="fp-view">
                  <FacilityBackdrop facilityId={f.id} lampColor="255,236,190" lightPct={0.85} equip={equipStats} hour={13} />
                  {st === 'locked' && <div className="fp-lock"><Lock className="w-6 h-6" /></div>}
                  <span className="fp-tier">{t('Nivel {tier}', { tier: f.tier })}</span>
                  {st === 'current' && <span className="fp-badge fp-badge--on"><Check className="w-3 h-3" />{' '}{t('En uso')}</span>}
                  {st === 'building' && <span className="fp-badge fp-badge--build"><Hammer className="w-3 h-3" />{' '}{t('En obra')}</span>}
                  {sceneId === f.id && <span className="fp-badge fp-badge--scene"><Eye className="w-3 h-3" />{' '}{t('Escenario')}</span>}
                </div>

                <div className="p-3 flex-1 flex flex-col gap-2">
                  <h4 className="text-[13px] font-bold text-white leading-snug">{tr(f.name)}</h4>
                  <div className="flex items-center gap-1.5 text-[11px] font-mono">
                    <span className="fp-chip"><Sprout className="w-3 h-3" />{f.capacityPlants} {f.capacityPlants === 1 ? t('planta') : t('plantas')}</span>
                    <span className="fp-chip fp-chip--g">{t('+{v0}% ritmo', { v0: Math.round((f.environmentBonus - 1) * 100) })}</span>
                  </div>
                  <ul className="text-[11.5px] leading-snug text-neutral-300 space-y-0.5 list-disc pl-4 marker:text-emerald-500/60">
                    {(PERKS[f.id] ?? []).map((t) => <li key={t}>{t}</li>)}
                  </ul>

                  <div className="mt-auto pt-2 space-y-1.5">
                    {st === 'building' && construction && (
                      <>
                        <div className="fp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progressOf(construction, now) * 100)}><i style={{ width: `${progressOf(construction, now) * 100}%` }} /></div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-amber-200"><span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{t('Faltan {v0}', { v0: formatDuration(remainingMs(construction, now) / 1000) })}</span><span>{Math.round(progressOf(construction, now) * 100)}%</span></div>
                      </>
                    )}
                    {st === 'next' && !construction && needRank > 0 && (
                      <p className="text-[11px] text-amber-200 font-mono" data-testid="needs-rank"><Lock className="inline w-3 h-3 mr-1" />{t('Pide rango de imperio {need} (tienes {rank}). Míralo en tu Perfil.', { need: needRank, rank })}</p>
                    )}
                    {st === 'next' && !construction && !needRank && (
                      <>
                        <div className="text-[11px] font-mono text-neutral-400 flex justify-between"><span><Clock className="inline w-3 h-3 mr-1" />{t('Obra: {v0}', { v0: hoursLabel(hours) })}</span><span className={afford ? 'text-amber-300' : 'text-rose-300'}>{f.costFlora} $FLORA</span></div>
                        <button type="button" disabled={!afford} onClick={() => upgradeFacility(f.id)} className="fp-cta"><Hammer className="w-4 h-4" />{afford ? tr('Empezar obra') : tr('Te faltan {v0} $FLORA', { v0: Math.ceil(f.costFlora - floraBalance) })}</button>
                      </>
                    )}
                    {st === 'next' && construction && <p className="text-[11px] text-neutral-500">{t('Hay otra obra en marcha.')}</p>}
                    {st === 'locked' && <p className="text-[11px] text-neutral-500">{t('Requiere construir antes el nivel {v0}. · Obra {v1} · {costFlora} $FLORA', { v0: f.tier - 1, v1: hoursLabel(hours), costFlora: f.costFlora })}{f.minEmpireRank ? tr(' · rango de imperio {n}', { n: f.minEmpireRank }) : ''}</p>}
                    {st === 'passed' && <p className="text-[11px] text-neutral-500">{t('Superada: sigues cultivando con tu mejor instalación.')}</p>}
                    {st === 'current' && <p className="text-[11px] text-emerald-300/80">{t('Aquí estás cultivando ahora.')}</p>}
                    {(st === 'passed' || st === 'current') && (
                      sceneId === f.id
                        ? <p className="text-[11px] font-mono text-sky-300 inline-flex items-center gap-1"><Eye className="w-3 h-3" />{t('Es el escenario que ves en tu sala')}</p>
                        : <button type="button" onClick={() => setScene(st === 'current' ? null : f.id)} className="fp-cta fp-cta--ghost"><Eye className="w-4 h-4" />{t('Usar este escenario')}</button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* paid speed-up: bounded on purpose */}
        {construction && building && (
          <section className="fp-speed mx-4 sm:mx-6 mb-5">
            <div className="flex flex-wrap items-center gap-3">
              <Zap className="w-5 h-5 text-amber-300 shrink-0" />
              <div className="flex-1 min-w-[14rem]">
                <div className="text-[13px] font-bold text-white">{t('Acelerar «{v0}»', { v0: t(building.name).split(' (')[0] })}</div>
                <p className="text-[11.5px] text-neutral-400 leading-snug">
                  {t('Quema $FLORA y recorta parte del tiempo que falta. Máximo {perDay} veces al día y cada una sale más cara: el tiempo siempre pesa, pagues o no.', { perDay: SPEEDUP.perDay })}
                </p>
              </div>
              {quote ? (
                <button type="button" onClick={() => speedUpConstruction()} disabled={floraBalance < quote.costFlora} className="fp-cta fp-cta--hot" data-testid="speedup">
                  <Flame className="w-4 h-4" />−{Math.round(quote.cutMs / 360000) / 10} h · {quote.costFlora} $FLORA <span className="opacity-70">{tr('({leftToday} hoy)', { leftToday: quote.leftToday })}</span>
                </button>
              ) : <span className="text-[11.5px] font-mono text-neutral-500">{t('Sin aceleraciones hoy')}</span>}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
