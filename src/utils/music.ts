import { useEffect, useState } from 'react';

/**
 * Music and ambience. Two layers on top of the sound effects (utils/audio.ts):
 *  - music: a playlist that plays in turn, each track fading into the next (public/audio/music-*.mp3);
 *  - ambience: one loop per zone of the game (grow room, plots, lab, shop), cross-fading when the player changes zone
 *    (public/audio/amb-*.mp3, made by scripts/gen-ambience.mjs).
 * Off until the player turns them on (browsers only allow sound after a click anyway). The volumes are kept per device.
 * Nothing is downloaded until a layer is turned on, and everything pauses while the tab is hidden.
 */
export type Zone = 'indoor' | 'outdoor' | 'lab' | 'shop' | null;
export interface AudioPrefs { music: number; ambience: number }

const KEY = 'ybe_audio';
const EVENT = 'ybe:audio';
const PLAYLIST = ['/audio/music-main.mp3', '/audio/music-empire.mp3'];
const FADE = 1.8;   // seconds

const readPrefs = (): AudioPrefs => {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? 'null'); if (v && typeof v.music === 'number' && typeof v.ambience === 'number') return { music: clamp(v.music), ambience: clamp(v.ambience) }; } catch { /* no storage */ }
  return { music: 0, ambience: 0 };
};
const clamp = (x: number) => Math.max(0, Math.min(1, x));
let prefs: AudioPrefs = typeof window === 'undefined' ? { music: 0, ambience: 0 } : readPrefs();
let zone: Zone = null;

/* ── fades: each element eases toward its target volume on one shared timer ── */
const targets = new Map<HTMLAudioElement, number>();
let fadeTimer = 0;
function fadeTo(el: HTMLAudioElement, v: number) {
  targets.set(el, clamp(v));
  if (v > 0 && el.paused) { void el.play().catch(() => { /* not allowed before a click: it starts on the next one */ }); }
  if (!fadeTimer) fadeTimer = window.setInterval(stepFades, 50);
}
function stepFades() {
  let busy = false;
  for (const [el, t] of targets) {
    const d = t - el.volume, step = 0.05 / FADE;
    if (Math.abs(d) <= step) { el.volume = t; targets.delete(el); if (t === 0) el.pause(); }
    else { el.volume = clamp(el.volume + Math.sign(d) * step); busy = true; }
  }
  if (!busy && targets.size === 0) { window.clearInterval(fadeTimer); fadeTimer = 0; }
}
const make = (src: string, loop: boolean) => { const a = new Audio(); a.src = src; a.loop = loop; a.preload = 'auto'; a.volume = 0; return a; };

/* ── music: two decks, the next track fades in as the current one ends ── */
let decks: HTMLAudioElement[] = [];
let track = 0;
function musicDeck(i: number) {
  if (!decks[i]) {
    decks[i] = make(PLAYLIST[i % PLAYLIST.length], false);
    decks[i].addEventListener('timeupdate', () => {
      const a = decks[i];
      if (prefs.music > 0 && track === i && a.duration && a.currentTime > a.duration - FADE - 0.3) nextTrack();
    });
  }
  return decks[i];
}
function nextTrack() {
  const cur = musicDeck(track);
  fadeTo(cur, 0);
  track = (track + 1) % PLAYLIST.length;
  const nx = musicDeck(track); nx.currentTime = 0; fadeTo(nx, prefs.music);
}
function applyMusic() {
  if (prefs.music > 0) fadeTo(musicDeck(track), prefs.music);
  else decks.forEach((d) => d && fadeTo(d, 0));
}

/* ── ambience: one loop per zone ── */
const amb = new Map<string, HTMLAudioElement>();
function applyAmbience() {
  for (const [z, el] of amb) if (z !== zone || prefs.ambience === 0) fadeTo(el, 0);
  if (!zone || prefs.ambience === 0) return;
  let el = amb.get(zone);
  if (!el) { el = make(`/audio/amb-${zone}.mp3?v=2`, true); amb.set(zone, el); }
  fadeTo(el, prefs.ambience * (prefs.music > 0 ? 0.45 : 0.7));   // a bed under the music: quieter while music plays, so they don't blur
}

/** the zone the player is looking at (App calls it on every tab change) */
export function setZone(z: Zone) { if (z === zone) return; zone = z; applyAmbience(); }
export function setAudioPrefs(next: Partial<AudioPrefs>) {
  prefs = { music: clamp(next.music ?? prefs.music), ambience: clamp(next.ambience ?? prefs.ambience) };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* private mode */ }
  applyMusic(); applyAmbience();
  window.dispatchEvent(new Event(EVENT));
}
export function useAudioPrefs(): AudioPrefs {
  const [p, setP] = useState(prefs);
  useEffect(() => { const f = () => setP(prefs); window.addEventListener(EVENT, f); return () => window.removeEventListener(EVENT, f); }, []);
  return p;
}

if (typeof window !== 'undefined') {
  // hidden tab: everything pauses; back: it resumes where it was
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { decks.forEach((d) => d?.pause()); amb.forEach((a) => a.pause()); }
    else { applyMusic(); applyAmbience(); }
  });
  // saved volumes from a previous visit start with the first click (browsers need one)
  const kick = () => { applyMusic(); applyAmbience(); window.removeEventListener('pointerdown', kick); };
  window.addEventListener('pointerdown', kick);
}

/** which ambience goes with each tab of the game */
export const ZONE_OF_TAB: Record<string, Zone> = {
  cultivo: 'indoor', planeta: 'outdoor', nutrientes: 'lab', extraccion: 'lab', forja: 'lab', cria: 'lab', genetica: 'lab', semillas: 'lab',
  market: 'shop', dispensario: 'shop',
};
