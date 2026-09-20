import React, { useMemo, useState } from 'react';
import { DatabaseBackup } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { listLocalSaves, type LocalSaveSummary } from '../../utils/auth';

const when = (ms: number) => (ms ? new Date(ms).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }) : 'sin fecha');

const useLocalSaves = () => {
  const { currentUser } = useGame();
  const [n, setN] = useState(0);
  const saves = useMemo(() => (currentUser ? listLocalSaves(currentUser.id) : []), [currentUser, n]); // eslint-disable-line react-hooks/exhaustive-deps
  return { saves, refresh: () => setN((v) => v + 1) };
};

const Row: React.FC<{ s: LocalSaveSummary; onPick: () => void }> = ({ s, onPick }) => (
  <div className="mk-panel flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5">
    <div className="min-w-[10rem] flex-1">
      <div className="font-serif text-white text-sm font-bold">{s.name}</div>
      <div className="text-[10px] font-mono text-neutral-500">guardada {when(s.savedAt)}</div>
    </div>
    <div className="flex flex-wrap gap-2 text-[11px] font-mono text-neutral-300">
      <span>🗺️ <b className="text-amber-300">{s.plots}</b> parcelas</span>
      <span>🌱 <b className="text-emerald-300">{s.plants}</b> plantas</span>
      <span>🪙 <b className="text-amber-200">{s.flora.toLocaleString('es')}</b> $FLORA</span>
      <span>⭐ nivel <b className="text-sky-300">{s.level}</b></span>
    </div>
    <button className="care-btn care-btn--gold" onClick={onPick}>Traer a esta cuenta</button>
  </div>
);

/** Perfil: lista las partidas guardadas en este navegador y permite traerlas a la cuenta activa. */
export const LocalSavesPanel: React.FC = () => {
  const { importLocalSave, plots, playerLevel } = useGame();
  const { saves, refresh } = useLocalSaves();
  if (saves.length === 0) return null;
  const hasProgress = plots.length > 0 || playerLevel > 1;
  const pick = (s: LocalSaveSummary) => {
    if (hasProgress && !window.confirm(`Esto REEMPLAZA el progreso actual de esta cuenta por la partida «${s.name}». ¿Continuar?`)) return;
    if (importLocalSave(s.id)) refresh();
  };
  return (
    <section className="hud-panel p-4 sm:p-5 space-y-3" aria-label="Partidas guardadas en este navegador">
      <div className="flex items-center gap-2 text-white font-serif font-bold"><DatabaseBackup className="w-4 h-4 text-amber-300" /> Partidas guardadas en este navegador</div>
      <p className="text-[11.5px] text-neutral-400 leading-relaxed">
        El juego guarda tu progreso en este navegador, separado por perfil. Estas partidas no pertenecen a la cuenta con la que entraste; puedes traer una aquí
        (la original queda como respaldo).
      </p>
      <div className="space-y-2">{saves.map((s) => <Row key={s.id} s={s} onPick={() => pick(s)} />)}</div>
    </section>
  );
};

/** Aviso al entrar con una cuenta vacía cuando hay una partida con progreso guardada en el navegador. */
export const LocalSavesBanner: React.FC<{ onOpenProfile: () => void }> = ({ onOpenProfile }) => {
  const { currentUser, importLocalSave, plots, playerLevel } = useGame();
  const { saves, refresh } = useLocalSaves();
  const key = `cf_ls_dismiss_${currentUser?.id ?? ''}`;
  const [gone, setGone] = useState(() => { try { return localStorage.getItem(key) === '1'; } catch { return false; } });
  const fresh = plots.length === 0 && playerLevel <= 1;
  if (gone || !fresh || saves.length === 0) return null;
  const best = saves[0];
  return (
    <div role="status" className="mk-panel flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border border-amber-400/40">
      <DatabaseBackup className="w-5 h-5 text-amber-300 shrink-0" />
      <div className="flex-1 min-w-[14rem] text-[12px] text-neutral-200 leading-snug">
        Encontramos una partida guardada en este navegador: <b className="text-white">{best.name}</b> — {best.plots} parcela(s), {best.plants} planta(s), {best.flora.toLocaleString('es')} $FLORA, nivel {best.level}.
        {saves.length > 1 && <span className="text-neutral-400"> (y {saves.length - 1} más en tu Perfil)</span>}
      </div>
      <button className="care-btn care-btn--gold" onClick={() => { if (importLocalSave(best.id)) refresh(); }}>Recuperarla</button>
      {saves.length > 1 && <button className="care-btn" onClick={onOpenProfile}>Ver todas</button>}
      <button className="care-btn" onClick={() => { try { localStorage.setItem(key, '1'); } catch { /* ignore */ } setGone(true); }}>Ahora no</button>
    </div>
  );
};
