/**
 * The game used to keep each player's save in this browser (localStorage). Everything lives on the server now (server/game.mjs):
 * the first time the new game opens, whatever the old version left here is removed.
 */
const OLD_KEYS = /^(chronoflora_all_users_v2|chronoflora_current_user_id_v2|chronoflora_userdata_v2_|cf_ls_dismiss_)/;

export function clearOldLocalGame(): void {
  try {
    const gone: string[] = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && OLD_KEYS.test(k)) gone.push(k); }
    gone.forEach((k) => localStorage.removeItem(k));
  } catch { /* storage unavailable */ }
}
