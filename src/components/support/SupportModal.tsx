import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ImagePlus, LifeBuoy, Send, X } from 'lucide-react';
import { t, k, getLang } from '../../i18n';
import { currentScreen, device } from '../../utils/telemetry';
import { SUPPORT_EMAIL } from './email';

/**
 * «Ayuda»: the player's support cases (server/support.mjs). A new case takes a topic, a message and optionally a screenshot; the
 * game adds the context by itself (screen, device, build, language, window size), so the player doesn't have to explain it.
 * The operators answer from the panel; the answer shows up here (and by email).
 */
type Json = Record<string, any>;
const TOPICS: Array<[string, string]> = [
  ['bug', k('Algo no funciona')], ['pago', k('Pagos / Pack de Fundador')], ['reliquias', k('Reliquias / Solana')],
  ['cuenta', k('Mi cuenta')], ['sugerencia', k('Sugerencia')], ['otro', k('Otro')],
];
const STATUS: Record<string, string> = { nuevo: k('Recibido'), en_curso: k('En curso'), resuelto: k('Resuelto') };
const ERRORS: Record<string, string> = {
  too_short: k('Cuéntanos un poco más (al menos 10 letras).'), too_many_open: k('Ya tienes 5 casos abiertos: espera a que respondamos alguno.'),
  bad_image: k('La captura tiene que ser una imagen PNG, JPG o WebP.'), image_too_big: k('La captura es muy pesada; prueba con otra más chica.'),
  rate_limited: k('Enviaste muchos mensajes seguidos; espera un rato.'), unauthenticated: k('Tu sesión se cerró: vuelve a entrar.'),
};

