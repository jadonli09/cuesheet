import type { Recommendation, Song } from '../types';
import { SongCard } from './SongCard';

interface SongGridProps {
  songs?: Song[];
  recommendations?: Recommendation[];
  /** Queue loaded into the player when a card is played. */
  queue: Song[];
  onSimilar?: (song: Song) => void;
}

/** Responsive grid: 1 col @375, 2 @768, 3–4 @1440. */
export function SongGrid({
  songs,
  recommendations,
  queue,
  onSimilar,
}: SongGridProps) {
  const items = recommendations
    ? recommendations.map((r) => ({ song: r.song, rec: r }))
    : (songs ?? []).map((s) => ({ song: s, rec: undefined }));

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
