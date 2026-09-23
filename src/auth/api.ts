import { hasZeroBits, sha256Words } from './sha256';

/** Tiny client for the account service (same origin, cookie session, CSRF header). */
export interface ApiResult<T = any> { status: number; data: T }

export async function api<T = any>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<ApiResult<T>> {
  const r = await fetch(path, {
    method, credentials: 'same-origin',
    headers: { 'x-cf-csrf': '1', ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: any = null;
  try { data = await r.json(); } catch { /* not JSON (proxy error page…) */ }
  return { status: r.status, data };
}

export interface Solution { id: string; salt: string; bits: number; exp: number; sig: string; nonce: number }

/** Ask for a challenge and burn a little CPU to prove the visitor is running a real browser.
 *  Uses up to 3 Web Workers in parallel (one core is left for the page); if workers are blocked or fail, it falls back to
 *  solving on the main thread in small slices so the page stays usable. `signal` cancels the search. */
export async function solveCaptcha(purpose: string, onProgress?: (p: number) => void, signal?: AbortSignal): Promise<Solution> {
  const ch = await api('GET', `/api/auth/challenge?purpose=${encodeURIComponent(purpose)}`);
  if (ch.status !== 200) throw new Error(ch.data?.error ?? 'challenge_failed');
  const { salt, bits } = ch.data;
  let nonce: number;
  try { nonce = await solveWithWorkers(salt, bits, onProgress, signal); }
  catch (e) {
    if (e instanceof Error && e.message === 'cancelled') throw e;
    nonce = await solveInline(salt, bits, onProgress, signal);
  }
  return { ...ch.data, nonce };
}

function solveWithWorkers(salt: string, bits: number, onProgress?: (p: number) => void, signal?: AbortSignal): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const n = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1));
    const workers: Worker[] = [];
    const stop = () => workers.forEach((w) => w.terminate());
    const seen = new Array(n).fill(0);
    let done = false;
    const finish = (fn: () => void) => { if (done) return; done = true; stop(); signal?.removeEventListener('abort', onAbort); fn(); };
    const onAbort = () => finish(() => reject(new Error('cancelled')));
    if (signal?.aborted) return onAbort();
    signal?.addEventListener('abort', onAbort);
    try {
      for (let i = 0; i < n; i++) {
        const w = new Worker(new URL('./pow.worker.ts', import.meta.url), { type: 'module' });
        workers.push(w);
        w.onmessage = (e: MessageEvent<{ nonce?: number; progress?: number }>) => {
          if (e.data.nonce !== undefined) { const v = e.data.nonce; finish(() => { onProgress?.(1); resolve(v); }); }
          else if (e.data.progress !== undefined) { seen[i] = e.data.progress; onProgress?.(Math.max(...seen)); }
        };
        w.onerror = () => finish(() => reject(new Error('worker_failed')));
        w.postMessage({ salt, bits, start: i, step: n });
      }
    } catch { finish(() => reject(new Error('worker_failed'))); }
  });
}

function solveInline(salt: string, bits: number, onProgress?: (p: number) => void, signal?: AbortSignal): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const prefix = new TextEncoder().encode(salt);
    const buf = new Uint8Array(prefix.length + 16);
    buf.set(prefix);
    const out = new Uint32Array(8);
    const expected = 2 ** bits;
    let nonce = 0;
    const slice = () => {
      if (signal?.aborted) return reject(new Error('cancelled'));
      const until = performance.now() + 12;
      while (performance.now() < until) {
        for (let k = 0; k < 2000; k++, nonce++) {
          let len = prefix.length; let x = nonce;
          if (x === 0) buf[len++] = 48; else { const s0 = len; while (x > 0) { buf[len++] = 48 + (x % 10); x = Math.floor(x / 10); } buf.subarray(s0, len).reverse(); }
          sha256Words(buf, len, out);
          if (hasZeroBits(out, bits)) { onProgress?.(1); return resolve(nonce); }
        }
      }
      onProgress?.(Math.min(0.97, nonce / expected));
      setTimeout(slice, 0);
    };
    slice();
  });
}

export const logoutServer = async () => { try { await api('POST', '/api/auth/logout'); } catch { /* offline */ } };

export const ERR: Record<string, string> = {
  captcha_missing: 'Falta la verificación anti-bots.', captcha_invalid: 'La verificación no es válida. Inténtalo de nuevo.', captcha_expired: 'La verificación caducó. Inténtalo de nuevo.',
  captcha_replayed: 'La verificación ya se usó. Inténtalo de nuevo.', captcha_wrong: 'La verificación falló. Inténtalo de nuevo.', captcha_weak: 'La verificación no es suficiente. Recarga la página.',
  terms_required: 'Para crear tu cuenta tenés que confirmar que tenés 18 años o más y aceptar los Términos y la Política de Privacidad (en «Soy nuevo»).',
  invite_required: 'Para crear una cuenta nueva en la alfa (también con Google o X) hace falta un código de invitación: tocá «Soy nuevo» y escribilo.', invite_invalid: 'Ese código de invitación no existe, ya se usó o está vencido.', invite_email_mismatch: 'Ese código es personal: registrate con el mismo correo con el que hiciste el pre-registro (o entrá con Google usando ese correo).',
  email_invalid: 'Ese correo no parece válido.', email_disposable: 'No aceptamos correos temporales o desechables.', email_domain: 'Ese dominio de correo no puede recibir mensajes.',
  username_invalid: 'Usuario de 3 a 20 caracteres: letras, números, espacios y . _ -', username_reserved: 'Ese nombre está reservado.', username_taken: 'Ese usuario ya existe (o se parece demasiado a uno existente).',
  ip_account_limit: 'Ya se crearon varias cuentas desde tu red. Inténtalo más tarde o entra con la que ya tienes.', rate_limited: 'Demasiados intentos. Espera un momento y vuelve a probar.',
  busy: 'Estamos recibiendo muchas altas ahora mismo. Reintenta en un minuto.', bad_credentials: 'Usuario o contraseña incorrectos.', account_locked: 'Cuenta bloqueada un rato por intentos fallidos. Espera unos minutos.',
  token_invalid: 'El enlace no es válido, caducó o ya se usó.', provider_not_configured: 'Este método aún no está activado en el servidor.', x_account_too_new: 'Tu cuenta de X es demasiado reciente (mínimo 60 días).',
  x_account_too_small: 'Tu cuenta de X no cumple el mínimo de actividad.', email_not_verified: 'Google no confirmó tu correo.', state_invalid: 'El inicio de sesión caducó. Inténtalo de nuevo.', denied: 'Cancelaste el inicio de sesión.',
  provider_error: 'El proveedor no respondió. Inténtalo de nuevo.', token_exchange: 'No pudimos completar el inicio de sesión con el proveedor.', profile: 'No pudimos leer tu perfil del proveedor.', signup_race: 'No se pudo crear la cuenta. Inténtalo de nuevo.',
  cancelled: 'Verificación cancelada.', challenge_failed: 'No se pudo pedir la verificación al servidor. Revisa tu conexión e inténtalo de nuevo.', server_error: 'Error del servidor. Inténtalo de nuevo en un momento.', bad_request: 'Revisa los datos.', csrf: 'Petición rechazada por seguridad. Recarga la página.', bad_origin: 'Petición rechazada por seguridad. Recarga la página.',
};
export const errText = (d: any): string => (d?.error === 'password_weak' && d.message) || ERR[d?.error] || 'No se pudo completar la operación.';
