import React, { useEffect, useMemo, useState } from 'react';
import { Briefcase, Crown, Droplets, FlaskConical, Globe2, Package, Search, Sprout, Wrench, X, Zap, Recycle, Sparkles, Users } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { CATALOG_BY_ID, CATEGORY_LABEL, RARITY_BY_TIER, garbageOf, pestStock, repairCostOf, type OwnedAsset } from '../../economy/catalog';
import { ItemArt } from '../market/ItemArt';
import { GeneticCard } from '../GeneticCard';
import { AvatarArt } from '../profile/AvatarArt';
import { RARITY_STYLE } from '../game/GameUI';
import { cardFromDonor, cardFromPatent, cardFromSeed } from '../../utils/nft';
import { DESIGN_BY_ID } from '../../sim/avatars';
import { REGION_BY_ID } from '../../sim/terroir';
import { landRarity } from '../../sim/lands';
import { RosterPanel } from '../staff/RosterPanel';
import { StaffPortrait } from '../staff/StaffCard';
import { ListNftButton } from '../market/ListNft';
import { ROLE_INFO } from '../../sim/staff';
import { Tag, Hammer } from 'lucide-react';
import { MATERIALS, type MaterialId } from '../../sim/forge';

/**
 * The player's briefcase: everything they own in one place, grouped into six tabs, searchable, with the quick actions
 * that make sense for each thing (equip / repair / recycle, plant a seed, sell a batch, open the plot).
 * It only reads existing game state; the actions are the same ones the other screens call.
 */
type Match = ((...xs: Array<string | undefined>) => boolean) & { searching: boolean };
type TabId = 'recursos' | 'equipo' | 'semillas' | 'cosecha' | 'materiales' | 'genetica' | 'coleccion' | 'plantilla';

const SEEN_KEY = 'ybe_bag_seen_at';
const readSeen = () => { try { return Number(localStorage.getItem(SEEN_KEY)) || 0; } catch { return 0; } };
const writeSeen = (t: number) => { try { localStorage.setItem(SEEN_KEY, String(t)); } catch { /* private mode */ } };

/** how many things the player carries (for the badge) */
export const useBagCount = (): number => {
  const { assets, seedInventory, processedProducts, avatars, mothersFathers, patents, plots, staff } = useGame();
  const seeds = Object.values(seedInventory).reduce((a, b) => a + (b > 0 ? 1 : 0), 0);
  return assets.length + seeds + processedProducts.length + avatars.length + mothersFathers.length + patents.length + plots.length + staff.length;
};

