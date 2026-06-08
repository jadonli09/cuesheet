import { useMemo, useState } from 'react';
import type { Song } from '../types';
import { CATALOG } from '../data/catalog';
import { useStore } from '../store/useStore';
import { applyFilters, filtersActive, similarSongs } from '../lib/scoring';
import { FilterBar } from '../components/FilterBar';
import { SongGrid } from '../components/SongGrid';
import { EmptyState } from '../components/EmptyState';
import { BrowseIcon } from '../components/icons';

export function BrowseView() {
  const filters = useStore((s) => s.filters);
  const resetFilters = useStore((s) => s.resetFilters);
  const [similarOf, setSimilarOf] = useState<Song | null>(null);

  const results = useMemo(() => applyFilters(CATALOG, filters), [filters]);
  const similar = useMemo(
    () => (similarOf ? similarSongs(CATALOG, similarOf, 8) : []),
    [similarOf],
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl text-text sm:text-4xl">Browse the catalog</h1>
        <p className="text-[14px] text-text-dim">
          {CATALOG.length} hand-tagged tracks. Stack filters to narrow by mood, scene, place & more.
        </p>
      </header>

      <div className="sticky top-[60px] z-20 -mx-4 bg-bg/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <FilterBar />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[13px] text-text-dim mono-nums">
          {results.length} {results.length === 1 ? 'result' : 'results'}
          {filtersActive(filters) ? ' · filtered' : ''}
        </p>
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={<BrowseIcon size={24} />}
          title="No tracks match those filters"
          body="That combination is a little too tight. Loosen a filter or clear them to see the full catalog again."
          action={
            <button
              onClick={resetFilters}
              className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-bg transition-transform hover:scale-[1.03]"
            >
              Clear all filters
            </button>
          }
        />
      ) : (
        <SongGrid songs={results} queue={results} onSimilar={setSimilarOf} />
      )}

      {/* Similar songs drawer */}
      {similarOf && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSimilarOf(null)}
          />
          <div className="relative z-10 max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-border bg-surface p-5 sm:rounded-3xl sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Similar to</p>
                <h2 className="font-display text-xl text-text">
                  {similarOf.title} <span className="text-text-dim">— {similarOf.artist}</span>
                </h2>
              </div>
              <button
                onClick={() => setSimilarOf(null)}
                className="rounded-full border border-border px-3 py-1.5 text-[13px] text-text-dim hover:text-text"
              >
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
