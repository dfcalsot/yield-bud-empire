import React, { useId } from 'react';
import { DESIGN_BY_ID, DESIGN_IMG, type AvatarDesign, type AvatarRarity, type Motif } from '../../sim/avatars';
import { t, k, localize } from '../../i18n';

/** Hand-drawn SVG avatars (36 collectible designs) and the `Avatar` that shows whatever the profile uses. */

export const RARITY_COLOR: Record<AvatarRarity, string> = { common: '#9ca3af', rare: '#38bdf8', epic: '#c084fc', legendary: '#fbbf24' };
export const RARITY_LABEL: Record<AvatarRarity, string> = localize({ common: k('Común'), rare: k('Rara'), epic: k('Épica'), legendary: k('Legendaria') }, ['common', 'rare', 'epic', 'legendary']);

const M: Record<Motif, (a: string, b: string) => React.ReactNode> = {
  leaf: (a, b) => (<g><path d="M50 84 C20 64 24 30 50 14 C76 30 80 64 50 84Z" fill={a} stroke={b} strokeWidth="2.5" /><path d="M50 82 V24 M50 62 L36 50 M50 50 L64 38 M50 40 L38 30 M50 62 L64 50" stroke={b} strokeWidth="2" fill="none" strokeLinecap="round" /></g>),
  bud: (a, b) => (<g><ellipse cx="50" cy="44" rx="17" ry="27" fill={a} stroke={b} strokeWidth="2.4" /><ellipse cx="32" cy="58" rx="10" ry="16" fill={a} stroke={b} strokeWidth="2" /><ellipse cx="68" cy="58" rx="10" ry="16" fill={a} stroke={b} strokeWidth="2" /><path d="M42 30 q8 -6 16 0 M40 48 q10 -6 20 0" stroke={b} strokeWidth="1.6" fill="none" opacity=".6" />{[[46, 24], [56, 36], [42, 44], [58, 52]].map(([x, y], i) => <path key={i} d={`M${x} ${y} q4 -10 9 -8`} stroke="#f97316" strokeWidth="2" fill="none" strokeLinecap="round" />)}</g>),
  sun: (a, b) => (<g><circle cx="50" cy="50" r="20" fill={a} stroke={b} strokeWidth="2.5" />{Array.from({ length: 12 }, (_, i) => <line key={i} x1="50" y1="18" x2="50" y2="26" stroke={a} strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${i * 30} 50 50)`} />)}</g>),
  moon: (a, b) => (<g><path d="M62 18 A34 34 0 1 0 82 66 A28 28 0 1 1 62 18Z" fill={a} stroke={b} strokeWidth="2.5" /><circle cx="72" cy="30" r="2.6" fill={b} /><circle cx="80" cy="44" r="1.8" fill={b} /></g>),
  snow: (a, b) => (<g stroke={a} strokeWidth="3.4" strokeLinecap="round" fill="none">{Array.from({ length: 6 }, (_, i) => <g key={i} transform={`rotate(${i * 60} 50 50)`}><line x1="50" y1="50" x2="50" y2="16" /><path d="M50 30 l-8 -7 M50 30 l8 -7" /></g>)}<circle cx="50" cy="50" r="5" fill={b} stroke="none" /></g>),
  flower: (a, b) => (<g>{Array.from({ length: 5 }, (_, i) => <ellipse key={i} cx="50" cy="28" rx="12" ry="18" fill={a} stroke={b} strokeWidth="2" transform={`rotate(${i * 72} 50 50)`} />)}<circle cx="50" cy="50" r="10" fill="#fde047" stroke={b} strokeWidth="2" /></g>),
  drop: (a, b) => (<g><path d="M50 14 C50 14 24 46 24 62 A26 26 0 0 0 76 62 C76 46 50 14 50 14Z" fill={a} stroke={b} strokeWidth="2.5" /><path d="M38 60 A12 12 0 0 0 46 72" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity=".7" /></g>),
  crown: (a, b) => (<g><path d="M20 70 L16 34 L36 50 L50 24 L64 50 L84 34 L80 70Z" fill={a} stroke={b} strokeWidth="2.6" strokeLinejoin="round" /><rect x="20" y="70" width="60" height="10" rx="3" fill={b} /><circle cx="50" cy="24" r="4.5" fill="#fff" /><circle cx="16" cy="34" r="3.5" fill="#fff" /><circle cx="84" cy="34" r="3.5" fill="#fff" />{[34, 50, 66].map((x) => <circle key={x} cx={x} cy="75" r="2.6" fill={a} />)}</g>),
  flask: (a, b) => (<g><path d="M42 16 h16 v20 l22 38 q4 10 -6 10 h-48 q-10 0 -6 -10 l22 -38Z" fill="#0d2420" fillOpacity=".55" stroke={b} strokeWidth="2.5" strokeLinejoin="round" /><path d="M30 66 l12 -22 h16 l12 22 q3 8 -5 8 h-30 q-8 0 -5 -8Z" fill={a} opacity=".9" />{[[44, 62], [54, 56], [60, 66]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill="#fff" opacity=".8" />)}<rect x="40" y="12" width="20" height="6" rx="2" fill={b} /></g>),
  pumpkin: (a, b) => (<g><ellipse cx="34" cy="56" rx="16" ry="22" fill={a} stroke={b} strokeWidth="2.2" /><ellipse cx="66" cy="56" rx="16" ry="22" fill={a} stroke={b} strokeWidth="2.2" /><ellipse cx="50" cy="56" rx="17" ry="25" fill={a} stroke={b} strokeWidth="2.4" /><path d="M50 32 q-3 -12 8 -16" stroke="#4d7c0f" strokeWidth="4" fill="none" strokeLinecap="round" /><path d="M42 54 l6 -6 l4 6 M52 54 l4 -6 l6 6 M42 68 q8 8 16 0" stroke="#3b1d04" strokeWidth="3" fill="none" strokeLinejoin="round" strokeLinecap="round" /></g>),
  seed: (a, b) => (<g transform="rotate(28 50 50)"><path d="M50 14 C74 24 80 56 70 72 C64 82 56 88 50 88 C44 88 36 82 30 72 C20 56 26 24 50 14Z" fill={a} stroke={b} strokeWidth="2.6" /><path d="M50 22 V78 M50 44 Q40 52 36 64" stroke={b} strokeWidth="2" fill="none" opacity=".55" /></g>),
  planet: (a, b) => (<g><circle cx="50" cy="50" r="24" fill={a} stroke={b} strokeWidth="2.5" /><path d="M32 42 q18 8 36 -2 M30 58 q20 8 40 0" stroke={b} strokeWidth="2.4" fill="none" opacity=".55" /><ellipse cx="50" cy="52" rx="42" ry="11" fill="none" stroke="#fff" strokeWidth="3" opacity=".8" transform="rotate(-18 50 52)" /></g>),
  dna: (a, b) => (<g fill="none" strokeLinecap="round"><path d="M32 12 C74 30 26 46 68 64 C40 74 60 84 60 88" stroke={a} strokeWidth="5" /><path d="M68 12 C26 30 74 46 32 64 C60 74 40 84 40 88" stroke={b} strokeWidth="5" />{[24, 38, 52, 66, 78].map((y) => <line key={y} x1="36" y1={y} x2="64" y2={y} stroke="#fff" strokeWidth="2.4" opacity=".8" />)}</g>),
  jar: (a, b) => (<g><rect x="26" y="34" width="48" height="52" rx="10" fill="#0d2420" fillOpacity=".55" stroke={b} strokeWidth="2.6" /><rect x="22" y="22" width="56" height="14" rx="5" fill="#a16207" stroke="#713f12" strokeWidth="2" /><ellipse cx="50" cy="62" rx="15" ry="18" fill={a} stroke={b} strokeWidth="2" />{[[44, 54], [56, 60], [46, 70], [58, 50]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.6" fill="#f97316" />)}</g>),
  lantern: (a, b) => (<g><path d="M50 8 V22" stroke={b} strokeWidth="3" /><rect x="34" y="20" width="32" height="8" rx="3" fill={b} /><rect x="30" y="28" width="40" height="46" rx="8" fill={a} stroke={b} strokeWidth="2.6" opacity=".95" /><rect x="38" y="36" width="24" height="30" rx="5" fill="#fff7c2" opacity=".85" /><rect x="34" y="74" width="32" height="8" rx="3" fill={b} /><circle cx="50" cy="51" r="18" fill="#fde68a" opacity=".3" /></g>),
  bee: (a, b) => (<g><ellipse cx="38" cy="36" rx="16" ry="11" fill="#e0f2fe" stroke={b} strokeWidth="2" opacity=".9" transform="rotate(-25 38 36)" /><ellipse cx="62" cy="36" rx="16" ry="11" fill="#e0f2fe" stroke={b} strokeWidth="2" opacity=".9" transform="rotate(25 62 36)" /><ellipse cx="50" cy="58" rx="20" ry="24" fill={a} stroke={b} strokeWidth="2.6" />{[50, 60, 70].map((y) => <path key={y} d={`M32 ${y} q18 8 36 0`} stroke="#1c1305" strokeWidth="5" fill="none" />)}<circle cx="42" cy="44" r="3" fill="#1c1305" /><circle cx="58" cy="44" r="3" fill="#1c1305" /><path d="M42 28 l-6 -10 M58 28 l6 -10" stroke="#1c1305" strokeWidth="2.6" strokeLinecap="round" /></g>),
};

/** Motif colours: the season's two colours, lightened, on a dark badge. */
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.round(Math.max(0, Math.min(255, v)));
  return `rgb(${c(((n >> 16) & 255) * k)}, ${c(((n >> 8) & 255) * k)}, ${c((n & 255) * k)})`;
};

export const AvatarArt: React.FC<{ design: AvatarDesign; className?: string }> = ({ design, className = '' }) => {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [a, b] = design.colors;
  const rc = RARITY_COLOR[design.rarity];
  const epicPlus = design.rarity === 'epic' || design.rarity === 'legendary';
  const img = DESIGN_IMG[design.id];
  if (img) {
    return (
      <svg viewBox="0 0 100 100" className={`av-art ${className}`} role="img" aria-label={t(design.name)}>
        <defs><clipPath id={`cl${u}`}><circle cx="50" cy="50" r="46" /></clipPath></defs>
        <image href={img} x="4" y="4" width="92" height="92" clipPath={`url(#cl${u})`} preserveAspectRatio="xMidYMid slice" />
        <circle cx="50" cy="50" r="46" fill="none" stroke={rc} strokeWidth={3.4} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" className={`av-art ${className}`} role="img" aria-label={t(design.name)}>
      <defs>
        <radialGradient id={`bg${u}`} cx=".5" cy=".38" r=".75"><stop offset="0" stopColor={shade(a, 0.5)} /><stop offset="1" stopColor={shade(b, 0.18)} /></radialGradient>
        <clipPath id={`cl${u}`}><circle cx="50" cy="50" r="46" /></clipPath>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#bg${u})`} />
      <g clipPath={`url(#cl${u})`}>
        {design.rarity === 'legendary' && (
          <g className="av-rays">
            {Array.from({ length: 8 }, (_, i) => <path key={i} d="M50 50 L44 -10 L56 -10Z" fill={rc} opacity=".22" transform={`rotate(${i * 45} 50 50)`} />)}
          </g>
        )}
        <g transform="translate(19 19) scale(.62)">{M[design.motif](a, b)}</g>
        {epicPlus && [[24, 26], [78, 30], [70, 74], [28, 72]].map(([x, y], i) => (
          <path key={i} className="av-spark" style={{ animationDelay: `${i * 0.45}s` }} d={`M${x} ${y - 5} l1.8 3.2 3.2 1.8 -3.2 1.8 -1.8 3.2 -1.8 -3.2 -3.2 -1.8 3.2 -1.8Z`} fill="#fff" />
        ))}
      </g>
      <circle cx="50" cy="50" r="46" fill="none" stroke={rc} strokeWidth={design.rarity === 'common' ? 2 : 3.4} />
    </svg>
  );
};

/** The profile picture wherever it appears: NFT avatar > uploaded image > emoji. */
export const Avatar: React.FC<{
  profile: { avatar?: string; avatarImage?: string; avatarNft?: string; displayName?: string };
  size?: number;
  className?: string;
}> = ({ profile, size = 40, className = '' }) => {
  const design = profile.avatarNft ? DESIGN_BY_ID[profile.avatarNft] : undefined;
  const style = { width: size, height: size };
  if (design) return <span className={`inline-block shrink-0 ${className}`} style={style}><AvatarArt design={design} className="w-full h-full" /></span>;
  if (profile.avatarImage) {
    return <img src={profile.avatarImage} alt={profile.displayName ?? t('Avatar')} className={`shrink-0 rounded-full object-cover border border-emerald-300/40 ${className}`} style={style} />;
  }
  return <span className={`shrink-0 rounded-full grid place-items-center border border-emerald-300/30 bg-emerald-950/60 ${className}`} style={{ ...style, fontSize: size * 0.55 }}>{profile.avatar || '🌱'}</span>;
};

/** Re-encode an uploaded picture as a 256×256 centre-cropped WebP/JPEG: strips metadata and neutralises hostile files. */
export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) throw new Error(t('Formato no válido: usa PNG, JPG, WEBP o GIF.'));
  if (file.size > 4 * 1024 * 1024) throw new Error(t('La imagen pesa más de 4 MB.'));
  const bmp = await createImageBitmap(file).catch(() => { throw new Error(t('No se pudo leer la imagen.')); });
  if (bmp.width < 32 || bmp.height < 32) throw new Error(t('La imagen es demasiado pequeña (mínimo 32×32).'));
  const side = Math.min(bmp.width, bmp.height);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 256, 256);
  bmp.close?.();
  const webp = c.toDataURL('image/webp', 0.86);
  return webp.startsWith('data:image/webp') ? webp : c.toDataURL('image/jpeg', 0.86);
}
