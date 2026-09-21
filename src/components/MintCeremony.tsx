import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Check, Copy, Loader2 } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { GeneticCard } from './GeneticCard';
import { NeonButton, RARITY_STYLE } from './game/GameUI';
import { DnaLeaf } from './icons/CannabisIcons';
import { GeneticCardData, mintAddressFor, shortAddress } from '../utils/nft';

/** what the ceremony needs from any NFT: an id, a rarity and a colour; `render` draws the card itself (genetics by default) */
type CeremonyCard = Pick<GeneticCardData, 'id' | 'rarity' | 'color'>;

interface MintCeremonyProps {
  card: CeremonyCard;
  render?: (faceDown: boolean) => React.ReactNode;
  /** onchain = real game transaction (seed purchase / patent). birth = off-chain F1 hybrid. */
  variant: 'onchain' | 'birth';
  feeText?: string;
  signature?: string;
  slot?: number;
  onClose: () => void;
  closeLabel?: string;
}

const PHASE_MS = [1300, 1500, 1000]; // signing, confirming, minting → reveal

const PHASES = {
  onchain: ['Firmando transacción', 'Confirmando en Solana', 'Acuñando NFT'],
  birth: ['Cruzando parentales', 'Secuenciando genoma', 'Naciendo la F1'],
} as const;

const CopyRow: React.FC<{ label: string; value: string; shown: string }> = ({ label, value, shown }) => {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-[11px] font-mono">
      <span className="text-neutral-500">{label}</span>
      <span className="text-emerald-300 truncate">{shown}</span>
      <button
        aria-label={`Copiar ${label}`}
        className="text-neutral-400 hover:text-emerald-300 cursor-pointer"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setOk(true);
            window.setTimeout(() => setOk(false), 1300);
          } catch { /* ignore */ }
        }}
      >
        {ok ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
};

