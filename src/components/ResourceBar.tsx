import React, { useEffect, useRef } from 'react';
import { Droplets, FlaskConical, Zap, Sun } from 'lucide-react';
import { useGame } from '../context/GameContext';

/** "∞" when solar covers the load, otherwise hours (<1 d) or days of electricity left. */
export const fmtRunway = (days: number): string => {
  if (!Number.isFinite(days)) return '∞';
  if (days < 1) return `${Math.max(0, Math.round(days * 24))} h`;
  return `${days.toFixed(1)} d`;
};

/** Text that pops when its value changes (purchases, lab cycles); silent on the first render. */
export const Bump: React.FC<{ value: string }> = ({ value }) => {
  const prev = useRef(value);
  const changed = prev.current !== value;
  useEffect(() => { prev.current = value; }, [value]);
  return <span key={value} className={changed ? 'shop-bump' : undefined}>{value}</span>;
};

/**
 * Live stock of the three consumables that keep the room running (tank water, nutrients, electricity).
 * Sits above every view so the player sees the lamps are about to go dark before it happens.
 */
export const ResourceBar: React.FC<{ onOpenMarket: () => void }> = ({ onOpenMarket }) => {
  const { resources, equipStats } = useGame();
  const energyLow = Number.isFinite(resources.energyDays) && resources.energyDays < 0.5 && equipStats.lampWatts > 0;
  const energyOut = resources.energy <= 0.05 && resources.solarKwhPerDay < resources.kwhPerDay && equipStats.lampWatts > 0;
  const waterLow = resources.water < 15;
  const nutrientLow = resources.nutrient < 90;

  const chip = (
    key: string, Icon: React.ComponentType<{ className?: string }>, color: string, value: string, sub: string, state: 'ok' | 'low' | 'out', label: string
  ) => (
    <button
      key={key}
      onClick={onOpenMarket}
      title={`${label} — abrir el Grow Market`}
      className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg border text-left transition cursor-pointer hover:bg-neutral-900/80 ${
        state === 'out' ? 'border-red-400/70 bg-red-500/10 animate-pulse' : state === 'low' ? 'border-amber-400/60 bg-amber-400/5' : 'border-neutral-700/60 bg-neutral-950/50'
      }`}
    >
      <span className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: `${color}1f`, color }}>
        <Icon className="w-4 h-4" />
      </span>
      <span className="leading-tight">
        <span className="block text-[13px] font-mono font-bold text-white"><Bump value={value} /></span>
        <span className={`block text-[9.5px] font-mono uppercase tracking-wider ${state === 'ok' ? 'text-neutral-500' : state === 'low' ? 'text-amber-300' : 'text-red-300'}`}>{sub}</span>
      </span>
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Recursos de la sala">
      {chip('energy', Zap, '#fbbf24', `${resources.energy.toFixed(1)} kWh`,
        energyOut ? 'sin energía' : `autonomía ${fmtRunway(resources.energyDays)}`, energyOut ? 'out' : energyLow ? 'low' : 'ok', 'Electricidad')}
      {chip('water', Droplets, '#38bdf8', `${resources.water.toFixed(resources.water < 100 ? 1 : 0)} L`,
        resources.water <= 0 ? 'tanque vacío' : waterLow ? 'agua baja' : 'agua', resources.water <= 0 ? 'out' : waterLow ? 'low' : 'ok', 'Agua')}
      {chip('nutrient', FlaskConical, '#a78bfa', `${Math.floor(resources.nutrient)} ml`,
        resources.nutrient <= 0 ? 'sin abono' : nutrientLow ? 'abono bajo' : 'abono', resources.nutrient <= 0 ? 'out' : nutrientLow ? 'low' : 'ok', 'Nutrientes')}
      {resources.solarKwhPerDay > 0 && (
        <span className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-yellow-300/30 bg-yellow-300/5 text-[10.5px] font-mono text-yellow-200">
          <Sun className="w-3.5 h-3.5" /> +{resources.solarKwhPerDay.toFixed(1)} kWh/día solar
        </span>
      )}
      <span className="hidden md:block text-[10px] font-mono text-neutral-500 ml-auto">
        consumo ≈ {resources.kwhPerDay.toFixed(1)} kWh/día
      </span>
    </div>
  );
};
