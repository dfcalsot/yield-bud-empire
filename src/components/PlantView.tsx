import React, { Component, Suspense, lazy, useState } from 'react';
import { Box, Layers } from 'lucide-react';
import { CannabisPlant, type CannabisPlantProps } from './CannabisPlant';
import type { PestKind } from '../types';

/**
 * The plant on the Cultivation stage: the 3D model when WebGL works, the animated SVG otherwise.
 * The SVG stays on screen while the 10 MB model downloads, and comes back if the model fails to load.
 */
const Plant3D = lazy(() =>
  import('./Plant3D').then(async (m) => {
    await m.loadPlantModel();
    return { default: m.Plant3D };
  })
);

class Boundary extends Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.warn('Modelo 3D no disponible, se usa la planta SVG', err); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

const webglOk = (() => {
  let ok: boolean | null = null;
  return () => {
    if (ok === null) {
      try {
        const c = document.createElement('canvas');
        ok = !!(c.getContext('webgl2') || c.getContext('webgl'));
      } catch { ok = false; }
    }
    return ok;
  };
})();

const STORE_KEY = 'cf_plant_view';
const readMode = (): '3d' | '2d' => { try { return localStorage.getItem(STORE_KEY) === '2d' ? '2d' : '3d'; } catch { return '3d'; } };

export const PlantView: React.FC<CannabisPlantProps & { pest?: PestKind }> = ({ pest, ...props }) => {
  const [mode, setMode] = useState<'3d' | '2d'>(readMode);
  const canvasMode = mode === '3d' && webglOk();
  const svg = <CannabisPlant {...props} />;

  const toggle = () => {
    const next = mode === '3d' ? '2d' : '3d';
    setMode(next);
    try { localStorage.setItem(STORE_KEY, next); } catch { /* private mode */ }
  };

  return (
    <div className="relative h-full w-full max-w-[760px]">
      {canvasMode ? (
        <Boundary fallback={svg}>
          <Suspense fallback={svg}>
            <div className="absolute inset-0">
              <Plant3D
                stage={props.stage}
                progress={props.progress}
                health={props.health}
                soilMoisture={props.soilMoisture}
                strainColor={props.strainColor}
                amberPct={props.amberPct}
                pest={pest}
              />
            </div>
          </Suspense>
        </Boundary>
      ) : svg}
      {webglOk() && (
        <button
          onClick={toggle}
          title={canvasMode ? 'Ver la planta en 2D' : 'Ver la planta en 3D'}
          className="pointer-events-auto absolute bottom-1 right-1 z-10 flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-300/30 bg-neutral-950/70 text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-200 hover:bg-neutral-900 cursor-pointer transition"
        >
          {canvasMode ? <Layers className="w-3 h-3" /> : <Box className="w-3 h-3" />} {canvasMode ? '2D' : '3D'}
        </button>
      )}
    </div>
  );
};
