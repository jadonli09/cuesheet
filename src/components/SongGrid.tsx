import type { Recommendation, Song } from '../types';
import type { CardLayout } from '../store/useStore';
import { SongCard } from './SongCard';
import { SongRow } from './SongRow';

interface SongGridProps {
  songs?: Song[];
  recommendations?: Recommendation[];
  /** Queue loaded into the player when a card is played. */
  queue: Song[];
  onSimilar?: (song: Song) => void;
  /** 'grid' = card grid (default), 'rows' = compact horizontal list. */
  layout?: CardLayout;
}

/** Responsive grid: 1 col @375, 2 @768, 3–4 @1440. Or a stacked rows list. */
export function SongGrid({
  songs,
  recommendations,
  queue,
  onSimilar,
  layout = 'grid',
}: SongGridProps) {
  const items = recommendations
    ? recommendations.map((r) => ({ song: r.song, rec: r }))
    : (songs ?? []).map((s) => ({ song: s, rec: undefined }));

  if (layout === 'rows') {
    return (
      <div className="flex flex-col gap-2">
        {items.map(({ song, rec }, i) => (
          <div
            key={song.id}
            className="animate-fade-up"
            style={{ animationDelay: `${Math.min(i, 14) * 20}ms` }}
          >
            <SongRow
              song={song}
              recommendation={rec}
              queue={queue}
              onSimilar={onSimilar}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map(({ song, rec }, i) => (
        <div
          key={song.id}
          className="animate-fade-up"
          style={{ animationDelay: `${Math.min(i, 12) * 28}ms` }}
        >
          <SongCard
            song={song}
            recommendation={rec}
            queue={queue}
            onSimilar={onSimilar}
          />
        </div>
      ))}
    </div>
  );
}
