import type { Song } from '../types';

/** Build search out-links to the major services (no API needed). */
export function outLinks(song: Song): {
  apple: string;
  spotify: string;
  youtube: string;
} {
  const q = encodeURIComponent(`${song.artist} ${song.title}`);
  const term = encodeURIComponent(`${song.artist} ${song.title}`.replace(/\s+/g, '+'));
  return {
    apple: `https://music.apple.com/us/search?term=${q}`,
    spotify: `https://open.spotify.com/search/${q}`,
    youtube: `https://www.youtube.com/results?search_query=${term}`,
  };
}
