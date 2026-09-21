import type { MissionEvent, MissionReward, MissionState } from './missions';

/**
 * Chrono's tutorial: a short chain of steps that teaches a new player how to move and what to do first.
 * Progress reuses the mission event counters (`reportEvent`), and a step only counts what happens AFTER it becomes the
 * current one (a `base` snapshot), so nothing is retroactive. Every step can be skipped, and the slow one (harvest) is
 * last and optional: growing takes real time, and the tutorial must never block the player.
 * Pure: the context owns the state and grants the rewards.
 */
export interface TutorialStep {
  id: string;
  title: string;
  /** what Chrono says */
  say: string;
  /** short chip under the title */
  hint: string;
  event: MissionEvent;
  goal: number;
  /** the tab where the action happens (Chrono points at the dock / sub-tab to get there); 'any' = not tied to a place */
  tab: string;
  /** data-tour anchor to highlight once the player is in the right tab */
  tour?: string;
  reward: MissionReward;
  thanks: string;
}

export const STEPS: TutorialStep[] = [
  { id: 'move', title: 'Muévete por el mundo', event: 'visit', goal: 1, tab: 'any', tour: 'dock', say: 'El dock de abajo te lleva a cada zona del juego. Toca cualquier icono para viajar.', hint: 'Toca un icono del dock',
    reward: { lots: [{ id: 'water_50' }], xp: 20 }, thanks: '¡Así se viaja! Aquí tienes agua para empezar.' },
  { id: 'bag', title: 'Tu maletín', event: 'openbag', goal: 1, tab: 'any', tour: 'bag', say: 'Todo lo que tienes vive en tu maletín: recursos, equipo, semillas y cosecha. Ábrelo con este botón o con la tecla I.', hint: 'Abre el maletín (tecla I)',
    reward: { lots: [{ id: 'nut_biobizz' }], xp: 25 }, thanks: 'Ahora sabes dónde está todo. Un poco de abono de regalo.' },
  { id: 'water', title: 'Riega tu planta', event: 'water', goal: 1, tab: 'cultivo', tour: 'water', say: 'Las plantas beben agua. Toca «Regar» en la barra de abajo (tecla 1) o toca la maceta de la planta.', hint: 'Toca «Regar»',
    reward: { xp: 30 }, thanks: '¡Bien regada! El sustrato ya respira.' },
  { id: 'feed', title: 'Dale de comer', event: 'feed', goal: 1, tab: 'cultivo', tour: 'feed', say: 'Además de agua necesita nutrientes. Toca el frasco para abonar.', hint: 'Toca «Abonar»',
    reward: { xp: 30 }, thanks: 'Plantita feliz y alimentada.' },
  { id: 'gauges', title: 'Lee el panel', event: 'gauges', goal: 1, tab: 'cultivo', tour: 'gauges', say: 'Estos medidores cuentan cómo está tu sala: clima, raíz y luz. Toca un grupo para ver el detalle; si algo se pone amarillo, te digo qué falla.', hint: 'Abre un grupo de medidores',
    reward: { lots: [{ id: 'energy_20' }], xp: 30 }, thanks: 'Ya sabes leer tu cuarto. Unos kWh para la luz.' },
  { id: 'process', title: 'Procesa tu flor', event: 'lab', goal: 1, tab: 'extraccion', say: 'La flor seca vale más procesada. Ve a Laboratorio → Extracción, elige una estación y corre un ciclo.', hint: 'Corre un ciclo en Extracción',
    reward: { lots: [{ id: 'energy_20' }], xp: 60 }, thanks: '¡Primer extracto! Eso sí es industria.' },
  { id: 'sell', title: 'Vende un lote', event: 'sell', goal: 1, tab: 'dispensario', say: 'Los lotes se venden en el dispensario: Mercado → Dispensario. Marta te atiende.', hint: 'Vende un lote',
    reward: { xp: 50 }, thanks: 'Primera venta hecha. Así se empieza un imperio.' },
  { id: 'buy', title: 'Compra suministros', event: 'buy', goal: 1, tab: 'market', say: 'Para seguir cultivando necesitas insumos. En Mercado → Grow Market compra lo que te falte.', hint: 'Compra algo en el Grow Market',
    reward: { lots: [{ id: 'pest_neem' }], xp: 40 }, thanks: 'Buena compra. Un neem para las plagas, cortesía de la casa.' },
  { id: 'planet', title: 'Conoce el Planeta', event: 'planet', goal: 1, tab: 'planeta', say: 'Más allá de tu sala hay siete regiones con parcelas NFT. Entra a Cultivo → Planeta y échales un vistazo.', hint: 'Abre el Planeta',
    reward: { xp: 40 }, thanks: 'El mundo es grande. Ya lo explorarás.' },
  { id: 'harvest', title: 'Tu primera cosecha', event: 'harvest', goal: 1, tab: 'cultivo', say: 'Cuando tu planta esté lista, cosecha. Crece en tiempo real: puedes esperar o acelerar el ciclo quemando $FLORA. Este paso es opcional, ¡vuelve cuando quieras!', hint: 'Cosecha una planta',
    reward: { seeds: { seed_gelato_auto: 1 }, lots: [{ id: 'energy_20' }], xp: 150 }, thanks: '¡Cosechaste! Ya eres oficialmente cultivador de Yield Bud Empire.' },
];

