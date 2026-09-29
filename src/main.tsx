import {StrictMode, lazy, Suspense, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {initLang} from './i18n';
import {initTelemetry} from './utils/telemetry';
import {AppErrorBoundary, reloadOnceForNewBuild} from './components/AppErrorBoundary.tsx';

// Vite fires this when a lazy chunk of an older build no longer exists on the server: take the new build
// (only cancel the error when we really reload; otherwise let it reach AppErrorBoundary and show the message)
window.addEventListener('vite:preloadError', (e) => { if (reloadOnceForNewBuild()) e.preventDefault(); });

// Dev-only plant gallery: http://localhost:3010/#plantlab (stripped from production builds)
const PlantLab = import.meta.env.DEV ? lazy(() => import('./dev/PlantLab.tsx').then((m) => ({default: m.PlantLab}))) : null;
const ModelLab = import.meta.env.DEV ? lazy(() => import('./dev/ModelLab.tsx').then((m) => ({default: m.ModelLab}))) : null;
// Style lab (palette + NPC rig proposals): http://localhost:3010/#stylelab (dev only; the style is chosen, so it is stripped from production builds)
const StyleLab = import.meta.env.DEV ? lazy(() => import('./dev/StyleLab.tsx').then((m) => ({default: m.StyleLab}))) : null;
const NpcLab = import.meta.env.DEV ? lazy(() => import('./dev/NpcLab.tsx').then((m) => ({default: m.NpcLab}))) : null;
const RoomLab = import.meta.env.DEV ? lazy(() => import('./dev/NpcLab.tsx').then((m) => ({default: m.RoomLab}))) : null;
const FounderLab = import.meta.env.DEV ? lazy(() => import('./dev/NpcLab.tsx').then((m) => ({default: m.FounderLab}))) : null;
const LogoLab = lazy(() => import('./dev/LogoLab.tsx').then((m) => ({default: m.LogoLab})));
const StaffGallery = lazy(() => import('./dev/StaffGallery.tsx').then((m) => ({default: m.StaffGallery})));
const LogoStage = lazy(() => import('./dev/LogoLab.tsx').then((m) => ({default: m.LogoStage})));
// the operators' panel (/#panel): only admin accounts get its data from the server (server/panel.mjs)
const AdminPanel = lazy(() => import('./admin/AdminPanel.tsx').then((m) => ({default: m.AdminPanel})));
const hashIs = (h: string) => window.location.hash === h;
const showLab = import.meta.env.DEV && hashIs('#plantlab');
const showModelLab = import.meta.env.DEV && hashIs('#modellab');

/** The style lab follows the URL hash live, so pasting `/#stylelab` into a tab that already has the game open works without a reload. */
function Root() {
  const [styleLab, setStyleLab] = useState(import.meta.env.DEV && hashIs('#stylelab'));
  const [logoLab, setLogoLab] = useState(hashIs('#logo'));
  const [logoStage, setLogoStage] = useState(hashIs('#logo-stage'));
  const [staffGal, setStaffGal] = useState(hashIs('#staff'));
  const [panel, setPanel] = useState(hashIs('#panel'));
  useEffect(() => {
    const on = () => { setStyleLab(import.meta.env.DEV && hashIs('#stylelab')); setLogoLab(hashIs('#logo')); setLogoStage(hashIs('#logo-stage')); setStaffGal(hashIs('#staff')); setPanel(hashIs('#panel')); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  if (panel) return <Suspense fallback={null}><AdminPanel /></Suspense>;
  if (staffGal) return <Suspense fallback={null}><StaffGallery /></Suspense>;
  if (logoStage && LogoStage) return <Suspense fallback={null}><LogoStage /></Suspense>;
  if (logoLab) return <Suspense fallback={null}><LogoLab /></Suspense>;
  if (styleLab && StyleLab) return <Suspense fallback={null}><StyleLab /></Suspense>;
  if (import.meta.env.DEV && hashIs('#npclab') && NpcLab) return <Suspense fallback={null}><NpcLab /></Suspense>;
  if (import.meta.env.DEV && hashIs('#roomlab') && RoomLab) return <Suspense fallback={null}><RoomLab /></Suspense>;
  if (import.meta.env.DEV && hashIs('#founderlab') && FounderLab) return <Suspense fallback={null}><FounderLab /></Suspense>;
  if (showModelLab && ModelLab) return <Suspense fallback={null}><ModelLab /></Suspense>;
  if (showLab && PlantLab) return <Suspense fallback={null}><PlantLab /></Suspense>;
  return <App />;
}

// errores, tiempo de carga y pantallas para el panel de operadores (solo si el servidor la tiene encendida)
initTelemetry();

// el idioma (y su diccionario) se carga antes de dibujar, para que no aparezca un instante en el idioma equivocado
void initLang().finally(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
   <AppErrorBoundary>
    <Root />
   </AppErrorBoundary>
  </StrictMode>,
));
