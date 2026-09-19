import React from 'react';

/**
 * Cannabis-industry icon set (24x24, drop-in for lucide icons: size them with
 * Tailwind w-/h- classes, color them with currentColor).
 */
export interface IconProps {
  className?: string;
  strokeWidth?: number;
}

export type IconComponent = React.FC<IconProps>;

const Svg: React.FC<IconProps & { children: React.ReactNode }> = ({
  className,
  strokeWidth = 1.6,
  children,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

// [angle, length, half-width] for the 7 leaflets of a cannabis fan leaf
const LEAFLETS: Array<[number, number, number]> = [
  [0, 13, 2.1],
  [-30, 11, 1.8],
  [30, 11, 1.8],
  [-58, 8.5, 1.5],
  [58, 8.5, 1.5],
  [-82, 6, 1.2],
  [82, 6, 1.2],
];

const leafletPath = (length: number, w: number) =>
  `M0 0C${-w} ${-length * 0.3} ${-w * 0.85} ${-length * 0.75} 0 ${-length}` +
  `C${w * 0.85} ${-length * 0.75} ${w} ${-length * 0.3} 0 0Z`;

/** Solid 7-leaflet cannabis leaf whose stem base sits at (x, y). */
const LeafShape: React.FC<{ x: number; y: number; scale: number }> = ({ x, y, scale }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} fill="currentColor" stroke="none">
    {LEAFLETS.map(([angle, length, w]) => (
      <path key={angle} d={leafletPath(length, w)} transform={`rotate(${angle})`} />
    ))}
  </g>
);

/** Cannabis fan leaf — cultivation. */
export const CannabisLeaf: IconComponent = (props) => (
  <Svg {...props}>
    <LeafShape x={12} y={17.2} scale={0.93} />
    <path d="M12 16.5V22" strokeWidth={1.8} />
  </Svg>
);

/** Cannabis seed with tiger striping — seed bank. */
export const Seed: IconComponent = (props) => (
  <Svg {...props}>
    <g transform="rotate(32 12 12)">
      <path d="M12 2.4C16.3 4.5 17.9 10 16.9 14.6C16.1 18.6 13.9 21.6 12 21.6C10.1 21.6 7.9 18.6 7.1 14.6C6.1 10 7.7 4.5 12 2.4Z" />
      <path d="M8 9.2c2.3 1.4 5.7 1.4 8 0M7.5 13c2.7 1.6 6.3 1.6 9 0M8.6 17c1.9 1 4.9 1 6.8 0" />
    </g>
  </Svg>
);

/** Trichome: capitate-stalked resin gland — microscope / potency. */
export const Trichome: IconComponent = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="7.2" r="4.6" />
    <path d="M10.2 5.4a2.6 2.6 0 0 1 2.1-1.2" />
    <path d="M12 11.8V19" />
    <path d="M8.5 21h7" />
    <path d="M10.6 15.4l1.4-1 1.4 1" />
  </Svg>
);

/** Erlenmeyer flask with a leaf inside — extraction lab. */
export const FlaskLeaf: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M9 3h6" />
    <path d="M10 3v6.4L4.6 19.1A1.7 1.7 0 0 0 6 21.6h12a1.7 1.7 0 0 0 1.4-2.5L14 9.4V3" />
    <path d="M7.6 15.5h8.8" strokeWidth={1.2} />
    <LeafShape x={12} y={20} scale={0.42} />
  </Svg>
);

/** Rosin press (plates + drop of live rosin). */
export const RosinPress: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M12 4V2M9 2h6" />
    <rect x="4" y="4" width="16" height="3.6" rx="1" />
    <path d="M12 7.6v3" />
    <rect x="4" y="10.6" width="16" height="3" rx="1" />
    <path d="M12 15.6c1.5 2 2.4 3 2.4 4.1a2.4 2.4 0 0 1-4.8 0c0-1.1.9-2.1 2.4-4.1z" />
  </Svg>
);

