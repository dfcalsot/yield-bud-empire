import type { GrowStage, PlantInGrow } from '../../types';
import { formatDuration, hoursUntilMoisture, isThirsty, PEST_INFO } from '../../sim/engine';
import { t, k } from '../../i18n';

export const STAGE_LABEL: Record<GrowStage, string> = { seed: k('Germinación'), seedling: k('Plántula'), vegetative: k('Vegetativo'), flowering: k('Floración'), maturation: k('Maduración'), ready_harvest: k('Lista para cosecha') };
export const STAGE_DOT: Record<GrowStage, string> = { seed: '#a3e635', seedling: '#a3e635', vegetative: '#34d399', flowering: '#c084fc', maturation: '#f0abfc', ready_harvest: '#fbbf24' };

/** the plant's clocks and warnings, as short lines for its card */
export function plantClocks(p: PlantInGrow, eta: number): Array<{ icon: string; text: string; warn?: boolean }> {
  const nextWaterH = hoursUntilMoisture(p, 40);
  const thirsty = isThirsty(p);
  return [
    { icon: '⏱', text: p.stage === 'ready_harvest' ? t('¡Lista para cosechar!') : isFinite(eta) ? t('Cosecha en {v0}', { v0: formatDuration(eta) }) : t('Crecimiento en pausa'), warn: !isFinite(eta) && p.stage !== 'ready_harvest' },
    { icon: '💧', text: p.stage === 'ready_harvest' ? t('Sin riego pendiente') : thirsty ? t('¡Necesita agua ya!') : t('Regar en ~{v0}', { v0: formatDuration(nextWaterH * 3600) }), warn: thirsty },
    ...(p.sex === 'male' && p.progressPercent >= 30 ? [{ icon: '♂', text: t('Macho: quítalo en Cuidado'), warn: true }] : []),
    ...(p.pollinated ? [{ icon: '🐝', text: t('Polinizada · dará semillas'), warn: false }] : []),
    ...(p.pest ? [{ icon: PEST_INFO[p.pest.kind].emoji, text: `${PEST_INFO[p.pest.kind].label} · ${Math.max(1, Math.round(p.pest.hours))} h`, warn: true }] : []),
  ];
}
