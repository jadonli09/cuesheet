// ─────────────────────────────────────────────────────────────────────────────
// Controlled tag vocabularies. The seed catalog and scoring engine both depend
// on these literal unions — keep them the single source of truth.
// ─────────────────────────────────────────────────────────────────────────────

export type Genre =
  | 'cinematic'
  | 'indie'
  | 'hip-hop'
  | 'electronic'
  | 'lo-fi'
  | 'ambient'
  | 'pop'
  | 'rock'
  | 'folk'
  | 'classical'
  | 'soul'
  | 'funk'
  | 'jazz'
  | 'rnb'
  | 'synthwave'
  | 'post-rock'
  | 'metal'
  | 'country';

export type Mood =
  | 'uplifting'
  | 'melancholic'
  | 'tense'
  | 'dreamy'
  | 'triumphant'
  | 'nostalgic'
  | 'eerie'
  | 'playful'
  | 'romantic'
  | 'dark'
  | 'hopeful'
  | 'energetic'
  | 'chill'
  | 'epic'
  | 'somber'
  | 'sensual'
  | 'gritty'
  | 'euphoric';

export type Energy = 'low' | 'medium' | 'high';

export type SceneFit =
  | 'travel-montage'
  | 'food-cooking'
  | 'emotional-beat'
  | 'intro-outro'
  | 'action'
  | 'vlog-vo-bed'
  | 'sunset'
  | 'night-drive'
  | 'party'
  | 'workout'
  | 'nature'
  | 'urban'
  | 'fashion'
  | 'sports'
  | 'drone-aerial'
  | 'slow-motion'
  | 'time-lapse'
  | 'romance'
  | 'credits';

export type Setting =
  | 'city'
  | 'beach'
  | 'mountains'
  | 'forest'
  | 'desert'
  | 'tokyo'
  | 'paris'
  | 'ocean'
  | 'road'
  | 'rain'
  | 'snow'
  | 'neon'
  | 'countryside'
  | 'club'
  | 'studio'
  | 'home'
  | 'london'
  | 'new-york';

export type Food =
  | 'coffee'
  | 'brunch'
  | 'fine-dining'
  | 'street-food'
  | 'cocktails'
  | 'baking'
  | 'bbq'
  | 'wine';

export interface Song {
  id: string;
  title: string;
  artist: string;
  year: number;
  genre: Genre;
  moods: Mood[];
  energy: Energy;
  bpm?: number;
  sceneFit: SceneFit[];
  settings: Setting[];
  food?: Food[];
  instrumentation: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Runtime preview enrichment (fetched from iTunes / Deezer at runtime, never
// stored). A song may resolve to no preview — the card still renders.
// ─────────────────────────────────────────────────────────────────────────────

export interface Preview {
  songId: string;
  /** 30s preview audio URL, or null if none could be resolved. */
  previewUrl: string | null;
  /** Album artwork URL, or null. */
  artworkUrl: string | null;
  /** Where the preview was resolved from. */
  source: 'itunes' | 'deezer' | 'none';
}

// ─────────────────────────────────────────────────────────────────────────────
// Mood profile assembled from a dropped video (visual + transcript signals) or
// from a free-text brief.
// ─────────────────────────────────────────────────────────────────────────────

export interface ColorSwatch {
  hex: string;
  /** 0–1 share of sampled pixels. */
  weight: number;
}

export interface VisualSignals {
  palette: ColorSwatch[];
  /** 0–1, average luma of sampled frames. */
  brightness: number;
  /** 0–1, average colorfulness/saturation. */
  saturation: number;
  /** 0–1, warm (1) vs cool (0) bias of the palette. */
  warmth: number;
  /** Estimated cuts per minute from frame differencing. */
  cutsPerMinute: number;
  /** 0–1 pacing score derived from cut rate + motion. */
  pace: number;
  framesSampled: number;
}

export interface TranscriptSignals {
  text: string;
  keywords: string[];
  source: 'whisper' | 'manual' | 'none';
}

export type ProfileSource = 'video' | 'brief';

export interface MoodProfile {
  id: string;
  label: string;
  source: ProfileSource;
  createdAt: number;
  visual?: VisualSignals;
  transcript?: TranscriptSignals;
  /** Free-text brief, when source === 'brief' (or notes added to a video). */
  brief?: string;
  /** Derived, normalized signals the scorer consumes. */
  derived: DerivedSignals;
}

/** Normalized, scorer-facing signals distilled from a profile. */
export interface DerivedSignals {
  moods: Mood[];
  scenes: SceneFit[];
  settings: Setting[];
  genres: Genre[];
  energy: Energy;
  keywords: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Recommendations
// ─────────────────────────────────────────────────────────────────────────────

export interface Recommendation {
  song: Song;
  score: number;
  /** Human-readable "why this fits" line. */
  rationale: string;
  /** The specific signals that matched, for chip display. */
  matched: string[];
  /** True when the pick came from AI mode beyond the local catalog. */
  fromAI?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Projects & shortlists (persisted in localStorage)
// ─────────────────────────────────────────────────────────────────────────────

export interface ShortlistEntry {
  songId: string;
  addedAt: number;
  note?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  shortlist: ShortlistEntry[];
  /** Last filter state used, for "remember filters per project". */
  lastFilters?: FilterState;
  /** Most recent assembled profile, if any. */
  lastProfile?: MoodProfile;
}

// ─────────────────────────────────────────────────────────────────────────────
// Browse filters
// ─────────────────────────────────────────────────────────────────────────────

export interface FilterState {
  moods: Mood[];
  genres: Genre[];
  energies: Energy[];
  scenes: SceneFit[];
  settings: Setting[];
  food: Food[];
  query: string;
}

export type AppMode = 'local' | 'ai';

export type ViewKey = 'browse' | 'analyze' | 'results' | 'project';
