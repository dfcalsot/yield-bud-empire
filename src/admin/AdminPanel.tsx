import React, { useEffect, useMemo, useState } from 'react';

/**
 * The operators' panel (`/#panel`): players, progress, economy and the server, refreshed every few seconds. Only accounts flagged
 * admin see it (node server/admin.mjs panel <usuario>); for anyone else the server answers 404 and this page says so. Read-only.
 * An internal tool: Spanish only, no game translations.
 */
type Json = Record<string, any>;
const get = async (path: string): Promise<Json | number> => {
  try { const r = await fetch(path, { credentials: 'same-origin' }); return r.ok ? await r.json() : r.status; } catch { return 0; }
};
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

type Tab = 'resumen' | 'jugadores' | 'economia' | 'servidor';
const TABS: Array<[Tab, string]> = [['resumen', 'Resumen'], ['jugadores', 'Jugadores'], ['economia', 'Economía'], ['servidor', 'Servidor']];

export const AdminPanel: React.FC = () => {
  const [tab, setTab] = useState<Tab>('resumen');
  const [ov, setOv] = useState<Json | null>(null);
  const [players, setPlayers] = useState<Json[] | null>(null);
  const [econ, setEcon] = useState<Json | null>(null);
  const [denied, setDenied] = useState<number | null>(null);
  const [updated, setUpdated] = useState(0);
  const [live, setLive] = useState(true);
  const [sort, setSort] = useState<string>('last');
  const [hideDev, setHideDev] = useState(false);

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
    if (tab !== 'jugadores' && tab !== 'economia') return;
    let alive = true;
    const pull = async () => {
      if (document.hidden) return;
      if (tab === 'jugadores') { const r = await get('/api/admin/players'); if (alive && typeof r !== 'number') setPlayers(r.players); }
      else { const r = await get('/api/admin/economy'); if (alive && typeof r !== 'number') setEcon(r); }
    };
    void pull();
    const id = live ? window.setInterval(pull, 15000) : 0;
    return () => { alive = false; window.clearInterval(id); };
  }, [tab, live]);

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

  return (
    <div className="min-h-screen bg-[#0a0716] text-neutral-200" style={{ fontFamily: "'Outfit', sans-serif" }}>
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#0a0716]/90 backdrop-blur px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
        <h1 className="font-black text-white text-lg tracking-tight">Yield Bud Empire · <span className="text-lime-300">Panel de operadores</span></h1>
        <nav className="flex gap-1">
          {TABS.map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold ${tab === id ? 'bg-lime-300 text-[#14210a]' : 'bg-white/5 hover:bg-white/10'}`}>{label}</button>)}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-[12px] text-neutral-400">
          <span className="flex items-center gap-1.5"><i className={`w-2 h-2 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-600'}`} />{live ? 'En vivo' : 'Pausado'} · {hhmm(updated)}</span>
          <button type="button" onClick={() => setLive((v) => !v)} className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10">{live ? 'Pausar' : 'Reanudar'}</button>
          <a href="/" className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10">Al juego</a>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-[1400px] mx-auto space-y-4">
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
                  <b className="text-white truncate max-w-[180px]">{e.name ?? '—'}</b>
                  <span className="text-neutral-300">{EVENT[e.event] ?? e.event}{e.n > 1 && <b className="ml-1.5 text-lime-300">×{e.n}</b>}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>)}

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
                        <td className="pr-4 font-semibold text-white">{p.name}{p.founder ? <span className="ml-1 text-amber-300">👑{p.founder}</span> : null}{p.dev && <span className="ml-1.5 text-[10px] px-1.5 rounded bg-sky-500/20 text-sky-300">dev</span>}{p.admin && <span className="ml-1 text-[10px] px-1.5 rounded bg-lime-500/20 text-lime-300">admin</span>}{p.banned && <span className="ml-1 text-[10px] px-1.5 rounded bg-rose-500/20 text-rose-300">bloqueada</span>}</td>
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
                {(econ.founder as Json[]).map((f) => <p key={f.status} className="flex justify-between text-[13px]"><span className="text-neutral-400">{f.status}</span><b>{f.n} · {fmt(f.amount)} USDC</b></p>)}
                {!(econ.founder as Json[]).length && <p className="text-[12px] text-neutral-500">Sin pedidos todavía.</p>}
              </Card>
            </div>
          </div>
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
      </main>
    </div>
  );
};
