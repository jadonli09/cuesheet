import type { Era, Song, TempoBand, Vocality } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Derived song features. These read ONLY existing Song fields (bpm, year,
// instrumentation), so the whole 500-track catalog gains Tempo / Vocals / Era
// facets and tempo-aware scoring with zero manual re-tagging.
// ─────────────────────────────────────────────────────────────────────────────

/** Coarse tempo band from bpm. Returns null when bpm is unknown. */
export function tempoBand(bpm?: number): TempoBand | null {
  if (!bpm || bpm <= 0) return null;
  if (bpm < 90) return 'slow';
  if (bpm < 116) return 'mid';
  if (bpm < 136) return 'upbeat';
  return 'fast';
}

export const TEMPO_RANGE: Record<TempoBand, string> = {
  slow: '< 90',
  mid: '90–115',
  upbeat: '116–135',
  fast: '135+',
};

// Tokens in `instrumentation` that imply a prominent lead voice.
const VOCAL_TOKENS = ['vocal', 'vox', 'voice', 'choir', 'rap', 'singing', 'verse'];

/** Whether a track reads as vocal-forward vs. an instrumental bed. */
export function vocality(song: Song): Vocality {
  const inst = song.instrumentation.map((s) => s.toLowerCase());
  const hasVocals = inst.some((t) => VOCAL_TOKENS.some((v) => t.includes(v)));
  return hasVocals ? 'vocal' : 'instrumental';
}

/** Release-era bucket from year. Returns null for unknown (year 0 / AI picks). */
export function era(year?: number): Era | null {
  if (!year || year <= 0) return null;
  if (year < 1970) return '60s-earlier';
  if (year < 1990) return '70s-80s';
  if (year < 2000) return '90s';
  if (year < 2010) return '2000s';
  if (year < 2020) return '2010s';
  return '2020s';
}

/**
 * Turn a clip's pacing into a target tempo window (BPM). Editors tend to cut
 * on or near the beat, so the cut cadence is a (noisy) tempo proxy; we blend it
 * with the normalized pace score and return a window, not a point.
 */
export function targetBpmFromPace(
  pace: number,
  cutsPerMinute: number,
): { min: number; max: number } {
  const paceCenter = 70 + clamp01(pace) * 80; // 70..150
  const cutCenter =
    cutsPerMinute > 0
      ? Math.min(160, Math.max(70, cutsPerMinute * 2))
      : paceCenter;
  const center = Math.round(paceCenter * 0.6 + cutCenter * 0.4);
  return { min: center - 22, max: center + 22 };
}

/**
 * 0–1 closeness of a song's bpm to a target window, tolerant of half- and
 * double-time (so a 143 BPM half-time hip-hop cut still matches a ~72 target).
 */
export function bpmCloseness(
  bpm: number | undefined,
  target?: { min: number; max: number },
): number {
  if (!bpm || bpm <= 0 || !target) return 0;
  const center = (target.min + target.max) / 2;
  const half = (target.max - target.min) / 2 || 1;
  const best = Math.min(
    Math.abs(bpm - center),
    Math.abs(bpm * 2 - center),
    Math.abs(bpm / 2 - center),
  );
  return Math.max(0, 1 - best / (half * 2));
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
