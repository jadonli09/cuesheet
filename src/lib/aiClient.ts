import type { DerivedSignals, Recommendation, Song } from '../types';
import { CATALOG } from '../data/catalog';
import { resolvePreview } from './preview';

// ─────────────────────────────────────────────────────────────────────────────
// Optional AI mode. Talks to the keyless-by-default Vercel function at
// /api/recommend. The function reports whether ANTHROPIC_API_KEY is configured;
// when it isn't, the whole app silently stays in local mode.
// ─────────────────────────────────────────────────────────────────────────────

export type DetectedMode = 'local' | 'ai';

let cachedMode: DetectedMode | null = null;

export async function detectMode(): Promise<DetectedMode> {
  if (cachedMode) return cachedMode;
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
    // Synthesize a Song record so AI picks flow through the same UI + preview path.
    const existing = CATALOG.find(
      (s) =>
        s.title.toLowerCase() === p.title.toLowerCase() &&
        s.artist.toLowerCase() === p.artist.toLowerCase(),
    );
    const song: Song =
      existing ??
      ({
        id: `ai-${i}-${p.artist}-${p.title}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-'),
        title: p.title,
        artist: p.artist,
        year: 0,
        genre: input.signals.genres[0] ?? 'cinematic',
        moods: input.signals.moods.slice(0, 3),
        energy: input.signals.energy,
        sceneFit: input.signals.scenes.slice(0, 3),
        settings: input.signals.settings.slice(0, 2),
        instrumentation: [],
      } satisfies Song);

    // Warm the preview cache (fire and forget).
    void resolvePreview(song);

    return {
      song,
      score: 100 - i * 3,
      rationale: p.why,
      matched: [],
      fromAI: true,
    } satisfies Recommendation;
  });
}
