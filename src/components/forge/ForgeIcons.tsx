import React from 'react';
import { LeafShape, Svg, type IconComponent } from '../icons/CannabisIcons';
import type { DerivedType, MaterialId } from '../../sim/forge';

/**
 * Forge icon set: one glyph per material and per sellable derived product, in the same
 * 24x24 stroke language as `CannabisIcons.tsx` (drop-in, size with w-/h-, color with currentColor).
 */

const RawFiber: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M11 3v13.5" />
    <path d="M11 5.5c-2.6-1-4.6-.4-6.4 1.3M11 9c-2.9-.8-5.1 0-7 2M11 12.5c-2.6-.5-4.6.3-6.2 2.1" />
    <path d="M11 5.5c2.6-1 4.6-.4 6.4 1.3M11 9c2.9-.8 5.1 0 7 2M11 12.5c2.6-.5 4.6.3 6.2 2.1" />
    <path d="M8 20.5h6" />
  </Svg>
);

const ThreadSpool: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M6 4h12M6 20h12" />
    <path d="M7 4c0 4 10 4 10 8s-10 4-10 8M17 4c0 4-10 4-10 8s10 4 10 8" strokeWidth={1.3} />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </Svg>
);

const CordKnot: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M4 8c0-2.8 2.2-4.4 4.6-3.6 2 .7 2.6 3 2.6 5.6v4c0 2.6.6 4.9 2.6 5.6 2.4.8 4.6-.8 4.6-3.6" />
    <path d="M8.2 5.6c-1.6.9-1.8 3-1.8 4.8M15.8 18.4c1.6-.9 1.8-3 1.8-4.8" strokeWidth={1.2} />
  </Svg>
);

const ClothSquare: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M4.5 5.5 12 3l7.5 2.5-1.6 3.8L12 7.8 6.1 9.3z" />
    <path d="M6.1 9.3 4.5 5.5M17.9 9.3l1.6-3.8" />
    <path d="M6.1 9.3v9.6c1.6.9 3.9 1.4 5.9 1.4s4.3-.5 5.9-1.4V9.3" />
    <path d="M8.6 12.4c1.9.9 4.9.9 6.8 0" strokeWidth={1.1} />
  </Svg>
);

const PaperSheet: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M6.5 2.6h8.4L19 7v14.4H6.5z" />
    <path d="M14.9 2.6V7H19" />
    <path d="M9 12h6M9 15.2h6M9 18.4h3.6" strokeWidth={1.2} />
  </Svg>
);

const WaxBlock: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M6 9h12v11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1z" />
    <path d="M9.5 9c-.4-2 .4-3.2 1.3-4.4.9 1.2-.1 2 .3 3.4M14.5 9c-.4-2 .4-3.2 1.3-4.4.9 1.2-.1 2 .3 3.4" strokeWidth={1.2} />
    <path d="M6 13.4h12" strokeWidth={1.1} />
  </Svg>
);

const OilDroplet: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M8.5 3h7l.9 4.4H7.6z" />
    <path d="M7.6 7.4h8.8l1 10.6a2.6 2.6 0 0 1-2.6 2.6H9.2a2.6 2.6 0 0 1-2.6-2.6z" />
    <path d="M12 11.4c1.4 1.7 2.1 2.7 2.1 3.8a2.1 2.1 0 0 1-4.2 0c0-1.1.7-2.1 2.1-3.8z" fill="currentColor" stroke="none" />
  </Svg>
);

const ResinDrop: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M12 2.8c3 3.6 6.4 8 6.4 11.6a6.4 6.4 0 1 1-12.8 0c0-3.6 3.4-8 6.4-11.6Z" />
    <path d="M9.6 15.2c0 1.6 1 2.8 2.4 3" strokeWidth={1.2} opacity=".7" />
  </Svg>
);

const BiocharChunk: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M5 15.4 7.4 8l4-2.4L18 7l1 6.4-3.4 6.4-7 1.4z" />
    <path d="M9 10.4l1.6 2.4-1 3M14.4 9.6l1.4 3-1.6 3.4" strokeWidth={1.1} opacity=".75" />
  </Svg>
);

const CompostPile: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M3.4 18.4c1-4.4 4.2-7 8.6-7s7.6 2.6 8.6 7z" />
    <path d="M6.6 18.4c.5-2.4 2.4-3.8 5.4-3.8s4.9 1.4 5.4 3.8" strokeWidth={1.1} opacity=".75" />
    <LeafShape x={12} y={11.2} scale={0.4} />
  </Svg>
);

