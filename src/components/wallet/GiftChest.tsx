import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Flame, X } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { playHarvestChime } from '../../utils/audio';
import '../hud/hud.css';
import { t } from '../../i18n';

/** The treasure chest itself: body, iron bands, lock, and a lid that swings open over a pile of coins. */
const ChestArt: React.FC<{ open?: boolean; shaking?: boolean; onClick?: () => void; small?: boolean }> = ({ open, shaking, onClick, small }) => {
  const svg = (
    <svg viewBox="0 0 190 170" width="100%" height="100%" aria-hidden style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="gcw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b5a2b" /><stop offset="1" stopColor="#4a2c12" /></linearGradient>
        <linearGradient id="gcg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fde68a" /><stop offset="1" stopColor="#d97706" /></linearGradient>
      </defs>
      <g className="gc-coins">
        {[[52, 74], [80, 62], [108, 70], [134, 62], [66, 86], [98, 84], [124, 86]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="15" ry="6" fill="url(#gcg)" stroke="#0a0716" strokeWidth="3" />)}
      </g>
      <rect x="18" y="82" width="154" height="74" rx="8" fill="url(#gcw)" stroke="#0a0716" strokeWidth="5" />
      <rect x="18" y="82" width="154" height="14" fill="#2b1808" opacity=".55" />
      {[44, 146].map((x) => <rect key={x} x={x - 8} y="82" width="16" height="74" fill="url(#gcg)" stroke="#0a0716" strokeWidth="4" />)}
      <g className="gc-lid">
        <path d="M18 84 Q18 34 95 34 Q172 34 172 84 Z" fill="url(#gcw)" stroke="#0a0716" strokeWidth="5" strokeLinejoin="round" />
        {[44, 146].map((x) => <path key={x} d={`M${x - 8} 84 Q${x - 8} 42 ${x} 38 Q${x + 8} 42 ${x + 8} 84 Z`} fill="url(#gcg)" stroke="#0a0716" strokeWidth="4" strokeLinejoin="round" />)}
        <path d="M34 60 Q60 40 95 40" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="5" strokeLinecap="round" />
      </g>
      <rect x="82" y="78" width="26" height="30" rx="6" fill="url(#gcg)" stroke="#0a0716" strokeWidth="4" />
      <circle cx="95" cy="92" r="4.5" fill="#0a0716" /><rect x="93" y="93" width="4" height="9" rx="2" fill="#0a0716" />
    </svg>
  );
  if (small) return svg;
  return <div className={`gc-chest ${shaking ? 'is-shaking' : ''} ${open ? 'is-open' : ''}`} onClick={onClick} role="button" aria-label={t('Abrir el cofre')} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }} data-gift-chest>{svg}</div>;
};

/**
 * Gifts from the house (operator gifts). A chest floats in the corner while one is waiting; opening it credits the account once,
 * on the server. The amount comes from the server's answer, never from the browser.
 */
export const GiftChest: React.FC = () => {
  const { gifts, openGift, ledgerOn } = useGame();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'shaking' | 'open'>('idle');
  const [got, setGot] = useState<{ amount: number; note: string } | null>(null);

  const first = gifts[0];
  if (!ledgerOn || (!first && !got)) return null;

  const close = () => { setOpen(false); setPhase('idle'); setGot(null); };
  const doOpen = async () => {
    if (!first || phase !== 'idle') return;
    setPhase('shaking');
    const [res] = await Promise.all([openGift(first.id), new Promise((r) => setTimeout(r, 1100))]);
    if (!res) { setPhase('idle'); return; }
    setGot(res); setPhase('open');
    playHarvestChime();
    confetti({ particleCount: 140, spread: 90, startVelocity: 42, origin: { y: 0.55 }, colors: ['#fbbf24', '#fde68a', '#a3e635', '#c084fc'], disableForReducedMotion: true });
  };

  return (
    <>
      {first && !open && (
        <button type="button" className="gc-fab" onClick={() => setOpen(true)} data-testid="gift-fab" aria-label={t('Tienes un cofre de regalo')}>
          <ChestArt small /> <span>{t('COFRE DE REGALO{v0}', { v0: gifts.length > 1 ? ` ×${gifts.length}` : '' })}</span>
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm grid place-items-center p-4" role="dialog" aria-modal aria-label={t('Cofre de regalo')} onClick={phase === 'idle' || phase === 'open' ? close : undefined} data-testid="gift-modal">
          <div className="fp-shell w-full max-w-sm p-5 text-center space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end -mb-2"><button type="button" className="fp-x" onClick={close} aria-label={t('Cerrar')}><X className="w-4 h-4" /></button></div>
            <h3 className="font-serif text-xl font-black text-white">{phase === 'open' ? t('¡Regalo recibido!') : t('Un cofre para ti')}</h3>
            <div className="gc-stage">
              <span className="gc-glow" />
              <ChestArt open={phase === 'open'} shaking={phase === 'shaking'} onClick={doOpen} />
            </div>
            {phase !== 'open' && (
              <>
                <p className="text-[12px] text-neutral-300 leading-snug">{t('{v0}. Toca el cofre para abrirlo.', { v0: first?.note || t('Regalo de la casa') })}</p>
                <button type="button" className="fp-cta w-full justify-center" disabled={phase === 'shaking'} onClick={doOpen} data-gift-open>{phase === 'shaking' ? t('Abriendo…') : t('Abrir cofre')}</button>
              </>
            )}
            {phase === 'open' && got && (
              <div className="gc-amount space-y-2">
                <div className="text-3xl font-black font-mono text-amber-300 flex items-center justify-center gap-2" data-testid="gift-amount"><Flame className="w-6 h-6" />+{got.amount.toLocaleString()} $FLORA</div>
                <p className="text-[12px] text-neutral-300">{t('{v0}. Ya está en tu cartera.', { v0: got.note || t('Regalo de la casa') })}</p>
                <button type="button" className="fp-cta w-full justify-center" onClick={close}>{t('¡Gracias!')}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
