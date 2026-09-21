import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ShoppingBag, Droplets, Thermometer, Wind, Flame, Coins, Sliders, Zap, Wrench, Package, Lock, Plus, Minus,
  Lightbulb, Snowflake, FlaskConical, Gauge, Sun, KeyRound, Activity, Check, Sparkles, Bug, Sprout, Recycle,
} from 'lucide-react';
import { useGame } from '../context/GameContext';
import { HudPanel, NeonButton, StatBar, RARITY_STYLE } from './game/GameUI';
import { Bump, fmtRunway } from './ResourceBar';
import { ItemArt, rarityColor } from './market/ItemArt';
import { Merchant, type Mood } from './market/Merchant';
import { NpcMissions } from './missions/NpcMissions';
import { useShopkeeper } from './npc/shopkeeper';
import { flyCoins, flyToken, floatText } from './market/fx';
import { PEST_INFO } from '../sim/engine';
import {
  CATALOG, CATALOG_BY_ID, CATEGORY_LABEL, RARITY_BY_TIER, AssetCategory, CatalogItem, OwnedAsset, repairCostOf, USE,
} from '../economy/catalog';

type IconType = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
const CAT_ICON: Record<AssetCategory, IconType> = {
  lamp: Lightbulb, ac: Snowflake, irrigation: Droplets, co2: Wind, meter: Gauge, solar: Sun,
  nutrient: FlaskConical, water: Droplets, energy: Zap, pest: Bug, service: Sprout, license: KeyRound,
};
const CAT_COLOR: Record<AssetCategory, string> = {
  lamp: '#fbbf24', ac: '#67e8f9', irrigation: '#38bdf8', co2: '#34d399', meter: '#a3e635', solar: '#facc15',
  nutrient: '#a78bfa', water: '#38bdf8', energy: '#fbbf24', pest: '#f472b6', service: '#86efac', license: '#f472b6',
};
const CATEGORY_ORDER: AssetCategory[] = ['energy', 'water', 'nutrient', 'pest', 'service', 'lamp', 'ac', 'irrigation', 'solar', 'co2', 'meter', 'license'];
const HOTBAR: Array<{ cat: AssetCategory; label: string }> = [
  { cat: 'lamp', label: 'Lámpara' }, { cat: 'ac', label: 'Aire' }, { cat: 'irrigation', label: 'Riego' },
  { cat: 'co2', label: 'CO₂' }, { cat: 'solar', label: 'Solar' }, { cat: 'meter', label: 'Sensor' }, { cat: 'service', label: 'Jardinero' },
];

const durColor = (d: number) => (d > 40 ? '#34d399' : d > 15 ? '#fbbf24' : '#f87171');
const css = (v: Record<string, string | number>) => v as unknown as React.CSSProperties;
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/* ───────────────────────── item data for the inspector ───────────────────────── */

interface Bar { label: string; value: number; max: number; text: string; good: boolean }

