import React, { useEffect, useState } from 'react';
import { Plant3D, loadPlantModel } from '../components/Plant3D';

/** Dev-only 3D plant viewer: #modellab with ?progress=0..100&health=&moist=&amber=&strain=%23hex */
export const ModelLab: React.FC = () => {
  const q = new URLSearchParams(window.location.search);
  const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);
  const [ready, setReady] = useState(false);
  useEffect(() => { loadPlantModel().then(() => setReady(true)); }, []);
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a1512', position: 'relative' }}>
      {ready && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <Plant3D
            stage="vegetative"
            progress={num('progress', 100)}
            health={num('health', 100)}
            soilMoisture={num('moist', 80)}
            strainColor={q.get('strain') || '#34d399'}
            amberPct={num('amber', 10)}
          />
        </div>
      )}
      <div style={{ position: 'absolute', left: 12, top: 8, color: '#6ee7b7', font: '12px monospace' }}>
        progress {num('progress', 100)} · health {num('health', 100)} · humedad {num('moist', 80)} · ámbar {num('amber', 10)}
      </div>
    </div>
  );
};
