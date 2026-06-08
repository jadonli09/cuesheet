import type { Preview, Song } from '../types';
import { jsonp } from './jsonp';

// ─────────────────────────────────────────────────────────────────────────────
// Runtime preview + artwork resolution.
//   1. iTunes Search API (JSONP)  → previewUrl + high-res artwork
//   2. Deezer public API (JSONP)  → preview + album cover  [fallback]
//   3. Vercel serverless proxy    → keyless server-side iTunes  [last resort]
// Results are memoized in-memory and persisted to localStorage so we never
// re-hit the network for a song we've already resolved this device.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_KEY = 'cuesheet:previews:v1';
const memCache = new Map<string, Preview>();
const inflight = new Map<string, Promise<Preview>>();

function loadDiskCache(): void {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, Preview>;
    for (const [id, p] of Object.entries(parsed)) memCache.set(id, p);
  } catch {
    /* ignore corrupt cache */
  }
}
loadDiskCache();

let flushTimer: number | undefined;
function persist(): void {
  if (flushTimer) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = undefined;
    try {
      const obj: Record<string, Preview> = {};
      for (const [id, p] of memCache) obj[id] = p;
      localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
    } catch {
      /* storage full / unavailable — non-fatal */
    }
  }, 600);
}

interface ITunesResult {
  previewUrl?: string;
  artworkUrl100?: string;
  trackName?: string;
  artistName?: string;
}
interface ITunesResponse {
  resultCount: number;
  results: ITunesResult[];
}

interface DeezerTrack {
  preview?: string;
  album?: { cover_medium?: string; cover_big?: string };
}
interface DeezerResponse {
  data?: DeezerTrack[];
}

function upscaleArtwork(url: string): string {
  // iTunes returns 100x100 by default; ask for 400x400.
  return url.replace(/\/\d+x\d+(bb|-100)?\./, '/400x400bb.');
}

async function fromItunes(song: Song): Promise<Preview | null> {
  const term = `${song.artist} ${song.title}`;
  const res = await jsonp<ITunesResponse>('https://itunes.apple.com/search', {
    term,
    media: 'music',
    entity: 'song',
    limit: '3',
  });
  const hit = res.results?.find((r) => r.previewUrl) ?? res.results?.[0];
  if (!hit) return null;
  return {
    songId: song.id,
    previewUrl: hit.previewUrl ?? null,
    artworkUrl: hit.artworkUrl100 ? upscaleArtwork(hit.artworkUrl100) : null,
    source: 'itunes',
  };
}

async function fromDeezer(song: Song): Promise<Preview | null> {
  const res = await jsonp<DeezerResponse>(
    'https://api.deezer.com/search',
    { q: `${song.artist} ${song.title}`, output: 'jsonp' },
    'callback',
  );
  const hit = res.data?.find((t) => t.preview) ?? res.data?.[0];
  if (!hit) return null;
  return {
    songId: song.id,
    previewUrl: hit.preview ?? null,
    artworkUrl: hit.album?.cover_big ?? hit.album?.cover_medium ?? null,
    source: 'deezer',
  };
}

const NONE: (id: string) => Preview = (songId) => ({
  songId,
  previewUrl: null,
  artworkUrl: null,
  source: 'none',
});

async function resolveUncached(song: Song): Promise<Preview> {
  // Primary: iTunes
  try {
    const it = await fromItunes(song);
    if (it && (it.previewUrl || it.artworkUrl)) return it;
  } catch {
    /* fall through */
  }
  // Fallback: Deezer
  try {
    const dz = await fromDeezer(song);
    if (dz && (dz.previewUrl || dz.artworkUrl)) return dz;
  } catch {
    /* fall through */
  }
  return NONE(song.id);
}

/** Resolve preview + artwork for a song, with caching + dedup. */
export function resolvePreview(song: Song): Promise<Preview> {
  const cached = memCache.get(song.id);
  if (cached) return Promise.resolve(cached);

  const existing = inflight.get(song.id);
  if (existing) return existing;

  const p = resolveUncached(song)
    .then((result) => {
      memCache.set(song.id, result);
      persist();
      inflight.delete(song.id);
      return result;
    })
    .catch(() => {
      inflight.delete(song.id);
      return NONE(song.id);
    });

  inflight.set(song.id, p);
  return p;
}

export function getCachedPreview(songId: string): Preview | undefined {
  return memCache.get(songId);
}
