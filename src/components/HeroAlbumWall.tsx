import { useEffect, useState } from 'react';
import type { Song } from '../types';
import { getCachedPreview, resolvePreview } from '../lib/preview';

/**
 * A masked mosaic of real album covers bleeding off the right edge of the hero —
 * a "wall of records" that shows the sheer scale of the catalog. Artwork is
 * resolved through the same cached iTunes/Deezer pipeline the song cards use, so
 * repeat visits are instant. Fetches are staggered to avoid a request burst and
 * to give a progressive, top-down reveal. Purely decorative (aria-hidden).
 */

function CoverTile({ song, index }: { song: Song; index: number }) {
  const [art, setArt] = useState<string | null>(
    () => getCachedPreview(song.id)?.artworkUrl ?? null,
  );
  const [failed, setFailed] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const delay = Math.min(index * 70, 2200);
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      if (art) {
        setRevealed(true);
        return;
      }
      resolvePreview(song).then((p) => {
        if (cancelled) return;
        setArt(p.artworkUrl);
        setRevealed(true);
      });
    }, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [song, index, art]);

  const showArt = art && !failed;
  return (
    <div
      className="relative h-[58px] w-[58px] shrink-0 overflow-hidden rounded-[3px] bg-surface-2 ring-1 ring-inset ring-black/40"
      style={{ opacity: revealed ? 1 : 0, transition: 'opacity 700ms var(--ease-out-expo)' }}
    >
      {showArt ? (
        <img
          src={art!}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-surface-3 to-surface" />
      )}
    </div>
  );
}

export function HeroAlbumWall({ songs, className = '' }: { songs: Song[]; className?: string }) {
  return (
    <div className={`hero-album-wall ${className}`} aria-hidden="true">
      <div className="flex flex-wrap content-start justify-end gap-[3px]">
        {songs.map((song, i) => (
          <CoverTile key={song.id} song={song} index={i} />
        ))}
      </div>
      {/* faint warm/teal grade so the covers sit inside the room's color world */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/8 via-transparent to-signal/8" />
    </div>
  );
}
