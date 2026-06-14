import type { MoodProfile, Recommendation } from '../types';
import type { DetectedMode } from './aiClient';
import { CATALOG } from '../data/catalog';
import { diversify, rankCatalog } from './scoring';
import { aiRecommend } from './aiClient';

/**
 * Produce ranked recommendations for a profile. In AI mode, fresh Claude picks
 * are merged ahead of the deduped local results; any AI failure degrades
 * silently to the local engine.
 */
export async function getRecommendations(
  profile: MoodProfile,
  mode: DetectedMode,
  keyframeDataUrl?: string | null,
): Promise<Recommendation[]> {
  const local = rankCatalog(CATALOG, profile.derived, 40);
  if (mode !== 'ai') return local;

  try {
    const ai = await aiRecommend({
      signals: profile.derived,
      brief: profile.brief,
      transcript: profile.transcript?.text,
      keyframeDataUrl,
    });
    if (!ai.length) return local;
    // Merge by honest score (AI picks are re-scored against the profile), then
    // run the diversity pass so the board isn't dominated by one artist/genre.
    const seen = new Set(ai.map((r) => r.song.id));
    const merged = [...ai, ...local.filter((r) => !seen.has(r.song.id))].sort(
      (a, b) => b.score - a.score,
    );
    return diversify(merged, 48);
  } catch {
    return local;
  }
}
