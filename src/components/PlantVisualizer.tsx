import React, { useState } from 'react';
import { PlantInGrow, TerpeneProfile } from '../types';
import { Eye, Sun, Sparkles, AlertCircle, Droplet, Wind, Flame, Gauge, Zap } from 'lucide-react';

const TERPENE_LABELS: Record<string, string> = {
  myrcene: 'Mirceno',
  limonene: 'Limoneno',
  caryophyllene: 'Cariofileno',
  pinene: 'Pineno',
  linalool: 'Linalool',
};

const topTerpenes = (terpenes: TerpeneProfile): string =>
  Object.entries(terpenes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => TERPENE_LABELS[key] ?? key)
    .join(', ');

interface PlantVisualizerProps {
  plant: PlantInGrow | null;
  facilityTier: number;
}

export const PlantVisualizer: React.FC<PlantVisualizerProps> = ({ plant, facilityTier }) => {
  const [showTrichomeLens, setShowTrichomeLens] = useState(false);
  const [isDrippingActive, setIsDrippingActive] = useState(true);

  if (!plant) {
    return (
      <div className="hud-panel relative h-96 w-full flex flex-col items-center justify-center p-6 text-center overflow-hidden">
        <div className="w-20 h-20 rounded-full bg-neutral-950 border border-dashed border-neutral-700 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-neutral-600" />
        </div>
        <h3 className="text-lg font-bold text-neutral-300">Sala de Cultivo Sanitizada</h3>
        <p className="text-sm text-neutral-500 max-w-sm mt-1">
          La carpa de cultivo con paredes Mylar Diamond está calibrada. Selecciona una semilla o esqueje de tu banco de genéticas para iniciar el ciclo botánico.
        </p>
      </div>
    );
  }

  // Calculate LED light color / intensity
  const lightOpacity = Math.min(1, Math.max(0.35, plant.ppfdLightIntensity / 1000));
  const isOptimalVpd = plant.vpdKpa >= 0.8 && plant.vpdKpa <= 1.4;

  return (
    <div className="relative h-[480px] sm:h-[520px] w-full rounded-3xl bg-neutral-950 border border-neutral-800 overflow-hidden flex flex-col justify-between p-4 shadow-2xl">
      
      {/* Background: Diamond Mylar Reflective Insulation Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, #525252 1px, transparent 1px), linear-gradient(45deg, #171717 25%, transparent 25%), linear-gradient(-45deg, #171717 25%, transparent 25%)',
          backgroundSize: '14px 14px, 28px 28px, 28px 28px'
        }}
      />

      {/* Structural Grow Tent Poles (Vertical Corner Uprights) */}
      <div className="absolute top-0 bottom-0 left-2 w-1.5 bg-neutral-700 rounded-full opacity-60 pointer-events-none shadow-sm" />
      <div className="absolute top-0 bottom-0 right-2 w-1.5 bg-neutral-700 rounded-full opacity-60 pointer-events-none shadow-sm" />

      {/* Overhead High-Tech LED Grow Lamp (Spider-Farmer / Quantum Bar Style) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 max-w-lg z-20 pointer-events-none">
        {/* Ratchet Hanging Cables */}
        <div className="flex justify-between px-8 text-neutral-500">
          <div className="w-0.5 h-6 bg-neutral-500" />
          <div className="w-0.5 h-6 bg-neutral-500" />
        </div>
        
        {/* Aluminum Heatsink Bar Fixture */}
        <div className="h-8 rounded-b-xl bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 border-x border-b border-neutral-600 shadow-xl flex items-center justify-between px-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-300">
            <Sun className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="font-bold">SAMSUNG LM301H EVO & OSRAM 660nm</span>
          </div>

          {/* LED Multi-Spectrum Diodes */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.9)] animate-pulse" title="3000K Cálido" />
            <span className="w-2 h-2 rounded-full bg-cyan-200 shadow-[0_0_6px_rgba(165,243,252,0.9)]" title="5000K Blanco Frío" />
            <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]" title="660nm Rojo Profundo" />
            <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]" title="730nm Infrarrojo Lejano" />
            <span className="text-[10px] font-mono text-amber-300 font-bold ml-1">{plant.ppfdLightIntensity} μmol</span>
          </div>
        </div>

        {/* CO2 Overhead Injection Micro-perforated Drip Tube */}
        <div className="h-1.5 w-full bg-neutral-900 border-y border-neutral-700 flex items-center justify-around mt-0.5">
          {[...Array(9)].map((_, i) => (
            <span key={i} className="w-1 h-1 rounded-full bg-cyan-400/60" />
          ))}
        </div>
      </div>

      {/* Atmospheric Photon Cone */}
      <div 
        className="absolute top-12 left-1/2 -translate-x-1/2 w-5/6 h-full pointer-events-none z-0 transition-opacity duration-700 animate-led-shimmer"
        style={{
          background: `radial-gradient(ellipse at top, rgba(245, 158, 11, ${0.16 * lightOpacity}) 0%, rgba(16, 185, 129, ${0.10 * lightOpacity}) 45%, transparent 80%)`
        }}
      />

      {/* Falling Carbon Dioxide (CO2) Micro-mist Particles */}
      <div className="absolute top-14 left-1/4 right-1/4 h-48 pointer-events-none z-10 flex justify-around opacity-40 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className="w-1.5 h-16 rounded-full bg-gradient-to-b from-cyan-400/40 via-emerald-300/20 to-transparent animate-co2-mist"
            style={{ animationDelay: `${i * 0.6}s`, animationDuration: `${3.5 + (i % 3)}s` }}
          />
        ))}
      </div>

      {/* Top Floating Information Bar */}
      <div className="relative z-20 flex justify-between items-start pt-7 px-1">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded-lg bg-neutral-900/90 border border-emerald-500/40 text-emerald-400 font-bold shadow-sm flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {
                plant.stage === 'seed' ? 'Germinación de Semilla' :
                plant.stage === 'seedling' ? 'Plántula Cannabis' :
                plant.stage === 'vegetative' ? 'Vegetativo / Hojas Fan' :
                plant.stage === 'flowering' ? 'Floración / Cogollos Resinosos' : 'Maduración & Cosecha'
              }
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-neutral-900/90 border border-neutral-800 text-neutral-300">
              Salud: <strong className="text-emerald-300">{plant.health}%</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <h3 className="text-base sm:text-lg font-extrabold text-white tracking-wide">
              {plant.strain.name}
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-neutral-800 text-neutral-400">
              THC: ~{plant.strain.thcPercentage}%
            </span>
          </div>
        </div>

        {/* Microclimate status quick pills */}
        <div className="flex flex-col items-end gap-1.5">
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono border ${
            isOptimalVpd 
              ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' 
              : 'bg-amber-950/70 border-amber-500/40 text-amber-300'
          }`}>
            <span>VPD: {plant.vpdKpa} kPa</span>
            {isOptimalVpd ? (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            ) : (
              <AlertCircle className="w-3 h-3 text-amber-400" />
            )}
          </div>
          
          <button
            onClick={() => setShowTrichomeLens(!showTrichomeLens)}
            className="flex items-center gap-1 text-[11px] font-mono bg-neutral-900/90 hover:bg-neutral-800 border border-emerald-500/40 text-emerald-300 px-2.5 py-1 rounded-lg transition cursor-pointer shadow-md"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-400" />
            <span>{showTrichomeLens ? 'Ocultar Lente' : 'Inspección Tricomas (100x)'}</span>
          </button>
        </div>
      </div>

      {/* Main Botanical Cannabis Illustration Center (Authentic Cannabis Anatomy) */}
      <div className="relative z-10 flex-1 flex items-center justify-center my-1">
        <svg 
          viewBox="0 0 420 380" 
          className="w-full max-w-[370px] h-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)] plant-glow"
        >
          <defs>
            {/* Fabric Smart Pot Texture */}
            <pattern id="fabricPotPattern" width="6" height="6" patternUnits="userSpaceOnUse">
              <path d="M 0 3 L 6 3 M 3 0 L 3 6" stroke="#262626" strokeWidth="0.8" />
            </pattern>
            {/* Cannabis Leaf Gradient */}
            <linearGradient id="cannabisGreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2d6a4f" />
              <stop offset="50%" stopColor="#1b4332" />
              <stop offset="100%" stopColor="#081c15" />
            </linearGradient>
            <linearGradient id="youngCannabisGreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#52b788" />
              <stop offset="50%" stopColor="#2d6a4f" />
              <stop offset="100%" stopColor="#1b4332" />
            </linearGradient>
            {/* Resin & Trichome Glow */}
            <radialGradient id="trichomeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="70%" stopColor="#fef08a" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Drip Irrigation Hose Line & Pressure Stake */}
          <g id="dripIrrigationSystem">
            {/* Main Supply Line from Left */}
            <path 
              d="M 10 325 L 140 325 L 175 320" 
              stroke="#0ea5e9" 
              strokeWidth="4" 
              fill="none" 
              strokeLinecap="round"
              className="animate-pipe-flow" 
            />
            {/* Irrigation Stake pushed into coco substrate */}
            <path d="M 175 315 L 175 342" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" />
            <rect x="171" y="316" width="8" height="6" rx="2" fill="#0369a1" />

            {/* Dripping Water Droplets into Soil */}
            <g transform="translate(175, 328)">
              <circle cx="0" cy="0" r="2.5" fill="#38bdf8" className="animate-water-drip" />
              {/* Expanding Moisture Ring on Soil Surface */}
              <ellipse cx="0" cy="15" rx="14" ry="4" fill="none" stroke="#38bdf8" strokeWidth="1.5" className="animate-drip-ring" />
            </g>
          </g>

          {/* Smart Pot (Macetas Geotextiles de Aireación) with Saucer Tray */}
          <g id="smartPot">
            {/* White/Clear Runoff Catchment Saucer Tray */}
            <ellipse cx="210" cy="358" rx="92" ry="12" fill="#171717" stroke="#333333" strokeWidth="2" />
            
            {/* Geotextile Fabric Pot Body */}
            <path 
              d="M 135 315 L 150 354 Q 210 364 270 354 L 285 315 Z" 
              fill="#221f1f" 
              stroke="#3a3a3a" 
              strokeWidth="2.5" 
            />
            <path 
              d="M 135 315 L 150 354 Q 210 364 270 354 L 285 315 Z" 
              fill="url(#fabricPotPattern)" 
              opacity="0.6"
            />
            {/* Pot Stitching Details */}
            <path d="M 140 318 L 152 350" stroke="#4a4a4a" strokeWidth="1" strokeDasharray="3 2" />
            <path d="M 280 318 L 268 350" stroke="#4a4a4a" strokeWidth="1" strokeDasharray="3 2" />

            {/* Upper Pot Rim */}
            <ellipse cx="210" cy="315" rx="75" ry="14" fill="#2d2a2a" stroke="#4b4646" strokeWidth="2" />
            
            {/* Coco Coir & Perlite Substrate Blend */}
            <ellipse cx="210" cy="317" rx="70" ry="11" fill="#382216" />
            {/* Wet Moisture Core Layer */}
            <ellipse 
              cx="210" 
              cy="317" 
              rx="66" 
              ry="9" 
              fill={plant.soilMoisture > 50 ? "#1e392a" : "#27150c"} 
              opacity="0.9" 
            />
            {/* White Perlite Specks */}
            <circle cx="185" cy="316" r="1.5" fill="#f5f5f5" />
            <circle cx="230" cy="318" r="1.8" fill="#f5f5f5" />
            <circle cx="210" cy="319" r="1.2" fill="#e5e5e5" />
            <circle cx="245" cy="315" r="1.4" fill="#f5f5f5" />
            <circle cx="165" cy="318" r="1.5" fill="#f5f5f5" />
          </g>

          {/* STAGE 1: GERMINATING SEED */}
          {plant.stage === 'seed' && (
            <g className="animate-pulse">
              <ellipse cx="210" cy="314" rx="7" ry="5" fill="#713f12" stroke="#a16207" strokeWidth="1.5" />
              {/* Emerging Taproot / Radicle */}
              <path d="M 210 316 Q 212 328 218 335" stroke="#ecfccb" strokeWidth="2.5" fill="none" strokeLinecap="round" />
              {/* Emerging Green Cotyledon arch */}
              <path d="M 210 310 Q 206 295 212 284" stroke="#84cc16" strokeWidth="3" fill="none" strokeLinecap="round" />
              <circle cx="212" cy="284" r="4" fill="#a3e635" />
            </g>
          )}

          {/* STAGE 2: SEEDLING CANNABIS (Cotyledons + First Serrated Leaves) */}
          {plant.stage === 'seedling' && (
            <g className="animate-cannabis-breeze">
              {/* Main Stem */}
              <path d="M 210 315 Q 208 270 210 235" stroke="#65a30d" strokeWidth="4" fill="none" strokeLinecap="round" />
              
              {/* Rounded Embryonic Cotyledon Leaves */}
              <ellipse cx="192" cy="275" rx="14" ry="7" fill="#84cc16" stroke="#4d7c0f" strokeWidth="1" transform="rotate(-15 192 275)" />
              <ellipse cx="228" cy="275" rx="14" ry="7" fill="#84cc16" stroke="#4d7c0f" strokeWidth="1" transform="rotate(15 228 275)" />

              {/* First Set of Characteristic 3-Finger Serrated Cannabis Leaves */}
              {/* Left Fan */}
              <g transform="translate(195, 245) rotate(-35)">
                <path d="M 0 0 L -25 -5 L -20 -1 L -32 -2 L -25 2 L -28 5 L -18 3 L 0 0 Z" fill="#15803d" stroke="#166534" strokeWidth="0.8" />
                <path d="M 0 0 L -38 -15 L 0 0 Z" stroke="#84cc16" strokeWidth="1" />
              </g>
              {/* Right Fan */}
              <g transform="translate(225, 245) rotate(35)">
                <path d="M 0 0 L 25 -5 L 20 -1 L 32 -2 L 25 2 L 28 5 L 18 3 L 0 0 Z" fill="#15803d" stroke="#166534" strokeWidth="0.8" />
                <path d="M 0 0 L 38 -15 L 0 0 Z" stroke="#84cc16" strokeWidth="1" />
              </g>
              {/* Center Apical Shoot */}
              <path d="M 210 235 L 210 205 L 213 225 L 207 225 Z" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
            </g>
          )}

          {/* STAGE 3, 4, 5: MATURE CANNABIS (Vegetative, Flowering, and Harvest Ready) */}
          {(plant.stage === 'vegetative' || plant.stage === 'flowering' || plant.stage === 'ready_harvest') && (
            <g>
              {/* Main Woody Cannabis Trunk / Stalk with Striations */}
              <path d="M 210 315 Q 206 230 210 115" stroke="#365314" strokeWidth="9" fill="none" strokeLinecap="round" />
              <path d="M 210 315 Q 208 230 211 115" stroke="#4d7c0f" strokeWidth="4" fill="none" strokeLinecap="round" />

              {/* LOW TIER: Mature 7-Finger Palmate Cannabis Fan Leaves (Left & Right) */}
              {/* Left Fan Leaf Cluster (Swaying in wind) */}
              <g className="animate-cannabis-sway-left" style={{ transformOrigin: '206px 260px' }}>
                <path d="M 206 260 Q 155 255 105 270" stroke="#365314" strokeWidth="4.5" fill="none" />
                {/* 7-Blade Serrated Cannabis Leaf Cluster */}
                <g transform="translate(105, 270) rotate(-25)">
                  {/* Center Main Leaflet */}
                  <path d="M 0 0 Q -25 -8 -60 -5 Q -25 8 0 0 Z" fill="url(#cannabisGreen)" stroke="#14532d" strokeWidth="1" />
                  <path d="M 0 0 L -58 -5" stroke="#4ade80" strokeWidth="1" opacity="0.6" />
                  {/* Lateral Upper Leaflets */}
                  <path d="M 0 0 Q -22 -22 -50 -28 Q -20 -10 0 0 Z" fill="url(#cannabisGreen)" stroke="#14532d" strokeWidth="1" />
                  <path d="M 0 0 Q -22 15 -48 24 Q -20 5 0 0 Z" fill="url(#cannabisGreen)" stroke="#14532d" strokeWidth="1" />
                  {/* Lateral Mid Leaflets */}
                  <path d="M 0 0 Q -15 -35 -38 -45 Q -12 -20 0 0 Z" fill="#14532d" stroke="#052e16" strokeWidth="0.8" />
                  <path d="M 0 0 Q -15 28 -36 38 Q -12 15 0 0 Z" fill="#14532d" stroke="#052e16" strokeWidth="0.8" />
                  {/* Basal Small Leaflets */}
                  <path d="M 0 0 Q -10 -40 -22 -52 Q -6 -25 0 0 Z" fill="#14532d" opacity="0.9" />
                  <path d="M 0 0 Q -10 35 -20 46 Q -6 20 0 0 Z" fill="#14532d" opacity="0.9" />
                </g>
              </g>

              {/* Right Fan Leaf Cluster (Swaying in wind) */}
              <g className="animate-cannabis-sway-right" style={{ transformOrigin: '214px 260px' }}>
                <path d="M 214 260 Q 265 255 315 270" stroke="#365314" strokeWidth="4.5" fill="none" />
                <g transform="translate(315, 270) rotate(25)">
                  {/* Center Main Leaflet */}
                  <path d="M 0 0 Q 25 -8 60 -5 Q 25 8 0 0 Z" fill="url(#cannabisGreen)" stroke="#14532d" strokeWidth="1" />
                  <path d="M 0 0 L 58 -5" stroke="#4ade80" strokeWidth="1" opacity="0.6" />
                  {/* Lateral Upper Leaflets */}
                  <path d="M 0 0 Q 22 -22 50 -28 Q 20 -10 0 0 Z" fill="url(#cannabisGreen)" stroke="#14532d" strokeWidth="1" />
                  <path d="M 0 0 Q 22 15 48 24 Q 20 5 0 0 Z" fill="url(#cannabisGreen)" stroke="#14532d" strokeWidth="1" />
                  {/* Lateral Mid Leaflets */}
                  <path d="M 0 0 Q 15 -35 38 -45 Q 12 -20 0 0 Z" fill="#14532d" stroke="#052e16" strokeWidth="0.8" />
                  <path d="M 0 0 Q 15 28 36 38 Q 12 15 0 0 Z" fill="#14532d" stroke="#052e16" strokeWidth="0.8" />
                  {/* Basal Small Leaflets */}
                  <path d="M 0 0 Q 10 -40 22 -52 Q 6 -25 0 0 Z" fill="#14532d" opacity="0.9" />
                  <path d="M 0 0 Q 10 35 20 46 Q 6 20 0 0 Z" fill="#14532d" opacity="0.9" />
                </g>
              </g>

              {/* MID TIER: 5-Finger Cannabis Fan Leaves */}
              <g className="animate-cannabis-sway-left" style={{ transformOrigin: '208px 200px' }}>
                <path d="M 208 200 Q 160 185 125 195" stroke="#365314" strokeWidth="4" fill="none" />
                <g transform="translate(125, 195) rotate(-35)">
                  <path d="M 0 0 Q -20 -6 -50 -5 Q -20 6 0 0 Z" fill="url(#youngCannabisGreen)" stroke="#14532d" strokeWidth="1" />
                  <path d="M 0 0 Q -18 -18 -42 -22 Q -15 -8 0 0 Z" fill="url(#youngCannabisGreen)" stroke="#14532d" strokeWidth="1" />
                  <path d="M 0 0 Q -18 12 -38 20 Q -15 5 0 0 Z" fill="url(#youngCannabisGreen)" stroke="#14532d" strokeWidth="1" />
                  <path d="M 0 0 Q -10 -25 -26 -32 Q -8 -12 0 0 Z" fill="#166534" />
                  <path d="M 0 0 Q -10 20 -24 28 Q -8 10 0 0 Z" fill="#166534" />
                </g>
              </g>

              <g className="animate-cannabis-sway-right" style={{ transformOrigin: '212px 200px' }}>
                <path d="M 212 200 Q 260 185 295 195" stroke="#365314" strokeWidth="4" fill="none" />
                <g transform="translate(295, 195) rotate(35)">
                  <path d="M 0 0 Q 20 -6 50 -5 Q 20 6 0 0 Z" fill="url(#youngCannabisGreen)" stroke="#14532d" strokeWidth="1" />
                  <path d="M 0 0 Q 18 -18 42 -22 Q 15 -8 0 0 Z" fill="url(#youngCannabisGreen)" stroke="#14532d" strokeWidth="1" />
                  <path d="M 0 0 Q 18 12 38 20 Q 15 5 0 0 Z" fill="url(#youngCannabisGreen)" stroke="#14532d" strokeWidth="1" />
                  <path d="M 0 0 Q 10 -25 26 -32 Q 8 -12 0 0 Z" fill="#166534" />
                  <path d="M 0 0 Q 10 20 24 28 Q 8 10 0 0 Z" fill="#166534" />
                </g>
              </g>

              {/* UPPER CANOPY TIER: Sugar Leaves & Apical Foliage */}
              <g>
                <path d="M 208 150 Q 170 135 145 140" stroke="#4d7c0f" strokeWidth="3.5" fill="none" />
                <path d="M 212 150 Q 250 135 275 140" stroke="#4d7c0f" strokeWidth="3.5" fill="none" />
                {/* Left Top Sugar Leaf */}
                <g transform="translate(145, 140) rotate(-40)">
                  <path d="M 0 0 Q -15 -5 -35 -4 Q -15 5 0 0 Z" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
                  <path d="M 0 0 Q -12 -14 -28 -16 Q -10 -6 0 0 Z" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
                  <path d="M 0 0 Q -12 10 -25 15 Q -10 4 0 0 Z" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
                </g>
                {/* Right Top Sugar Leaf */}
                <g transform="translate(275, 140) rotate(40)">
                  <path d="M 0 0 Q 15 -5 35 -4 Q 15 5 0 0 Z" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
                  <path d="M 0 0 Q 12 -14 28 -16 Q 10 -6 0 0 Z" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
                  <path d="M 0 0 Q 12 10 25 15 Q 10 4 0 0 Z" fill="#22c55e" stroke="#15803d" strokeWidth="1" />
                </g>
              </g>

              {/* VEGETATIVE PRE-FLOWERS (White hair stigmas at node intersections) */}
              {plant.stage === 'vegetative' && (
                <g>
                  {/* Pair of pistils at node 1 */}
                  <path d="M 207 198 Q 200 190 202 184" stroke="#ffffff" strokeWidth="1.2" fill="none" />
                  <path d="M 208 199 Q 204 192 208 184" stroke="#ffffff" strokeWidth="1.2" fill="none" />
                  {/* Pair at node 2 */}
                  <path d="M 213 148 Q 220 140 218 134" stroke="#ffffff" strokeWidth="1.2" fill="none" />
                  <path d="M 212 149 Q 216 142 212 134" stroke="#ffffff" strokeWidth="1.2" fill="none" />
                </g>
              )}

              {/* FLOWERING & READY HARVEST: DENSE CANNABIS COLAS & RESIN GLANDS */}
              {(plant.stage === 'flowering' || plant.stage === 'ready_harvest') && (
                <g className="animate-cannabis-breeze">
                  
                  {/* SIDE COLAS (SECONDARY NUGGETS / COGOLLOS SATÉLITE) */}
                  {/* Lower-Mid Left Cola */}
                  <g transform="translate(130, 190)">
                    {/* Clustered Calyxes */}
                    <ellipse cx="0" cy="0" rx="15" ry="22" fill={plant.strain.colorTheme || '#15803d'} opacity="0.95" />
                    <circle cx="-5" cy="-6" r="8" fill="#14532d" />
                    <circle cx="6" cy="4" r="7" fill="#166534" />
                    <circle cx="0" cy="-12" r="6" fill="#1b4332" />
                    {/* Sugar leaves sticking out */}
                    <path d="M -12 -5 L -26 -10 L -10 0 Z" fill="#22c55e" />
                    <path d="M 12 -5 L 24 -8 L 10 2 Z" fill="#22c55e" />
                    {/* Amber Curling Pistils */}
                    <path d="M -4 -14 Q -10 -22 -6 -28" stroke="#f97316" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                    <path d="M 5 -12 Q 12 -20 8 -26" stroke="#ea580c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                    <path d="M -8 2 Q -16 6 -20 2" stroke="#ea580c" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                    {/* Trichomes */}
                    <circle cx="-2" cy="-4" r="1.5" fill="#fff" className="animate-trichome-sparkle" />
                    <circle cx="4" cy="6" r="1.5" fill="#fef08a" className="animate-trichome-sparkle" />
                  </g>

                  {/* Lower-Mid Right Cola */}
                  <g transform="translate(290, 190)">
                    <ellipse cx="0" cy="0" rx="15" ry="22" fill={plant.strain.colorTheme || '#15803d'} opacity="0.95" />
                    <circle cx="5" cy="-6" r="8" fill="#14532d" />
                    <circle cx="-6" cy="4" r="7" fill="#166534" />
                    <circle cx="0" cy="-12" r="6" fill="#1b4332" />
                    <path d="M 12 -5 L 26 -10 L 10 0 Z" fill="#22c55e" />
                    <path d="M -12 -5 L -24 -8 L -10 2 Z" fill="#22c55e" />
                    <path d="M 4 -14 Q 10 -22 6 -28" stroke="#f97316" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                    <path d="M -5 -12 Q -12 -20 -8 -26" stroke="#ea580c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                    <circle cx="2" cy="-4" r="1.5" fill="#fff" className="animate-trichome-sparkle" />
                    <circle cx="-4" cy="6" r="1.5" fill="#fef08a" className="animate-trichome-sparkle" />
                  </g>

                  {/* Upper Left Cola */}
                  <g transform="translate(150, 135)">
                    <ellipse cx="0" cy="0" rx="14" ry="18" fill={plant.strain.colorTheme || '#15803d'} opacity="0.95" />
                    <circle cx="-4" cy="-4" r="7" fill="#14532d" />
                    <circle cx="4" cy="2" r="6" fill="#166534" />
                    <path d="M -8 -10 Q -14 -18 -10 -24" stroke="#f97316" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                    <path d="M 4 -8 Q 10 -16 6 -22" stroke="#f59e0b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    <circle cx="0" cy="-2" r="1.5" fill="#fff" className="animate-trichome-sparkle" />
                  </g>

                  {/* Upper Right Cola */}
                  <g transform="translate(270, 135)">
                    <ellipse cx="0" cy="0" rx="14" ry="18" fill={plant.strain.colorTheme || '#15803d'} opacity="0.95" />
                    <circle cx="4" cy="-4" r="7" fill="#14532d" />
                    <circle cx="-4" cy="2" r="6" fill="#166534" />
                    <path d="M 8 -10 Q 14 -18 10 -24" stroke="#f97316" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                    <path d="M -4 -8 Q -10 -16 -6 -22" stroke="#f59e0b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    <circle cx="0" cy="-2" r="1.5" fill="#fff" className="animate-trichome-sparkle" />
                  </g>

                  {/* MASSIVE APICAL CROWN COLA (PUNTA PRINCIPAL RESINOSA) */}
                  <g transform="translate(210, 98)">
                    {/* Background Cola Mass */}
                    <path 
                      d="M -26 35 C -35 20, -32 -10, -18 -35 C -10 -48, 10 -48, 18 -35 C 32 -10, 35 20, 26 35 Z" 
                      fill={plant.strain.colorTheme || '#1b4332'} 
                      opacity="0.95"
                    />

                    {/* Swollen Calyx / Bract Layers (Stacked Floral Cones) */}
                    <ellipse cx="0" cy="24" rx="28" ry="16" fill="#14532d" />
                    <ellipse cx="0" cy="6" rx="24" ry="15" fill="#166534" />
                    <ellipse cx="0" cy="-12" rx="20" ry="14" fill="#15803d" />
                    <ellipse cx="0" cy="-28" rx="14" ry="12" fill="#16a34a" />
                    <circle cx="0" cy="-42" r="8" fill="#22c55e" />

                    {/* Sugar Leaves radiating from inside the Cola */}
                    <path d="M -18 15 L -42 12 L -20 22 Z" fill="#22c55e" stroke="#15803d" strokeWidth="0.8" />
                    <path d="M 18 15 L 42 12 L 20 22 Z" fill="#22c55e" stroke="#15803d" strokeWidth="0.8" />
                    <path d="M -14 -4 L -36 -12 L -16 4 Z" fill="#4ade80" stroke="#16a34a" strokeWidth="0.8" />
                    <path d="M 14 -4 L 36 -12 L 16 4 Z" fill="#4ade80" stroke="#16a34a" strokeWidth="0.8" />
                    <path d="M -10 -22 L -28 -34 L -10 -15 Z" fill="#86efac" stroke="#22c55e" strokeWidth="0.8" />
                    <path d="M 10 -22 L 28 -34 L 10 -15 Z" fill="#86efac" stroke="#22c55e" strokeWidth="0.8" />
                    <path d="M 0 -45 L 0 -62 L 4 -48 Z" fill="#86efac" stroke="#22c55e" strokeWidth="0.8" />

                    {/* Heavy Curly Amber & Fiery Orange Pistils (Stigmas) */}
                    <path d="M -8 -45 Q -18 -60 -12 -70" stroke="#f97316" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <path d="M 6 -46 Q 16 -58 10 -68" stroke="#ea580c" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <path d="M -14 -32 Q -28 -42 -22 -52" stroke="#ea580c" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    <path d="M 15 -30 Q 28 -40 24 -50" stroke="#f97316" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    <path d="M -18 -8 Q -34 -14 -28 -24" stroke="#f59e0b" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    <path d="M 18 -10 Q 32 -16 26 -26" stroke="#f97316" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                    <path d="M -22 14 Q -38 18 -32 28" stroke="#fb923c" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                    <path d="M 22 14 Q 38 18 32 28" stroke="#ea580c" strokeWidth="1.6" fill="none" strokeLinecap="round" />

                    {/* Sparkling Trichome Resin Frost Layer (Diamond Shimmer) */}
                    <g className="animate-trichome-sparkle">
                      <circle cx="-6" cy="-35" r="2" fill="#ffffff" />
                      <circle cx="8" cy="-32" r="1.8" fill="#ffffff" />
                      <circle cx="-12" cy="-18" r="2.2" fill="#ffffff" />
                      <circle cx="10" cy="-14" r="2" fill="#fef08a" />
                      <circle cx="-4" cy="-5" r="2.5" fill="#ffffff" />
                      <circle cx="5" cy="5" r="2" fill="#ffffff" />
                      <circle cx="-14" cy="8" r="2.2" fill="#fef08a" />
                      <circle cx="16" cy="12" r="2" fill="#ffffff" />
                      <circle cx="0" cy="22" r="2.5" fill="#fef08a" />
                    </g>
                  </g>
                </g>
              )}
            </g>
          )}
        </svg>

        {/* Trichome Close-up 100x Microscope Lens Overlay */}
        {showTrichomeLens && (
          <div className="absolute top-8 right-4 w-60 bg-neutral-900/95 border-2 border-emerald-500 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md z-30 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2.5">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                <Sparkles className="w-4 h-4 text-emerald-300" />
                Lente Macro 100x
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">Resina & THC</span>
            </div>

            {/* Trichome Simulation visual heads */}
            <div className="h-20 w-full rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-around px-2 mb-2.5 relative overflow-hidden">
              {/* Microscopic stalk & head SVG */}
              <div className="flex flex-col items-center">
                {/* Capitate-Stalked Clear Trichome */}
                <div className="w-5 h-5 rounded-full bg-cyan-200/30 border border-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.7)] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                </div>
                <div className="w-1 h-3 bg-neutral-600 rounded-b" />
                <span className="text-[10px] text-cyan-300 font-mono font-bold mt-0.5">{plant.trichomeMaturity.clear}%</span>
                <span className="text-[8px] text-neutral-400">Claros (CBG)</span>
              </div>

              {/* Capitate-Stalked Milky Trichome (Peak THC) */}
              <div className="flex flex-col items-center">
                <div className="w-6 h-6 rounded-full bg-white border-2 border-emerald-400 shadow-[0_0_14px_rgba(255,255,255,1)] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-100" />
                </div>
                <div className="w-1.5 h-3 bg-neutral-500 rounded-b" />
                <span className="text-[11px] text-white font-mono font-bold mt-0.5">{plant.trichomeMaturity.milky}%</span>
                <span className="text-[8px] text-emerald-400 font-bold">Lechosos (THC)</span>
              </div>

              {/* Capitate-Stalked Amber Trichome (CBN Sedative) */}
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-amber-500 border border-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.8)] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-200" />
                </div>
                <div className="w-1 h-3 bg-neutral-600 rounded-b" />
                <span className="text-[10px] text-amber-400 font-mono font-bold mt-0.5">{plant.trichomeMaturity.amber}%</span>
                <span className="text-[8px] text-amber-400">Ámbar (CBN)</span>
              </div>
            </div>

            <div className="text-[10px] text-neutral-300 leading-tight space-y-1">
              <p className="font-mono text-emerald-400 font-semibold">
                {plant.trichomeMaturity.milky > 60 
                  ? '✓ Maduración Pico: Ratio ideal de THC psicoactivo y terpenos aromáticos para extracción Rosin.'
                  : plant.trichomeMaturity.amber > 35
                  ? '⚡ Efecto Sedativo / Corporal: Degradación a CBN aumentada.'
                  : '⏳ Glándulas en expansión: Aumentar PPFD y mantener CO2 alto para engorde de cálices.'}
              </p>
              <div className="flex items-center justify-between text-[9px] text-neutral-400 border-t border-neutral-800 pt-1">
                <span>Terpenos: {topTerpenes(plant.strain.terpenes)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar: Drip & CO2 Status Indicators + Yield */}
      <div className="hud-panel relative z-20 p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Systems status badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <Droplet className="w-4 h-4 text-cyan-400 animate-bounce" />
            <div>
              <span className="text-[9px] text-neutral-500 uppercase block leading-none">Riego Goteo</span>
              <span className="text-cyan-300 font-bold">{plant.soilMoisture}% Sustrato</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono border-l border-neutral-800 pl-3">
            <Wind className="w-4 h-4 text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
            <div>
              <span className="text-[9px] text-neutral-500 uppercase block leading-none">Inyección CO2</span>
              <span className="text-purple-300 font-bold">1200 PPM Activo</span>
            </div>
          </div>
        </div>

        {/* Cycle Progress & Projected Dry Yield */}
        <div className="flex items-center gap-4">
          <div className="w-28 sm:w-36">
            <div className="flex justify-between text-[11px] mb-1 font-mono">
              <span className="text-neutral-400">Maduración</span>
              <span className="text-emerald-400 font-bold">{plant.progressPercent}%</span>
            </div>
            <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${plant.progressPercent}%` }}
              />
            </div>
          </div>

          <div className="border-l border-neutral-800 pl-3 text-right">
            <span className="text-[9px] text-neutral-500 uppercase block font-mono">Rendimiento Estimado</span>
            <span className="text-xs sm:text-sm font-extrabold text-amber-300 font-mono">~{plant.estimatedDryYieldGrams}g Flor</span>
          </div>
        </div>
      </div>
    </div>
  );
};
