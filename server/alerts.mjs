// Alerts to the operators' Telegram chat: what matters right away, without having the panel open. Off unless TELEGRAM_BOT_TOKEN
// and TELEGRAM_CHAT_ID are set. Each kind of alert has a cooldown, and at most 30 messages go out per hour, so a burst never
// floods the chat. That the server is DOWN can't be told from here: ops/watchdog.mjs (a container of its own) does that.
const HOUR = 3600_000;

export function createAlerts({ db, env = process.env, fetchImpl = globalThis.fetch }) {
  const token = env.TELEGRAM_BOT_TOKEN ?? '', chat = env.TELEGRAM_CHAT_ID ?? '';
  const on = !!(token && chat);
  const lastSent = new Map();   // kind → ts
  let sentThisHour = [];
  const nameOf = (id) => { try { return id ? db.prepare('SELECT username FROM accounts WHERE id = ?').get(id)?.username ?? `#${id}` : ''; } catch { return `#${id}`; } };

  /** send `text` unless the same `kind` was sent less than `cooldown` ms ago */
  async function send(kind, text, cooldown = 0) {
    if (!on) return false;
    const now = Date.now();
    if (cooldown && now - (lastSent.get(kind) ?? 0) < cooldown) return false;
    sentThisHour = sentThisHour.filter((t) => now - t < HOUR);
    if (sentThisHour.length >= 30) return false;
    lastSent.set(kind, now); sentThisHour.push(now);
    try {
      await fetchImpl(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text: `🌿 YBE · ${text}`, disable_web_page_preview: true }),
      });
      return true;
    } catch { return false; }
  }

  /** called for every audit event (server/index.mjs): the ones worth a message */
  function onAudit(event, accountId, detail = '') {
    if (!on) return;
    const who = nameOf(accountId);
    if (event === 'signup' || event === 'signup_google') {
      const n = (() => { try { return db.prepare("SELECT COUNT(*) AS n FROM accounts WHERE flags NOT LIKE '%dev,%'").get().n; } catch { return '?'; } })();
      void send(`signup:${accountId}`, `🆕 Jugador nuevo: ${who}${event === 'signup_google' ? ' (Google)' : ''} · ya son ${n} cuentas reales`);
    } else if (event === 'founder_delivered') void send(`founder:${detail}`, `👑 Pack de Fundador vendido a ${who} · ${detail}`);
    else if (event === 'founder_underpaid' || event === 'founder_refund_needed') void send(`founder:${detail}`, `⚠️ Pago del Pack de Fundador para revisar (${event.replace('founder_', '')}) · ${who} · ${detail}`);
    else if (event === 'bridge_out_failed') void send('bridge_fail', `⚠️ Falló un envío de reliquia a Solana · ${who} · ${detail}`, HOUR / 2);
    else if (event === 'bot_signal' || event === 'flag_multi_ip' || event === 'ip_cap' || event === 'prereg_bot') void send(`sec:${event}`, `🚩 Seguridad: ${({ bot_signal: 'señal de bot en un registro', flag_multi_ip: `varias cuentas desde la misma red (${who})`, ip_cap: 'límite de cuentas por red alcanzado', prereg_bot: 'bot en el pre-registro' })[event]}${detail ? ` · ${detail}` : ''}`, HOUR / 2);
  }

  return { on, send, onAudit };
}
