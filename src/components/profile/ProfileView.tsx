import { EmpireCard } from '../empire/EmpireCard';
import { FounderBadge } from '../founder/FounderView';
import { useFounder } from '../../economy/founderApi';
import React, { useMemo, useRef, useState } from 'react';
import { Check, Coins, Flame, LogOut, Lock, Pencil, Settings, Upload, X } from 'lucide-react';
import { logoutServer } from '../../auth/api';
import { useGame } from '../../context/GameContext';
import { Avatar, AvatarArt, fileToAvatarDataUrl, RARITY_COLOR, RARITY_LABEL } from './AvatarArt';
import { Npc, useNpc } from '../npc/Npc';
import { ShopkeeperPicker } from '../npc/ShopkeeperPicker';
import { RestartGuide } from '../guide/RestartGuide';
import { Bump } from '../ResourceBar';
import { ListNftButton } from '../market/ListNft';
import { CHESTS, DESIGNS, DESIGN_BY_ID, RARITIES, SEASONS, daysLeftInSeason, seasonOf, validNick, type AvatarDesign, type ChestDef, type ChestId, type SeasonId } from '../../sim/avatars';
import { t, getLang } from '../../i18n';

const EMOJIS = ['🌱', '🌿', '🍃', '🌵', '🌴', '🪴', '🧑‍🌾', '👩‍🔬', '🧬', '🐝', '🦎', '🦉', '🔥', '⚡', '🌙', '👑'];

/* ───────────────────────── the chest ───────────────────────── */

const ChestArt: React.FC<{ chest: ChestDef; state: 'idle' | 'shake' | 'open'; className?: string }> = ({ chest, state, className = '' }) => {
  const [a, b] = chest.colors;
  return (
    <svg viewBox="0 0 120 110" className={`cs-chest cs-${state} ${className}`} aria-hidden>
      <ellipse cx="60" cy="102" rx="44" ry="6" fill="#000" opacity=".4" />
      <g className="cs-light"><path d="M60 62 L20 -20 H100Z" fill="#fde68a" opacity=".0" /></g>
      {/* body */}
      <rect x="16" y="56" width="88" height="44" rx="6" fill={b} stroke="#1c1305" strokeWidth="2" />
      <rect x="16" y="56" width="88" height="12" fill={a} opacity=".35" />
      {[30, 90].map((x) => <rect key={x} x={x - 4} y="56" width="8" height="44" fill="#fbbf24" stroke="#78350f" strokeWidth="1.5" />)}
      {/* lid */}
      <g className="cs-lid" style={{ transformOrigin: '16px 56px' }}>
        <path d="M16 56 V44 Q16 22 60 22 Q104 22 104 44 V56Z" fill={a} stroke="#1c1305" strokeWidth="2" />
        {[30, 90].map((x) => <rect key={x} x={x - 4} y="26" width="8" height="30" fill="#fbbf24" stroke="#78350f" strokeWidth="1.5" />)}
        <rect x="52" y="48" width="16" height="16" rx="3" fill="#fde047" stroke="#78350f" strokeWidth="2" />
        <circle cx="60" cy="57" r="2.4" fill="#78350f" />
      </g>
      <g className="cs-glow"><ellipse cx="60" cy="58" rx="38" ry="10" fill="#fde68a" /></g>
    </svg>
  );
};

interface Opening { chest: ChestDef; phase: 'shake' | 'open' | 'reveal'; design: AvatarDesign; isNew: boolean; refund: number; serial: number }

const RevealCard: React.FC<{ o: Opening; onEquip: () => void; onClose: () => void; onAgain: () => void }> = ({ o, onEquip, onClose, onAgain }) => {
  const rc = RARITY_COLOR[o.design.rarity];
  return (
    <div className="cs-reveal" style={{ ['--rc' as string]: rc } as React.CSSProperties}>
      <div className="cs-card">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: rc }}>{RARITY_LABEL[o.design.rarity]} · {SEASONS[o.design.season].emoji} {SEASONS[o.design.season].name.split('·')[0].trim()}</div>
        <div className="cs-avatar"><AvatarArt design={o.design} className="w-full h-full" /></div>
        <div className="font-serif text-xl font-black text-white leading-tight">{t(o.design.name)}</div>
        <div className="text-[10.5px] font-mono text-neutral-400">{t('NFT #{serial} · mint SIM en Devnet', { serial: o.serial })}</div>
        {o.isNew ? <div className="cs-new">{t('¡NUEVO!')}</div> : <div className="text-[11px] font-mono text-amber-300">{t('Repetido · +{refund} $FLORA de vuelta', { refund: o.refund })}</div>}
        <div className="flex gap-2 w-full pt-1">
          {o.isNew && <button className="care-btn flex-1" onClick={onEquip}><Check className="w-3.5 h-3.5" />{' '}{t('Equipar')}</button>}
          <button className="care-btn care-btn--gold flex-1" onClick={onAgain}>{t('Abrir otro')}</button>
          <button className="care-btn" onClick={onClose} aria-label={t('Cerrar')}><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────── the profile ───────────────────────── */

