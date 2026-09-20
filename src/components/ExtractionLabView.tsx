import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { LabVisualizer } from './LabVisualizer';
import { 
  FlaskConical, 
  Wrench, 
  Flame, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight, 
  Package, 
  TrendingUp,
  Cpu,
  Gamepad2,
  Gauge,
  Sliders
} from 'lucide-react';

export const ExtractionLabView: React.FC = () => {
  const {
    rawFlowerGrams,
    trimGrams,
    machines,
    repairMachine,
    processRawFlower,
    processedProducts,
    floraBalance,
    executeManualRosinPress,
    playerLevel,
    rankTitle
  } = useGame();

  const [activeTab, setActiveTab] = useState<'arcade' | 'batch' | 'machinery'>('arcade');
  const [selectedMachineCategory, setSelectedMachineCategory] = useState<'press' | 'extractor' | 'dryer'>('press');
  const [selectedProcess, setSelectedProcess] = useState<'live_rosin' | 'cured_flower' | 'full_spec_oil' | 'pure_terpenes'>('live_rosin');
  const [gramsToProcess, setGramsToProcess] = useState<number>(25);

  const processOptions = [
    {
      id: 'live_rosin',
      name: 'Live Rosin Prensado Térmico (90u)',
      description: 'Extracción sin solventes mediante presión de 10T y temperatura suave (82°C). Retiene el espectro completo de cannabinoides.',
      requiredMachine: 'Prensa Térmica Hidráulica 10 Toneladas',
      yieldRatio: '22% retorno de resina dorada',
      valueMultiplier: 'Alto valor comercial',
      badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10'
    },
    {
      id: 'cured_flower',
      name: 'Flor Curada en Frío (Freeze-Drying)',
      description: 'Curado criogénico al vacío. Evita la oxidación de tricomas y garantiza cogollos con olor y color hiper-fresco.',
      requiredMachine: 'Liofilizador Criogénico SubZero',
      yieldRatio: '100% retención de volumen',
      valueMultiplier: 'Estándar Premium',
      badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
    },
    {
      id: 'pure_terpenes',
      name: 'Aislamiento Fraccionado de Terpenos',
      description: 'Destilación rotativa al vacío de terpenos volátiles (Mirceno, Limoneno, Linalol). Pureza botánica del 99%.',
      requiredMachine: 'Destilador Rotativo de Terpenos (Rotavapor)',
      yieldRatio: '8% destilado concentrado',
      valueMultiplier: 'Ultra-Exclusivo (V2P / Vapes)',
      badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10'
    },
    {
      id: 'full_spec_oil',
      name: 'Aceite Full Spectrum Grado Farmacéutico',
      description: 'Maceración y refinamiento en frío de cannabinoides y flavonoides activos para tinturas sublinguales medicinales.',
      requiredMachine: 'Destilador Rotativo de Terpenos (Rotavapor)',
      yieldRatio: '40% extracto oleoso',
      valueMultiplier: 'Demanda Alta',
      badgeColor: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10'
    }
  ];

  const handleExecuteProcess = () => {
    if (gramsToProcess <= 0) return;
    processRawFlower(selectedProcess, gramsToProcess);
  };

  return (
    <div className="space-y-6">
      {/* Header with Lab Status & Biomass Inventory */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 font-mono flex items-center gap-1.5">
              <Gamepad2 className="w-3.5 h-3.5 text-purple-400" />
              Laboratorio Fitoquímico Animado & Gaming
            </span>
            <span className="text-xs text-neutral-400 font-mono hidden sm:inline">
              Rango: {rankTitle} (Nivel {playerLevel})
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-emerald-400" />
            Laboratorio de Extracción & Prensado Interactivo
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Prensa resinas en la Zona Dorada con mecánicas hidráulicas en tiempo real, destila terpenos puros al vacío y mantén la maquinaria quemando $FLORA.
          </p>
        </div>

        {/* Current Available Stock */}
        <div className="flex items-center gap-3">
          <div className="bg-neutral-950 border border-neutral-800 px-4 py-2 rounded-xl text-center">
            <span className="text-[10px] text-neutral-500 uppercase font-mono block">Materia Prima Disponible</span>
            <span className="text-base font-bold text-emerald-400 font-mono">{rawFlowerGrams}g Flor Seca</span>
          </div>
          <div className="bg-neutral-950 border border-neutral-800 px-4 py-2 rounded-xl text-center">
            <span className="text-[10px] text-neutral-500 uppercase font-mono block">Biomasa Trim</span>
            <span className="text-base font-bold text-amber-400 font-mono">{trimGrams}g</span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('arcade')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-mono transition cursor-pointer ${
              activeTab === 'arcade'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <Gamepad2 className="w-4 h-4 text-emerald-400" />
            <span>Taller Interactivo (Mini-Juego Rosin & Animaciones)</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-mono transition cursor-pointer ${
              activeTab === 'batch'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <Sliders className="w-4 h-4 text-purple-400" />
            <span>Refinado por Lotes Industriales</span>
          </button>

          <button
            onClick={() => setActiveTab('machinery')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-mono transition cursor-pointer ${
              activeTab === 'machinery'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'bg-neutral-900/60 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>Bahía de Maquinaria ({machines.length})</span>
          </button>
        </div>

        <span className="text-xs text-neutral-500 font-mono hidden md:inline">
          Desgaste Deflacionario On-Chain
        </span>
      </div>

      {/* VIEW MODE 1: ARCADE INTERACTIVE LAB (DEFAULT) */}
      {activeTab === 'arcade' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Visualizer Stage (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <LabVisualizer 
              selectedMachineCategory={selectedMachineCategory}
              onSelectCategory={setSelectedMachineCategory}
              onExecuteManualPress={(bonus, quality, isCrit) => executeManualRosinPress(bonus, quality, isCrit)}
            />
          </div>

          {/* Side Panel: Inventory & Quick Stats (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Quick Machinery Wear Card */}
            <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Estado de Equipos de Laboratorio
                  </h3>
                </div>
                <button
                  onClick={() => setActiveTab('machinery')}
                  className="text-[11px] text-amber-400 hover:underline font-mono cursor-pointer"
                >
                  Ver todos
                </button>
              </div>

              <div className="space-y-2.5">
                {machines.slice(0, 3).map((m) => {
                  const isCrit = m.wearPercentage <= 25;
                  const isWarn = m.wearPercentage <= 50;
                  return (
                    <div key={m.id} className="p-2.5 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-semibold text-white text-xs">{m.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          Desgaste: -{m.wearRatePerCycle}% por extracción
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold text-xs ${isCrit ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {m.wearPercentage}%
                        </span>
                        {m.wearPercentage < 100 && (
                          <button
                            onClick={() => repairMachine(m.id)}
                            disabled={floraBalance < m.repairCostFlora}
                            className="px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded text-[11px] font-mono cursor-pointer disabled:opacity-50"
                          >
                            Reparar ({m.repairCostFlora} $F)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Processed Products Inventory */}
            <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Extractos Listos ({processedProducts.length})
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-neutral-400">
                  Total en Stock
                </span>
              </div>

              {processedProducts.length === 0 ? (
                <p className="text-xs text-neutral-500 py-3 text-center font-mono">
                  Presiona el mini-juego para prensar tu primer lote de Live Rosin.
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {processedProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-white text-xs">{prod.name}</div>
                        <div className="text-[11px] text-neutral-400 font-mono">
                          {prod.quantityGrams}g • {prod.potency}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          Hash: {prod.batchHash}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-neutral-500 uppercase font-mono block">Valor</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {prod.marketValueFlora} $FLORA
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: BATCH INDUSTRIAL EXTRACTION */}
      {activeTab === 'batch' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Protocolo de Refinado Automatizado
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">
                  Lote On-Chain
                </span>
              </div>

              {/* Select Method */}
              <div className="space-y-2.5">
                <span className="text-xs text-neutral-300 font-medium">1. Selecciona el Tipo de Extracto:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {processOptions.map((opt) => {
                    const isSelected = selectedProcess === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => setSelectedProcess(opt.id as any)}
                        className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                          isSelected
                            ? 'bg-emerald-950/40 border-emerald-500 shadow-sm'
                            : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-xs font-bold text-white">{opt.name}</h4>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-neutral-400 leading-snug line-clamp-2">
                            {opt.description}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-neutral-900">
                          <span className="text-neutral-400">{opt.yieldRatio}</span>
                          <span className={`px-1.5 py-0.2 rounded border ${opt.badgeColor}`}>
                            {opt.valueMultiplier}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Select Input Grams */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-300 font-medium">2. Cantidad de Flor Cruda a Procesar:</span>
                  <span className="font-mono text-emerald-400 font-bold">{gramsToProcess} gramos</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={5}
                    max={Math.max(50, rawFlowerGrams)}
                    step={5}
                    value={gramsToProcess}
                    onChange={(e) => setGramsToProcess(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-2 bg-neutral-800 rounded-lg"
                  />
                </div>
                <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                  <span>Mín: 5g</span>
                  <button 
                    onClick={() => setGramsToProcess(rawFlowerGrams)}
                    className="text-emerald-400 hover:underline cursor-pointer"
                  >
                    Usar Todo ({rawFlowerGrams}g)
                  </button>
                </div>
              </div>

              {/* Execute Button */}
              <div className="pt-2">
                <button
                  onClick={handleExecuteProcess}
                  disabled={rawFlowerGrams < gramsToProcess || gramsToProcess <= 0}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-neutral-950 font-bold text-sm shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Cpu className="w-4 h-4" />
                  <span>Ejecutar Extracción Industrial ({gramsToProcess}g)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Extractos en Inventario ({processedProducts.length})
                  </h3>
                </div>
                <span className="text-[11px] text-neutral-400">
                  Listos para venta o V2P
                </span>
              </div>

              {processedProducts.length === 0 ? (
                <p className="text-xs text-neutral-500 py-4 text-center">
                  Aún no has procesado extractos. Inicia un lote de Live Rosin o Terpenos para abastecer tu dispensario.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {processedProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="p-3 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <h4 className="font-bold text-white">{prod.name}</h4>
                        <p className="text-[11px] text-neutral-400 font-mono">
                          {prod.quantityGrams}g | {prod.potency}
                        </p>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          Hash de Lote: {prod.batchHash}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-neutral-500 block uppercase font-mono">Valor Mercado</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {prod.marketValueFlora} $FLORA
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: FULL MACHINERY & DEPRECIATION BAY */}
      {activeTab === 'machinery' && (
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Depreciación y Mantenimiento de Maquinaria
                </h3>
                <p className="text-xs text-neutral-400">
                  La fricción y el uso continuo degradan la maquinaria. Reparar cada equipo quema $FLORA en la red Solana.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-amber-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              Mecanismo Deflacionario Activo
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {machines.map((machine) => {
              const isCritical = machine.wearPercentage <= 25;
              const isWarning = machine.wearPercentage <= 50;

              return (
                <div 
                  key={machine.id} 
                  className={`p-4 rounded-xl border transition flex flex-col justify-between space-y-3 ${
                    isCritical 
                      ? 'bg-red-950/20 border-red-500/40' 
                      : (isWarning ? 'bg-amber-950/20 border-amber-500/30' : 'bg-neutral-950/80 border-neutral-800')
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className="text-xs font-bold text-white">{machine.name}</h4>
                      <span className={`text-xs font-mono font-bold ${
                        isCritical ? 'text-red-400' : (isWarning ? 'text-amber-400' : 'text-emerald-400')
                      }`}>
                        {machine.wearPercentage}%
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400 line-clamp-2">{machine.description}</p>
                  </div>

                  <div className="space-y-2">
                    {/* Wear bar */}
                    <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCritical ? 'bg-red-500' : (isWarning ? 'bg-amber-400' : 'bg-emerald-500')
                        }`}
                        style={{ width: `${machine.wearPercentage}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[11px] text-neutral-500 font-mono">
                        Desgaste: -{machine.wearRatePerCycle}%
                      </span>

                      {machine.wearPercentage < 100 && (
                        <button
                          onClick={() => repairMachine(machine.id)}
                          disabled={floraBalance < machine.repairCostFlora}
                          className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 rounded-lg text-xs font-mono font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Flame className="w-3 h-3 text-amber-400" />
                          <span>Reparar ({machine.repairCostFlora} $FLORA)</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

