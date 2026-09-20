import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {AppErrorBoundary, reloadOnceForNewBuild} from './components/AppErrorBoundary.tsx';

// Vite fires this when a lazy chunk of an older build no longer exists on the server: take the new build
// (only cancel the error when we really reload; otherwise let it reach AppErrorBoundary and show the message)
window.addEventListener('vite:preloadError', (e) => { if (reloadOnceForNewBuild()) e.preventDefault(); });

// Dev-only plant gallery: http://localhost:3010/#plantlab (stripped from production builds)
const PlantLab = import.meta.env.DEV ? lazy(() => import('./dev/PlantLab.tsx').then((m) => ({default: m.PlantLab}))) : null;
const ModelLab = import.meta.env.DEV ? lazy(() => import('./dev/ModelLab.tsx').then((m) => ({default: m.ModelLab}))) : null;
const showLab = import.meta.env.DEV && window.location.hash === '#plantlab';
const showModelLab = import.meta.env.DEV && window.location.hash === '#modellab';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
   <AppErrorBoundary>
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
   </AppErrorBoundary>
  </StrictMode>,
);
