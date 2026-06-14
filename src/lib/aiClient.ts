import type {
  DerivedSignals,
  Energy,
  Mood,
  Recommendation,
  SceneFit,
  Song,
} from '../types';
import { CATALOG } from '../data/catalog';
import { MOODS, SCENES } from '../data/vocab';
import { scoreSong } from './scoring';
import { resolvePreview } from './preview';

const MOOD_SET = new Set<string>(MOODS);
const SCENE_SET = new Set<string>(SCENES);
const ENERGY_SET = new Set<string>(['low', 'medium', 'high']);

// ─────────────────────────────────────────────────────────────────────────────
// Optional AI mode. Talks to the keyless-by-default Vercel function at
// /api/recommend. The function reports whether ANTHROPIC_API_KEY is configured;
// when it isn't, the whole app silently stays in local mode.
// ─────────────────────────────────────────────────────────────────────────────

export type DetectedMode = 'local' | 'ai';

let cachedMode: DetectedMode | null = null;

export async function detectMode(): Promise<DetectedMode> {
  if (cachedMode) return cachedMode;
  // Static hosts (e.g. GitHub Pages) have no serverless layer — skip the probe
  // so we don't log an expected 404. Real hosts (Vercel) still get checked.
  if (typeof location !== 'undefined' && location.hostname.endsWith('github.io')) {
    cachedMode = 'local';
    return cachedMode;
  }
  try {
    const res = await fetch('/api/recommend', { method: 'GET' });
    if (!res.ok) {
      cachedMode = 'local';
      return cachedMode;
    }
    const data = (await res.json()) as { aiAvailable?: boolean };
    cachedMode = data.aiAvailable ? 'ai' : 'local';
  } catch {
    cachedMode = 'local';
  }
  return cachedMode;
}

interface AIPick {
  artist: string;
  title: string;
  why: string;
  moods?: string[];
  energy?: string;
  scene?: string;
  bpm?: number;
  vocal?: boolean;
}

export interface AIRecommendInput {
  signals: DerivedSignals;
  brief?: string;
  transcript?: string;
  keyframeDataUrl?: string | null;
}

/**
 * Ask AI mode for fresh known-song picks beyond the seed catalog, then enrich
 * each with a preview + artwork via the same iTunes/Deezer path. Falls back to
 * an empty list on any failure (caller then shows local results).
 */
export async function aiRecommend(
  input: AIRecommendInput,
): Promise<Recommendation[]> {
  const res = await fetch('/api/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      signals: input.signals,
      brief: input.brief,
      transcript: input.transcript?.slice(0, 4000),
      keyframe: input.keyframeDataUrl ?? undefined,
    }),
  });
  if (!res.ok) throw new Error(`AI request failed (${res.status})`);
  const data = (await res.json()) as { picks?: AIPick[] };
  const picks = data.picks ?? [];

  return picks.slice(0, 12).map((p, i) => {
    // Reuse the catalog entry when the AI names a song we already tag, so it
    // inherits real metadata; otherwise synthesize one from the AI's OWN tags
    // (not the profile's) so re-scoring is honest, not circular.
    const existing = CATALOG.find(
      (s) =>
        s.title.toLowerCase() === p.title.toLowerCase() &&
        s.artist.toLowerCase() === p.artist.toLowerCase(),
    );
    const song: Song = existing ?? synthSong(p, i, input.signals);

    // Score the AI pick against the same profile the catalog is scored on, so a
    // weak suggestion can't outrank a strong local match purely for being "fresh".
    const fit = scoreSong(song, input.signals);
    const aiPrior = 88 - i * 4; // the model's own ranking, as a soft prior
    const score = Math.round(Math.min(100, fit.score * 0.6 + aiPrior * 0.4));

    // Warm the preview cache (fire and forget).
    void resolvePreview(song);

    return {
      song,
      score,
      rationale: p.why || fit.rationale,
      matched: fit.matched,
      fromAI: true,
    } satisfies Recommendation;
  });
}

/** Build a Song from an AI pick's structured tags, validated against the vocab. */
function synthSong(p: AIPick, i: number, signals: DerivedSignals): Song {
  const moods = (p.moods ?? [])
    .map((m) => m.toLowerCase())
    .filter((m): m is Mood => MOOD_SET.has(m));
  const scene =
    p.scene && SCENE_SET.has(p.scene.toLowerCase())
      ? (p.scene.toLowerCase() as SceneFit)
      : undefined;
  const energy: Energy =
    p.energy && ENERGY_SET.has(p.energy.toLowerCase())
      ? (p.energy.toLowerCase() as Energy)
      : signals.energy;

  return {
    id: `ai-${i}-${p.artist}-${p.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: p.title,
    artist: p.artist,
    year: 0,
    genre: signals.genres[0] ?? 'cinematic',
    moods: moods.length ? moods : signals.moods.slice(0, 3),
    energy,
    bpm: p.bpm,
    sceneFit: scene ? [scene] : signals.scenes.slice(0, 3),
    settings: signals.settings.slice(0, 2),
    // Drive vocality from the AI's flag so the instrumental-bed preference works.
    instrumentation: p.vocal === false ? [] : ['vocals'],
  } satisfies Song;
}
