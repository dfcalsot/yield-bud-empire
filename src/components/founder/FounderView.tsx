import React, { useCallback, useEffect, useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { Crown, ExternalLink, Eye, EyeOff, Loader2, ShieldCheck, Smartphone, Wallet } from 'lucide-react';
import { DESIGN_BY_ID } from '../../sim/avatars';
import { AvatarArt } from '../profile/AvatarArt';
import { createOrder, fetchCredits, fetchOrder, founderText, payWithWallet, setCredits, useFounder, type FounderCredits, type FounderOrder } from '../../economy/founderApi';
import { t } from '../../i18n';

const GOLD = '#fbbf24';

/** «Fundador #N»: the badge next to a founder's name */
export const FounderBadge: React.FC<{ number: number; compact?: boolean }> = ({ number, compact }) => (
  <span title={t('Fundador #{v0} de Yield Bud Empire', { v0: number })}
    className={`inline-flex items-center gap-1 rounded-full border font-mono font-bold ${compact ? 'px-1.5 py-0 text-[9.5px]' : 'px-2 py-0.5 text-[10.5px]'}`}
    style={{ color: GOLD, borderColor: 'rgba(251,191,36,.55)', background: 'linear-gradient(90deg, rgba(124,58,237,.35), rgba(251,191,36,.18))' }}>
    <Crown className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />{compact ? `#${number}` : t('Fundador #{v0}', { v0: number })}
  </span>
);

/** the Solana Pay URL as an SVG QR code (dark modules on white, with a quiet zone, so any wallet camera reads it) */
const Qr: React.FC<{ text: string }> = ({ text }) => {
  const svg = useMemo(() => { const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 4, margin: 4, scalable: true }); }, [text]);
  return <div className="w-52 h-52 sm:w-60 sm:h-60 rounded-xl overflow-hidden bg-white p-1 [&>svg]:w-full [&>svg]:h-full" aria-label={t('Código QR del pago')} dangerouslySetInnerHTML={{ __html: svg }} />;
};

const useCountdown = (until: number) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(i); }, []);
  const s = Math.max(0, Math.floor((until - now) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const PayPanel: React.FC<{ order: FounderOrder; network: string; onDone: () => void; onExpired: () => void }> = ({ order, network, onDone, onExpired }) => {
  const [step, setStep] = useState('');
  const [err, setErr] = useState('');
  const [status, setStatus] = useState(order.status);
  const left = useCountdown(order.expiresAt);
  // the server looks at the chain on each request; a payment takes some seconds to be final
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const r = await fetchOrder(order.id);
      if (stop || !r) return;
      setStatus(r.order.status);
      if (r.order.status === 'delivered') onDone();
      else if (r.order.status === 'expired') onExpired();
    };
    const i = window.setInterval(() => { void tick(); }, 5000);
    return () => { stop = true; window.clearInterval(i); };
  }, [order.id, onDone, onExpired]);

  const payHere = async () => {
    setErr(''); setStep(t('Conectando tu billetera…'));
    const r = await payWithWallet(order, network, setStep);
    if (r.ok) setStep(t('Pago enviado. Esperando la confirmación de Solana (unos segundos)…'));
    else { setStep(''); setErr(r.error); }
  };

  if (status === 'underpaid' || status === 'refund_needed') {
    return <div className="hud-panel p-4 text-sm text-amber-200">{status === 'underpaid' ? t('El pago llegó incompleto. Escríbenos a info@yieldbudempire.com con tu usuario y te lo devolvemos.') : t('Tu pago llegó cuando ya no quedaban packs. Te lo devolvemos a la misma billetera: escríbenos a info@yieldbudempire.com si tienes dudas.')}</div>;
  }
  return (
    <div className="hud-panel p-4 sm:p-5 grid gap-5 md:grid-cols-[auto_minmax(0,1fr)] items-center">
      <div className="mx-auto"><Qr text={order.url} /></div>
      <div className="space-y-3 min-w-0">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: GOLD }}>{t('Pedido #{v0} · vence en {v1}', { v0: order.id, v1: left })}</div>
        <div className="font-serif text-2xl font-black text-white">{order.amount} USDC <span className="text-sm font-mono text-neutral-400">· Solana{network === 'devnet' ? ' devnet' : ''}</span></div>
        <ol className="text-xs text-neutral-300 space-y-1 list-decimal pl-4">
          <li><Smartphone className="inline w-3.5 h-3.5 mr-1 text-sky-300" />{t('En el celular: escanea el QR con Phantom o Solflare y confirma.')}</li>
          <li><Wallet className="inline w-3.5 h-3.5 mr-1 text-purple-300" />{t('En la computadora: usa la billetera de este navegador.')}</li>
        </ol>
        <div className="flex flex-wrap gap-2">
          <button className="care-btn care-btn--gold" onClick={payHere} disabled={!!step && !err}><Wallet className="w-3.5 h-3.5" />{' '}{t('Pagar con mi billetera')}</button>
          <a className="care-btn" href={order.url}><Smartphone className="w-3.5 h-3.5" />{' '}{t('Abrir en la billetera')}</a>
        </div>
        {step && <p className="text-[11px] font-mono text-emerald-300 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />{step}</p>}
        {err && <p className="text-[11px] font-mono text-red-300">{err}</p>}
        <p className="text-[10.5px] font-mono text-neutral-500 leading-relaxed">{t('El pago va directo a la billetera de WOLI CBD S.A. en Solana. El juego lo detecta solo y entrega el pack; no hace falta vincular tu billetera. Si pagas y cierras esta página, el pack llega igual.')}</p>
      </div>
    </div>
  );
};

