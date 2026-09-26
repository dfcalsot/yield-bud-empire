import React, { Suspense, lazy, useState } from 'react';
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
import { GeneticCard } from './GeneticCard';
import { MintCeremony } from './MintCeremony';
import { GeneticCardData, cardFromSeed } from '../utils/nft';
import { Npc, useNpc } from './npc/Npc';
import { NpcMissions } from './missions/NpcMissions';
import { t as tr } from '../i18n';
// three.js is heavy: only fetch it when the Seed Bank tab is opened
const SeedVault = lazy(() => import('./SeedVault').then((m) => ({ default: m.SeedVault })));

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
    currentRoom,
    transactions
  } = useGame();

  const npc = useNpc(tr('¡Hola! Soy el Prof. Rafa. Aquí guardo la genética del mundo. Las landrace rinden el doble en su región de origen: mira el Planeta.'));
  const [mint, setMint] = useState<{ card: GeneticCardData; fee: string; startedAt: number } | null>(null);
  const mintTx = mint ? transactions.find(t => t.timestamp >= mint.startedAt) : undefined;

  const handleBuy = (seed: SeedBankItem) => {
    const startedAt = Date.now();
    if (buySeed(seed.id, selectedCurrency)) {
      npc.speak(seed.seedType === 'Landrace' ? tr('¡Una landrace pura, {name}! Plántala en su región de origen y verás la diferencia.', { name: seed.name }) : tr('¡Buena elección! {name}. Cuida el riego los primeros días.', { name: seed.name }), 'happy');
      setMint({
        card: cardFromSeed(seed, (seedInventory[seed.id] || 0) + seed.seedsPerPack),
        fee: selectedCurrency === 'FLORA' ? tr('Quema {priceFlora} $FLORA', { priceFlora: seed.priceFlora }) : `${seed.priceSol} SOL`,
        startedAt,
      });
    }
  };

  const [selectedFilter, setSelectedFilter] = useState<'all' | 'Feminizada' | 'Autofloreciente' | 'Landrace' | 'Regular' | 'inventory'>('all');
  const [selectedCurrency, setSelectedCurrency] = useState<'FLORA' | 'SOL'>('FLORA');

  npc.tips.current = () => [
    tr('Los híbridos se adaptan a cualquier clima; las landrace exigen su tierra pero rinden mucho más.'),
    tr('Hindu Kush ama Afganistán, Acapulco Gold México, Lamb’s Bread Jamaica… cada región tiene su landrace.'),
    tr('Una semilla se gasta al plantar en una parcela: piensa bien dónde la siembras.'),
    tr('Con un jardinero contratado, tus parcelas se riegan y se abonan solas.'),
    ...(Object.values(seedInventory).reduce((a, q) => a + q, 0) === 0 ? [tr('No tienes semillas. Compra un pack y ve a Outdoor a sembrar.')] : []),
  ];
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
      <div className="hud-panel px-3 pt-3 pb-1"><Npc kind="geneticist" text={tr(npc.say.text)} mood={npc.say.mood} moodKey={npc.say.key} /></div>
      <NpcMissions npc="geneticist" onSay={npc.speak} />
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-neutral-900 to-neutral-950 border border-emerald-500/20 rounded-2xl p-5 sm:p-7 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold uppercase tracking-wider">
                <Dna className="w-3.5 h-3.5 text-emerald-400" />
                {tr('Banco de Semillas Botánico & Genoteca')}
              </span>
              <span className="text-xs text-neutral-500 font-mono hidden sm:inline">
                {tr('Certificación fitosanitaria')}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
              {tr('Bóveda Global de Genéticas de Cannabis')}
            </h1>

            <p className="text-sm text-neutral-300 leading-relaxed">
              {tr('Adquiere genéticas puras Landrace, híbridos estabilizados y automáticas de alto rendimiento. Las compras con')}{' '}<strong className="text-amber-400 font-mono">$FLORA</strong>{' '}{tr('queman ese $FLORA para siempre; las compras con')}{' '}<strong className="text-purple-300 font-mono">SOL</strong>{' '}{tr('usan el saldo SOL de prueba del juego.')}
            </p>
          </div>

          {/* Quick Wallet & Vault Summary Card */}
          <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row md:flex-col gap-3 min-w-[240px]">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-800">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {tr('En tu Bóveda Fría:')}
              </span>
              <span className="font-mono text-emerald-400 font-bold text-sm">
                {tr('{totalSeedsOwned} semillas', { totalSeedsOwned })}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">{tr('Saldo $FLORA:')}</span>
              <span className="font-mono text-amber-300 font-bold">{floraBalance.toLocaleString()} $FLORA</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">{tr('Saldo SOL:')}</span>
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
                {tr('Pagar en $FLORA')}
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
                {tr('Pagar en SOL')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3D cold-storage vault: seeds in vials, thermostat, seed inspector + germination */}
      <Suspense
        fallback={
          <div className="hud-panel h-72 flex items-center justify-center text-xs font-mono text-cyan-200/70 animate-pulse">
            {tr('Enfriando cámara…')}
          </div>
        }
      >
        <SeedVault
          seeds={seedBank}
          inventory={seedInventory}
          onPlant={(id) => {
            const success = plantFromSeedBank(id);
            if (success && onNavigateToCultivation) onNavigateToCultivation();
          }}
        />
      </Suspense>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { id: 'all', label: tr('Todas las Variedades') },
            { id: 'Feminizada', label: tr('Feminizadas (Fotoperiódicas)') },
            { id: 'Autofloreciente', label: tr('Autoflorecientes (Fast)') },
            { id: 'Landrace', label: tr('Landrace Puras') },
            { id: 'Regular', label: tr('Regulares (Breeding)') },
            { id: 'inventory', label: tr('Mis Semillas ({totalSeedsOwned})', { totalSeedsOwned }) }
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
              {tr(tab.label)}
            </button>
          ))}
        </div>

        <div className="text-xs text-neutral-400 flex items-center gap-1 font-mono">
          <span>{tr('Sala activa:')}</span>
          <span className="text-emerald-400 font-bold uppercase">{currentRoom}</span>
        </div>
      </div>

      {/* Seeds Grid: collectible NFT cards */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-5">
        {filteredSeeds.map(seed => {
          const ownedCount = seedInventory[seed.id] || 0;
          const isAffordable = selectedCurrency === 'FLORA' ? floraBalance >= seed.priceFlora : solBalance >= seed.priceSol;

          return (
            <GeneticCard key={seed.id} card={cardFromSeed(seed, ownedCount)} selected={ownedCount > 0}>
              <p className="text-[11px] text-neutral-400 leading-snug line-clamp-2">{tr(seed.description)}</p>
              <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-400" />{tr(seed.breeder)}</span>
                <span>{tr('Dificultad: {difficulty}', { difficulty: tr(seed.difficulty) })}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">{tr('Pack x{seedsPerPack}', { seedsPerPack: seed.seedsPerPack })}</span>
                <span className="font-mono font-bold text-sm">
                  {selectedCurrency === 'FLORA' ? (
                    <span className="text-amber-400 flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-amber-500" />{seed.priceFlora} $FLORA</span>
                  ) : (
                    <span className="text-purple-300 flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-purple-400" />{seed.priceSol} SOL</span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleBuy(seed)}
                  disabled={!isAffordable}
                  className={`w-full py-2 px-2 rounded-xl text-[11px] font-bold font-mono uppercase tracking-wide transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    isAffordable
                      ? selectedCurrency === 'FLORA'
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
                        : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40'
                      : 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {tr('Acuñar pack')}
                </button>

                <button
                  onClick={() => {
                    const success = plantFromSeedBank(seed.id);
                    if (success && onNavigateToCultivation) {
                      onNavigateToCultivation();
                    }
                  }}
                  disabled={ownedCount <= 0}
                  className={`w-full py-2 px-2 rounded-xl text-[11px] font-bold font-mono uppercase tracking-wide transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    ownedCount > 0
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-md shadow-emerald-950'
                      : 'bg-neutral-800/40 text-neutral-600 border border-neutral-800 cursor-not-allowed'
                  }`}
                >
                  <Sprout className="w-3.5 h-3.5" />
                  {ownedCount > 0 ? tr('Sembrar') : tr('Sin semillas')}
                </button>
              </div>
            </GeneticCard>
          );
        })}
      </div>

      {mint && (
        <MintCeremony
          card={mint.card}
          variant="onchain"
          feeText={mint.fee}
          signature={mintTx?.signature}
          slot={mintTx?.blockSlot}
          closeLabel={tr('Ver en mi bóveda')}
          onClose={() => setMint(null)}
        />
      )}

      {/* Botanical Education & Genetic Classes Guide */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-white font-serif text-lg font-bold">
          <Info className="w-5 h-5 text-emerald-400" />
          {tr('Guía Técnica de Genéticas & Selección Botánica')}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-neutral-300 leading-relaxed">
          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/70 space-y-2">
            <h4 className="font-bold text-purple-300 flex items-center gap-1.5 font-mono uppercase">
              <Layers className="w-4 h-4 text-purple-400" />
              {tr('1. Feminizadas Fotoperiódicas')}
            </h4>
            <p className="text-neutral-400">
              {tr('Garantizan 99.9% de plantas hembra productoras de flores y resina mediante reversión con tiosulfato de plata (STS). Requieren 18 horas de luz en vegetativo y estricto 12/12 para florecer.')}
            </p>
          </div>

          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/70 space-y-2">
            <h4 className="font-bold text-amber-300 flex items-center gap-1.5 font-mono uppercase">
              <Zap className="w-4 h-4 text-amber-400" />
              {tr('2. Autoflorecientes (Ruderalis)')}
            </h4>
            <p className="text-neutral-400">
              {tr('Cruces con')}{' '}<em>{tr('Cannabis Ruderalis')}</em>{' '}{tr('siberiano. Florecen automáticamente según la edad de la planta (a los 21-28 días) sin importar el fotoperiodo de luz. Cosechas rápidas en 8-10 semanas.')}
            </p>
          </div>

          <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/70 space-y-2">
            <h4 className="font-bold text-yellow-300 flex items-center gap-1.5 font-mono uppercase">
              <Compass className="w-4 h-4 text-yellow-400" />
              {tr('3. Regulares & Landrace Puras')}
            </h4>
            <p className="text-neutral-400">
              {tr('Contienen machos y hembras en ratio natural 50/50. Son indispensables para el banco de madres/padres y la obtención de polen fértil con el que crear nuevas líneas híbridas F1.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
