import { useEffect, useState } from 'react';
import type { Preview, Song } from '../types';
import { getCachedPreview, resolvePreview } from '../lib/preview';

interface PreviewState {
  preview: Preview | null;
  loading: boolean;
}

/**
 * Resolve a song's preview + artwork, but only once `active` is true (typically
 * when the card scrolls into view) so we don't hammer the network up front.
 */
export function usePreview(song: Song, active: boolean): PreviewState {
  const [preview, setPreview] = useState<Preview | null>(
    () => getCachedPreview(song.id) ?? null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active || preview) return;
    let cancelled = false;
    setLoading(true);
    resolvePreview(song)
      .then((p) => {
        if (!cancelled) setPreview(p);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, song, preview]);

  return { preview, loading };
}
