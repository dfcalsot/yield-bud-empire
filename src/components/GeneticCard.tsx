import React, { useRef, useState } from 'react';
import { Check, Copy, Info, X } from 'lucide-react';
import { RarityFrame, RARITY_STYLE } from './game/GameUI';
import { CannabisLeaf, DnaLeaf, Seed } from './icons/CannabisIcons';
import { SeedArt } from './SeedArt';
import { GeneticCardData, mintAddressFor, serialFor, shortAddress } from '../utils/nft';

interface GeneticCardProps {
  card: GeneticCardData;
  selected?: boolean;
  /** Renders the card back (used by the mint ceremony). */
  faceDown?: boolean;
  compact?: boolean;
  children?: React.ReactNode; // footer actions
}

const KIND_ICON = { seed: Seed, hybrid: DnaLeaf, patent: DnaLeaf } as const;

/** Small floating motes inside the art window (cheap: transform/opacity only). */
const MOTES = Array.from({ length: 7 }, (_, i) => ({ left: 10 + ((i * 41) % 80), delay: (i * 1.3) % 7, size: 2 + (i % 3) }));

export const GeneticCardBack: React.FC<{ color: string; rarity: GeneticCardData['rarity'] }> = ({ color, rarity }) => {
  const { color: rc } = RARITY_STYLE[rarity];
  return (
    <div className="absolute inset-0 rounded-[14px] overflow-hidden border" style={{ borderColor: `${rc}99`, background: `radial-gradient(circle at 50% 40%, ${color}44, #030907 70%)` }}>
      <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(30deg, #34d39922 12%, transparent 12.5%, transparent 87%, #34d39922 87.5%), linear-gradient(150deg, #34d39922 12%, transparent 12.5%, transparent 87%, #34d39922 87.5%)', backgroundSize: '28px 48px' }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
        <CannabisLeaf className="w-24 h-24" />
        <div className="font-serif font-black tracking-[0.3em] text-sm" style={{ color: rc, textShadow: `0 0 14px ${rc}` }}>CHRONOFLORA</div>
      </div>
    </div>
  );
};

export const GeneticCard: React.FC<GeneticCardProps> = ({ card, selected, faceDown, compact, children }) => {
  const tiltRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [turning, setTurning] = useState(false);
  const { label: rarityLabel, color: rc } = RARITY_STYLE[card.rarity];
  const mint = mintAddressFor(card.id);
  const KindIcon = KIND_ICON[card.kind];
  const shiny = card.rarity === 'epic' || card.rarity === 'legendary';

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el || e.pointerType === 'touch') return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--rx', `${((0.5 - py) * 9).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((px - 0.5) * 11).toFixed(2)}deg`);
    el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
  };
  const onLeave = () => {
    const el = tiltRef.current;
    if (!el) return;
    ['--rx', '--ry'].forEach((p) => el.style.setProperty(p, '0deg'));
  };

  const copyMint = async () => {
    try {
      await navigator.clipboard.writeText(mint);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable: ignore */
    }
  };

  // half-turn animation: swap faces at the edge-on moment
  const flip = () => {
    if (turning) return;
    setTurning(true);
    window.setTimeout(() => setFlipped((f) => !f), 170);
    window.setTimeout(() => setTurning(false), 350);
  };

  return (
    <div ref={tiltRef} className="nft-tilt h-full" onPointerMove={onMove} onPointerLeave={onLeave}>
      <RarityFrame rarity={card.rarity} selected={selected} className="nft-card h-full">
        <div className={`h-full flex flex-col ${turning ? 'nft-turn' : ''}`}>
          {faceDown ? (
            <div className="relative w-full" style={{ aspectRatio: '5 / 7' }}>
              <GeneticCardBack color={card.color} rarity={card.rarity} />
            </div>
          ) : (
            <>
              {/* ───────── front (kept in flow while flipped so the card never changes height) ───────── */}
              <div className={`h-full flex flex-col ${flipped ? 'invisible' : ''}`}>
                <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 text-[10px] font-mono uppercase tracking-wider">
                  <span className="font-black" style={{ color: rc, textShadow: `0 0 10px ${rc}88` }}>◆ {rarityLabel}</span>
                  <span className="text-neutral-400">{card.tag}</span>
                </div>

                {/* art window */}
                <div className="relative mx-2.5 rounded-xl overflow-hidden border border-white/10" style={{ aspectRatio: compact ? '16 / 9' : '4 / 3', background: `radial-gradient(circle at 50% 38%, ${card.color}55 0%, ${card.color}18 45%, #030907 80%)` }}>
                  <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'linear-gradient(30deg, #fff 12%, transparent 12.5%, transparent 87%, #fff 87.5%), linear-gradient(150deg, #fff 12%, transparent 12.5%, transparent 87%, #fff 87.5%)', backgroundSize: '24px 42px' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="absolute w-2/3 aspect-square rounded-full blur-2xl opacity-60" style={{ background: card.color }} />
                    <div className="absolute w-1/2 aspect-square rounded-full border opacity-40" style={{ borderColor: card.color }} />
                    {card.kind === 'seed' ? (
                      <SeedArt className="relative w-[62%] aspect-square" tint={card.color} rarityColor={rc} rarity={card.rarity} owned={card.owned ?? 0} />
                    ) : (
                      <CannabisLeaf className="relative w-[46%] h-[46%] text-emerald-50" />
                    )}
                  </div>
                  {MOTES.map((m, i) => (
                    <span key={i} className="cf-spore absolute bottom-1 rounded-full bg-white/80" style={{ left: `${m.left}%`, width: m.size, height: m.size, animationDelay: `${m.delay}s`, ['--dx' as string]: '8px', animationDuration: '7s' }} />
                  ))}
                  <div className="absolute left-2 top-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/55 text-[10px] font-mono text-neutral-200">
                    <KindIcon className="w-3.5 h-3.5" /> {serialFor(card.id)}
                  </div>
                  {card.owned ? (
                    <div className="absolute right-2 top-2 px-1.5 py-0.5 rounded-md bg-emerald-400/90 text-neutral-950 text-[10px] font-black font-mono">x{card.owned}</div>
                  ) : null}
                  {shiny && <div className="nft-foil" />}
                  <div className="nft-glare" />
                </div>

                {/* name + species / difficulty chips */}
                <div className="px-3 pt-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-[15px] leading-tight font-bold text-white min-h-[2.4em]" title={card.name}>{card.name}</h3>
                    <button onClick={flip} aria-label="Ver ficha técnica completa" title="Ficha técnica completa" className="shrink-0 mt-0.5 p-1 rounded-md border border-white/15 text-neutral-300 hover:text-emerald-300 hover:border-emerald-300/50 cursor-pointer transition">
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-[10.5px] font-mono text-neutral-400 truncate" title={card.subtitle}>{card.subtitle}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {card.meta.map((m) => (
                      <span key={m} className="text-[9.5px] px-1.5 py-0.5 rounded border font-mono" style={{ borderColor: `${rc}55`, color: rc, background: `${rc}12` }}>{m}</span>
                    ))}
                  </div>
                </div>

                {/* stats */}
                <div className="px-3 pt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {card.stats.map((s) => (
                    <div key={s.label}>
                      <div className="flex justify-between text-[9px] font-mono uppercase tracking-wider text-neutral-400">
                        <span>{s.label}</span>
                        <span style={{ color: s.color }}>{s.text}</span>
                      </div>
                      <div className="h-1.5 rounded-sm bg-neutral-950 border border-neutral-700/60 overflow-hidden">
                        <div className="h-full" style={{ width: `${s.value}%`, background: `repeating-linear-gradient(90deg, ${s.color} 0 4px, transparent 4px 5px)`, boxShadow: `0 0 8px ${s.color}88` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* terpenes */}
                <div className="px-3 pt-2 flex flex-wrap gap-1">
                  {card.terpenes.map((t) => (
                    <span key={t} className="text-[9.5px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-300 font-mono">#{t}</span>
                  ))}
                </div>

                {/* mint */}
                <div className="mx-3 mt-2.5 mb-2.5 flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-[10px] font-mono">
                  <span className="text-neutral-500 shrink-0">MINT</span>
                  <span className="text-emerald-300 truncate" title={`${mint} (identificador simulado en Devnet)`}>{shortAddress(mint, 5, 5)}</span>
                  <span className="text-[8px] px-1 rounded bg-neutral-700/70 text-neutral-300 shrink-0" title="La red del juego es una simulación de Devnet">SIM</span>
                  <button onClick={copyMint} aria-label="Copiar mint address" className="text-neutral-400 hover:text-emerald-300 cursor-pointer shrink-0">
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {children && <div className="mt-auto px-3 pb-3 space-y-2">{children}</div>}
              </div>

              {/* ───────── back: full technical sheet ───────── */}
              {flipped && (
                <div className="absolute inset-0 flex flex-col" style={{ background: `linear-gradient(160deg, ${card.color}22, #04090a 55%)` }}>
                  <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 text-[10px] font-mono uppercase tracking-wider shrink-0">
                    <span className="font-black" style={{ color: rc }}>◆ Ficha técnica</span>
                    <button onClick={flip} aria-label="Volver a la carta" className="p-1 rounded-md border border-white/15 text-neutral-300 hover:text-white cursor-pointer">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="px-3 pb-3 overflow-y-auto scrollbar-none space-y-3 text-[11px]">
                    <div>
                      <h3 className="font-serif text-base font-bold text-white leading-tight">{card.name}</h3>
                      <div className="text-[10px] font-mono text-neutral-500">{serialFor(card.id)} · {rarityLabel}</div>
                    </div>

                    <dl className="space-y-1">
                      {card.attributes.map((a, i) => (
                        <div key={`${a.label}${i}`} className="flex justify-between gap-3 border-b border-white/5 pb-1">
                          <dt className="text-neutral-500 font-mono shrink-0">{a.label}</dt>
                          <dd className="text-neutral-100 text-right break-words min-w-0">{a.value}</dd>
                        </div>
                      ))}
                    </dl>

                    {card.terpeneProfile.length > 0 && (
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-1">Perfil terpénico</div>
                        <div className="space-y-1">
                          {card.terpeneProfile.map((t) => (
                            <div key={t.label} className="grid grid-cols-[5.5rem_1fr_2.6rem] items-center gap-2 font-mono">
                              <span className="text-neutral-300 truncate">{t.label}</span>
                              <div className="h-1.5 rounded-sm bg-neutral-950 border border-neutral-700/60 overflow-hidden">
                                <div className="h-full" style={{ width: `${Math.min(100, (t.pct / 1.2) * 100)}%`, background: card.color, boxShadow: `0 0 6px ${card.color}` }} />
                              </div>
                              <span className="text-right text-neutral-300">{t.pct.toFixed(2)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {card.description && <p className="text-neutral-400 leading-snug">{card.description}</p>}

                    <div className="rounded-lg bg-black/40 border border-white/10 p-2 font-mono">
                      <div className="flex items-center justify-between text-[9px] text-neutral-500 uppercase tracking-wider mb-1">
                        <span>Mint address · Devnet simulada</span>
                        <button onClick={copyMint} aria-label="Copiar mint address" className="text-neutral-400 hover:text-emerald-300 cursor-pointer">
                          {copied ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="text-emerald-300 break-all text-[10px]">{mint}</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </RarityFrame>
    </div>
  );
};
