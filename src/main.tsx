import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Dev-only plant gallery: http://localhost:3010/#plantlab (stripped from production builds)
const PlantLab = import.meta.env.DEV ? lazy(() => import('./dev/PlantLab.tsx').then((m) => ({default: m.PlantLab}))) : null;
const ModelLab = import.meta.env.DEV ? lazy(() => import('./dev/ModelLab.tsx').then((m) => ({default: m.ModelLab}))) : null;
const showLab = import.meta.env.DEV && window.location.hash === '#plantlab';
const showModelLab = import.meta.env.DEV && window.location.hash === '#modellab';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showModelLab && ModelLab ? (
      <Suspense fallback={null}>
        <ModelLab />
      </Suspense>
    ) : showLab && PlantLab ? (
      <Suspense fallback={null}>
        <PlantLab />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
