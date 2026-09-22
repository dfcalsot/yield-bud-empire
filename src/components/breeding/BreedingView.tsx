import React, { useEffect, useMemo, useState } from 'react';
import { Beaker, Clock, Dna, Flame, Lock, Sparkles } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { BREEDING_LIMITS, breedingCost, canBreed, capGeneration, CROSS_MINUTES, GEN_LABEL } from '../../sim/breeding';
import { MATERIAL_BY_ID, type MaterialId } from '../../sim/forge';
import { MaterialGlyph } from '../forge/ForgeIcons';
import { formatDuration } from '../../sim/engine';
import '../hud/hud.css';

const useNow = (ms: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
};

const Chip: React.FC<{ icon: React.ReactNode; label: string; need: number; have: number }> = ({ icon, label, need, have }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-mono ${have >= need ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100' : 'border-rose-300/40 bg-rose-500/10 text-rose-200'}`}>
    <span aria-hidden className="[&_svg]:w-3 [&_svg]:h-3">{icon}</span>{label} {need}<span className="opacity-60">/{have}</span>
  </span>
);

/**
 * Cría: the Cámara de cría turns two sanctuary specimens into a stabilised strain over real hours, with a lineage
 * diary and generation stability (F1 unstable → F4 stable). The Genética tab keeps its instant "cruce rápido" for a
 * quick, lower-yield cross with no chamber — this tab is the deep path that follows.
 */
export const BreedingView: React.FC = () => {
  const {
    mothersFathers, breedingJobs, breedingLog, crossBreed, hybridizeParents,
    materials, floraBalance, currentFacility, ownsStation, buyAsset, staffMods,
  } = useGame();
  const now = useNow(1000);
  const hasChamber = ownsStation('breeding');
  const mothers = mothersFathers.filter(p => p.role === 'Madre (Esquejes / Clones)');
  const fathers = mothersFathers.filter(p => p.role === 'Padre (Donante de Polen)');

  const [motherId, setMotherId] = useState(mothers[0]?.id ?? '');
  const [fatherId, setFatherId] = useState(fathers[0]?.id ?? '');
  const [name, setName] = useState('');
  const [useReagent, setUseReagent] = useState(false);

  useEffect(() => { if (!mothers.find(m => m.id === motherId)) setMotherId(mothers[0]?.id ?? ''); }, [mothers, motherId]);
  useEffect(() => { if (!fathers.find(f => f.id === fatherId)) setFatherId(fathers[0]?.id ?? ''); }, [fathers, fatherId]);

  const mother = mothers.find(m => m.id === motherId);
  const father = fathers.find(f => f.id === fatherId);
  const generation = mother && father ? capGeneration(Math.max(mother.generation ?? 1, father.generation ?? 1)) : 1;
  const cost = breedingCost(useReagent);
  const check = useMemo(
    () => canBreed({ tier: currentFacility.tier, hasChamber, jobs: breedingJobs.length, materials }, motherId, fatherId, useReagent),
    [currentFacility.tier, hasChamber, breedingJobs.length, materials, motherId, fatherId, useReagent],
  );

  const ParentPicker: React.FC<{ label: string; options: typeof mothers; value: string; onChange: (id: string) => void }> = ({ label, options, value, onChange }) => (
    <label className="block space-y-1">
      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-[12.5px] text-white" data-testid={`cria-pick-${label}`}>
        {options.length === 0 && <option value="">Sin individuos en el Santuario</option>}
        {options.map(o => <option key={o.id} value={o.id}>{o.name} · {o.strain.name}{o.generation ? ` (F${o.generation})` : ''}</option>)}
      </select>
    </label>
  );

  return (
    <div className="space-y-5 animate-fade-in" data-testid="breeding-view">
      <div className="hud-panel p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid place-items-center w-11 h-11 rounded-xl bg-rose-400/15 border border-rose-300/40 text-rose-300"><Dna className="w-6 h-6" /></span>
          <div className="min-w-0">
            <h2 className="font-serif text-xl font-black text-white leading-tight">Cría</h2>
            <p className="text-[12px] text-neutral-400">La Cámara de cría estabiliza genéticas: linaje real, generaciones F1→F4 y un lote de semillas. Tarda horas y consume materiales de la Forja.</p>
          </div>
          {!hasChamber && (
            <button type="button" className="ml-auto mk-buy !w-auto !px-4 !py-2 !text-[12px]" onClick={() => buyAsset('lic_breeding', 'FLORA')} data-testid="buy-breeding">
              <span className="mk-buy-shine" /><Lock className="w-4 h-4" /><span>Comprar Cámara</span><span className="ml-1 flex items-center gap-1 font-mono"><Flame className="w-3.5 h-3.5" />450</span>
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-mono" data-testid="breeding-stock">
          {(['kit_polinizacion', 'bolsa_aislamiento', 'reactivo'] as MaterialId[]).map(id => (
            <Chip key={id} icon={<MaterialGlyph id={id} />} label={MATERIAL_BY_ID[id].name} need={cost[id] ?? 0} have={materials[id] ?? 0} />
          ))}
          <span className="px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-amber-300"><Flame className="inline w-3 h-3" /> {Math.floor(floraBalance)} $FLORA</span>
          {staffMods.seedBonus > 0 && <span className="px-2 py-1 rounded-lg bg-black/30 border border-emerald-300/20 text-emerald-200">🧑‍🌾 +{staffMods.seedBonus} semillas de personal</span>}
        </div>
        {!hasChamber && <p className="text-[12px] text-amber-200/90">Sin la <b>Cámara de cría</b> solo tienes el «Cruce rápido» de Genética (menos semillas, sin linaje real). Cómprala aquí (450 $FLORA) o en el Grow Market → Licencias. Pide instalación de nivel {BREEDING_LIMITS.minTier} o más.</p>}
      </div>

      {breedingJobs.length > 0 && (
        <section className="hud-panel p-4 space-y-2" data-testid="breeding-jobs">
          <h3 className="text-[11px] font-mono uppercase tracking-[0.18em] text-neutral-400">En marcha · {breedingJobs.length}/{BREEDING_LIMITS.jobs}</h3>
          {breedingJobs.map(j => {
            const pct = Math.max(0, Math.min(100, ((now - j.startedAt) / Math.max(1, j.endsAt - j.startedAt)) * 100));
            return (
              <div key={j.id} className="space-y-1" data-breeding-job={j.id}>
                <div className="flex items-center justify-between text-[12px]"><span className="text-white font-semibold">{j.name} · {GEN_LABEL[j.generation]}</span><span className="font-mono text-rose-200 flex items-center gap-1"><Clock className="w-3 h-3" />{j.endsAt <= now ? 'entregando…' : formatDuration(Math.ceil((j.endsAt - now) / 1000))}</span></div>
                <div className="fp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}><i style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </section>
      )}

      <section className="hud-panel p-4 sm:p-5 space-y-3" data-testid="breeding-builder">
        <h3 className="font-serif text-base font-black tracking-wide text-rose-200">Nuevo cruce en cámara</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <ParentPicker label="Madre" options={mothers} value={motherId} onChange={setMotherId} />
          <ParentPicker label="Padre" options={fathers} value={fatherId} onChange={setFatherId} />
        </div>
        <label className="block space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">Nombre de la genética resultante</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={mother && father ? `${mother.strain.name} x ${father.strain.name}` : 'Nombre'} className="w-full rounded-lg border border-white/15 bg-black/40 px-2 py-1.5 text-[12.5px] text-white" data-testid="cria-name" />
        </label>
        <label className="flex items-center gap-2 text-[12px] text-neutral-300">
          <input type="checkbox" checked={useReagent} onChange={(e) => setUseReagent(e.target.checked)} data-testid="cria-reagent" />
          Usar reactivo de germinación (sube la probabilidad de mutación útil)
        </label>
        <div className="text-[11px] text-neutral-400">Generación estimada: <b className="text-white">{GEN_LABEL[generation]}</b> · dura {Math.round(CROSS_MINUTES / 60)} h reales</div>
        <button type="button" className={`mk-buy !w-auto !px-4 !py-2 !text-[12.5px] ${check.ok ? '' : 'is-poor'}`} disabled={!check.ok} onClick={() => crossBreed(motherId, fatherId, name, useReagent)} data-testid="cria-cross">
          <span className="mk-buy-shine" /><Beaker className="w-4 h-4" /><span>Cruzar en cámara</span>
        </button>
        {!check.ok && <p className="text-[10.5px] text-rose-300/90 leading-snug" data-blocker>{check.message}</p>}
      </section>

      <section className="hud-panel p-4 sm:p-5 space-y-2" data-testid="breeding-quick">
        <h3 className="font-serif text-base font-black tracking-wide text-neutral-300 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Cruce rápido (sin cámara)</h3>
        <p className="text-[11.5px] text-neutral-500">Instantáneo, sin materiales ni linaje real: da un F1 fijo de 5 semillas. Úsalo mientras no tengas la cámara, o para probar una combinación.</p>
        <button type="button" className="mk-buy !w-auto !px-4 !py-2 !text-[12px]" disabled={!mother || !father} onClick={() => hybridizeParents(motherId, fatherId, name)} data-testid="cria-quick-cross">
          <span className="mk-buy-shine" /><span>Cruce rápido</span>
        </button>
      </section>

      <section className="space-y-2" data-testid="breeding-log">
        <h3 className="font-serif text-base font-black tracking-wide text-neutral-300">Diario de cría</h3>
        {breedingLog.length === 0 && <p className="text-[12px] text-neutral-500">Todavía no completaste ningún cruce en cámara.</p>}
        <div className="space-y-1.5">
          {breedingLog.map(e => (
            <div key={e.id} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 flex items-center justify-between gap-2 text-[12px]" data-log-entry={e.id}>
              <div className="min-w-0">
                <div className="text-white font-semibold truncate">{e.strainName} <span className="text-neutral-500 font-mono text-[10.5px]">{GEN_LABEL[e.generation]}</span></div>
                <div className="text-neutral-500 text-[11px] truncate">{e.label}{e.mutated ? ' · mutación' : ''}</div>
              </div>
              <span className="font-mono text-emerald-200 text-[11px] whitespace-nowrap">🌰 {e.seeds}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
