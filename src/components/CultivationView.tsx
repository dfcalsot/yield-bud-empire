import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { PlantVisualizer } from './PlantVisualizer';
import { IndoorRoomVisualizer } from './IndoorRoomVisualizer';
import { 
  Droplet, 
  Sun, 
  Thermometer, 
  Wind, 
  Flame, 
  Scissors, 
  Sparkles, 
  Activity, 
  Layers, 
  Sprout, 
  CheckCircle2, 
  Zap,
  Info,
  Gauge,
  Sliders,
  Dna,
  FlaskConical,
  Crown,
  Eye,
  Grid3X3,
  Maximize2
} from 'lucide-react';
import { Strain, GrowRoomId } from '../types';
import { GROW_ROOMS_CONFIG } from '../data/initialData';
import { CultivationScene } from './CultivationScene';
import { X as CloseIcon } from 'lucide-react';

export const CultivationView: React.FC = () => {
  const {
    activePlant,
    indoorPlants,
    selectedPlantIndex,
    selectPlant,
    waterAllPlants,
    feedAllPlants,
    harvestAllReadyPlants,
    speedUpIndoorRoom,
    trainIndoorCanopy,
    plantIndoorBatch,
    currentFacility,
    facilities,
    upgradeFacility,
    strains,
    plantNewSeed,
    waterPlant,
    feedNutrients,
    setTemperature,
    setHumidity,
    setPpfd,
    setLightSchedule,
    trainPlant,
    speedUpGrowth,
    harvestPlant,
    floraBalance,
    rawFlowerGrams,
    trimGrams,

    // Rooms, CO2 & Automation
    currentRoom,
    switchGrowRoom,
    co2Ppm,
    setCo2Ppm,
    autoWaterActive,
    toggleAutoWater,
    autoClimateActive,
    toggleAutoClimate,
    calibrateMeter,
    saveCurrentPlantAsMotherOrFather,

    // Nutrients
    nutrientBrands,
    selectedNutrientBrand,
    setSelectedNutrientBrand,
    applyNutrientStage
  } = useGame();

  const [displayMode, setDisplayMode] = useState<'scene' | 'indoor_room' | 'single_detail'>('scene');
  const [showPanel, setShowPanel] = useState(false);
  const [selectedSeedToPlant, setSelectedSeedToPlant] = useState<Strain>(strains[0]);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [showNutrientModal, setShowNutrientModal] = useState(false);

  const renderControls = (inDrawer: boolean) => (
    <div className={inDrawer ? 'space-y-4' : `${displayMode === 'indoor_room' ? 'lg:col-span-4' : 'lg:col-span-5'} space-y-4`}>
          {/* Scientific Meters Card (pH, EC, Lux, PAR, CO2) */}
          {activePlant && (
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200 font-mono">
                    Instrumental Científico en Vivo
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Calibrado Digital
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                {/* pH Meter */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
                  <div className="flex justify-between items-center text-neutral-400 text-[11px]">
                    <span>Sonda de pH</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded ${
                      activePlant.phLevel >= 5.8 && activePlant.phLevel <= 6.5
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {activePlant.phLevel >= 5.8 && activePlant.phLevel <= 6.5 ? 'Óptimo' : 'Desviado'}
                    </span>
                  </div>
                  <div className="text-xl font-bold text-emerald-400">
                    {activePlant.phLevel.toFixed(1)} <span className="text-xs font-normal text-neutral-500">pH</span>
                  </div>
                  <button
                    onClick={() => calibrateMeter('ph')}
                    className="w-full text-[10px] py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded border border-neutral-800 transition cursor-pointer"
                  >
                    Calibrar pH 4.01/7.01
                  </button>
                </div>

                {/* EC / PPM Meter */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
                  <div className="flex justify-between items-center text-neutral-400 text-[11px]">
                    <span>Electroconductividad</span>
                    <span className="text-cyan-400 text-[10px]">PPM ~{Math.round(activePlant.ecLevel * 500)}</span>
                  </div>
                  <div className="text-xl font-bold text-cyan-400">
                    {activePlant.ecLevel.toFixed(1)} <span className="text-xs font-normal text-neutral-500">mS/cm</span>
                  </div>
                  <button
                    onClick={() => calibrateMeter('ec')}
                    className="w-full text-[10px] py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded border border-neutral-800 transition cursor-pointer"
                  >
                    Calibrar 1413 μS
                  </button>
                </div>

                {/* Lux & PAR Meter */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
                  <div className="flex justify-between items-center text-neutral-400 text-[11px]">
                    <span>Sensor Cuántico PAR</span>
                    <span className="text-amber-400 text-[10px]">Apogee ePAR</span>
                  </div>
                  <div className="text-xl font-bold text-amber-400">
                    {activePlant.ppfdLightIntensity} <span className="text-xs font-normal text-neutral-500">μmol/m²s</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 flex justify-between">
                    <span>Lúmenes Lux:</span>
                    <strong className="text-neutral-200">{(activePlant.luxLumens || Math.round(activePlant.ppfdLightIntensity * 54)).toLocaleString()} lx</strong>
                  </div>
                </div>

                {/* CO2 NDIR Sensor */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
                  <div className="flex justify-between items-center text-neutral-400 text-[11px]">
                    <span>Inyección de CO2</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded ${
                      (activePlant.co2Ppm || co2Ppm) >= 1100 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {(activePlant.co2Ppm || co2Ppm) >= 1100 ? '+35% Boost' : 'Base'}
                    </span>
                  </div>
                  <div className="text-xl font-bold text-emerald-300">
                    {activePlant.co2Ppm || co2Ppm} <span className="text-xs font-normal text-neutral-500">PPM</span>
                  </div>
                  <input
                    type="range"
                    min={400}
                    max={1500}
                    step={50}
                    value={activePlant.co2Ppm || co2Ppm}
                    onChange={(e) => setCo2Ppm(parseInt(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                </div>
              </div>

              {/* Automation Toggles */}
              <div className="pt-2 border-t border-neutral-800/80 grid grid-cols-2 gap-2">
                <button
                  onClick={toggleAutoWater}
                  className={`py-2 px-2.5 rounded-xl border text-[11px] font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    autoWaterActive
                      ? 'bg-blue-500/20 border-blue-500/60 text-blue-300 font-bold'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Droplet className="w-3.5 h-3.5 text-blue-400" />
                  <span>Riego: {autoWaterActive ? 'AUTOPOT ON' : 'MANUAL'}</span>
                </button>

                <button
                  onClick={toggleAutoClimate}
                  className={`py-2 px-2.5 rounded-xl border text-[11px] font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    autoClimateActive
                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 font-bold'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Clima: {autoClimateActive ? 'PID AUTO' : 'MANUAL'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Microclimate Sliders */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Control Climático & VPD
                </h3>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">
                Sala: {currentRoom}
              </span>
            </div>

            {activePlant ? (
              <div className="space-y-4">
                {/* Temperature Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400 flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                      Temperatura Ambiente
                    </span>
                    <span className="font-mono text-amber-300 font-bold">{activePlant.temperatureC}°C</span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={32}
                    step={0.5}
                    value={activePlant.temperatureC}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                    <span>18°C (Frío)</span>
                    <span>Óptimo: 23-26°C</span>
                    <span>32°C (Estrés Térmico)</span>
                  </div>
                </div>

                {/* Relative Humidity Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400 flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-cyan-400" />
                      Humedad Relativa (RH)
                    </span>
                    <span className="font-mono text-cyan-300 font-bold">{activePlant.relativeHumidity}%</span>
                  </div>
                  <input
                    type="range"
                    min={35}
                    max={80}
                    step={1}
                    value={activePlant.relativeHumidity}
                    onChange={(e) => setHumidity(parseInt(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                    <span>35% (Seco)</span>
                    <span>Óptimo: 50-60%</span>
                    <span>80% (Riesgo Moho)</span>
                  </div>
                </div>

                {/* VPD Vapor Pressure Deficit Explanation & Status */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300 font-semibold flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-emerald-400" />
                      Déficit de Presión de Vapor (VPD)
                    </span>
                    <span className={`font-mono font-bold ${
                      activePlant.vpdKpa >= 0.8 && activePlant.vpdKpa <= 1.4 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {activePlant.vpdKpa} kPa
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    {activePlant.vpdKpa >= 0.8 && activePlant.vpdKpa <= 1.4
                      ? 'Zona de confort transpiratorio perfecta. Las estomas absorben CO2 y transpiran a tasa óptima.'
                      : activePlant.vpdKpa < 0.8
                      ? 'VPD bajo: Transpiración lenta. Aumenta la temperatura o reduce la humedad ambiental.'
                      : 'VPD alto: La planta transpira en exceso para no marchitarse. Aumenta la humedad.'}
                  </p>
                </div>

                {/* LED Light Intensity Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      Intensidad Cuántica (PPFD)
                    </span>
                    <span className="font-mono text-amber-300 font-bold">{activePlant.ppfdLightIntensity} μmol/m²s</span>
                  </div>
                  <input
                    type="range"
                    min={300}
                    max={1100}
                    step={50}
                    value={activePlant.ppfdLightIntensity}
                    onChange={(e) => setPpfd(parseInt(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                    <span>300 (Plántula)</span>
                    <span>700 (Vegetativo)</span>
                    <span>1000+ (Floración Máxima)</span>
                  </div>
                </div>

                {/* Photoperiod Schedule Selection */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs text-neutral-400 block">Fotoperiodo (Horas Luz / Oscuridad)</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['18/6', '12/12', '24/0'] as const).map((sched) => (
                      <button
                        key={sched}
                        onClick={() => setLightSchedule(sched)}
                        className={`py-1.5 text-xs font-mono rounded-lg border transition cursor-pointer ${
                          activePlant.lightSchedule === sched
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        {sched} {sched === '18/6' ? '(Veg)' : (sched === '12/12' ? '(Flor)' : '(Auto)')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-neutral-500 text-xs">
                Inicia un ciclo de cultivo para controlar los parámetros de clima.
              </div>
            )}
          </div>

          {/* Terpene and Strain Profile Card */}
          {activePlant && (
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300 font-mono uppercase">
                  Perfil de Terpenos Activo
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  THC: {activePlant.strain.thcPercentage}% | CBD: {activePlant.strain.cbdPercentage}%
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-neutral-400">Mirceno (Efecto sedante / herbal)</span>
                    <span className="font-mono text-emerald-400">{activePlant.strain.terpenes.myrcene}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, activePlant.strain.terpenes.myrcene * 60)}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-neutral-400">Limoneno (Cítrico / elevador)</span>
                    <span className="font-mono text-amber-400">{activePlant.strain.terpenes.limonene}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, activePlant.strain.terpenes.limonene * 60)}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-neutral-400">Cariofileno (Especiado / receptor CB2)</span>
                    <span className="font-mono text-purple-400">{activePlant.strain.terpenes.caryophyllene}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-400 rounded-full" style={{ width: `${Math.min(100, activePlant.strain.terpenes.caryophyllene * 60)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
    </div>
  );

  return (
    <div className="space-y-6">
      {displayMode !== 'scene' && (<>
      {/* Top Banner: Facility info & Inventory Overview */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center overflow-hidden">
            <img 
              src={currentFacility.image} 
              alt={currentFacility.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-medium">
                NIVEL {currentFacility.tier}: F2P & INDUSTRIAL
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                Bono Ambiental: +{Math.round((currentFacility.environmentBonus - 1) * 100)}%
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white mt-0.5">
              {currentFacility.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Inventory summary pill */}
          <div className="bg-neutral-950/80 border border-neutral-800 px-3 py-1.5 rounded-xl flex items-center gap-3 text-xs font-mono">
            <div>
              <span className="text-neutral-500 block text-[10px]">FLOR CRUDA</span>
              <span className="text-emerald-400 font-bold">{rawFlowerGrams}g</span>
            </div>
            <div className="w-px h-6 bg-neutral-800"></div>
            <div>
              <span className="text-neutral-500 block text-[10px]">BIOMASA TRIM</span>
              <span className="text-amber-400 font-bold">{trimGrams}g</span>
            </div>
          </div>

          <button
            onClick={() => setShowFacilityModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-medium text-neutral-200 rounded-xl transition cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cambiar Instalación</span>
          </button>
        </div>
      </div>

      {/* Grow Rooms Selection Bar */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3 sm:p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300 font-mono">
              Salas & Cuartos de Cultivo Especializados
            </h3>
          </div>
          <span className="text-[11px] font-mono text-neutral-400">
            Microclima fotoperiódico específico
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {GROW_ROOMS_CONFIG.map(room => {
            const isSelected = currentRoom === room.id;
            return (
              <button
                key={room.id}
                onClick={() => switchGrowRoom(room.id)}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between space-y-1.5 ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500/40'
                    : 'bg-neutral-950/80 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5 truncate">
                    {room.name}
                  </span>
                  {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>}
                </div>
                <div className="text-[10px] sm:text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
                  <span>{room.targetTempC}°C</span>
                  <span>•</span>
                  <span>{room.targetRhPercent}% RH</span>
                  <span>•</span>
                  <span>{room.recommendedLightSchedule}</span>
                </div>
                <div className="text-[10px] text-neutral-500 truncate">
                  {room.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* View Mode Switcher: Sala Indoor (3 Filas x 10 en Pares de 2) vs Detalle Macro */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-2.5 sm:p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDisplayMode('scene')}
            className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer text-neutral-400 hover:text-white hover:bg-neutral-800/60"
          >
            <Eye className="w-4 h-4" />
            <span>Escena de cultivo</span>
          </button>

          <button
            onClick={() => setDisplayMode('indoor_room')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              displayMode === 'indoor_room'
                ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            <span>Sala Indoor 30 Plantas (3 Filas × 10 en Pares de 2)</span>
          </button>

          <button
            onClick={() => setDisplayMode('single_detail')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              displayMode === 'single_detail'
                ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Microscopio / Detalle Planta #{selectedPlantIndex + 1}</span>
          </button>
        </div>

        {/* Fast Room Quick Action Pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={waterAllPlants}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/40 transition text-[11px] font-mono flex items-center gap-1.5 cursor-pointer"
            title="Regar simultáneamente las 30 plantas de la sala"
          >
            <Droplet className="w-3.5 h-3.5 text-cyan-400" />
            <span>Riego Sala (30 Plantas)</span>
          </button>

          <button
            onClick={feedAllPlants}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40 transition text-[11px] font-mono flex items-center gap-1.5 cursor-pointer"
            title="Fertirriego N-P-K para la canopia completa"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Abonar Sala</span>
          </button>

          <button
            onClick={harvestAllReadyPlants}
            className="px-2.5 py-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 hover:bg-amber-900/40 transition text-[11px] font-mono flex items-center gap-1.5 cursor-pointer"
            title="Cosechar todas las plantas maduras de la sala"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Cosechar Maduras</span>
          </button>
        </div>
      </div>

      </>)}

      {/* Main Grow Layout: Plant / Room Visualizer + Microclimate Controls */}
      {displayMode === 'scene' ? (
        <CultivationScene
          onOpenSeedModal={() => setShowSeedModal(true)}
          onOpenFacility={() => setShowFacilityModal(true)}
          onOpenNutrients={() => setShowNutrientModal(true)}
          onOpenPanel={() => setShowPanel(true)}
          onShowRoom={() => setDisplayMode('indoor_room')}
        />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Visualizer + Quick Actions (7 or 8 Cols) */}
        <div className={`${displayMode === 'indoor_room' ? 'lg:col-span-8' : 'lg:col-span-7'} space-y-4`}>
          {displayMode === 'indoor_room' ? (
            <IndoorRoomVisualizer />
          ) : (
            <PlantVisualizer plant={activePlant} facilityTier={currentFacility.tier} />
          )}

          {/* Plant Actions Toolbar */}
          {activePlant ? (
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
                  Intervenciones de Cultivo
                </span>
                <span className="text-[11px] text-neutral-400">
                  {activePlant.stage === 'ready_harvest' ? '¡Lista para corte!' : 'Ciclo en curso'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Riego */}
                <button
                  onClick={waterPlant}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-cyan-500/40 hover:bg-cyan-950/10 transition group cursor-pointer"
                >
                  <Droplet className="w-5 h-5 text-cyan-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-neutral-200">Regar Sustrato</span>
                  <span className="text-[10px] text-neutral-400 font-mono">Hum: {activePlant.soilMoisture}%</span>
                </button>

                {/* Nutrientes EC */}
                <button
                  onClick={feedNutrients}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-emerald-500/40 hover:bg-emerald-950/10 transition group cursor-pointer"
                >
                  <Activity className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-neutral-200">Abonar N-P-K</span>
                  <span className="text-[10px] text-neutral-400 font-mono">EC: {activePlant.ecLevel} mS</span>
                </button>

                {/* Poda / LST */}
                <button
                  onClick={() => trainPlant('Topping & LST')}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-purple-500/40 hover:bg-purple-950/10 transition group cursor-pointer"
                >
                  <Scissors className="w-5 h-5 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-neutral-200">Entrenamiento LST</span>
                  <span className="text-[10px] text-purple-400 font-mono">+12% Rendimiento</span>
                </button>

                {/* Acelerar Quemando $FLORA */}
                <button
                  onClick={speedUpGrowth}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 hover:bg-amber-950/40 hover:border-amber-400 transition group cursor-pointer text-amber-300"
                >
                  <div className="flex items-center gap-1">
                    <Flame className="w-5 h-5 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                    <Zap className="w-3.5 h-3.5 text-amber-300 mb-1" />
                  </div>
                  <span className="text-xs font-bold text-amber-200">Acelerar Ciclo</span>
                  <span className="text-[10px] font-mono text-amber-400 font-semibold">Quema 25 $FLORA</span>
                </button>
              </div>

              {/* Secondary Botanical Tools */}
              <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => setShowNutrientModal(true)}
                  className="py-2 px-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-emerald-500/40 text-neutral-300 text-xs font-mono transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tablas de Nutrición ({activePlant.nutrientBrand || selectedNutrientBrand})</span>
                </button>

                <button
                  onClick={() => saveCurrentPlantAsMotherOrFather('Madre (Esquejes / Clones)')}
                  className="py-2 px-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-purple-500/40 text-neutral-300 text-xs font-mono transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5 text-purple-400" />
                  <span>Guardar como Madre Donante</span>
                </button>
              </div>

              {/* Harvest button full-width if ready or eligible */}
              {activePlant.progressPercent >= 80 && (
                <button
                  onClick={harvestPlant}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-neutral-950 font-bold text-sm shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {activePlant.stage === 'ready_harvest' 
                      ? `Cosechar Flores y Tricomas (~${activePlant.estimatedDryYieldGrams}g)` 
                      : `Cosecha Temprana (~${Math.round(activePlant.estimatedDryYieldGrams * 0.75)}g)`}
                  </span>
                </button>
              )}
            </div>
          ) : (
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 text-center space-y-4">
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-bold text-white mb-1">Comenzar Nuevo Cultivo</h3>
                <p className="text-xs text-neutral-400 mb-4">
                  Elige una genética de tu banco de semillas para iniciar el proceso de germinación y control microclimático.
                </p>
                <button
                  onClick={() => setShowSeedModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs shadow-md transition cursor-pointer inline-flex items-center gap-2"
                >
                  <Sprout className="w-4 h-4" />
                  <span>Seleccionar Semilla ({strains.length} disponibles)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {renderControls(false)}
      </div>
      )}

      {/* Slide-over with the full climate / instrument panel (scene mode) */}
      {displayMode === 'scene' && showPanel && (
        <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-label="Panel de control">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowPanel(false)} />
          <aside className="relative w-full sm:w-[540px] h-full overflow-y-auto bg-neutral-950/95 border-l border-emerald-400/30 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-sm font-bold tracking-[0.14em] uppercase text-emerald-200">Panel de control</h3>
              <button onClick={() => setShowPanel(false)} aria-label="Cerrar panel" className="p-2 rounded-lg border border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"><CloseIcon className="w-4 h-4" /></button>
            </div>
            {renderControls(true)}
          </aside>
        </div>
      )}

      {/* Seed Selection Modal */}
      {showSeedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Banco de Semillas Genéticas</h3>
                <p className="text-xs text-neutral-400">Elige la variedad que deseas germinar en la carpa de cultivo.</p>
              </div>
              <button
                onClick={() => setShowSeedModal(false)}
                className="text-neutral-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {strains.map((strain) => (
                <div
                  key={strain.id}
                  onClick={() => setSelectedSeedToPlant(strain)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                    selectedSeedToPlant.id === strain.id
                      ? 'bg-emerald-950/40 border-emerald-500'
                      : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: strain.colorTheme }}></span>
                      <h4 className="text-sm font-bold text-white">{strain.name}</h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-neutral-800 text-neutral-300 rounded">
                        {strain.type}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                        {strain.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 max-w-md">{strain.description}</p>
                    <div className="text-[11px] font-mono text-neutral-400 flex gap-3">
                      <span>THC: <strong className="text-emerald-400">{strain.thcPercentage}%</strong></span>
                      <span>CBD: <strong className="text-cyan-400">{strain.cbdPercentage}%</strong></span>
                      <span>Resina Rosin: <strong className="text-amber-400">x{strain.resinYieldMultiplier}</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      plantNewSeed(strain);
                      setShowSeedModal(false);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg transition whitespace-nowrap cursor-pointer shadow"
                  >
                    Plantar Semilla
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Facility Upgrade Modal */}
      {showFacilityModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Instalaciones de Cultivo</h3>
                <p className="text-xs text-neutral-400">Evoluciona desde tu carpa casera F2P a invernaderos y laboratorios comerciales.</p>
              </div>
              <button
                onClick={() => setShowFacilityModal(false)}
                className="text-neutral-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {facilities.map((fac) => {
                const isCurrent = currentFacility.id === fac.id;
                return (
                  <div
                    key={fac.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between space-y-3 ${
                      isCurrent
                        ? 'bg-emerald-950/30 border-emerald-500'
                        : (fac.unlocked ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-950/60 border-neutral-800 opacity-80')
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="h-28 w-full rounded-lg overflow-hidden border border-neutral-800">
                        <img src={fac.image} alt={fac.name} className="w-full h-full object-cover" />
                      </div>
                      <h4 className="text-xs font-bold text-white leading-snug">{fac.name}</h4>
                      <p className="text-[11px] text-neutral-400 line-clamp-2">{fac.description}</p>
                      <div className="text-[11px] font-mono text-emerald-400">
                        Bono: +{Math.round((fac.environmentBonus - 1) * 100)}% velocidad
                      </div>
                    </div>

                    <div>
                      {isCurrent ? (
                        <div className="text-center py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-mono flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Instalación Actual
                        </div>
                      ) : fac.unlocked ? (
                        <button
                          onClick={() => {
                            upgradeFacility(fac.id);
                            setShowFacilityModal(false);
                          }}
                          className="w-full py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium transition cursor-pointer"
                        >
                          Equipar
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            upgradeFacility(fac.id);
                            setShowFacilityModal(false);
                          }}
                          disabled={floraBalance < fac.costFlora}
                          className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          <Flame className="w-3.5 h-3.5 text-neutral-950" />
                          <span>Desbloquear ({fac.costFlora} $FLORA)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Nutrient Feeding Schedule Modal */}
      {showNutrientModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <FlaskConical className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-lg font-bold text-white">Tablas y Marcas de Nutrición</h3>
                  <p className="text-xs text-neutral-400">Dosificación científica para cada fase desde plántula hasta lavado de raíces.</p>
                </div>
              </div>
              <button
                onClick={() => setShowNutrientModal(false)}
                className="text-neutral-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            {/* Brand selector */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {nutrientBrands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => setSelectedNutrientBrand(brand.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap border transition cursor-pointer ${
                    selectedNutrientBrand === brand.id
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {brand.name} ({brand.category})
                </button>
              ))}
            </div>

            {/* Stages table for active brand */}
            {(() => {
              const activeBrandObj = nutrientBrands.find(b => b.id === selectedNutrientBrand) || nutrientBrands[0];
              if (!activeBrandObj) return null;

              return (
                <div className="space-y-3">
                  <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-white font-bold">{activeBrandObj.name}</span>
                      <span className="text-neutral-400 ml-2">Línea: {activeBrandObj.line}</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      pH Recomendado: {typeof activeBrandObj.recommendedPhRange === 'string' ? activeBrandObj.recommendedPhRange : '5.8 - 6.4'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {activeBrandObj.stages.map((stg, stgIdx) => (
                      <div
                        key={stg.stageName}
                        className="bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white font-mono">{stg.stageName}</span>
                            {stg.phaseCode && <span className="text-[10px] text-neutral-400 font-mono">({stg.phaseCode})</span>}
                            <span className="text-[10px] font-mono bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 px-1.5 py-0.2 rounded">
                              EC: {stg.targetEc} mS
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-400 font-mono flex flex-wrap gap-x-3 gap-y-0.5">
                            {(stg.dosageMlPerLiter || []).map((dose, dIdx) => (
                              <span key={dIdx}>
                                {dose.productName}: <strong className="text-emerald-400">{dose.mlPerL} ml/L</strong>
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            applyNutrientStage(stgIdx);
                            setShowNutrientModal(false);
                          }}
                          disabled={!activePlant}
                          className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg transition whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow"
                        >
                          Aplicar Dosis
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
