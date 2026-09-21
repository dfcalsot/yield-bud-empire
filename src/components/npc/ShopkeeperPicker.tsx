import React from 'react';
import { NpcV2 } from './rig/NpcV2';
import { shopkeeperName, useShopkeeper, type Shopkeeper } from './shopkeeper';

/** Lets the player choose who runs the grow shop. It only changes the character; the shop and its missions are the same. */
export const ShopkeeperPicker: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [shop, setShop] = useShopkeeper();
  return (
    <section className={`hud-panel p-4 ${className}`} aria-label="Elige a tu tendero">
      <h3 className="font-serif text-sm font-bold tracking-[0.14em] uppercase text-emerald-200">Tu tendero del Grow Shop</h3>
      <p className="mt-1 text-xs text-neutral-400 leading-relaxed">Elige quién atiende en el Mercado. Solo cambia el personaje: la tienda y las misiones son las mismas.</p>
      <div className="mt-3 grid grid-cols-2 gap-3 max-w-md">
        {(['flora', 'floro'] as Shopkeeper[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setShop(id)}
            aria-pressed={shop === id}
            className={`rounded-xl border p-2 text-center transition cursor-pointer ${shop === id ? 'border-emerald-300/70 bg-emerald-400/10 shadow-[0_0_20px_-6px_rgba(52,211,153,.7)]' : 'border-emerald-500/20 hover:border-emerald-300/40'}`}
          >
            <div className="flex justify-center"><NpcV2 kind="merchant" variant={id} bare text="" mood="idle" moodKey={0} /></div>
            <div className="text-sm font-semibold text-white">{shopkeeperName(id)}</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">{shop === id ? 'Atiende tu tienda' : id === 'flora' ? 'Ella' : 'Él'}</div>
          </button>
        ))}
      </div>
    </section>
  );
};
