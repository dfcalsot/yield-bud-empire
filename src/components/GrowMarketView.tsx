import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  ShoppingBag, 
  Wind, 
  Droplets, 
  Gauge, 
  Thermometer, 
  FlaskConical, 
  CheckCircle2, 
  Sparkles, 
  Flame, 
  Coins, 
  Sliders, 
  Activity, 
  Cpu, 
  Zap,
  Info
} from 'lucide-react';
import { GrowSupplyItem } from '../types';

export const GrowMarketView: React.FC = () => {
  const { 
    suppliesMarket, 
    buySupply, 
    floraBalance, 
    solBalance,
    autoWaterActive,
    toggleAutoWater,
    autoClimateActive,
    toggleAutoClimate,
    co2Ppm,
    setCo2Ppm,
    calibrateMeter
  } = useGame();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<'FLORA' | 'SOL'>('FLORA');

  const categories = [
    { id: 'all', label: 'Todo el Equipamiento', icon: ShoppingBag },
    { id: 'co2', label: 'Sistemas de CO2', icon: Wind },
    { id: 'irrigation', label: 'Automatización de Riego', icon: Droplets },
    { id: 'meters', label: 'Medidores & Sensores', icon: Gauge },
    { id: 'climate', label: 'Control Climático & VPD', icon: Thermometer },
    { id: 'nutrients', label: 'Nutrición & Fertilizantes', icon: FlaskConical }
  ];

  const filteredSupplies = suppliesMarket.filter(item => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const totalInstalled = suppliesMarket.filter(s => s.installed).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="hud-panel p-5 sm:p-7 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-semibold uppercase tracking-wider">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                Hardware Industrial de Automatización
              </span>
              <span className="text-xs text-neutral-500 font-mono">
                {totalInstalled}/{suppliesMarket.length} Equipos Instalados
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
              Grow Market: Suministros & Tecnología de Cultivo
            </h1>

            <p className="text-sm text-neutral-300 leading-relaxed">
              Equipa tus salas y carpas con sensores cuánticos PPFD, dosificadores peristálticos de pH/EC, tanques presurizados de CO2 enriquecido y controladores climáticos autónomos para maximizar la fotosíntesis y producción de resina.
            </p>
          </div>

          {/* Quick Stats & Currency Selector */}
          <div className="bg-neutral-950/90 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3 min-w-[240px]">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-800">
              <span className="text-neutral-400">Hardware Activo:</span>
              <span className="font-mono text-cyan-400 font-bold text-sm">
                {totalInstalled} de {suppliesMarket.length} Módulos
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Saldo $FLORA:</span>
              <span className="font-mono text-amber-300 font-bold">{floraBalance.toLocaleString()} $FLORA</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Saldo SOL:</span>
              <span className="font-mono text-purple-300 font-bold">{solBalance} SOL</span>
            </div>

            <div className="pt-1 flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
              <button
                onClick={() => setSelectedCurrency('FLORA')}
                className={`flex-1 text-[11px] py-1 rounded font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1 ${
                  selectedCurrency === 'FLORA'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Flame className="w-3 h-3 text-amber-400" />
                Pagar en $FLORA
              </button>
              <button
                onClick={() => setSelectedCurrency('SOL')}
                className={`flex-1 text-[11px] py-1 rounded font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1 ${
                  selectedCurrency === 'SOL'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Coins className="w-3 h-3 text-purple-400" />
                Pagar en SOL
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Automation Master Switch Panel */}
      <div className="hud-panel p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 font-mono">
              Panel Maestro de Automatización en Vivo
            </h3>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono">
            Control Telemétrico IoT
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Auto Water Switch */}
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                Riego por Goteo
              </div>
              <p className="text-[11px] text-neutral-500">Auto-recarga a 85% si &lt;45%</p>
            </div>
            <button
              onClick={toggleAutoWater}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                autoWaterActive
                  ? 'bg-blue-500/20 border border-blue-500 text-blue-300'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {autoWaterActive ? 'ACTIVO' : 'MANUAL'}
            </button>
          </div>

          {/* Auto Climate Switch */}
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
                <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                Clima PID & VPD
              </div>
              <p className="text-[11px] text-neutral-500">Auto-regulación térmica/RH</p>
            </div>
            <button
              onClick={toggleAutoClimate}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                autoClimateActive
                  ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-300'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {autoClimateActive ? 'ACTIVO' : 'MANUAL'}
            </button>
          </div>

          {/* CO2 PPM Target */}
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-200">
                <Wind className="w-3.5 h-3.5 text-emerald-400" />
                Nivel CO2: <span className="text-emerald-300 font-mono">{co2Ppm} PPM</span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                co2Ppm >= 1100 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-800 text-neutral-400'
              }`}>
                {co2Ppm >= 1100 ? '+35% Fotosíntesis' : '+15% Boost'}
              </span>
            </div>
            <input
              type="range"
              min={400}
              max={1500}
              step={50}
              value={co2Ppm}
              onChange={(e) => setCo2Ppm(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-3">
        {categories.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat.id
                  ? 'bg-neutral-800 border-neutral-600 text-white font-bold shadow-sm'
                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5 text-neutral-400" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Supplies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSupplies.map(supply => {
          const isAffordable = selectedCurrency === 'FLORA' ? floraBalance >= supply.priceFlora : solBalance >= supply.priceSol;

          return (
            <div 
              key={supply.id}
              className={`border rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg transition ${
                supply.installed
                  ? 'bg-neutral-900/80 border-emerald-500/30'
                  : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {/* Top Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-mono text-[11px]">
                    {supply.brand}
                  </span>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                    {supply.categoryLabel}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white leading-snug">
                  {supply.name}
                </h3>

                <p className="text-xs text-neutral-400 leading-relaxed">
                  {supply.description}
                </p>

                {/* Technical Spec Box */}
                <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/80 text-[11px] font-mono text-neutral-300">
                  <span className="text-neutral-500 block text-[10px] uppercase">Especificación Técnica:</span>
                  {supply.spec}
                </div>
              </div>

              {/* Features List */}
              <div className="space-y-1.5 text-xs">
                {supply.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-1.5 text-neutral-300 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* Bottom Action / Installation status */}
              <div className="pt-2 border-t border-neutral-800/80 space-y-2">
                {supply.installed ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1 text-emerald-400 font-mono font-semibold">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Instalado & Operativo
                      </span>
                      <span className="text-[11px] text-neutral-500 font-mono">Calibrado</span>
                    </div>

                    {/* Quick action button for installed hardware */}
                    {supply.category === 'meters' && (
                      <button
                        onClick={() => calibrateMeter(supply.id.includes('ph') ? 'ph' : (supply.id.includes('ec') ? 'ec' : 'par'))}
                        className="w-full py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1 border border-neutral-700"
                      >
                        <Activity className="w-3.5 h-3.5 text-cyan-400" />
                        Calibrar Sensor con Patrón
                      </button>
                    )}

                    {supply.category === 'irrigation' && (
                      <button
                        onClick={toggleAutoWater}
                        className="w-full py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 text-xs font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1 border border-blue-500/40"
                      >
                        <Droplets className="w-3.5 h-3.5 text-blue-400" />
                        {autoWaterActive ? 'Pausar Riego Automático' : 'Activar Riego Automático'}
                      </button>
                    )}

                    {supply.category === 'co2' && (
                      <button
                        onClick={() => setCo2Ppm(1200)}
                        className="w-full py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1 border border-emerald-500/40"
                      >
                        <Wind className="w-3.5 h-3.5 text-emerald-400" />
                        Ajustar a 1200 PPM Óptimo
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400">Precio de adquisición:</span>
                      <span className="font-mono font-bold text-sm">
                        {selectedCurrency === 'FLORA' ? (
                          <span className="text-amber-400 flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-amber-500" />
                            {supply.priceFlora} $FLORA
                          </span>
                        ) : (
                          <span className="text-purple-300 flex items-center gap-1">
                            <Coins className="w-3.5 h-3.5 text-purple-400" />
                            {supply.priceSol} SOL
                          </span>
                        )}
                      </span>
                    </div>

                    <button
                      onClick={() => buySupply(supply.id, selectedCurrency)}
                      disabled={!isAffordable}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold font-mono transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        isAffordable
                          ? selectedCurrency === 'FLORA'
                            ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold shadow-md shadow-amber-950'
                            : 'bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md shadow-purple-950'
                          : 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Comprar & Instalar en Sala
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Educational Notice */}
      <div className="hud-panel p-5 flex items-start gap-3 text-xs text-neutral-400 leading-relaxed">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-neutral-200 block mb-1">Impacto Biológico de la Automatización y el CO2 Enriquecido</strong>
          En concentraciones atmosféricas estándar (400 PPM), las plantas de cannabis alcanzan su punto de saturación lumínica a ~600-700 μmol/m²s (PPFD). Al enriquecer el aire a 1200-1500 PPM con inyección de CO2 presurizado y mantener un VPD de 1.1-1.3 kPa, el dosel foliar puede asimilar hasta 1000-1200 μmol/m²s sin foto-inhibición, incrementando el peso seco final y la biosíntesis de terpenos en más de un 35%.
        </div>
      </div>
    </div>
  );
};