const barsOf = (it: CatalogItem): Bar[] => {
  const wear: Bar = { label: 'Desgaste', value: it.wearPerDay ?? 0, max: 1.2, text: `${it.wearPerDay} %/día`, good: false };
  switch (it.category) {
    case 'lamp': return [{ label: 'Luz (PPFD)', value: it.maxPpfd ?? 0, max: 1400, text: `${it.maxPpfd} µmol`, good: true }, { label: 'Consumo', value: it.watts ?? 0, max: 4000, text: `${it.watts} W`, good: false }, wear];
    case 'ac': return [{ label: 'Consumo', value: it.acKw ?? 0, max: 3, text: `${it.acKw} kW`, good: false }, wear];
    case 'irrigation': return [{ label: 'Agua por riego', value: it.waterEff ?? 0, max: 0.6, text: `${it.waterEff} L`, good: false }, { label: 'Electricidad', value: it.pumpKw ?? 0, max: 0.1, text: `${it.pumpKw ?? 0} kW`, good: false }, wear];
    case 'solar': return [{ label: 'Generación', value: it.solarKw ?? 0, max: 1.2, text: `${it.solarKw} kW`, good: true }, wear];
    case 'co2': return [{ label: 'CO₂ sostenido', value: it.co2Ppm ?? 0, max: 1200, text: `${it.co2Ppm} ppm`, good: true }, wear];
    case 'nutrient': return [{ label: 'Crecimiento', value: ((it.feedBonus ?? 1) - 1) * 100, max: 10, text: `+${(((it.feedBonus ?? 1) - 1) * 100).toFixed(0)} %`, good: true }, { label: 'Contenido', value: it.amount ?? 0, max: 1000, text: `${it.amount} ml`, good: true }];
    case 'water': return [{ label: 'Volumen', value: it.amount ?? 0, max: 1000, text: `${it.amount} L`, good: true }];
    case 'energy': return [{ label: 'Crédito', value: it.amount ?? 0, max: 500, text: `${it.amount} kWh`, good: true }];
    case 'meter': return [wear];
    case 'license': return [{ label: 'Energía por ciclo', value: USE.labKwhPerCycle[it.stationId ?? ''] ?? 0, max: 2, text: `${USE.labKwhPerCycle[it.stationId ?? ''] ?? 0} kWh`, good: false }];
    case 'pest': return [{ label: 'Contenido', value: it.amount ?? 0, max: 500, text: `${it.amount} ml`, good: true }, { label: 'Protección', value: it.guardHours ?? 0, max: 96, text: `${it.guardHours} h`, good: true }, { label: 'Plagas que cura', value: (it.treats ?? []).length, max: 3, text: (it.treats ?? []).map((k) => PEST_INFO[k].label).join(', '), good: true }];
    case 'service': return [{ label: 'Duración', value: it.amount ?? 0, max: 30, text: `${it.amount} días`, good: true }, { label: 'Nivel de cuidado', value: it.gardener ?? 0, max: 2, text: it.gardener === 2 ? 'Maestro' : 'Aprendiz', good: true }];
    default: return [];
  }
};

const PRIMARY: Partial<Record<AssetCategory, { key: 'maxPpfd' | 'acKw' | 'waterEff' | 'co2Ppm'; unit: string; lowerBetter?: boolean }>> = {
  lamp: { key: 'maxPpfd', unit: ' µmol' }, ac: { key: 'acKw', unit: ' kW', lowerBetter: true },
  irrigation: { key: 'waterEff', unit: ' L', lowerBetter: true }, co2: { key: 'co2Ppm', unit: ' ppm' },
};

const compareWith = (it: CatalogItem, assets: OwnedAsset[]): { text: string; tone: 'up' | 'down' | 'same' } | null => {
  const p = PRIMARY[it.category];
  if (!p) return null;
  const eq = assets.find((a) => a.equipped && CATALOG_BY_ID[a.catalogId]?.category === it.category);
  if (!eq) return { text: 'No tienes ninguno instalado', tone: 'up' };
  const cur = CATALOG_BY_ID[eq.catalogId];
  if (cur.id === it.id) return { text: 'Es el que tienes instalado', tone: 'same' };
  const diff = (it[p.key] ?? 0) - (cur[p.key] ?? 0);
  if (Math.abs(diff) < 1e-9) return { text: 'Igual que tu equipo', tone: 'same' };
  const better = p.lowerBetter ? diff < 0 : diff > 0;
  const shown = Number.isInteger(diff) ? Math.abs(diff) : Math.abs(diff).toFixed(2);
  return { text: `${diff > 0 ? '▲ +' : '▼ −'}${shown}${p.unit} vs. tu equipo`, tone: better ? 'up' : 'down' };
};

const effectHint = (it: CatalogItem): string | null => {
  if (it.category === 'lamp' && it.watts) return `hasta ${(it.watts / 1000 * 18).toFixed(1)} kWh/día a plena potencia y 18/6`;
  if (it.category === 'ac' && it.acKw) return `≈ ${(it.acKw * 0.5 * 24).toFixed(1)} kWh/día con clima autónomo`;
  if (it.category === 'irrigation') return `${it.pumpKw ? `${(it.pumpKw * 6).toFixed(2)} kWh/día · ` : 'sin electricidad · '}${it.waterEff} L por riego y planta`;
  if (it.category === 'solar' && it.solarKw) return `≈ ${(it.solarKw * 6).toFixed(1)} kWh/día gratis`;
  if (it.category === 'nutrient') return `${USE.nutrientPerPlant} ml por planta y abonado · crecimiento ×${it.feedBonus?.toFixed(2)}`;
  if (it.category === 'water') return `${Math.round((it.amount ?? 0) / USE.waterPerPlantManual)} riegos manuales`;
  if (it.category === 'energy') return `≈ ${((it.amount ?? 0) / 10.8).toFixed(1)} días de una lámpara de 600 W`;
  if (it.category === 'pest') return `${USE.pestPerPlant} ml por planta tratada · ≈ ${Math.floor((it.amount ?? 0) / USE.pestPerPlant)} dosis`;
  if (it.category === 'service') return it.gardener === 2 ? 'gasta agua, abono y tratamientos de tu almacén · la calificación casi no baja' : 'gasta agua y abono de tu almacén';
  if (it.category === 'license' && it.stationId) return `${USE.labKwhPerCycle[it.stationId] ?? 0} kWh por ciclo`;
  return null;
};

