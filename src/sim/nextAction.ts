/**
 * "What should I do now?" for the cultivation scene — the same answer feeds the on-screen pill and Chrono the guide.
 * Priority: nothing planted → ready to harvest → plague → thirst → hunger → a male to remove → thirst elsewhere in the room → wait.
 */
export type NextKind = 'seed' | 'harvest' | 'pest' | 'water' | 'feed' | 'male' | 'room-thirst' | 'wait';

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
  /** human text for the time left to harvest ("2 d 7 h") */
  etaText: string;
}

export interface NextAction { kind: NextKind; label: string; hint: string; actionable: boolean }

export function nextActionFor(i: NextInput): NextAction {
  if (!i.hasPlant) return { kind: 'seed', label: 'Siembra una semilla', hint: 'Tu sala está vacía: elige una semilla del banco.', actionable: true };
  if (i.harvestReady) return { kind: 'harvest', label: 'Cosecha tu planta', hint: 'Ya está lista: cosecharla te da flor y XP.', actionable: true };
  if (i.pest) return { kind: 'pest', label: `Trata la plaga: ${i.pest}`, hint: 'Una plaga baja la salud rápido. Abre Cuidado y aplica un tratamiento.', actionable: true };
  if (i.thirsty) return { kind: 'water', label: 'Riega ahora', hint: 'El sustrato se está secando.', actionable: true };
  if (i.hungry) return { kind: 'feed', label: 'Abona ahora', hint: 'La planta pide nutrientes.', actionable: true };
  if (i.maleWarn) return { kind: 'male', label: 'Quita el macho', hint: 'Un macho poliniza y arruina la flor. Retíralo desde Cuidado.', actionable: true };
  if (i.thirstyOthers > 0) return { kind: 'room-thirst', label: `${i.thirstyOthers} planta${i.thirstyOthers > 1 ? 's' : ''} con sed en la sala`, hint: 'Abre la sala para regarlas todas.', actionable: true };
  return { kind: 'wait', label: `Todo bien · cosecha en ${i.etaText}`, hint: 'Nada urgente. Vuelve en un rato.', actionable: false };
}
