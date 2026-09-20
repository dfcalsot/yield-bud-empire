import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { MachineEquipment } from '../types';
import { 
  Flame, 
  Sparkles, 
  Wrench, 
  Gauge, 
  Thermometer, 
  Play, 
  RotateCw, 
  Snowflake, 
  Volume2, 
  Zap, 
  Award, 
  Info,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Wind
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  playHydraulicPumpSound, 
  playSteamReleaseSound, 
  playGoldenDripSound, 
  playCriticalHitSound,
  playClickSound 
} from '../utils/audio';

interface LabVisualizerProps {
  selectedMachineCategory: 'press' | 'extractor' | 'dryer';
  onSelectCategory: (cat: 'press' | 'extractor' | 'dryer') => void;
  onExecuteManualPress?: (yieldBonus: number, quality: number, isCritical: boolean) => void;
}

export const LabVisualizer: React.FC<LabVisualizerProps> = ({
  selectedMachineCategory,
  onSelectCategory,
  onExecuteManualPress
}) => {
  const { machines, repairMachine, floraBalance, rawFlowerGrams, addXp } = useGame();

  // Active machine based on selected tab
  const activeMachine = machines.find(m => {
    if (selectedMachineCategory === 'press') return m.category === 'press';
    if (selectedMachineCategory === 'extractor') return m.category === 'extractor';
    return m.category === 'dryer';
  }) || machines[0];

  // Manual Mini-Game States for Rosin Press
  const [isPressing, setIsPressing] = useState(false);
  const [pressurePsi, setPressurePsi] = useState(0); // 0 - 150 PSI
  const [pressHoldSeconds, setPressHoldSeconds] = useState(0); // target 3.0s in golden zone
  const [miniGameResult, setMiniGameResult] = useState<{
    status: 'idle' | 'pressing' | 'critical' | 'good' | 'blowout' | 'low';
    message: string;
    yieldBonus: number;
    quality: number;
  }>({
    status: 'idle',
    message: '',
    yieldBonus: 0,
    quality: 0
  });

  // Machine ambient animations state
  const [rotovapRpm, setRotovapRpm] = useState(120);
  const [freezeTemp, setFreezeTemp] = useState(-52);
  const [dripCount, setDripCount] = useState(0);

  // Press mini-game interval
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle Press holding
  useEffect(() => {
    if (isPressing) {
      playHydraulicPumpSound();
      pressTimerRef.current = setInterval(() => {
        setPressurePsi(prev => {
          const next = Math.min(150, prev + 6.5);
          return next;
        });

        setPressHoldSeconds(prev => prev + 0.1);
      }, 100);
    } else {
      if (pressTimerRef.current) {
        clearInterval(pressTimerRef.current);
      }
    }

    return () => {
      if (pressTimerRef.current) clearInterval(pressTimerRef.current);
    };
  }, [isPressing]);

  // When player releases the hydraulic press button, evaluate result!
  const handleReleasePress = () => {
    if (!isPressing) return;
    setIsPressing(false);
    playSteamReleaseSound();

    const finalPsi = pressurePsi;
    const finalHold = pressHoldSeconds;

    // Reset gauge after 1.5s
    setTimeout(() => {
      setPressurePsi(0);
      setPressHoldSeconds(0);
    }, 2500);

    // Evaluate: Zona Dorada is 85 - 120 PSI, and held for at least 1.5 seconds
    if (finalPsi > 135) {
      // Blowout!
      setMiniGameResult({
        status: 'blowout',
        message: '¡Rotura de Papel Parchment (Blowout)! Presión excesiva (>135 PSI). El extracto perdió pureza.',
        yieldBonus: -15,
        quality: 68
      });
    } else if (finalPsi >= 85 && finalPsi <= 125 && finalHold >= 1.2) {
      // Critical hit! Golden Zone
      playCriticalHitSound();
      playGoldenDripSound();
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#fbbf24', '#f59e0b', '#10b981', '#34d399']
      });

      setDripCount(prev => prev + 4);
      setMiniGameResult({
        status: 'critical',
        message: '¡PRENSADO CRÍTICO LEGENDARIO! Flujo continuo de Live Rosin 90u en la Zona Dorada. (+35% Rendimiento)',
        yieldBonus: 35,
        quality: 99
      });

      if (addXp) addXp(120, 'Extracción Crítica en Zona Dorada');
      if (onExecuteManualPress) onExecuteManualPress(35, 99, true);

    } else if (finalPsi >= 70 && finalPsi <= 135) {
      // Good standard press
      playGoldenDripSound();
      setDripCount(prev => prev + 2);
      setMiniGameResult({
        status: 'good',
        message: 'Prensado Óptimo: Resina dorada extraída con éxito (+15% Rendimiento).',
        yieldBonus: 15,
        quality: 90
      });

      if (addXp) addXp(60, 'Prensado Manual Exitoso');
      if (onExecuteManualPress) onExecuteManualPress(15, 90, false);

    } else {
      // Underpressed
      setMiniGameResult({
        status: 'low',
        message: 'Presión Insuficiente: No se alcanzaron los 80 PSI requeridos para exudar los tricomas.',
        yieldBonus: -20,
        quality: 72
      });
    }
  };

  // Determine golden zone active
  const isGoldenZone = pressurePsi >= 85 && pressurePsi <= 125;
  const isDangerZone = pressurePsi > 125;

  return (
    <div className="rounded-3xl bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 border border-neutral-800 p-4 sm:p-5 shadow-2xl space-y-4 overflow-hidden relative">
      {/* Top Station Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 pb-3.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Estación de Trabajo Fitoquímica Interactiva
          </h3>
        </div>

        {/* Machine Switcher Pill */}
        <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
          <button
            onClick={() => onSelectCategory('press')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition cursor-pointer flex items-center gap-1.5 ${
              selectedMachineCategory === 'press'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Prensa 10T</span>
          </button>

          <button
            onClick={() => onSelectCategory('extractor')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition cursor-pointer flex items-center gap-1.5 ${
              selectedMachineCategory === 'extractor'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5 text-purple-400" />
            <span>Rotavapor</span>
          </button>

          <button
            onClick={() => onSelectCategory('dryer')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition cursor-pointer flex items-center gap-1.5 ${
              selectedMachineCategory === 'dryer'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Snowflake className="w-3.5 h-3.5 text-cyan-400" />
            <span>Liofilizador</span>
          </button>
        </div>
      </div>

      {/* Main Animated Laboratory Stage Canvas Area */}
      <div className="relative min-h-[360px] md:min-h-[400px] w-full rounded-2xl bg-neutral-950 border border-neutral-800/80 p-5 flex flex-col justify-between overflow-hidden shadow-inner">
        {/* Background Grid & Laboratory Lighting */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#10b981 1px, transparent 1px), radial-gradient(#f59e0b 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
            backgroundPosition: '0 0, 16px 16px'
          }}
        />

        {/* Ambient Top Glow depending on active machine */}
        <div 
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-3/4 h-36 rounded-full pointer-events-none blur-3xl opacity-25"
          style={{
            background: selectedMachineCategory === 'press' 
              ? '#f59e0b' 
              : (selectedMachineCategory === 'extractor' ? '#a855f7' : '#06b6d4')
          }}
        />

        {/* Top Machine Status Telemetry Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 bg-neutral-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-neutral-800 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400">Equipo:</span>
            <span className="text-white font-bold">{activeMachine.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
              activeMachine.wearPercentage > 50 
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                : (activeMachine.wearPercentage > 20 ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30')
            }`}>
              {activeMachine.wearPercentage}% Salud
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            {selectedMachineCategory === 'press' && (
              <span className="text-amber-400 flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5" /> Placas: 82°C (180°F)
              </span>
            )}
            {selectedMachineCategory === 'extractor' && (
              <span className="text-purple-400 flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5 animate-spin" /> {rotovapRpm} RPM | -0.098 MPa
              </span>
            )}
            {selectedMachineCategory === 'dryer' && (
              <span className="text-cyan-400 flex items-center gap-1">
                <Snowflake className="w-3.5 h-3.5" /> {freezeTemp}°C SubZero | 80 mTorr
              </span>
            )}

            {activeMachine.wearPercentage < 100 && (
              <button
                onClick={() => repairMachine(activeMachine.id)}
                disabled={floraBalance < activeMachine.repairCostFlora}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] transition cursor-pointer disabled:opacity-40"
              >
                <Wrench className="w-2.5 h-2.5" />
                <span>Reparar (-{activeMachine.repairCostFlora} $FLORA)</span>
              </button>
            )}
          </div>
        </div>

        {/* CENTER ANIMATION RIG: Dynamic per selected machine */}
        <div className="relative z-10 my-4 flex-1 flex items-center justify-center">
          {/* =========================================================================
              SCENARIO 1: PRENSA TÉRMICA HIDRÁULICA 10T (Rosin Press with Piston & Drips)
             ========================================================================= */}
          {selectedMachineCategory === 'press' && (
            <div className="w-full max-w-lg flex flex-col items-center">
              <div className="relative w-72 sm:w-80 h-64 bg-neutral-900 border-2 border-neutral-700 rounded-2xl shadow-2xl p-4 flex flex-col justify-between overflow-hidden">
                {/* Steel machine chassis top bar */}
                <div className="w-full h-8 bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 rounded-lg border border-neutral-600 flex items-center justify-between px-3 shadow-md">
                  <div className="flex items-center gap-1 text-[10px] font-mono text-amber-400 font-bold">
                    <Flame className="w-3 h-3 text-amber-500" />
                    <span>10-TON PNEUMATIC PRESS</span>
                  </div>
                  <div className="flex gap-1">
                    <span className={`w-2 h-2 rounded-full ${isPressing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  </div>
                </div>

                {/* Hydraulic Piston Shaft that extends downward when pressing */}
                <div className="w-full flex flex-col items-center my-1 relative">
                  {/* Steel Piston Cylinder */}
                  <div className="w-12 h-10 bg-gradient-to-r from-neutral-600 via-neutral-400 to-neutral-600 border border-neutral-500 shadow-inner flex items-center justify-center">
                    <div className="w-1 h-full bg-neutral-700 opacity-50"></div>
                  </div>

                  {/* Moving Upper Heated Plate */}
                  <div 
                    className="w-48 h-8 rounded-lg bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 border-2 border-amber-300 shadow-lg flex items-center justify-center text-[10px] font-mono font-bold text-neutral-950 transition-all duration-150"
                    style={{
                      transform: `translateY(${Math.min(22, pressurePsi * 0.16)}px)`,
                      boxShadow: isPressing 
                        ? '0 0 25px rgba(245, 158, 11, 0.7)' 
                        : '0 0 10px rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    <span>PLACA SUPERIOR • 82°C</span>
                  </div>

                  {/* Filter Bag / Parchment Paper with Golden Rosin Exudation */}
                  <div className="relative w-44 h-9 my-1 flex items-center justify-center">
                    {/* Parchment pouch */}
                    <div className="w-36 h-6 bg-amber-100/90 border border-amber-300 rounded shadow-sm flex items-center justify-center text-[9px] font-mono text-neutral-800 font-semibold z-10">
                      <span>Bolsa Rosin 90μ</span>
                    </div>

                    {/* Golden Rosin Oozing Drops Animation */}
                    {(isPressing || dripCount > 0) && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center justify-center gap-6 z-20 pointer-events-none">
                        <span className="w-2.5 h-5 bg-gradient-to-b from-amber-400 to-yellow-300 rounded-full animate-bounce shadow-md shadow-amber-400"></span>
                        <span className="w-3 h-7 bg-gradient-to-b from-amber-500 to-yellow-300 rounded-full animate-pulse shadow-md shadow-amber-500"></span>
                        <span className="w-2 h-4 bg-gradient-to-b from-amber-400 to-yellow-400 rounded-full animate-bounce shadow-md shadow-amber-400" style={{ animationDelay: '0.2s' }}></span>
                      </div>
                    )}
                  </div>

                  {/* Fixed Lower Heated Plate */}
                  <div className="w-48 h-8 rounded-lg bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 border-2 border-amber-300 shadow-lg flex items-center justify-center text-[10px] font-mono font-bold text-neutral-950">
                    <span>PLACA INFERIOR • 82°C</span>
                  </div>
                </div>

                {/* Collection Glass Jar on Base */}
                <div className="w-full flex items-center justify-center relative">
                  <div className="w-24 h-10 rounded-b-xl border-2 border-amber-400/60 bg-neutral-950/80 backdrop-blur-md flex flex-col justify-end p-1 shadow-lg shadow-amber-500/20">
                    {/* Golden puddle rising */}
                    <div 
                      className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-b-lg transition-all duration-300"
                      style={{ height: `${Math.min(100, 20 + dripCount * 15)}%` }}
                    >
                      <div className="text-[8px] font-mono text-neutral-950 font-bold text-center leading-none">
                        Live Rosin
                      </div>
                    </div>
                  </div>
                </div>

                {/* Heat shimmer & steam particles rising */}
                {isPressing && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
                    <div className="w-48 h-20 bg-amber-500/10 rounded-full blur-xl animate-pulse"></div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              SCENARIO 2: DESTILADOR ROTATIVO DE TERPENOS (Rotovap Lab Extraction)
             ========================================================================= */}
          {selectedMachineCategory === 'extractor' && (
            <div className="w-full max-w-lg flex flex-col items-center">
              <div className="relative w-80 h-64 bg-neutral-900 border-2 border-neutral-700 rounded-2xl shadow-2xl p-4 flex items-center justify-around overflow-hidden">
                {/* Left: Heated Water Bath with Rotating Evaporation Flask */}
                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-mono text-purple-300 font-bold mb-1">
                    Baño María 45°C
                  </div>

                  {/* Water Bath Bowl */}
                  <div className="relative w-28 h-24 bg-neutral-950 border-2 border-purple-500/50 rounded-b-3xl p-1 flex items-center justify-center overflow-hidden shadow-lg shadow-purple-950/50">
                    {/* Bath fluid */}
                    <div className="absolute bottom-0 w-full h-12 bg-purple-500/20 border-t border-purple-400/40 animate-pulse"></div>

                    {/* Rotating Flask (tilted 35deg) */}
                    <div 
                      className="w-16 h-16 rounded-full border-2 border-purple-300/80 bg-neutral-900/60 relative flex items-center justify-center shadow-inner"
                      style={{
                        transform: `rotate(${rotovapRpm * 0.5}deg)`,
                        transition: 'transform 0.1s linear'
                      }}
                    >
                      {/* Swirling botanical slurry */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 via-amber-500 to-purple-600 opacity-70 animate-spin"></div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-neutral-400 mt-1">Matraz de Evaporación</span>
                </div>

                {/* Center: Glass Vapor Duct & Condenser Spiral Coil */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-40 rounded-2xl border-2 border-purple-400/40 bg-neutral-950/90 relative flex flex-col items-center justify-between py-2 shadow-lg">
                    {/* Glass Cooling Spiral Coil */}
                    <div className="w-full h-full flex flex-col items-center justify-around opacity-90">
                      <div className="w-12 h-3 rounded-full border-2 border-cyan-400 bg-cyan-500/20 animate-pulse"></div>
                      <div className="w-12 h-3 rounded-full border-2 border-cyan-400 bg-cyan-500/20 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-12 h-3 rounded-full border-2 border-cyan-400 bg-cyan-500/20 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      <div className="w-12 h-3 rounded-full border-2 border-cyan-400 bg-cyan-500/20 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                    </div>

                    {/* Condensing Terpene Droplets trickling down */}
                    <div className="absolute bottom-2 flex flex-col items-center gap-1">
                      <span className="w-1.5 h-3 bg-purple-400 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-cyan-300 mt-1">Serpentín Frío (-15°C)</span>
                </div>

                {/* Right: Pure Terpenes Receiving Flask */}
                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-mono text-emerald-400 font-bold mb-1">
                    Terpenos 99%
                  </div>
                  <div className="w-20 h-24 rounded-b-full border-2 border-emerald-400/60 bg-neutral-950 p-1 flex flex-col justify-end shadow-lg shadow-emerald-950/60">
                    <div className="w-full h-10 bg-gradient-to-t from-emerald-500 via-yellow-400 to-transparent rounded-b-full animate-pulse"></div>
                  </div>
                  <span className="text-[9px] font-mono text-neutral-400 mt-1">Matraz Colector</span>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SCENARIO 3: LIOFILIZADOR CRIOGÉNICO SUBZERO (Freeze-Drying Chamber)
             ========================================================================= */}
          {selectedMachineCategory === 'dryer' && (
            <div className="w-full max-w-lg flex flex-col items-center">
              <div className="relative w-80 h-64 bg-neutral-900 border-2 border-neutral-700 rounded-2xl shadow-2xl p-4 flex flex-col justify-between overflow-hidden">
                {/* Cryo chamber top badge */}
                <div className="flex items-center justify-between text-[10px] font-mono border-b border-neutral-800 pb-2">
                  <span className="text-cyan-400 font-bold flex items-center gap-1">
                    <Snowflake className="w-3.5 h-3.5 text-cyan-300" /> VACIADO CRIOGÉNICO
                  </span>
                  <span className="text-neutral-400">Bomba Edwards 80 mTorr</span>
                </div>

                {/* Cold vacuum chamber interior with frost trays */}
                <div className="relative w-full h-44 rounded-xl bg-neutral-950 border border-cyan-500/40 p-3 flex flex-col justify-around overflow-hidden">
                  {/* Rolling cold nitrogen fog */}
                  <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 via-cyan-500/5 to-transparent pointer-events-none animate-pulse"></div>

                  {/* Frost Trays with Frosty Buds */}
                  {[1, 2, 3].map((tray) => (
                    <div key={tray} className="relative z-10 w-full h-8 bg-neutral-900 border border-cyan-400/40 rounded-lg flex items-center justify-around px-3 shadow">
                      <span className="text-[8px] font-mono text-cyan-300">Bandeja #{tray}</span>
                      <div className="flex items-center gap-3">
                        <span className="w-4 h-4 rounded-full bg-emerald-600 border border-cyan-300 shadow-sm shadow-cyan-300 flex items-center justify-center text-[8px] text-white">❄</span>
                        <span className="w-4 h-4 rounded-full bg-emerald-500 border border-cyan-300 shadow-sm shadow-cyan-300 flex items-center justify-center text-[8px] text-white">❄</span>
                        <span className="w-4 h-4 rounded-full bg-emerald-600 border border-cyan-300 shadow-sm shadow-cyan-300 flex items-center justify-center text-[8px] text-white">❄</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-[10px] font-mono pt-1 text-neutral-400">
                  <span>Crio-Preservación de Tricomas</span>
                  <span className="text-cyan-300 font-bold">100% Retención de Color</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM INTERACTIVE ARCADE CONTROLS: THE GAMING PRESS MINI-GAME! */}
        {selectedMachineCategory === 'press' && (
          <div className="hud-panel relative z-10 p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-amber-400" />
                  Mini-Juego: Prensado de Precisión (Zona Dorada 85 - 125 PSI)
                </span>
                <p className="text-[11px] text-neutral-400">
                  Mantén presionado el actuador hidráulico. Suelta dentro de la <strong className="text-amber-300 font-bold">Zona Dorada</strong> para desbloquear un Prensado Crítico (+35% de Resina).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-white">
                  Presión: {Math.round(pressurePsi)} PSI
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-amber-400">
                  Tiempo: {pressHoldSeconds.toFixed(1)}s
                </span>
              </div>
            </div>

            {/* Pressure Gauge Bar with Golden Zone Indicator */}
            <div className="relative w-full h-5 bg-neutral-950 rounded-full border border-neutral-800 overflow-hidden">
              {/* Under-pressure zone (0 - 85 PSI) */}
              <div className="absolute left-0 top-0 bottom-0 w-[56%] bg-neutral-800/40"></div>

              {/* SWEET SPOT / ZONA DORADA (85 - 125 PSI = ~56% to 83%) */}
              <div className="absolute left-[56%] top-0 bottom-0 w-[27%] bg-gradient-to-r from-amber-500/40 via-yellow-400/50 to-amber-500/40 border-x-2 border-amber-400 flex items-center justify-center">
                <span className="text-[9px] font-mono font-bold text-amber-300 uppercase tracking-widest pointer-events-none">
                  ZONA DORADA
                </span>
              </div>

              {/* Blowout Danger zone (125 - 150 PSI = 83% to 100%) */}
              <div className="absolute right-0 top-0 bottom-0 w-[17%] bg-red-950/60 border-l border-red-500 flex items-center justify-center">
                <span className="text-[8px] font-mono text-red-400">PELIGRO</span>
              </div>

              {/* Dynamic Fill Needle */}
              <div 
                className={`h-full transition-all duration-100 ${
                  isDangerZone ? 'bg-red-500 shadow-lg shadow-red-500' : (isGoldenZone ? 'bg-amber-400 shadow-lg shadow-amber-400' : 'bg-emerald-500')
                }`}
                style={{ width: `${(pressurePsi / 150) * 100}%` }}
              />
            </div>

            {/* Large Interactive Action Button */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onMouseDown={() => setIsPressing(true)}
                onMouseUp={handleReleasePress}
                onMouseLeave={handleReleasePress}
                onTouchStart={() => setIsPressing(true)}
                onTouchEnd={handleReleasePress}
                disabled={activeMachine.wearPercentage <= 15}
                className={`w-full sm:flex-1 py-3.5 px-5 rounded-xl font-bold text-sm transition-all shadow-xl select-none cursor-pointer flex items-center justify-center gap-2 ${
                  isPressing
                    ? 'bg-amber-400 text-neutral-950 scale-[0.98] shadow-amber-500/60'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-neutral-950'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Gauge className="w-5 h-5 text-neutral-950" />
                <span>{isPressing ? '¡COMPRIMIENDO! SUELTA EN LA ZONA DORADA...' : 'MANTENER PRESIONADO PARA PRENSAR'}</span>
              </button>

              {/* Quick info tag */}
              <div className="text-[11px] text-neutral-400 font-mono text-center sm:text-right shrink-0">
                <span>Rendimiento Base: 22%</span>
                <span className="text-amber-400 block font-bold">Crítico: +35% Resina Pura</span>
              </div>
            </div>

            {/* Mini-game Feedback Banner */}
            {miniGameResult.status !== 'idle' && (
              <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
                miniGameResult.status === 'critical'
                  ? 'bg-amber-950/40 border-amber-500/60 text-amber-200 shadow-md shadow-amber-950'
                  : (miniGameResult.status === 'good'
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                    : 'bg-red-950/40 border-red-500/50 text-red-200')
              }`}>
                <div className="flex items-center gap-2">
                  {miniGameResult.status === 'critical' ? (
                    <Award className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
                  ) : (miniGameResult.status === 'good' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  ))}
                  <span className="font-medium">{miniGameResult.message}</span>
                </div>

                <div className="font-mono text-right shrink-0 font-bold">
                  {miniGameResult.yieldBonus > 0 ? `+${miniGameResult.yieldBonus}% Resina` : `${miniGameResult.yieldBonus}%`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Other Machines Quick Interaction Bar */}
        {selectedMachineCategory !== 'press' && (
          <div className="hud-panel relative z-10 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-neutral-300 font-medium">
                {selectedMachineCategory === 'extractor' 
                  ? 'Destilador al vacío activo en bucle de extracción continua de terpenos aromáticos.' 
                  : 'Liofilizador en ciclo criogénico continuo: humedad residual < 2%.'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectedMachineCategory === 'extractor' && (
                <button
                  onClick={() => {
                    setRotovapRpm(prev => (prev >= 180 ? 80 : prev + 20));
                    playClickSound();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-mono transition cursor-pointer"
                >
                  Ajustar RPM ({rotovapRpm})
                </button>
              )}

              {selectedMachineCategory === 'dryer' && (
                <button
                  onClick={() => {
                    setFreezeTemp(prev => (prev <= -65 ? -45 : prev - 5));
                    playClickSound();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-mono transition cursor-pointer"
                >
                  Calibrar Temp ({freezeTemp}°C)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