export const ProfileView: React.FC<{ onOpenAccountModal: () => void }> = ({ onOpenAccountModal }) => {
  const {
    currentUser, updateUserProfile, avatars, chestPity, openChest, equipAvatar, floraBalance, solBalance,
    playerLevel, playerXp, xpNeeded, rankTitle, plots, seedInventory, showNotification,
  } = useGame();
  const [tab, setTab] = useState<'avatar' | 'chests' | 'collection'>('chests');
  const [nick, setNick] = useState(currentUser?.displayName ?? '');
  const [nickErr, setNickErr] = useState('');
  const [upErr, setUpErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [currency, setCurrency] = useState<'FLORA' | 'SOL'>('FLORA');
  const [opening, setOpening] = useState<Opening | null>(null);
  const [seasonFilter, setSeasonFilter] = useState<SeasonId | 'all'>('all');
  const fileRef = useRef<HTMLInputElement>(null);
  const { status: founder } = useFounder();
  const npc = useNpc(t('¡Bienvenido a mi puesto de cofres! Cada uno guarda un avatar NFT de la temporada. Hay garantía: nunca te quedas sin premio gordo.'));

  const now = new Date();
  const season = SEASONS[seasonOf(now)];
  const owned = useMemo(() => new Map(avatars.map((a) => [a.designId, a])), [avatars]);
  if (!currentUser) return null;

  const saveNick = () => {
    const v = nick.trim().replace(/\s+/g, ' ');
    if (!validNick(v)) { setNickErr(t('3–20 caracteres: letras, números, espacios y . _ -')); return; }
    if (v === currentUser.displayName) { setNickErr(''); return; }
    updateUserProfile({ displayName: v });
    setNickErr('');
    showNotification(t('Apodo actualizado: {v}', { v }), 'success');
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true); setUpErr('');
    try {
      const url = await fileToAvatarDataUrl(f);
      updateUserProfile({ avatarImage: url, avatarNft: undefined });
      showNotification(t('Foto de perfil actualizada.'), 'success');
    } catch (e) { setUpErr(e instanceof Error ? e.message : t('No se pudo procesar la imagen.')); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const startOpen = async (id: ChestId) => {
    const r = await openChest(id, currency);
    if (!r) { npc.speak(t('Uy, no te alcanza para ese cofre. ¡Vuelve con más!'), 'sad'); return; }
    const chest = CHESTS[id];
    setOpening({ chest, phase: 'shake', design: r.design, isNew: r.isNew, refund: r.refund, serial: r.owned.serial });
    window.setTimeout(() => setOpening((o) => (o ? { ...o, phase: 'open' } : o)), 1100);
    window.setTimeout(() => setOpening((o) => (o ? { ...o, phase: 'reveal' } : o)), 1900);
    npc.speak(r.design.rarity === 'legendary' ? t('¡¡LEGENDARIO!! No me lo creo…') : r.design.rarity === 'epic' ? t('¡Épico! Qué buena suerte tienes.') : r.isNew ? t('Buen diseño, sí señor.') : t('Repetido, pero te devuelvo algo.'), r.design.rarity === 'common' && !r.isNew ? 'idle' : 'happy');
  };

  const level = Math.max(1, playerLevel);
  const totalOwned = avatars.length;
  const seedCount = Object.values(seedInventory).reduce((a, b) => a + b, 0);
  const designsShown = DESIGNS.filter((d) => (seasonFilter === 'all' ? true : d.season === seasonFilter));

  return (
    <div className="pl-stage animate-fade-in">
      <div className="pl-stars" />
      <div className="relative z-10 p-4 sm:p-6 space-y-5">
        <ShopkeeperPicker />
        <RestartGuide />

        {/* hero */}
        <div className="grid gap-5 lg:grid-cols-[auto_minmax(0,1fr)] items-center">
          <div className="pf-frame mx-auto lg:mx-0"><Avatar profile={currentUser} size={132} /></div>
          <div className="space-y-3 min-w-0">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-sky-300/80">{t('Apodo')}</div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <div className="relative flex-1 min-w-[12rem] max-w-md">
                  <Pencil className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input value={nick} maxLength={20} onChange={(e) => setNick(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveNick()} aria-label={t('Apodo')}
                    className="w-full bg-neutral-950/80 border border-neutral-700 focus:border-emerald-400/70 rounded-xl pl-9 pr-3 py-2.5 text-white font-serif text-lg outline-none" />
                </div>
                <button className="care-btn care-btn--gold" onClick={saveNick} disabled={nick.trim() === currentUser.displayName}>{t('Guardar')}</button>
                <button className="care-btn" onClick={onOpenAccountModal}><Settings className="w-3.5 h-3.5" />{' '}{t('Cuenta')}</button>
                <button className="care-btn" onClick={async () => { await logoutServer(); window.location.reload(); }}><LogOut className="w-3.5 h-3.5" />{' '}{t('Salir')}</button>
              </div>
              {nickErr && <p className="text-[11px] font-mono text-red-300 mt-1">{nickErr}</p>}
              <p className="text-[10.5px] font-mono text-neutral-500 mt-1 flex flex-wrap items-center gap-2"><span>@{currentUser.username} · {t(currentUser.role)}</span>{founder?.me && <FounderBadge number={founder.me.number} />}</p>
            </div>
            <div>
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-neutral-400"><span>{t('Nivel {level} · {rankTitle}', { level, rankTitle })}</span><span>{playerXp} / {xpNeeded} XP</span></div>
              <div className="mk-bar mt-1"><i style={{ ['--to' as string]: Math.min(1, playerXp / Math.max(1, xpNeeded)), background: 'linear-gradient(90deg,#059669,#fbbf24)' } as React.CSSProperties} /></div>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              <span className="mk-panel px-2.5 py-1.5 text-neutral-200">🖼️ <b className="text-purple-300">{totalOwned}</b>{t('/{length} avatares', { length: DESIGNS.length })}</span>
              <span className="mk-panel px-2.5 py-1.5 text-neutral-200">🗺️ <b className="text-amber-300">{plots.length}</b>{' '}{t('parcelas')}</span>
              <span className="mk-panel px-2.5 py-1.5 text-neutral-200">🌱 <b className="text-emerald-300">{seedCount}</b>{' '}{t('semillas')}</span>
              <span className="mk-panel px-2.5 py-1.5 text-neutral-200">{t('📅 desde {v0}', { v0: new Date(currentUser.createdAt).toLocaleDateString(getLang() === 'en' ? 'en-US' : 'es') })}</span>
            </div>
          </div>
        </div>

        <EmpireCard />

        {/* tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {([['chests', t('🎁 Cofres')], ['collection', t('🖼️ Colección')], ['avatar', t('📸 Foto de perfil')]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`mk-tab ${tab === id ? 'is-on' : ''}`}>{label}</button>
          ))}
        </div>

        {tab === 'chests' && (
          <div className="space-y-4 shop-swap">
            <div className="hud-panel px-3 pt-3 pb-1"><Npc kind="merchant" scene="perfil" text={t(npc.say.text)} mood={npc.say.mood} moodKey={npc.say.key} /></div>
            <div className="rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3" style={{ borderColor: `${season.colors[0]}66`, background: `linear-gradient(120deg, ${season.colors[0]}22, transparent)` }}>
              <div><div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: season.colors[0] }}>{t('Temporada actual')}</div><div className="font-serif text-xl font-black text-white">{season.emoji} {t(season.name)}</div><div className="text-xs text-neutral-400">{t(season.tagline)}</div></div>
              <div className="text-right"><div className="text-[10px] font-mono text-neutral-400">{t('termina en')}</div><div className="text-2xl font-black font-mono text-white">{daysLeftInSeason(now)} d</div></div>
              <button onClick={() => setCurrency((c) => (c === 'FLORA' ? 'SOL' : 'FLORA'))} className="mk-panel px-3 py-2 text-neutral-200 cursor-pointer text-[11px] font-mono" title={t('Cambiar moneda')}>
                {currency === 'FLORA' ? <Flame className="inline w-3.5 h-3.5 text-amber-300" /> : <Coins className="inline w-3.5 h-3.5 text-purple-300" />} <b><Bump value={currency === 'FLORA' ? floraBalance.toLocaleString() : String(solBalance)} /></b> {currency === 'FLORA' ? '$FLORA' : 'SOL'}
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {(Object.keys(CHESTS) as ChestId[]).map((id) => {
                const c = CHESTS[id];
                const price = currency === 'FLORA' ? c.priceFlora : c.priceSol;
                const ok = (currency === 'FLORA' ? floraBalance : solBalance) >= price;
                const p = chestPity[id];
                return (
                  <div key={id} className="hud-panel p-4 space-y-3">
                    <div className="flex items-center gap-4">
                      <ChestArt chest={c} state="idle" className="w-28 h-24 shrink-0 cs-float" />
                      <div className="min-w-0"><h3 className="font-serif text-lg font-black text-white">{t(c.name)}</h3><p className="text-xs text-neutral-400 leading-snug">{t(c.blurb)}</p></div>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      {RARITIES.map((r) => (
                        <div key={r} className="rounded-md border px-1 py-1" style={{ borderColor: `${RARITY_COLOR[r]}66`, opacity: c.odds[r] ? 1 : 0.35 }}>
                          <div className="text-[9px] font-mono uppercase" style={{ color: RARITY_COLOR[r] }}>{RARITY_LABEL[r]}</div>
                          <div className="text-[12px] font-mono font-bold text-white">{c.odds[r]}%</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1 text-[10px] font-mono text-neutral-400">
                      <div className="flex justify-between"><span>{t('Garantía épico+ (cada {epicEvery})', { epicEvery: c.epicEvery })}</span><span className="text-purple-300">{Math.min(p.sinceEpic, c.epicEvery)}/{c.epicEvery}</span></div>
                      <div className="mk-bar"><i style={{ ['--to' as string]: Math.min(1, p.sinceEpic / c.epicEvery), background: 'linear-gradient(90deg,#7e22ce,#c084fc)' } as React.CSSProperties} /></div>
                      <div className="flex justify-between"><span>{t('Garantía legendario (cada {legendEvery})', { legendEvery: c.legendEvery })}</span><span className="text-amber-300">{Math.min(p.sinceLegend, c.legendEvery)}/{c.legendEvery}</span></div>
                      <div className="mk-bar"><i style={{ ['--to' as string]: Math.min(1, p.sinceLegend / c.legendEvery), background: 'linear-gradient(90deg,#b45309,#fbbf24)' } as React.CSSProperties} /></div>
                    </div>
                    <button className={`mk-buy ${ok ? '' : 'is-poor'}`} onClick={() => startOpen(id)}>
                      <span className="mk-buy-shine" /><span>{t('Abrir cofre')}</span>
                      <span className="ml-auto flex items-center gap-1 font-mono">{currency === 'FLORA' ? <Flame className="w-4 h-4" /> : <Coins className="w-4 h-4" />}{price}</span>
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-[10.5px] font-mono text-neutral-500 leading-relaxed">{t('Cada avatar es un NFT simulado en Devnet. Salen diseños de la temporada actual y algunos clásicos; los de temporadas pasadas ya no salen de los cofres, así que los que consigas ahora serán más escasos. Un diseño repetido te devuelve $FLORA. Las probabilidades y la garantía están arriba, a la vista.')}</p>
          </div>
        )}

        {tab === 'collection' && (
          <div className="space-y-3 shop-swap">
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'primavera', 'verano', 'otono', 'invierno', 'classic'] as const).map((s) => (
                <button key={s} onClick={() => setSeasonFilter(s)} className={`shop-chip px-2.5 py-1 rounded-lg border text-[11px] font-medium cursor-pointer ${seasonFilter === s ? 'bg-neutral-800 border-neutral-600 text-white' : 'bg-neutral-900/60 border-neutral-800 text-neutral-400'}`}>{s === 'all' ? t('Todas') : `${SEASONS[s].emoji} ${SEASONS[s].name.split('·')[0].trim()}`}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {designsShown.map((d, i) => {
                const o = owned.get(d.id);
                const equipped = currentUser.avatarNft === d.id;
                return (
                  <div key={d.id} className="flex flex-col gap-1">
                  <button disabled={!o} onClick={() => equipAvatar(equipped ? null : d.id)} className={`pf-tile shop-in ${equipped ? 'is-eq' : ''}`} style={{ ['--rc' as string]: RARITY_COLOR[d.rarity], ['--d' as string]: `${Math.min(i, 14) * 30}ms` } as React.CSSProperties} title={o ? `${d.name} — ${RARITY_LABEL[d.rarity]}${o.count > 1 ? ` ×${o.count}` : ''}` : t('{v0} · aún no lo tienes', { v0: RARITY_LABEL[d.rarity] })}>
                    <span className={`block w-full aspect-square ${o ? '' : 'pf-locked'}`}><AvatarArt design={d} className="w-full h-full" /></span>
                    {!o && <Lock className="pf-lock w-4 h-4" />}
                    <span className="block text-[10px] font-bold text-neutral-200 leading-tight truncate mt-1">{o ? d.name : '???'}</span>
                    {equipped && <span className="pf-eq">{t('EQUIPADO')}</span>}
                    {o && o.count > 1 && <span className="mk-owned" style={{ top: 4, right: 4, bottom: 'auto' }}>×{o.count}</span>}
                  </button>
                  {o && d.season !== 'fundador' && <ListNftButton what={{ designId: d.id }} name={d.name} rarity={d.rarity} className="sr-btn !py-0.5 !text-[10px] justify-center" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'avatar' && (
          <div className="grid gap-4 lg:grid-cols-2 shop-swap">
            <div className="hud-panel p-4 space-y-3">
              <h3 className="font-serif text-sm font-bold tracking-[0.14em] uppercase text-emerald-200">{t('Subir tu foto')}</h3>
              <div className="flex items-center gap-4">
                <Avatar profile={{ ...currentUser, avatarNft: undefined }} size={84} />
                <div className="text-xs text-neutral-400 leading-snug">{t('PNG, JPG, WEBP o GIF de hasta 4 MB. La recortamos a un cuadrado de 256 px y la volvemos a codificar para quitarle datos ocultos (ubicación, metadatos).')}</div>
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              <div className="flex gap-2">
                <button className="care-btn care-btn--gold" disabled={busy} onClick={() => fileRef.current?.click()}><Upload className="w-3.5 h-3.5" /> {busy ? t('Procesando…') : t('Elegir imagen')}</button>
                {currentUser.avatarImage && <button className="care-btn" onClick={() => updateUserProfile({ avatarImage: undefined })}>{t('Quitar foto')}</button>}
              </div>
              {upErr && <p className="text-[11px] font-mono text-red-300">{upErr}</p>}
              <p className="text-[10.5px] font-mono text-neutral-500">{t('Prioridad: NFT equipado › tu foto › emoji. Para usar la foto, desequipa el NFT en la Colección.')}</p>
            </div>
            <div className="hud-panel p-4 space-y-3">
              <h3 className="font-serif text-sm font-bold tracking-[0.14em] uppercase text-emerald-200">{t('O elige un emoji')}</h3>
              <div className="grid grid-cols-8 gap-2">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => updateUserProfile({ avatar: e, avatarImage: undefined, avatarNft: undefined })} className={`aspect-square rounded-xl border text-xl grid place-items-center cursor-pointer transition hover:scale-110 ${currentUser.avatar === e && !currentUser.avatarImage && !currentUser.avatarNft ? 'border-emerald-300 bg-emerald-400/10' : 'border-neutral-700 bg-neutral-950/60'}`}>{e}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* chest opening overlay */}
      {opening && (
        <div className="cs-overlay" role="dialog" aria-label={t('Abriendo cofre')}>
          {opening.phase !== 'reveal' ? (
            <div className="cs-stage">
              <ChestArt chest={opening.chest} state={opening.phase === 'shake' ? 'shake' : 'open'} className="w-64 h-56" />
              {opening.phase === 'open' && <div className="cs-burst" style={{ ['--rc' as string]: RARITY_COLOR[opening.design.rarity] } as React.CSSProperties} />}
              <div className="text-center font-mono text-sm text-amber-200 mt-2">{opening.phase === 'shake' ? t('Abriendo…') : t('¡Ahí va!')}</div>
            </div>
          ) : (
            <RevealCard
              o={opening}
              onEquip={() => { equipAvatar(opening.design.id); setOpening(null); }}
              onClose={() => setOpening(null)}
              onAgain={() => { const id = opening.chest.id; setOpening(null); window.setTimeout(() => startOpen(id), 60); }}
            />
          )}
        </div>
      )}
      <p className="pt-4 text-center text-[10.5px] font-mono text-neutral-500">{t('© 2026 WOLI CBD S.A. · Yield Bud Empire. Todos los derechos reservados.')}</p>
    </div>
  );
};

export { DESIGN_BY_ID };
