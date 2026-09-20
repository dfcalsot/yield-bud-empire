import React from 'react';
import { BadgeCheck } from 'lucide-react';
import type { ProcessedProduct } from '../../types';
import { RarityFrame, RARITY_STYLE, Rarity } from '../game/GameUI';
import { PRODUCT_INFO, STATION_BY_ID } from '../../lab/stations';
import { CuringJar } from '../icons/CannabisIcons';

export const rarityOfQuality = (q: number): Rarity => (q >= 98 ? 'legendary' : q >= 95 ? 'epic' : q >= 92 ? 'rare' : 'common');

/** NFT-style card for a minted lab batch (batch hash = the on-chain lot id). */
export const ProductCard: React.FC<{ product: ProcessedProduct; className?: string }> = ({ product, className = '' }) => {
  const info = PRODUCT_INFO[product.type];
  const Icon = info.station ? STATION_BY_ID[info.station].icon : CuringJar;
  const rarity = rarityOfQuality(product.qualityScore);
  const { label: rarityLabel, color: rc } = RARITY_STYLE[rarity];

  return (
    <RarityFrame rarity={rarity} className={`w-full ${className}`}>
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 text-[10px] font-mono uppercase tracking-wider">
        <span className="font-black" style={{ color: rc, textShadow: `0 0 10px ${rc}88` }}>◆ {rarityLabel}</span>
        <span className="text-neutral-400">{info.label}</span>
      </div>

      <div className="relative mx-2.5 rounded-xl overflow-hidden border border-white/10 aspect-[16/9] flex items-center justify-center" style={{ background: `radial-gradient(circle at 50% 45%, ${info.color}44 0%, ${info.color}14 50%, #030907 85%)` }}>
        <div className="absolute w-24 h-24 rounded-full blur-2xl opacity-60" style={{ background: info.color }} />
        <Icon className="relative w-14 h-14" />
        {product.certified && (
          <span className="absolute right-2 top-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-400/90 text-neutral-950 text-[9px] font-black font-mono">
            <BadgeCheck className="w-3 h-3" /> COA
          </span>
        )}
        <span className="absolute left-2 top-2 px-1.5 py-0.5 rounded-md bg-black/55 text-[10px] font-mono text-neutral-200">{product.quantityGrams} g</span>
      </div>

      <div className="px-3 pt-2.5">
        <h4 className="font-serif text-[13.5px] leading-tight font-bold text-white" title={product.name}>{product.name}</h4>
        <div className="text-[10px] font-mono text-neutral-400 truncate">{product.potency}</div>
      </div>

      <div className="px-3 pt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {[
          { l: 'Calidad', v: product.qualityScore, t: `${product.qualityScore}%`, c: '#34d399' },
          { l: 'Valor', v: Math.min(100, product.marketValueFlora / 8), t: `${product.marketValueFlora} $FLORA`, c: '#fbbf24' },
        ].map((s) => (
          <div key={s.l}>
            <div className="flex justify-between text-[9px] font-mono uppercase tracking-wider text-neutral-400"><span>{s.l}</span><span style={{ color: s.c }}>{s.t}</span></div>
            <div className="h-1.5 rounded-sm bg-neutral-950 border border-neutral-700/60 overflow-hidden">
              <div className="h-full" style={{ width: `${s.v}%`, background: `repeating-linear-gradient(90deg, ${s.c} 0 4px, transparent 4px 5px)`, boxShadow: `0 0 8px ${s.c}88` }} />
            </div>
          </div>
        ))}
      </div>

      {product.coa && (
        <div className="px-3 pt-2 flex flex-wrap gap-1">
          {[['THC', product.coa.thc], ['CBD', product.coa.cbd], ['CBN', product.coa.cbn], ['CBG', product.coa.cbg]].map(([k, v]) => (
            <span key={String(k)} className="text-[9.5px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-300 font-mono">{k} {v}%</span>
          ))}
        </div>
      )}

      <div className="mx-3 mt-2.5 mb-2.5 flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-black/40 border border-white/10 text-[10px] font-mono">
        <span className="text-neutral-500 shrink-0">LOTE</span>
        <span className="text-emerald-300 truncate" title={product.batchHash}>{product.batchHash}</span>
        <span className="text-[8px] px-1 rounded bg-neutral-700/70 text-neutral-300 shrink-0" title="Identificador de lote simulado en Devnet">SIM</span>
      </div>
    </RarityFrame>
  );
};