export const MintCeremony: React.FC<MintCeremonyProps> = ({ card, render, variant, feeText, signature, slot, onClose, closeLabel = 'Continuar' }) => {
  const { walletAddress } = useGame();
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [phase, setPhase] = useState<0 | 1 | 2 | 3>(reduced ? 3 : 0);
  const [tick, setTick] = useState(0);
  const { color: rc, label: rarityLabel } = RARITY_STYLE[card.rarity];
  const labels = PHASES[variant];
  const mint = mintAddressFor(card.id);
  const baseSlot = slot ?? 248926000;

  // phase timeline
  useEffect(() => {
    if (phase >= 3) return;
    const id = window.setTimeout(() => setPhase((p) => (Math.min(3, p + 1) as 0 | 1 | 2 | 3)), PHASE_MS[phase]);
    return () => window.clearTimeout(id);
  }, [phase]);

  // animation ticker (typing / counters) only while the ceremony runs
  useEffect(() => {
    if (phase >= 3) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 45);
    return () => window.clearInterval(id);
  }, [phase]);

  // reveal burst
  useEffect(() => {
    if (phase !== 3 || reduced) return;
    const colors = [rc, '#ffffff', card.color];
    const n = card.rarity === 'legendary' ? 220 : card.rarity === 'epic' ? 150 : card.rarity === 'rare' ? 100 : 60;
    confetti({ particleCount: n, spread: 90, startVelocity: 42, origin: { y: 0.55 }, colors, zIndex: 120 });
    if (card.rarity === 'legendary') {
      window.setTimeout(() => confetti({ particleCount: 120, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors, zIndex: 120 }), 250);
      window.setTimeout(() => confetti({ particleCount: 120, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors, zIndex: 120 }), 250);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (phase === 3) onClose();
      else setPhase(3);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, onClose]);

  const sigShown = (signature ?? mint + mint.slice(0, 44)).slice(0, 88);
  const typed = sigShown.slice(0, Math.min(sigShown.length, tick * 4));
  const confirmations = phase === 0 ? 0 : phase === 1 ? Math.min(32, Math.round(((tick * 45 - PHASE_MS[0]) / PHASE_MS[1]) * 32)) : 32;
  const wallet = walletAddress ? shortAddress(walletAddress, 4, 4) : 'billetera virtual';
  const bases = 'ATGC';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Ceremonia de acuñación">
      <div className="absolute inset-0 bg-[#020806]/97" style={{ backgroundImage: `radial-gradient(circle at 50% 45%, ${rc}33, transparent 60%)` }} />

      {phase < 3 && (
        <button onClick={() => setPhase(3)} className="absolute top-4 right-4 z-10 text-[11px] font-mono uppercase tracking-wider text-neutral-400 hover:text-white cursor-pointer px-3 py-1.5 rounded-lg border border-neutral-700">
          Saltar
        </button>
      )}

      <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-5 text-center">
        {phase < 3 ? (
          <>
            <div className="flex items-center gap-2 text-emerald-200 font-serif font-bold tracking-[0.14em] uppercase text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              {labels[phase as 0 | 1 | 2]}…
            </div>

            <div className="w-full min-h-[300px] flex items-center justify-center">
              {variant === 'onchain' && phase === 0 && (
                <div className="w-full space-y-3 text-left">
                  <div className="px-3 py-2 rounded-xl bg-neutral-950/80 border border-emerald-400/25 flex items-center justify-between text-xs font-mono">
                    <span className="text-neutral-400">Firmante</span>
                    <span className="text-emerald-300">{wallet}</span>
                  </div>
                  {feeText && (
                    <div className="px-3 py-2 rounded-xl bg-neutral-950/80 border border-amber-400/25 flex items-center justify-between text-xs font-mono">
                      <span className="text-neutral-400">Coste</span>
                      <span className="text-amber-300">{feeText}</span>
                    </div>
                  )}
                  <div className="px-3 py-2 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-emerald-200/90 break-all min-h-[4.2rem]">
                    <span className="text-neutral-500">firma › </span>{typed}<span className="animate-pulse">▍</span>
                  </div>
                </div>
              )}

              {variant === 'onchain' && phase === 1 && (
                <div className="w-full space-y-4">
                  <div className="text-xs font-mono text-neutral-400">Bloque de inclusión <span className="text-cyan-300">#{baseSlot.toLocaleString()}</span> · 392 ms</div>
                  <div className="grid grid-cols-[repeat(32,minmax(0,1fr))] gap-[2px]">
                    {Array.from({ length: 32 }, (_, i) => (
                      <span key={i} className="h-5 rounded-[2px]" style={{ background: i < confirmations ? '#34d399' : '#10231c', boxShadow: i < confirmations ? '0 0 6px #34d399' : 'none', transition: 'background 0.15s' }} />
                    ))}
                  </div>
                  <div className="text-xs font-mono text-emerald-300">Confirmaciones {confirmations}/32</div>
                </div>
              )}

              {variant === 'birth' && phase === 0 && (
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-full border border-fuchsia-300/50 flex items-center justify-center text-fuchsia-200 text-xs font-mono">♀ Madre</div>
                  <DnaLeaf className="w-14 h-14 text-emerald-300 animate-pulse" />
                  <div className="w-16 h-16 rounded-full border border-cyan-300/50 flex items-center justify-center text-cyan-200 text-xs font-mono">♂ Padre</div>
                </div>
              )}

              {variant === 'birth' && phase === 1 && (
                <div className="w-full grid grid-cols-16 gap-1 font-mono text-sm" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
                  {Array.from({ length: 96 }, (_, i) => {
                    const lit = i < Math.min(96, Math.round(((tick * 45 - PHASE_MS[0]) / PHASE_MS[1]) * 96));
                    const ch = bases[(i * 7 + Math.floor(tick / 4) * (i % 3)) % 4];
                    return <span key={i} style={{ color: lit ? ['#34d399', '#22d3ee', '#fbbf24', '#e879f9'][bases.indexOf(ch)] : '#1b3529' }}>{ch}</span>;
                  })}
                </div>
              )}

              {phase === 2 && (
                <div className="relative w-[210px]" style={{ perspective: 900 }}>
                  <div className="mint-ring absolute -inset-6 rounded-full border-2" style={{ borderColor: rc }} />
                  <div className="mint-spin" style={{ transformStyle: 'preserve-3d' }}>
                    {render ? render(true) : <GeneticCard card={card as GeneticCardData} faceDown />}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="font-serif font-black text-3xl tracking-[0.35em] uppercase" style={{ color: rc, textShadow: `0 0 24px ${rc}` }}>
              {rarityLabel}
            </div>
            <div className="relative w-[270px] sm:w-[290px]" style={{ perspective: 1100 }}>
              {!reduced && <div className="mint-burst absolute inset-0 rounded-full pointer-events-none" style={{ background: `radial-gradient(circle, ${rc}88, transparent 65%)` }} />}
              <div className={reduced ? '' : 'mint-reveal'} style={{ transformStyle: 'preserve-3d' }}>
                {render ? render(false) : <GeneticCard card={card as GeneticCardData} />}
              </div>
            </div>
            <div className="w-full max-w-sm space-y-1.5">
              {signature && <CopyRow label="FIRMA" value={signature} shown={shortAddress(signature, 6, 6)} />}
              <p className="text-[10px] font-mono text-neutral-500 leading-snug pt-1">
                {variant === 'onchain'
                  ? `Confirmado en la Devnet simulada del juego${slot ? ` · bloque #${slot.toLocaleString()}` : ''}. El identificador es simulado: no existe en la Solana real.`
                  : 'Nace fuera de la cadena. Regístrala como patente para acuñarla on-chain y quemar $FLORA.'}
              </p>
            </div>
            <NeonButton tone="emerald" onClick={onClose} className="px-8 py-3">{closeLabel}</NeonButton>
          </>
        )}
      </div>
    </div>
  );
};
