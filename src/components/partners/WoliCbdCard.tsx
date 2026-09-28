import React from 'react';
import { ExternalLink, Leaf, MapPin } from 'lucide-react';
import { t as tr } from '../../i18n';

const SITE = 'https://www.wolicbd.com';

/**
 * A real brand next to the virtual economy: WOLI CBD (Costa Rica) and its ointment, with the link to its own shop.
 * Pictures come from the brand's site (its cut-outs, made to sit on dark backgrounds). Descriptive text only: no health claims.
 */
export const WoliCbdCard: React.FC = () => (
  <section className="relative overflow-hidden rounded-2xl border p-4 sm:p-5" data-testid="woli-card"
    style={{ borderColor: 'rgba(132,175,40,.55)', background: 'radial-gradient(120% 140% at 85% 60%, rgba(74,110,20,.42), rgba(10,18,8,.96) 62%), #070c06', boxShadow: '0 0 0 3px #0a0716, 0 12px 34px -14px rgba(132,175,40,.45)' }}>
    <div className="flex items-center justify-between gap-2">
      <img src="/partners/woli/logo.webp" alt={tr('WOLI CBD')} className="h-9 w-auto" loading="lazy" />
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border" style={{ color: '#c4e26a', borderColor: 'rgba(132,175,40,.6)', background: 'rgba(132,175,40,.12)' }}>
        <Leaf className="w-3 h-3" />{tr('Marca aliada')}
      </span>
    </div>

    <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-2 items-center mt-1">
      <div className="space-y-2 relative z-10">
        <h4 className="font-serif text-xl font-black text-white leading-tight">{tr('Ungüento WOLI CBD')}</h4>
        <p className="text-[11px] font-mono uppercase tracking-[0.16em]" style={{ color: '#a7cc45' }}>{tr('Armonía natural para tu piel')}</p>
        <p className="text-xs text-neutral-300 leading-relaxed">{tr('Ungüento cosmético con CBD y aceites esenciales, hecho a mano en Costa Rica. Un producto real, de la vida fuera del juego.')}</p>
        <div className="flex flex-wrap gap-1.5">
          {[tr('400 mg CBD'), tr('Lata 50 ml'), tr('Cera de abeja'), tr('Hecho a mano')].map((t) => (
            <span key={t} className="px-2 py-0.5 rounded-full text-[10.5px] font-mono border border-white/15 bg-black/30 text-neutral-200">{t}</span>
          ))}
        </div>
        <a href={SITE} target="_blank" rel="noopener noreferrer" data-testid="woli-link"
          className="inline-flex items-center gap-2 mt-1 px-3.5 py-2 rounded-xl font-bold text-[12px] text-neutral-950 transition hover:brightness-110"
          style={{ background: 'linear-gradient(180deg,#b9dc55,#84af28)', boxShadow: '0 3px 0 #3d5a0c, 0 8px 18px -8px rgba(132,175,40,.7)' }}>
          <ExternalLink className="w-3.5 h-3.5" />www.wolicbd.com
        </a>
        <p className="flex items-center gap-1 text-[10.5px] text-neutral-500"><MapPin className="w-3 h-3" />{tr('Costa Rica · producto cosmético: detalles y compra en su tienda.')}</p>
        <p className="text-[10px] text-neutral-500 leading-snug">{tr('Los productos con CBD solo se venden y envían a países donde están regulados y pueden pasar la aduana sin problemas.')}</p>
      </div>
      <a href={SITE} target="_blank" rel="noopener noreferrer" aria-label={tr('Ver el ungüento en www.wolicbd.com')} tabIndex={-1} className="block">
        <img src="/partners/woli/hero.webp" alt={tr('Lata del ungüento WOLI CBD con lavanda, incienso y tomillo')} className="w-full h-auto drop-shadow-[0_10px_22px_rgba(0,0,0,.55)]" loading="lazy" />
      </a>
    </div>
  </section>
);
