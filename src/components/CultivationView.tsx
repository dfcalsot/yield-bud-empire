import { TechniqueMenu } from './cultivo/TechniqueMenu';
import { FacilityArt } from './art/GameArt';
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
import { LeftRail, RightRail } from './cultivo/CultivoRails';
import { FacilityPanel } from './hud/FacilityPanel';
import { X as CloseIcon } from 'lucide-react';
import { t } from '../i18n';

export const CultivationView: React.FC<{ onOpenMarket?: (cat?: string) => void; onOpenPlanet?: () => void }> = ({ onOpenMarket, onOpenPlanet }) => {
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
  const [techOpen, setTechOpen] = useState(false);
  const [careOpen, setCareOpen] = useState(false);
  const [selectedSeedToPlant, setSelectedSeedToPlant] = useState<Strain>(strains[0]);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  const [showNutrientModal, setShowNutrientModal] = useState(false);

  const renderControls = (inDrawer: boolean) => (
    <div className={inDrawer ? 'space-y-4' : `${displayMode === 'indoor_room' ? 'lg:col-span-4' : 'lg:col-span-5'} space-y-4`}>
          {/* Scientific Meters Card (pH, EC, Lux, PAR, CO2) */}
          {activePlant && (
            <div className="hud-panel p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200 font-mono">
                    {t('Instrumental Científico en Vivo')}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {t('Calibrado Digital')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                {/* pH Meter */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
                  <div className="flex justify-between items-center text-neutral-400 text-[11px]">
                    <span>{t('Sonda de pH')}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded ${
                      activePlant.phLevel >= 5.8 && activePlant.phLevel <= 6.5
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}>
                      {activePlant.phLevel >= 5.8 && activePlant.phLevel <= 6.5 ? t('Óptimo') : t('Desviado')}
                    </span>
                  </div>
                  <div className="text-xl font-bold text-emerald-400">
                    {activePlant.phLevel.toFixed(1)} <span className="text-xs font-normal text-neutral-500">pH</span>
                  </div>
                  <button
                    onClick={() => calibrateMeter('ph')}
                    className="w-full text-[10px] py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded border border-neutral-800 transition cursor-pointer"
                  >
                    {t('Calibrar pH 4.01/7.01')}
                  </button>
                </div>

                {/* EC / PPM Meter */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
                  <div className="flex justify-between items-center text-neutral-400 text-[11px]">
                    <span>{t('Electroconductividad')}</span>
                    <span className="text-cyan-400 text-[10px]">{t('PPM ~{v0}', { v0: Math.round(activePlant.ecLevel * 500) })}</span>
                  </div>
                  <div className="text-xl font-bold text-cyan-400">
                    {activePlant.ecLevel.toFixed(1)} <span className="text-xs font-normal text-neutral-500">mS/cm</span>
                  </div>
                  <button
                    onClick={() => calibrateMeter('ec')}
                    className="w-full text-[10px] py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded border border-neutral-800 transition cursor-pointer"
                  >
                    {t('Calibrar 1413 μS')}
                  </button>
                </div>

                {/* Lux & PAR Meter */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
                  <div className="flex justify-between items-center text-neutral-400 text-[11px]">
                    <span>{t('Sensor Cuántico PAR')}</span>
                    <span className="text-amber-400 text-[10px]">{t('Apogee ePAR')}</span>
                  </div>
                  <div className="text-xl font-bold text-amber-400">
                    {activePlant.ppfdLightIntensity} <span className="text-xs font-normal text-neutral-500">μmol/m²s</span>
                  </div>
                  <div className="text-[10px] text-neutral-400 flex justify-between">
                    <span>{t('Lúmenes Lux:')}</span>
                    <strong className="text-neutral-200">{(activePlant.luxLumens || Math.round(activePlant.ppfdLightIntensity * 54)).toLocaleString()} lx</strong>
                  </div>
                </div>

                {/* CO2 NDIR Sensor */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
                  <div className="flex justify-between items-center text-neutral-400 text-[11px]">
                    <span>{t('Inyección de CO2')}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded ${
                      (activePlant.co2Ppm || co2Ppm) >= 1100 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {(activePlant.co2Ppm || co2Ppm) >= 1100 ? t('+35% Boost') : t('Base')}
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
                  <span>{t('Riego: {v0}', { v0: autoWaterActive ? t('AUTOPOT ON') : 'MANUAL' })}</span>
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
                  <span>{t('Clima: {v0}', { v0: autoClimateActive ? t('PID AUTO') : 'MANUAL' })}</span>
                </button>
              </div>
            </div>
          )}

          {/* Microclimate Sliders */}
          <div className="hud-panel p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  {t('Control Climático & VPD')}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-neutral-400">
                {t('Sala: {currentRoom}', { currentRoom })}
              </span>
            </div>

            {activePlant ? (
              <div className="space-y-4">
                {/* Temperature Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400 flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                      {t('Temperatura Ambiente')}
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
                    <span>{t('18°C (Frío)')}</span>
                    <span>{t('Óptimo: 23-26°C')}</span>
                    <span>{t('32°C (Estrés Térmico)')}</span>
                  </div>
                </div>

                {/* Relative Humidity Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400 flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-cyan-400" />
                      {t('Humedad Relativa (RH)')}
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
                    <span>{t('35% (Seco)')}</span>
                    <span>{t('Óptimo: 50-60%')}</span>
                    <span>{t('80% (Riesgo Moho)')}</span>
                  </div>
                </div>

                {/* VPD Vapor Pressure Deficit Explanation & Status */}
                <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300 font-semibold flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-emerald-400" />
                      {t('Déficit de Presión de Vapor (VPD)')}
                    </span>
                    <span className={`font-mono font-bold ${
                      activePlant.vpdKpa >= 0.8 && activePlant.vpdKpa <= 1.4 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {activePlant.vpdKpa} kPa
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    {activePlant.vpdKpa >= 0.8 && activePlant.vpdKpa <= 1.4
                      ? t('Zona de confort transpiratorio perfecta. Las estomas absorben CO2 y transpiran a tasa óptima.')
                      : activePlant.vpdKpa < 0.8
                      ? t('VPD bajo: Transpiración lenta. Aumenta la temperatura o reduce la humedad ambiental.')
                      : t('VPD alto: La planta transpira en exceso para no marchitarse. Aumenta la humedad.')}
                  </p>
                </div>

                {/* LED Light Intensity Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400 flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      {t('Intensidad Cuántica (PPFD)')}
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
                    <span>{t('300 (Plántula)')}</span>
                    <span>{t('700 (Vegetativo)')}</span>
                    <span>{t('1000+ (Floración Máxima)')}</span>
                  </div>
                </div>

                {/* Photoperiod Schedule Selection */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs text-neutral-400 block">{t('Fotoperiodo (Horas Luz / Oscuridad)')}</span>
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
                {t('Inicia un ciclo de cultivo para controlar los parámetros de clima.')}
              </div>
            )}
          </div>

          {/* Terpene and Strain Profile Card */}
          {activePlant && (
            <div className="hud-panel p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300 font-mono uppercase">
                  {t('Perfil de Terpenos Activo')}
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold">
                  THC: {activePlant.strain.thcPercentage}% | CBD: {activePlant.strain.cbdPercentage}%
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-neutral-400">{t('Mirceno (Efecto sedante / herbal)')}</span>
                    <span className="font-mono text-emerald-400">{activePlant.strain.terpenes.myrcene}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, activePlant.strain.terpenes.myrcene * 60)}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-neutral-400">{t('Limoneno (Cítrico / elevador)')}</span>
                    <span className="font-mono text-amber-400">{activePlant.strain.terpenes.limonene}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, activePlant.strain.terpenes.limonene * 60)}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-neutral-400">{t('Cariofileno (Especiado / receptor CB2)')}</span>
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

      {/* Cultivo panel: left rail · the stage (scene / Sala / lupa) · right rail */}
      <div className="cv-shell">
      <LeftRail onOpenFacility={() => setShowFacilityModal(true)} onOpenMarket={onOpenMarket} onOpenSeedModal={() => setShowSeedModal(true)} />
      <div className="cv-main space-y-3">
      <div className="gh-frame cv-modebar" role="tablist" aria-label={t('Modo de vista')}>
        {([['scene', t('Escena'), '', Eye], ['indoor_room', t('Sala'), ` · ${indoorPlants.length} ${indoorPlants.length === 1 ? t('planta') : t('plantas')}`, Grid3X3], ['single_detail', t('Lupa'), t(' · planta #{v0}', { v0: selectedPlantIndex + 1 }), FlaskConical]] as const).map(([id, label, extra, Icon]) => (
          <button key={id} type="button" role="tab" aria-selected={displayMode === id} onClick={() => setDisplayMode(id)} className={`cv-mode ${displayMode === id ? 'is-on' : ''}`} data-mode={id}><Icon className="w-4 h-4" />{label}<span className="hidden sm:inline">{extra}</span></button>
        ))}
      </div>
      {displayMode === 'scene' ? (
        <CultivationScene
          onOpenSeedModal={() => setShowSeedModal(true)}
          onOpenNutrients={() => setShowNutrientModal(true)}
          onShowRoom={() => setDisplayMode('indoor_room')}
          onOpenCare={() => setCareOpen(true)}
        />
      ) : (
      <div className="space-y-4">
        {/* Visualizer + quick actions (the instruments are in the right rail and in the Panel drawer) */}
        <div className="space-y-4">
          {displayMode === 'indoor_room' ? (
            <IndoorRoomVisualizer onOpenFacility={() => setShowFacilityModal(true)} />
          ) : (
            <PlantVisualizer plant={activePlant} facilityTier={currentFacility.tier} />
          )}

          {/* Plant Actions Toolbar */}
          {activePlant ? (
            <div className="hud-panel p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider font-mono">
                  {t('Intervenciones de Cultivo')}
                </span>
                <span className="text-[11px] text-neutral-400">
                  {activePlant.stage === 'ready_harvest' ? t('¡Lista para corte!') : t('Ciclo en curso')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* Riego */}
                <button
                  onClick={waterPlant}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-cyan-500/40 hover:bg-cyan-950/10 transition group cursor-pointer"
                >
                  <Droplet className="w-5 h-5 text-cyan-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-neutral-200">{t('Regar Sustrato')}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">{t('Hum: {soilMoisture}%', { soilMoisture: activePlant.soilMoisture })}</span>
                </button>

                {/* Nutrientes EC */}
                <button
                  onClick={feedNutrients}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-emerald-500/40 hover:bg-emerald-950/10 transition group cursor-pointer"
                >
                  <Activity className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-neutral-200">{t('Abonar N-P-K')}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">EC: {activePlant.ecLevel} mS</span>
                </button>

                {/* Poda / LST */}
                <button
                  onClick={() => setTechOpen(true)}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-purple-500/40 hover:bg-purple-950/10 transition group cursor-pointer"
                >
                  <Scissors className="w-5 h-5 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-neutral-200">{t('Técnicas de entrenamiento')}</span>
                  <span className="text-[10px] text-purple-400 font-mono">{t('según la fase')}</span>
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
                  <span className="text-xs font-bold text-amber-200">{t('Acelerar Ciclo')}</span>
                  <span className="text-[10px] font-mono text-amber-400 font-semibold">{t('Quema 25 $FLORA')}</span>
                </button>
              </div>

              {/* Secondary Botanical Tools */}
              <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  onClick={() => setShowNutrientModal(true)}
                  className="py-2 px-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-emerald-500/40 text-neutral-300 text-xs font-mono transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('Tablas de Nutrición ({v0})', { v0: activePlant.nutrientBrand || selectedNutrientBrand })}</span>
                </button>

                <button
                  onClick={() => saveCurrentPlantAsMotherOrFather('Madre (Esquejes / Clones)')}
                  className="py-2 px-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-purple-500/40 text-neutral-300 text-xs font-mono transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t('Guardar como Madre Donante')}</span>
                </button>
              </div>

              {/* Harvest button full-width if ready or eligible */}
              {activePlant.stage === 'ready_harvest' && (
                <button
                  onClick={harvestPlant}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-neutral-950 font-bold text-sm shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {t('Cosechar Flores y Tricomas (~{estimatedDryYieldGrams}g)', { estimatedDryYieldGrams: activePlant.estimatedDryYieldGrams })}
                  </span>
                </button>
              )}
            </div>
          ) : (
            <div className="hud-panel p-6 text-center space-y-4">
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-bold text-white mb-1">{t('Comenzar Nuevo Cultivo')}</h3>
                <p className="text-xs text-neutral-400 mb-4">
                  {t('Elige una genética de tu banco de semillas para iniciar el proceso de germinación y control microclimático.')}
                </p>
                <button
                  onClick={() => setShowSeedModal(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs shadow-md transition cursor-pointer inline-flex items-center gap-2"
                >
                  <Sprout className="w-4 h-4" />
                  <span>{t('Seleccionar Semilla ({length} disponibles)', { length: strains.length })}</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
      )}
      </div>
      <RightRail
        onShowRoom={() => setDisplayMode('indoor_room')}
        onOpenPanel={() => setShowPanel(true)}
        onOpenPlanet={onOpenPlanet}
        onOpenMarket={onOpenMarket}
        careOpen={careOpen}
        setCareOpen={setCareOpen}
      />
      </div>

      {/* Slide-over with the full climate / instrument panel (scene mode) */}
      {showPanel && (
        <div className="fixed inset-0 z-[70] flex justify-end" role="dialog" aria-label={t('Panel de control')}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowPanel(false)} />
          <aside className="relative w-full sm:w-[540px] h-full overflow-y-auto bg-neutral-950/95 border-l border-emerald-400/30 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-sm font-bold tracking-[0.14em] uppercase text-emerald-200">{t('Panel de control')}</h3>
              <button onClick={() => setShowPanel(false)} aria-label={t('Cerrar panel')} className="p-2 rounded-lg border border-neutral-700 text-neutral-300 hover:text-white cursor-pointer"><CloseIcon className="w-4 h-4" /></button>
            </div>
            {renderControls(true)}
          </aside>
        </div>
      )}

      {/* Seed Selection Modal */}
      {showSeedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="hud-panel max-w-xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">{t('Banco de Semillas Genéticas')}</h3>
                <p className="text-xs text-neutral-400">{t('Elige la variedad que deseas germinar en la carpa de cultivo.')}</p>
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
                      <h4 className="text-sm font-bold text-white">{t(strain.name)}</h4>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-neutral-800 text-neutral-300 rounded">
                        {t(strain.type)}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded">
                        {t(strain.difficulty)}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 max-w-md">{t(strain.description)}</p>
                    <div className="text-[11px] font-mono text-neutral-400 flex gap-3">
                      <span>THC: <strong className="text-emerald-400">{strain.thcPercentage}%</strong></span>
                      <span>CBD: <strong className="text-cyan-400">{strain.cbdPercentage}%</strong></span>
                      <span>{t('Resina Rosin:')}{' '}<strong className="text-amber-400">x{strain.resinYieldMultiplier}</strong></span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      plantNewSeed(strain);
                      setShowSeedModal(false);
                    }}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg transition whitespace-nowrap cursor-pointer shadow"
                  >
                    {t('Plantar Semilla')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Facility ladder: build (real time + $FLORA), speed up (capped) */}
      {showFacilityModal && <FacilityPanel onClose={() => setShowFacilityModal(false)} />}
      {techOpen && activePlant && <TechniqueMenu plant={activePlant} onClose={() => setTechOpen(false)} />}

      {/* Nutrient Feeding Schedule Modal */}
      {showNutrientModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="hud-panel max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <FlaskConical className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-lg font-bold text-white">{t('Tablas y Marcas de Nutrición')}</h3>
                  <p className="text-xs text-neutral-400">{t('Dosificación científica para cada fase desde plántula hasta lavado de raíces.')}</p>
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
                  {t(brand.name)} ({t(brand.category)})
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
                      <span className="text-white font-bold">{t(activeBrandObj.name)}</span>
                      <span className="text-neutral-400 ml-2">{t('Línea: {line}', { line: activeBrandObj.line })}</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                      {t('pH Recomendado: {v0}', { v0: typeof activeBrandObj.recommendedPhRange === 'string' ? activeBrandObj.recommendedPhRange : '5.8 - 6.4' })}
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
                            <span className="text-xs font-bold text-white font-mono">{t(stg.stageName)}</span>
                            {stg.phaseCode && <span className="text-[10px] text-neutral-400 font-mono">({stg.phaseCode})</span>}
                            <span className="text-[10px] font-mono bg-cyan-950/40 text-cyan-400 border border-cyan-800/40 px-1.5 py-0.2 rounded">
                              EC: {stg.targetEc} mS
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-400 font-mono flex flex-wrap gap-x-3 gap-y-0.5">
                            {(stg.dosageMlPerLiter || []).map((dose, dIdx) => (
                              <span key={dIdx}>
                                {t(dose.productName)}: <strong className="text-emerald-400">{dose.mlPerL} ml/L</strong>
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
                          {t('Aplicar Dosis')}
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
