import type { DerivedSignals, Energy, SceneFit } from '../types';
import {
  HIGH_ENERGY,
  INSTRUMENTAL_PREF,
  LOW_ENERGY,
  STOP,
  vocabHits,
} from './lexicon';

function pickEnergy(text: string, scenes: SceneFit[]): Energy {
  if (HIGH_ENERGY.test(text)) return 'high';
  if (LOW_ENERGY.test(text)) return 'low';
  if (scenes.includes('action') || scenes.includes('workout') || scenes.includes('party'))
    return 'high';
  if (
    scenes.includes('emotional-beat') ||
    scenes.includes('vlog-vo-bed') ||
    scenes.includes('food-cooking')
  )
    return 'low';
  return 'medium';
}

/** Pull an explicit "120 bpm" target out of a brief, if present. */
function detectBpm(text: string): { min: number; max: number } | undefined {
  const m = /\b(\d{2,3})\s?bpm\b/.exec(text);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (n < 40 || n > 220) return undefined;
  return { min: n - 12, max: n + 12 };
}

/** Parse a free-text brief into normalized scorer signals. */
export function parseBrief(brief: string): DerivedSignals {
  const text = brief.toLowerCase();
  const hits = vocabHits(brief);
  const keywords = hits.tokens.filter((t) => t.length > 2 && !STOP.has(t));

  // Instrumental preference: an explicit cue, or a voiceover-style scene.
  const prefersInstrumental =
    INSTRUMENTAL_PREF.test(text) || hits.scenes.includes('vlog-vo-bed');

  return {
    moods: hits.moods,
    scenes: hits.scenes,
    settings: hits.settings,
    genres: hits.genres,
    energy: pickEnergy(text, hits.scenes),
    keywords: [...new Set(keywords)].slice(0, 24),
    targetBpm: detectBpm(text),
    prefersInstrumental: prefersInstrumental || undefined,
  };
}
