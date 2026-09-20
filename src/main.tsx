import {StrictMode, lazy, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Dev-only plant gallery: http://localhost:3010/#plantlab (stripped from production builds)
const PlantLab = import.meta.env.DEV ? lazy(() => import('./dev/PlantLab.tsx').then((m) => ({default: m.PlantLab}))) : null;
const showLab = import.meta.env.DEV && window.location.hash === '#plantlab';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {showLab && PlantLab ? (
      <Suspense fallback={null}>
        <PlantLab />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);
