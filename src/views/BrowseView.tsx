import { useMemo, useState } from 'react';
import type { Song } from '../types';
import { CATALOG } from '../data/catalog';
import { useStore } from '../store/useStore';
import { browseFilter, filtersActive, similarSongs } from '../lib/scoring';
import { FilterBar } from '../components/FilterBar';
import { SongGrid } from '../components/SongGrid';
import { LayoutToggle } from '../components/LayoutToggle';
import { EmptyState } from '../components/EmptyState';
import { HeroAlbumWall } from '../components/HeroAlbumWall';
import { BrowseIcon } from '../components/icons';

/** Fisher–Yates shuffle (copy). */
function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffled ONCE per page load, so the default (unfiltered) browse leads with a
// different set of tracks on every reload instead of always Blinding Lights.
// Filtered views stay deterministically ranked by fit.
const DEFAULT_ORDER = shuffle(CATALOG);

export function BrowseView() {
  const filters = useStore((s) => s.filters);
  const resetFilters = useStore((s) => s.resetFilters);
  const cardLayout = useStore((s) => s.cardLayout);
  const [similarOf, setSimilarOf] = useState<Song | null>(null);

  const { results, relaxed, exactCount } = useMemo(
    () =>
      filtersActive(filters)
        ? browseFilter(CATALOG, filters)
        : { results: DEFAULT_ORDER, relaxed: false, exactCount: DEFAULT_ORDER.length },
    [filters],
  );
  const similar = useMemo(
    () => (similarOf ? similarSongs(CATALOG, similarOf, 8) : []),
    [similarOf],
  );
  // A spread of recognizable tracks for the hero cover wall (scale showcase).
  const wallSongs = useMemo(() => CATALOG.filter((_, i) => i % 3 === 0).slice(0, 30), []);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Hero band ──────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-[22px] border border-border bg-surface/40 px-6 py-5 sm:px-9 sm:py-7">
        <span className="grid-texture pointer-events-none absolute inset-0 rounded-[22px]" />
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full opacity-50 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(255,157,46,0.22), transparent 70%)' }}
        />
        <HeroAlbumWall
          songs={wallSongs}
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] xl:block"
        />
        <div className="relative max-w-2xl">
          <span className="kicker text-signal">The catalog · keyless</span>
          <h1 className="mt-3 font-display text-4xl leading-[0.95] text-text sm:text-[52px]">
            Find the sound <br className="hidden sm:block" />
            for your <span className="text-grade">cut.</span>
          </h1>
          <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-text-dim lg:whitespace-nowrap">
            <span className="font-mono text-text">{CATALOG.length}</span> hand-tagged tracks — filter by mood, scene, tempo, vocals, place &amp; era, ranked by fit.
          </p>
        </div>
      </header>

      <div className="sticky top-[64px] z-20 -mx-4 bg-bg/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <FilterBar />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-text-dim mono-nums">
          {results.length} {results.length === 1 ? 'result' : 'results'}
          {filtersActive(filters) ? ' · ranked by fit' : ''}
        </p>
        <div className="flex items-center gap-3">
          {relaxed && (
            <p className="text-[12px] text-warm">
              Only {exactCount} exact {exactCount === 1 ? 'match' : 'matches'} — showing close matches too.
            </p>
          )}
          <LayoutToggle />
        </div>
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
        <SongGrid songs={results} queue={results} onSimilar={setSimilarOf} layout={cardLayout} />
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
                <p className="kicker text-signal">Similar to</p>
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