/* ───────────────────────── ambience ───────────────────────── */

const FIREFLIES = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 37 + 11) % 96, top: 8 + ((i * 53) % 82), dx: ((i * 29) % 60) - 30, dy: -20 - ((i * 17) % 50), delay: (i % 8) * 0.9, dur: 6 + (i % 5) * 1.4,
}));

const Ambience: React.FC = () => (
  <>
    <div className="mk-rays" />
    {FIREFLIES.map((f, i) => (
      <span key={i} className="mk-firefly" style={css({ left: `${f.left}%`, top: `${f.top}%`, '--dx': `${f.dx}px`, '--dy': `${f.dy}px`, animationDelay: `${f.delay}s`, animationDuration: `${f.dur}s` })} />
    ))}
  </>
);

const Awning: React.FC = () => (
  <div className="mk-awning" aria-hidden>
    <svg viewBox="0 0 1200 46" preserveAspectRatio="none" className="w-full h-full">
      {Array.from({ length: 20 }, (_, i) => (
        <g key={i}>
          <rect x={i * 60} y="0" width="60" height="26" fill={i % 2 ? '#e8f5ee' : '#16a34a'} />
          <path d={`M${i * 60} 26 a30 20 0 0 0 60 0Z`} fill={i % 2 ? '#e8f5ee' : '#16a34a'} />
        </g>
      ))}
      <rect x="0" y="0" width="1200" height="26" fill="url(#mkAwnShade)" />
      <defs><linearGradient id="mkAwnShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity=".35" /><stop offset="1" stopColor="#000" stopOpacity="0" /></linearGradient></defs>
    </svg>
    <span className="mk-hang-lamp" style={{ left: '9%' }}><i /></span>
    <span className="mk-hang-lamp" style={{ left: '91%', animationDelay: '-1.3s' }}><i /></span>
  </div>
);

/* ───────────────────────── parts ───────────────────────── */

const Slot: React.FC<{
  it: CatalogItem; index: number; selected: boolean; owned: number; price: number; currency: 'FLORA' | 'SOL'; affordable: boolean; onSelect: () => void;
}> = ({ it, index, selected, owned, price, currency, affordable, onSelect }) => {
  const rc = rarityColor(it);
  const licenceOwned = it.kind === 'license' && owned > 0;
  return (
    <button
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={`mk-slot shop-in ${it.tier >= 3 ? 'mk-float' : ''} ${it.tier === 4 ? 'mk-beam' : ''} ${!affordable && !licenceOwned ? 'mk-poor' : ''}`}
      style={css({ '--rc': rc, '--d': `${Math.min(index, 15) * 40}ms` })}
    >
      {it.tier >= 3 && [0, 1, 2].map((i) => <span key={i} className="mk-spark" style={css({ left: `${16 + i * 34}%`, top: `${12 + ((i * 23) % 34)}%`, animationDelay: `${i * 0.7}s` })} />)}
      <span className="mk-stars">{'★'.repeat(it.tier)}</span>
      {owned > 0 && <span className="mk-owned">×{owned}</span>}
      <span className="mk-slot-art"><ItemArt item={it} /></span>
      <span className="mk-slot-name">{it.name}</span>
      <span className="mk-tag">
        {licenceOwned ? <Check className="w-3 h-3" /> : price === 0 ? 'GRATIS' : <>{currency === 'FLORA' ? <Flame className="w-3 h-3" /> : <Coins className="w-3 h-3" />}{price}</>}
      </span>
      {!affordable && !licenceOwned && <span className="mk-lock"><Lock className="w-3.5 h-3.5" /></span>}
      <span className="mk-plank" />
    </button>
  );
};

/* ───────────────────────── main view ───────────────────────── */

