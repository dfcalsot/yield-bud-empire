import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { RELIC_TYPE_BY_ID, type Relic } from '../../sim/relics';
import { bridgeText, depositRelic, fetchBridge, fetchMine, withdrawRelic, type BridgeStatus, type MineAsset } from '../../economy/bridgeApi';
import { RelicCard } from './RelicCard';
import { t } from '../../i18n';

/** "Take out to Solana" for one relic (a confirmation with the $FLORA fee and what it means) */
export const WithdrawButton: React.FC<{ relic: Relic; status: BridgeStatus | null; onDone: () => void }> = ({ relic, status, onDone }) => {
  const { showNotification } = useGame();
  const [ask, setAsk] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!status?.enabled || status.dev || relic.bound) return null;
  const fee = status.fees[relic.rarity] ?? 20;
  if (!ask) return <button type="button" className="sr-btn !py-0.5 !text-[10px]" onClick={() => setAsk(true)} data-testid="relic-withdraw"><ArrowUpRight className="inline w-3 h-3" /> {t('Sacar a Solana')}</button>;
  return (
    <div className="w-full rounded-lg border border-violet-300/30 bg-violet-400/10 p-2 space-y-1.5 text-[10.5px] text-neutral-200">
      {!status.wallet ? <p>{t('Primero vincula una billetera Solana (Billetera → Vincular).')}</p> : (
        <>
          <p>{t('Se acuña como NFT en tu billetera {w}… ({net}). Mientras esté afuera no da su bono en el juego. Cuesta {fee} $FLORA (se queman).', { w: status.wallet.slice(0, 6), net: status.network, fee })}</p>
          <div className="flex gap-1">
            <button type="button" disabled={busy || status.left <= 0} className="sr-btn !py-0.5 !text-[10px]" onClick={async () => {
              setBusy(true); const r = await withdrawRelic(relic.id); setBusy(false); setAsk(false);
              showNotification(r.ok ? t('La reliquia va camino a tu billetera Solana. Tarda unos segundos.') : bridgeText(r.error), r.ok ? 'success' : 'info');
              onDone();
            }} data-testid="relic-withdraw-confirm">{busy ? <Loader2 className="inline w-3 h-3 animate-spin" /> : t('Confirmar')}</button>
            <button type="button" className="sr-btn !py-0.5 !text-[10px]" onClick={() => setAsk(false)}>{t('Cancelar')}</button>
          </div>
          {status.left <= 0 && <p className="text-amber-200">{bridgeText('bridge_daily_cap')}</p>}
        </>
      )}
    </div>
  );
};

/** relics out of the game (on their way or on Solana) and the ones the linked wallet holds, ready to come back */
export const BridgePanel: React.FC<{ status: BridgeStatus | null; refresh: () => void }> = ({ status, refresh }) => {
  const { showNotification } = useGame();
  const [mine, setMine] = useState<MineAsset[]>([]);
  const [step, setStep] = useState('');
  const loadMine = useCallback(async () => { const m = await fetchMine(); setMine(m?.assets ?? []); }, []);
  useEffect(() => { if (status?.enabled && status.wallet) void loadMine(); }, [status?.enabled, status?.wallet, loadMine]);
  if (!status?.enabled) return null;
  const outside = status.outside.filter((o) => !mine.some((m) => m.asset === o.asset));
  return (
    <section className="rounded-xl border border-violet-300/30 bg-violet-400/5 p-3 space-y-2" data-testid="bridge-panel">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-bold text-white">{t('Puente Solana')}</span>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-400/20 text-violet-200 uppercase">{status.network}</span>
        <button type="button" className="ml-auto text-[10.5px] underline text-neutral-400" onClick={() => { refresh(); void loadMine(); }}>{t('Actualizar')}</button>
      </div>
      <p className="text-[10.5px] text-neutral-400">{status.wallet ? t('Billetera vinculada: {w}…', { w: status.wallet.slice(0, 8) }) : t('Vincula una billetera Solana para sacar o traer reliquias.')}</p>
      {step && <p className="text-[11px] text-violet-200"><Loader2 className="inline w-3 h-3 animate-spin mr-1" />{step}</p>}
      {outside.length > 0 && (
        <div className="space-y-1">
          <div className="text-[10.5px] font-mono text-neutral-400">{t('Fuera del juego')}</div>
          {outside.map((o) => (
            <div key={o.relic.id} className="flex items-center gap-2 text-[11px] text-neutral-200">
              <span>{RELIC_TYPE_BY_ID[o.relic.typeId]?.icon} {RELIC_TYPE_BY_ID[o.relic.typeId]?.name} #{o.relic.serial}</span>
              <span className={`text-[9px] font-mono px-1 rounded ${o.state === 'onchain' ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-400/20 text-amber-200'}`}>{o.state === 'onchain' ? t('En Solana') : t('En camino')}</span>
              {o.explorer && <a className="ml-auto text-violet-200 underline" href={o.explorer} target="_blank" rel="noreferrer">{t('Ver')} <ExternalLink className="inline w-3 h-3" /></a>}
            </div>
          ))}
        </div>
      )}
      {mine.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[10.5px] font-mono text-neutral-400">{t('En tu billetera Solana')}</div>
          <div className="grid grid-cols-2 gap-2">
            {mine.filter((m) => m.relic).map((m) => (
              <RelicCard key={m.asset} relic={m.relic!} footer={
                <div className="flex gap-1">
                  <button type="button" className="sr-btn !py-0.5 !text-[10px]" disabled={!!step} data-testid="relic-deposit" onClick={async () => {
                    const r = await depositRelic(m.asset, status.wallet!, status.network, setStep);
                    setStep('');
                    showNotification(r.ok ? t('¡La reliquia volvió al juego! Ya puedes equiparla.') : bridgeText(r.error), r.ok ? 'success' : 'info');
                    refresh(); void loadMine();
                  }}><ArrowDownLeft className="inline w-3 h-3" /> {t('Traer al juego')}</button>
                  <a className="sr-btn !py-0.5 !text-[10px]" href={m.explorer} target="_blank" rel="noreferrer"><ExternalLink className="inline w-3 h-3" /></a>
                </div>
              } />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

/** the bridge status, refreshed while something is on its way */
export function useBridge() {
  const [status, setStatus] = useState<BridgeStatus | null>(null);
  const refresh = useCallback(async () => { setStatus(await fetchBridge()); }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!status?.outside.some((o) => o.state === 'out')) return;
    const id = window.setTimeout(() => void refresh(), 4000);
    return () => window.clearTimeout(id);
  }, [status, refresh]);
  return { status, refresh };
}
