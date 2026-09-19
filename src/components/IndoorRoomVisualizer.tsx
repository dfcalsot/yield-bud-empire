import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { PlantInGrow } from '../types';
import { 
  Sun, 
  Sparkles, 
  AlertCircle, 
  Eye, 
  Droplet, 
  Wind, 
  Layers, 
  Scissors, 
  CheckCircle2, 
  Flame, 
  Maximize2, 
  Minimize2,
  Activity,
  Gauge,
  Zap,
  Info,
  Fan,
  Cylinder,
  Play
} from 'lucide-react';

interface IndoorRoomVisualizerProps {
  onSelectPlant?: (index: number) => void;
}

export const IndoorRoomVisualizer: React.FC<IndoorRoomVisualizerProps> = () => {
  const {
    indoorPlants,
    selectedPlantIndex,
    selectPlant,
    activePlant,
    currentFacility,
    waterPlant,
    waterAllPlants,
    feedNutrients,
    feedAllPlants,
    speedUpGrowth,
    speedUpIndoorRoom,
    harvestPlant,
    harvestAllReadyPlants,
    trainPlant,
    trainIndoorCanopy,
    co2Ppm,
    setCo2Ppm
  } = useGame();

  const [viewMode, setViewMode] = useState<'room' | 'focus'>('room');
  const [activeRowTab, setActiveRowTab] = useState<'all' | 1 | 2 | 3>('all');
  const [showTrichomeLens, setShowTrichomeLens] = useState(false);
  const [isDripIrrigationPumping, setIsDripIrrigationPumping] = useState(false);
  const [isCo2Injecting, setIsCo2Injecting] = useState(false);

  // Trigger temporary irrigation pumping visual surge
  const handleBatchWaterWithAnimation = () => {
    setIsDripIrrigationPumping(true);
    waterAllPlants();
    setTimeout(() => setIsDripIrrigationPumping(false), 3000);
  };

  // Trigger CO2 injection surge
  const handleCo2Pulse = () => {
    setIsCo2Injecting(true);
    if (setCo2Ppm) {
      setCo2Ppm(Math.min(1800, co2Ppm + 250));
    }
    setTimeout(() => setIsCo2Injecting(false), 3500);
  };

  // Group plants into 3 rows (Row 1, 2, 3), each with 5 pairs of 2 plants (10 plants per row)
  const rows = [1, 2, 3].map(rowNum => {
    const rowPlants = (indoorPlants || []).filter(p => p.rowIndex === rowNum);
    const plantsInThisRow = rowPlants.length === 10 ? rowPlants : (indoorPlants || []).slice((rowNum - 1) * 10, rowNum * 10);
    
    // Group in pairs of 2 (5 pairs of 2)
    const pairs: PlantInGrow[][] = [];
    for (let i = 0; i < 10; i += 2) {
      pairs.push([plantsInThisRow[i], plantsInThisRow[i + 1]].filter(Boolean));
    }
    return {
      rowNumber: rowNum,
      rowLabel: rowNum === 1 ? 'Fila 1 (Bancada Posterior)' : rowNum === 2 ? 'Fila 2 (Canopia Central)' : 'Fila 3 (Bancada Frontal)',
      pairs,
      plants: plantsInThisRow
    };
  });

  const selectedPlant: PlantInGrow | null = indoorPlants?.[selectedPlantIndex] || activePlant || null;

  // Global room stats
  const totalPlants = indoorPlants?.length || 0;
  const readyToHarvestCount = (indoorPlants || []).filter(p => p.stage === 'ready_harvest' || p.progressPercent >= 90).length;
  const avgHealth = Math.round((indoorPlants || []).reduce((acc, p) => acc + p.health, 0) / (totalPlants || 1));
  const avgMoisture = Math.round((indoorPlants || []).reduce((acc, p) => acc + p.soilMoisture, 0) / (totalPlants || 1));

  // Determine LED PPFD from the room / plant
  const roomPpfd = selectedPlant?.ppfdLightIntensity || 720;
  const lightOpacity = Math.min(1, Math.max(0.35, roomPpfd / 1000));

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-4 sm:p-5 shadow-2xl space-y-4 overflow-hidden relative">
      
      {/* Top Indoor Room Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center text-neutral-950 shadow-lg shadow-emerald-950 font-black">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                Cuarto de Cultivo Indoor Profesional
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold">
                  3 Filas × 10 Plantas Cannabis (30 Totales en Pares de 2)
                </span>
              </h3>
            </div>
            <p className="text-xs text-neutral-400">
              Ambiente cerrado Mylar Diamond con lámparas LED multi-barra, sistema de goteo presurizado e inyección de CO₂
            </p>
          </div>
        </div>

        {/* View mode toggle & quick room actions */}
        <div className="flex items-center gap-2">
          {/* Row Filter Pills */}
          <div className="hidden sm:flex bg-neutral-950 p-1 rounded-xl border border-neutral-800 text-xs">
            <button
              onClick={() => setActiveRowTab('all')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-mono ${
                activeRowTab === 'all' ? 'bg-emerald-500 text-neutral-950 font-bold shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todas (30)
            </button>
            <button
              onClick={() => setActiveRowTab(1)}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-mono ${
                activeRowTab === 1 ? 'bg-emerald-500 text-neutral-950 font-bold shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Fila 1 (10)
            </button>
            <button
              onClick={() => setActiveRowTab(2)}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-mono ${
                activeRowTab === 2 ? 'bg-emerald-500 text-neutral-950 font-bold shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Fila 2 (10)
            </button>
            <button
              onClick={() => setActiveRowTab(3)}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer font-mono ${
                activeRowTab === 3 ? 'bg-emerald-500 text-neutral-950 font-bold shadow' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Fila 3 (10)
            </button>
          </div>

          <button
            onClick={() => setViewMode(viewMode === 'room' ? 'focus' : 'room')}
            className="px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
          >
            {viewMode === 'room' ? (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Microscopio Planta</span>
              </>
            ) : (
              <>
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>Ver Sala Completa (30)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Systems Status Ribbon: LED Lamps, Drip Irrigation, CO2 Tank & Exhaust Fan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
        {/* Lámparas LED */}
        <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sun className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 font-mono block leading-tight">5x Lámparas LED Bar</span>
              <span className="font-bold text-amber-300 font-mono text-sm">{roomPpfd} μmol/m²s</span>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">18h Luz</span>
        </div>

        {/* Sistema de Riego por Goteo */}
        <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 ${isDripIrrigationPumping ? 'animate-bounce' : ''}`}>
              <Droplet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 font-mono block leading-tight">Riego por Goteo (30 Pots)</span>
              <span className="font-bold text-cyan-300 font-mono text-sm">{avgMoisture}% Humedad</span>
            </div>
          </div>
          <button
            onClick={handleBatchWaterWithAnimation}
            className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-mono font-bold border border-cyan-500/30 transition cursor-pointer"
          >
            {isDripIrrigationPumping ? 'Bombeando...' : 'Regar Sala'}
          </button>
        </div>

        {/* Inyección de CO2 */}
        <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 ${isCo2Injecting ? 'animate-ping' : ''}`}>
              <Wind className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 font-mono block leading-tight">Inyección Gas CO₂</span>
              <span className="font-bold text-purple-300 font-mono text-sm">{co2Ppm} PPM</span>
            </div>
          </div>
          <button
            onClick={handleCo2Pulse}
            className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-mono font-bold border border-purple-500/30 transition cursor-pointer"
          >
            {isCo2Injecting ? 'Válvula Abierta' : '+ Pulso CO₂'}
          </button>
        </div>

        {/* Extracción & Canopia */}
        <div className="p-3 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-neutral-400 font-mono block leading-tight">Canopia Cannabis</span>
              <span className="font-bold text-emerald-300 font-mono text-sm">{avgHealth}% Salud</span>
            </div>
          </div>
          {readyToHarvestCount > 0 ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 animate-pulse font-mono">
              {readyToHarvestCount} Cosechables
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono">En Crecimiento</span>
          )}
        </div>
      </div>

      {/* VIEW MODE 1: FULL INDOOR ROOM (3 Rows of 10 Cannabis Plants in Pairs of 2) */}
      {viewMode === 'room' && (
        <div className="space-y-4">
          
          {/* Visual Indoor Enclosure Stage (Paredes Mylar Diamond + Lámparas + Riego + CO2) */}
          <div className="relative rounded-3xl bg-neutral-950 border border-neutral-800 p-4 sm:p-5 overflow-hidden shadow-2xl min-h-[460px]">
            
            {/* Background Mylar Diamond Reflective Foil */}
            <div 
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{
                backgroundImage: 'radial-gradient(circle, #525252 1px, transparent 1px), linear-gradient(45deg, #171717 25%, transparent 25%), linear-gradient(-45deg, #171717 25%, transparent 25%)',
                backgroundSize: '12px 12px, 24px 24px, 24px 24px'
              }}
            />

            {/* Aluminum Tent Structural Corner Poles */}
            <div className="absolute top-0 bottom-0 left-2 w-1.5 bg-neutral-600 rounded-full opacity-60 pointer-events-none" />
            <div className="absolute top-0 bottom-0 right-2 w-1.5 bg-neutral-600 rounded-full opacity-60 pointer-events-none" />

            {/* OVERHEAD MULTI-BAR LED FIXTURES (Spider / Quantum Bars) */}
            <div className="relative z-10 flex justify-around mb-3 px-2 sm:px-6">
              {[1, 2, 3, 4, 5].map((barNum) => (
                <div key={barNum} className="flex flex-col items-center">
                  {/* Ratchet Hanging Cord */}
                  <div className="w-0.5 h-3.5 bg-neutral-600" />
                  
                  {/* Heavy Duty LED Heatsink Bar */}
                  <div className="h-4 w-16 sm:w-28 bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 border-x border-b border-neutral-600 rounded-b-lg shadow-lg flex items-center justify-around px-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.9)] animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-200 shadow-[0_0_6px_rgba(165,243,252,0.9)]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]" />
                  </div>

                  {/* Suspended CO2 Rain Drip Tube Section */}
                  <div className="w-16 sm:w-28 h-1 bg-neutral-900 border-x border-b border-neutral-700 flex justify-around items-center">
                    <span className="w-0.5 h-0.5 rounded-full bg-cyan-400" />
                    <span className="w-0.5 h-0.5 rounded-full bg-cyan-400" />
                    <span className="w-0.5 h-0.5 rounded-full bg-cyan-400" />
                  </div>

                  {/* Photon Cone Shimmering downward onto the cannabis canopy */}
                  <div 
                    className="w-20 sm:w-32 h-10 pointer-events-none transition-opacity animate-led-shimmer"
                    style={{
                      background: `linear-gradient(to bottom, rgba(245, 158, 11, ${0.18 * lightOpacity}), transparent)`
                    }}
                  />
                </div>
              ))}
            </div>

            {/* CO2 DESCENDING MIST PARTICLES OVER THE CANOPY */}
            <div className="absolute top-12 left-8 right-8 h-40 pointer-events-none z-10 flex justify-around opacity-35 overflow-hidden">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1 rounded-full bg-gradient-to-b from-purple-400/40 via-cyan-300/20 to-transparent ${
                    isCo2Injecting ? 'h-36 opacity-80' : 'h-20'
                  } animate-co2-mist`}
                  style={{ animationDelay: `${i * 0.35}s`, animationDuration: `${2.8 + (i % 3)}s` }}
                />
              ))}
            </div>

            {/* GROW ROOM VENTILATION & EXTRACTION HEADER */}
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400 bg-neutral-900/90 px-3 py-1 rounded-xl border border-neutral-800">
                <Wind className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} />
                <span>Extracción 6" Vortex (450 CFM) & Filtro Carbón Activo</span>
              </div>

              {/* CO2 Tank Status Pill */}
              <div className="flex items-center gap-2 text-[10px] font-mono text-purple-300 bg-neutral-900/90 px-3 py-1 rounded-xl border border-purple-500/30">
                <Cylinder className="w-3.5 h-3.5 text-purple-400" />
                <span>Botella CO₂ 10kg Presurizada: {co2Ppm} PPM</span>
              </div>
            </div>

            {/* THE 3 ROWS CONTAINER (3 Filas de 10 plantas ordenadas en 5 pares de 2) */}
            <div className="relative z-10 space-y-4">
              {rows
                .filter(r => activeRowTab === 'all' || activeRowTab === r.rowNumber)
                .map((row) => (
                  <div 
                    key={row.rowNumber}
                    className="p-3.5 rounded-2xl bg-neutral-900/70 border border-neutral-800/90 backdrop-blur-md space-y-2.5 hover:border-neutral-700 transition shadow-lg relative"
                  >
                    {/* Continuous Drip Irrigation Mainline Pipe across this grow table */}
                    <div className="absolute top-8 left-4 right-4 h-1 bg-neutral-800 rounded pointer-events-none z-0">
                      <div className={`h-full bg-cyan-500/70 rounded ${isDripIrrigationPumping ? 'animate-pulse' : ''}`} />
                    </div>

                    {/* Row Header */}
                    <div className="flex items-center justify-between text-xs px-1 relative z-10">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                        <span className="font-extrabold text-white tracking-wide">{row.rowLabel}</span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          (10 Plantas Cannabis • 5 Parejas de 2 en Macetas Geotextiles)
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-mono text-neutral-400">
                        <span className="text-cyan-400 font-semibold flex items-center gap-1">
                          <Droplet className="w-3 h-3" />
                          Goteo: 1.2 L/h
                        </span>
                        <span>Bancada #{row.rowNumber}</span>
                      </div>
                    </div>

                    {/* 5 PAIRS OF 2 PLANTS (Total 10 plants per row) */}
                    <div className="grid grid-cols-5 gap-2 sm:gap-3 relative z-10">
                      {row.pairs.map((pair, pairIdx) => (
                        <div 
                          key={pairIdx}
                          className="bg-neutral-950/90 border border-neutral-800/90 rounded-2xl p-1.5 sm:p-2 flex flex-col justify-between relative group hover:border-emerald-500/50 transition shadow-inner"
                        >
                          {/* Pair Badge & Micro Drip Splitter */}
                          <div className="text-[9px] font-mono text-neutral-400 flex items-center justify-between mb-1 px-1 border-b border-neutral-800/80 pb-1">
                            <span className="font-bold text-neutral-300">Par {pairIdx + 1}</span>
                            <span className="text-[8px] text-cyan-400 flex items-center gap-0.5">
                              <span className="w-1 h-1 rounded-full bg-cyan-400" />
                              2× Drip
                            </span>
                          </div>

                          {/* The 2 Plants in this pair */}
                          <div className="grid grid-cols-2 gap-1.5">
                            {pair.map((p, plantInPairIdx) => {
                              const overallIndex = (row.rowNumber - 1) * 10 + pairIdx * 2 + plantInPairIdx;
                              const isSelected = selectedPlantIndex === overallIndex;
                              const isReady = p.stage === 'ready_harvest' || p.progressPercent >= 90;
                              const isDry = p.soilMoisture < 35;

                              return (
                                <button
                                  key={p.id || overallIndex}
                                  type="button"
                                  onClick={() => selectPlant(overallIndex)}
                                  className={`relative p-1.5 rounded-xl border flex flex-col items-center justify-center transition cursor-pointer text-center group/plant ${
                                    isSelected
                                      ? 'bg-emerald-950/60 border-emerald-400 ring-2 ring-emerald-500/60 scale-[1.03] shadow-lg shadow-emerald-950'
                                      : isReady
                                      ? 'bg-amber-950/40 border-amber-500/60 hover:border-amber-400'
                                      : 'bg-neutral-900/90 hover:bg-neutral-850 border-neutral-800 hover:border-neutral-700'
                                  }`}
                                  title={`Cannabis #${overallIndex + 1} | Fila ${row.rowNumber} Par ${pairIdx + 1} (${plantInPairIdx === 0 ? 'A' : 'B'}) - ${p.strain.name}`}
                                >
                                  {/* AUTHENTIC CANNABIS BOTANICAL MINI-ILLUSTRATION */}
                                  <div className="w-12 h-14 sm:w-14 sm:h-16 flex items-center justify-center relative">
                                    <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                                      
                                      {/* Drip Irrigation Stake inserted into pot */}
                                      <g id="miniDrip">
                                        <path d="M 30 94 L 38 92 L 38 104" stroke="#0ea5e9" strokeWidth="1.2" fill="none" />
                                        {/* Animated Drip Droplet */}
                                        <circle cx="38" cy="98" r="1.2" fill="#38bdf8" className="animate-water-drip" />
                                      </g>

                                      {/* Geotextile Fabric Smart Pot */}
                                      <ellipse cx="50" cy="104" rx="28" ry="7" fill="#221f1f" stroke="#3a3a3a" strokeWidth="1.5" />
                                      <path d="M 22 104 L 28 117 Q 50 121 72 117 L 78 104 Z" fill="#1c1917" stroke="#383838" strokeWidth="1.5" />
                                      {/* Coco Coir & Perlite Soil */}
                                      <ellipse cx="50" cy="105" rx="25" ry="5" fill={p.soilMoisture > 50 ? "#1c3829" : "#382216"} />
                                      <circle cx="42" cy="104" r="0.8" fill="#f5f5f5" />
                                      <circle cx="58" cy="105" r="0.8" fill="#f5f5f5" />

                                      {/* 1. SEED STAGE */}
                                      {p.stage === 'seed' && (
                                        <g className="animate-pulse">
                                          <ellipse cx="50" cy="102" rx="4" ry="3" fill="#713f12" />
                                          <path d="M 50 100 Q 48 94 52 88" stroke="#84cc16" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                                          <circle cx="52" cy="88" r="2" fill="#a3e635" />
                                        </g>
                                      )}

                                      {/* 2. SEEDLING STAGE */}
                                      {p.stage === 'seedling' && (
                                        <g className="animate-cannabis-breeze">
                                          <path d="M 50 104 Q 49 88 50 80" stroke="#65a30d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                                          <ellipse cx="44" cy="86" rx="6" ry="3.5" fill="#84cc16" transform="rotate(-15 44 86)" />
                                          <ellipse cx="56" cy="86" rx="6" ry="3.5" fill="#84cc16" transform="rotate(15 56 86)" />
                                          {/* First serrated blades */}
                                          <path d="M 50 80 L 40 76 L 45 79 L 36 78 L 46 81 Z" fill="#15803d" />
                                          <path d="M 50 80 L 60 76 L 55 79 L 64 78 L 54 81 Z" fill="#15803d" />
                                        </g>
                                      )}

                                      {/* 3, 4, 5. VEGETATIVE & FLOWERING CANNABIS */}
                                      {(p.stage === 'vegetative' || p.stage === 'flowering' || p.stage === 'ready_harvest') && (
                                        <g>
                                          {/* Woody Cannabis Stem */}
                                          <path d="M 50 104 Q 49 72 50 48" stroke="#365314" strokeWidth="4" fill="none" strokeLinecap="round" />
                                          
                                          {/* Lower 5-point Fan Leaves */}
                                          <g className="animate-cannabis-sway-left" style={{ transformOrigin: '50px 86px' }}>
                                            <path d="M 50 86 Q 30 82 18 88" stroke="#365314" strokeWidth="2" fill="none" />
                                            {/* Serrated palmate leaf */}
                                            <path d="M 18 88 L 8 90 L 16 86 L 6 83 L 18 83 L 12 78 L 22 84 Z" fill="#15803d" />
                                          </g>
                                          <g className="animate-cannabis-sway-right" style={{ transformOrigin: '50px 86px' }}>
                                            <path d="M 50 86 Q 70 82 82 88" stroke="#365314" strokeWidth="2" fill="none" />
                                            <path d="M 82 88 L 92 90 L 84 86 L 94 83 L 82 83 L 88 78 L 78 84 Z" fill="#15803d" />
                                          </g>

                                          {/* Mid 5-point Fan Leaves */}
                                          <g className="animate-cannabis-sway-left" style={{ transformOrigin: '50px 68px' }}>
                                            <path d="M 50 68 Q 34 62 24 67" stroke="#365314" strokeWidth="1.8" fill="none" />
                                            <path d="M 24 67 L 14 68 L 22 64 L 14 61 L 24 62 L 20 56 L 28 63 Z" fill="#16a34a" />
                                          </g>
                                          <g className="animate-cannabis-sway-right" style={{ transformOrigin: '50px 68px' }}>
                                            <path d="M 50 68 Q 66 62 76 67" stroke="#365314" strokeWidth="1.8" fill="none" />
                                            <path d="M 76 67 L 86 68 L 78 64 L 86 61 L 76 62 L 80 56 L 72 63 Z" fill="#16a34a" />
                                          </g>

                                          {/* Top Sugar Leaves */}
                                          <path d="M 50 54 L 38 48 L 46 52 Z" fill="#22c55e" />
                                          <path d="M 50 54 L 62 48 L 54 52 Z" fill="#22c55e" />

                                          {/* FLOWERING / COLA BUDS WITH TRICHOMES & PISTILS */}
                                          {(p.stage === 'flowering' || p.stage === 'ready_harvest') && (
                                            <g className="animate-cannabis-breeze">
                                              {/* Main Crown Apex Cola (Cogollo Apical Resinoso) */}
                                              <ellipse cx="50" cy="38" rx="14" ry="20" fill={p.strain.colorTheme || '#15803d'} opacity="0.95" />
                                              <ellipse cx="50" cy="46" rx="16" ry="12" fill="#14532d" />
                                              <ellipse cx="50" cy="30" rx="10" ry="12" fill="#166534" />
                                              <circle cx="50" cy="20" r="5" fill="#22c55e" />

                                              {/* Satellite Side Nugs */}
                                              <ellipse cx="32" cy="62" rx="8" ry="11" fill={p.strain.colorTheme || '#15803d'} opacity="0.9" />
                                              <ellipse cx="68" cy="62" rx="8" ry="11" fill={p.strain.colorTheme || '#15803d'} opacity="0.9" />

                                              {/* Amber Pistils (Pelos / Estigmas Anaranjados) */}
                                              <path d="M 46 32 Q 40 24 43 20" stroke="#f97316" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                                              <path d="M 54 32 Q 60 24 57 20" stroke="#ea580c" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                                              <path d="M 44 44 Q 36 40 34 35" stroke="#f59e0b" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                                              <path d="M 56 44 Q 64 40 66 35" stroke="#f97316" strokeWidth="1.2" fill="none" strokeLinecap="round" />

                                              {/* Sparkling Trichome Frost */}
                                              <circle cx="48" cy="35" r="1.3" fill="#ffffff" className="animate-trichome-sparkle" />
                                              <circle cx="53" cy="40" r="1.2" fill="#fef08a" className="animate-trichome-sparkle" />
                                              <circle cx="50" cy="26" r="1.2" fill="#ffffff" className="animate-trichome-sparkle" />
                                              <circle cx="32" cy="60" r="1" fill="#ffffff" className="animate-trichome-sparkle" />
                                              <circle cx="68" cy="60" r="1" fill="#ffffff" className="animate-trichome-sparkle" />
                                            </g>
                                          )}
                                        </g>
                                      )}
                                    </svg>

                                    {/* Moisture Warning Drop */}
                                    {isDry && (
                                      <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                                    )}

                                    {/* Ready To Harvest Sparkle Indicator */}
                                    {isReady && (
                                      <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-amber-400 flex items-center justify-center text-[8px] text-neutral-950 font-black shadow-lg shadow-amber-950 animate-bounce">
                                        ✓
                                      </span>
                                    )}
                                  </div>

                                  {/* Plant Micro Labels */}
                                  <div className="w-full mt-1">
                                    <div className="flex items-center justify-between text-[9px] font-mono leading-none">
                                      <span className="text-neutral-300 font-bold">
                                        #{overallIndex + 1}
                                        <span className="text-[8px] text-neutral-500 ml-0.5">
                                          {plantInPairIdx === 0 ? 'A' : 'B'}
                                        </span>
                                      </span>
                                      <span className="text-emerald-400 font-bold">
                                        {p.progressPercent}%
                                      </span>
                                    </div>

                                    {/* Progress micro-bar */}
                                    <div className="w-full h-1 bg-neutral-800 rounded-full mt-1 overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          isReady ? 'bg-amber-400' : 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                        }`}
                                        style={{ width: `${p.progressPercent}%` }}
                                      />
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {/* Capillary Drip Line connector graphic */}
                          <div className="w-full flex items-center justify-center gap-1 mt-1 text-[8px] font-mono text-neutral-500">
                            <span className="w-1.5 h-0.5 bg-cyan-600/40"></span>
                            <span className="truncate">Goteo Pareja {pairIdx + 1}</span>
                            <span className="w-1.5 h-0.5 bg-cyan-600/40"></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>

            {/* INTERACTIVE SELECTED CANNABIS PLANT PREVIEW & ROOM ACTION CONTROLS */}
            {selectedPlant && (
              <div className="relative z-20 mt-4 p-4 rounded-2xl bg-neutral-900/95 border border-emerald-500/50 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-lg font-black shadow-inner">
                    #{selectedPlantIndex + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-extrabold text-white">
                        {selectedPlant.strain.name}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                        Fila {selectedPlant.rowIndex || Math.floor(selectedPlantIndex / 10) + 1} • Par {selectedPlant.pairIndex || Math.floor((selectedPlantIndex % 10) / 2) + 1} ({selectedPlant.positionInPair || ((selectedPlantIndex % 2 === 0) ? 'A' : 'B')})
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-neutral-400 font-mono mt-1">
                      <span>Etapa: <strong className="text-neutral-200 uppercase">{selectedPlant.stage}</strong> ({selectedPlant.progressPercent}%)</span>
                      <span>Humedad: <strong className="text-cyan-300">{selectedPlant.soilMoisture}%</strong></span>
                      <span>Salud: <strong className="text-emerald-300">{selectedPlant.health}%</strong></span>
                      <span>Rendimiento: <strong className="text-amber-300">~{selectedPlant.estimatedDryYieldGrams}g Flor Seca</strong></span>
                    </div>
                  </div>
                </div>

                {/* Direct Action Buttons for the Room and Active Plant */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => waterPlant()}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                    title="Regar la planta individual seleccionada"
                  >
                    <Droplet className="w-3.5 h-3.5" />
                    <span>Regar Planta #{selectedPlantIndex + 1}</span>
                  </button>

                  <button
                    onClick={handleBatchWaterWithAnimation}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                    title="Activar sistema de goteo presurizado en toda la sala (30 plantas)"
                  >
                    <Droplet className="w-3.5 h-3.5 fill-current" />
                    <span>Riego Masivo Sala (30 Plantas)</span>
                  </button>

                  <button
                    onClick={() => feedAllPlants()}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                    title="Fertirriego N-P-K completo para las 3 bancadas"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Fertirriego Canopia</span>
                  </button>

                  {readyToHarvestCount > 0 ? (
                    <button
                      onClick={() => harvestAllReadyPlants()}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-neutral-950 font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-lg animate-bounce"
                    >
                      <Scissors className="w-3.5 h-3.5" />
                      <span>Cosechar Sala ({readyToHarvestCount} Listas)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setViewMode('focus')}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Microscopio Lente</span>
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Quick Technical Specifications Footer */}
          <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded-2xl flex flex-wrap items-center justify-between text-xs text-neutral-400 gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Cuarto Indoor Técnico:</strong> 3 Bancadas continuas con 10 macetas geotextiles de aireación cada una (ordenadas de 2 en 2). El sistema equilibra la evaporación con goteo constante a 1.2 L/h y 1200 PPM de CO₂ suplementario para acelerar la fotosíntesis.
              </span>
            </div>
            <span className="font-mono text-emerald-400 font-bold shrink-0">
              Ocupación: 30 / 30 Plantas
            </span>
          </div>

        </div>
      )}

      {/* VIEW MODE 2: FOCUS INDIVIDUAL PLANT & MICROSCOPE TRICHOMES */}
      {viewMode === 'focus' && selectedPlant && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between bg-neutral-950 p-3.5 rounded-2xl border border-neutral-800">
            <div className="flex items-center gap-2.5">
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-extrabold border border-emerald-500/30">
                Planta Cannabis #{selectedPlantIndex + 1}
              </span>
              <span className="text-sm font-bold text-white">{selectedPlant.strain.name}</span>
              <span className="text-xs text-neutral-400 font-mono">
                (Fila {selectedPlant.rowIndex || Math.floor(selectedPlantIndex / 10) + 1} • Par {selectedPlant.pairIndex || Math.floor((selectedPlantIndex % 10) / 2) + 1})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowTrichomeLens(!showTrichomeLens)}
                className="flex items-center gap-1.5 text-xs bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>{showTrichomeLens ? 'Ocultar Lente' : 'Lente Tricomas 100x'}</span>
              </button>

              <button
                onClick={() => setViewMode('room')}
                className="text-xs px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-semibold transition cursor-pointer"
              >
                Volver a Sala (30 Plantas)
              </button>
            </div>
          </div>

          {/* Detailed Plant Inspector with Trichomes */}
          <div className="bg-neutral-950/90 border border-neutral-800 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="w-full md:w-1/2 flex items-center justify-center">
              {/* Detailed SVG Illustration of this single cannabis plant */}
              <svg viewBox="0 0 240 260" className="w-56 h-56 drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] plant-glow">
                {/* Pot */}
                <ellipse cx="120" cy="220" rx="50" ry="12" fill="#221f1f" stroke="#3a3a3a" strokeWidth="2" />
                <path d="M 70 220 L 80 250 Q 120 258 160 250 L 170 220 Z" fill="#1c1917" stroke="#383838" strokeWidth="2" />
                <ellipse cx="120" cy="222" rx="46" ry="9" fill={selectedPlant.soilMoisture > 50 ? "#1c3829" : "#382216"} />
                
                {/* Cannabis Stalk & Leaves */}
                <path d="M 120 220 Q 118 150 120 80" stroke="#365314" strokeWidth="6" fill="none" strokeLinecap="round" />
                
                {/* Fan Leaves */}
                <path d="M 118 175 Q 80 170 55 180" stroke="#365314" strokeWidth="3" fill="none" />
                <path d="M 55 180 L 35 182 L 48 175 L 30 170 L 52 173 L 42 165 L 60 175 Z" fill="#15803d" />

                <path d="M 122 175 Q 160 170 185 180" stroke="#365314" strokeWidth="3" fill="none" />
                <path d="M 185 180 L 205 182 L 192 175 L 210 170 L 188 173 L 198 165 L 180 175 Z" fill="#15803d" />

                {/* Colas */}
                <ellipse cx="120" cy="70" rx="20" ry="34" fill={selectedPlant.strain.colorTheme || '#15803d'} opacity="0.95" />
                <ellipse cx="120" cy="80" rx="22" ry="20" fill="#14532d" />
                <circle cx="120" cy="45" r="9" fill="#22c55e" />

                {/* Pistils */}
                <path d="M 112 58 Q 102 44 106 36" stroke="#f97316" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M 128 58 Q 138 44 134 36" stroke="#ea580c" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M 110 78 Q 98 70 95 62" stroke="#f59e0b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                <path d="M 130 78 Q 142 70 145 62" stroke="#f97316" strokeWidth="1.8" fill="none" strokeLinecap="round" />

                {/* Trichome sparkles */}
                <circle cx="116" cy="62" r="2" fill="#fff" className="animate-trichome-sparkle" />
                <circle cx="125" cy="72" r="2" fill="#fef08a" className="animate-trichome-sparkle" />
                <circle cx="120" cy="50" r="2" fill="#fff" className="animate-trichome-sparkle" />
              </svg>
            </div>

            {/* Data & Metrics */}
            <div className="w-full md:w-1/2 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px]">THC Estimado</span>
                  <span className="text-sm font-bold text-white">~{selectedPlant.strain.thcPercent}%</span>
                </div>
                <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px]">Humedad Sustrato</span>
                  <span className="text-sm font-bold text-cyan-300">{selectedPlant.soilMoisture}%</span>
                </div>
                <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px]">Tricomas Lechosos</span>
                  <span className="text-sm font-bold text-emerald-300">{selectedPlant.trichomeMaturity.milky}%</span>
                </div>
                <div className="bg-neutral-900 p-2.5 rounded-xl border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px]">Rendimiento Seco</span>
                  <span className="text-sm font-bold text-amber-300">~{selectedPlant.estimatedDryYieldGrams}g</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => waterPlant()}
                  className="flex-1 py-2 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Droplet className="w-3.5 h-3.5 fill-current" />
                  <span>Regar Esta Planta</span>
                </button>
                <button
                  onClick={() => feedNutrients()}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Abonar N-P-K</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