export const BriefcaseDrawer: React.FC<{ open: boolean; onClose: () => void; onNavigate: (tab: string) => void; initialTab?: string }> = ({ open, onClose, onNavigate, initialTab }) => {
  const g = useGame();
  const [tab, setTab] = useState<TabId>('recursos');
  const [q, setQ] = useState('');
  const [seenAt, setSeenAt] = useState(0);

  useEffect(() => { if (open && initialTab && ['recursos', 'equipo', 'semillas', 'cosecha', 'materiales', 'genetica', 'coleccion', 'plantilla'].includes(initialTab)) setTab(initialTab as TabId); }, [open, initialTab]);
  useEffect(() => {
    if (open) { setSeenAt(readSeen()); return; }
    writeSeen(Date.now());
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const norm = q.trim().toLowerCase();
  const match: Match = Object.assign((...xs: Array<string | undefined>) => !norm || xs.some((x) => x?.toLowerCase().includes(norm)), { searching: !!norm });

  const equipment = g.assets.filter((a) => CATALOG_BY_ID[a.catalogId]?.kind !== 'consumable');
  const consumables = g.assets.filter((a) => CATALOG_BY_ID[a.catalogId]?.kind === 'consumable');
  const seedRows = useMemo(() => g.seedBank.filter((s) => (g.seedInventory[s.id] ?? 0) > 0), [g.seedBank, g.seedInventory]);
  const counts: Record<TabId, number> = {
    recursos: consumables.length,
    equipo: equipment.length,
    semillas: seedRows.length,
    cosecha: g.processedProducts.length + (g.rawFlowerGrams > 0 ? 1 : 0) + (g.trimGrams > 0 ? 1 : 0),
    materiales: Object.values(g.materials).reduce((n: number, v) => n + (v ?? 0), 0),
    genetica: g.mothersFathers.length + g.patents.length,
    coleccion: g.avatars.reduce((n: number, a: { count: number }) => n + a.count, 0) + g.plots.length + g.staff.length,
    plantilla: g.staff.length,
  };
  const newIn = (list: OwnedAsset[]) => list.filter((a) => a.mintedAt > seenAt && !a.starter).length;

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode; fresh?: number }> = [
    { id: 'recursos', label: 'Recursos', icon: <Droplets className="w-4 h-4" />, fresh: newIn(consumables) },
    { id: 'equipo', label: 'Equipo', icon: <Wrench className="w-4 h-4" />, fresh: newIn(equipment) },
    { id: 'semillas', label: 'Semillas', icon: <Sprout className="w-4 h-4" /> },
    { id: 'cosecha', label: 'Cosecha', icon: <Package className="w-4 h-4" /> },
    { id: 'materiales', label: 'Materiales', icon: <Hammer className="w-4 h-4" /> },
    { id: 'genetica', label: 'Genética', icon: <FlaskConical className="w-4 h-4" /> },
    { id: 'coleccion', label: 'NFT', icon: <Crown className="w-4 h-4" /> },
    { id: 'plantilla', label: 'Plantilla', icon: <Users className="w-4 h-4" /> },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85]" role="dialog" aria-modal="true" aria-label="Maletín del jugador">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <aside className="bag-drawer absolute right-0 top-0 h-full w-full sm:w-[34rem] flex flex-col">
        <header className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/10">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-emerald-400/15 border border-emerald-300/40 text-emerald-300"><Briefcase className="w-5 h-5" /></span>
          <div className="min-w-0">
            <h2 className="font-serif text-lg font-black text-white leading-none">Tu maletín</h2>
            <p className="text-[11px] font-mono text-neutral-400 mt-1">Todo lo que tienes, en un solo lugar · <kbd className="px-1 rounded bg-white/10">I</kbd> abre y cierra</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar maletín" className="ml-auto p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 cursor-pointer"><X className="w-5 h-5" /></button>
        </header>

        <div className="px-4 pt-3">
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 focus-within:border-emerald-300/60">
            <Search className="w-4 h-4 text-neutral-500" aria-hidden />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en tu maletín…" aria-label="Buscar en el maletín" className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 outline-none" />
            {q && <button onClick={() => setQ('')} aria-label="Borrar búsqueda" className="text-neutral-500 hover:text-white cursor-pointer"><X className="w-4 h-4" /></button>}
          </label>
        </div>

        <nav className="flex gap-1 px-3 pt-3 overflow-x-auto scrollbar-none" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-semibold border transition cursor-pointer ${tab === t.id ? 'bg-emerald-400/15 border-emerald-300/50 text-emerald-200' : 'border-transparent text-neutral-400 hover:text-white'}`}>
              {t.icon}{t.label}<span className="font-mono text-[10px] opacity-70">{counts[t.id]}</span>
              {!!t.fresh && <span className="absolute -top-1 -right-0.5 px-1 rounded-full bg-amber-300 text-[9px] font-black text-neutral-950">NUEVO</span>}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {tab === 'recursos' && <ResourcesTab match={match} consumables={consumables} seenAt={seenAt} />}
          {tab === 'equipo' && <EquipmentTab match={match} equipment={equipment} seenAt={seenAt} />}
          {tab === 'semillas' && <SeedsTab match={match} rows={seedRows} onDone={onClose} onNavigate={onNavigate} />}
          {tab === 'cosecha' && <HarvestTab match={match} onNavigate={(t) => { onClose(); onNavigate(t); }} />}
          {tab === 'materiales' && <MaterialsTab match={match} onOpenForge={() => { onClose(); onNavigate('forja'); }} />}
          {tab === 'genetica' && <GeneticsTab match={match} />}
          {tab === 'plantilla' && <RosterPanel onHire={() => { onClose(); onNavigate('market:staff'); }} />}
          {tab === 'coleccion' && <CollectionTab match={match} onOpenPlanet={() => { onClose(); onNavigate('planeta'); }} onOpenRoster={() => setTab('plantilla')} onOpenMarket={() => { onClose(); onNavigate('market:p2p'); }} />}
        </div>
      </aside>
    </div>
  );
};

/* ───────────────────────────── small shared pieces ───────────────────────────── */

const Empty: React.FC<{ icon: React.ReactNode; title: string; hint: string; searching?: boolean; action?: { label: string; onClick: () => void } }> = ({ icon, title: t, hint: h, searching, action }) => {
  const title = searching ? 'Sin coincidencias' : t, hint = searching ? 'Nada de esta pestaña coincide con tu búsqueda. Prueba con otra palabra o borra el filtro.' : h;
  return (
  <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center">
    <div className="mx-auto mb-2 grid place-items-center w-10 h-10 rounded-full bg-white/5 text-neutral-400">{icon}</div>
    <div className="text-sm font-semibold text-white">{title}</div>
    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{hint}</p>
    {!searching && action && <button onClick={action.onClick} className="mt-3 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-400 text-neutral-950 hover:bg-emerald-300 cursor-pointer">{action.label}</button>}
  </div>
  );
};

const Bar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => (
  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))}%`, background: color }} /></div>
);

