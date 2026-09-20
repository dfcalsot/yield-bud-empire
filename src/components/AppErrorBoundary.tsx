import React, { Component } from 'react';

const STALE_RE = /dynamically imported module|Loading chunk|Importing a module script failed|MIME type|Unable to preload CSS/i;
const KEY = 'cf_reload_at';

/**
 * A page opened before a new build keeps asking for hashed files that no longer exist (the server answers with
 * index.html), so lazy modules fail and the whole app used to disappear. Reload once to pick up the new build;
 * if it fails again within 15 s, show a message instead of a blank screen.
 */
export const reloadOnceForNewBuild = (): boolean => {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 15000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch { /* storage blocked: still try once */ }
  window.location.reload();
  return true;
};

export class AppErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) {
    console.error('ChronoFlora: error no controlado', error);
    if (STALE_RE.test(String(error?.message))) reloadOnceForNewBuild();
  }
  render() {
    if (!this.state.error) return this.props.children;
    const stale = STALE_RE.test(String(this.state.error.message));
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#04090a] text-neutral-100 font-sans">
        <div className="max-w-md text-center space-y-4 border border-emerald-400/30 rounded-2xl p-8 bg-emerald-950/20">
          <div className="text-4xl">🌱</div>
          <h1 className="font-serif text-xl font-bold text-emerald-200">{stale ? 'El juego se actualizó' : 'Algo salió mal'}</h1>
          <p className="text-sm text-neutral-400 leading-relaxed">
            {stale
              ? 'Esta pestaña tiene una versión anterior. Recárgala para continuar: tu partida está guardada.'
              : 'Ocurrió un error inesperado. Recarga la página: tu partida se guarda sola cada 20 segundos.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            Recargar
          </button>
          {!stale && <pre className="text-left text-[10px] text-neutral-600 overflow-auto max-h-24 whitespace-pre-wrap">{String(this.state.error.message).slice(0, 300)}</pre>}
        </div>
      </div>
    );
  }
}
