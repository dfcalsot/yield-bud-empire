import React, { useState } from 'react';
import { CalendarClock, Check, ChevronDown, Gift, MessageCircle, ScrollText } from 'lucide-react';
import { useGame } from '../../context/GameContext';
import { CATALOG_BY_ID } from '../../economy/catalog';
import { npcName, type Mood, type NpcKind } from '../npc/Npc';
import { useShopkeeper } from '../npc/shopkeeper';
import { activeStory, claimableCount, errandOf, rewardSummary, storyOf, storyProgress, type MissionReward, type Progress } from '../../sim/missions';
import { t } from '../../i18n';

/**
 * The missions a character hands out: the next story mission (they unlock in order) and today's errand.
 * `onSay` lets the view's character speak — the request when you ask, the thanks when you claim.
 */
export const NpcMissions: React.FC<{ npc: NpcKind; onSay?: (text: string, mood: Mood) => void; className?: string; defaultOpen?: boolean }> = ({ npc, onSay, className = '', defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const { missions, claimStoryMission, claimErrandMission, seedBank } = useGame();
  const story = activeStory(missions, npc);
  const errand = errandOf(missions, npc);
  const line = storyOf(npc);
  const doneCount = line.filter(m => missions.claimed.includes(m.id)).length;
  const ready = claimableCount(missions, npc);
  const [shop] = useShopkeeper();
  const firstName = t(npcName(npc, shop)).split(' · ')[0];
  const rewardLabels = (r: MissionReward) => rewardSummary(r, id => CATALOG_BY_ID[id]?.name ?? id, id => seedBank.find(s => s.id === id)?.name ?? id);

  const say = (text: string | null, mood: Mood = 'happy') => { if (text) onSay?.(text, mood); };

  return (
    <section className={`hud-panel ${open ? 'p-3.5' : 'px-3.5 py-2.5'} ${className}`} aria-label={t('Misiones de {firstName}', { firstName })}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={`flex w-full items-center gap-2 text-left cursor-pointer ${open ? 'mb-2.5' : ''}`}>
        <ScrollText className="w-4 h-4 text-amber-300 shrink-0" aria-hidden />
        <h3 className="text-[13px] font-semibold text-emerald-50 tracking-wide">{t('Misiones de {firstName}', { firstName })}</h3>
        <span className="text-[10.5px] font-mono text-emerald-300/70">{doneCount}/{line.length}</span>
        {!open && !ready && <span className="hidden sm:inline text-[11px] text-neutral-400 truncate">· {story ? story.title : t('historia completada')}{errand && !errand.claimed ? t(' · recado: {title}', { title: errand.def.title }) : ''}</span>}
        {ready > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-400/15 border border-amber-300/50 px-2 py-0.5 text-[10.5px] font-mono text-amber-200 animate-pulse">
            <Gift className="w-3 h-3" aria-hidden />{' '}{t('{ready} por reclamar', { ready })}
          </span>
        )}
        <ChevronDown className={`w-4 h-4 text-neutral-400 transition ${ready > 0 ? '' : 'ml-auto'} ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && <div className="grid gap-2.5 md:grid-cols-2">
        {story ? (
          <MissionRow
            kind="Historia"
            icon={<ScrollText className="w-3.5 h-3.5" aria-hidden />}
            title={t(story.title)}
            text={t(story.ask)}
            progress={storyProgress(missions, story)}
            rewards={rewardLabels(story.reward)}
            onAsk={() => say(story.ask, 'idle')}
            onClaim={() => say(claimStoryMission(story.id))}
          />
        ) : (
          <Finished icon={<Check className="w-4 h-4" aria-hidden />} text={t('Historia completada. ¡Gracias por todo, jefe!')} />
        )}

        {errand && (errand.claimed ? (
          <Finished icon={<CalendarClock className="w-4 h-4" aria-hidden />} text={t('Recado de hoy cumplido. Mañana hay otro.')} />
        ) : (
          <MissionRow
            kind="Recado diario"
            icon={<CalendarClock className="w-3.5 h-3.5" aria-hidden />}
            title={t(errand.def.title)}
            text={t(errand.def.ask)}
            progress={errand.progress}
            rewards={rewardLabels(errand.def.reward)}
            onAsk={() => say(errand.def.ask, 'idle')}
            onClaim={() => say(claimErrandMission(npc))}
          />
        ))}
      </div>}
    </section>
  );
};

const Finished: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="flex items-center gap-2 rounded-lg border border-emerald-500/15 bg-emerald-950/30 px-3 py-2.5 text-[12px] text-emerald-200/70">
    <span className="text-emerald-400">{icon}</span>{text}
  </div>
);

const MissionRow: React.FC<{
  kind: string; icon: React.ReactNode; title: string; text: string; progress: Progress; rewards: string[]; onAsk: () => void; onClaim: () => void;
}> = ({ kind, icon, title, text, progress, rewards, onAsk, onClaim }) => {
  const pct = Math.round((progress.done / progress.goal) * 100);
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${progress.ready ? 'border-amber-300/50 bg-amber-400/[0.06]' : 'border-emerald-500/20 bg-emerald-950/30'}`}>
      <div className="flex items-center gap-1.5 text-[9.5px] font-mono uppercase tracking-[0.16em] text-emerald-300/70">
        {icon}{kind}
        <button type="button" onClick={onAsk} className="ml-auto text-emerald-300/70 hover:text-emerald-100" title={t('Que me lo cuente')} aria-label={t('Escuchar la misión')}>
          <MessageCircle className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="mt-0.5 text-[13px] font-semibold text-emerald-50">{title}</div>
      <p className="text-[11.5px] leading-snug text-emerald-100/70">{text}</p>

      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-emerald-950 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={progress.goal} aria-valuenow={progress.done}>
          <div className={`h-full rounded-full transition-[width] duration-500 ${progress.ready ? 'bg-amber-300' : 'bg-emerald-400'}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11px] font-mono tabular-nums text-emerald-200">{progress.done}/{progress.goal}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {rewards.map(r => (
          <span key={r} className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[10.5px] text-emerald-100">{r}</span>
        ))}
        <button
          type="button"
          disabled={!progress.ready}
          onClick={onClaim}
          className={`ml-auto rounded-md px-3 py-1 text-[11.5px] font-semibold transition ${progress.ready
            ? 'bg-amber-300 text-emerald-950 hover:bg-amber-200 shadow-[0_0_14px_-2px_rgba(252,211,77,.7)]'
            : 'bg-emerald-900/40 text-emerald-400/50 cursor-not-allowed'}`}
        >
          {progress.ready ? t('Reclamar') : t('En curso')}
        </button>
      </div>
    </div>
  );
};
