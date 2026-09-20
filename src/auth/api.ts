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

/** Ask for a challenge and burn a little CPU (in a Web Worker) to prove the visitor is running a real browser. */
export async function solveCaptcha(purpose: string, onProgress?: (p: number) => void): Promise<Solution> {
  const ch = await api('GET', `/api/auth/challenge?purpose=${encodeURIComponent(purpose)}`);
  if (ch.status !== 200) throw new Error(ch.data?.error ?? 'challenge_failed');
  const { salt, bits } = ch.data;
  return new Promise<Solution>((resolve, reject) => {
    const w = new Worker(new URL('./pow.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<{ nonce?: number; progress?: number }>) => {
      if (e.data.nonce !== undefined) { w.terminate(); onProgress?.(1); resolve({ ...ch.data, nonce: e.data.nonce }); }
      else if (e.data.progress !== undefined) onProgress?.(e.data.progress);
    };
    w.onerror = () => { w.terminate(); reject(new Error('worker_failed')); };
    w.postMessage({ salt, bits });
  });
}

export const logoutServer = async () => { try { await api('POST', '/api/auth/logout'); } catch { /* offline */ } };

export const ERR: Record<string, string> = {
  captcha_missing: 'Falta la verificación anti-bots.', captcha_invalid: 'La verificación no es válida. Inténtalo de nuevo.', captcha_expired: 'La verificación caducó. Inténtalo de nuevo.',
  captcha_replayed: 'La verificación ya se usó. Inténtalo de nuevo.', captcha_wrong: 'La verificación falló. Inténtalo de nuevo.', captcha_weak: 'La verificación no es suficiente. Recarga la página.',
  email_invalid: 'Ese correo no parece válido.', email_disposable: 'No aceptamos correos temporales o desechables.', email_domain: 'Ese dominio de correo no puede recibir mensajes.',
  username_invalid: 'Usuario de 3 a 20 caracteres: letras, números, espacios y . _ -', username_reserved: 'Ese nombre está reservado.', username_taken: 'Ese usuario ya existe (o se parece demasiado a uno existente).',
  ip_account_limit: 'Ya se crearon varias cuentas desde tu red. Inténtalo más tarde o entra con la que ya tienes.', rate_limited: 'Demasiados intentos. Espera un momento y vuelve a probar.',
  busy: 'Estamos recibiendo muchas altas ahora mismo. Reintenta en un minuto.', bad_credentials: 'Usuario o contraseña incorrectos.', account_locked: 'Cuenta bloqueada un rato por intentos fallidos. Espera unos minutos.',
  token_invalid: 'El enlace no es válido, caducó o ya se usó.', provider_not_configured: 'Este método aún no está activado en el servidor.', x_account_too_new: 'Tu cuenta de X es demasiado reciente (mínimo 60 días).',
  x_account_too_small: 'Tu cuenta de X no cumple el mínimo de actividad.', email_not_verified: 'Google no confirmó tu correo.', state_invalid: 'El inicio de sesión caducó. Inténtalo de nuevo.', denied: 'Cancelaste el inicio de sesión.',
  provider_error: 'El proveedor no respondió. Inténtalo de nuevo.', token_exchange: 'No pudimos completar el inicio de sesión con el proveedor.', profile: 'No pudimos leer tu perfil del proveedor.', signup_race: 'No se pudo crear la cuenta. Inténtalo de nuevo.',
  server_error: 'Error del servidor. Inténtalo de nuevo en un momento.', bad_request: 'Revisa los datos.', csrf: 'Petición rechazada por seguridad. Recarga la página.', bad_origin: 'Petición rechazada por seguridad. Recarga la página.',
};
export const errText = (d: any): string => (d?.error === 'password_weak' && d.message) || ERR[d?.error] || 'No se pudo completar la operación.';
