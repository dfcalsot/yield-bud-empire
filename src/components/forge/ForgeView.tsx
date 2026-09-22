import React, { useEffect, useState } from 'react';
import { Clock, Flame, Hammer, Lock, Minus, Plus, Zap } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { canCraft, craftTotals, FORGE_LIMITS, FORGE_RECIPES, FORGE_RECIPE_BY_ID, MATERIAL_BY_ID, type ForgeFamily, type ForgeRecipe, type MaterialId } from '../../sim/forge';
import { PRODUCT_PRICE } from '../../sim/products';
import { ECON } from '../../sim/economy';
import { formatDuration } from '../../sim/engine';
import { MaterialGlyph, ProductGlyph } from './ForgeIcons';
import { ForgeScene } from './ForgeScene';
import '../hud/hud.css';

const FAMILY: Record<ForgeFamily, { title: string; blurb: string; color: string }> = {
  base: { title: 'Materiales base', blurb: 'Fibra, cera, aceite, resina y más: la despensa de la forja.', color: '#84af28' },
  componente: { title: 'Componentes', blurb: 'Piezas para la Cría de genéticas y el sello del avatar propio.', color: '#c084fc' },
  derivado: { title: 'Derivados para vender', blurb: 'Bálsamos, velas y tinturas para el dispensario.', color: '#fbbf24' },
};

const useNow = (ms: number) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
};

const Chip: React.FC<{ icon: React.ReactNode; label: string; need: number; have: number }> = ({ icon, label, need, have }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] font-mono ${have >= need ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100' : 'border-rose-300/40 bg-rose-500/10 text-rose-200'}`} title={`${label}: tienes ${Math.floor(have * 10) / 10}`}>
    <span aria-hidden className="[&_svg]:w-3 [&_svg]:h-3">{icon}</span>{label} {Number.isInteger(need) ? need : need.toFixed(1)}<span className="opacity-60">/{Math.floor(have * 10) / 10}</span>
  </span>
);

/**
 * The forge: the plant's leftovers (trim, fibre) and a little flower become materials and products. Every craft takes real time and burns
 * a fee; it needs the forge licence and an installation tier. Jobs keep running while you are away and are delivered when they finish.
 */
