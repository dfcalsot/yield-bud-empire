import { useSyncExternalStore } from 'react';
import { getLang, onLangChange, type Lang } from './core';

export * from './core';

/** idioma actual como estado de React: el componente se vuelve a dibujar cuando cambia */
export function useLang(): Lang {
  return useSyncExternalStore(onLangChange, getLang, getLang);
}

