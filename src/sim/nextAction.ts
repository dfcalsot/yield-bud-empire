
import { t } from '../i18n/core';/**
 * "What should I do now?" for the cultivation scene — the same answer feeds the on-screen pill and Chrono the guide.
 * Priority: nothing planted → ready to harvest → plague → thirst → hunger → a male to remove → thirst elsewhere in the room → wait.
 */
export type NextKind = 'seed' | 'harvest' | 'pest' | 'water' | 'feed' | 'male' | 'room' | 'room-thirst' | 'wait';

export interface NextInput {
  hasPlant: boolean;
  harvestReady: boolean;
  /** label of the plague on the selected plant, if any */
  pest?: string | null;
  thirsty: boolean;
  hungry: boolean;
  maleWarn: boolean;
  /** thirsty plants in the room other than the selected one */
  thirstyOthers: number;
  /** the name of the room the selected plant's phase wants, when it is in another one */
  wrongRoom?: string | null;
  /** human text for the time left to harvest ("2 d 7 h") */
  etaText: string;
}

export interface NextAction { kind: NextKind; label: string; hint: string; actionable: boolean }

export function nextActionFor(i: NextInput): NextAction {
  if (!i.hasPlant) return { kind: 'seed', label: t('Siembra una semilla'), hint: t('Tu sala está vacía: elige una semilla del banco.'), actionable: true };
  if (i.harvestReady) return { kind: 'harvest', label: t('Cosecha tu planta'), hint: t('Ya está lista: cosecharla te da flor y XP.'), actionable: true };
  if (i.pest) return { kind: 'pest', label: t('Trata la plaga: {pest}', { pest: i.pest }), hint: t('Una plaga baja la salud rápido. Abre Cuidado y aplica un tratamiento.'), actionable: true };
  if (i.thirsty) return { kind: 'water', label: t('Riega ahora'), hint: t('El sustrato se está secando.'), actionable: true };
  if (i.hungry) return { kind: 'feed', label: t('Abona ahora'), hint: t('La planta pide nutrientes.'), actionable: true };
  if (i.maleWarn) return { kind: 'male', label: t('Quita el macho'), hint: t('Un macho poliniza y arruina la flor. Retíralo desde Cuidado.'), actionable: true };
  if (i.wrongRoom) return { kind: 'room', label: t('Muévela a «{room}»', { room: i.wrongRoom }), hint: t('Esta fase crece mejor en ese cuarto: en el actual va más lenta.'), actionable: true };
  if (i.thirstyOthers > 0) return { kind: 'room-thirst', label: t('{thirstyOthers} planta{v1} con sed en la sala', { thirstyOthers: i.thirstyOthers, v1: i.thirstyOthers > 1 ? 's' : '' }), hint: t('Abre la sala para regarlas todas.'), actionable: true };
  return { kind: 'wait', label: t('Todo bien · cosecha en {etaText}', { etaText: i.etaText }), hint: t('Nada urgente. Vuelve en un rato.'), actionable: false };
}
