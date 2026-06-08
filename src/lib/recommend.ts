import type { MoodProfile, Recommendation } from '../types';
import type { DetectedMode } from './aiClient';
import { CATALOG } from '../data/catalog';
import { rankCatalog } from './scoring';
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
    const seen = new Set(ai.map((r) => r.song.id));
    return [...ai, ...local.filter((r) => !seen.has(r.song.id))].slice(0, 48);
  } catch {
    return local;
  }
}
