import React, { useState } from 'react';
import { Gift, Lock, Flame } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { ACTIVITY, MAX_EQUIPPED, RELIC_TYPE_BY_ID, meltReward, type Relic } from '../../sim/relics';
import { MATERIAL_BY_ID, type MaterialId } from '../../sim/forge';
import { MintCeremony } from '../MintCeremony';
import { ListNftButton } from '../market/ListNft';
import { RelicCard } from './RelicCard';
import { t } from '../../i18n';

/** the weekly activity chest and the relics it gave: open, equip (3), sell to other players or melt into materials */
export const RelicsTab: React.FC<{ match: (text: string) => boolean }> = ({ match }) => {
  const { relics, relicEquip, activity, empire, accountStartedAt, openActivityChest, equipRelic, unequipRelic, meltRelic } = useGame();
  const [reveal, setReveal] = useState<Relic | null>(null);
  const [busy, setBusy] = useState(false);
  const [melting, setMelting] = useState<string | null>(null);
  const ageDays = (Date.now() - accountStartedAt) / 86400000;
  const eligible = (empire?.rank ?? 1) >= ACTIVITY.minEmpireRank && ageDays >= ACTIVITY.minAgeDays;
  const next = ACTIVITY.chests[Math.min(activity.earned, ACTIVITY.chests.length - 1)];
  const weekDone = activity.earned >= ACTIVITY.chests.length;
  const pts = Math.min(1, activity.points / next.points), days = Math.min(1, activity.days.length / next.days);
  const equipped = new Set(relicEquip);
  const list = relics.filter((r) => match(`${RELIC_TYPE_BY_ID[r.typeId]?.name ?? ''} ${r.rarity} ${r.serial}`));

  const open = async () => {
    setBusy(true);
    const r = await openActivityChest();
    setBusy(false);
    if (r) setReveal(r);
  };

  return (
    <div className="space-y-3" data-testid="relics-tab">
      <section className="rounded-xl border border-amber-300/30 bg-amber-400/5 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-amber-300" />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-white">{t('Cofre de actividad semanal')}</div>
            <div className="text-[10.5px] text-neutral-400">{t('Se gana jugando (nunca se compra). Hasta 2 por semana; trae una reliquia NFT única.')}</div>
          </div>
          {activity.pending > 0 && (
            <button type="button" disabled={busy} onClick={open} className="care-btn care-btn--gold" data-testid="open-activity-chest">
              <Gift className="w-3.5 h-3.5" /> {t('Abrir ({n})', { n: activity.pending })}
            </button>
          )}
        </div>
        {!eligible ? (
          <p className="text-[11.5px] text-amber-200"><Lock className="inline w-3.5 h-3.5 mr-1" />{t('Los cofres se ganan con cuentas de {days} días o más y rango de imperio {rank}.', { days: ACTIVITY.minAgeDays, rank: ACTIVITY.minEmpireRank })}</p>
        ) : weekDone ? (
          <p className="text-[11.5px] text-emerald-200">{t('Ya ganaste los 2 cofres de esta semana. El lunes empieza otra.')}</p>
        ) : (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10.5px] font-mono text-neutral-300"><span>{t('Puntos de actividad')}</span><span>{activity.points} / {next.points}</span></div>
            <div className="mk-bar"><i style={{ ['--to' as string]: pts, background: 'linear-gradient(90deg,#f59e0b,#fde68a)' } as React.CSSProperties} /></div>
            <div className="flex justify-between text-[10.5px] font-mono text-neutral-300"><span>{t('Días activos')}</span><span>{activity.days.length} / {next.days}</span></div>
            <div className="mk-bar"><i style={{ ['--to' as string]: days, background: 'linear-gradient(90deg,#10b981,#a7f3d0)' } as React.CSSProperties} /></div>
            <p className="text-[10.5px] text-neutral-500">{t('Suman: cosechar, vender, laboratorio, cruces, tierras y patentes (regar y abonar suman poco).')}</p>
          </div>
        )}
      </section>

      <div className="text-[11px] font-mono text-neutral-400">{t('Equipadas: {n}/{max} · cada una de un tipo distinto', { n: relicEquip.length, max: MAX_EQUIPPED })}</div>
      {list.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-6">{t('Todavía no tienes reliquias. Juega esta semana para ganar tu primer cofre.')}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {list.map((r) => {
            const on = equipped.has(r.id);
            const reward = Object.entries(meltReward(r.rarity)).map(([m, n]) => `${n}× ${MATERIAL_BY_ID[m as MaterialId]?.name ?? m}`).join(', ');
            return (
              <RelicCard key={r.id} relic={r} equipped={on} footer={
                <div className="flex flex-wrap gap-1">
                  <button type="button" className="sr-btn !py-0.5 !text-[10px]" onClick={() => (on ? unequipRelic(r.id) : equipRelic(r.id))} data-testid="relic-equip">{on ? t('Quitar') : t('Equipar')}</button>
                  {!r.bound && !on && <ListNftButton what={{ nftId: r.id }} name={RELIC_TYPE_BY_ID[r.typeId]?.name ?? r.id} rarity={r.rarity} className="sr-btn !py-0.5 !text-[10px]" />}
                  {melting === r.id ? (
                    <button type="button" className="sr-btn !py-0.5 !text-[10px] !text-rose-200" title={reward} onClick={() => { setMelting(null); meltRelic(r.id); }}><Flame className="inline w-3 h-3" /> {t('Confirmar')}</button>
                  ) : (
                    <button type="button" className="sr-btn !py-0.5 !text-[10px]" title={t('Fundir: {reward}', { reward })} onClick={() => setMelting(r.id)}>{t('Fundir')}</button>
                  )}
                </div>
              } />
            );
          })}
        </div>
      )}

      {reveal && (
        <MintCeremony card={{ id: reveal.id, rarity: reveal.rarity, color: RELIC_TYPE_BY_ID[reveal.typeId]?.color ?? '#fbbf24' }} variant="onchain"
          render={(faceDown) => <RelicCard relic={reveal} faceDown={faceDown} />} closeLabel={t('Continuar')} onClose={() => setReveal(null)} />
      )}
    </div>
  );
};
