// Sin React: esto lo pueden importar la simulación y los datos (que también usa el servidor).
/**
 * Idiomas del juego. Cada texto se escribe en español dentro de `t('…')` y el inglés vive en `en/*.ts`, con el mismo texto
 * en español como clave (si falta una traducción se ve el español, nunca una clave rota). Los datos y la simulación siguen
 * usando sus valores en español para la lógica y se traducen solo al mostrarlos: `t(strain.description)`.
 *
 * Idioma al abrir: `?lang=` en la URL → lo que eligió el jugador → el idioma del navegador (español → ES; cualquier otro → EN).
 */
export type Lang = 'es' | 'en';
export const LANGS: Lang[] = ['es', 'en'];
const KEY = 'ybe_lang';

type Dict = Record<string, string>;
let current: Lang = 'es';
let EN: Dict = {};
const listeners = new Set<() => void>();
/** avisa cuando cambia el idioma (lo usa useLang) */
export const onLangChange = (f: () => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

const isLang = (v: unknown): v is Lang => v === 'es' || v === 'en';
const stored = (): Lang | null => { try { const v = localStorage.getItem(KEY); return isLang(v) ? v : null; } catch { return null; } };

/** el idioma con el que abre el juego */
export function detectLang(): Lang {
  try {
    const url = new URL(window.location.href);
    const q = url.searchParams.get('lang');
    if (q !== null) {
      // se usa una vez y se quita de la dirección: si después el jugador elige otro idioma, recargar no lo pisa
      url.searchParams.delete('lang');
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    if (isLang(q)) { try { localStorage.setItem(KEY, q); } catch { /* sin almacenamiento */ } return q; }
  } catch { /* sin URL */ }
  const s = stored();
  if (s) return s;
  const list = typeof navigator !== 'undefined' ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : [];
  return String(list[0] ?? '').toLowerCase().startsWith('es') ? 'es' : 'en';
}

/** si el jugador ya eligió idioma a mano (entonces el de su cuenta no lo pisa) */
export const hasChosenLang = () => stored() !== null;

async function load(l: Lang) {
  if (l === 'en' && Object.keys(EN).length === 0) EN = (await import('./en')).EN;
}

/** carga el idioma inicial antes de dibujar el juego */
export async function initLang(): Promise<Lang> {
  const l = detectLang();
  await load(l).catch(() => {});
  current = Object.keys(EN).length || l === 'es' ? l : 'es';
  document.documentElement.lang = current;
  return current;
}

/** cambia el idioma (y lo recuerda); lo que usa `useLang()` se vuelve a dibujar */
export async function setLang(l: Lang, remember = true): Promise<void> {
  await load(l);
  if (remember) { try { localStorage.setItem(KEY, l); } catch { /* sin almacenamiento */ } }
  if (l === current) return;
  current = l;
  document.documentElement.lang = l;
  listeners.forEach((f) => f());
}

export const getLang = (): Lang => current;

/** el texto en el idioma actual; `{nombre}` se reemplaza con `vars.nombre` */
export function t(es: string, vars?: Record<string, string | number | null | undefined>): string {
  const s = current === 'en' ? EN[es] ?? es : es;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k] ?? '') : m)) : s;
}

/** números con el formato del idioma (1.234,5 / 1,234.5) */
export const fmtNum = (n: number, digits = 0) => n.toLocaleString(current === 'en' ? 'en-US' : 'es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits });

/** marca un texto de una tabla del módulo como traducible sin cambiarlo (se traduce con t() donde se muestra) */
export const k = (es: string): string => es;

/**
 * Una tabla de datos (objeto por id, lista u objeto suelto) cuyos campos de texto se leen ya traducidos: `localize(PEST_INFO,
 * ['label', 'cause'])`. Solo cambia lo que se LEE de esos campos (en el idioma del momento); ids, números y el resto quedan igual,
 * así que la lógica que compara ids no se entera. Los objetos envueltos se cachean: el mismo dato da siempre el mismo objeto.
 */
export function localize<T extends object>(table: T, fields: readonly string[]): T {
  const set = new Set(fields);
  const cache = new WeakMap<object, object>();
  const tr = (v: unknown): unknown => (typeof v === 'string' ? t(v) : Array.isArray(v) && v.every((x) => typeof x === 'string') ? v.map((x) => t(x)) : v);
  const wrap = (o: unknown): unknown => {
    if (!o || typeof o !== 'object') return o;
    const hit = cache.get(o as object);
    if (hit) return hit;
    const p = new Proxy(o as object, {
      get(target, key, recv) {
        const v = Reflect.get(target, key, recv);
        if (typeof key === 'string' && set.has(key)) return tr(v);
        return v && typeof v === 'object' ? wrap(v) : v;
      },
      getOwnPropertyDescriptor(target, key) {
        const d = Reflect.getOwnPropertyDescriptor(target, key);
        if (d && 'value' in d && typeof key === 'string' && set.has(key)) return { ...d, value: tr(d.value) };
        return d;
      },
    });
    cache.set(o as object, p);
    return p;
  };
  return wrap(table) as T;
}
