import type { Genre, Mood, SceneFit, Setting } from '../types';
import { GENRES, MOODS, SCENES, SETTINGS } from '../data/vocab';

// ─────────────────────────────────────────────────────────────────────────────
// Shared natural-language lexicon. ONE place that turns free text — a creative
// brief, a transcript, OR a browse search box — into canonical vocab tags, so
// "japan" finds Tokyo tracks and "gym" finds workout cues everywhere.
// ─────────────────────────────────────────────────────────────────────────────

export const MOOD_SYNONYMS: Record<string, Mood> = {
  moody: 'melancholic',
  introspective: 'melancholic',
  reflective: 'melancholic',
  sad: 'somber',
  emotional: 'melancholic',
  bittersweet: 'nostalgic',
  retro: 'nostalgic',
  vintage: 'nostalgic',
  warm: 'nostalgic',
  happy: 'uplifting',
  bright: 'uplifting',
  positive: 'uplifting',
  inspiring: 'hopeful',
  inspirational: 'hopeful',
  hopeful: 'hopeful',
  victorious: 'triumphant',
  epic: 'epic',
  cinematic: 'epic',
  grand: 'epic',
  hype: 'energetic',
  energetic: 'energetic',
  driving: 'energetic',
  upbeat: 'energetic',
  fun: 'playful',
  quirky: 'playful',
  light: 'playful',
  chill: 'chill',
  relaxed: 'chill',
  calm: 'chill',
  mellow: 'chill',
  smooth: 'sensual',
  sexy: 'sensual',
  sultry: 'sensual',
  romantic: 'romantic',
  love: 'romantic',
  tender: 'romantic',
  dreamy: 'dreamy',
  ethereal: 'dreamy',
  hazy: 'dreamy',
  floaty: 'dreamy',
  dark: 'dark',
  ominous: 'dark',
  brooding: 'dark',
  tense: 'tense',
  suspense: 'tense',
  suspenseful: 'tense',
  anxious: 'tense',
  eerie: 'eerie',
  creepy: 'eerie',
  haunting: 'eerie',
  gritty: 'gritty',
  raw: 'gritty',
  rough: 'gritty',
  euphoric: 'euphoric',
  ecstatic: 'euphoric',
  rave: 'euphoric',
};

export const SCENE_SYNONYMS: Record<string, SceneFit> = {
  travel: 'travel-montage',
  montage: 'travel-montage',
  trip: 'travel-montage',
  journey: 'travel-montage',
  drone: 'drone-aerial',
  aerial: 'drone-aerial',
  flyover: 'drone-aerial',
  landscape: 'drone-aerial',
  timelapse: 'time-lapse',
  hyperlapse: 'time-lapse',
  slowmo: 'slow-motion',
  'slow-mo': 'slow-motion',
  sunset: 'sunset',
  sunrise: 'sunset',
  'golden-hour': 'sunset',
  night: 'night-drive',
  drive: 'night-drive',
  driving: 'night-drive',
  cruising: 'night-drive',
  nature: 'nature',
  outdoors: 'nature',
  wilderness: 'nature',
  hiking: 'nature',
  city: 'urban',
  street: 'urban',
  urban: 'urban',
  action: 'action',
  chase: 'action',
  fight: 'action',
  sports: 'sports',
  athletic: 'sports',
  game: 'sports',
  workout: 'workout',
  gym: 'workout',
  training: 'workout',
  fitness: 'workout',
  party: 'party',
  club: 'party',
  dance: 'party',
  fashion: 'fashion',
  style: 'fashion',
  lookbook: 'fashion',
  runway: 'fashion',
  food: 'food-cooking',
  cooking: 'food-cooking',
  recipe: 'food-cooking',
  kitchen: 'food-cooking',
  romance: 'romance',
  wedding: 'romance',
  couple: 'romance',
  emotional: 'emotional-beat',
  vlog: 'vlog-vo-bed',
  voiceover: 'vlog-vo-bed',
  vo: 'vlog-vo-bed',
  talking: 'vlog-vo-bed',
  narration: 'vlog-vo-bed',
  intro: 'intro-outro',
  outro: 'intro-outro',
  opener: 'intro-outro',
  credits: 'credits',
};