export interface TutorialState {
  started: boolean;
  /** the player closed the guide for good (can be reopened from the profile) */
  dismissed: boolean;
  minimized: boolean;
  /** index of the current step (STEPS.length = finished) */
  index: number;
  /** counter value of each step's event when it became current */
  base: Record<string, number>;
  claimed: string[];
}

export const emptyTutorial = (): TutorialState => ({ started: false, dismissed: false, minimized: false, index: 0, base: {}, claimed: [] });

export function normalizeTutorial(raw: unknown): TutorialState {
  const r = (raw ?? {}) as Partial<TutorialState>;
  const index = typeof r.index === 'number' && r.index >= 0 ? Math.min(r.index, STEPS.length) : 0;
  return {
    started: !!r.started, dismissed: !!r.dismissed, minimized: !!r.minimized, index,
    base: r.base && typeof r.base === 'object' ? r.base : {},
    claimed: Array.isArray(r.claimed) ? r.claimed.filter((x) => typeof x === 'string') : [],
  };
}

const count = (m: MissionState, ev: MissionEvent) => m.counters[ev] ?? 0;
export const currentStep = (s: TutorialState): TutorialStep | null => STEPS[s.index] ?? null;
export const isFinished = (s: TutorialState): boolean => s.index >= STEPS.length;

export interface StepProgress { step: TutorialStep; done: number; goal: number; ready: boolean }

export function stepProgress(s: TutorialState, m: MissionState): StepProgress | null {
  const step = currentStep(s);
  if (!step) return null;
  const done = Math.max(0, Math.min(step.goal, count(m, step.event) - (s.base[step.id] ?? 0)));
  return { step, done, goal: step.goal, ready: done >= step.goal };
}

const withBase = (s: TutorialState, m: MissionState, index: number): TutorialState => {
  const next = STEPS[index];
  return { ...s, index, base: next ? { ...s.base, [next.id]: count(m, next.event) } : s.base };
};

export function startTutorial(s: TutorialState, m: MissionState): TutorialState {
  return withBase({ ...s, started: true, dismissed: false, minimized: false, claimed: [] }, m, 0);
}

export interface TutorialClaim { state: TutorialState; reward: MissionReward; say: string; title: string }

export function claimStep(s: TutorialState, m: MissionState): TutorialClaim | null {
  const p = stepProgress(s, m);
  if (!p || !p.ready || s.claimed.includes(p.step.id)) return null;
  const next = withBase({ ...s, claimed: [...s.claimed, p.step.id] }, m, s.index + 1);
  return { state: next, reward: p.step.reward, say: p.step.thanks, title: p.step.title };
}

/** Skipping gives no reward and never blocks the next step. */
export function skipStep(s: TutorialState, m: MissionState): TutorialState {
  return currentStep(s) ? withBase(s, m, s.index + 1) : s;
}