/** Crypto → Founders: the Founder Pack (100 numbered packs in USDC) and the credits */
export const FounderView: React.FC = () => {
  const { status, reload } = useFounder();
  const [order, setOrder] = useState<FounderOrder | null>(null);
  const [credits, setCreditsList] = useState<FounderCredits | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const design = DESIGN_BY_ID['fundador-1'];
  const closeOrder = useCallback(() => { setOrder(null); void reload(); }, [reload]);

  useEffect(() => { if (status?.order) setOrder(status.order); }, [status?.order]);
  useEffect(() => { void fetchCredits().then(setCreditsList); }, [status?.sold]);

  const buy = async () => {
    setErr(''); setBusy(true);
    const r = await createOrder();
    setBusy(false);
    if (r.ok) setOrder(r.data.order); else setErr(founderText(r.error));
  };
  const toggleCredits = async () => {
    if (!status?.me) return;
    const r = await setCredits(!status.me.credits);
    if (r.ok) { await reload(); setCreditsList(await fetchCredits()); }
  };

  if (!status) return <div className="p-6 text-sm text-neutral-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t('Cargando…')}</div>;
  const me = status.me;

  return (
    <div className="p-4 sm:p-6 space-y-5 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl border p-5 sm:p-6" style={{ borderColor: 'rgba(251,191,36,.45)', background: 'radial-gradient(120% 140% at 85% 20%, rgba(124,58,237,.35), rgba(10,7,22,.96) 60%), #0a0716' }}>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] items-center">
          <div className="space-y-3 min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: GOLD }}>{t('Edición única · {v0} packs numerados', { v0: status.supply })}</div>
            <h2 className="font-serif text-3xl font-black text-white leading-tight">{t('Pack de Fundador')}</h2>
            <p className="text-sm text-neutral-300 leading-relaxed max-w-xl">{t('Para quienes creen en Yield Bud Empire desde la alfa. Es un reconocimiento: no da ventajas en el juego ni $FLORA, y con él ayudas a que el proyecto siga creciendo.')}</p>
            <ul className="text-sm text-neutral-200 space-y-1.5">
              <li className="flex items-center gap-2"><Crown className="w-4 h-4 shrink-0" style={{ color: GOLD }} />{t('La insignia «Fundador #N» junto a tu nombre, con tu número para siempre.')}</li>
              <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 shrink-0 text-purple-300" />{t('El avatar «{v0}», exclusivo: nunca sale de un cofre ni se vende.', { v0: t(design.name) })}</li>
              <li className="flex items-center gap-2"><Eye className="w-4 h-4 shrink-0 text-emerald-300" />{t('Tu nombre en los créditos del juego y del sitio (si quieres).')}</li>
            </ul>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {me ? (
                <FounderBadge number={me.number} />
              ) : status.enabled ? (
                <button className={`mk-buy ${status.left > 0 || order ? '' : 'is-poor'}`} onClick={order ? undefined : buy} disabled={busy || !!order} style={{ maxWidth: 320 }}>
                  <span className="mk-buy-shine" /><span>{order ? t('Pedido en curso') : t('Comprar el Pack de Fundador')}</span>
                  <span className="ml-auto font-mono">{status.price} USDC</span>
                </button>
              ) : (
                <span className="mk-panel px-3 py-2 text-[11px] font-mono text-neutral-300">{t('Muy pronto a la venta')}</span>
              )}
              <span className="text-[11px] font-mono text-neutral-400">{t('Vendidos {v0} de {v1}', { v0: status.sold, v1: status.supply })}</span>
            </div>
            {err && <p className="text-[11px] font-mono text-red-300">{err}</p>}
          </div>
          <div className="w-40 h-40 sm:w-48 sm:h-48 mx-auto rounded-2xl overflow-hidden border-2" style={{ borderColor: GOLD, boxShadow: '0 0 30px rgba(251,191,36,.35)' }}><AvatarArt design={design} className="w-full h-full" /></div>
        </div>
      </div>

      {me && (
        <div className="hud-panel p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-neutral-200">{t('¡Gracias, Fundador #{v0}! Tu avatar está en Perfil → Colección.', { v0: me.number })}</div>
          <button className="care-btn" onClick={toggleCredits}>{me.credits ? <><EyeOff className="w-3.5 h-3.5" />{' '}{t('No aparecer en los créditos')}</> : <><Eye className="w-3.5 h-3.5" />{' '}{t('Aparecer en los créditos')}</>}</button>
        </div>
      )}

      {!me && order && order.status !== 'delivered' && (
        <PayPanel order={order} network={status.network} onDone={closeOrder} onExpired={closeOrder} />
      )}

      <div className="hud-panel p-4 sm:p-5 space-y-3">
        <h3 className="font-serif text-lg font-black text-white flex items-center gap-2"><Crown className="w-4 h-4" style={{ color: GOLD }} />{t('Fundadores')}</h3>
        {credits && credits.founders.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {credits.founders.map((f) => <span key={f.number} className="mk-panel px-2.5 py-1.5 text-[12px] text-neutral-100 flex items-center gap-1.5"><FounderBadge number={f.number} compact />{f.name}</span>)}
          </div>
        ) : <p className="text-xs text-neutral-400">{t('Todavía no hay fundadores. El primero se queda con el #1.')}</p>}
      </div>

      <p className="text-[10.5px] font-mono text-neutral-500 leading-relaxed">
        {t('Uno por cuenta. Se paga en USDC en la red Solana; la comisión de la red la paga quien compra. Es un bien digital que se entrega al confirmarse el pago y no da ventajas ni $FLORA. Detalles en los Términos.')}{' '}
        <a href="https://yieldbudempire.com/terminos/" target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-300">{t('Términos')}<ExternalLink className="inline w-3 h-3 ml-0.5" /></a>
      </p>
    </div>
  );
};
