import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { api, errText, solveCaptcha, logoutServer, saveAccountLang } from './api';
import { YieldBudWordmark } from '../components/brand/YieldBudWordmark';
import { Npc, useNpcSay } from '../components/npc/Npc';
import { getStoredUserProfiles, saveUserProfile, setActiveUserId } from '../utils/auth';
import type { UserProfile } from '../types';
import { t, getLang, setLang, hasChosenLang, useLang, t as tr } from '../i18n';
import { LangSwitch } from '../i18n/LangSwitch';

/** The service builds links with its configured public address; on screen they should open on the address you are playing from. */
const here = (u?: string): string => (u ? u.replace(/^https?:\/\/[^/]+/, window.location.origin) : '');

export interface ServerAccount { id: number; username: string; email: string | null; verified: boolean; providers: string[]; source: string; createdAt: number; lang?: string | null }
/** Versión de los Términos y la Política de Privacidad (la misma fecha que en yieldbudempire.com, src/legal/content.ts). */
const TERMS_VERSION = '2026-09-23';
const LEGAL = {
  terms: 'https://yieldbudempire.com/terminos/', privacy: 'https://yieldbudempire.com/privacidad/',
  cookies: 'https://yieldbudempire.com/cookies/', legal: 'https://yieldbudempire.com/aviso-legal/',
};

interface AuthConfig { google: boolean; x: boolean; emailDelivery: boolean; devLinks: boolean; inviteOnly?: boolean; captcha: { bits: number } }

/** Make the account service's user the active local profile (game data stays per user in this browser). */
function prepareProfile(a: ServerAccount) {
  const id = `srv-${a.id}`;
  if (!getStoredUserProfiles().some((u) => u.id === id)) {
    const p: UserProfile = {
      id, username: a.username, email: a.email ?? `${a.username}@cuenta.chronoflora`, displayName: a.username, avatar: '🌱', role: 'Principiante Botánico',
      createdAt: a.createdAt, experienceLevel: 1, facilityName: 'Carpa Casera 80x80cm',
    };
    saveUserProfile(p);
  }
  setActiveUserId(id);
}

const strength = (pw: string) => {
  let s = 0;
  if (pw.length >= 10) s++;
  if (pw.length >= 14) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
};

const Field: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }> = ({ label, hint, ...p }) => (
  <label className="block space-y-1">
    <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-300/80">{label}</span>
    <input {...p} className="w-full bg-neutral-950/80 border border-neutral-700 focus:border-emerald-400/70 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none transition" />
    {hint && <span className="block text-[10.5px] text-neutral-500">{hint}</span>}
  </label>
);

