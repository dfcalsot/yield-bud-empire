import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, Flame, RefreshCw, Undo2 } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { fetchMarket, type ListingKind, type ListingView, type MarketPage } from '../../economy/ledger';
import { StaffCard } from '../staff/StaffCard';
import { LandCard } from '../LandCard';
import { AvatarArt, RARITY_COLOR, RARITY_LABEL } from '../profile/AvatarArt';
import { RARITY_STYLE } from '../game/GameUI';
import { landCardOf } from '../../utils/land';
import { DESIGN_BY_ID } from '../../sim/avatars';
import type { StaffNft } from '../../sim/staff';
import { t, k } from '../../i18n';

const KINDS: Array<[ListingKind | 'all', string]> = [['all', k('Todo')], ['staff', k('Personal')], ['land', k('Tierras')], ['avatar', k('Avatares')]];
const RARITIES = ['all', 'common', 'rare', 'epic', 'legendary'] as const;
const SORTS: Array<[string, string]> = [['new', k('Recientes')], ['cheap', k('Más baratos')], ['dear', k('Más caros')]];

/** the item of a listing as the same collectible card the rest of the game uses */
export const ListingCard: React.FC<{ l: ListingView; footer?: React.ReactNode }> = ({ l, footer }) => {
  if (l.kind === 'staff') return <StaffCard staff={l.data as unknown as StaffNft} footer={footer} />;
  if (l.kind === 'land') return <LandCard card={landCardOf(l.data as unknown as Parameters<typeof landCardOf>[0])} footer={footer} />;
  const d = DESIGN_BY_ID[String(l.data.designId)];
  if (!d) return null;
  const rc = RARITY_COLOR[d.rarity];
  return (
    <div className="rounded-2xl border p-2.5 space-y-2" style={{ borderColor: `${rc}77`, background: `linear-gradient(160deg, ${rc}22, rgba(8,5,20,.92))` }} data-avatar-listing={d.id}>
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider"><span className="font-black" style={{ color: rc }}>◆ {RARITY_LABEL[d.rarity]}</span><span className="text-neutral-400">{t('Avatar NFT · {v0}', { v0: String(l.data.serial ?? '') })}</span></div>
      <span className="block w-full aspect-square"><AvatarArt design={d} className="w-full h-full" /></span>
      <div className="text-[13px] font-bold text-white leading-tight">{t(d.name)}</div>
      {footer}
    </div>
  );
};