const Fresh: React.FC = () => <span className="px-1 rounded bg-amber-300 text-[9px] font-black text-neutral-950">NUEVO</span>;

/* ───────────────────────────── tabs ───────────────────────────── */


const ResourcesTab: React.FC<{ match: Match; consumables: OwnedAsset[]; seenAt: number }> = ({ match, consumables, seenAt }) => {
  const { resources, assets, care, recycleGarbage } = useGame();
  const pests = pestStock(assets);
  const rows: Array<{ label: string; value: string; pct: number; color: string; icon: React.ReactNode }> = [
    { label: 'Electricidad', value: `${resources.energy.toFixed(1)} kWh · ${resources.energyDays >= 99 ? '∞' : resources.energyDays.toFixed(1)} d`, pct: Math.min(100, resources.energyDays * 8), color: '#fbbf24', icon: <Zap className="w-3.5 h-3.5 text-amber-300" /> },
    { label: 'Agua', value: `${Math.round(resources.water)} L`, pct: Math.min(100, resources.water / 4), color: '#38bdf8', icon: <Droplets className="w-3.5 h-3.5 text-sky-300" /> },
    { label: 'Abono', value: `${Math.round(resources.nutrient)} ml`, pct: Math.min(100, resources.nutrient / 8), color: '#a78bfa', icon: <FlaskConical className="w-3.5 h-3.5 text-violet-300" /> },
  ].filter((r) => match(r.label));
  const lots = consumables.filter((a) => { const it = CATALOG_BY_ID[a.catalogId]; return it && match(it.name, it.brand, CATEGORY_LABEL[it.category]); }).sort((a, b) => b.mintedAt - a.mintedAt);
  const garbage = garbageOf(assets).length;
  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-black/20 p-3 space-y-2.5">
        {rows.map((r) => (
          <div key={r.label}><div className="flex items-center gap-1.5 text-xs text-neutral-300">{r.icon}{r.label}<span className="ml-auto font-mono text-neutral-100">{r.value}</span></div><div className="mt-1"><Bar value={r.pct} max={100} color={r.color} /></div></div>
        ))}
        {match('plagas', 'tratamientos') && (
          <div className="flex flex-wrap gap-1.5 pt-1 text-[11px] font-mono text-neutral-300">
            {Object.entries(pests).map(([k, ml]) => <span key={k} className="px-2 py-0.5 rounded-full border border-white/10 bg-white/5">🛡 {k}: {Math.round(ml as number)} ml</span>)}
          </div>
        )}
        {match('reciclar', 'basura', 'jardinero') && (
          <div className="flex items-center gap-2 pt-1 text-[11px] text-neutral-400">
            <span>Calificación de jardinero <b className="text-white">{Math.round(care.rating)}%</b></span>
            <button onClick={recycleGarbage} disabled={garbage === 0} className="ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-md border border-white/15 text-neutral-200 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"><Recycle className="w-3.5 h-3.5" />Reciclar{garbage > 0 ? ` (${garbage})` : ''}</button>
          </div>
        )}
      </div>
      {lots.length === 0 ? (
        <Empty searching={match.searching} icon={<Package className="w-5 h-5" />} title="Sin lotes que mostrar" hint="Los lotes de agua, abono, energía y tratamientos que compres aparecen aquí." />
      ) : lots.map((a) => {
        const it = CATALOG_BY_ID[a.catalogId];
        const left = a.remaining ?? 0, full = it.amount ?? 1;
        return (
          <div key={a.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-2.5">
            <span className="mk-bag-art shrink-0"><ItemArt item={it} /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-white truncate">{it.name}{a.mintedAt > seenAt && !a.starter && <Fresh />}</div>
              <div className="text-[10.5px] font-mono text-neutral-400">{it.brand} · {left <= 0.0001 ? 'vacío' : `${+left.toFixed(1)} / ${full} ${it.unit ?? ''}`}</div>
              <div className="mt-1.5"><Bar value={left} max={full} color={left <= 0.0001 ? '#6b7280' : RARITY_STYLE[RARITY_BY_TIER[it.tier]].color} /></div>
            </div>
          </div>
        );
      })}
    </>
  );
};

