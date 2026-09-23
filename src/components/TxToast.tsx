import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../context/GameContext';
import { shortAddress } from '../utils/nft';
import type { SolanaTransaction } from '../types';
import { LeafCoin } from './icons/CannabisIcons';
import { t } from '../i18n';

const TYPE_INFO: Record<SolanaTransaction['type'], { label: string; color: string }> = {
  BURN_SPEEDUP: { label: 'Quema · Aceleración', color: '#fbbf24' },
  BURN_REPAIR: { label: 'Quema · Reparación', color: '#fb923c' },
  BURN_PATENT: { label: 'Quema · Genética', color: '#f59e0b' },
  BURN_PROCESS: { label: 'Quema · Laboratorio', color: '#f97316' },
  BURN_PURCHASE: { label: 'Quema · Compra NFT', color: '#38bdf8' },
  AIRDROP: { label: 'Airdrop', color: '#34d399' },
  V2P_CLAIM: { label: 'Canje V2P', color: '#22d3ee' },
  DISPENSARY_SALE: { label: 'Venta dispensario', color: '#c084fc' },
};

type Stage = 'sending' | 'confirmed' | 'finalized';

/**
 * HUD toast for every new Solana transaction the game records:
 * enviando → confirmada → finalizada, with the signature and slot.
 */
export const TxToast: React.FC = () => {
  const { transactions } = useGame();
  const [tx, setTx] = useState<SolanaTransaction | null>(null);
  const [stage, setStage] = useState<Stage>('sending');
  const lastSeen = useRef<string | null>(transactions[0]?.id ?? null); // ignore history present at load

  useEffect(() => {
    const latest = transactions[0];
    if (!latest || latest.id === lastSeen.current) return;
    lastSeen.current = latest.id;
    setTx(latest);
    setStage('sending');
    const t1 = window.setTimeout(() => setStage('confirmed'), 700);
    const t2 = window.setTimeout(() => setStage('finalized'), 1900);
    const t3 = window.setTimeout(() => setTx(null), 5200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [transactions]);

  if (!tx) return null;
  const info = TYPE_INFO[tx.type] ?? { label: t('Transacción'), color: '#34d399' };
  const done = stage === 'finalized';
  const amount = tx.amountFlora ? `${tx.amountFlora.toLocaleString()} $FLORA` : tx.amountSol ? `${tx.amountSol} SOL` : '';

  return (
    <div className="fixed z-[55] top-[7.6rem] right-3 w-[min(19rem,calc(100vw-1.5rem))] pointer-events-none" role="status" aria-live="polite">
      <div className="hud-panel px-3 py-2.5 pointer-events-auto cf-float-in">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0" style={{ borderColor: `${info.color}88`, color: info.color, background: `${info.color}18` }}>
            <LeafCoin className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-white truncate">{t(info.label)}</span>
              <span className="text-[11px] font-mono font-bold shrink-0" style={{ color: info.color }}>{amount}</span>
            </div>
            <div className="text-[10px] font-mono text-neutral-400 truncate">{t('{v0} · slot #{v1}', { v0: shortAddress(tx.signature, 6, 6), v1: tx.blockSlot.toLocaleString() })}</div>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[9.5px] font-mono uppercase tracking-wider">
          {(['sending', 'confirmed', 'finalized'] as Stage[]).map((s, i) => {
            const reached = ['sending', 'confirmed', 'finalized'].indexOf(stage) >= i;
            return (
              <React.Fragment key={s}>
                <span className={reached ? 'text-emerald-300' : 'text-neutral-600'}>{s === 'sending' ? t('Enviando') : s === 'confirmed' ? t('Confirmada') : t('Finalizada')}</span>
                {i < 2 && <span className="flex-1 h-px" style={{ background: reached && i < ['sending', 'confirmed', 'finalized'].indexOf(stage) ? '#34d399' : '#1b3529' }} />}
              </React.Fragment>
            );
          })}
          {done && <span className="text-emerald-300">✓</span>}
        </div>
      </div>
    </div>
  );
};