/** "Jugadores": the market between players. Every NFT you own can be listed from its own card; here you browse and buy what others listed. */
export const P2PMarket: React.FC<{ onSay: (text: string, mood: 'idle' | 'happy' | 'sad') => void }> = ({ onSay }) => {
  const { ledgerOn, floraBalance, myListings, cancelListing, buyListing, p2pInfo } = useGame();
  const [kind, setKind] = useState<ListingKind | 'all'>('all');
  const [rarity, setRarity] = useState<(typeof RARITIES)[number]>('all');
  const [sort, setSort] = useState('new');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<MarketPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setData(await fetchMarket({ kind, rarity, sort, page }));
    setLoading(false);
  }, [kind, rarity, sort, page]);
  useEffect(() => { if (ledgerOn) void load(); }, [load, ledgerOn, myListings.length]);
  useEffect(() => { setPage(0); }, [kind, rarity, sort]);

  if (!ledgerOn) return <div className="mk-panel p-6 text-center text-sm text-neutral-400" data-testid="p2p-market">{t('El mercado entre jugadores necesita conexión con el servidor de cuentas.')}</div>;

  const buy = async (l: ListingView) => {
    setBusy(l.id);
    const got = await buyListing(l.id);
    setBusy(null);
    if (got) onSay(t('¡Buen trato! Ya es tuyo.'), 'happy'); else onSay(t('Se te adelantaron o no te alcanza. Mira otras ofertas.'), 'sad');
    void load();
  };

  const others = (data?.listings ?? []).filter((l) => !l.mine);
  return (
    <div className="mk-panel p-3 sm:p-4 space-y-4" data-testid="p2p-market">
      <div className="flex flex-wrap items-center gap-2">
        <ArrowLeftRight className="w-5 h-5 text-emerald-300" />
        <h3 className="font-serif text-base font-black tracking-[0.12em] uppercase text-emerald-100">{t('Mercado de jugadores')}</h3>
        <span className="text-[11px] font-mono text-neutral-400">{t('Compra y vende NFT entre jugadores. Cada venta quema el {v0} % del precio. Para vender algo tuyo usa «Vender» en su tarjeta (Maletín, Planeta, Perfil).', { v0: Math.round(p2pInfo.feeRate * 100) })}</span>
        <button type="button" onClick={() => void load()} className="ml-auto sr-btn" aria-label={t('Actualizar')}><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />{t('Actualizar')}</button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {KINDS.map(([id, label]) => <button key={id} type="button" onClick={() => setKind(id)} className={`mk-tab !py-1 !px-2.5 !text-[11px] ${kind === id ? 'is-on' : ''}`} data-p2p-kind={id}>{t(label)}</button>)}
        <span className="w-px h-5 bg-white/10 mx-1" />
        {RARITIES.map((r) => <button key={r} type="button" onClick={() => setRarity(r)} className={`mk-tab !py-1 !px-2.5 !text-[11px] ${rarity === r ? 'is-on' : ''}`} style={r !== 'all' && rarity === r ? { color: RARITY_STYLE[r].color } : undefined}>{r === 'all' ? t('Toda rareza') : RARITY_STYLE[r].label}</button>)}
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="ml-auto rounded-lg bg-black/50 border border-white/15 px-2 py-1 text-[11px] font-mono text-neutral-200" aria-label={t('Ordenar')}>
          {SORTS.map(([id, label]) => <option key={id} value={id}>{t(label)}</option>)}
        </select>
      </div>

      {myListings.length > 0 && (
        <section className="space-y-2" data-testid="my-listings">
          <h4 className="text-[11px] font-mono uppercase tracking-[0.18em] text-neutral-400">{t('Mis ofertas · {length}/{maxListings}', { length: myListings.length, maxListings: p2pInfo.maxListings })}</h4>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {myListings.map((l) => (
              <ListingCard key={l.id} l={l} footer={
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-mono"><span className="text-neutral-400">{t('Precio')}</span><span className="text-amber-300 font-bold flex items-center gap-1"><Flame className="w-3 h-3" />{l.price}</span></div>
                  <button type="button" className="sr-btn w-full justify-center" disabled={busy === l.id} onClick={async () => { setBusy(l.id); await cancelListing(l.id); setBusy(null); }} data-cancel-listing={l.id}><Undo2 className="w-3.5 h-3.5" />{t('Retirar')}</button>
                </div>} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h4 className="text-[11px] font-mono uppercase tracking-[0.18em] text-neutral-400">{t('En venta ahora')}</h4>
        {data && others.length === 0 && <p className="text-sm text-neutral-500 py-6 text-center" data-testid="p2p-empty">{t('No hay ofertas con ese filtro. Sé el primero: lista algo tuyo desde su tarjeta.')}</p>}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {others.map((l) => {
            const ok = floraBalance >= l.price;
            return (
              <ListingCard key={l.id} l={l} footer={
                <div className="space-y-1.5">
                  <div className="text-[10.5px] font-mono text-neutral-400">{t('Vende')}{' '}<b className="text-neutral-200">{l.seller}</b></div>
                  <button type="button" className={`mk-buy !py-2.5 !text-[11px] ${ok ? '' : 'is-poor'}`} disabled={busy === l.id} onClick={() => buy(l)} data-buy-listing={l.id}>
                    <span className="mk-buy-shine" /><span>{t('Comprar')}</span><span className="ml-auto flex items-center gap-1 font-mono"><Flame className="w-3.5 h-3.5" />{l.price}</span>
                  </button>
                </div>} />
            );
          })}
        </div>
        {data && (page > 0 || data.more) && (
          <div className="flex justify-center gap-2 pt-1">
            <button type="button" className="sr-btn" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>{t('← Anterior')}</button>
            <button type="button" className="sr-btn" disabled={!data.more} onClick={() => setPage((p) => p + 1)}>{t('Siguiente →')}</button>
          </div>
        )}
      </section>

      {data && data.recent.length > 0 && (
        <section className="space-y-1.5">
          <h4 className="text-[11px] font-mono uppercase tracking-[0.18em] text-neutral-400">{t('Últimas ventas')}</h4>
          <div className="flex flex-wrap gap-1.5">
            {data.recent.map((r) => <span key={r.id} className="px-2 py-0.5 rounded-full border border-white/10 bg-black/30 text-[10.5px] font-mono text-neutral-300" style={{ borderColor: `${RARITY_STYLE[r.rarity as keyof typeof RARITY_STYLE]?.color ?? '#888'}55` }}>{KINDS.find(([k]) => k === r.kind)?.[1] ?? r.kind} {RARITY_STYLE[r.rarity as keyof typeof RARITY_STYLE]?.label ?? ''} · {r.price} $FLORA</span>)}
          </div>
        </section>
      )}
    </div>
  );
};
