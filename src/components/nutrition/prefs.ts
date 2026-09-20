import { useCallback, useEffect, useState } from 'react';
import type { AcidId, MediumId, StageId, WaterId } from '../../sim/nutrition';
import type { EcUnit } from './art';

export interface SavedRecipe { id: string; name: string; water: WaterId; medium: MediumId; stage: StageId; doses: Record<string, number>; score: number; savedAt: number }
export interface NutriPrefs {
  water: WaterId; medium: MediumId; liters: number; ecUnit: EcUnit; acid: AcidId;
  recipes: SavedRecipe[]; challengesDone: string[]; quizDone: string[]; quizBest: number;
}
const DEFAULTS: NutriPrefs = { water: 'soft', medium: 'soil', liters: 10, ecUnit: 'ec', acid: 'acid_nitric', recipes: [], challengesDone: [], quizDone: [], quizBest: 0 };

const read = (key: string): NutriPrefs => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw);
    return { ...DEFAULTS, ...p, recipes: Array.isArray(p.recipes) ? p.recipes.slice(0, 20) : [], challengesDone: Array.isArray(p.challengesDone) ? p.challengesDone : [], quizDone: Array.isArray(p.quizDone) ? p.quizDone : [] };
  } catch { return DEFAULTS; }
};

/** Ajustes del laboratorio de nutrición por cuenta (agua, medio, recetas guardadas, retos y preguntas superadas). */
export function useNutriPrefs(userId: string | undefined): [NutriPrefs, (patch: Partial<NutriPrefs> | ((p: NutriPrefs) => Partial<NutriPrefs>)) => void] {
  const key = `cf_nutri_v1_${userId ?? 'anon'}`;
  const [prefs, setPrefs] = useState<NutriPrefs>(() => read(key));
  useEffect(() => { setPrefs(read(key)); }, [key]);
  const update = useCallback((patch: Partial<NutriPrefs> | ((p: NutriPrefs) => Partial<NutriPrefs>)) => {
    setPrefs((cur) => {
      const next = { ...cur, ...(typeof patch === 'function' ? patch(cur) : patch) };
      try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, [key]);
  return [prefs, update];
}