const Social: React.FC<{ href: string; enabled: boolean; label: string; icon: React.ReactNode; onBlocked?: () => void }> = ({ href, enabled, label, icon, onBlocked }) => (
  <a
    href={enabled ? href : undefined}
    onClick={(e) => { if (enabled && onBlocked) { e.preventDefault(); onBlocked(); } }}
    aria-disabled={!enabled}
    title={enabled ? label : t('Aún no está activado en este servidor (falta la clave del proveedor)')}
    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${enabled ? 'border-neutral-600 bg-neutral-900 hover:bg-neutral-800 text-white cursor-pointer' : 'border-neutral-800 bg-neutral-950 text-neutral-600 cursor-not-allowed'}`}
  >
    {icon} {label}{!enabled && <span className="text-[9px] font-mono uppercase text-neutral-600">{t('pronto')}</span>}
  </a>
);

const GoogleG = () => (<svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.5-.2-2.3H12v4.4h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.5Z" /><path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0 0 12 23.5Z" /><path fill="#FBBC05" d="M5.6 14.2a6.9 6.9 0 0 1 0-4.4v-3H1.8a11.5 11.5 0 0 0 0 10.4l3.8-3Z" /><path fill="#EA4335" d="M12 5.4c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 0 0 1.8 6.8l3.8 3C6.5 7.4 9 5.4 12 5.4Z" /></svg>);
const XMark = () => (<svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden><path d="M18.2 2h3.3l-7.2 8.3L23 22h-6.6l-5.2-6.8L5.2 22H1.9l7.7-8.8L1.4 2h6.8l4.7 6.2L18.2 2Zm-1.2 18h1.8L7.3 3.9H5.4L17 20Z" /></svg>);

type Mode = 'login' | 'register' | 'pending' | 'forgot' | 'forgot_sent' | 'reset';

const AuthScreen: React.FC<{ config: AuthConfig; initialMsg?: string; resetToken?: string; onAccount: (a: ServerAccount) => void }> = ({ config, initialMsg, resetToken, onAccount }) => {
  const inviteFromUrl = useMemo(() => { try { return new URLSearchParams(window.location.search).get('invite') ?? ''; } catch { return ''; } }, []);
  const [mode, setMode] = useState<Mode>(resetToken ? 'reset' : inviteFromUrl ? 'register' : 'login');
  const [invite, setInvite] = useState(inviteFromUrl);
  const [accepted, setAccepted] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [hp, setHp] = useState('');
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    if (prog === null) { setElapsed(0); return; }
    const t0 = Date.now();
    const id = window.setInterval(() => setElapsed(Math.round((Date.now() - t0) / 1000)), 500);
    return () => window.clearInterval(id);
  }, [prog === null]);
  const [err, setErr] = useState(initialMsg ?? '');
  const [devLink, setDevLink] = useState('');
  const openedAt = useRef(Date.now());
  const npc = useNpcSay(t('¡Hola! Soy Chrono, tu guía en Yield Bud Empire. Para cuidar el juego de los bots, tu navegador hará una pequeña prueba antes de crear la cuenta.'));
  const pwScore = useMemo(() => strength(password), [password]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr('');
    try { await fn(); } catch (e) { setErr(e instanceof Error && e.message !== 'worker_failed' ? errText({ error: e.message }) : t('Tu navegador no pudo hacer la verificación. Prueba a recargar la página o a desactivar bloqueadores para este sitio.')); }
    finally { setBusy(false); setProg(null); }
  };
  const captcha = async (purpose: string) => { npc.speak(t('Verificando que eres humano… ¡un momento!'), 'busy'); abort.current = new AbortController(); setProg(0); const s = await solveCaptcha(purpose, setProg, abort.current.signal); npc.speak(t('¡Verificado!'), 'happy'); return s; };

  const doRegister = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    const sol = await captcha('register');
    const r = await api('POST', '/api/auth/register', { email, username, password, hp, t: openedAt.current, captcha: sol, invite, acceptTerms: accepted, termsVersion: TERMS_VERSION, lang: getLang() });
    if (r.status !== 200) { setErr(errText(r.data)); npc.speak(errText(r.data), 'sad'); return; }
    setDevLink(here(r.data.devLink));
    npc.speak(t('¡Cuenta creada! Te enviamos un correo: confírmalo para empezar a jugar.'), 'happy');
    const me = await api('GET', '/api/auth/me');
    if (me.status === 200) { setMode('pending'); }
  }); };

  const doLogin = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    let r = await api('POST', '/api/auth/login', { identifier: email, password });
    if (r.status === 400 && r.data?.error === 'captcha_missing') {
      const sol = await captcha('login');
      r = await api('POST', '/api/auth/login', { identifier: email, password, captcha: sol });
    }
    if (r.status !== 200) { setErr(errText(r.data)); npc.speak(errText(r.data), 'sad'); return; }
    onAccount(r.data.account);
  }); };

  const doForgot = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    const sol = await captcha('reset');
    const r = await api('POST', '/api/auth/reset/request', { email, captcha: sol });
    if (r.status !== 200) { setErr(errText(r.data)); return; }
    setDevLink(here(r.data.devLink)); setMode('forgot_sent');
  }); };

  const doReset = (e: React.FormEvent) => { e.preventDefault(); run(async () => {
    const r = await api('POST', '/api/auth/reset/confirm', { token: resetToken, password });
    if (r.status !== 200) { setErr(errText(r.data)); return; }
    history.replaceState(null, '', location.pathname); setPassword(''); setMode('login'); setErr(''); npc.speak(t('Contraseña cambiada. Entra con la nueva.'), 'happy');
  }); };

  const resend = () => run(async () => {
    const sol = await captcha('resend');
    const r = await api('POST', '/api/auth/resend', { email, captcha: sol });
    if (r.status !== 200) setErr(errText(r.data)); else { setDevLink(here(r.data.devLink) || devLink); npc.speak(t('Te envié otro correo.'), 'happy'); }
  });

  // alfa cerrada: para crear una cuenta nueva (también con Google/X) hace falta el código
  const needInvite = !!config.inviteOnly && mode === 'register' && !invite.trim();
  const needTerms = mode === 'register' && !accepted;
  const socialHref = (p: string) => {
    const q = new URLSearchParams();
    if (mode === 'register' && accepted) q.set('terms', TERMS_VERSION);
    if (config.inviteOnly && mode === 'register' && invite.trim()) q.set('invite', invite.trim());
    const qs = q.toString();
    return `/api/auth/${p}/start${qs ? `?${qs}` : ''}`;
  };
  const blocked = needInvite ? t('Primero escribí tu código de invitación abajo; después tocá el botón.') : needTerms ? t('Primero marcá abajo que tenés 18 años o más y aceptás los Términos y la Privacidad; después tocá el botón.') : '';
  const tabBtn = (m: Mode, label: string) => (
    <button type="button" role="tab" aria-selected={mode === m} onClick={() => { setMode(m); setErr(''); }} className={`flex-1 py-2 text-[11px] font-semibold tracking-wide rounded-md transition cursor-pointer ${mode === m ? 'bg-neutral-800 text-white shadow-inner' : 'text-neutral-500 hover:text-neutral-200'}`}>{label}</button>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#04090a] relative overflow-hidden">
      <div className="pl-stars" />
      <div className="relative z-10 w-full max-w-md space-y-4">
        <div className="flex justify-end -mb-2"><LangSwitch /></div>
        <div className="text-center">
          <h1 className="sr-only">{t('Yield Bud Empire')}</h1>
          <YieldBudWordmark variant="hero" className="mx-auto mt-3" />
          <p className="text-[10.5px] font-mono uppercase tracking-[0.2em] text-emerald-300/60 mt-1">{t('Acceso seguro · una cuenta por persona')}</p>
        </div>
        <div className="hud-panel px-3 pt-3 pb-1"><Npc kind="chrono" text={tr(npc.say.text)} mood={npc.say.mood} moodKey={npc.say.key} /></div>

        <div className="hud-panel p-5 space-y-4" style={{ background: 'rgba(3, 14, 11, 0.96)' }}>
          {(mode === 'login' || mode === 'register') && (
            <>
              <div className="flex gap-1 p-1 rounded-lg bg-neutral-950 border border-neutral-800" role="tablist">{tabBtn('login', t('Ya tengo cuenta'))}{tabBtn('register', t('Soy nuevo'))}</div>
              <div className="grid grid-cols-2 gap-2.5">
                <Social href={socialHref('google')} enabled={config.google} label={t('Google')} icon={<GoogleG />} onBlocked={blocked ? () => setErr(blocked) : undefined} />
                <Social href={socialHref('x')} enabled={config.x} label="X" icon={<XMark />} onBlocked={blocked ? () => setErr(blocked) : undefined} />
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono uppercase tracking-wider text-neutral-600"><span className="flex-1 h-px bg-neutral-800" />{t('o con tu correo')}<span className="flex-1 h-px bg-neutral-800" /></div>
            </>
          )}

          {mode === 'login' && (
            <form onSubmit={doLogin} className="space-y-3.5" autoComplete="on">
              <Field label={t('Correo o usuario')} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required maxLength={254} />
              <div className="relative"><Field label={t('Contraseña')} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required maxLength={128} />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-8 text-neutral-500 hover:text-white cursor-pointer" aria-label={t('Mostrar contraseña')}>{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
              <button type="submit" disabled={busy} className="mk-buy !text-[12px]"><span className="mk-buy-shine" />{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}<span>{t('Iniciar sesión')}</span></button>
              <button type="button" className="block mx-auto text-[11px] font-mono text-emerald-300/80 hover:text-emerald-200 cursor-pointer" onClick={() => { setMode('forgot'); setErr(''); }}>{t('Olvidé mi contraseña')}</button>
              {config.inviteOnly && (
                <button type="button" onClick={() => { setMode('register'); setErr(''); }} className="w-full text-left rounded-xl border border-amber-300/30 bg-amber-400/[0.06] px-3 py-2.5 text-[11.5px] text-amber-100 hover:bg-amber-400/10 cursor-pointer">
                  <b>{t('¿Te llegó un código de invitación?')}</b>{' '}{t('Tocá acá (o «Soy nuevo») para crear tu cuenta con él.')}
                </button>
              )}
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={doRegister} className="space-y-3.5" autoComplete="on">
              {config.inviteOnly && (
                <Field label={t('Código de invitación')} value={invite} onChange={(e) => setInvite(e.target.value.toUpperCase())} required maxLength={20} autoComplete="off" spellCheck={false} placeholder="YBE-XXXX-XXXX"
                  hint={t('La alfa es con invitación: tu código personal te llega por correo cuando te toca. ¿Todavía no te anotaste? Hacé el pre-registro en yieldbudempire.com.')} />
              )}
              <Field label={t('Correo')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required maxLength={254} hint={t('Debe ser un correo real: te enviaremos un enlace para confirmarlo.')} />
              <Field label={t('Nombre de usuario')} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required minLength={3} maxLength={20} hint={t('3–20 caracteres. Se puede cambiar de apodo después en tu perfil.')} />
              <div className="relative"><Field label={t('Contraseña')} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={10} maxLength={128} />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-8 text-neutral-500 hover:text-white cursor-pointer" aria-label={t('Mostrar contraseña')}>{show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
              <div className="flex gap-1" aria-label={t('Fortaleza de la contraseña')}>{[0, 1, 2, 3].map((i) => <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: i < pwScore ? ['#f87171', '#fbbf24', '#a3e635', '#34d399'][pwScore - 1] : '#1f2937' }} />)}</div>
              <p className="text-[10.5px] text-neutral-500 -mt-1">{t('Mínimo 10 caracteres; mezcla mayúsculas, números o símbolos, o usa una frase larga.')}</p>
              {/* honeypot: invisible to people, irresistible to bots */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
                <label>{t('No rellenar')}<input tabIndex={-1} autoComplete="off" name="website" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
              </div>
              <label className="flex items-start gap-2.5 text-[11.5px] leading-snug text-neutral-300 cursor-pointer">
                <input type="checkbox" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 w-4 h-4 accent-emerald-400 shrink-0" />
                <span>{t('Tengo')}{' '}<b className="text-white">{t('18 años o más')}</b>{' '}{t('y acepto los')}{' '}<a href={LEGAL.terms} target="_blank" rel="noopener" className="text-emerald-300 underline">{t('Términos y Condiciones')}</a>{' '}{t('y la')}{' '}<a href={LEGAL.privacy} target="_blank" rel="noopener" className="text-emerald-300 underline">{t('Política de Privacidad')}</a>.</span>
              </label>
              <button type="submit" disabled={busy} className="mk-buy !text-[12px]"><span className="mk-buy-shine" />{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}<span>{t('Registrarme')}</span></button>
              <p className="text-[10px] font-mono text-neutral-600 text-center">{t('Una cuenta por persona. Las cuentas duplicadas o de bots se bloquean.')}</p>
            </form>
          )}

          {mode === 'pending' && (
            <div className="space-y-3 text-center">
              <Mail className="w-10 h-10 mx-auto text-emerald-300" />
              <h2 className="font-serif text-lg font-black text-white">{t('Revisa tu correo')}</h2>
              <p className="text-sm text-neutral-300">{t('Te enviamos un enlace a')}{' '}<b>{email}</b>{t('. Ábrelo para confirmar tu cuenta (vale 24 horas).')}</p>
              {devLink && <a href={devLink} className="block text-[11px] font-mono text-amber-300 break-all border border-amber-400/30 rounded-lg p-2">{t('Modo desarrollo (sin servidor de correo): {devLink}', { devLink })}</a>}
              <div className="flex gap-2"><button className="care-btn flex-1" disabled={busy} onClick={resend}>{busy ? t('Enviando…') : t('Reenviar correo')}</button><button className="care-btn care-btn--gold flex-1" onClick={async () => { const me = await api('GET', '/api/auth/me'); if (me.status === 200 && me.data.account.verified) onAccount(me.data.account); else setErr(t('Todavía no está confirmada. Abre el enlace del correo.')); }}>{t('Ya la confirmé')}</button></div>
              <button className="text-[11px] font-mono text-neutral-500 hover:text-white cursor-pointer" onClick={async () => { await logoutServer(); setMode('login'); }}>{t('Usar otra cuenta')}</button>
            </div>
          )}

          {mode === 'forgot' && (
            <form onSubmit={doForgot} className="space-y-3.5">
              <h2 className="font-serif text-lg font-black text-white">{t('Restablecer contraseña')}</h2>
              <Field label={t('Correo de tu cuenta')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} />
              <button type="submit" disabled={busy} className="mk-buy !text-[12px]"><span className="mk-buy-shine" /><span>{t('Enviar enlace')}</span></button>
              <button type="button" className="block mx-auto text-[11px] font-mono text-neutral-500 hover:text-white cursor-pointer" onClick={() => setMode('login')}>{t('Volver')}</button>
            </form>
          )}
          {mode === 'forgot_sent' && (
            <div className="space-y-3 text-center"><Mail className="w-10 h-10 mx-auto text-emerald-300" /><p className="text-sm text-neutral-300">{t('Si ese correo tiene una cuenta, te enviamos un enlace para elegir una contraseña nueva (vale 1 hora).')}</p>
              {devLink && <a href={devLink} className="block text-[11px] font-mono text-amber-300 break-all border border-amber-400/30 rounded-lg p-2">{t('Modo desarrollo: {devLink}', { devLink })}</a>}
              <button className="care-btn w-full" onClick={() => setMode('login')}>{t('Volver a entrar')}</button></div>
          )}
          {mode === 'reset' && (
            <form onSubmit={doReset} className="space-y-3.5">
              <h2 className="font-serif text-lg font-black text-white">{t('Elige una contraseña nueva')}</h2>
              <Field label={t('Contraseña nueva')} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required minLength={10} maxLength={128} />
              <button type="submit" disabled={busy} className="mk-buy !text-[12px]"><span className="mk-buy-shine" /><span>{t('Cambiar contraseña')}</span></button>
            </form>
          )}

          {(mode === 'login' || mode === 'register') && prog === null && (
            <p className="flex items-start gap-2 text-[10.5px] leading-snug text-neutral-400"><ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-300" aria-hidden /><span><b className="text-neutral-200">{t('Verificación anti-bots automática.')}</b>{' '}{t('Al enviar, tu navegador resuelve un cálculo corto (unos segundos). No hay nada que pulsar ni resolver.')}</span></p>
          )}
          {prog !== null && (
            <div className="rounded-xl border border-emerald-300/30 bg-emerald-400/[0.06] p-3 space-y-2" role="status" aria-live="polite">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-100"><ShieldCheck className="w-4 h-4 text-emerald-300" aria-hidden />{t('Verificando que eres humano…')}<span className="ml-auto font-mono text-emerald-300">{Math.round(prog * 100)}%</span></div>
              <div className="mk-bar"><i style={{ ['--to' as string]: Math.max(0.05, prog), background: 'linear-gradient(90deg,#059669,#6ee7b7)' } as React.CSSProperties} /></div>
              <div className="flex items-center gap-2 text-[10.5px] text-neutral-400">
                <span>{elapsed < 12 ? t('Tu navegador está haciendo un cálculo corto; no hay nada que resolver.') : t('Tu equipo va algo lento; sigue en marcha, ya casi.')}</span>
                <button type="button" onClick={() => abort.current?.abort()} className="ml-auto shrink-0 underline underline-offset-2 hover:text-white cursor-pointer">{t('Cancelar')}</button>
              </div>
            </div>
          )}
          {err && <p className="text-[12px] font-mono text-red-300 bg-red-500/10 border border-red-400/30 rounded-lg px-3 py-2" role="alert">{err}</p>}
        </div>
        <nav aria-label={t('Documentos legales')} className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10.5px] font-mono text-neutral-500">
          <a href={LEGAL.terms} target="_blank" rel="noopener" className="hover:text-emerald-300">{t('Términos')}</a>
          <a href={LEGAL.privacy} target="_blank" rel="noopener" className="hover:text-emerald-300">{t('Privacidad')}</a>
          <a href={LEGAL.cookies} target="_blank" rel="noopener" className="hover:text-emerald-300">{t('Cookies')}</a>
          <a href={LEGAL.legal} target="_blank" rel="noopener" className="hover:text-emerald-300">{t('Aviso legal')}</a>
          <span>{t('· Solo mayores de 18')}</span>
        </nav>
        <p className="text-center text-[10px] font-mono text-neutral-600">{t('Tus contraseñas se guardan con scrypt; nunca las vemos. La verificación anti-bots corre en tu navegador, sin rastreadores.')}</p>
      </div>
    </div>
  );
};

/* ───────────────────────── the gate ───────────────────────── */

/** Shows the game only for a signed-in (and, for e-mail accounts, verified) session. */
export const AuthGate: React.FC<{ children: (account: ServerAccount | null) => React.ReactNode }> = ({ children }) => {
  const lang = useLang();   // al cambiar de idioma se vuelve a dibujar
  const [state, setState] = useState<'loading' | 'anon' | 'ready' | 'demo' | 'down'>('loading');
  const [account, setAccount] = useState<ServerAccount | null>(null);
  const [config, setConfig] = useState<AuthConfig>({ google: false, x: false, emailDelivery: false, devLinks: false, captcha: { bits: 20 } });
  const [msg, setMsg] = useState('');
  const [resetToken, setResetToken] = useState<string | undefined>();

  const accept = (a: ServerAccount) => {
    // idioma: el de la cuenta manda si el jugador no eligió otro en este navegador; una cuenta sin idioma (p. ej. Google) toma el actual
    if ((a.lang === 'es' || a.lang === 'en') && !hasChosenLang()) void setLang(a.lang, false);
    else if (!a.lang || (hasChosenLang() && a.lang !== getLang())) void saveAccountLang(getLang());
    const ok = a.verified || a.providers.includes('x');
    if (!ok) { setAccount(a); setState('anon'); return; }
    prepareProfile(a); setAccount(a); setState('ready');
  };

  const boot = async () => {
    setState('loading');
    const h = new URLSearchParams(location.hash.replace(/^#/, ''));
    const keep = () => history.replaceState(null, '', location.pathname);
    try {
      const c = await api('GET', '/api/auth/config');
      if (c.status !== 200 || !c.data) throw new Error('no_api');
      setConfig(c.data);
      if (h.get('verify')) { const r = await api('POST', '/api/auth/verify', { token: h.get('verify') }); setMsg(r.status === 200 ? t('¡Correo confirmado! Ya puedes entrar.') : errText(r.data)); keep(); }
      else if (h.get('reset')) { setResetToken(h.get('reset') ?? undefined); }
      else if (h.get('auth_error')) { setMsg(errText({ error: h.get('auth_error') })); keep(); }
      else if (h.get('auth')) keep();
      const me = await api('GET', '/api/auth/me');
      if (me.status === 200) { accept(me.data.account); return; }
      setState('anon');
    } catch {
      // no account service reachable: development keeps working with the local demo profiles; production refuses to open
      setState(import.meta.env.DEV ? 'demo' : 'down');
    }
  };
  useEffect(() => { boot(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // the on-screen confirmation / reset links only change the hash of the page that is already open: handle them too
  useEffect(() => {
    const onHash = () => { if (/^#(verify|reset)=/.test(location.hash)) boot(); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === 'loading') return <div className="min-h-screen grid place-items-center bg-[#04090a] text-emerald-300 font-mono text-sm"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (state === 'down') return (
    <div className="min-h-screen grid place-items-center bg-[#04090a] p-6 text-center"><div className="max-w-sm space-y-3"><h1 className="font-serif text-xl font-black text-white">{t('No podemos verificar tu sesión')}</h1><p className="text-sm text-neutral-400">{t('El servicio de cuentas no responde. Tu partida está a salvo; inténtalo de nuevo en un momento.')}</p><button className="care-btn care-btn--gold" onClick={boot}>{t('Reintentar')}</button></div></div>
  );
  if (state === 'anon') return <AuthScreen key={lang} config={config} initialMsg={msg} resetToken={resetToken} onAccount={accept} />;
  return <>{state === 'demo' && <div className="fixed bottom-2 left-2 z-[400] px-2 py-1 rounded bg-amber-400/90 text-neutral-950 text-[10px] font-mono font-bold pointer-events-none">{t('MODO DEMO LOCAL · sin servicio de cuentas')}</div>}{children(account)}</>;
};