const EquipmentTab: React.FC<{ match: Match; equipment: OwnedAsset[]; seenAt: number }> = ({ match, equipment, seenAt }) => {
  const { setAssetEquipped, repairAsset, floraBalance } = useGame();
  const list = equipment.filter((a) => { const it = CATALOG_BY_ID[a.catalogId]; return it && match(it.name, it.brand, CATEGORY_LABEL[it.category]); }).sort((a, b) => Number(!!b.equipped) - Number(!!a.equipped) || b.mintedAt - a.mintedAt);
  if (list.length === 0) return <Empty searching={match.searching} icon={<Wrench className="w-5 h-5" />} title="Sin equipo" hint="Lámparas, aire, riego, sensores y licencias de laboratorio aparecen aquí." />;
  return (
    <>{list.map((a) => {
      const it = CATALOG_BY_ID[a.catalogId];
      const color = RARITY_STYLE[RARITY_BY_TIER[it.tier]].color;
      const isLicense = it.kind === 'license';
      const cost = repairCostOf(a);
      const dur = a.durability ?? 100;
      return (
        <div key={a.id} className="flex items-center gap-3 rounded-xl border p-2.5 bg-black/20" style={{ borderColor: `color-mix(in srgb, ${color} 40%, transparent)` }}>
          <span className="mk-bag-art shrink-0"><ItemArt item={it} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-white truncate">{it.name}{a.mintedAt > seenAt && !a.starter && <Fresh />}</div>
            <div className="text-[10.5px] font-mono text-neutral-400 truncate">{it.brand} · {isLicense ? 'licencia' : a.equipped ? 'instalado' : 'en el maletín'}</div>
            {!isLicense && <div className="mt-1.5 flex items-center gap-2"><div className="flex-1"><Bar value={dur} max={100} color={dur > 50 ? '#a3e635' : dur > 20 ? '#fbbf24' : '#f87171'} /></div><span className="text-[10px] font-mono text-neutral-400">{Math.round(dur)}%</span></div>}
          </div>
          {!isLicense && (
            <div className="flex flex-col gap-1 shrink-0">
              <button onClick={() => setAssetEquipped(a.id, !a.equipped)} className="px-2 py-1 rounded-md text-[11px] font-bold border border-white/15 text-neutral-200 hover:bg-white/10 cursor-pointer">{a.equipped ? 'Quitar' : 'Instalar'}</button>
              {dur < 100 && <button onClick={() => repairAsset(a.id)} disabled={floraBalance < cost} title={`Reparar quema ${cost} $FLORA`} className="px-2 py-1 rounded-md text-[11px] font-bold border border-amber-300/40 text-amber-200 hover:bg-amber-300/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">Reparar · {cost}</button>}
            </div>
          )}
        </div>
      );
    })}</>
  );
};

