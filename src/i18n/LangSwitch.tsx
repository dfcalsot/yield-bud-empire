import React from 'react';
import { setLang, useLang, type Lang } from './index';
import { saveAccountLang } from '../auth/api';

/** Selector ES / EN. Lo que elige el jugador se recuerda en este navegador y en su cuenta (también decide el idioma de los correos). */
export const LangSwitch: React.FC<{ className?: string; signedIn?: boolean }> = ({ className = '', signedIn = false }) => {
  const lang = useLang();
  const pick = (l: Lang) => { void setLang(l); if (signedIn) void saveAccountLang(l); };
  return (
    <div role="group" aria-label={lang === 'en' ? 'Language' : 'Idioma'} className={`inline-flex rounded-lg border border-white/15 bg-black/40 p-0.5 text-[10.5px] font-mono font-bold ${className}`}>
      {(['es', 'en'] as Lang[]).map((l) => (
        <button key={l} type="button" onClick={() => pick(l)} aria-pressed={lang === l} lang={l} title={l === 'es' ? 'Español' : 'English'}
          className={`px-2 py-1 rounded-md uppercase tracking-wider cursor-pointer transition ${lang === l ? 'bg-emerald-400/90 text-neutral-950' : 'text-neutral-400 hover:text-white'}`}>
          {l}
        </button>
      ))}
    </div>
  );
};