const call = async (method: 'GET' | 'POST', path: string, body?: unknown): Promise<Json> => {
  try {
    const r = await fetch(path, { method, credentials: 'same-origin', headers: { 'x-cf-csrf': '1', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    return r.ok ? j : { error: t(ERRORS[j.error] ?? 'No se pudo enviar. Prueba de nuevo.') };
  } catch { return { error: t('Sin conexión. Prueba de nuevo.') }; }
};

/** a screenshot shrunk in the browser (max 1600 px, WebP or JPEG) so it stays light */
async function shrink(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const s = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    let out = c.toDataURL('image/webp', 0.82);
    if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', 0.82);
    return out;
  } finally { URL.revokeObjectURL(url); }
}

const when = (ts: number) => new Date(ts).toLocaleString(getLang() === 'en' ? 'en-US' : 'es-CR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const SupportModal: React.FC<{ onClose: () => void; onUnread?: (n: number) => void }> = ({ onClose, onUnread }) => {
  const [list, setList] = useState<Json[] | null>(null);
  const [view, setView] = useState<'list' | 'new' | number>('list');
  const [ticket, setTicket] = useState<Json | null>(null);
  const [topic, setTopic] = useState('bug');
  const [body, setBody] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [sent, setSent] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadList = async () => { const r = await call('GET', '/api/support/mine'); if (!r.error) { setList(r.tickets); onUnread?.(r.unread ?? 0); if (!r.tickets.length) setView((v) => (v === 'list' ? 'new' : v)); } else setErr(r.error); };
  const openTicket = async (id: number) => { setView(id); setTicket(null); setErr(''); const r = await call('GET', `/api/support/ticket?id=${id}`); if (r.error) setErr(r.error); else { setTicket(r.ticket); void loadList(); } };
  useEffect(() => { void loadList(); }, []);
  useEffect(() => { const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', esc); return () => window.removeEventListener('keydown', esc); }, [onClose]);
  useEffect(() => { if (typeof view !== 'number') return; const id = window.setInterval(() => { void call('GET', `/api/support/ticket?id=${view}`).then((r) => { if (!r.error) setTicket(r.ticket); }); }, 30_000); return () => window.clearInterval(id); }, [view]);

  const pick = async (f?: File) => { if (!f) return; setErr(''); try { setImage(await shrink(f)); } catch { setErr(t('No se pudo leer esa imagen.')); } };
  const reset = () => { setBody(''); setImage(null); if (fileRef.current) fileRef.current.value = ''; };
  const send = async () => {
    setBusy(true); setErr('');
    if (view === 'new') {
      const r = await call('POST', '/api/support/new', { topic, body, image, context: { screen: currentScreen(), device: device(), build: __BUILD__, lang: getLang(), size: `${window.innerWidth}x${window.innerHeight}` } });
      if (r.error) setErr(r.error); else { reset(); setSent(t('¡Listo! Recibimos tu caso #{id}. Te respondemos aquí y por correo.', { id: r.id })); await loadList(); void openTicket(r.id); }
    } else if (typeof view === 'number') {
      const r = await call('POST', '/api/support/reply', { id: view, body, image });
      if (r.error) setErr(r.error); else { reset(); void openTicket(view); }
    }
    setBusy(false);
  };

  const composer = (placeholder: string, min: number) => (
    <div className="space-y-2">
      <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} rows={view === 'new' ? 5 : 3} placeholder={placeholder}
        className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-[13.5px] text-white placeholder:text-neutral-500 focus:outline-none focus:border-emerald-400/60" />
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[12.5px] text-neutral-200 cursor-pointer"><ImagePlus className="w-4 h-4" />{image ? t('Cambiar captura') : t('Adjuntar captura')}</button>
        {image && <span className="flex items-center gap-1.5"><img src={image} alt="" className="h-9 rounded border border-white/15" /><button type="button" onClick={() => setImage(null)} className="text-[11px] text-neutral-400 hover:text-white cursor-pointer">{t('Quitar')}</button></span>}
        <button type="button" disabled={busy || body.trim().length < min} onClick={() => void send()} className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-neutral-950 text-[13px] font-bold disabled:opacity-40 cursor-pointer"><Send className="w-4 h-4" />{busy ? '…' : t('Enviar')}</button>
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center p-3 sm:p-6" role="dialog" aria-modal aria-label={t('Ayuda')}>
      <button type="button" aria-label={t('Cerrar')} className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-default" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-emerald-400/25 bg-neutral-950/95 shadow-2xl">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
          {view !== 'list' && list && list.length > 0 && <button type="button" onClick={() => { setView('list'); setErr(''); setSent(''); }} aria-label={t('Volver')} className="p-1 rounded-md hover:bg-white/10 cursor-pointer"><ArrowLeft className="w-4 h-4" /></button>}
          <LifeBuoy className="w-5 h-5 text-emerald-300" />
          <h2 className="font-bold text-white">{view === 'new' ? t('Nuevo caso') : typeof view === 'number' ? t('Caso #{id}', { id: view }) : t('Ayuda')}</h2>
          <button type="button" onClick={onClose} aria-label={t('Cerrar')} className="ml-auto p-1 rounded-md hover:bg-white/10 cursor-pointer"><X className="w-4 h-4" /></button>
        </header>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {err && <p className="rounded-lg bg-rose-500/10 border border-rose-400/30 px-3 py-2 text-[13px] text-rose-200">{err}</p>}
          {sent && <p className="rounded-lg bg-emerald-500/10 border border-emerald-400/30 px-3 py-2 text-[13px] text-emerald-200">{sent}</p>}

          {view === 'list' && (!list ? <p className="text-sm text-neutral-400">{t('Cargando…')}</p> : (<>
            <button type="button" onClick={() => { setView('new'); setSent(''); }} className="w-full px-4 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold text-sm cursor-pointer">{t('Reportar un problema o pedir ayuda')}</button>
            <p className="text-[11px] uppercase tracking-wider text-neutral-500 pt-1">{t('Tus casos')}</p>
            <ul className="space-y-1.5">{list.map((c) => (
              <li key={c.id}><button type="button" onClick={() => void openTicket(c.id)} className="w-full text-left rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.07] px-3 py-2.5 cursor-pointer">
                <span className="flex items-center gap-2"><span className="font-mono text-[11px] text-neutral-500">#{c.id}</span><span className="flex-1 truncate text-[13.5px] text-white">{c.subject}</span>{c.unread && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-400 text-neutral-950">{t('Respuesta nueva')}</span>}</span>
                <span className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5"><span className={c.status === 'resuelto' ? 'text-emerald-300' : c.status === 'en_curso' ? 'text-amber-200' : ''}>{t(STATUS[c.status] ?? c.status)}</span>· {when(c.updated_at)}</span>
              </button></li>))}</ul>
          </>))}

          {view === 'new' && (<>
            <p className="text-[13px] text-neutral-300">{t('Cuéntanos qué pasó. Junto con tu mensaje nos llega en qué pantalla estabas, tu equipo y los últimos errores del juego, para ayudarte más rápido.')}</p>
            <label className="block text-[12px] text-neutral-400">{t('Tema')}
              <select value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1 w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-[13.5px] text-white">
                {TOPICS.map(([id, label]) => <option key={id} value={id}>{t(label)}</option>)}
              </select>
            </label>
            {composer(t('Por ejemplo: «Mi planta dejó de crecer desde ayer aunque tiene agua»'), 10)}
          </>)}

          {typeof view === 'number' && (!ticket ? <p className="text-sm text-neutral-400">{t('Cargando…')}</p> : (<>
            <p className="text-[12px] text-neutral-400">{t(TOPICS.find(([id]) => id === ticket.topic)?.[1] ?? 'Otro')} · <span className={ticket.status === 'resuelto' ? 'text-emerald-300' : 'text-amber-200'}>{t(STATUS[ticket.status] ?? ticket.status)}</span></p>
            <ul className="space-y-2">{(ticket.messages as Json[]).map((m) => (
              <li key={m.id} className={`max-w-[88%] rounded-2xl px-3 py-2 text-[13.5px] whitespace-pre-wrap break-words ${m.author === 'admin' ? 'bg-emerald-400/10 border border-emerald-400/25 text-emerald-50' : 'ml-auto bg-white/[0.06] border border-white/10 text-white'}`}>
                <span className="block text-[10.5px] text-neutral-400 mb-0.5">{m.author === 'admin' ? t('Soporte de Yield Bud Empire') : t('Tú')} · {when(m.created_at)}</span>
                {m.body}
                {m.image && <a href={m.image} target="_blank" rel="noreferrer"><img src={m.image} alt={t('Captura')} className="mt-2 max-h-48 rounded-lg border border-white/10" /></a>}
              </li>))}</ul>
            {composer(ticket.status === 'resuelto' ? t('¿Volvió a pasar? Escríbenos y reabrimos el caso.') : t('Escribe tu mensaje…'), 2)}
          </>))}
        </div>

        <footer className="px-4 py-2.5 border-t border-white/10 text-[11.5px] text-neutral-400">
          {t('¿Prefieres correo? Escríbenos a')} <a href={`mailto:${SUPPORT_EMAIL}`} className="text-emerald-300 hover:underline">{SUPPORT_EMAIL}</a>
        </footer>
      </div>
    </div>,
    document.body,
  );
};