export const SETTING_SYNONYMS: Record<string, Setting> = {
  city: 'city',
  downtown: 'city',
  metropolis: 'city',
  neon: 'neon',
  cyberpunk: 'neon',
  tokyo: 'tokyo',
  japan: 'tokyo',
  japanese: 'tokyo',
  nyc: 'new-york',
  'new-york': 'new-york',
  manhattan: 'new-york',
  brooklyn: 'new-york',
  london: 'london',
  uk: 'london',
  paris: 'paris',
  france: 'paris',
  parisian: 'paris',
  beach: 'beach',
  coast: 'beach',
  tropical: 'beach',
  surf: 'beach',
  ocean: 'ocean',
  sea: 'ocean',
  underwater: 'ocean',
  mountains: 'mountains',
  alps: 'mountains',
  peaks: 'mountains',
  forest: 'forest',
  woods: 'forest',
  jungle: 'forest',
  desert: 'desert',
  dunes: 'desert',
  countryside: 'countryside',
  rural: 'countryside',
  farm: 'countryside',
  field: 'countryside',
  road: 'road',
  highway: 'road',
  rain: 'rain',
  rainy: 'rain',
  storm: 'rain',
  snow: 'snow',
  winter: 'snow',
  snowy: 'snow',
  studio: 'studio',
  home: 'home',
  bedroom: 'home',
  cozy: 'home',
};

export const GENRE_SYNONYMS: Record<string, Genre> = {
  cinematic: 'cinematic',
  orchestral: 'cinematic',
  score: 'cinematic',
  trailer: 'cinematic',
  indie: 'indie',
  alternative: 'indie',
  hiphop: 'hip-hop',
  'hip-hop': 'hip-hop',
  rap: 'hip-hop',
  trap: 'hip-hop',
  electronic: 'electronic',
  edm: 'electronic',
  house: 'electronic',
  techno: 'electronic',
  lofi: 'lo-fi',
  'lo-fi': 'lo-fi',
  ambient: 'ambient',
  atmospheric: 'ambient',
  pop: 'pop',
  rock: 'rock',
  punk: 'rock',
  folk: 'folk',
  acoustic: 'folk',
  classical: 'classical',
  piano: 'classical',
  soul: 'soul',
  motown: 'soul',
  funk: 'funk',
  groovy: 'funk',
  jazz: 'jazz',
  rnb: 'rnb',
  'r&b': 'rnb',
  synthwave: 'synthwave',
  retrowave: 'synthwave',
  '80s': 'synthwave',
  postrock: 'post-rock',
  'post-rock': 'post-rock',
  metal: 'metal',
  heavy: 'metal',
  country: 'country',
};

export const HIGH_ENERGY =
  /\b(fast|high.?energy|driving|intense|hype|aggressive|pumping|frantic|action|workout|rave|banger)\b/;
export const LOW_ENERGY =
  /\b(slow|calm|gentle|soft|quiet|minimal|sparse|contemplative|ambient|chill|mellow|tender|introspective)\b/;

/** Cues that the cut wants a clean instrumental bed (no competing lead vocal). */
export const INSTRUMENTAL_PREF =
  /\b(instrumental|no vocals|without vocals|under (the )?(voiceover|narration|dialogue)|voice-?over|narration|talking head|podcast|tutorial|explainer)\b/;

export const STOP = new Set([
  'the','a','an','and','or','of','to','in','on','for','with','my','your','this','that',
  'is','it','at','as','by','be','i','we','you','about','into','some','very','feel','feeling',
  'vibe','vibes','video','footage','clip','track','song','music','want','need','looking','like',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export interface VocabHits {
  moods: Mood[];
  scenes: SceneFit[];
  settings: Setting[];
  genres: Genre[];
  tokens: string[];
}

/**
 * Resolve free text into canonical vocab tags via direct hits + synonyms +
 * two-word phrase folding. Shared by the brief parser and browse search.
 */
export function vocabHits(text: string): VocabHits {
  const lower = text.toLowerCase();
  const tokens = tokenize(text);
  const tokenSet = new Set(tokens);
  for (let i = 0; i < tokens.length - 1; i++) {
    tokenSet.add(`${tokens[i]}-${tokens[i + 1]}`);
  }

  const moods = new Set<Mood>();
  const scenes = new Set<SceneFit>();
  const settings = new Set<Setting>();
  const genres = new Set<Genre>();

  for (const m of MOODS) if (lower.includes(m)) moods.add(m);
  for (const s of SCENES)
    if (lower.includes(s.replace('-', ' ')) || tokenSet.has(s)) scenes.add(s);
  for (const s of SETTINGS)
    if (tokenSet.has(s) || lower.includes(s.replace('-', ' '))) settings.add(s);
  for (const g of GENRES)
    if (tokenSet.has(g) || lower.includes(g.replace('-', ' '))) genres.add(g);

  for (const t of tokenSet) {
    const m = MOOD_SYNONYMS[t];
    if (m) moods.add(m);
    const sc = SCENE_SYNONYMS[t];
    if (sc) scenes.add(sc);
    const st = SETTING_SYNONYMS[t];
    if (st) settings.add(st);
    const g = GENRE_SYNONYMS[t];
    if (g) genres.add(g);
  }

  return {
    moods: [...moods],
    scenes: [...scenes],
    settings: [...settings],
    genres: [...genres],
    tokens,
  };
}
