import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Ban, BarChart3, Coins, Copy, Footprints, Gift, Menu, MonitorSmartphone, Pause, Play, Server, ShieldAlert, Ticket, Users, Wrench, X } from 'lucide-react';

/**
 * The operators' panel (`/#panel`): players, progress, economy and the server, refreshed every few seconds. Only accounts flagged
 * admin see it (node server/admin.mjs panel <usuario>); for anyone else the server answers 404 and this page says so. Mostly
 * read-only; the admin actions (invitations, a $FLORA chest, blocking an account) always ask for a confirmation first.
 * An internal tool: Spanish only, no game translations.
 */
type Json = Record<string, any>;
const get = async (path: string): Promise<Json | number> => {
  try { const r = await fetch(path, { credentials: 'same-origin' }); return r.ok ? await r.json() : r.status; } catch { return 0; }
};
const ACTION_ERR: Record<string, string> = { is_admin: 'No se puede bloquear una cuenta admin.', bad_amount: 'Monto inválido (1 a 1 000 000).', no_such_player: 'Ese jugador no existe.', no_such_code: 'Ese código no existe.', rate_limited: 'Demasiadas acciones seguidas; espera un minuto.' };
/** an admin action (server/panel.mjs → /api/admin/action) */
const act = async (body: Json): Promise<Json> => {
  try {
    const r = await fetch('/api/admin/action', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-cf-csrf': '1' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? j : { error: ACTION_ERR[j.error] ?? `No se pudo (${j.error ?? r.status}).` };
  } catch { return { error: 'Sin conexión con el servidor.' }; }
};

/** asks before doing something; for the serious ones, the admin types the player's name to confirm */
const Confirm: React.FC<{ title: string; body: React.ReactNode; confirm: string; danger?: boolean; typeToConfirm?: string; onYes: () => Promise<void> | void; onNo: () => void }> = ({ title, body, confirm, danger, typeToConfirm, onYes, onNo }) => {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = !typeToConfirm || typed.trim() === typeToConfirm;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="alertdialog" aria-modal>
      <button type="button" aria-label="Cancelar" className="absolute inset-0 bg-black/70" onClick={onNo} />
      <div className={`relative w-full max-w-md rounded-2xl border ${danger ? 'border-rose-400/40' : 'border-lime-300/30'} bg-[#140f2b] p-5 shadow-2xl`}>
        <h3 className="text-lg font-black text-white">{title}</h3>
        <div className="text-[13.5px] text-neutral-300 mt-2 space-y-2">{body}</div>
        {typeToConfirm && (
          <label className="block mt-3 text-[12px] text-neutral-400">Escribe <b className="text-white">{typeToConfirm}</b> para confirmar
            <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} className="mt-1 w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-white" />
          </label>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onNo} className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm">Cancelar</button>
          <button type="button" disabled={!ready || busy} onClick={async () => { setBusy(true); await onYes(); setBusy(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-40 ${danger ? 'bg-rose-500 hover:bg-rose-400 text-white' : 'bg-lime-300 hover:bg-lime-200 text-[#14210a]'}`}>{busy ? '…' : confirm}</button>
        </div>
      </div>
    </div>
  );
};
type Ask = React.ComponentProps<typeof Confirm> | null;
const fmt = (n: number) => (Math.round(n) || 0).toLocaleString('es-CR');
const ago = (ts: number, now = Date.now()) => {
  const s = Math.max(0, (now - ts) / 1000);
  if (s < 60) return 'ahora'; if (s < 3600) return `hace ${Math.floor(s / 60)} min`; if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
};
const dur = (ms: number) => { const h = Math.floor(ms / 3600_000); return h >= 48 ? `${Math.floor(h / 24)} d` : h >= 1 ? `${h} h ${Math.floor((ms % 3600_000) / 60_000)} min` : `${Math.floor(ms / 60_000)} min`; };
const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`;
const hhmm = (ts: number) => new Date(ts).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });

const EVENT: Record<string, string> = {
  signup: '🆕 se registró', signup_google: '🆕 se registró con Google', login: '🔑 entró', login_google: '🔑 entró con Google', login_fail: '⚠️ contraseña errada',
  game_harvestPlant: '🌾 cosechó', game_harvestAllReadyPlants: '🌾 cosechó toda la sala', game_plantFromSeedBank: '🌱 sembró', game_plantPlot: '🌱 sembró en parcela',
  game_buyAsset: '🛒 compró equipo', game_buySeed: '🛒 compró semillas', game_buyPlot: '🗺️ compró parcela', game_upgradeFacility: '🏗️ mejoró instalación',
  econ_start_build: '🏗️ empezó una obra', econ_sell: '💱 vendió en el mercado', econ_avatar_chest: '🎁 abrió cofre de avatar', econ_staff_chest: '🎁 abrió cofre de personal',
  game_claimQuestReward: '🏆 reclamó reto', game_sellProduct: '💰 vendió producto', game_hireCandidate: '👷 contrató', game_hybridizeParents: '🧬 cruzó', game_breedStrains: '🧬 cruzó',
  email_verified: '✉️ verificó su correo', prereg: '📝 pre-registro', flag_multi_ip: '🚩 varias cuentas misma IP', bot_signal: '🤖 señal de bot', wallet_link: '👛 vinculó wallet', reset_request: '🔁 pidió cambiar contraseña',
};

/** the same player doing the same thing several times in a row is one line («cosechó ×10») */
const groupFeed = (feed: Json[]) => feed.reduce<Json[]>((out, e) => {
  const last = out[out.length - 1];
  if (last && last.id === e.id && last.event === e.event) last.n++; else out.push({ ...e, n: 1 });
  return out;
}, []);

/* ───────── small charts (plain SVG) ───────── */
const Bars: React.FC<{ data: Array<{ label: string; v: number; v2?: number }>; color?: string; color2?: string; h?: number }> = ({ data, color = '#b8f35a', color2 = '#f472b6', h = 110 }) => {
  const max = Math.max(1, ...data.map((d) => Math.max(d.v, d.v2 ?? 0)));
  const w = 100 / Math.max(1, data.length);
  return (
    <div>
      <svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" className="w-full" style={{ height: h }}>
        {data.map((d, i) => (
          <g key={i}>
            <rect x={i * w + w * 0.12} width={w * (d.v2 === undefined ? 0.76 : 0.38)} y={h - (d.v / max) * (h - 4)} height={(d.v / max) * (h - 4)} fill={color} rx="0.6"><title>{`${d.label}: ${fmt(d.v)}`}</title></rect>
            {d.v2 !== undefined && <rect x={i * w + w * 0.5} width={w * 0.38} y={h - (d.v2 / max) * (h - 4)} height={(d.v2 / max) * (h - 4)} fill={color2} rx="0.6"><title>{`${d.label}: ${fmt(d.v2)}`}</title></rect>}
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1"><span>{data[0]?.label}</span><span>máx {fmt(max)}</span><span>{data[data.length - 1]?.label}</span></div>
    </div>
  );
};
const Line: React.FC<{ data: number[]; color?: string; h?: number; labels?: [string, string] }> = ({ data, color = '#5eead4', h = 70, labels }) => {
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * 100},${h - (v / max) * (h - 4) - 2}`).join(' ');
  return (
    <div>
      <svg viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" className="w-full" style={{ height: h }}>
        <polyline points={`0,${h} ${pts} 100,${h}`} fill={`${color}22`} stroke="none" />
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      </svg>
      {labels && <div className="flex justify-between text-[10px] text-neutral-500 font-mono mt-1"><span>{labels[0]}</span><span>máx {fmt(max)}</span><span>{labels[1]}</span></div>}
    </div>
  );
};

const Card: React.FC<{ title: string; children: React.ReactNode; aside?: React.ReactNode; className?: string }> = ({ title, children, aside, className = '' }) => (
  <section className={`rounded-2xl border border-white/10 bg-white/[0.035] p-4 ${className}`}>
    <header className="flex items-center justify-between gap-2 mb-3"><h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-neutral-300">{title}</h3>{aside}</header>
    {children}
  </section>
);
const Kpi: React.FC<{ label: string; value: React.ReactNode; hint?: string; tone?: string }> = ({ label, value, hint, tone = 'text-white' }) => (
  <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5" title={hint}>
    <div className={`text-2xl font-black font-mono ${tone}`}>{value}</div>
    <div className="text-[11px] text-neutral-400 leading-tight mt-0.5">{label}</div>
  </div>
);
const Dist: React.FC<{ rows: Array<{ k: string; n: number }>; prefix: string }> = ({ rows, prefix }) => {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.k} className="flex items-center gap-2 text-[12px]">
          <span className="w-20 shrink-0 text-neutral-400 font-mono">{prefix} {r.k}</span>
          <span className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden"><i className="block h-full rounded-full bg-emerald-400/80" style={{ width: `${(r.n / max) * 100}%` }} /></span>
          <span className="w-8 text-right font-mono text-white">{r.n}</span>
        </div>
      ))}
      {!rows.length && <p className="text-[12px] text-neutral-500">Sin datos todavía.</p>}
    </div>
  );
};


const STAGE: Record<string, string> = { seed: 'Germinación', seedling: 'Plántula', vegetative: 'Vegetativo', flowering: 'Floración', maturation: 'Maduración', ready_harvest: 'Lista 🌾' };

/** one player's card (side sheet): what support needs to answer «no me funciona tal cosa» */
const PlayerCard: React.FC<{ id: number; onClose: () => void }> = ({ id, onClose }) => {
  const [c, setC] = useState<Json | null>(null);
  const [err, setErr] = useState(false);
  const [ask, setAsk] = useState<Ask>(null);
  const [gift, setGift] = useState<{ amount: string; es: string; en: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const reload = async () => { const r = await get(`/api/admin/player?id=${id}`); if (typeof r !== 'number') setC(r); };
  const done = (r: Json, okText: string) => { setAsk(null); setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: okText }); void reload(); };
  const askBan = () => setAsk({
    title: `¿Bloquear a ${c!.name}?`, danger: true, confirm: 'Bloquear', typeToConfirm: c!.name, onNo: () => setAsk(null),
    body: <><p>Se cierran todas sus sesiones y no podrá volver a entrar hasta que alguien la desbloquee.</p><p className="text-neutral-400">Su partida, su $FLORA y sus NFT no se tocan.</p></>,
    onYes: async () => done(await act({ action: 'ban', id }), `${c!.name} quedó bloqueado.`),
  });
  const askUnban = () => setAsk({
    title: `¿Desbloquear a ${c!.name}?`, confirm: 'Desbloquear', onNo: () => setAsk(null),
    body: <p>Podrá volver a entrar con su contraseña o con Google.</p>,
    onYes: async () => done(await act({ action: 'unban', id }), `${c!.name} ya puede entrar.`),
  });
  const askGift = () => {
    const amount = Math.floor(Number(gift?.amount));
    if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) { setMsg({ ok: false, text: 'Monto inválido (1 a 1 000 000).' }); return; }
    setAsk({
      title: `¿Regalar ${fmt(amount)} $FLORA a ${c!.name}?`, confirm: 'Enviar regalo', onNo: () => setAsk(null),
      body: <><p>Le llega un cofre en el juego y el monto se suma cuando lo abre.</p>{(gift?.es || gift?.en) && <p className="text-neutral-400">Nota: «{gift?.es || gift?.en}»{gift?.en && gift?.es ? ` / «${gift.en}»` : ''}</p>}</>,
      onYes: async () => { const r = await act({ action: 'gift', id, amount, noteEs: gift?.es, noteEn: gift?.en }); if (!r.error) setGift(null); done(r, `Cofre de ${fmt(amount)} $FLORA enviado a ${c!.name}.`); },
    });
  };
  useEffect(() => {
    let alive = true;
    const pull = async () => { const r = await get(`/api/admin/player?id=${id}`); if (!alive) return; if (typeof r === 'number') setErr(true); else setC(r); };
    void pull(); const t = window.setInterval(pull, 10000);
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => { alive = false; window.clearInterval(t); window.removeEventListener('keydown', esc); };
  }, [id, onClose]);
  const Plant = ({ p }: { p: Json }) => (
    <div className="flex items-center gap-2 text-[12px] py-1 border-b border-white/5">
      <span className="flex-1 truncate text-white">{p.strain}</span>
      <span className="w-24 text-neutral-300">{STAGE[p.stage] ?? p.stage}</span>
      <span className="w-12 text-right font-mono">{p.progress}%</span>
      <span className={`w-14 text-right font-mono ${p.health < 60 ? 'text-rose-300' : ''}`}>♥{p.health}</span>
      <span className={`w-14 text-right font-mono ${p.moisture < 35 ? 'text-amber-300' : ''}`}>💧{p.moisture}</span>
      <span className="w-16 text-right">{p.pest ? <span className="text-rose-300">🐛 {p.pest}</span> : ''}</span>
    </div>
  );
  return (
    <div className="fixed inset-0 z-30 flex justify-end" role="dialog" aria-modal>
      <button type="button" aria-label="Cerrar" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="relative w-full max-w-[720px] h-full overflow-auto bg-[#0e0a1f] border-l border-white/10 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-white">{c?.name ?? '…'} <span className="text-neutral-500 font-mono text-sm">#{id}</span></h2>
            {c && <p className="text-[12px] text-neutral-400 mt-0.5">{c.online ? <span className="text-emerald-300">● en línea</span> : `última actividad ${ago(c.last)}`} · registrado {new Date(c.created).toLocaleDateString('es-CR')} · {c.source}{c.lang ? ` · ${c.lang}` : ''}</p>}
          </div>
          <button type="button" onClick={onClose} className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-sm">Cerrar ✕</button>
        </div>
        {err && <p className="text-rose-300 text-sm">No se pudo cargar la ficha.</p>}
        {msg && <p className={`text-[13px] rounded-lg px-3 py-2 ${msg.ok ? 'bg-emerald-400/10 text-emerald-200' : 'bg-rose-400/10 text-rose-200'}`}>{msg.text}</p>}
        {c && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setGift(gift ? null : { amount: '', es: '', en: '' })} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-lime-300/15 hover:bg-lime-300/25 text-lime-200 text-[13px] font-semibold"><Gift className="w-4 h-4" />Regalar $FLORA</button>
            {c.locked
              ? <button type="button" onClick={askUnban} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400/15 hover:bg-emerald-400/25 text-emerald-200 text-[13px] font-semibold"><Play className="w-4 h-4" />Desbloquear</button>
              : !c.admin && <button type="button" onClick={askBan} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 text-[13px] font-semibold"><Ban className="w-4 h-4" />Bloquear cuenta</button>}
          </div>
        )}
        {c && gift && (
          <div className="rounded-xl border border-lime-300/25 bg-lime-300/[0.04] p-3 grid sm:grid-cols-[120px_1fr_1fr_auto] gap-2 items-end">
            <label className="text-[11px] text-neutral-400">Monto<input inputMode="numeric" value={gift.amount} onChange={(e) => setGift({ ...gift, amount: e.target.value.replace(/[^\d]/g, '') })} placeholder="500" className="mt-1 w-full rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-white font-mono" /></label>
            <label className="text-[11px] text-neutral-400">Nota (español)<input value={gift.es} maxLength={120} onChange={(e) => setGift({ ...gift, es: e.target.value })} placeholder="Gracias por probar la alfa" className="mt-1 w-full rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-white" /></label>
            <label className="text-[11px] text-neutral-400">Nota (inglés, opcional)<input value={gift.en} maxLength={120} onChange={(e) => setGift({ ...gift, en: e.target.value })} placeholder="Thanks for testing the alpha" className="mt-1 w-full rounded-lg bg-black/40 border border-white/15 px-2 py-1.5 text-white" /></label>
            <button type="button" onClick={askGift} className="px-3 py-2 rounded-lg bg-lime-300 text-[#14210a] text-sm font-bold">Revisar</button>
          </div>
        )}
        {ask && <Confirm {...ask} />}
        {c && (<>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {(c.flags as string[]).map((f) => <span key={f} className="px-2 py-0.5 rounded bg-white/10">{f}</span>)}
            {c.founder && <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-200">👑 Fundador #{c.founder}</span>}
            <span className={`px-2 py-0.5 rounded ${c.email_verified ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'}`}>{c.email_verified ? 'correo verificado' : 'correo sin verificar'}</span>
            {c.locked && <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-200">bloqueada</span>}
            <span className="px-2 py-0.5 rounded bg-white/5">avisos de cosecha: {c.harvestMail ? 'sí' : 'no'}</span>
            <span className="px-2 py-0.5 rounded bg-white/5">términos {c.terms ?? '—'}</span>
            {c.invite && <span className="px-2 py-0.5 rounded bg-white/5">invitación {c.invite.code}</span>}
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <Kpi label="Nivel" value={c.game.level} /><Kpi label="Instalación" value={c.facility.tier} /><Kpi label="Rango" value={c.facility.rank} />
            <Kpi label="$FLORA" value={fmt(c.flora)} /><Kpi label="Acciones" value={fmt(c.actions)} /><Kpi label="Cosechas" value={c.harvests} />
          </div>
          <Card title="Instalación">
            <p className="text-[13px]">Abiertas: <span className="font-mono">{(c.facility.unlocked as string[]).join(', ') || '—'}</span></p>
            {c.facility.construction && <p className="text-[13px] mt-1 text-amber-200">🏗️ Construyendo {c.facility.construction.facilityId} · termina {new Date(c.facility.construction.endsAt).toLocaleString('es-CR')}</p>}
            <p className="text-[12px] text-neutral-400 mt-1">Riego automático: {c.game.auto.water ? 'sí' : 'no'} · Clima automático: {c.game.auto.climate ? 'sí' : 'no'} · Semillas: {c.seeds} · Lotes de laboratorio: {c.products} · Retos cobrados: {(c.quests as string[]).length}</p>
            <p className="text-[12px] text-neutral-400 mt-1">Tutorial: {c.tutorial ? (c.tutorial.dismissed ? 'cerrado' : `paso ${(c.tutorial.index ?? 0) + 1}`) : 'sin empezar'}</p>
          </Card>
          <Card title={`Plantas en interior (${(c.indoor as Json[]).length})`}>
            {(c.indoor as Json[]).length ? (c.indoor as Json[]).map((p, i) => <Plant key={i} p={p} />) : <p className="text-[12px] text-neutral-500">Ninguna.</p>}
          </Card>
          {(c.plots as Json[]).length > 0 && (
            <Card title={`Parcelas (${(c.plots as Json[]).length})`}>
              {(c.plots as Json[]).map((pl) => <div key={pl.site} className="mb-2"><p className="text-[11px] font-mono text-neutral-400">{pl.site}</p>{(pl.plants as Json[]).map((p, i) => <Plant key={i} p={p} />)}{!(pl.plants as Json[]).length && <p className="text-[12px] text-neutral-500">vacía</p>}</div>)}
            </Card>
          )}
          <Card title="NFT">
            <div className="flex flex-wrap gap-2 text-[12.5px]">{(c.nfts as Json[]).map((n) => <span key={n.kind} className="px-2 py-1 rounded bg-white/5">{n.kind}: <b>{n.n}</b>{n.escrow ? ` (${n.escrow} en el mercado o el puente)` : ''}</span>)}{!(c.nfts as Json[]).length && <span className="text-neutral-500">Ninguno.</span>}</div>
          </Card>
          {(c.errors as Json[]).length > 0 && (
            <Card title="Errores que le salieron">
              <ul className="text-[12px] divide-y divide-white/5">{(c.errors as Json[]).map((e, i) => <li key={i} className="py-1"><span className="text-neutral-500 mr-2">{ago(e.ts)}</span><span className="font-mono text-rose-200">{e.name}</span> <span className="text-neutral-500">· {e.device}</span></li>)}</ul>
            </Card>
          )}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Últimas acciones">
              <ul className="text-[12px] divide-y divide-white/5 max-h-[360px] overflow-auto">{(c.activity as Json[]).map((e, i) => <li key={i} className="py-1 flex gap-2"><span className="w-20 shrink-0 text-neutral-500">{ago(e.ts)}</span><span className="text-neutral-200">{EVENT[e.event] ?? e.event.replace(/^game_/, '')}</span>{e.detail && <span className="text-neutral-500 truncate">{e.detail}</span>}</li>)}</ul>
            </Card>
            <Card title="Movimientos de $FLORA">
              <ul className="text-[12px] divide-y divide-white/5 max-h-[360px] overflow-auto">{(c.ledger as Json[]).map((l, i) => <li key={i} className="py-1 flex gap-2"><span className="w-20 shrink-0 text-neutral-500">{ago(l.ts)}</span><span className="flex-1 truncate text-neutral-300">{l.ref || l.kind}</span><span className={`font-mono ${l.delta > 0 ? 'text-lime-300' : 'text-pink-300'}`}>{l.delta > 0 ? '+' : ''}{fmt(l.delta)}</span><span className="w-20 text-right font-mono text-neutral-500">{fmt(l.balance)}</span></li>)}</ul>
            </Card>
          </div>
        </>)}
      </aside>
    </div>
  );
};

/** invitations and gifts, with a confirmation before each one (blocking lives in each player's card) */
const ActionsView: React.FC = () => {
  const [inv, setInv] = useState<Json[] | null>(null);
  const [list, setList] = useState<Json[]>([]);
  const [ask, setAsk] = useState<Ask>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [made, setMade] = useState<Json[]>([]);
  const [form, setForm] = useState({ count: '1', uses: '1', note: '' });
  const [g, setG] = useState({ id: '', amount: '', es: '', en: '' });
  const [copied, setCopied] = useState('');
  const load = async () => {
    const r = await get('/api/admin/invites'); if (typeof r !== 'number') setInv(r.invites);
    const p = await get('/api/admin/players'); if (typeof p !== 'number') setList((p.players as Json[]).filter((x) => !x.banned));
  };
  useEffect(() => { void load(); }, []);
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); setCopied(text); window.setTimeout(() => setCopied(''), 1500); } catch { /* no clipboard */ } };
  const askInvite = () => {
    const count = Math.max(1, Math.min(50, Number(form.count) || 1)), uses = Math.max(1, Math.min(100, Number(form.uses) || 1));
    setAsk({
      title: `¿Crear ${count} ${count === 1 ? 'invitación' : 'invitaciones'}?`, confirm: 'Crear', onNo: () => setAsk(null),
      body: <p>{count} código{count === 1 ? '' : 's'} de {uses} uso{uses === 1 ? '' : 's'} cada uno{form.note ? `, con la nota «${form.note}»` : ''}. Cada uso abre una cuenta nueva en la alfa.</p>,
      onYes: async () => { const r = await act({ action: 'invite', count, uses, note: form.note }); setAsk(null); if (r.error) setMsg({ ok: false, text: r.error }); else { setMade(r.codes); setMsg({ ok: true, text: `${r.codes.length} invitación(es) creada(s).` }); void load(); } },
    });
  };
  const askRevoke = (code: string) => setAsk({
    title: '¿Anular esta invitación?', confirm: 'Anular', danger: true, onNo: () => setAsk(null),
    body: <p>El código <b className="font-mono">{code}</b> deja de servir. Las cuentas que ya se crearon con él siguen igual.</p>,
    onYes: async () => { const r = await act({ action: 'revoke', code }); setAsk(null); setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: `Código ${code} anulado.` }); void load(); },
  });
  const askGift = () => {
    const p = list.find((x) => String(x.id) === g.id); const amount = Math.floor(Number(g.amount));
    if (!p) { setMsg({ ok: false, text: 'Elige un jugador.' }); return; }
    if (!Number.isFinite(amount) || amount < 1 || amount > 1_000_000) { setMsg({ ok: false, text: 'Monto inválido (1 a 1 000 000).' }); return; }
    setAsk({
      title: `¿Regalar ${fmt(amount)} $FLORA a ${p.name}?`, confirm: 'Enviar regalo', onNo: () => setAsk(null),
      body: <><p>Le llega un cofre en el juego y el monto se suma cuando lo abre.</p>{p.dev && <p className="text-amber-200">Ojo: es una cuenta dev.</p>}</>,
      onYes: async () => { const r = await act({ action: 'gift', id: p.id, amount, noteEs: g.es, noteEn: g.en }); setAsk(null); setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: `Cofre de ${fmt(amount)} $FLORA enviado a ${p.name}.` }); if (!r.error) setG({ id: '', amount: '', es: '', en: '' }); },
    });
  };
  const input = 'mt-1 w-full rounded-lg bg-black/40 border border-white/15 px-2.5 py-2 text-white';
  return (
    <div className="space-y-4">
      {msg && <p className={`text-[13px] rounded-lg px-3 py-2 ${msg.ok ? 'bg-emerald-400/10 text-emerald-200' : 'bg-rose-400/10 text-rose-200'}`}>{msg.text}</p>}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Crear invitaciones" aside={<Ticket className="w-4 h-4 text-lime-300" />}>
          <div className="grid grid-cols-[90px_90px_1fr] gap-2">
            <label className="text-[11px] text-neutral-400">Cantidad<input inputMode="numeric" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value.replace(/\D/g, '') })} className={input} /></label>
            <label className="text-[11px] text-neutral-400">Usos c/u<input inputMode="numeric" value={form.uses} onChange={(e) => setForm({ ...form, uses: e.target.value.replace(/\D/g, '') })} className={input} /></label>
            <label className="text-[11px] text-neutral-400">Nota (para quién)<input value={form.note} maxLength={80} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="ola 2 · Discord" className={input} /></label>
          </div>
          <button type="button" onClick={askInvite} className="mt-3 px-4 py-2 rounded-lg bg-lime-300 text-[#14210a] text-sm font-bold">Crear</button>
          {made.length > 0 && (
            <ul className="mt-3 space-y-1.5">{made.map((m) => (
              <li key={m.code} className="flex items-center gap-2 rounded-lg bg-black/30 px-2.5 py-1.5 text-[12px]">
                <b className="font-mono text-lime-200">{m.code}</b><span className="flex-1 truncate text-neutral-400">{m.link}</span>
                <button type="button" onClick={() => copy(m.link)} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10"><Copy className="w-3.5 h-3.5" />{copied === m.link ? 'Copiado' : 'Copiar enlace'}</button>
              </li>))}</ul>
          )}
        </Card>
        <Card title="Regalar $FLORA" aside={<Gift className="w-4 h-4 text-lime-300" />}>
          <div className="grid sm:grid-cols-[1fr_120px] gap-2">
            <label className="text-[11px] text-neutral-400">Jugador
              <select value={g.id} onChange={(e) => setG({ ...g, id: e.target.value })} className={input}>
                <option value="">Elegir…</option>
                {list.map((p) => <option key={p.id} value={p.id}>{p.name}{p.dev ? ' (dev)' : ''} · nivel {p.level}</option>)}
              </select>
            </label>
            <label className="text-[11px] text-neutral-400">Monto<input inputMode="numeric" value={g.amount} onChange={(e) => setG({ ...g, amount: e.target.value.replace(/\D/g, '') })} placeholder="500" className={`${input} font-mono`} /></label>
            <label className="text-[11px] text-neutral-400">Nota (español)<input value={g.es} maxLength={120} onChange={(e) => setG({ ...g, es: e.target.value })} placeholder="Gracias por probar la alfa" className={input} /></label>
            <label className="text-[11px] text-neutral-400 sm:col-span-1">Nota (inglés)<input value={g.en} maxLength={120} onChange={(e) => setG({ ...g, en: e.target.value })} placeholder="Thanks!" className={input} /></label>
          </div>
          <button type="button" onClick={askGift} className="mt-3 px-4 py-2 rounded-lg bg-lime-300 text-[#14210a] text-sm font-bold">Revisar y enviar</button>
          <p className="text-[11px] text-neutral-500 mt-2">Para bloquear o desbloquear una cuenta, ábrela desde Jugadores o Seguridad.</p>
        </Card>
      </div>
      <Card title="Invitaciones" aside={<span className="text-[11px] text-neutral-500">las 60 más recientes</span>}>
        {!inv ? <p className="text-neutral-500 text-sm">Cargando…</p> : (
          <div className="overflow-auto"><table className="w-full text-[12.5px] whitespace-nowrap">
            <thead className="text-neutral-400 text-left"><tr className="border-b border-white/10"><th className="py-1.5 pr-3">Código</th><th className="pr-3">Nota</th><th className="text-right pr-3">Usos</th><th className="pr-3">Creada</th><th className="pr-3">Estado</th><th /></tr></thead>
            <tbody>{inv.map((r) => {
              const state = r.revoked ? 'anulada' : r.uses >= r.max_uses ? 'usada' : 'disponible';
              return (
                <tr key={r.code} className="border-b border-white/5">
                  <td className="py-1.5 pr-3 font-mono text-white">{r.code}</td><td className="pr-3 text-neutral-400 max-w-[220px] truncate">{r.note}</td>
                  <td className="text-right pr-3 font-mono">{r.uses}/{r.max_uses}</td><td className="pr-3 text-neutral-400">{ago(r.created_at)}</td>
                  <td className="pr-3"><span className={`text-[11px] px-1.5 rounded ${state === 'disponible' ? 'bg-emerald-400/15 text-emerald-200' : state === 'usada' ? 'bg-white/10 text-neutral-300' : 'bg-rose-400/15 text-rose-200'}`}>{state}</span></td>
                  <td className="text-right space-x-1.5">{state === 'disponible' && <>
                    <button type="button" onClick={() => copy(r.link)} className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11.5px]">{copied === r.link ? 'Copiado' : 'Copiar enlace'}</button>
                    <button type="button" onClick={() => askRevoke(r.code)} className="px-2 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 text-[11.5px]">Anular</button>
                  </>}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </Card>
      <p className="text-[11.5px] text-neutral-500">Cada acción queda registrada con el nombre del admin que la hizo.</p>
      {ask && <Confirm {...ask} />}
    </div>
  );
};

type Tab = 'resumen' | 'embudo' | 'jugadores' | 'economia' | 'cliente' | 'seguridad' | 'servidor' | 'acciones';
/** the side menu, by section (it replaced a single crowded row of tabs) */
const NAV: Array<{ group: string; items: Array<[Tab, string, React.FC<{ className?: string }>]> }> = [
  { group: 'General', items: [['resumen', 'Resumen', BarChart3], ['embudo', 'Primeros pasos', Footprints]] },
  { group: 'Jugadores', items: [['jugadores', 'Jugadores', Users], ['seguridad', 'Seguridad', ShieldAlert]] },
  { group: 'Economía', items: [['economia', 'Economía', Coins]] },
  { group: 'Técnico', items: [['cliente', 'Lado del jugador', MonitorSmartphone], ['servidor', 'Servidor', Server]] },
  { group: 'Gestión', items: [['acciones', 'Acciones', Wrench]] },
];
const LABEL = Object.fromEntries(NAV.flatMap((g) => g.items.map(([id, label]) => [id, label]))) as Record<Tab, string>;

export const AdminPanel: React.FC = () => {
  const [tab, setTab] = useState<Tab>('resumen');
  const [ov, setOv] = useState<Json | null>(null);
  const [players, setPlayers] = useState<Json[] | null>(null);
  const [econ, setEcon] = useState<Json | null>(null);
  const [client, setClient] = useState<Json | null>(null);
  const [fun, setFun] = useState<Json | null>(null);
  const [funDays, setFunDays] = useState(0);
  const [card, setCard] = useState<number | null>(null);
  const [sec, setSec] = useState<Json | null>(null);
  const closeCard = React.useCallback(() => setCard(null), []);
  const [denied, setDenied] = useState<number | null>(null);
  const [updated, setUpdated] = useState(0);
  const [live, setLive] = useState(true);
  const [sort, setSort] = useState<string>('last');
  const [hideDev, setHideDev] = useState(false);
  const [menu, setMenu] = useState(false);

  // the summary every 5 s; the tab's own data every 15 s (and at once when the tab opens)
  useEffect(() => {
    let alive = true;
    const pull = async () => {
      if (document.hidden) return;
      const o = await get('/api/admin/overview');
      if (!alive) return;
      if (typeof o === 'number') { setDenied(o); return; }
      setOv(o); setDenied(null); setUpdated(Date.now());
    };
    void pull();
    const id = live ? window.setInterval(pull, 5000) : 0;
    return () => { alive = false; window.clearInterval(id); };
  }, [live]);
  useEffect(() => {
    if (tab !== 'jugadores' && tab !== 'economia' && tab !== 'cliente' && tab !== 'embudo' && tab !== 'seguridad') return;
    let alive = true;
    const pull = async () => {
      if (document.hidden) return;
      if (tab === 'jugadores') { const r = await get('/api/admin/players'); if (alive && typeof r !== 'number') setPlayers(r.players); }
      else if (tab === 'embudo') { const r = await get(`/api/admin/funnel?days=${funDays}`); if (alive && typeof r !== 'number') setFun(r); }
      else if (tab === 'seguridad') { const r = await get('/api/admin/security'); if (alive && typeof r !== 'number') setSec(r); }
      else if (tab === 'cliente') { const r = await get('/api/admin/client'); if (alive && typeof r !== 'number') setClient(r); }
      else { const r = await get('/api/admin/economy'); if (alive && typeof r !== 'number') setEcon(r); }
    };
    void pull();
    const id = live ? window.setInterval(pull, 15000) : 0;
    return () => { alive = false; window.clearInterval(id); };
  }, [tab, live, funDays]);

  const sorted = useMemo(() => {
    const list = (players ?? []).filter((p) => !hideDev || !p.dev);
    const by: Record<string, (p: Json) => number> = { last: (p) => -p.last, created: (p) => -p.created, level: (p) => -p.level, tier: (p) => -p.tier, flora: (p) => -p.flora, actions: (p) => -p.actions, harvests: (p) => -p.harvests };
    return [...list].sort((a, b) => (by[sort] ?? by.last)(a) - (by[sort] ?? by.last)(b));
  }, [players, sort, hideDev]);

  if (denied === 404 || denied === 401) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#0a0716] text-neutral-300 p-6 text-center">
        <div><p className="text-lg font-bold text-white">No encontrado</p><p className="text-sm mt-2">Esta página no existe. <a className="underline text-lime-300" href="/">Volver al juego</a></p></div>
      </div>
    );
  }
  if (!ov) return <div className="min-h-screen grid place-items-center bg-[#0a0716] text-neutral-400">Cargando panel…</div>;

  const P = ov.players, G = ov.progress, H = ov.health;
  const series: Json[] = ov.series;
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : '—');

  const go = (t: Tab) => { setTab(t); setMenu(false); window.scrollTo({ top: 0 }); };
  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-lime-300 to-emerald-500 text-[#0b1a06] font-black text-sm shadow-[0_0_20px_-4px_rgba(184,243,90,0.6)]">YB</span>
          <div className="leading-tight"><p className="font-black text-white text-[15px] tracking-tight">Yield Bud Empire</p><p className="text-[11px] uppercase tracking-[0.18em] text-lime-300/80">Operadores</p></div>
        </div>
      </div>
      <nav className="flex-1 overflow-auto px-3 space-y-4" aria-label="Secciones del panel">
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="px-2 mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">{g.group}</p>
            {g.items.map(([id, label, Icon]) => (
              <button key={id} type="button" onClick={() => go(id)} aria-current={tab === id ? 'page' : undefined}
                className={`group w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] font-semibold transition-colors ${tab === id ? 'bg-lime-300/15 text-lime-200 shadow-[inset_2px_0_0_#b8f35a]' : 'text-neutral-300 hover:bg-white/5 hover:text-white'}`}>
                <Icon className={`w-4 h-4 ${tab === id ? 'text-lime-300' : 'text-neutral-500 group-hover:text-neutral-300'}`} />{label}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="m-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2.5">
        <div className="flex items-center justify-between text-[12px]">
          <span className="flex items-center gap-1.5 text-neutral-300"><i className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`} />{live ? 'En vivo' : 'Pausado'}</span>
          <span className="font-mono text-neutral-500">{hhmm(updated)}</span>
        </div>
        <div className="flex items-center justify-between text-[12px] text-neutral-400"><span><Activity className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-emerald-300" />{P.online} en línea</span><span>{H.lastHour.e5 ? <b className="text-rose-300">{H.lastHour.e5} errores</b> : 'sin errores'}</span></div>
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" onClick={() => setLive((v) => !v)} className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[12px]">{live ? <><Pause className="w-3.5 h-3.5" />Pausar</> : <><Play className="w-3.5 h-3.5" />Reanudar</>}</button>
          <a href="/" className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[12px]">Al juego</a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0716] text-neutral-200" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* desktop: fixed side menu; phone: a top bar that opens it as a drawer */}
      <aside className="hidden lg:block fixed inset-y-0 left-0 w-60 border-r border-white/10 bg-[#0c0820]/95 z-20">{sidebar}</aside>
      <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-[#0a0716]/95 backdrop-blur px-4 py-3">
        <button type="button" onClick={() => setMenu(true)} aria-label="Abrir menú" className="p-1.5 rounded-lg bg-white/5"><Menu className="w-5 h-5" /></button>
        <p className="font-black text-white">{LABEL[tab]}</p>
        <span className="ml-auto flex items-center gap-1.5 text-[12px] text-neutral-400"><i className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`} />{P.online} en línea</span>
      </header>
      {menu && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <aside className="relative w-72 max-w-[85%] h-full bg-[#0c0820] border-r border-white/10">{sidebar}
            <button type="button" onClick={() => setMenu(false)} aria-label="Cerrar menú" className="absolute top-4 right-3 p-1.5 rounded-lg bg-white/5"><X className="w-4 h-4" /></button>
          </aside>
          <button type="button" aria-label="Cerrar menú" className="flex-1 bg-black/60" onClick={() => setMenu(false)} />
        </div>
      )}

      <main className="lg:pl-60">
        <div className="hidden lg:flex items-end justify-between px-8 pt-7 pb-1 max-w-[1400px] mx-auto">
          <div><p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">{NAV.find((g) => g.items.some(([id]) => id === tab))?.group}</p><h1 className="text-2xl font-black text-white tracking-tight">{LABEL[tab]}</h1></div>
          <p className="text-[12px] text-neutral-500">Actualizado {hhmm(updated)}</p>
        </div>
      <div className="p-4 sm:p-6 lg:px-8 max-w-[1400px] mx-auto space-y-4">
        {tab === 'acciones' && <ActionsView />}
        {tab === 'resumen' && (<>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            <Kpi label="En línea ahora (5 min)" value={P.online} tone="text-emerald-300" />
            <Kpi label="Activos 24 h" value={P.active24h} />
            <Kpi label="Activos 7 días" value={P.active7d} />
            <Kpi label="Activos 30 días" value={P.active30d} />
            <Kpi label={`Cuentas (${P.real} reales · ${P.dev} dev)`} value={P.total} />
            <Kpi label="Nuevas 24 h / 7 d" value={`${P.new24h} / ${P.new7d}`} />
            <Kpi label="Plantas creciendo" value={G.plants} hint="Solo cuentas reales" />
            <Kpi label="Errores del servidor (1 h)" value={H.lastHour.e5} tone={H.lastHour.e5 ? 'text-rose-300' : 'text-white'} />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card title="Jugadores activos por día (30 d)" className="lg:col-span-2"><Bars data={series.map((s) => ({ label: s.d.slice(5), v: s.active }))} /></Card>
            <Card title="Inactivos (cuentas reales)">
              <div className="grid grid-cols-3 gap-2">
                <Kpi label="3–7 días" value={P.inactive3d} tone="text-amber-200" />
                <Kpi label="7–30 días" value={P.inactive7d} tone="text-amber-300" />
                <Kpi label="+30 días" value={P.inactive30d} tone="text-rose-300" />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Kpi label={`Vuelven al día 1 (${P.retention.d1.back}/${P.retention.d1.base})`} value={pct(P.retention.d1.back, P.retention.d1.base)} />
                <Kpi label={`Vuelven al día 7 (${P.retention.d7.back}/${P.retention.d7.base})`} value={pct(P.retention.d7.back, P.retention.d7.base)} />
              </div>
              {P.invites && <p className="text-[12px] text-neutral-400 mt-2">Invitaciones: {P.invites.used} usadas de {P.invites.cap} ({P.invites.codes} códigos activos)</p>}
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Card title="Registros por día (30 d)"><Bars data={series.map((s) => ({ label: s.d.slice(5), v: s.signups }))} color="#a78bfa" /></Card>
            <Card title="Cosechas por día (30 d)"><Bars data={series.map((s) => ({ label: s.d.slice(5), v: s.harvests }))} color="#fbbf24" /></Card>
            <Card title="Acciones de juego por día (30 d)"><Bars data={series.map((s) => ({ label: s.d.slice(5), v: s.actions }))} color="#5eead4" /></Card>
          </div>

          <div className="grid lg:grid-cols-4 gap-4">
            <Card title="Instalación (nivel de sala)"><Dist rows={G.byTier} prefix="Nivel" /></Card>
            <Card title="Nivel de jugador"><Dist rows={G.byLevel} prefix="Nv" /></Card>
            <Card title="Rango del imperio"><Dist rows={G.byRank} prefix="Rango" /></Card>
            <Card title="Progreso (reales)">
              <ul className="text-[13px] space-y-1.5">
                <li className="flex justify-between"><span className="text-neutral-400">Plantas listas para cosechar</span><b>{G.ready}</b></li>
                <li className="flex justify-between"><span className="text-neutral-400">Plantas en parcelas</span><b>{G.plots}</b></li>
                <li className="flex justify-between"><span className="text-neutral-400">Obras en marcha</span><b>{G.building}</b></li>
                <li className="flex justify-between"><span className="text-neutral-400">Cosechas en total</span><b>{G.harvests}</b></li>
                <li className="flex justify-between"><span className="text-neutral-400">Con el tutorial abierto</span><b>{G.tutorialOpen}</b></li>
              </ul>
            </Card>
          </div>

          <Card title="Actividad reciente" aside={<span className="text-[11px] text-neutral-500">se actualiza sola</span>}>
            <ul className="divide-y divide-white/5 max-h-[420px] overflow-auto">
              {groupFeed(ov.feed as Json[]).map((e, i) => (
                <li key={i} className="flex items-center gap-3 py-1.5 text-[13px]">
                  <span className="w-20 shrink-0 font-mono text-[11px] text-neutral-500">{ago(e.ts, ov.now)}</span>
                  {e.id ? <button type="button" onClick={() => setCard(e.id)} className="font-bold text-white truncate max-w-[180px] hover:text-lime-300 hover:underline">{e.name ?? '—'}</button> : <b className="text-white">—</b>}
                  <span className="text-neutral-300">{EVENT[e.event] ?? e.event}{e.n > 1 && <b className="ml-1.5 text-lime-300">×{e.n}</b>}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>)}


        {tab === 'embudo' && (!fun ? <p className="text-neutral-500 text-sm">Cargando…</p> : (<>
          <Card title={`Hasta dónde llegan los jugadores nuevos (${fun.total} cuentas reales)`} aside={
            <select value={funDays} onChange={(e) => { setFun(null); setFunDays(Number(e.target.value)); }} className="bg-black/40 border border-white/10 rounded-md px-2 py-1 text-[12px]">
              <option value={0}>Todos</option><option value={7}>Registrados en 7 días</option><option value={30}>En 30 días</option><option value={90}>En 90 días</option>
            </select>}>
            <div className="space-y-2">
              {(fun.steps as Json[]).map((st, i, arr) => {
                const base = st.eligible || 1; const w = (st.n / base) * 100;
                const prev = i > 0 ? arr[i - 1] : null; const lost = prev && st.id !== 'd7' ? prev.n - st.n : 0;
                return (
                  <div key={st.id} className="grid grid-cols-[180px_1fr_120px] items-center gap-3 text-[13px]">
                    <span className="text-neutral-300">{i + 1}. {st.label}</span>
                    <span className="h-6 rounded-md bg-white/5 overflow-hidden relative"><i className="block h-full rounded-md" style={{ width: `${Math.max(w, st.n ? 2 : 0)}%`, background: `hsl(${95 - i * 9} 70% 55%)` }} /><b className="absolute inset-y-0 left-2 flex items-center text-[12px] text-[#0a0716]">{st.n ? `${Math.round(w)} %` : ''}</b></span>
                    <span className="font-mono text-right">{st.n}/{st.eligible}{lost > 0 && <span className="text-rose-300"> −{lost}</span>}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-[11.5px] text-neutral-500 mt-3">En rojo, cuántos se quedaron en el paso anterior. «Una semana después» solo cuenta a quienes se registraron hace 7 días o más. No incluye cuentas dev.</p>
          </Card>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Dónde quedó el tutorial"><Dist rows={(fun.tutorial as Json[]).map((r) => ({ k: String(r.k), n: Number(r.n) }))} prefix="" /></Card>
            <Card title="Se registraron y nunca jugaron">
              {(fun.stuck as Json[]).length ? <ul className="text-[13px] divide-y divide-white/5">{(fun.stuck as Json[]).map((p) => <li key={p.id} className="py-1 flex justify-between"><button type="button" onClick={() => setCard(p.id)} className="font-bold text-white hover:text-lime-300 hover:underline">{p.name}</button><span className="text-neutral-400">registrado {ago(p.created, ov.now)}</span></li>)}</ul> : <p className="text-[13px] text-emerald-300">Todos los registrados llegaron a jugar. ✓</p>}
            </Card>
          </div>
        </>))}

        {tab === 'jugadores' && (
          <Card title={`Jugadores (${sorted.length})`} aside={
            <div className="flex items-center gap-3 text-[12px]">
              <label className="flex items-center gap-1.5"><input type="checkbox" checked={hideDev} onChange={(e) => setHideDev(e.target.checked)} />ocultar dev</label>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-black/40 border border-white/10 rounded-md px-2 py-1">
                <option value="last">Última actividad</option><option value="created">Más nuevos</option><option value="level">Nivel</option><option value="tier">Instalación</option>
                <option value="flora">$FLORA</option><option value="actions">Acciones</option><option value="harvests">Cosechas</option>
              </select>
            </div>}>
            {!players ? <p className="text-neutral-500 text-sm">Cargando…</p> : (
              <div className="overflow-auto">
                <table className="w-full text-[12.5px] whitespace-nowrap">
                  <thead className="text-neutral-400 text-left">
                    <tr className="border-b border-white/10">
                      {['#', 'Jugador', 'Estado', 'Última actividad', 'Registro', 'Nivel', 'Instalación', 'Rango', 'Plantas', 'Parcelas', '$FLORA', 'Acciones', 'Cosechas', 'Retos', 'Tutorial', 'Origen'].map((h) => <th key={h} className="py-2 pr-4 font-semibold">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((p) => (
                      <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                        <td className="py-1.5 pr-4 font-mono text-neutral-500">{p.id}</td>
                        <td className="pr-4 font-semibold text-white"><button type="button" onClick={() => setCard(p.id)} className="hover:text-lime-300 hover:underline">{p.name}</button>{p.founder ? <span className="ml-1 text-amber-300">👑{p.founder}</span> : null}{p.dev && <span className="ml-1.5 text-[10px] px-1.5 rounded bg-sky-500/20 text-sky-300">dev</span>}{p.admin && <span className="ml-1 text-[10px] px-1.5 rounded bg-lime-500/20 text-lime-300">admin</span>}{p.banned && <span className="ml-1 text-[10px] px-1.5 rounded bg-rose-500/20 text-rose-300">bloqueada</span>}</td>
                        <td className="pr-4">{p.online ? <span className="text-emerald-300">● en línea</span> : Date.now() - p.last < 86400_000 ? <span className="text-neutral-300">hoy</span> : Date.now() - p.last < 7 * 86400_000 ? <span className="text-amber-200">esta semana</span> : <span className="text-rose-300">inactivo</span>}</td>
                        <td className="pr-4 text-neutral-300">{ago(p.last)}</td>
                        <td className="pr-4 text-neutral-400">{new Date(p.created).toLocaleDateString('es-CR')}</td>
                        <td className="pr-4 font-mono">{p.level}</td>
                        <td className="pr-4 font-mono">{p.tier}{p.building ? <span className="text-amber-300" title={`Construyendo ${p.building}`}> 🏗️</span> : null}</td>
                        <td className="pr-4 font-mono">{p.rank}</td>
                        <td className="pr-4 font-mono">{p.plants}{p.ready ? <span className="text-amber-300"> ({p.ready}🌾)</span> : null}</td>
                        <td className="pr-4 font-mono">{p.plots}</td>
                        <td className="pr-4 font-mono">{fmt(p.flora)}</td>
                        <td className="pr-4 font-mono">{fmt(p.actions)}</td>
                        <td className="pr-4 font-mono">{p.harvests}</td>
                        <td className="pr-4 font-mono">{p.quests}</td>
                        <td className="pr-4 text-neutral-400">{p.tutorial}</td>
                        <td className="pr-4 text-neutral-400">{p.source}{p.lang ? ` · ${p.lang}` : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {tab === 'economia' && (!econ ? <p className="text-neutral-500 text-sm">Cargando…</p> : (<>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Kpi label="$FLORA en manos de jugadores reales" value={fmt(econ.circulating)} tone="text-lime-300" />
            <Kpi label="$FLORA total (con cuentas dev)" value={fmt(econ.circulatingAll)} />
            <Kpi label="Fundadores" value={econ.founders} tone="text-amber-300" />
            <Kpi label="NFT en total" value={fmt((econ.nfts as Json[]).reduce((n, x) => n + x.n, 0))} />
          </div>
          {(() => { const w = econ.week as Json; const ratio = w.burned ? w.made / w.burned : w.made ? Infinity : 0; const tone = ratio > 1.5 ? 'text-rose-300' : ratio > 1.1 ? 'text-amber-300' : 'text-emerald-300'; return (
            <Card title="Salud de la economía · jugadores reales" aside={<span className="text-[11px] text-neutral-500">sin cuentas dev, regalos ni saldos de prueba</span>}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <Kpi label="$FLORA creada (7 d)" value={fmt(w.made)} tone="text-lime-300" />
                <Kpi label="$FLORA destruida o gastada (7 d)" value={fmt(w.burned)} tone="text-pink-300" />
                <Kpi label="Neto (7 d)" value={`${w.made - w.burned >= 0 ? '+' : ''}${fmt(w.made - w.burned)}`} tone={w.made - w.burned > 0 ? 'text-amber-200' : 'text-emerald-300'} />
                <Kpi label={ratio > 1.1 ? 'Se crea más de lo que se gasta: ojo con la inflación' : 'Equilibrada: se gasta lo que se crea'} value={Number.isFinite(ratio) ? `${ratio.toFixed(2)}×` : '∞'} tone={tone} hint="creada ÷ gastada en 7 días" />
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                <div><p className="text-[11px] text-neutral-400 mb-1">Creada (verde) y gastada (rosa) por día · 30 d</p><Bars data={(econ.health as Json[]).map((h) => ({ label: h.d.slice(5), v: h.made, v2: h.burned }))} /></div>
                <div><p className="text-[11px] text-neutral-400 mb-1">$FLORA en circulación al cierre de cada día · 30 d</p><Line data={(econ.health as Json[]).map((h) => h.supply)} color="#b8f35a" h={110} labels={[(econ.health as Json[])[0].d.slice(5), (econ.health as Json[])[29].d.slice(5)]} /></div>
              </div>
            </Card>); })()}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Quién tiene más $FLORA (reales)">
              <ul className="text-[12.5px] space-y-1">{(econ.holders as Json[]).map((h, i) => (
                <li key={h.id} className="flex items-center gap-2"><span className="w-5 text-neutral-500 font-mono">{i + 1}</span><button type="button" onClick={() => setCard(h.id)} className="w-36 truncate text-left text-white hover:text-lime-300 hover:underline">{h.name}</button>
                  <span className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden"><i className="block h-full rounded-full bg-lime-400/80" style={{ width: `${h.share * 100}%` }} /></span>
                  <span className="w-24 text-right font-mono">{fmt(h.flora)}</span><span className={`w-12 text-right font-mono ${h.share > 0.5 ? 'text-amber-300' : 'text-neutral-400'}`}>{Math.round(h.share * 100)}%</span></li>))}</ul>
            </Card>
            <Card title="Precios del mercado entre jugadores · 30 d">
              {(econ.prices as Json[]).length ? (<>
                <table className="w-full text-[12.5px] mb-3"><thead className="text-neutral-400 text-left"><tr className="border-b border-white/10"><th className="py-1">Tipo</th><th className="text-right">Ventas</th><th className="text-right">Promedio</th><th className="text-right">Mín</th><th className="text-right">Máx</th></tr></thead>
                  <tbody>{(econ.prices as Json[]).map((r) => <tr key={r.kind} className="border-b border-white/5"><td className="py-1 font-mono">{r.kind}</td><td className="text-right font-mono">{r.n}</td><td className="text-right font-mono">{fmt(r.avg)}</td><td className="text-right font-mono text-neutral-400">{fmt(r.min)}</td><td className="text-right font-mono text-neutral-400">{fmt(r.max)}</td></tr>)}</tbody></table>
                <p className="text-[11px] text-neutral-400 mb-1">Últimas ventas</p>
                <ul className="text-[12px] divide-y divide-white/5">{(econ.sales as Json[]).map((x, i) => <li key={i} className="py-1 flex gap-2"><span className="w-20 text-neutral-500">{ago(x.ts, ov.now)}</span><span className="flex-1">{x.kind}{x.rarity ? ` · ${x.rarity}` : ''} · {x.seller} → {x.buyer}</span><b className="font-mono">{fmt(x.price)}</b></li>)}</ul>
              </>) : <p className="text-[12px] text-neutral-500">Todavía no hubo ventas entre jugadores.</p>}
            </Card>
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <Card title="$FLORA que entra (verde) y sale (rosa) por día · 14 d" className="lg:col-span-2" aside={<span className="text-[11px] text-neutral-500">sin regalos ni saldos de prueba</span>}>
              <Bars data={(econ.days as Json[]).map((d) => ({ label: d.d.slice(5), v: d.in, v2: d.out }))} />
            </Card>
            <Card title="NFT por tipo"><Dist rows={(econ.nfts as Json[]).map((x) => ({ k: x.kind, n: x.n }))} prefix="" /></Card>
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <Card title="Movimientos del libro · 14 d" className="lg:col-span-2">
              <table className="w-full text-[12.5px]">
                <thead className="text-neutral-400 text-left"><tr className="border-b border-white/10"><th className="py-1.5">Tipo</th><th className="text-right">Veces</th><th className="text-right">Entra</th><th className="text-right">Sale</th></tr></thead>
                <tbody>{(econ.byKind as Json[]).map((k) => <tr key={k.kind} className="border-b border-white/5"><td className="py-1 font-mono">{k.kind}</td><td className="text-right font-mono">{k.n}</td><td className="text-right font-mono text-lime-300">{k.inflow ? fmt(k.inflow) : ''}</td><td className="text-right font-mono text-pink-300">{k.outflow ? fmt(k.outflow) : ''}</td></tr>)}</tbody>
              </table>
            </Card>
            <div className="space-y-4">
              <Card title="Mercado entre jugadores">
                {(econ.market as Json[]).map((m) => <p key={m.status} className="flex justify-between text-[13px]"><span className="text-neutral-400">{({ active: 'Publicados', sold: 'Vendidos', cancelled: 'Retirados' } as Json)[m.status] ?? m.status}</span><b>{m.n} · {fmt(m.flora)} $FLORA</b></p>)}
                {!(econ.market as Json[]).length && <p className="text-[12px] text-neutral-500">Sin publicaciones todavía.</p>}
              </Card>
              <Card title="Puente a Solana">
                {(econ.bridge as Json[]).map((b, i) => <p key={i} className="flex justify-between text-[13px]"><span className="text-neutral-400">{b.dir} · {b.status}</span><b>{b.n}</b></p>)}
                {!(econ.bridge as Json[]).length && <p className="text-[12px] text-neutral-500">Sin envíos todavía.</p>}
              </Card>
              <Card title="Pack de Fundador (pedidos)">
                {(econ.founder as Json[]).map((f) => <p key={f.status} className="flex justify-between text-[13px]"><span className="text-neutral-400">{({ open: 'Abiertos (sin pagar)', delivered: 'Entregados', underpaid: 'Pagaron de menos', refund_needed: 'Para devolver', refunded: 'Devueltos', expired: 'Vencidos' } as Json)[f.status] ?? f.status}</span><b>{f.n} · {f.status === 'open' ? '—' : `${fmt(f.amount)} USDC`}</b></p>)}
                {!(econ.founder as Json[]).length && <p className="text-[12px] text-neutral-500">Sin pedidos todavía.</p>}
              </Card>
            </div>
          </div>
        </>))}


        {tab === 'cliente' && (!client ? <p className="text-neutral-500 text-sm">Cargando…</p> : (<>
          {!client.enabled && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-[13px] text-amber-100">
              La telemetría del juego está <b>apagada</b>: los navegadores de los jugadores todavía no envían nada. Se enciende con <code className="font-mono">TELEMETRY_ENABLED=1</code> en <code className="font-mono">.env</code>, después de publicar la línea de privacidad.
            </div>
          )}
          <div className="grid lg:grid-cols-3 gap-4">
            <Card title="Errores del juego por día (7 d)"><Bars data={(client.days as Json[]).map((d) => ({ label: d.d.slice(5), v: d.n }))} color="#fb7185" /></Card>
            <Card title="Tiempo de carga (7 d)">
              <table className="w-full text-[12.5px]"><thead className="text-neutral-400 text-left"><tr className="border-b border-white/10"><th className="py-1.5">Equipo</th><th className="text-right">Cargas</th><th className="text-right">Mediana</th><th className="text-right">Lento (90 %)</th></tr></thead>
                <tbody>{(client.perf as Json[]).map((r) => <tr key={r.device} className="border-b border-white/5"><td className="py-1">{r.device}</td><td className="text-right font-mono">{r.n}</td><td className="text-right font-mono">{(r.p50 / 1000).toFixed(1)} s</td><td className={`text-right font-mono ${r.p90 > 8000 ? 'text-amber-300' : ''}`}>{(r.p90 / 1000).toFixed(1)} s</td></tr>)}</tbody></table>
              {!(client.perf as Json[]).length && <p className="text-[12px] text-neutral-500 mt-2">Sin datos todavía.</p>}
            </Card>
            <Card title="Equipos de los jugadores (7 d)"><Dist rows={(client.devices as Json[]).map((d) => ({ k: d.device, n: d.n }))} prefix="" /></Card>
          </div>
          <Card title="Errores que ven los jugadores (7 d)" aside={<span className="text-[11px] text-neutral-500">uno por error distinto y visita</span>}>
            {(client.errors as Json[]).length ? (
              <div className="overflow-auto"><table className="w-full text-[12.5px]">
                <thead className="text-neutral-400 text-left"><tr className="border-b border-white/10"><th className="py-1.5 pr-3">Error</th><th className="text-right pr-3">Veces</th><th className="text-right pr-3">Jugadores</th><th className="pr-3">Último</th><th className="pr-3">Equipos</th><th>Dónde</th></tr></thead>
                <tbody>{(client.errors as Json[]).map((e) => (
                  <tr key={e.name} className="border-b border-white/5 align-top">
                    <td className="py-1.5 pr-3 font-mono text-rose-200 max-w-[360px] break-words">{e.name}</td><td className="text-right pr-3 font-mono">{e.n}</td><td className="text-right pr-3 font-mono">{e.players}</td>
                    <td className="pr-3 whitespace-nowrap text-neutral-400">{ago(e.last, ov.now)}</td><td className="pr-3 text-neutral-400 max-w-[200px]">{e.devices}</td><td className="font-mono text-[11px] text-neutral-500 max-w-[420px] break-words">{e.detail}</td>
                  </tr>))}</tbody>
              </table></div>
            ) : <p className="text-[13px] text-emerald-300">Ningún error reportado. ✓</p>}
          </Card>
          <Card title="Pantallas más usadas (7 d)" aside={<span className="text-[11px] text-neutral-500">veces que se abrió cada una · jugadores distintos</span>}>
            {(() => { const rows = client.views as Json[]; const max = Math.max(1, ...rows.map((r) => r.n)); return rows.length ? (
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-1">{rows.map((r) => (
                <div key={r.name} className="flex items-center gap-2 text-[12.5px]">
                  <span className="w-32 shrink-0 font-mono text-neutral-300 truncate">{r.name}</span>
                  <span className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden"><i className="block h-full rounded-full bg-sky-400/80" style={{ width: `${(r.n / max) * 100}%` }} /></span>
                  <span className="w-20 text-right font-mono">{fmt(r.n)} · {r.players}👤</span>
                </div>))}</div>
            ) : <p className="text-[12px] text-neutral-500">Sin datos todavía.</p>; })()}
          </Card>
        </>))}


        {tab === 'seguridad' && (!sec ? <p className="text-neutral-500 text-sm">Cargando…</p> : (<>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {([['login_fail', 'Contraseñas erradas'], ['bot_signal', 'Señales de bot'], ['flag_multi_ip', 'Varias cuentas misma red'], ['disposable', 'Correos desechables'], ['invite_rejected', 'Invitaciones rechazadas'], ['reset_request', 'Pidieron cambiar contraseña']] as Array<[string, string]>).map(([k, l]) => (
              <Kpi key={k} label={`${l} (24 h · 7 d · 30 d)`} value={`${sec.counts[k].d1} · ${sec.counts[k].d7} · ${sec.counts[k].d30}`} tone={sec.counts[k].d1 ? 'text-amber-300' : 'text-white'} />
            ))}
          </div>
          <div className="grid lg:grid-cols-3 gap-4">
            <Card title="Contraseñas erradas (ámbar) y otras señales (rojo) por día · 30 d" className="lg:col-span-2"><Bars data={(sec.days as Json[]).map((d) => ({ label: d.d.slice(5), v: d.fail, v2: d.other }))} color="#fbbf24" color2="#fb7185" /></Card>
            <Card title={`Cuentas marcadas o bloqueadas (${(sec.flagged as Json[]).length})`}>
              {(sec.flagged as Json[]).length ? <ul className="text-[12.5px] space-y-1">{(sec.flagged as Json[]).map((a) => <li key={a.id} className="flex flex-wrap items-center gap-1.5"><button type="button" onClick={() => setCard(a.id)} className="font-semibold text-white hover:text-lime-300 hover:underline">{a.name}</button>{a.locked && <span className="text-[10px] px-1.5 rounded bg-rose-500/20 text-rose-200">bloqueada</span>}{(a.flags as string[]).map((f) => <span key={f} className="text-[10px] px-1.5 rounded bg-amber-400/15 text-amber-200">{f}</span>)}</li>)}</ul> : <p className="text-[13px] text-emerald-300">Ninguna. ✓</p>}
            </Card>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Contraseñas erradas por cuenta · 7 d">
              {(sec.fails as Json[]).length ? <table className="w-full text-[12.5px]"><thead className="text-neutral-400 text-left"><tr className="border-b border-white/10"><th className="py-1">Cuenta</th><th className="text-right">Intentos</th><th className="text-right">Redes distintas</th><th className="text-right">Último</th></tr></thead>
                <tbody>{(sec.fails as Json[]).map((f, i) => <tr key={i} className="border-b border-white/5"><td className="py-1">{f.id ? <button type="button" onClick={() => setCard(f.id)} className="text-white hover:text-lime-300 hover:underline">{f.name}</button> : <span className="text-neutral-400">(usuario que no existe)</span>}</td><td className={`text-right font-mono ${f.n >= 5 ? 'text-amber-300' : ''}`}>{f.n}</td><td className={`text-right font-mono ${f.nets >= 3 ? 'text-rose-300' : ''}`}>{f.nets}</td><td className="text-right text-neutral-400">{ago(f.last, ov.now)}</td></tr>)}</tbody></table>
                : <p className="text-[13px] text-emerald-300">Ninguna en la última semana. ✓</p>}
            </Card>
            <Card title="Cuentas creadas desde la misma red" aside={<span className="text-[11px] text-neutral-500">la dirección no se guarda: solo se agrupa</span>}>
              {(sec.shared as Json[]).length ? <ul className="text-[12.5px] space-y-1">{(sec.shared as Json[]).map((g) => <li key={g.net} className="flex gap-2"><span className="w-14 shrink-0 font-mono text-neutral-500">{g.net}</span><b className="font-mono w-6">{g.n}</b><span className="text-neutral-200">{g.names}</span></li>)}</ul> : <p className="text-[13px] text-emerald-300">Cada cuenta viene de una red distinta. ✓</p>}
            </Card>
          </div>
          <Card title="Últimos eventos de seguridad">
            <ul className="text-[12.5px] divide-y divide-white/5 max-h-[400px] overflow-auto">{(sec.recent as Json[]).map((e, i) => <li key={i} className="py-1 flex gap-3"><span className="w-20 shrink-0 text-neutral-500">{ago(e.ts, ov.now)}</span><span className="w-52 shrink-0 font-mono text-amber-200">{e.event}</span>{e.id ? <button type="button" onClick={() => setCard(e.id)} className="text-white hover:text-lime-300 hover:underline">{e.name}</button> : <span className="text-neutral-500">—</span>}<span className="text-neutral-500 truncate">{e.detail}</span></li>)}</ul>
          </Card>
        </>))}

        {tab === 'servidor' && (<>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            <Kpi label="Encendido hace" value={dur(H.uptime)} />
            <Kpi label="Peticiones (1 h)" value={fmt(H.lastHour.req)} />
            <Kpi label="Errores 5xx (1 h)" value={H.lastHour.e5} tone={H.lastHour.e5 ? 'text-rose-300' : 'text-white'} />
            <Kpi label="Rechazos 4xx (1 h)" value={H.lastHour.e4} />
            <Kpi label="Respuesta p95 (ms, 1 h)" value={H.lastHour.p95} />
            <Kpi label="Memoria del proceso" value={mb(H.rss)} />
            <Kpi label="Base de datos" value={mb(H.dbBytes)} />
            <Kpi label="Sesiones abiertas" value={H.sessions} />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Peticiones por minuto (última hora)"><Line data={(H.minutes as Json[]).map((m) => m.req)} labels={H.minutes.length ? [hhmm(H.minutes[0].ts), hhmm(H.minutes[H.minutes.length - 1].ts)] : undefined} /></Card>
            <Card title="Tiempo de respuesta p95 por minuto (ms)"><Line data={(H.minutes as Json[]).map((m) => m.p95)} color="#fbbf24" labels={H.minutes.length ? [hhmm(H.minutes[0].ts), hhmm(H.minutes[H.minutes.length - 1].ts)] : undefined} /></Card>
            <Card title="Peticiones cada 30 min (24 h)"><Bars data={(H.blocks as Json[]).map((b) => ({ label: hhmm(b.ts), v: b.req }))} color="#5eead4" /></Card>
            <Card title="Jugadores en línea cada 30 min (24 h)"><Bars data={(H.blocks as Json[]).map((b) => ({ label: hhmm(b.ts), v: b.online }))} color="#34d399" /></Card>
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Rutas más pedidas (desde que arrancó)">
              <table className="w-full text-[12.5px]">
                <thead className="text-neutral-400 text-left"><tr className="border-b border-white/10"><th className="py-1.5">Ruta</th><th className="text-right">Veces</th><th className="text-right">5xx</th><th className="text-right">Prom. ms</th></tr></thead>
                <tbody>{(H.routes as Json[]).map((r) => <tr key={r.path} className="border-b border-white/5"><td className="py-1 font-mono text-[11.5px]">{r.path}</td><td className="text-right font-mono">{fmt(r.n)}</td><td className={`text-right font-mono ${r.e ? 'text-rose-300' : ''}`}>{r.e}</td><td className="text-right font-mono">{r.avg}</td></tr>)}</tbody>
              </table>
            </Card>
            <Card title="Últimos errores del servidor (5xx)" aside={<span className="text-[11px] text-neutral-500">Node {H.node} · correos fallidos 24 h: {H.mailFailures}</span>}>
              {(H.errors as Json[]).length ? (
                <ul className="text-[12.5px] divide-y divide-white/5">{(H.errors as Json[]).map((e, i) => <li key={i} className="py-1 flex gap-3"><span className="font-mono text-neutral-500 w-20">{ago(e.ts, ov.now)}</span><span className="font-mono text-rose-300">{e.status}</span><span className="font-mono">{e.path}</span></li>)}</ul>
              ) : <p className="text-[13px] text-emerald-300">Sin errores desde que arrancó el servidor. ✓</p>}
            </Card>
          </div>
        </>)}
      </div>
      </main>
      {card !== null && <PlayerCard id={card} onClose={closeCard} />}
    </div>
  );
};
