/**
 * Small "juice" effects for the market, done with the Web Animations API on throw-away elements appended to <body>
 * (so they can fly across the page, from the buy button to the wallet, without touching React state).
 * Everything is skipped when the user asks for reduced motion.
 */

const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const center = (el: Element) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

/** Quick squash on the thing that just received something. */
export const hit = (el: Element | null) => {
  if (!el || reduced()) return;
  el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.14)' }, { transform: 'scale(0.97)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'ease-out' });
};

/** A burst of coins that arcs from `from` to `to`. */
export function flyCoins(from: Element | null, to: Element | null, count = 8, kind: 'FLORA' | 'SOL' = 'FLORA') {
  if (!from || !to || reduced()) return;
  const a = center(from);
  const b = center(to);
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = `mk-coin-fly mk-coin-fly--${kind}`;
    el.style.left = `${a.x - 9}px`;
    el.style.top = `${a.y - 9}px`;
    document.body.appendChild(el);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lift = -70 - Math.random() * 90;
    const side = (Math.random() - 0.5) * 140;
    const anim = el.animate(
      [
        { transform: 'translate(0,0) scale(.5)', opacity: 0 },
        { transform: `translate(${dx * 0.3 + side}px, ${dy * 0.3 + lift}px) scale(1)`, opacity: 1, offset: 0.35 },
        { transform: `translate(${dx}px, ${dy}px) scale(.5)`, opacity: 0.95 },
      ],
      { duration: 780 + i * 35, delay: i * 55, easing: 'cubic-bezier(.35,.05,.55,1)', fill: 'both' }
    );
    anim.onfinish = () => {
      el.remove();
      if (i === count - 1) hit(to);
    };
  }
}

/** A copy of the item art that shrinks into the bag / hotbar slot it now lives in. */
export function flyToken(from: Element | null, to: Element | null) {
  if (!from || !to || reduced()) return;
  const a = center(from);
  const b = center(to);
  const el = document.createElement('div');
  el.className = 'mk-token-fly';
  el.appendChild(from.cloneNode(true));
  el.style.left = `${a.x - 40}px`;
  el.style.top = `${a.y - 40}px`;
  document.body.appendChild(el);
  const anim = el.animate(
    [
      { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(${(b.x - a.x) * 0.45}px, ${(b.y - a.y) * 0.45 - 60}px) scale(.8) rotate(-8deg)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${b.x - a.x}px, ${b.y - a.y}px) scale(.22) rotate(10deg)`, opacity: 0.2 },
    ],
    { duration: 820, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' }
  );
  anim.onfinish = () => { el.remove(); hit(to); };
}

/** Floating "-40 $FLORA" that drifts up from an element. */
export function floatText(from: Element | null, text: string, color = '#f87171') {
  if (!from || reduced()) return;
  const a = center(from);
  const el = document.createElement('span');
  el.className = 'mk-float-text';
  el.textContent = text;
  el.style.left = `${a.x}px`;
  el.style.top = `${a.y - 8}px`;
  el.style.color = color;
  document.body.appendChild(el);
  el.animate(
    [{ transform: 'translate(-50%, 0) scale(.8)', opacity: 0 }, { transform: 'translate(-50%, -14px) scale(1.05)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%, -52px) scale(1)', opacity: 0 }],
    { duration: 1300, easing: 'ease-out', fill: 'both' }
  ).onfinish = () => el.remove();
}