export const GrowMarketView: React.FC<{ initialCat?: string }> = ({ initialCat }) => {
  const {
    assets, resources, equipStats, buyAsset, setAssetEquipped, repairAsset, floraBalance, solBalance, calibrateMeter, care, recycleGarbage,
  } = useGame();

  const [tab, setTab] = useState<'buy' | 'bag'>('buy');
  const startCat = (CATEGORY_ORDER as string[]).includes(initialCat ?? '') ? (initialCat as AssetCategory) : 'all';
  const [cat, setCat] = useState<AssetCategory | 'all'>(startCat);
  const [currency, setCurrency] = useState<'FLORA' | 'SOL'>('FLORA');
  const [qty, setQty] = useState(1);
  const [selectedId, setSelectedId] = useState<string>((startCat !== 'all' ? CATALOG.find((c) => c.category === startCat) : CATALOG.find((c) => c.category === 'energy'))?.id ?? CATALOG[0].id);
  const [shop, setShop] = useShopkeeper();
  const [say, setSay] = useState<{ text: string; mood: Mood; key: number }>({ text: '¡Bienvenido al Mercado Yield, cultivador! Mira los estantes; todo lo que compres se acuña como NFT.', mood: 'idle', key: 0 });
  const speak = useCallback((text: string, mood: Mood = 'idle') => setSay((s) => ({ text, mood, key: s.key + 1 })), []);

  const buyRef = useRef<HTMLButtonElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const lastSpoke = useRef(Date.now());

  const ownedCount = useMemo(() => {
    const m: Record<string, number> = {};
    assets.forEach((a) => { m[a.catalogId] = (m[a.catalogId] ?? 0) + 1; });
    return m;
  }, [assets]);

  const items = CATALOG.filter((c) => (cat === 'all' || c.category === cat) && !(c.kind === 'license' && c.priceFlora === 0 && ownedCount[c.id]));
  const selected = CATALOG_BY_ID[selectedId] && items.some((c) => c.id === selectedId) ? CATALOG_BY_ID[selectedId] : items[0];
  const isConsumable = selected?.kind === 'consumable';
  const n = isConsumable ? qty : 1;
  const unit = selected ? (currency === 'FLORA' ? selected.priceFlora : selected.priceSol) : 0;
  const total = Number((unit * n).toFixed(3));
  const balance = currency === 'FLORA' ? floraBalance : solBalance;
  const affordable = balance >= total;
  const licenceOwned = !!selected && selected.kind === 'license' && (ownedCount[selected.id] ?? 0) > 0;

  // the merchant keeps an eye on your room and drops hints
  const latest = useRef({ resources, equipStats, care });
  latest.current = { resources, equipStats, care };
  useEffect(() => {
    const tip = () => {
      if (Date.now() - lastSpoke.current < 14000) return;
      const { resources: r, equipStats: e, care } = latest.current;
      const lines: string[] = [];
      if (e.lampWatts > 0 && r.energy <= 0.05) lines.push('⚡ ¡Sin electricidad! Tus lámparas están apagadas. Un Bono de Energía y volvemos al negocio.');
      else if (e.lampWatts > 0 && Number.isFinite(r.energyDays) && r.energyDays < 1) lines.push(`⚡ Solo te queda luz para ${fmtRunway(r.energyDays)}. Yo compraría un Bono de Energía.`);
      if (r.water < 15) lines.push('💧 El tanque de agua está casi vacío. ¡Las plantas tienen sed!');
      if (r.nutrient < 90) lines.push('🧪 Te queda poco abono. Un buen fertilizante marca la diferencia.');
      if (care.pests > 0) lines.push(`🐛 ¡Tienes ${care.pests} planta${care.pests > 1 ? 's' : ''} con plaga! Mira el Control de plagas: un tratamiento a tiempo salva la cosecha.`);
      if (care.rating < 50) lines.push('🧹 Tu calificación de jardinero está por los suelos. Limpia la sala y recicla lo vacío, o contrata un jardinero.');
      if (care.gardenerLevel === 0) lines.push('🧑‍🌾 ¿Cansado de regar? Un jardinero del vivero cuida tus plantas mientras duermes.');
      if (!e.hasAc) lines.push('❄️ Un aire acondicionado mantiene el clima perfecto sin que estés encima.');
      if (!e.autoWater) lines.push('💦 Con un sistema de riego tus plantas nunca tendrán sed.');
      lines.push('Una lámpara más fuerte crece más rápido… pero también gasta más luz.', 'El campo solar es electricidad gratis: la mejor inversión a largo plazo.', 'Cada compra acuña un NFT y quema $FLORA. ¡Menos oferta, más valor!', 'Repara tu equipo a tiempo: un aparato averiado no sirve de nada.');
      const urgent = lines.filter((l) => /^(⚡|💧|🧪|🐛)/.test(l));
      speak(urgent.length ? urgent[0] : pick(lines));
    };
    const id = window.setInterval(tip, 9000);
    const first = window.setTimeout(tip, 6500);
    return () => { window.clearInterval(id); window.clearTimeout(first); };
  }, [speak]);

  const say2 = (text: string, mood: Mood = 'idle') => { lastSpoke.current = Date.now(); speak(text, mood); };

  const selectItem = (it: CatalogItem) => {
    setSelectedId(it.id);
    setQty(1);
    say2(`${it.name}. ${it.description}`);
  };

  const changeCat = (c: AssetCategory | 'all') => {
    setCat(c);
    setQty(1);
    const list = CATALOG.filter((x) => c === 'all' || x.category === c);
    if (list.length && !list.some((x) => x.id === selectedId)) setSelectedId(list[0].id);
  };

  const doBuy = () => {
    if (!selected || licenceOwned) return;
    if (!affordable) {
      say2(`Uy… te faltan ${(total - balance).toLocaleString(undefined, { maximumFractionDigits: 3 })} ${currency === 'FLORA' ? '$FLORA' : 'SOL'} para llevarte eso. Vuelve cuando tengas más.`, 'sad');
      buyRef.current?.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 300 });
      return;
    }
    const wallet = document.querySelector(`[data-mk-wallet="${currency}"] .mk-coin`);
    const slotTarget = HOTBAR.some((h) => h.cat === selected.category) && (selected.kind === 'equipment' || selected.category === 'service')
      ? document.querySelector(`[data-mk-slot="${selected.category}"]`) : document.querySelector('[data-mk-bag]');
    const ok = buyAsset(selected.id, currency, n);
    if (!ok) return;
    flyCoins(buyRef.current, wallet, Math.min(12, 5 + n), currency);
    flyToken(artRef.current?.querySelector('svg') ?? null, slotTarget);
    floatText(wallet, `−${total} ${currency === 'FLORA' ? '$FLORA' : 'SOL'}`, '#fca5a5');
    say2(pick([`¡Trato hecho! ${n > 1 ? `${n} × ` : ''}${selected.name} es tuyo.`, '¡Excelente elección, cultivador!', '¡Que rinda mucho tu cosecha!', 'Un placer hacer negocios contigo.']), 'happy');
  };

  const equippedBy = (cat2: AssetCategory) => assets.filter((a) => a.equipped && CATALOG_BY_ID[a.catalogId]?.category === cat2 && CATALOG_BY_ID[a.catalogId].kind === 'equipment');
  const cmp = selected ? compareWith(selected, assets) : null;
  const bars = selected ? barsOf(selected) : [];
  const rc = selected ? rarityColor(selected) : '#9ca3af';
  const rarityLabel = selected ? RARITY_STYLE[RARITY_BY_TIER[selected.tier]].label : '';

  return (
    <div className="mk-stage animate-fade-in">
      <Ambience />
      <Awning />

      <div className="relative z-10 px-4 sm:px-6 pt-14 pb-6 space-y-5">
        {/* keeper + sign + wallet */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-end">
          <div className="min-w-0">
            <Merchant text={say.text} mood={say.mood} moodKey={say.key} />
            <button type="button" onClick={() => setShop(shop === 'flora' ? 'floro' : 'flora')} className="mt-1 ml-1 text-[10.5px] font-mono text-neutral-400 hover:text-white underline underline-offset-2 cursor-pointer">⇄ Cambiar de tendero ({shop === 'flora' ? 'Floro' : 'Flora'})</button>
          </div>
          <div className="space-y-3">
            <div className="mk-sign">
              <span className="mk-chain mk-chain--l" /><span className="mk-chain mk-chain--r" />
              <div className="mk-board">
                <div className="font-serif text-xl sm:text-2xl font-black tracking-[0.14em] text-amber-100 leading-none">MERCADO YIELD</div>
                <div className="text-[9.5px] font-mono uppercase tracking-[0.22em] text-amber-200/70 mt-1">Suministros para cultivadores</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {(['FLORA', 'SOL'] as const).map((c) => (
                <button
                  key={c}
                  data-mk-wallet={c}
                  onClick={() => setCurrency(c)}
                  className={`mk-wallet ${currency === c ? 'is-on' : ''}`}
                  title={`Pagar en ${c === 'FLORA' ? '$FLORA' : 'SOL'}`}
                >
                  <span className={`mk-coin mk-coin--${c}`}>{c === 'FLORA' ? 'F' : '◎'}</span>
                  <span className="leading-tight text-left">
                    <span className="block text-[9px] font-mono uppercase tracking-[0.2em] text-neutral-400">{c === 'FLORA' ? '$FLORA' : 'SOL'}{currency === c ? ' · pago' : ''}</span>
                    <span className={`block font-mono font-bold text-lg ${c === 'FLORA' ? 'text-amber-200' : 'text-purple-200'}`}>
                      <Bump value={c === 'FLORA' ? floraBalance.toLocaleString() : String(solBalance)} />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <NpcMissions npc="merchant" onSay={(text, mood) => setSay((s) => ({ text, mood, key: s.key + 1 }))} />

        {/* your room: equipped hotbar + resource bars */}
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] mk-panel p-3 sm:p-4">
          <div>
            <div className="mk-label">Tu sala</div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
              {HOTBAR.map(({ cat: c, label }) => {
                const eq = c === 'service' ? assets.filter((a) => CATALOG_BY_ID[a.catalogId]?.category === 'service' && (a.remaining ?? 0) > 0) : equippedBy(c);
                const first = eq[0];
                const item = first ? CATALOG_BY_ID[first.catalogId] : null;
                // the gardener slot shows days left, the rest show durability
                const dur = c === 'service' ? (first && item ? ((first.remaining ?? 0) / (item.amount ?? 1)) * 100 : 0) : first?.durability ?? 100;
                return (
                  <button
                    key={c}
                    data-mk-slot={c}
                    onClick={() => (item ? setTab('bag') : (setTab('buy'), changeCat(c)))}
                    className={`mk-hot ${item ? 'is-full' : ''}`}
                    style={css({ '--rc': item ? rarityColor(item) : '#475569' })}
                    title={item ? (c === 'service' ? `${item.name} · quedan ${(first?.remaining ?? 0).toFixed(1)} días` : `${item.name} · durabilidad ${dur.toFixed(0)} %`) : `Sin ${label.toLowerCase()} — ver en la tienda`}
                  >
                    <svg viewBox="0 0 50 50" className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                      <circle cx="25" cy="25" r="22.5" fill="none" stroke="rgba(148,163,184,.18)" strokeWidth="2.2" />
                      {item && <circle cx="25" cy="25" r="22.5" fill="none" stroke={durColor(dur)} strokeWidth="2.6" strokeLinecap="round" pathLength={100} strokeDasharray="100" strokeDashoffset={100 - Math.max(0, dur)} className="mk-ring" />}
                    </svg>
                    {item ? <span className="mk-hot-art"><ItemArt item={item} /></span> : <Plus className="w-4 h-4 text-slate-500" />}
                    {eq.length > 1 && <span className="mk-owned" style={{ top: 0, right: 0, left: 'auto' }}>×{eq.length}</span>}
                    {item && dur <= 0 && c !== 'service' && <span className="mk-broken">!</span>}
                    <span className="mk-hot-label">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <StatBar value={Math.min(100, (resources.energy / 100) * 100)} color={resources.energy < 8 ? '#f87171' : '#fbbf24'} label="⚡ Electricidad" valueLabel={`${resources.energy.toFixed(1)} kWh · ${fmtRunway(resources.energyDays)}`} />
            <StatBar value={Math.min(100, (resources.water / 200) * 100)} color={resources.water < 15 ? '#f87171' : '#38bdf8'} label="💧 Agua" valueLabel={`${resources.water.toFixed(resources.water < 100 ? 1 : 0)} L`} />
            <StatBar value={Math.min(100, (resources.nutrient / 500) * 100)} color={resources.nutrient < 90 ? '#f87171' : '#a78bfa'} label="🧪 Abono" valueLabel={`${Math.floor(resources.nutrient)} ml`} />
            <StatBar value={care.rating} color={care.rating >= 75 ? '#34d399' : care.rating >= 45 ? '#fbbf24' : '#f87171'} label="🧹 Calificación de jardinero" valueLabel={`${care.rating} %${care.pests ? ` · 🐛 ${care.pests}` : ''}`} />
          </div>
        </div>

        {/* menu tabs */}
        <div className="flex items-center gap-2">
          {([['buy', 'Comprar', ShoppingBag], ['bag', 'Mi bolsa', Package]] as const).map(([id, label, Icon]) => (
            <button key={id} data-mk-bag={id === 'bag' ? '' : undefined} onClick={() => setTab(id)} className={`mk-tab ${tab === id ? 'is-on' : ''}`}>
              <Icon className="w-4 h-4" /> {label}
              {id === 'bag' && <span className="text-[10px] font-mono opacity-70">{assets.length}</span>}
            </button>
          ))}
        </div>

        {tab === 'buy' ? (
          <div className="grid gap-4 lg:grid-cols-[150px_minmax(0,1fr)_330px] items-start">
            {/* category rail */}
            <div className="mk-rail flex lg:flex-col gap-1.5 overflow-x-auto scrollbar-none">
              {(['all', ...CATEGORY_ORDER] as const).map((c) => {
                const Icon = c === 'all' ? ShoppingBag : CAT_ICON[c];
                const count = CATALOG.filter((x) => (c === 'all' || x.category === c) && !(x.kind === 'license' && x.priceFlora === 0 && ownedCount[x.id])).length;
                return (
                  <button key={c} onClick={() => changeCat(c)} className={`mk-cat ${cat === c ? 'is-on' : ''}`} style={css({ '--cc': c === 'all' ? '#34d399' : CAT_COLOR[c] })}>
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{c === 'all' ? 'Todo' : CATEGORY_LABEL[c]}</span>
                    <span className="ml-auto text-[10px] font-mono opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* shelves */}
            <div key={`${cat}-${currency}`} role="listbox" aria-label="Estantes" className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {items.map((it, i) => (
                <Slot
                  key={it.id} it={it} index={i} selected={selected?.id === it.id} owned={ownedCount[it.id] ?? 0}
                  price={currency === 'FLORA' ? it.priceFlora : it.priceSol} currency={currency}
                  affordable={(currency === 'FLORA' ? floraBalance : solBalance) >= (currency === 'FLORA' ? it.priceFlora : it.priceSol)}
                  onSelect={() => selectItem(it)}
                />
              ))}
            </div>

            {/* inspector */}
            {selected && (
              <aside key={selected.id} className="mk-insp shop-swap lg:sticky lg:top-4" style={css({ '--rc': rc })}>
                <div className={`mk-insp-stage ${selected.tier === 4 ? 'mk-beam' : ''}`}>
                  <div ref={artRef} className="mk-insp-art"><ItemArt item={selected} live /></div>
                  <span className="mk-rarity-chip" style={{ color: rc, borderColor: rc }}>{rarityLabel} · {'★'.repeat(selected.tier)}</span>
                </div>
                <div className="px-4 pt-3 pb-4 space-y-3">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.18em]" style={{ color: CAT_COLOR[selected.category] }}>{CATEGORY_LABEL[selected.category]}</div>
                    <h3 className="font-serif text-lg font-bold text-white leading-snug">{selected.name}</h3>
                    <p className="text-[11px] font-mono text-neutral-500">{selected.brand}</p>
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">{selected.description}</p>

                  <div className="space-y-2">
                    {bars.map((b) => (
                      <div key={b.label}>
                        <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-neutral-400 mb-0.5"><span>{b.label}</span><span className="text-neutral-200">{b.text}</span></div>
                        <div className="mk-bar"><i style={css({ '--to': Math.max(0.05, Math.min(1, b.value / b.max)), background: b.good ? 'linear-gradient(90deg,#059669,#6ee7b7)' : 'linear-gradient(90deg,#d97706,#fcd34d)' })} /></div>
                      </div>
                    ))}
                  </div>

                  {cmp && <div className={`mk-cmp mk-cmp--${cmp.tone}`}>{cmp.text}</div>}
                  {effectHint(selected) && <div className="text-[10.5px] font-mono text-emerald-300/90 bg-emerald-400/5 border border-emerald-400/15 rounded-md px-2 py-1">{effectHint(selected)}</div>}

                  {isConsumable && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">Cantidad</span>
                      <div className="mk-qty">
                        <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Menos"><Minus className="w-3.5 h-3.5" /></button>
                        <span key={qty} className="shop-bump font-mono font-bold">{qty}</span>
                        <button onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Más"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )}

                  {licenceOwned ? (
                    <div className="w-full py-3 rounded-xl border border-emerald-400/30 bg-emerald-400/5 text-emerald-300 text-xs font-mono font-bold text-center flex items-center justify-center gap-1.5"><Check className="w-4 h-4" /> Licencia adquirida</div>
                  ) : (
                    <button ref={buyRef} onClick={doBuy} className={`mk-buy ${affordable ? '' : 'is-poor'}`}>
                      <span className="mk-buy-shine" />
                      <Sparkles className="w-4 h-4" />
                      <span>{selected.kind === 'license' ? 'Adquirir' : 'Comprar'}{n > 1 ? ` ×${n}` : ''}</span>
                      <span className="ml-auto flex items-center gap-1 font-mono">
                        {total === 0 ? 'GRATIS' : <>{currency === 'FLORA' ? <Flame className="w-4 h-4" /> : <Coins className="w-4 h-4" />}{total} {currency === 'FLORA' ? '$FLORA' : 'SOL'}</>}
                      </span>
                    </button>
                  )}
                  {!affordable && !licenceOwned && <p className="text-[10.5px] font-mono text-red-300/90 text-center -mt-1">Te faltan {(total - balance).toLocaleString(undefined, { maximumFractionDigits: 3 })} {currency === 'FLORA' ? '$FLORA' : 'SOL'}</p>}
                </div>
              </aside>
            )}
          </div>
        ) : (
          <div className="shop-swap">
            <StockView assets={assets} floraBalance={floraBalance} onEquip={setAssetEquipped} onRepair={repairAsset} onCalibrate={calibrateMeter} resources={resources} garbage={care.garbage} onRecycle={recycleGarbage} />
          </div>
        )}

        <Automation />
      </div>
    </div>
  );
};

/* ───────────────────────── automation switches ───────────────────────── */

const Automation: React.FC = () => {
  const { equipStats, autoWaterActive, toggleAutoWater, autoClimateActive, toggleAutoClimate, co2Ppm, setCo2Ppm } = useGame();
  const effectiveCo2 = Math.max(co2Ppm, equipStats.co2Ppm);
  return (
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
  garbage: number;
  onRecycle: () => void;
}> = ({ assets, floraBalance, resources, onEquip, onRepair, onCalibrate, garbage, onRecycle }) => {
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
            const dur = a.durability ?? 100;
            const cost = repairCostOf(a);
            return (
              <div key={a.id} style={{ ['--d' as string]: `${Math.min(i, 8) * 50}ms` }} className={`shop-in rounded-xl border p-3 space-y-2 ${a.equipped ? 'border-emerald-400/40 bg-emerald-400/[0.04]' : 'border-neutral-800 bg-neutral-950/60'}`}>
                <div className="flex items-center gap-2.5">
                  <span className="mk-bag-art shrink-0"><ItemArt item={it} /></span>
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
        <HudPanel title={<><Zap className="w-4 h-4" /> Consumibles</>} accessory={<div className="flex items-center gap-2"><span className="text-[10px] font-mono text-neutral-500">autonomía eléctrica {fmtRunway(resources.energyDays)}</span><button onClick={onRecycle} disabled={garbage === 0} className="care-btn !py-1 !px-2" title="Frascos vacíos y equipo averiado bajan tu calificación de jardinero"><Recycle className="w-3 h-3" /> Reciclar{garbage > 0 ? ` (${garbage})` : ''}</button></div>}>
          <div className="px-4 pb-4 space-y-2.5">
            {consumables.length === 0 && <p className="text-xs text-neutral-500 text-center py-6">Sin consumibles. Compra agua, abono y electricidad.</p>}
            {consumables.map((a, i) => {
              const it = CATALOG_BY_ID[a.catalogId];
                const total = it.amount ?? 1;
              const left = a.remaining ?? 0;
              return (
                <div key={a.id} style={{ ['--d' as string]: `${Math.min(i, 8) * 50}ms` }} className="shop-in rounded-xl border border-neutral-800 bg-neutral-950/60 p-3 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="mk-bag-art shrink-0"><ItemArt item={it} /></span>
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
