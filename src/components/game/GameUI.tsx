import React, { useEffect, useRef } from 'react';

/** Glass HUD panel with cut corners and a neon edge (styles live in index.css). */
export const HudPanel: React.FC<{
  title?: React.ReactNode;
  accessory?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ title, accessory, className = '', children }) => (
  <section className={`hud-panel ${className}`}>
    {(title || accessory) && (
      <header className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
        <h3 className="font-serif text-sm font-bold tracking-[0.14em] uppercase text-emerald-200 flex items-center gap-2">
          {title}
        </h3>
        {accessory}
      </header>
    )}
    {children}
  </section>
);

type NeonTone = 'emerald' | 'cyan' | 'amber' | 'magenta';

const TONES: Record<NeonTone, string> = {
  emerald: 'text-emerald-200 border-emerald-300/50 bg-emerald-400/10 hover:bg-emerald-400/20 shadow-[0_0_16px_-4px_rgba(52,211,153,0.6)]',
  cyan: 'text-cyan-200 border-cyan-300/50 bg-cyan-400/10 hover:bg-cyan-400/20 shadow-[0_0_16px_-4px_rgba(34,211,238,0.6)]',
  amber: 'text-amber-200 border-amber-300/50 bg-amber-400/10 hover:bg-amber-400/20 shadow-[0_0_16px_-4px_rgba(251,191,36,0.6)]',
  magenta: 'text-fuchsia-200 border-fuchsia-300/50 bg-fuchsia-400/10 hover:bg-fuchsia-400/20 shadow-[0_0_16px_-4px_rgba(232,121,249,0.6)]',
};

export const NeonButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: NeonTone }
> = ({ tone = 'emerald', className = '', children, ...rest }) => (
  <button
    {...rest}
    className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-bold tracking-wider uppercase transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${TONES[tone]} ${className}`}
  >
    {children}
  </button>
);

/** Game-style segmented bar (HP / energy look). */
export const StatBar: React.FC<{
  value: number; // 0..100
  color?: string;
  label?: string;
  valueLabel?: string;
}> = ({ value, color = '#34d399', label, valueLabel }) => (
  <div className="space-y-1">
    {(label || valueLabel) && (
      <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-neutral-400">
        <span>{label}</span>
        <span style={{ color }}>{valueLabel}</span>
      </div>
    )}
    <div className="h-2 rounded-sm bg-neutral-950 border border-neutral-700/70 overflow-hidden">
      <div
        className="h-full transition-[width] duration-700"
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          background: `repeating-linear-gradient(90deg, ${color} 0 6px, transparent 6px 8px)`,
          boxShadow: `0 0 10px ${color}`,
        }}
      />
    </div>
  </div>
);

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export const RARITY_STYLE: Record<Rarity, { label: string; color: string }> = {
  common: { label: 'Común', color: '#9ca3af' },
  rare: { label: 'Rara', color: '#38bdf8' },
  epic: { label: 'Épica', color: '#c084fc' },
  legendary: { label: 'Legendaria', color: '#fbbf24' },
};

/** Collectible-card frame tinted by rarity. */
export const RarityFrame: React.FC<{
  rarity: Rarity;
  selected?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ rarity, selected, className = '', children }) => {
  const { color } = RARITY_STYLE[rarity];
  return (
    <div
      className={`rarity-frame ${className}`}
      style={{
        ['--rarity' as string]: color,
        boxShadow: selected ? `0 0 0 1px ${color}, 0 0 28px -4px ${color}` : undefined,
      }}
    >
      {children}
    </div>
  );
};

/** Ambient floating spores behind the whole game. Pauses when hidden / reduced motion. */
export const ParticleField: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const COUNT = 28;
    const palette = ['110,231,183', '34,211,238', '232,121,249'];
    // Pre-render one soft glow sprite per colour: drawImage is far cheaper than shadowBlur per frame
    const sprites = palette.map((c) => {
      const s = document.createElement('canvas');
      s.width = s.height = 32;
      const g = s.getContext('2d')!;
      const grd = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      grd.addColorStop(0, `rgba(${c},1)`);
      grd.addColorStop(0.35, `rgba(${c},0.45)`);
      grd.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = grd;
      g.fillRect(0, 0, 32, 32);
      return s;
    });
    const spores = Array.from({ length: COUNT }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: 0.6 + Math.random() * 1.8,
      vy: 0.008 + Math.random() * 0.025,
      vx: (Math.random() - 0.5) * 0.01,
      phase: Math.random() * Math.PI * 2,
      c: Math.floor(Math.random() * palette.length),
    }));

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const s of spores) {
        s.y -= s.vy * dt * 6;
        s.x += s.vx * dt * 6 + Math.sin(now / 1800 + s.phase) * 0.0002;
        if (s.y < -0.02) { s.y = 1.02; s.x = Math.random(); }
        if (s.x < -0.02) s.x = 1.02;
        if (s.x > 1.02) s.x = -0.02;
        ctx.globalAlpha = 0.45 + 0.4 * Math.sin(now / 900 + s.phase);
        const size = s.r * 9;
        ctx.drawImage(sprites[s.c], s.x * w - size / 2, s.y * h - size / 2, size, size);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10 pointer-events-none opacity-70" aria-hidden="true" />;
};