const PollinationKit: IconComponent = (props) => (
  <Svg {...props}>
    <rect x="3.5" y="10" width="12" height="9.4" rx="1.4" />
    <path d="M3.5 13.6h12" strokeWidth={1.1} />
    <path d="M17.5 10.4 20 4.8" />
    <path d="M20 4.8c1 .2 1.6 1 1.4 2-.6.9-1.8.9-2.4-.2-.4-.9 0-1.6 1-1.8Z" />
    <LeafShape x={9.5} y={19} scale={0.32} />
  </Svg>
);

const IsolationBag: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M7 9.4 8 4h8l1 5.4" />
    <path d="M6.3 9.4h11.4l-1 11a1.8 1.8 0 0 1-1.8 1.6H9.1a1.8 1.8 0 0 1-1.8-1.6z" />
    <path d="M9 4c0 2 1.3 3.2 3 3.2S15 6 15 4" strokeWidth={1.2} />
  </Svg>
);

const ReagentFlask: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M10 3h4" />
    <path d="M11 3v6.2l-4.9 9a1.8 1.8 0 0 0 1.6 2.7h8.6a1.8 1.8 0 0 0 1.6-2.7L13 9.2V3" />
    <path d="M8.2 15.6h7.6" strokeWidth={1.1} />
    <circle cx="10.5" cy="18.2" r="0.7" fill="currentColor" stroke="none" />
    <circle cx="13.2" cy="17" r="0.5" fill="currentColor" stroke="none" />
  </Svg>
);

const IdentitySeal: IconComponent = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="10" r="6.4" />
    <LeafShape x={12} y={12.6} scale={0.42} />
    <path d="M8.6 15.8 6.6 21.4l3-1 1.4 2.6 1.6-4.9M15.4 15.8l2 5.6-3-1-1.4 2.6-1.6-4.9" />
  </Svg>
);

const BalmTin: IconComponent = (props) => (
  <Svg {...props}>
    <ellipse cx="12" cy="7.4" rx="6.6" ry="2.2" />
    <path d="M5.4 7.4v9.2c0 1.2 3 2.2 6.6 2.2s6.6-1 6.6-2.2V7.4" />
    <path d="M5.4 12c0 1.2 3 2.2 6.6 2.2s6.6-1 6.6-2.2" strokeWidth={1.1} />
    <LeafShape x={12} y={7.9} scale={0.3} />
  </Svg>
);

const AromaCandle: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M9.5 9h5v11a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1z" />
    <path d="M12 9V5.4" />
    <path d="M12 2.6c1.1 1.1 1.6 2 1.6 2.8a1.6 1.6 0 0 1-3.2 0c0-.8.5-1.7 1.6-2.8Z" fill="currentColor" stroke="none" />
    <path d="M9.5 13.4h5" strokeWidth={1.1} opacity=".7" />
  </Svg>
);

const TinctureBottle: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M10.6 2.6h2.8v3.2h-2.8z" />
    <path d="M9.8 5.8h4.4l.9 2.6v11a2 2 0 0 1-2 2h-2.2a2 2 0 0 1-2-2v-11z" />
    <path d="M9.6 12.4h4.8" strokeWidth={1.1} opacity=".7" />
    <path d="M12 2.6V1.2" strokeWidth={1.3} />
  </Svg>
);

export const MATERIAL_ICON: Record<MaterialId, IconComponent> = {
  fibra_cruda: RawFiber,
  fibra_hilada: ThreadSpool,
  cordel: CordKnot,
  tela: ClothSquare,
  papel: PaperSheet,
  cera: WaxBlock,
  aceite_vegetal: OilDroplet,
  resina_refinada: ResinDrop,
  biochar: BiocharChunk,
  compost: CompostPile,
  kit_polinizacion: PollinationKit,
  bolsa_aislamiento: IsolationBag,
  reactivo: ReagentFlask,
  sello_identidad: IdentitySeal,
};

export const PRODUCT_ICON: Record<DerivedType, IconComponent> = {
  balm: BalmTin,
  candle: AromaCandle,
  tincture: TinctureBottle,
};

/** Renders the right SVG glyph for a forge material id (falls back to the raw-fibre glyph if unknown). */
export const MaterialGlyph: React.FC<{ id: MaterialId; className?: string }> = ({ id, className }) => {
  const Icon = MATERIAL_ICON[id] ?? RawFiber;
  return <Icon className={className} />;
};

/** Renders the right SVG glyph for a forge-derived sellable product. */
export const ProductGlyph: React.FC<{ type: DerivedType; className?: string }> = ({ type, className }) => {
  const Icon = PRODUCT_ICON[type];
  return <Icon className={className} />;
};