/** Curing jar with a leaf label — product / market. */
export const CuringJar: IconComponent = (props) => (
  <Svg {...props}>
    <rect x="7" y="2.4" width="10" height="3.2" rx="1" />
    <path d="M7.6 5.6h8.8v.9c1.2.7 2.1 1.9 2.1 3.3v9.2a2.5 2.5 0 0 1-2.5 2.5H8a2.5 2.5 0 0 1-2.5-2.5V9.8c0-1.4.9-2.6 2.1-3.3z" />
    <LeafShape x={12} y={19} scale={0.56} />
  </Svg>
);

/** Nutrient bottle with a drop — feeding charts. */
export const NutrientBottle: IconComponent = (props) => (
  <Svg {...props}>
    <rect x="9.4" y="2.4" width="5.2" height="3" rx="0.8" />
    <path d="M9 5.4h6l2 3v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-11z" />
    <path d="M12 11c1.6 2 2.6 3.2 2.6 4.5a2.6 2.6 0 0 1-5.2 0c0-1.3 1-2.5 2.6-4.5z" />
  </Svg>
);

/** DNA helix with a small leaf — genetics / mother plants. */
export const DnaLeaf: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M6 3c0 4 9 5 9 9s-9 5-9 9" />
    <path d="M15 3c0 4-9 5-9 9s9 5 9 9" />
    <path d="M7.2 6.6h6.6M7.2 17.4h6.6M6.6 12h7.8" />
    <LeafShape x={19} y={9.4} scale={0.4} />
  </Svg>
);

/** LED grow light with rays — grow hardware. */
export const GrowLight: IconComponent = (props) => (
  <Svg {...props}>
    <rect x="3" y="3" width="18" height="4.2" rx="1.6" />
    <circle cx="7.5" cy="5.1" r="0.55" fill="currentColor" />
    <circle cx="12" cy="5.1" r="0.55" fill="currentColor" />
    <circle cx="16.5" cy="5.1" r="0.55" fill="currentColor" />
    <path d="M6 10l-1.6 3.6M12 10v4M18 10l1.6 3.6" />
    <LeafShape x={12} y={22} scale={0.42} />
  </Svg>
);

/** Dispensary storefront with a leaf on the door. */
export const Dispensary: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M3.4 9.2 5 4h14l1.6 5.2" />
    <path d="M3.4 9.2a2.87 2.87 0 0 0 5.73 0 2.87 2.87 0 0 0 5.74 0 2.87 2.87 0 0 0 5.73 0" />
    <path d="M4.6 11.6V20h14.8v-8.4" />
    <LeafShape x={12} y={18.4} scale={0.5} />
  </Svg>
);

/** Coin stamped with a leaf — $FLORA tokenomics. */
export const LeafCoin: IconComponent = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="9.5" />
    <circle cx="12" cy="12" r="7.3" strokeWidth={0.9} />
    <LeafShape x={12} y={16.4} scale={0.6} />
  </Svg>
);

/** Book with a leaf — whitepaper. */
export const BookLeaf: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M5 4.6A1.6 1.6 0 0 1 6.6 3H19v15H6.6A1.6 1.6 0 0 0 5 19.6z" />
    <path d="M5 19.6A1.6 1.6 0 0 0 6.6 21H19v-3" />
    <LeafShape x={12.2} y={15} scale={0.46} />
  </Svg>
);

/** Snowflake — cold-storage chamber. */
export const ColdChamber: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M12 2.5v19M3.8 7.2l16.4 9.6M3.8 16.8l16.4-9.6" />
    <path d="M9.6 4.4 12 6.4l2.4-2M9.6 19.6 12 17.6l2.4 2" />
    <path d="M4.4 10 7.4 10.6 6.6 7.6M19.6 14l-3-.6.8 3M4.4 14l3-.6-.8 3M19.6 10l-3 .6.8-3" />
  </Svg>
);

/** Thermometer with a snow drop — temperature control. */
export const ColdThermometer: IconComponent = (props) => (
  <Svg {...props}>
    <path d="M10 13.4V5a2 2 0 1 1 4 0v8.4a4 4 0 1 1-4 0z" />
    <path d="M12 8v7.6" />
    <circle cx="12" cy="17.2" r="1.3" fill="currentColor" />
    <path d="M17.5 6h3M17.5 9h2M17.5 12h3" />
  </Svg>
);
