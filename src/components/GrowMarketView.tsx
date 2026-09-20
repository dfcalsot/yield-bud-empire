import React, { useMemo, useState } from 'react';
import {
  ShoppingBag, Droplets, Thermometer, Wind, Flame, Coins, Sliders, Zap, Wrench, Package, Info, Sparkles,
  Lightbulb, Snowflake, FlaskConical, Gauge, Sun, KeyRound, Activity, Check,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { HudPanel, NeonButton, RarityFrame, RARITY_STYLE, StatBar } from './game/GameUI';
import { ResourceBar, Bump, fmtRunway } from './ResourceBar';
import {
  CATALOG, CATALOG_BY_ID, CATEGORY_LABEL, RARITY_BY_TIER, AssetCategory, CatalogItem, OwnedAsset, repairCostOf, USE,
} from '../economy/catalog';

type IconType = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
const CAT_ICON: Record<AssetCategory, IconType> = {
  lamp: Lightbulb, ac: Snowflake, irrigation: Droplets, co2: Wind, meter: Gauge, solar: Sun,
  nutrient: FlaskConical, water: Droplets, energy: Zap, license: KeyRound,
};
const CAT_COLOR: Record<AssetCategory, string> = {
  lamp: '#fbbf24', ac: '#67e8f9', irrigation: '#38bdf8', co2: '#34d399', meter: '#a3e635', solar: '#facc15',
  nutrient: '#a78bfa', water: '#38bdf8', energy: '#fbbf24', license: '#f472b6',
};
const CATEGORY_ORDER: AssetCategory[] = ['energy', 'water', 'nutrient', 'lamp', 'ac', 'irrigation', 'solar', 'co2', 'meter', 'license'];

const durColor = (d: number) => (d > 40 ? '#34d399' : d > 15 ? '#fbbf24' : '#f87171');

/** One-line "what does this do to my room" hint shown on shop cards. */
const effectHint = (it: CatalogItem): string | null => {
  if (it.category === 'lamp' && it.watts) return `hasta ${(it.watts / 1000 * 18).toFixed(1)} kWh/día a plena potencia y 18/6`;
  if (it.category === 'ac' && it.acKw) return `≈ ${(it.acKw * 0.5 * 24).toFixed(1)} kWh/día con clima autónomo`;
  if (it.category === 'irrigation') return `${it.pumpKw ? `${(it.pumpKw * 6).toFixed(2)} kWh/día · ` : 'sin electricidad · '}${it.waterEff} L por riego y planta`;
  if (it.category === 'solar' && it.solarKw) return `≈ ${(it.solarKw * 6).toFixed(1)} kWh/día gratis`;
  if (it.category === 'nutrient') return `${USE.nutrientPerPlant} ml por planta y abonado · crecimiento ×${it.feedBonus?.toFixed(2)}`;
  if (it.category === 'water') return `${Math.round((it.amount ?? 0) / USE.waterPerPlantManual)} riegos manuales`;
  if (it.category === 'energy') return `≈ ${((it.amount ?? 0) / 10.8).toFixed(1)} días de una lámpara de 600 W`;
  if (it.category === 'license' && it.stationId) return `${USE.labKwhPerCycle[it.stationId] ?? 0} kWh por ciclo`;
  return null;
};

export const GrowMarketView: React.FC = () => {
  const {
    assets, resources, equipStats, buyAsset, setAssetEquipped, repairAsset, floraBalance, solBalance,
    autoWaterActive, toggleAutoWater, autoClimateActive, toggleAutoClimate, co2Ppm, setCo2Ppm, calibrateMeter,
  } = useGame();

  const [view, setView] = useState<'shop' | 'stock'>('shop');
  const [cat, setCat] = useState<AssetCategory | 'all'>('all');
  const [currency, setCurrency] = useState<'FLORA' | 'SOL'>('FLORA');

  const ownedCount = useMemo(() => {
    const m: Record<string, number> = {};
    assets.forEach((a) => { m[a.catalogId] = (m[a.catalogId] ?? 0) + 1; });
    return m;
  }, [assets]);

  const shopItems = CATALOG.filter((c) => (cat === 'all' || c.category === cat) && !(c.kind === 'license' && c.priceFlora === 0 && ownedCount[c.id]));
  const effectiveCo2 = Math.max(co2Ppm, equipStats.co2Ppm);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + balance */}
      <div className="hud-panel p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-semibold uppercase tracking-wider">
              <ShoppingBag className="w-3.5 h-3.5" /> Cada compra acuña un NFT
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">Grow Market</h1>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Las lámparas gastan electricidad, el riego gasta agua y el abono se consume en cada dosis. Compra recursos,
              instala equipo y repáralo quemando $FLORA: lo que pagas sale de circulación.
            </p>
          </div>
          <div className="bg-neutral-950/90 border border-neutral-800 rounded-xl p-4 flex flex-col gap-2.5 min-w-[250px] text-xs">
            <div className="flex items-center justify-between"><span className="text-neutral-400">Saldo $FLORA</span><span className="font-mono text-amber-300 font-bold"><Bump value={floraBalance.toLocaleString()} /></span></div>
            <div className="flex items-center justify-between"><span className="text-neutral-400">Saldo SOL</span><span className="font-mono text-purple-300 font-bold"><Bump value={String(solBalance)} /></span></div>
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
              {(['FLORA', 'SOL'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`flex-1 text-[11px] py-1 rounded font-mono font-medium transition cursor-pointer flex items-center justify-center gap-1 ${
                    currency === c
                      ? c === 'FLORA' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold' : 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {c === 'FLORA' ? <Flame className="w-3 h-3" /> : <Coins className="w-3 h-3" />} {c === 'FLORA' ? '$FLORA' : 'SOL'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="relative z-10 mt-5 pt-4 border-t border-neutral-800/80">
          <ResourceBar onOpenMarket={() => { setView('shop'); }} />
        </div>
      </div>

      {/* Automation master switches (they need the matching equipment installed) */}
      <HudPanel title={<><Sliders className="w-4 h-4" /> Automatización de la sala</>}>
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-200"><Droplets className="w-3.5 h-3.5 text-blue-400" /> Riego por goteo</div>
              <p className="text-[11px] text-neutral-500">{equipStats.autoWater ? `Gasta ${equipStats.waterPerPlantAuto} L por planta al regar` : 'Instala un sistema de riego'}</p>
            </div>
            <button
              onClick={toggleAutoWater}
              disabled={!equipStats.autoWater}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${autoWaterActive && equipStats.autoWater ? 'bg-blue-500/20 border border-blue-500 text-blue-300' : 'bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-neutral-300'}`}
            >
              {autoWaterActive && equipStats.autoWater ? 'ACTIVO' : 'MANUAL'}
            </button>
          </div>
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-200"><Thermometer className="w-3.5 h-3.5 text-cyan-400" /> Clima PID &amp; VPD</div>
              <p className="text-[11px] text-neutral-500">{equipStats.hasAc ? `Aire acondicionado · ${equipStats.acKw.toFixed(1)} kW` : 'Instala un aire acondicionado'}</p>
            </div>
            <button
              onClick={toggleAutoClimate}
              disabled={!equipStats.hasAc}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${autoClimateActive && equipStats.hasAc ? 'bg-cyan-500/20 border border-cyan-500 text-cyan-300' : 'bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-neutral-300'}`}
            >
              {autoClimateActive && equipStats.hasAc ? 'ACTIVO' : 'MANUAL'}
            </button>
          </div>
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-neutral-200"><Wind className="w-3.5 h-3.5 text-emerald-400" /> CO₂: <span className="text-emerald-300 font-mono">{effectiveCo2} ppm</span></div>
              <span className={`text-[10px] font-mono px-1.5 rounded ${effectiveCo2 >= 1100 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-neutral-800 text-neutral-400'}`}>
                {effectiveCo2 >= 1100 ? '+35 %' : effectiveCo2 >= 800 ? '+18 %' : 'base'}
              </span>
            </div>
            <input type="range" min={400} max={1500} step={50} value={co2Ppm} onChange={(e) => setCo2Ppm(parseInt(e.target.value))} className="w-full accent-emerald-500 cursor-pointer h-1.5" />
            {equipStats.co2Ppm > 0 && <p className="text-[10px] font-mono text-neutral-500">Tu equipo mantiene {equipStats.co2Ppm} ppm.</p>}
          </div>
        </div>
      </HudPanel>

      {/* Shop / stock switch */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-3">
        {([['shop', 'Tienda', ShoppingBag], ['stock', 'Mi bodega', Package]] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`shop-chip px-3.5 py-1.5 rounded-lg border text-xs font-bold tracking-wide cursor-pointer flex items-center gap-1.5 ${view === id ? 'bg-emerald-400/10 border-emerald-300/60 text-emerald-200' : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white'}`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}
            {id === 'stock' && <span className="text-[10px] font-mono text-neutral-500">{assets.length}</span>}
          </button>
        ))}
        {view === 'shop' && <span className="w-px h-5 bg-neutral-800 mx-1" />}
        {view === 'shop' && (['all', ...CATEGORY_ORDER] as const).map((c) => {
          const Icon = c === 'all' ? ShoppingBag : CAT_ICON[c];
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shop-chip px-2.5 py-1 rounded-lg border text-[11px] font-medium cursor-pointer flex items-center gap-1 ${cat === c ? 'bg-neutral-800 border-neutral-600 text-white' : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-white'}`}
            >
              <Icon className="w-3 h-3" style={{ color: c === 'all' ? undefined : CAT_COLOR[c] }} />
              {c === 'all' ? 'Todo' : CATEGORY_LABEL[c]}
            </button>
          );
        })}
      </div>

      <div key={view} className="shop-swap">
      {view === 'shop' ? (
        <div key={`${cat}-${currency}`} className="grid grid-cols-[repeat(auto-fill,minmax(285px,1fr))] gap-5">
          {shopItems.map((it, i) => (
            <ShopCard
              key={it.id}
              item={it}
              index={i}
              currency={currency}
              owned={ownedCount[it.id] ?? 0}
              affordable={currency === 'FLORA' ? floraBalance >= it.priceFlora : solBalance >= it.priceSol}
              onBuy={() => buyAsset(it.id, currency)}
            />
          ))}
          {shopItems.length === 0 && <p className="text-sm text-neutral-500 col-span-full text-center py-10">No hay artículos en esta categoría.</p>}
        </div>
      ) : (
        <StockView assets={assets} floraBalance={floraBalance} onEquip={setAssetEquipped} onRepair={repairAsset} onCalibrate={calibrateMeter} resources={resources} />
      )}
      </div>

      <div className="hud-panel p-5 flex items-start gap-3 text-xs text-neutral-400 leading-relaxed">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-neutral-200 block mb-1">Cómo se gasta cada recurso</strong>
          Una lámpara consume su potencia durante las horas de luz del ciclo (a 18/6, {`600 W ≈ 10,8 kWh al día`}). Si se acaba la electricidad las lámparas se apagan y las plantas dejan de crecer;
          un campo solar cubre parte de la factura. El riego manual gasta {USE.waterPerPlantManual} L por planta y cada abonado {USE.nutrientPerPlant} ml. El equipo se desgasta con el uso y se repara quemando $FLORA.
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────── shop card ───────────────────────── */

const ShopCard: React.FC<{
  item: CatalogItem;
  index: number;
  currency: 'FLORA' | 'SOL';
  owned: number;
  affordable: boolean;
  onBuy: () => boolean;
}> = ({ item: it, index, currency, owned, affordable, onBuy }) => {
  const [burst, setBurst] = useState<string | null>(null);
  const rarity = RARITY_BY_TIER[it.tier];
  const Icon = CAT_ICON[it.category];
  const price = currency === 'FLORA' ? it.priceFlora : it.priceSol;
  const licenceOwned = it.kind === 'license' && owned > 0;
  const hint = effectHint(it);
  const delay = `${Math.min(index, 14) * 45}ms`;

  const handleBuy = () => {
    if (!onBuy()) return;
    setBurst(it.kind === 'consumable' ? `+${it.amount} ${it.unit}` : it.kind === 'license' ? 'Licencia ✓' : 'NFT minteado ✓');
  };

  return (
    <RarityFrame
      rarity={rarity}
      className={`p-4 flex flex-col gap-3 shop-in ${it.tier === 4 ? 'shop-legend' : ''} ${burst ? 'shop-buy' : ''}`}
      style={{ ['--d' as string]: delay }}
    >
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
        <span className="flex items-center gap-2" style={{ color: CAT_COLOR[it.category] }}>
          <span className={`shop-ico shop-ico--${it.category}`} style={{ ['--c' as string]: CAT_COLOR[it.category] }}><Icon className="w-4 h-4" /></span>
          {CATEGORY_LABEL[it.category]}
        </span>
        <span style={{ color: RARITY_STYLE[rarity].color }}>{RARITY_STYLE[rarity].label}</span>
      </div>
      <div>
        <h3 className="text-[15px] font-bold text-white leading-snug">{it.name}</h3>
        <p className="text-[11px] text-neutral-500 font-mono">{it.brand}</p>
      </div>
      <p className="text-xs text-neutral-400 leading-relaxed flex-1">{it.description}</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono">
        {it.specs.map((s) => (
          <div key={s.label} className="flex flex-col"><span className="text-neutral-600 text-[9.5px] uppercase">{s.label}</span><span className="text-neutral-200">{s.value}</span></div>
        ))}
      </div>
      {hint && <div className="text-[10.5px] font-mono text-emerald-300/90 bg-emerald-400/5 border border-emerald-400/15 rounded-md px-2 py-1">{hint}</div>}
      <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
        <span className="font-mono font-bold text-sm">
          {price === 0 ? <span className="text-emerald-300">Gratis</span> : currency === 'FLORA'
            ? <span className="text-amber-300 flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> {price} $FLORA</span>
            : <span className="text-purple-300 flex items-center gap-1"><Coins className="w-3.5 h-3.5" /> {price} SOL</span>}
        </span>
        {owned > 0 && !licenceOwned && <span className="text-[10px] font-mono text-neutral-500"><Bump value={`tienes ${owned}`} /></span>}
      </div>
      {licenceOwned ? (
        <div className="w-full py-2 rounded-lg border border-emerald-400/30 bg-emerald-400/5 text-emerald-300 text-xs font-mono font-bold text-center flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" /> Licencia adquirida</div>
      ) : (
        <NeonButton tone={currency === 'FLORA' ? 'amber' : 'magenta'} disabled={!affordable} onClick={handleBuy} className="w-full">
          <Sparkles className="w-3.5 h-3.5" /> {it.kind === 'consumable' ? 'Comprar' : it.kind === 'license' ? 'Adquirir licencia' : 'Comprar e instalar'}
        </NeonButton>
      )}
      {burst && (
        <>
          <span className="shop-ring" />
          <span className="shop-float" onAnimationEnd={() => setBurst(null)}>{burst}</span>
        </>
      )}
    </RarityFrame>
  );
};

/* ───────────────────────── stock (inventory) ───────────────────────── */

const StockView: React.FC<{
  assets: OwnedAsset[];
  floraBalance: number;
  resources: { kwhPerDay: number; solarKwhPerDay: number; energyDays: number };
  onEquip: (id: string, equipped: boolean) => void;
  onRepair: (id: string) => boolean;
  onCalibrate: (m: 'ph' | 'ec' | 'par' | 'lux') => void;
}> = ({ assets, floraBalance, resources, onEquip, onRepair, onCalibrate }) => {
  const equipment = assets.filter((a) => CATALOG_BY_ID[a.catalogId]?.kind === 'equipment');
  const consumables = assets.filter((a) => CATALOG_BY_ID[a.catalogId]?.kind === 'consumable');
  const licences = assets.filter((a) => CATALOG_BY_ID[a.catalogId]?.kind === 'license');

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <HudPanel title={<><Lightbulb className="w-4 h-4" /> Equipo</>} accessory={<span className="text-[10px] font-mono text-neutral-500">{equipment.length} NFT</span>}>
        <div className="px-4 pb-4 space-y-2.5">
          {equipment.length === 0 && <p className="text-xs text-neutral-500 text-center py-6">Sin equipo. Compra una lámpara en la tienda.</p>}
          {equipment.map((a, i) => {
            const it = CATALOG_BY_ID[a.catalogId];
            const Icon = CAT_ICON[it.category];
            const dur = a.durability ?? 100;
            const cost = repairCostOf(a);
            return (
              <div key={a.id} style={{ ['--d' as string]: `${Math.min(i, 8) * 50}ms` }} className={`shop-in rounded-xl border p-3 space-y-2 ${a.equipped ? 'border-emerald-400/40 bg-emerald-400/[0.04]' : 'border-neutral-800 bg-neutral-950/60'}`}>
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${CAT_COLOR[it.category]}1f`, color: CAT_COLOR[it.category] }}><Icon className="w-5 h-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold text-white truncate">{it.name}</div>
                    <div className="text-[10px] font-mono text-neutral-500">{CATEGORY_LABEL[it.category]}{a.starter ? ' · kit de inicio' : ''}{dur <= 0 ? ' · AVERIADO' : ''}</div>
                  </div>
                  <button
                    onClick={() => onEquip(a.id, !a.equipped)}
                    className={`px-2.5 py-1 rounded-md border text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer transition ${a.equipped ? 'border-emerald-300/60 text-emerald-200 bg-emerald-400/10' : 'border-neutral-700 text-neutral-400 hover:text-white'}`}
                  >
                    {a.equipped ? 'Instalado' : 'Instalar'}
                  </button>
                </div>
                <StatBar value={dur} color={durColor(dur)} label="Durabilidad" valueLabel={`${dur.toFixed(0)} %`} />
                <div className="flex gap-2">
                  {dur < 99 && (
                    <NeonButton tone="amber" disabled={floraBalance < cost} onClick={() => onRepair(a.id)} className="flex-1 !py-1.5 !text-[10px]">
                      <Wrench className="w-3 h-3" /> Reparar · quema {cost} $FLORA
                    </NeonButton>
                  )}
                  {it.category === 'meter' && (
                    <NeonButton tone="cyan" onClick={() => onCalibrate(it.id.includes('ph') ? 'ph' : it.id.includes('ec') ? 'ec' : 'par')} className="flex-1 !py-1.5 !text-[10px]">
                      <Activity className="w-3 h-3" /> Calibrar
                    </NeonButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </HudPanel>

      <div className="space-y-5">
        <HudPanel title={<><Zap className="w-4 h-4" /> Consumibles</>} accessory={<span className="text-[10px] font-mono text-neutral-500">autonomía eléctrica {fmtRunway(resources.energyDays)}</span>}>
          <div className="px-4 pb-4 space-y-2.5">
            {consumables.length === 0 && <p className="text-xs text-neutral-500 text-center py-6">Sin consumibles. Compra agua, abono y electricidad.</p>}
            {consumables.map((a, i) => {
              const it = CATALOG_BY_ID[a.catalogId];
              const Icon = CAT_ICON[it.category];
              const total = it.amount ?? 1;
              const left = a.remaining ?? 0;
              return (
                <div key={a.id} style={{ ['--d' as string]: `${Math.min(i, 8) * 50}ms` }} className="shop-in rounded-xl border border-neutral-800 bg-neutral-950/60 p-3 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${CAT_COLOR[it.category]}1f`, color: CAT_COLOR[it.category] }}><Icon className="w-4 h-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-bold text-white truncate">{it.name}</div>
                      <div className="text-[10px] font-mono text-neutral-500">{a.starter ? 'kit de inicio' : it.brand}</div>
                    </div>
                  </div>
                  <StatBar value={(left / total) * 100} color={left <= 0 ? '#f87171' : CAT_COLOR[it.category]} label="Restante" valueLabel={`${left.toFixed(left < 10 ? 1 : 0)} / ${total} ${it.unit}`} />
                </div>
              );
            })}
          </div>
        </HudPanel>

        <HudPanel title={<><KeyRound className="w-4 h-4" /> Licencias de laboratorio</>} accessory={<span className="text-[10px] font-mono text-neutral-500">{licences.length} NFT</span>}>
          <div className="px-4 pb-4 flex flex-wrap gap-2">
            {licences.length === 0 && <p className="text-xs text-neutral-500 w-full text-center py-4">Sin licencias.</p>}
            {licences.map((a) => {
              const it = CATALOG_BY_ID[a.catalogId];
              return (
                <span key={a.id} className="px-2.5 py-1 rounded-lg border border-pink-300/30 bg-pink-400/5 text-[11px] font-mono text-pink-200 flex items-center gap-1.5">
                  <Check className="w-3 h-3" /> {it.specs[0]?.value ?? it.name}{a.starter ? ' · kit' : ''}
                </span>
              );
            })}
          </div>
        </HudPanel>
      </div>
    </div>
  );
};
