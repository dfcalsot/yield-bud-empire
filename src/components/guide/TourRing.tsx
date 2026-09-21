import React, { useEffect, useState } from 'react';

/** A pulsing ring around the element marked `data-tour="<anchor>"`. It never blocks clicks (pointer-events: none). */
export const TourRing: React.FC<{ anchor: string | null }> = ({ anchor }) => {
  const [rect, setRect] = useState<{ l: number; t: number; w: number; h: number } | null>(null);
  useEffect(() => {
    if (!anchor) { setRect(null); return; }
    const measure = () => {
      const el = document.querySelector(`[data-tour="${anchor}"]`) as HTMLElement | null;
      if (!el || el.offsetParent === null && getComputedStyle(el).position !== 'fixed') { setRect((r) => (r ? null : r)); return; }
      const b = el.getBoundingClientRect();
      if (b.width === 0 || b.height === 0) { setRect(null); return; }
      setRect((r) => (r && Math.abs(r.l - b.left) < 1 && Math.abs(r.t - b.top) < 1 && Math.abs(r.w - b.width) < 1 && Math.abs(r.h - b.height) < 1 ? r : { l: b.left, t: b.top, w: b.width, h: b.height }));
    };
    measure();
    const id = window.setInterval(measure, 250);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.clearInterval(id); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [anchor]);
  if (!rect) return null;
  return <div className="tour-ring" style={{ left: rect.l - 6, top: rect.t - 6, width: rect.w + 12, height: rect.h + 12 }} aria-hidden />;
};
