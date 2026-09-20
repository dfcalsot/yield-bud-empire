import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  FlaskConical, 
  Droplets, 
  Sparkles, 
  CheckCircle2, 
  Activity, 
  Info, 
  Flame, 
  Beaker, 
  Gauge, 
  ShieldCheck, 
  Zap,
  Leaf
} from 'lucide-react';
import { NutrientBrand } from '../types';

export const NutrientTablesView: React.FC = () => {
  const { 
    nutrientBrands, 
    selectedNutrientBrand, 
    setSelectedNutrientBrand, 
    applyNutrientStage, 
    activePlant 
  } = useGame();

  const currentBrand = nutrientBrands.find(b => b.id === selectedNutrientBrand) || nutrientBrands[0];
  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="hud-panel p-5 sm:p-7 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold uppercase tracking-wider">
                <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />
                Dosificación Fito-Nutricional & Tablas N-P-K
              </span>
              <span className="text-xs text-neutral-500 font-mono">
                Grado Agrícola Profesional
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
              Tablas de Nutrición por Etapa Botánica
            </h1>

            <p className="text-sm text-neutral-300 leading-relaxed">
              Consulta las fórmulas químicas recomendadas desde la germinación y plántula hasta el engorde de tricomas y lavado final. Selecciona tu marca de fertilizantes y aplica las dosis directamente a tu cultivo.
            </p>
          </div>

          {/* Active Plant Live Calibration Status */}
          <div className="bg-neutral-950/90 border border-neutral-800 rounded-xl p-4 flex flex-col gap-2.5 min-w-[240px]">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-800">
              <span className="text-neutral-400">Planta en Cultivo:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {activePlant ? activePlant.strain.name : 'Sin planta'}
              </span>
            </div>

            {activePlant ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Nutrición Actual:</span>
                  <span className="font-mono text-neutral-200 text-[11px] font-semibold">
                    {activePlant.nutrientBrand || currentBrand.name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Electroconductividad (EC):</span>
                  <span className="font-mono text-cyan-400 font-bold">{activePlant.ecLevel} mS/cm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400">Potencial Hidrógeno (pH):</span>
                  <span className="font-mono text-emerald-400 font-bold">{activePlant.phLevel} pH</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-500 italic">
                Siembra una semilla para aplicar estas tablas de nutrición en tiempo real.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Brand Selector Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Selecciona Marca & Programa de Nutrientes
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nutrientBrands.map(brand => {
            const isSelected = brand.id === currentBrand.id;
            return (
              <div
                key={brand.id}
                onClick={() => setSelectedNutrientBrand(brand.id)}
                className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between space-y-3 shadow-md ${
                  isSelected
                    ? 'bg-neutral-900 border-emerald-500/60 ring-2 ring-emerald-500/20'
                    : 'bg-neutral-900/50 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/80'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-neutral-500 text-[11px]">
                      {brand.line}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
                      {brand.category}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white flex items-center justify-between">
                    {brand.name}
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </h4>

                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {brand.description}
                  </p>
                </div>

                <div className="text-[11px] font-mono text-neutral-500 pt-2 border-t border-neutral-800/80">
                  {brand.stages.length} Etapas Formuladas (Plántula a Cosecha)
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feeding Chart Stages for Selected Brand */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div>
            <h3 className="text-lg font-bold text-white font-serif flex items-center gap-2">
              <Droplets className="w-5 h-5 text-cyan-400" />
              Tabla Nutricional Oficial: {currentBrand.name}
            </h3>
            <p className="text-xs text-neutral-400">
              Dosificaciones estandarizadas en ml/L para agua de ósmosis inversa (EC base 0.0 - 0.2)
            </p>
          </div>

          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 self-start sm:self-auto">
            Categoría: {currentBrand.category}
          </span>
        </div>

        {/* Stage Timeline Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {currentBrand.stages.map((stage, idx) => (
            <div
              key={idx}
              className="hud-panel p-5 flex flex-col justify-between space-y-4 shadow-lg hover:border-neutral-700 transition"
            >
              {/* Header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-mono uppercase text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Etapa {idx + 1}
                  </span>
                  <span className="font-mono text-neutral-400 text-xs">
                    Balance N-P-K: <strong className="text-neutral-200">{stage.recommendedNpk || stage.npkRatio || 'Equilibrado'}</strong>
                  </span>
                </div>

                <h4 className="text-base font-bold text-white pt-1">
                  {stage.stageName}
                </h4>

                <p className="text-xs text-neutral-400">
                  {stage.instructions || stage.description || ''}
                </p>
              </div>

              {/* Targets (pH, EC, PPM) */}
              <div className="grid grid-cols-3 gap-2 bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-xs font-mono text-center">
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase">Rango pH</span>
                  <span className="text-emerald-400 font-bold">{stage.targetPh}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase">EC Objetivo</span>
                  <span className="text-cyan-400 font-bold">{stage.targetEc}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px] uppercase">PPM (500 scale)</span>
                  <span className="text-purple-400 font-bold">{stage.targetPpm500 || stage.targetPpm || '800-1100'}</span>
                </div>
              </div>

              {/* Exact Products and Dosages */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[11px] text-neutral-400 font-mono block">
                  Mezcla de Botellas por Litro de Agua:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {(stage.dosageMlPerLiter || []).map((dose, dIdx) => (
                    <div
                      key={dIdx}
                      className="bg-neutral-950/60 px-2.5 py-1.5 rounded-lg border border-neutral-800/80 flex items-center justify-between text-[11px] font-mono"
                    >
                      <span className="text-neutral-300 truncate max-w-[140px]">{dose.productName}</span>
                      <span className="text-emerald-400 font-bold shrink-0">{dose.mlPerL} ml/L</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => applyNutrientStage(idx)}
                disabled={!activePlant}
                className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold font-mono transition cursor-pointer flex items-center justify-center gap-2 ${
                  activePlant
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold shadow-md shadow-emerald-950'
                    : 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed'
                }`}
              >
                <Beaker className="w-4 h-4" />
                {activePlant ? `Dosificar & Aplicar a ${activePlant.strain.name}` : 'Siembra una planta para dosificar'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Advanced Agronomy: N-P-K & Nutrient Lockout Explanation */}
      <div className="hud-panel p-6 space-y-4">
        <div className="flex items-center gap-2 text-white font-serif text-lg font-bold">
          <Info className="w-5 h-5 text-cyan-400" />
          Fundamentos Científicos de Nutrición y Bloqueo de Minerales
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-neutral-300 leading-relaxed">
          <div className="space-y-2 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
            <h5 className="font-bold text-emerald-400 font-mono uppercase flex items-center gap-1.5">
              <Leaf className="w-4 h-4 text-emerald-400" />
              La Curva de Demanda N-P-K
            </h5>
            <p className="text-neutral-400">
              Durante la fase vegetativa, el <strong>Nitrógeno (N)</strong> es el catalizador de la clorofila y la estructura celular. En la fase de floración, el Nitrógeno debe reducirse bruscamente mientras se disparan las demandas de <strong>Fósforo (P)</strong> para la energía del ATP floral y <strong>Potasio (K)</strong> para la biosíntesis de azúcares, cannabinoides y maduración de cálices.
            </p>
          </div>

          <div className="space-y-2 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
            <h5 className="font-bold text-amber-400 font-mono uppercase flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-amber-400" />
              Prevención del Bloqueo (Nutrient Lockout)
            </h5>
            <p className="text-neutral-400">
              Si el pH del sustrato se desvía por debajo de 5.5 o por encima de 6.8, los iones de Calcio, Magnesio, Hierro y Fósforo se precipitan químicamente y quedan inaccesibles para los pelos radiculares, causando deficiencias aparentes a pesar de que el sustrato esté sobrefertilizado. Mantener el pH exacto (5.8 a 6.2) previene la acumulación tóxica de sales y maximiza la biosíntesis de resina.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
