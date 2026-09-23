import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { t } from '../i18n';

/** Polls dist/version.json; when a newer build is published, tells the player and offers a one-click reload. */
export const UpdateBanner: React.FC = () => {
  const [stale, setStale] = useState(false);
  useEffect(() => {
    if (import.meta.env.DEV) return;
    const check = async () => {
      try {
        const r = await fetch('/version.json', { cache: 'no-store' });
        const j = await r.json();
        if (j?.build && j.build !== __BUILD__) setStale(true);
      } catch { /* offline: try again later */ }
    };
    const id = window.setInterval(check, 60000);
    const first = window.setTimeout(check, 4000);
    return () => { window.clearInterval(id); window.clearTimeout(first); };
  }, []);
  if (!stale) return null;
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] animate-fade-in" role="status">
      <button onClick={() => window.location.reload()} className="flex items-center gap-2 rounded-full border border-emerald-300/60 bg-neutral-950/95 px-4 py-2 text-xs font-bold text-emerald-200 shadow-[0_0_30px_-6px_rgba(184,243,90,.8)] hover:bg-emerald-400/10 cursor-pointer">
        <RefreshCw className="w-4 h-4" aria-hidden />{t('Hay una versión nueva del juego ·')}{' '}<u>{t('Recargar')}</u>
      </button>
    </div>
  );
};

/** e.g. "build 21 sep 12:46" for the footer, so anyone can tell which version a tab is running */
export const buildLabel = (): string => { try { const d = new Date(__BUILD__); return `build ${d.toLocaleDateString('es', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`; } catch { return 'build'; } };
