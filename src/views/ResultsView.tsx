import { useMemo, useState } from 'react';
import type { Song } from '../types';
import { CATALOG } from '../data/catalog';
import { useStore } from '../store/useStore';
import { similarSongs } from '../lib/scoring';
import { SongGrid } from '../components/SongGrid';
import { MoodProfileView } from '../components/MoodProfileView';
import { EmptyState } from '../components/EmptyState';
import { ModeBadge } from '../components/ModeBadge';
import { SparkIcon } from '../components/icons';

interface ResultsViewProps {
  onAnalyze: () => void;
}

export function ResultsView({ onAnalyze }: ResultsViewProps) {
  const profile = useStore((s) => s.profile);
  const recommendations = useStore((s) => s.recommendations);
  const [showProfile, setShowProfile] = useState(true);
  const [similarOf, setSimilarOf] = useState<Song | null>(null);

  const similar = useMemo(
    () => (similarOf ? similarSongs(CATALOG, similarOf, 8) : []),
    [similarOf],
  );

  if (!profile || recommendations.length === 0) {
    return (
      <EmptyState
        icon={<SparkIcon size={24} />}
        title="No recommendations yet"
        body="Drop a clip or type a brief and we’ll rank the catalog against it — every pick comes with a reason it fits."
        action={
          <button
            onClick={onAnalyze}
            className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-bg transition-transform hover:scale-[1.03]"
          >
            Build a mood profile
          </button>
        }
      />
    );
  }

  const aiCount = recommendations.filter((r) => r.fromAI).length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-text sm:text-4xl">Recommendations</h1>
          <p className="mt-1 text-[14px] text-text-dim">
            {recommendations.length} ranked picks for{' '}
            <span className="text-text">“{profile.label}”</span>
            {aiCount > 0 && <> · {aiCount} fresh from AI</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModeBadge />
          <button
            onClick={() => setShowProfile((v) => !v)}
            className="rounded-full border border-border px-4 py-2 text-[13px] text-text-dim transition-colors hover:border-border-bright hover:text-text"
          >
            {showProfile ? 'Hide profile' : 'Show profile'}
          </button>
          <button
            onClick={onAnalyze}
            className="rounded-full border border-border px-4 py-2 text-[13px] text-text-dim transition-colors hover:border-border-bright hover:text-text"
          >
            New profile
          </button>
        </div>
      </header>

      {showProfile && <MoodProfileView profile={profile} />}

      <SongGrid
        recommendations={recommendations}
        queue={recommendations.map((r) => r.song)}
        onSimilar={setSimilarOf}
      />

      {similarOf && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSimilarOf(null)} />
          <div className="relative z-10 max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 sm:rounded-3xl sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Similar to</p>
                <h2 className="font-display text-xl text-text">
                  {similarOf.title} <span className="text-text-dim">— {similarOf.artist}</span>
                </h2>
              </div>
              <button onClick={() => setSimilarOf(null)} className="rounded-full border border-border px-3 py-1.5 text-[13px] text-text-dim hover:text-text">
                Close
              </button>
            </div>
            <SongGrid recommendations={similar} queue={similar.map((r) => r.song)} />
          </div>
        </div>
      )}
    </div>
  );
}
