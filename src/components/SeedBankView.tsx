import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Sparkles, 
  Sprout, 
  Coins, 
  Flame, 
  ShieldCheck, 
  Dna, 
  Info, 
  CheckCircle2, 
  Clock, 
  Weight, 
  Zap, 
  Compass, 
  Layers
} from 'lucide-react';
import { SeedBankItem } from '../types';
import { SeedVault } from './SeedVault';

interface SeedBankViewProps {
  onNavigateToCultivation?: () => void;
}

export const SeedBankView: React.FC<SeedBankViewProps> = ({ onNavigateToCultivation }) => {
  const { 
    seedBank, 
    seedInventory, 
    buySeed, 
    plantFromSeedBank, 
    floraBalance, 
    solBalance,
    currentRoom
  } = useGame();

  const [selectedFilter, setSelectedFilter] = useState<'all' | 'Feminizada' | 'Autofloreciente' | 'Landrace' | 'Regular' | 'inventory'>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<'FLORA' | 'SOL'>('FLORA');

  const totalSeedsOwned = Object.values(seedInventory).reduce((acc, qty) => acc + qty, 0);

  const filteredSeeds = seedBank.filter(seed => {
    if (selectedFilter === 'inventory') {
      return (seedInventory[seed.id] || 0) > 0;
    }
    if (selectedFilter === 'all') return true;
    return seed.seedType === selectedFilter;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-neutral-900 to-neutral-950 border border-emerald-500/20 rounded-2xl p-5 sm:p-7 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold uppercase tracking-wider">
                <Dna className="w-3.5 h-3.5 text-emerald-400" />
                Banco de Semillas Botánico & Genoteca
              </span>
              <span className="text-xs text-neutral-500 font-mono hidden sm:inline">
                Certificación Fito-Onchain
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
              Bóveda Global de Genéticas de Cannabis
            </h1>

            <p className="text-sm text-neutral-300 leading-relaxed">
              Adquiere genéticas puras Landrace, híbridos estabilizados y automáticas de alto rendimiento. Las compras con <strong className="text-amber-400 font-mono">$FLORA</strong> ejecutan quema deflacionaria on-chain; las compras con <strong className="text-purple-300 font-mono">SOL</strong> liquidan en el pool botánico descentralizado.
            </p>
          </div>

          {/* Quick Wallet & Vault Summary Card */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row md:flex-col gap-3 min-w-[240px]">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-800">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                En tu Bóveda Fría:
              </span>
              <span className="font-mono text-emerald-400 font-bold text-sm">
                {totalSeedsOwned} semillas
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

            {/* Currency selector toggle */}
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

      {/* 3D cold-storage vault: seeds in vials, thermostat, seed inspector + germination */}
      <SeedVault
        seeds={seedBank}
        inventory={seedInventory}
        onPlant={(id) => {
          const success = plantFromSeedBank(id);
          if (success && onNavigateToCultivation) onNavigateToCultivation();
        }}
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { id: 'all', label: 'Todas las Variedades' },
            { id: 'Feminizada', label: 'Feminizadas (Fotoperiódicas)' },
            { id: 'Autofloreciente', label: 'Autoflorecientes (Fast)' },
            { id: 'Landrace', label: 'Landrace Puras' },
            { id: 'Regular', label: 'Regulares (Breeding)' },
            { id: 'inventory', label: `Mis Semillas (${totalSeedsOwned})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg border transition cursor-pointer font-medium ${
                selectedFilter === tab.id
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                  : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-neutral-400 flex items-center gap-1 font-mono">
          <span>Sala activa:</span>
          <span className="text-emerald-400 font-bold uppercase">{currentRoom}</span>
        </div>
      </div>

      {/* Seeds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSeeds.map(seed => {
          const ownedCount = seedInventory[seed.id] || 0;
          const isAffordable = selectedCurrency === 'FLORA' ? floraBalance >= seed.priceFlora : solBalance >= seed.priceSol;

          return (
            <div 
              key={seed.id}
              className="bg-neutral-900/70 border border-neutral-800 hover:border-neutral-700 transition rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-lg group relative"
            >
              {/* Top Row: Breeder & Seed Type */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400 font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    {seed.breeder}
                  </span>

                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    seed.seedType === 'Feminizada'
                      ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                      : seed.seedType === 'Autofloreciente'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      : seed.seedType === 'Landrace'
                      ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  }`}>
                    {seed.seedType}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition">
                    {seed.name}
                  </h3>
                  {ownedCount > 0 && (
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      En posesión: {ownedCount}
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-400 line-clamp-2">
                  {seed.description}
                </p>

                <div className="text-[11px] font-mono text-neutral-500">
                  Linaje: <span className="text-neutral-300">{seed.lineage}</span>
                </div>
              </div>

              {/* Cannabinoid & Botanical Specs */}
              <div className="bg-neutral-950/80 p-3 rounded-xl border border-neutral-800/80 space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">THC Potencia:</span>
                    <span className="font-mono text-emerald-400 font-bold">{seed.thcPercentage}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">CBD Ratio:</span>
                    <span className="font-mono text-cyan-400 font-bold">{seed.cbdPercentage}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-neutral-400" />
                      Floración:
                    </span>
                    <span className="font-mono text-neutral-300">{seed.floweringWeeks} sem</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500 flex items-center gap-1">
                      <Weight className="w-3 h-3 text-neutral-400" />
                      Rendimiento:
                    </span>
                    <span className="font-mono text-neutral-300">~{seed.yieldGramsPerPlant}g</span>
                  </div>
                </div>

                {/* Terpene Tags */}
                <div className="pt-2 border-t border-neutral-900 flex flex-wrap gap-1">
                  {seed.dominantTerpenes.map(terp => (
                    <span key={terp} className="text-[10px] bg-neutral-900 px-1.5 py-0.5 rounded text-neutral-400 border border-neutral-800 font-mono">
                      #{terp}
                    </span>
                  ))}
                  <span className="text-[10px] ml-auto px-1.5 py-0.5 rounded text-neutral-400 font-mono bg-neutral-900">
                    Dificultad: {seed.difficulty}
                  </span>
                </div>
              </div>

              {/* Purchase & Action Controls */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Pack de {seed.seedsPerPack}x semillas:</span>
                  <span className="font-mono font-bold text-sm">
                    {selectedCurrency === 'FLORA' ? (
                      <span className="text-amber-400 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-amber-500" />
                        {seed.priceFlora} $FLORA
                      </span>
                    ) : (
                      <span className="text-purple-300 flex items-center gap-1">
                        <Coins className="w-3.5 h-3.5 text-purple-400" />
                        {seed.priceSol} SOL
                      </span>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => buySeed(seed.id, selectedCurrency)}
                    disabled={!isAffordable}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-semibold font-mono transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      isAffordable
                        ? selectedCurrency === 'FLORA'
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                          : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40'
                        : 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Comprar Pack
                  </button>

                  <button
                    onClick={() => {
                      const success = plantFromSeedBank(seed.id);
                      if (success && onNavigateToCultivation) {
                        onNavigateToCultivation();
                      }
                    }}
                    disabled={ownedCount <= 0}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-semibold font-mono transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      ownedCount > 0
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold shadow-md shadow-emerald-950'
                        : 'bg-neutral-800/40 text-neutral-600 border border-neutral-800 cursor-not-allowed'
                    }`}
                  >
                    <Sprout className="w-3.5 h-3.5" />
                    {ownedCount > 0 ? 'Sembrar Ahora' : 'Sin Semillas'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Botanical Education & Genetic Classes Guide */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-white font-serif text-lg font-bold">
          <Info className="w-5 h-5 text-emerald-400" />
          Guía Técnica de Genéticas & Selección Botánica
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-300 leading-relaxed">
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/70 space-y-2">
            <h4 className="font-bold text-purple-300 flex items-center gap-1.5 font-mono uppercase">
              <Layers className="w-4 h-4 text-purple-400" />
              1. Feminizadas Fotoperiódicas
            </h4>
            <p className="text-neutral-400">
              Garantizan 99.9% de plantas hembra productoras de flores y resina mediante reversión con tiosulfato de plata (STS). Requieren 18 horas de luz en vegetativo y estricto 12/12 para florecer.
            </p>
          </div>

          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/70 space-y-2">
            <h4 className="font-bold text-amber-300 flex items-center gap-1.5 font-mono uppercase">
              <Zap className="w-4 h-4 text-amber-400" />
              2. Autoflorecientes (Ruderalis)
            </h4>
            <p className="text-neutral-400">
              Cruces con <em>Cannabis Ruderalis</em> siberiano. Florecen automáticamente según la edad de la planta (a los 21-28 días) sin importar el fotoperiodo de luz. Cosechas rápidas en 8-10 semanas.
            </p>
          </div>

          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/70 space-y-2">
            <h4 className="font-bold text-yellow-300 flex items-center gap-1.5 font-mono uppercase">
              <Compass className="w-4 h-4 text-yellow-400" />
              3. Regulares & Landrace Puras
            </h4>
            <p className="text-neutral-400">
              Contienen machos y hembras en ratio natural 50/50. Son indispensables para el banco de madres/padres y la obtención de polen fértil con el que crear nuevas líneas híbridas F1 on-chain.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
