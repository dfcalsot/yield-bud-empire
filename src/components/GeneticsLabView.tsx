import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Dna, 
  Flame, 
  Sparkles, 
  ShieldCheck, 
  Share2, 
  ExternalLink, 
  CheckCircle2, 
  Plus, 
  FileCheck,
  Award,
  Crown,
  Scissors,
  Layers,
  Sprout
} from 'lucide-react';
import { Strain } from '../types';
import { GeneticCard } from './GeneticCard';
import { MintCeremony } from './MintCeremony';
import { GeneticCardData, cardFromDonor, cardFromPatent, cardFromStrain } from '../utils/nft';

export const GeneticsLabView: React.FC = () => {
  const {
    strains,
    breedStrains,
    registerPatent,
    patents,
    floraBalance,
    walletAddress,
    mothersFathers,
    takeCloneFromMother,
    collectPollenFromFather,
    hybridizeParents,
    saveCurrentPlantAsMotherOrFather,
    activePlant
  } = useGame();

  const [activeSubTab, setActiveSubTab] = useState<'hibridacion' | 'cruce_rapido' | 'patentes'>('hibridacion');

  // Mint ceremony: a newborn F1 (off-chain) or a freshly registered patent (on-chain)
  const [birth, setBirth] = useState<GeneticCardData | null>(null);
  const [patentMint, setPatentMint] = useState<{ strain: Strain } | null>(null);
  const mintedPatent = patentMint ? patents.find(p => p.strainName === patentMint.strain.name) : undefined;

  // Fast breeding state
  const [parentAId, setParentAId] = useState<string>(strains[0]?.id || '');
  const [parentBId, setParentBId] = useState<string>(strains[1]?.id || strains[0]?.id || '');
  const [newStrainName, setNewStrainName] = useState<string>('Solana Cyber Kush F1');

  // Parents hybridization state
  const mothers = mothersFathers.filter(p => p.role === 'Madre (Esquejes / Clones)');
  const fathers = mothersFathers.filter(p => p.role === 'Padre (Donante de Polen)');
  const [selectedMotherId, setSelectedMotherId] = useState<string>(mothers[0]?.id || '');
  const [selectedFatherId, setSelectedFatherId] = useState<string>(fathers[0]?.id || '');
  const [hybridStrainName, setHybridStrainName] = useState<string>('Apex Trinity F1');

  const parentA = strains.find(s => s.id === parentAId) || strains[0];
  const parentB = strains.find(s => s.id === parentBId) || strains[1] || strains[0];

  const handleBreed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentA || !parentB) return;
    const born = breedStrains(parentA, parentB, newStrainName);
    if (born) setBirth(cardFromStrain(born, 'hybrid'));
    setNewStrainName('');
  };

  const handleHybridize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMotherId || !selectedFatherId || !hybridStrainName.trim()) return;
    const born = hybridizeParents(selectedMotherId, selectedFatherId, hybridStrainName);
    if (born) setBirth(cardFromStrain(born, 'hybrid'));
    setHybridStrainName('');
  };

  // Strains that have not been patented yet
  const unpatentedStrains = strains.filter(s => !s.isPatented);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="hud-panel p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
              Solana Anchor Program: Genómica On-Chain
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              Propiedad Intelectual NFT
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2 font-serif">
            <Dna className="w-5 h-5 text-emerald-400" />
            Laboratorio de Madres, Padres, Hibridación & Patentes
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Preserva plantas madre élite, recolecta polen de sementales seleccionados, genera híbridos F1 con vigor de heterosis y patenta nuevas cepas en Solana.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 px-3.5 py-2 rounded-xl text-xs font-mono">
            <Crown className="w-4 h-4 text-purple-400" />
            <span>Madres/Padres: <strong className="text-white">{mothersFathers.length}</strong></span>
          </div>

          <div className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 px-3.5 py-2 rounded-xl text-xs font-mono">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Patentes: <strong className="text-white">{patents.length}</strong></span>
          </div>
        </div>
      </div>

      {/* Sub-tab switcher */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-800 pb-2">
        <button
          onClick={() => setActiveSubTab('hibridacion')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'hibridacion'
              ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300 font-bold'
              : 'text-neutral-400 hover:text-white bg-neutral-950/60 border border-neutral-800'
          }`}
        >
          <Crown className="w-4 h-4 text-purple-400" />
          <span>Madres, Padres & Hibridación</span>
        </button>

        <button
          onClick={() => setActiveSubTab('cruce_rapido')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'cruce_rapido'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold'
              : 'text-neutral-400 hover:text-white bg-neutral-950/60 border border-neutral-800'
          }`}
        >
          <Dna className="w-4 h-4 text-emerald-400" />
          <span>Cruce Rápido Fenotípico</span>
        </button>

        <button
          onClick={() => setActiveSubTab('patentes')}
          className={`px-4 py-2 rounded-xl text-xs font-mono font-medium transition cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'patentes'
              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold'
              : 'text-neutral-400 hover:text-white bg-neutral-950/60 border border-neutral-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>Registro de Patentes On-Chain</span>
        </button>
      </div>

      {/* SubTab 1: Mothers, Fathers & Hybridization */}
      {activeSubTab === 'hibridacion' && (
        <div className="space-y-6">
          {/* Quick banner if user has an active plant */}
          {activePlant && (
            <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-500/40 flex items-center justify-center">
                  <Sprout className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Planta Activa: {activePlant.strain.name} ({activePlant.stage})</h4>
                  <p className="text-[11px] text-neutral-400">¿Deseas seleccionarla como ejemplar reproductor permanente?</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => saveCurrentPlantAsMotherOrFather('Madre (Esquejes / Clones)')}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>Guardar como Madre</span>
                </button>
                <button
                  onClick={() => saveCurrentPlantAsMotherOrFather('Padre (Donante de Polen)')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Guardar como Padre</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Mother Plants & Father Donors (7 Cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Mother Plants Sanctuary */}
              <div className="hud-panel p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      Santuario de Madres Élite ({mothers.length})
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400">
                    Propagación Asexual / Esquejes
                  </span>
                </div>

                {mothers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500 space-y-2">
                    <p>No tienes plantas madre registradas actualmente.</p>
                    <p className="text-[11px] text-neutral-600">Cultiva una planta y guárdala como madre durante su fase vegetativa.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
                    {mothers.map((mother) => (
                      <GeneticCard key={mother.id} card={cardFromDonor(mother)}>
                        <div className="text-[10px] font-mono text-neutral-400 flex justify-between">
                          <span>Edad: {mother.ageDays} días</span>
                          <span>Gen. {mother.generation}</span>
                        </div>
                        <button
                          onClick={() => takeCloneFromMother(mother.id)}
                          className="w-full px-3 py-2 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-300/40 text-fuchsia-100 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wide transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Scissors className="w-3.5 h-3.5" />
                          <span>Sacar esqueje</span>
                        </button>
                      </GeneticCard>
                    ))}
                  </div>
                )}
              </div>

              {/* Father Plants Sanctuary */}
              <div className="hud-panel p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      Sementales & Donantes de Polen ({fathers.length})
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400">
                    Sacos Polínicos & Fecundación
                  </span>
                </div>

                {fathers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-neutral-500 space-y-2">
                    <p>No tienes padres donantes de polen registrados actualmente.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
                    {fathers.map((father) => (
                      <GeneticCard key={father.id} card={cardFromDonor(father)}>
                        <div className="text-[10px] font-mono text-neutral-400 flex justify-between">
                          <span>Reserva: <strong className="text-cyan-300">{father.pollenGramsCollected || 0}g</strong></span>
                          <span>Gen. {father.generation}</span>
                        </div>
                        <button
                          onClick={() => collectPollenFromFather(father.id)}
                          className="w-full px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-300/40 text-cyan-100 rounded-lg text-[11px] font-mono font-bold uppercase tracking-wide transition cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Recolectar polen</span>
                        </button>
                      </GeneticCard>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: True Hybridization Chamber (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <form onSubmit={handleHybridize} className="hud-panel p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Dna className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      Cámara de Hibridación Cruzada
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">
                    Semillas F1
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Mother select */}
                  <div>
                    <label className="text-neutral-300 font-semibold block mb-1">
                      Planta Madre (Receptora / Caliciformes):
                    </label>
                    <select
                      value={selectedMotherId}
                      onChange={(e) => setSelectedMotherId(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs font-mono"
                    >
                      {mothers.length === 0 && <option value="">(No hay madres registradas)</option>}
                      {mothers.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.strainName ?? m.name} ({m.thcPercentage ?? m.strain.thcPercentage}% THC - Vigor {m.vigorRating ?? 5}/10)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Father select */}
                  <div>
                    <label className="text-neutral-300 font-semibold block mb-1">
                      Planta Padre (Donante de Polen Fértil):
                    </label>
                    <select
                      value={selectedFatherId}
                      onChange={(e) => setSelectedFatherId(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs font-mono"
                    >
                      {fathers.length === 0 && <option value="">(No hay padres registrados)</option>}
                      {fathers.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.strainName ?? f.name} ({f.thcPercentage ?? f.strain.thcPercentage}% THC - {f.pollenGramsCollected || 0}g polen)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Name input */}
                  <div>
                    <label className="text-neutral-300 font-semibold block mb-1">
                      Nombre del Nuevo Híbrido F1:
                    </label>
                    <input
                      type="text"
                      required
                      value={hybridStrainName}
                      onChange={(e) => setHybridStrainName(e.target.value)}
                      placeholder="Ej: Apex Royal Gorilla F1"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-white text-xs font-mono"
                    />
                  </div>

                  <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                    <div className="flex justify-between font-mono text-emerald-400">
                      <span>Vigor Híbrido Heterocigoto:</span>
                      <strong>+15% Crecimiento</strong>
                    </div>
                    <p className="text-neutral-500">
                      La hibridación produce 10 semillas directas enviadas a tu inventario del Banco de Semillas.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={mothers.length === 0 || fathers.length === 0}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-emerald-500 to-purple-600 hover:from-purple-500 hover:to-emerald-400 text-neutral-950 font-bold text-xs shadow-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Dna className="w-4 h-4 text-neutral-950" />
                    <span>Realizar Hibridación & Producir Semillas</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* SubTab 2: Fast Phenotype Breeding */}
      {activeSubTab === 'cruce_rapido' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-4">
            <form onSubmit={handleBreed} className="hud-panel p-5 space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Cruza de Parentales & Fenotipado
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-neutral-400">
                  Generación Filial F1
                </span>
              </div>

              {/* Parent Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Parent A */}
                <div className="space-y-2">
                  <label className="text-xs text-neutral-300 font-semibold block">
                    Parental A (Hembra Polinizada):
                  </label>
                  <select
                    value={parentAId}
                    onChange={(e) => setParentAId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {strains.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.type} - {s.thcPercentage}% THC)
                      </option>
                    ))}
                  </select>

                  {parentA && (
                    <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-1 text-xs">
                      <span className="text-[11px] text-neutral-500 font-mono">Linaje: {parentA.lineage}</span>
                      <div className="flex justify-between text-[11px] font-mono text-emerald-400">
                        <span>THC: {parentA.thcPercentage}%</span>
                        <span>CBD: {parentA.cbdPercentage}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Parent B */}
                <div className="space-y-2">
                  <label className="text-xs text-neutral-300 font-semibold block">
                    Parental B (Donante de Polen):
                  </label>
                  <select
                    value={parentBId}
                    onChange={(e) => setParentBId(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {strains.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.type} - {s.thcPercentage}% THC)
                      </option>
                    ))}
                  </select>

                  {parentB && (
                    <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-1 text-xs">
                      <span className="text-[11px] text-neutral-500 font-mono">Linaje: {parentB.lineage}</span>
                      <div className="flex justify-between text-[11px] font-mono text-purple-400">
                        <span>THC: {parentB.thcPercentage}%</span>
                        <span>CBD: {parentB.cbdPercentage}%</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Projected Hybrid Stats Preview */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <span className="text-[11px] font-mono uppercase text-neutral-400 block">
                  Predicción Genética & Vigor Híbrido (Heterosis):
                </span>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">THC Estimado</span>
                    <strong className="text-emerald-400 font-mono text-xs">
                      ~{(((parentA?.thcPercentage || 20) + (parentB?.thcPercentage || 20)) / 2).toFixed(1)}%
                    </strong>
                  </div>
                  <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Estabilidad Genética</span>
                    <strong className="text-cyan-400 font-mono text-xs">
                      94.8%
                    </strong>
                  </div>
                  <div className="bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
                    <span className="text-[10px] text-neutral-500 block">Multiplicador Resina</span>
                    <strong className="text-amber-400 font-mono text-xs">
                      x{Math.max(parentA?.resinYieldMultiplier || 1.1, parentB?.resinYieldMultiplier || 1.1)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Custom Name */}
              <div className="space-y-1.5">
                <label className="text-xs text-neutral-300 font-semibold block">
                  Nombre de la Nueva Genética:
                </label>
                <input
                  type="text"
                  required
                  value={newStrainName}
                  onChange={(e) => setNewStrainName(e.target.value)}
                  placeholder="Ej: Solana Neon Sunset F1"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 hover:from-emerald-500 hover:to-emerald-400 text-neutral-950 font-bold text-xs shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Sintetizar y Añadir Semilla al Banco Genético</span>
              </button>
            </form>
          </div>

          <div className="hud-panel lg:col-span-5 p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200 font-mono">
              Genéticas Activas en Laboratorio
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {strains.map(s => (
                <div key={s.id} className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-white block">{s.name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">{s.type} • {s.difficulty}</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">{s.thcPercentage}% THC</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SubTab 3: Solana Patent Registry */}
      {activeSubTab === 'patentes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 space-y-4">
            <div className="hud-panel p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Registro de Patente On-Chain
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  Quema 250 $FLORA
                </span>
              </div>

              <p className="text-xs text-neutral-400 leading-relaxed">
                Patentar una cepa la convierte en un título de propiedad intelectual único en Solana, otorgando derechos de obtentor en el multiverso botánico y regalías comerciales.
              </p>

              {/* List of unpatented strains available to register */}
              <div className="space-y-2.5">
                <span className="text-xs text-neutral-300 font-semibold block">
                  Genéticas Disponibles para Patentar:
                </span>

                {unpatentedStrains.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-3 text-center">
                    Todas tus genéticas actuales ya han sido patentadas en Solana. Cruza nuevos parentales para registrar más.
                  </p>
                ) : (
                  unpatentedStrains.map((strain) => (
                    <div
                      key={strain.id}
                      className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-white">{strain.name}</h4>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          THC: {strain.thcPercentage}% | {strain.type}
                        </span>
                      </div>

                      <button
                        onClick={() => { if (registerPatent(strain)) setPatentMint({ strain }); }}
                        disabled={floraBalance < 250}
                        className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-xs font-semibold rounded-lg transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Flame className="w-3 h-3 text-amber-400" />
                        <span>Patentar (250 $FLORA)</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Active Registered Patents Registry */}
          <div className="hud-panel lg:col-span-6 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Títulos On-Chain Emitidos ({patents.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-neutral-400">Anchor ID #441</span>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
              {patents.map((pat) => (
                <GeneticCard key={pat.id} card={cardFromPatent(pat, strains.find(st => st.name === pat.strainName))}>
                  <div className="flex items-center justify-between text-[10px] font-mono border-t border-white/10 pt-2">
                    <span className="text-neutral-400">{pat.patentNumber}</span>
                    <span className="text-emerald-400 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Verificado</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                    <span>Titular: {pat.creatorWallet}</span>
                    <span className="text-amber-400">Quema: {pat.floraBurnedFee}</span>
                  </div>
                </GeneticCard>
              ))}
            </div>
          </div>
        </div>
      )}

      {birth && (
        <MintCeremony card={birth} variant="birth" closeLabel="Continuar" onClose={() => setBirth(null)} />
      )}

      {patentMint && (
        <MintCeremony
          card={cardFromPatent(
            mintedPatent ?? { id: `pending-${patentMint.strain.id}`, strainName: patentMint.strain.name, patentNumber: patentMint.strain.patentId ?? 'SOL-PAT', solanaSignature: '', parentA: '', parentB: '', creatorWallet: '', registeredDate: '', thc: patentMint.strain.thcPercentage, cbd: patentMint.strain.cbdPercentage, dominantTerpene: 'Limoneno y Cariofileno', floraBurnedFee: 250 },
            patentMint.strain,
          )}
          variant="onchain"
          feeText="Quema 250 $FLORA"
          signature={mintedPatent?.solanaSignature || undefined}
          closeLabel="Ver mis títulos"
          onClose={() => setPatentMint(null)}
        />
      )}
    </div>
  );
};
