/**
 * What the game tells the operators' panel about itself (server/panel.mjs → /api/telemetry): its own errors, how long the first
 * load took and which screen is open. Nothing is sent unless the server says telemetry is on (/api/auth/config), and never
 * anything the player typed. Events wait in a small queue and go out in one request every 15 s, or when the tab is hidden.
 */
type Ev = { kind: 'error' | 'view' | 'perf'; name: string; detail?: string; ms?: number };

let enabled = false;
let queue: Ev[] = [];
const seen = new Set<string>();   // one report per distinct error per visit

function device(): string {
  const ua = navigator.userAgent;
  const kind = /Mobi|Android|iPhone|iPod/i.test(ua) ? 'celular' : /iPad|Tablet/i.test(ua) ? 'tablet' : 'computadora';
  const os = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : 'otro';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'otro';
  return `${kind} ${os} ${br}`;
}

function flush() {
  if (!enabled || !queue.length) return;
  const events = queue.splice(0, 20);
  void fetch('/api/telemetry', {
    method: 'POST', credentials: 'same-origin', keepalive: true,
    headers: { 'content-type': 'application/json', 'x-cf-csrf': '1' },
    body: JSON.stringify({ events, device: device(), build: __BUILD__ }),
  }).catch(() => { /* telemetry never bothers the player */ });
}

function push(e: Ev) {
  if (queue.length < 60) queue.push(e);
}

/** an error of the game (from window.onerror, an unhandled promise or the error screen) */
export function reportError(err: unknown, where = '') {
  const e = err instanceof Error ? err : new Error(String((err as { reason?: unknown })?.reason ?? err));
  const name = `${e.name}: ${e.message}`.slice(0, 160);
  if (seen.has(name)) return;
  seen.add(name);
  const stack = (e.stack ?? '').split('\n').slice(1, 4).map((l) => l.trim().replace(/https?:\/\/[^/]+/, '')).join(' | ');
  push({ kind: 'error', name, detail: `${where}${where && stack ? ' · ' : ''}${stack}`.slice(0, 600) });
}

/** the screen the player opened (App calls it on every tab change) */
export function reportView(tab: string) { push({ kind: 'view', name: tab }); }

export function initTelemetry() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (e) => reportError(e.error ?? e.message, 'window'));
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason, 'promise'));
  void fetch('/api/auth/config', { credentials: 'same-origin' }).then((r) => r.json()).then((c) => {
    enabled = !!c?.telemetry;
    if (!enabled) { queue = []; return; }
    // how long the first load took (navigation start → page loaded)
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const ms = nav ? nav.loadEventEnd || nav.domContentLoadedEventEnd : performance.now();
    push({ kind: 'perf', name: 'load', ms });
    window.setInterval(flush, 15_000);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
    flush();
  }).catch(() => { /* no telemetry */ });
}
