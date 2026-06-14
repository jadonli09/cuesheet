import type {
  DerivedSignals,
  Energy,
  FilterState,
  Genre,
  Mood,
  Recommendation,
  SceneFit,
  Setting,
  Song,
} from '../types';
import { tagLabel } from '../data/vocab';
import { bpmCloseness, era, tempoBand, vocality } from './features';
import { STOP, vocabHits } from './lexicon';

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
  tempo: 1.6,
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
  const tempoFit = bpmCloseness(song.bpm, signals.targetBpm);

  // Voiceover bed: reward instrumentals, dock vocal-forward tracks.
  const isInstrumental = vocality(song) === 'instrumental';
  let vocalAdj = 0;
  if (signals.prefersInstrumental) {
    vocalAdj = isInstrumental ? WEIGHTS.genre * 0.8 : -WEIGHTS.scene * 0.7;
  }

  let raw = 0;
  raw += matchedScenes.length * WEIGHTS.scene;
  raw += matchedMoods.length * WEIGHTS.mood;
  raw += matchedSettings.length * WEIGHTS.setting;
  raw += genreMatch ? WEIGHTS.genre : 0;
  raw += eProx * WEIGHTS.energy;
  raw += tempoFit * WEIGHTS.tempo;
  raw += Math.min(matchedKeywords.length, 3) * WEIGHTS.keyword;
  raw += vocalAdj;

  // Normalize against a generous theoretical ceiling so good matches land 60–95.
  const ceiling =
    2 * WEIGHTS.scene +
    2 * WEIGHTS.mood +
    1 * WEIGHTS.setting +
    WEIGHTS.genre +
    WEIGHTS.energy +
    WEIGHTS.tempo +
    2 * WEIGHTS.keyword;
  const score = Math.round(Math.max(0, Math.min(100, (raw / ceiling) * 100)));

  const matched = [
    ...matchedScenes.map(tagLabel),
    ...matchedMoods.map(tagLabel),
    ...matchedSettings.map(tagLabel),
    ...(genreMatch ? [tagLabel(song.genre)] : []),
    ...(tempoFit >= 0.66 ? ['on-tempo'] : []),
    ...(signals.prefersInstrumental && isInstrumental ? ['instrumental'] : []),
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
      tempoFit,
      isInstrumental,
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
  tempoFit: number;
  isInstrumental: boolean;
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
  if (ctx.tempoFit >= 0.66 && song.bpm) {
    parts.push(`locks to your cut's tempo (${song.bpm} bpm)`);
  }
  if (signals.prefersInstrumental && ctx.isInstrumental) {
    parts.push('a clean instrumental bed under voiceover');
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

/**
 * Greedy diversity pass (MMR-lite): keeps the strongest picks but demotes the
 * Nth song from the same artist / an over-represented genre, so a shortlist
 * doesn't come back as ten cuts by one act.
 */
export function diversify(
  recs: Recommendation[],
  limit: number,
): Recommendation[] {
  const pool = [...recs];
  const out: Recommendation[] = [];
  const artistSeen = new Map<string, number>();
  const genreSeen = new Map<string, number>();

  const penalty = (r: Recommendation): number =>
    (artistSeen.get(r.song.artist) ?? 0) * 9 +
    Math.max(0, (genreSeen.get(r.song.genre) ?? 0) - 2) * 3;

  while (out.length < limit && pool.length) {
    let bestIdx = 0;
    let bestVal = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const v = pool[i].score - penalty(pool[i]);
      if (v > bestVal) {
        bestVal = v;
        bestIdx = i;
      }
    }
    const [chosen] = pool.splice(bestIdx, 1);
    out.push(chosen);
    artistSeen.set(chosen.song.artist, (artistSeen.get(chosen.song.artist) ?? 0) + 1);
    genreSeen.set(chosen.song.genre, (genreSeen.get(chosen.song.genre) ?? 0) + 1);
  }
  return out;
}

/** Rank the whole catalog against signals; returns top `limit` recommendations. */
export function rankCatalog(
  catalog: Song[],
  signals: DerivedSignals,
  limit = 40,
): Recommendation[] {
  const scored = catalog
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
    // Diversify from a deeper pool than we ship so swaps have somewhere to pull from.
    .slice(0, Math.max(limit * 2, limit));

  return diversify(scored, limit);
}

// ─────────────────────────────────────────────────────────────────────────────
// Browse search → canonical tags + literal terms (synonym-aware).
// ─────────────────────────────────────────────────────────────────────────────

export interface QuerySignals {
  active: boolean;
  terms: string[];
  tags: { moods: Mood[]; scenes: SceneFit[]; settings: Setting[]; genres: Genre[] };
}

export function parseQuery(query: string): QuerySignals {
  const raw = query.trim();
  if (!raw) {
    return { active: false, terms: [], tags: { moods: [], scenes: [], settings: [], genres: [] } };
  }
  const hits = vocabHits(raw);
  const terms = hits.tokens.filter((t) => t.length > 1 && !STOP.has(t));
  return {
    active: true,
    terms,
    tags: { moods: hits.moods, scenes: hits.scenes, settings: hits.settings, genres: hits.genres },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Browse filtering — ranked, with graceful degradation to near-matches.
// ─────────────────────────────────────────────────────────────────────────────

export function emptyFilters(): FilterState {
  return {
    moods: [],
    genres: [],
    energies: [],
    scenes: [],
    settings: [],
    food: [],
    tempo: [],
    vocals: [],
    eras: [],
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
    f.tempo.length > 0 ||
    f.vocals.length > 0 ||
    f.eras.length > 0 ||
    f.query.trim().length > 0
  );
}

// Per-facet weight for ordering filtered results (independent of the recommender).
const FW = {
  mood: 2.6,
  scene: 3.0,
  setting: 1.6,
  genre: 1.8,
  food: 1.4,
  vocal: 1.6,
  era: 1.0,
  energy: 1.8,
  tempo: 1.4,
  query: 1.4,
} as const;

interface FacetMatch {
  total: number; // active categorical facets (excl. query)
  satisfied: number; // how many are satisfied
  relevance: number; // ordering score
  queryOk: boolean; // query is a hard gate when present
}

function facetMatch(song: Song, f: FilterState, q: QuerySignals): FacetMatch {
  let total = 0;
  let satisfied = 0;
  let relevance = 0;

  if (f.moods.length) {
    total++;
    const m = overlap(song.moods, f.moods);
    if (m.length) {
      satisfied++;
      relevance += FW.mood * Math.min(m.length, 2);
    }
  }
  if (f.scenes.length) {
    total++;
    const m = overlap(song.sceneFit, f.scenes);
    if (m.length) {
      satisfied++;
      relevance += FW.scene * Math.min(m.length, 2);
    }
  }
  if (f.genres.length) {
    total++;
    if (f.genres.includes(song.genre)) {
      satisfied++;
      relevance += FW.genre;
    }
  }
  if (f.settings.length) {
    total++;
    const m = overlap(song.settings, f.settings);
    if (m.length) {
      satisfied++;
      relevance += FW.setting * Math.min(m.length, 2);
    }
  }
  if (f.food.length) {
    total++;
    const m = overlap(song.food ?? [], f.food);
    if (m.length) {
      satisfied++;
      relevance += FW.food;
    }
  }
  if (f.vocals.length) {
    total++;
    if (f.vocals.includes(vocality(song))) {
      satisfied++;
      relevance += FW.vocal;
    }
  }
  if (f.eras.length) {
    total++;
    const e = era(song.year);
    if (e && f.eras.includes(e)) {
      satisfied++;
      relevance += FW.era;
    }
  }
  if (f.tempo.length) {
    total++;
    const tb = tempoBand(song.bpm);
    if (tb && f.tempo.includes(tb)) {
      satisfied++;
      relevance += FW.tempo;
    }
  }
  if (f.energies.length) {
    total++;
    if (f.energies.includes(song.energy)) {
      satisfied++;
      relevance += FW.energy;
    } else {
      // Ordinal credit for an adjacent energy — ranks up without satisfying.
      const prox = Math.max(...f.energies.map((e) => energyProximity(song.energy, e)));
      relevance += FW.energy * 0.4 * prox;
    }
  }

  let queryOk = true;
  if (q.active) {
    const text = songText(song);
    const termHit = q.terms.some((t) => text.includes(t));
    const tagHit =
      q.tags.moods.some((m) => song.moods.includes(m)) ||
      q.tags.scenes.some((s) => song.sceneFit.includes(s)) ||
      q.tags.settings.some((s) => song.settings.includes(s)) ||
      q.tags.genres.includes(song.genre);
    queryOk = termHit || tagHit;
    if (queryOk) relevance += FW.query * ((termHit ? 1 : 0) + (tagHit ? 1 : 0));
  }

  // Gentle recency tiebreak so equal matches don't fall in arbitrary catalog order.
  if (song.year) relevance += Math.min(song.year, 2025) / 2025 / 3;

  return { total, satisfied, relevance, queryOk };
}

export interface BrowseResult {
  results: Song[];
  /** True when exact AND-matches were thin and near-matches were folded in. */
  relaxed: boolean;
  exactCount: number;
}

/** How many close-but-imperfect matches to surface before showing none. */
const NEAR_FLOOR = 12;

/**
 * Filter the catalog by the active facets, ranked by relevance. When the strict
 * AND-match is thin, near-matches (missing at most one facet) are folded in and
 * `relaxed` is set, so the user never hits a dead-end empty grid by accident.
 */
export function browseFilter(catalog: Song[], f: FilterState): BrowseResult {
  if (!filtersActive(f)) {
    return { results: catalog, relaxed: false, exactCount: catalog.length };
  }
  const q = parseQuery(f.query);
  const scored = catalog.map((song) => ({ song, m: facetMatch(song, f, q) }));

  const byRelevance = (a: { m: FacetMatch }, b: { m: FacetMatch }) =>
    b.m.relevance - a.m.relevance;

  const exact = scored
    .filter((s) => s.m.queryOk && s.m.satisfied === s.m.total)
    .sort(byRelevance);

  // One active facet (or none + a query): exact set is already the right answer.
  const total = exact[0]?.m.total ?? scored[0]?.m.total ?? 0;
  if (exact.length >= NEAR_FLOOR || total <= 1) {
    return {
      results: exact.map((s) => s.song),
      relaxed: false,
      exactCount: exact.length,
    };
  }

  const near = scored
    .filter(
      (s) => s.m.queryOk && s.m.satisfied < s.m.total && s.m.satisfied >= s.m.total - 1,
    )
    .sort(byRelevance);

  return {
    results: [...exact.map((s) => s.song), ...near.map((s) => s.song)],
    relaxed: near.length > 0,
    exactCount: exact.length,
  };
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
    targetBpm: seed.bpm ? { min: seed.bpm - 16, max: seed.bpm + 16 } : undefined,
  };
  return rankCatalog(
    catalog.filter((s) => s.id !== seed.id),
    signals,
    limit,
  );
}