const SeedsTab: React.FC<{ match: Match; rows: ReturnType<typeof useGame>['seedBank']; onDone: () => void; onNavigate: (t: string) => void }> = ({ match, rows, onDone, onNavigate }) => {
  const { seedInventory, plantFromSeedBank } = useGame();
  const list = rows.filter((s) => match(s.name, s.breeder, s.lineage));
  if (list.length === 0) return <Empty searching={match.searching} icon={<Sprout className="w-5 h-5" />} title="Sin semillas" hint="Compra packs en el Banco de Semillas o gana semillas con misiones y cruces." action={{ label: 'Ir al Banco de Semillas', onClick: () => { onDone(); onNavigate('semillas'); } }} />;
  return (
    <div className="grid grid-cols-2 gap-3">
      {list.map((s) => (
        <GeneticCard key={s.id} card={cardFromSeed(s, seedInventory[s.id] ?? 0)} compact>
          <button onClick={() => { if (plantFromSeedBank(s.id)) { onDone(); onNavigate('cultivo'); } }} className="mt-2 w-full px-2 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-400 text-neutral-950 hover:bg-emerald-300 cursor-pointer">Sembrar en Cultivo</button>
        </GeneticCard>
      ))}
    </div>
  );
};

const HarvestTab: React.FC<{ match: Match; onNavigate: (t: string) => void }> = ({ match, onNavigate }) => {
  const { rawFlowerGrams, trimGrams, processedProducts, sellProduct } = useGame();
  const list = processedProducts.filter((p) => match(p.name, p.type, p.strainOrigin));
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {[{ label: 'Flor seca', v: rawFlowerGrams, color: 'text-emerald-300' }, { label: 'Trim / biomasa', v: trimGrams, color: 'text-amber-300' }].filter((x) => match(x.label, 'flor', 'trim')).map((x) => (
          <div key={x.label} className="rounded-2xl border border-white/10 bg-black/20 p-3"><div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">{x.label}</div><div className={`text-2xl font-black font-mono ${x.color}`}>{x.v}<span className="text-sm opacity-70"> g</span></div></div>
        ))}
      </div>
      <button onClick={() => onNavigate('extraccion')} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border border-violet-300/40 text-violet-200 hover:bg-violet-300/10 cursor-pointer"><FlaskConical className="w-4 h-4" />Procesar en Extracción</button>
      {list.length === 0 ? <Empty searching={match.searching} icon={<Package className="w-5 h-5" />} title="Sin lotes procesados" hint="Procesa tu flor en la Planta Industrial para crear lotes que puedas vender." /> : list.map((p) => (
        <div key={p.id} className="rounded-xl border border-white/10 bg-black/20 p-3 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white truncate">{p.name}</div>
            <div className="text-[10.5px] font-mono text-neutral-400">{p.quantityGrams} g · calidad {p.qualityScore}% · {p.potency}{p.certified ? ' · ✔ certificado' : ''}</div>
          </div>
          <button onClick={() => sellProduct(p.id)} className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-300 text-neutral-950 hover:bg-amber-200 cursor-pointer">Vender · {p.marketValueFlora}</button>
        </div>
      ))}
    </>
  );
};

const GeneticsTab: React.FC<{ match: Match }> = ({ match }) => {
  const { mothersFathers, patents, strains } = useGame();
  const donors = mothersFathers.filter((d) => match(d.strain.name, d.role));
  const pats = patents.filter((p) => match(p.strainName, p.patentNumber));
  if (donors.length + pats.length === 0) return <Empty searching={match.searching} icon={<FlaskConical className="w-5 h-5" />} title="Sin genética propia" hint="Guarda plantas como madre o padre, cruza variedades y registra patentes para verlas aquí." />;
  return (
    <div className="grid grid-cols-2 gap-3">
      {donors.map((d) => <GeneticCard key={d.id} card={cardFromDonor(d)} compact />)}
      {pats.map((p) => <GeneticCard key={p.id} card={cardFromPatent(p, strains.find((s) => s.name === p.strainName))} compact />)}
    </div>
  );
};

