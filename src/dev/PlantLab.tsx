import React from 'react';
import { CannabisPlant } from '../components/CannabisPlant';
import type { GrowStage } from '../types';

/** Dev-only gallery (open with #plantlab): the plant at every growth stage, healthy vs stressed. */
const stageOf = (p: number): GrowStage => (p < 3 ? 'seed' : p < 15 ? 'seedling' : p < 50 ? 'vegetative' : p < 95 ? 'flowering' : 'ready_harvest');

const STEPS = [2, 10, 25, 45, 60, 75, 90, 100];

export const PlantLab: React.FC = () => (
  <div className="min-h-screen bg-[#02080a] p-4 text-neutral-200">
    {[{ label: 'Sana', health: 95, moisture: 70, vpd: true, color: '#10b981', amber: 5 }, { label: 'Estresada', health: 40, moisture: 20, vpd: false, color: '#a855f7', amber: 25 }].map((v) => (
      <div key={v.label} className="mb-6">
        <h2 className="font-serif mb-2">{v.label}</h2>
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((p) => (
            <div key={p} className="relative rounded-xl border border-emerald-900/50 bg-[#03100d] h-[420px] flex items-end justify-center">
              <span className="absolute top-2 left-2 text-[10px] font-mono text-emerald-300">{p}% · {stageOf(p)}</span>
              <CannabisPlant
                className="h-full w-full"
                seedKey={`lab${p}`}
                stage={stageOf(p)}
                progress={p}
                health={v.health}
                soilMoisture={v.moisture}
                vpdOptimal={v.vpd}
                strainColor={v.color}
                amberPct={p > 90 ? v.amber + 20 : v.amber}
              />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);
