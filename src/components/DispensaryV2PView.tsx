import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { 
  Store, 
  ShoppingBag, 
  Truck, 
  Coins, 
  Sparkles, 
  CheckCircle2, 
  Flame, 
  ExternalLink, 
  Edit3, 
  Tag, 
  ShieldCheck,
  PackageCheck
} from 'lucide-react';
import { V2pRedemptionItem } from '../types';
import { Npc, useNpc } from './npc/Npc';

export const DispensaryV2PView: React.FC = () => {
  const {
    brand,
    updateBrand,
    processedProducts,
    sellProduct,
    v2pItems,
    redeemV2p,
    redeemedV2pList,
    floraBalance
  } = useGame();

  const npc = useNpc('¡Bienvenido al dispensario virtual! Soy Marta. Aquí vendes tus lotes y canjeas premios de verdad.');
  npc.tips.current = () => [
    'Cada venta paga una comisión de mercado del 2,5 % que se quema: menos $FLORA en circulación.',
    'Los lotes certificados con HPLC se venden mejor: pasa por la estación del laboratorio.',
    'Una marca con buena reputación atrae más clientes. Vende con constancia.',
    ...(processedProducts.length === 0 ? ['Aún no tienes lotes que vender. Procesa tu cosecha en el laboratorio.'] : [`Tienes ${processedProducts.length} lote${processedProducts.length > 1 ? 's' : ''} listo${processedProducts.length > 1 ? 's' : ''} para vender.`]),
  ];
  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [brandName, setBrandName] = useState(brand.name);
  const [brandTagline, setBrandTagline] = useState(brand.tagline);

  // V2P Modal state
  const [selectedV2pItem, setSelectedV2pItem] = useState<V2pRedemptionItem | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [country, setCountry] = useState('España');

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    updateBrand(brandName, brandTagline);
    setIsEditingBrand(false);
  };

  const handleConfirmV2p = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedV2pItem) return;
    redeemV2p(selectedV2pItem, { name: recipientName, country });
    setSelectedV2pItem(null);
    setRecipientName('');
  };

  return (
    <div className="space-y-6">
      <div className="hud-panel px-3 pt-3 pb-1"><Npc kind="budtender" text={npc.say.text} mood={npc.say.mood} moodKey={npc.say.key} /></div>

      {/* Header with Virtual Brand Status */}
      <div className="hud-panel p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
              Fase 4: Puente Virtual-to-Physical (V2P)
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              Reputación: {brand.reputation}%
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 font-serif">
              <Store className="w-5 h-5 text-emerald-400" />
              {brand.name}
            </h2>
            <button
              onClick={() => setIsEditingBrand(!isEditingBrand)}
              className="text-neutral-400 hover:text-white p-1"
              title="Editar nombre de marca"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">{brand.tagline}</p>
        </div>

        {/* Brand Stats */}
        <div className="flex items-center gap-3">
          <div className="bg-neutral-950 border border-neutral-800 px-3.5 py-2 rounded-xl text-center text-xs font-mono">
            <span className="text-[10px] text-neutral-500 block">VENTAS TOTALES</span>
            <span className="text-emerald-400 font-bold">{brand.totalSalesFlora.toLocaleString()} $FLORA</span>
          </div>
          <div className="bg-neutral-950 border border-neutral-800 px-3.5 py-2 rounded-xl text-center text-xs font-mono">
            <span className="text-[10px] text-neutral-500 block">ENVÍOS V2P FÍSICOS</span>
            <span className="text-amber-400 font-bold">{brand.totalV2pShipped} Unidades</span>
          </div>
        </div>
      </div>

      {/* Brand Edit Form Drawer */}
      {isEditingBrand && (
        <form onSubmit={handleSaveBrand} className="hud-panel p-4 flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-xs text-neutral-300 font-semibold block">Nombre de tu Marca Virtual:</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-xs text-neutral-300 font-semibold block">Eslogan o Misión de Marca:</label>
            <input
              type="text"
              value={brandTagline}
              onChange={(e) => setBrandTagline(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-[0_0_16px_-4px_rgba(52,211,153,0.6)]"
          >
            Guardar
          </button>
        </form>
      )}

      {/* Grid: Virtual Dispensary Sales + V2P Physical Redemption Bridge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Virtual Dispensary Shelf (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="hud-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Escaparate Virtual del Multiverso
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Dispensario Abierto
              </span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Vende las flores curadas y los extractos artesanales generados en tu carpa y laboratorio. Los clientes y dispensarios virtuales del multiverso te pagan directamente en <strong className="text-emerald-400">$FLORA</strong>.
            </p>

            {/* List of items to sell */}
            <div className="space-y-3">
              {processedProducts.length === 0 ? (
                <div className="py-8 text-center bg-neutral-950/60 rounded-xl border border-neutral-800 text-neutral-500 text-xs space-y-2">
                  <p>No tienes productos procesados en el mostrador.</p>
                  <p className="text-[11px] text-neutral-600">
                    Ve a <strong>Cultivo F2P</strong> o <strong>Lab Extracción</strong> para cosechar flores y prensar Live Rosin.
                  </p>
                </div>
              ) : (
                processedProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-emerald-400" />
                        <h4 className="font-bold text-white">{prod.name}</h4>
                      </div>
                      <p className="text-[11px] text-neutral-400 font-mono">
                        {prod.quantityGrams}g | {prod.potency}
                      </p>
                      <span className="text-[10px] text-neutral-500 font-mono block">
                        Calidad Botánica: {prod.qualityScore}/100
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-emerald-400 font-mono font-bold text-sm">
                        +{prod.marketValueFlora} $FLORA
                      </span>
                      <button
                        onClick={() => { sellProduct(prod.id); npc.speak(`¡Vendido! ${prod.name}. Se descuenta la comisión del mercado, pero el resto es tuyo.`, 'happy'); }}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg transition cursor-pointer shadow-sm"
                      >
                        Vender Ahora
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: V2P (Virtual to Physical) E-Commerce Bridge (6 Cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="hud-panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  Puente V2P: Comercio Virtual a Físico
                </h3>
              </div>
              <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                Quema Deflacionaria
              </span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Canjea tus tokens <strong className="text-emerald-400">$FLORA</strong> por productos tangibles del mundo real: terpenos botánicos puros certificados, aceites orgánicos de cáñamo y merchandising con verificación Solana NFC.
            </p>

            <div className="space-y-3">
              {v2pItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex gap-3 items-center text-xs"
                >
                  <div className="w-16 h-16 rounded-lg bg-neutral-900 overflow-hidden border border-neutral-800 shrink-0">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 space-y-0.5">
                    <span className="text-[10px] font-mono text-amber-400 px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/30">
                      {item.category}
                    </span>
                    <h4 className="font-bold text-white mt-1 leading-snug">{item.title}</h4>
                    <p className="text-[11px] text-neutral-400 line-clamp-1">{item.description}</p>
                    <span className="text-[10px] text-neutral-500 font-mono block">
                      Stock Almacén Físico: {item.stockPhysical} unidades
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="font-mono font-bold text-amber-400 text-xs">
                      {item.requiredFlora} $FLORA
                    </span>
                    <button
                      onClick={() => setSelectedV2pItem(item)}
                      disabled={floraBalance < item.requiredFlora || item.stockPhysical <= 0}
                      className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-semibold rounded-lg text-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Flame className="w-3 h-3 text-amber-400" />
                      <span>Canjear Físico</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* V2P Orders Ledger */}
          {redeemedV2pList.length > 0 && (
            <div className="hud-panel p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PackageCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Envíos Físicos Confirmados ({redeemedV2pList.length})
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Certificado Solana
                </span>
              </div>

              <div className="space-y-2">
                {redeemedV2pList.map((order, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-1 font-mono">
                    <div className="flex justify-between text-white font-semibold">
                      <span>{order.item.title}</span>
                      <span className="text-emerald-400 text-[11px]">En Proceso de Despacho</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-neutral-400">
                      <span>Destinatario: {order.recipient}</span>
                      <span>{order.item.requiredFlora} $FLORA Quemados</span>
                    </div>
                    <div className="text-[10px] text-neutral-500 truncate">
                      Tx Solana: {order.txSig}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* V2P Physical Claim Modal */}
      {selectedV2pItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="hud-panel max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Canje de Producto Físico (V2P)</h3>
                <p className="text-xs text-neutral-400">Entrega internacional verificada por socio de e-commerce.</p>
              </div>
              <button
                onClick={() => setSelectedV2pItem(null)}
                className="text-neutral-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex gap-3 items-center">
              <img src={selectedV2pItem.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
              <div>
                <h4 className="text-xs font-bold text-white">{selectedV2pItem.title}</h4>
                <span className="text-xs font-mono text-amber-400 font-bold">
                  Tarifa de Quema: {selectedV2pItem.requiredFlora} $FLORA
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmV2p} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-neutral-300 font-semibold block">Nombre del Destinatario:</label>
                <input
                  type="text"
                  required
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ej: Aiko Cultivador"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-neutral-300 font-semibold block">País de Envío:</label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="España">España</option>
                  <option value="México">México</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Colombia">Colombia</option>
                  <option value="Chile">Chile</option>
                  <option value="Estados Unidos">Estados Unidos</option>
                  <option value="Canadá">Canadá</option>
                  <option value="Alemania">Alemania</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-300 leading-relaxed">
                Al confirmar, se quemarán permanentemente <strong>{selectedV2pItem.requiredFlora} $FLORA</strong> en la blockchain de Solana y se generará una orden con certificado NFT de trazabilidad botánica.
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Flame className="w-4 h-4 text-neutral-950" />
                <span>Quemar Tokens & Confirmar Envío Físico</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