export const ForgeView: React.FC = () => {
  const { materials, forgeJobs, forgeCraft, rawFlowerGrams, trimGrams, floraBalance, currentFacility, ownsStation, buyAsset, resources } = useGame();
  const now = useNow(1000);
  const [qty, setQty] = useState<Record<string, number>>({});
  const hasForge = ownsStation('forge');
  const q = (r: ForgeRecipe) => qty[r.id] ?? 1;

  return (
    <div className="space-y-5 animate-fade-in" data-testid="forge-view">
      <ForgeScene />
      <div className="hud-panel p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid place-items-center w-11 h-11 rounded-xl bg-amber-400/15 border border-amber-300/40 text-amber-300"><Hammer className="w-6 h-6" /></span>
          <div className="min-w-0">
            <h2 className="font-serif text-xl font-black text-white leading-tight">Forja de materiales</h2>
            <p className="text-[12px] text-neutral-400">Con lo que la planta deja atrás fabricas materiales y derivados. Cada trabajo tarda y quema $FLORA.</p>
          </div>
          {!hasForge && (
            <button type="button" className="ml-auto mk-buy !w-auto !px-4 !py-2 !text-[12px]" onClick={() => buyAsset('lic_forge', 'FLORA')} data-testid="buy-forge">
              <span className="mk-buy-shine" /><Lock className="w-4 h-4" /><span>Comprar licencia</span><span className="ml-1 flex items-center gap-1 font-mono"><Flame className="w-3.5 h-3.5" />250</span>
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-mono" data-testid="forge-stock">
          <span className="px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-emerald-200">🌿 Flor {rawFlowerGrams.toFixed(1)} g</span>
          <span className="px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-lime-200">🍃 Trim {trimGrams.toFixed(1)} g</span>
          <span className="px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-amber-200">🌾 Fibra {materials.fibra_cruda ?? 0}</span>
          <span className="px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-cyan-200"><Zap className="inline w-3 h-3" /> {resources.energy.toFixed(1)} kWh</span>
          <span className="px-2 py-1 rounded-lg bg-black/30 border border-white/10 text-amber-300"><Flame className="inline w-3 h-3" /> {Math.floor(floraBalance)} $FLORA</span>
        </div>
        {!hasForge && <p className="text-[12px] text-amber-200/90">Aún no tienes la <b>licencia de la Forja</b>: cómprala aquí (250 $FLORA) o en el Grow Market → Licencias. Pide una instalación de nivel 2 o más para casi todas las recetas.</p>}
      </div>

      {forgeJobs.length > 0 && (
        <section className="hud-panel p-4 space-y-2" data-testid="forge-jobs">
          <h3 className="text-[11px] font-mono uppercase tracking-[0.18em] text-neutral-400">En marcha · {forgeJobs.length}/{FORGE_LIMITS.jobs}</h3>
          {forgeJobs.map((j) => {
            const r = FORGE_RECIPE_BY_ID[j.recipeId]; if (!r) return null;
            const pct = Math.max(0, Math.min(100, ((now - j.startedAt) / Math.max(1, j.endsAt - j.startedAt)) * 100));
            return (
              <div key={j.id} className="space-y-1" data-forge-job={j.recipeId}>
                <div className="flex items-center justify-between text-[12px]"><span className="text-white font-semibold">{r.name} ×{j.qty}</span><span className="font-mono text-amber-200 flex items-center gap-1"><Clock className="w-3 h-3" />{j.endsAt <= now ? 'entregando…' : formatDuration(Math.ceil((j.endsAt - now) / 1000))}</span></div>
                <div className="fp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}><i style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </section>
      )}

      {(['base', 'componente', 'derivado'] as ForgeFamily[]).map((fam) => (
        <section key={fam} className="space-y-2" data-forge-family={fam}>
          <div className="flex items-baseline gap-2"><h3 className="font-serif text-base font-black tracking-wide" style={{ color: FAMILY[fam].color }}>{FAMILY[fam].title}</h3><span className="text-[11px] text-neutral-500">{FAMILY[fam].blurb}</span></div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {FORGE_RECIPES.filter((r) => r.family === fam).map((r) => {
              const n = q(r);
              const t = craftTotals(r, n);
              const check = canCraft({ flower: rawFlowerGrams, trim: trimGrams, materials, flora: floraBalance, tier: currentFacility.tier, hasForge, jobs: forgeJobs.length }, r, n);
              const outValue = r.out.product ? Math.round(t.outProductGrams * PRODUCT_PRICE[r.out.product.type] * ECON.priceScale) : 0;
              return (
                <article key={r.id} className="rounded-2xl border border-white/10 bg-black/30 p-3 space-y-2 flex flex-col" data-recipe={r.id} data-craftable={check.ok ? '1' : '0'} style={{ boxShadow: `inset 0 0 0 1px ${FAMILY[fam].color}22` }}>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-[13.5px] font-bold text-white leading-snug">{r.name}</h4>
                    <span className="text-[10px] font-mono text-neutral-400 whitespace-nowrap">Nv.{r.minTier} · {r.minutes} min</span>
                  </div>
                  <p className="text-[11.5px] text-neutral-400 leading-snug">{r.desc}</p>
                  <div className="space-y-1">
                    <div className="text-[9.5px] font-mono uppercase tracking-wider text-neutral-500">Necesita ×{n}</div>
                    <div className="flex flex-wrap gap-1">
                      {t.flower > 0 && <Chip icon="🌿" label="Flor g" need={t.flower} have={rawFlowerGrams} />}
                      {t.trim > 0 && <Chip icon="🍃" label="Trim g" need={t.trim} have={trimGrams} />}
                      {Object.entries(t.materials).map(([id, need]) => <Chip key={id} icon={<MaterialGlyph id={id as MaterialId} />} label={MATERIAL_BY_ID[id as MaterialId].name} need={need as number} have={materials[id as MaterialId] ?? 0} />)}
                    </div>
                    <div className="text-[9.5px] font-mono uppercase tracking-wider text-neutral-500 pt-0.5">Da</div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(t.outMaterials).map(([id, k]) => <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-300/30 bg-amber-400/10 text-[10.5px] font-mono text-amber-100"><span aria-hidden className="[&_svg]:w-3 [&_svg]:h-3"><MaterialGlyph id={id as MaterialId} /></span>{MATERIAL_BY_ID[id as MaterialId].name} ×{k as number}</span>)}
                      {r.out.product && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-300/40 bg-amber-400/10 text-[10.5px] font-mono text-amber-100"><span aria-hidden className="[&_svg]:w-3 [&_svg]:h-3"><ProductGlyph type={r.out.product.type} /></span>{r.out.product.name.replace(/ \(.*\)$/, '')} {t.outProductGrams} g · ≈ {outValue} $FLORA</span>}
                    </div>
                  </div>
                  <div className="mt-auto flex items-center gap-2 pt-1">
                    <div className="flex items-center rounded-lg border border-white/15 bg-black/40">
                      <button type="button" aria-label="Menos" className="px-2 py-1.5 text-neutral-300 hover:text-white cursor-pointer" onClick={() => setQty((s) => ({ ...s, [r.id]: Math.max(1, n - 1) }))}><Minus className="w-3.5 h-3.5" /></button>
                      <span className="w-6 text-center text-[12px] font-mono text-white" data-qty>{n}</span>
                      <button type="button" aria-label="Más" className="px-2 py-1.5 text-neutral-300 hover:text-white cursor-pointer" onClick={() => setQty((s) => ({ ...s, [r.id]: Math.min(FORGE_LIMITS.maxQty, n + 1) }))}><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <button type="button" className={`mk-buy flex-1 !py-2 !text-[11.5px] ${check.ok ? '' : 'is-poor'}`} disabled={!check.ok} onClick={() => forgeCraft(r.id, n)} data-craft={r.id}>
                      <span className="mk-buy-shine" /><Hammer className="w-3.5 h-3.5" /><span>Forjar</span><span className="ml-auto flex items-center gap-1 font-mono"><Flame className="w-3.5 h-3.5" />{t.fee}</span>
                    </button>
                  </div>
                  {!check.ok && <p className="text-[10.5px] text-rose-300/90 leading-snug" data-blocker>{check.message}</p>}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