/** the forge's materials: what you have, where it comes from and what it is for */
const MaterialsTab: React.FC<{ match: Match; onOpenForge: () => void }> = ({ match, onOpenForge }) => {
  const { materials, forgeJobs } = useGame();
  const rows = MATERIALS.filter((m) => (materials[m.id as MaterialId] ?? 0) > 0 && match(m.name, m.use, m.family));
  const total = MATERIALS.reduce((n, m) => n + (materials[m.id as MaterialId] ?? 0), 0);
  return (
    <div className="space-y-3" data-testid="materials-tab">
      <div className="flex items-center justify-between rounded-xl border border-amber-300/25 bg-amber-400/5 px-3 py-2">
        <span className="text-[12px] text-neutral-200">{forgeJobs.length > 0 ? `${forgeJobs.length} trabajo${forgeJobs.length > 1 ? 's' : ''} en la forja` : 'Fabrica más materiales en la Forja'}</span>
        <button type="button" className="sr-btn sr-btn--lime !py-1" onClick={onOpenForge}><Hammer className="w-3.5 h-3.5" />Ir a la Forja</button>
      </div>
      {rows.length === 0 ? (
        <Empty searching={match.searching} icon={<Hammer className="w-5 h-5" />} title={total === 0 ? 'Aún no tienes materiales' : 'Nada coincide con tu búsqueda'} hint="Al cosechar te queda fibra del tallo; con ella y el trim se fabrican cera, tela, papel y más en la Forja." action={{ label: 'Abrir la Forja', onClick: onOpenForge }} />
      ) : rows.map((m) => (
        <div key={m.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3" data-material={m.id}>
          <span className="text-2xl w-9 text-center" aria-hidden>{m.icon}</span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-white truncate">{m.name}</span><span className="block text-[11px] text-neutral-400 leading-snug">{m.use}</span></span>
          <span className="font-mono font-black text-lg text-amber-300" data-material-count>{materials[m.id as MaterialId]}</span>
        </div>
      ))}
    </div>
  );
};

/** every NFT the account owns in one place: lands, staff, avatars, and what is on sale in the player market */
const CollectionTab: React.FC<{ match: Match; onOpenPlanet: () => void; onOpenRoster: () => void; onOpenMarket: () => void }> = ({ match, onOpenPlanet, onOpenRoster, onOpenMarket }) => {
  const { avatars, plots, staff, myListings, cancelListing, ledgerOn } = useGame();
  const av = avatars.filter((a) => { const d = DESIGN_BY_ID[a.designId]; return d && match(d.name, d.rarity); });
  const pl = plots.filter((p) => match(p.name, REGION_BY_ID[p.region]?.name));
  const st = staff.filter((s) => match(s.name, s.rarity));
  const copies = avatars.reduce((n, a) => n + a.count, 0);
  const total = plots.length + staff.length + copies;
  const Head: React.FC<{ title: string; n: number; action?: React.ReactNode }> = ({ title, n, action }) => (
    <div className="flex items-center justify-between pt-1"><h4 className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-neutral-400">{title} <span className="text-neutral-500">· {n}</span></h4>{action}</div>
  );
  if (total + myListings.length === 0) return <Empty searching={match.searching} icon={<Globe2 className="w-5 h-5" />} title="Aún no tienes NFT" hint="Las tierras del Planeta, el personal del Mercado y los avatares de los cofres aparecen aquí, todos juntos." action={{ label: 'Ver el Planeta', onClick: onOpenPlanet }} />;
  return (
    <div className="space-y-4" data-testid="nft-hub">
      <div className="grid grid-cols-4 gap-1.5 text-center" data-testid="nft-summary">
        {[['Total', total, '#fbbf24'], ['Tierras', plots.length, '#38bdf8'], ['Personal', staff.length, '#a3e635'], ['Avatares', copies, '#c084fc']].map(([l, n, c]) => (
          <div key={l as string} className="rounded-xl border border-white/10 bg-black/25 py-1.5"><div className="text-lg font-black font-mono" style={{ color: c as string }}>{n as number}</div><div className="text-[9.5px] font-mono uppercase text-neutral-400">{l as string}</div></div>
        ))}
      </div>

      {myListings.length > 0 && (
        <section className="space-y-1.5" data-testid="nft-listed">
          <Head title="En venta" n={myListings.length} action={<button type="button" className="text-[10.5px] font-mono text-sky-200 underline underline-offset-2 cursor-pointer" onClick={onOpenMarket}>Ver el mercado →</button>} />
          {myListings.map((l) => (
            <div key={l.id} className="flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/5 px-3 py-2 text-[12px]">
              <Tag className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="flex-1 min-w-0 truncate text-neutral-100">{String((l.data as { name?: string }).name ?? l.kind)} <span className="text-neutral-500 font-mono text-[10.5px]">{l.kind}</span></span>
              <span className="font-mono font-bold text-amber-300">{l.price}</span>
              {ledgerOn && <button type="button" className="sr-btn !py-0.5 !text-[10px]" onClick={() => void cancelListing(l.id)}>Retirar</button>}
            </div>
          ))}
        </section>
      )}

      {pl.length > 0 && (
        <section className="space-y-1.5"><Head title="Tierras" n={plots.length} />
          {pl.map((p) => {
            const r = REGION_BY_ID[p.region]; const rar = landRarity(p.landRating); const rc = RARITY_STYLE[rar];
            return (
              <div key={p.id} className="flex items-center gap-2 rounded-xl border bg-black/20 p-2.5" style={{ borderColor: `color-mix(in srgb, ${rc.color} 45%, transparent)` }}>
                <button onClick={onOpenPlanet} className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer hover:brightness-125">
                  <span className="text-2xl">{r?.emoji ?? '🌎'}</span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-white truncate">{p.name} <span className="text-[10px] font-mono" style={{ color: rc.color }}>{rc.label}</span></span><span className="block text-[10.5px] font-mono text-neutral-400 truncate">{r?.name} · calificación {p.landRating}</span></span>
                </button>
                <ListNftButton what={{ nftId: p.id }} name={p.name} rarity={rar} className="sr-btn !py-0.5 !text-[10px]" />
              </div>
            );
          })}
        </section>
      )}

      {st.length > 0 && (
        <section className="space-y-1.5"><Head title="Personal" n={staff.length} action={<button type="button" className="text-[10.5px] font-mono text-sky-200 underline underline-offset-2 cursor-pointer" onClick={onOpenRoster}>Asignar puestos →</button>} />
          {st.map((s) => (
            <div key={s.id} className="flex items-center gap-2.5 rounded-xl border bg-black/20 p-2" style={{ borderColor: `color-mix(in srgb, ${RARITY_STYLE[s.rarity].color} 45%, transparent)` }}>
              <span className="w-11 h-11 rounded-lg overflow-hidden shrink-0"><StaffPortrait staff={s} className="w-full h-full" animated={false} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-white truncate">{s.name}</span><span className="block text-[10.5px] font-mono text-neutral-400 truncate">{ROLE_INFO[s.role].label} · <span style={{ color: RARITY_STYLE[s.rarity].color }}>{RARITY_STYLE[s.rarity].label}</span> · rango {s.rank}</span></span>
              <ListNftButton what={{ nftId: s.id }} name={s.name} rarity={s.rarity} className="sr-btn !py-0.5 !text-[10px]" />
            </div>
          ))}
        </section>
      )}

      {av.length > 0 && (
        <section className="space-y-1.5"><Head title="Avatares" n={copies} />
          <div className="grid grid-cols-3 gap-3">{av.map((a) => {
            const d = DESIGN_BY_ID[a.designId];
            return (
              <div key={a.designId} className="rounded-xl border p-2 text-center bg-black/20 space-y-1" style={{ borderColor: `color-mix(in srgb, ${RARITY_STYLE[d.rarity].color} 45%, transparent)` }}>
                <AvatarArt design={d} className="w-full aspect-square" />
                <div className="text-[11px] font-semibold text-white truncate">{d.name}{a.count > 1 ? ` ×${a.count}` : ''}</div>
                <ListNftButton what={{ designId: d.id }} name={d.name} rarity={d.rarity} className="sr-btn !py-0.5 !text-[10px] w-full justify-center" />
              </div>
            );
          })}</div>
        </section>
      )}
    </div>
  );
};
