import type {
  DerivedSignals,
  Energy,
  FilterState,
  Recommendation,
  Song,
} from '../types';
import { tagLabel } from '../data/vocab';

const ENERGY_RANK: Record<Energy, number> = { low: 0, medium: 1, high: 2 };

function energyProximity(a: Energy, b: Energy): number {
  return 1 - Math.abs(ENERGY_RANK[a] - ENERGY_RANK[b]) / 2;
}

function overlap<T>(a: readonly T[], b: readonly T[]): T[] {
  const set = new Set(b);
  return a.filter((x) => set.has(x));
}

/** Searchable text blob for a song, lowercased. */
function songText(song: Song): string {
  return [
    song.title,
    song.artist,
    song.genre,
    ...song.moods,
    ...song.sceneFit,
    ...song.settings,
    ...(song.food ?? []),
    ...song.instrumentation,
  ]
    .join(' ')
    .toLowerCase();
}

// Relative importance of each signal dimension when ranking.
const WEIGHTS = {
  scene: 3.2,
  mood: 2.6,
  setting: 1.7,
  genre: 1.6,
  energy: 1.8,
  keyword: 1.1,
} as const;

export interface ScoreResult {
  score: number;
  matched: string[];
  rationale: string;
}

/**
 * Score a single song against a set of derived signals (from a mood profile or
 * a brief). Returns a 0–100 score, the matched tags, and a readable rationale.
 */
export function scoreSong(song: Song, signals: DerivedSignals): ScoreResult {
  const matchedScenes = overlap(song.sceneFit, signals.scenes);
  const matchedMoods = overlap(song.moods, signals.moods);
  const matchedSettings = overlap(song.settings, signals.settings);
  const genreMatch = signals.genres.includes(song.genre);

  const text = songText(song);
  const matchedKeywords = signals.keywords.filter(
    (k) => k.length > 2 && text.includes(k.toLowerCase()),
  );

  const eProx = signals.energy ? energyProximity(song.energy, signals.energy) : 0;

  let raw = 0;
  raw += matchedScenes.length * WEIGHTS.scene;
  raw += matchedMoods.length * WEIGHTS.mood;
  raw += matchedSettings.length * WEIGHTS.setting;
  raw += genreMatch ? WEIGHTS.genre : 0;
  raw += eProx * WEIGHTS.energy;
  raw += Math.min(matchedKeywords.length, 3) * WEIGHTS.keyword;

  // Normalize against a generous theoretical ceiling so good matches land 60–95.
  const ceiling =
    2 * WEIGHTS.scene +
    2 * WEIGHTS.mood +
    1 * WEIGHTS.setting +
    WEIGHTS.genre +
    WEIGHTS.energy +
    2 * WEIGHTS.keyword;
  const score = Math.round(Math.min(100, (raw / ceiling) * 100));

  const matched = [
    ...matchedScenes.map(tagLabel),
    ...matchedMoods.map(tagLabel),
    ...matchedSettings.map(tagLabel),
    ...(genreMatch ? [tagLabel(song.genre)] : []),
  ];

  return {
    score,
    matched,
    rationale: buildRationale({
      song,
      signals,
      matchedScenes,
      matchedMoods,
      matchedSettings,
      genreMatch,
      eProx,
      matchedKeywords,
    }),
  };
}

function buildRationale(ctx: {
  song: Song;
  signals: DerivedSignals;
  matchedScenes: string[];
  matchedMoods: string[];
  matchedSettings: string[];
  genreMatch: boolean;
  eProx: number;
  matchedKeywords: string[];
}): string {
  const { song, signals, matchedScenes, matchedMoods, matchedSettings, eProx } =
    ctx;
  const parts: string[] = [];

  if (matchedMoods.length) {
    parts.push(`its ${matchedMoods.map(tagLabel).join(' / ')} mood`);
  }
  if (matchedScenes.length) {
    parts.push(`built for ${matchedScenes.map(tagLabel).join(' & ').toLowerCase()}`);
  }
  if (matchedSettings.length) {
    parts.push(`reads as ${matchedSettings.map(tagLabel).join('/').toLowerCase()}`);
  }
  if (eProx >= 0.99 && signals.energy) {
    parts.push(`matches your ${signals.energy}-energy cut`);
  } else if (eProx >= 0.5 && signals.energy) {
    parts.push(`sits near your ${signals.energy}-energy target`);
  }
  if (ctx.matchedKeywords.length) {
    parts.push(`echoes "${ctx.matchedKeywords.slice(0, 2).join('", "')}"`);
  }

  if (!parts.length) {
    return `A ${song.energy}-energy ${tagLabel(song.genre)} cue — a wildcard against your profile.`;
  }
  const lead = parts.slice(0, 3).join(', ');
  return `${cap(lead)}.`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Rank the whole catalog against signals; returns top `limit` recommendations. */
export function rankCatalog(
  catalog: Song[],
  signals: DerivedSignals,
  limit = 40,
): Recommendation[] {
  return catalog
    .map((song) => {
      const r = scoreSong(song, signals);
      return {
        song,
        score: r.score,
        rationale: r.rationale,
        matched: r.matched,
      } satisfies Recommendation;
    })
    .filter((r) => r.score > 8)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// Browse hard-filtering
// ─────────────────────────────────────────────────────────────────────────────

export function emptyFilters(): FilterState {
  return {
    moods: [],
    genres: [],
    energies: [],
    scenes: [],
    settings: [],
    food: [],
    query: '',
  };
}

export function filtersActive(f: FilterState): boolean {
  return (
    f.moods.length > 0 ||
    f.genres.length > 0 ||
    f.energies.length > 0 ||
    f.scenes.length > 0 ||
    f.settings.length > 0 ||
    f.food.length > 0 ||
    f.query.trim().length > 0
  );
}

/** AND across categories, OR within each. Query matches the song text blob. */
export function applyFilters(catalog: Song[], f: FilterState): Song[] {
  const q = f.query.trim().toLowerCase();
  return catalog.filter((song) => {
    if (f.moods.length && !f.moods.some((m) => song.moods.includes(m)))
      return false;
    if (f.genres.length && !f.genres.includes(song.genre)) return false;
    if (f.energies.length && !f.energies.includes(song.energy)) return false;
    if (f.scenes.length && !f.scenes.some((s) => song.sceneFit.includes(s)))
      return false;
    if (f.settings.length && !f.settings.some((s) => song.settings.includes(s)))
      return false;
    if (
      f.food.length &&
      !f.food.some((s) => (song.food ?? []).includes(s))
    )
      return false;
    if (q && !songText(song).includes(q)) return false;
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// "Similar songs" — score the catalog against one seed song's tags.
// ─────────────────────────────────────────────────────────────────────────────

export function similarSongs(
  catalog: Song[],
  seed: Song,
  limit = 8,
): Recommendation[] {
  const signals: DerivedSignals = {
    moods: seed.moods,
    scenes: seed.sceneFit,
    settings: seed.settings,
    genres: [seed.genre],
    energy: seed.energy,
    keywords: seed.instrumentation,
  };
  return rankCatalog(
    catalog.filter((s) => s.id !== seed.id),
    signals,
    limit,
  );
}
