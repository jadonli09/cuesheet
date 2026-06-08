import type {
  Energy,
  Food,
  Genre,
  Mood,
  SceneFit,
  Setting,
} from '../types';

/** Turn a kebab token into a Title Case label. */
export function labelize(token: string): string {
  return token
    .split('-')
    .map((w) => (w === 'vo' ? 'VO' : w === 'rnb' ? 'R&B' : w === 'lo' ? 'Lo' : w))
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export const MOODS: Mood[] = [
  'uplifting',
  'hopeful',
  'triumphant',
  'euphoric',
  'energetic',
  'playful',
  'dreamy',
  'chill',
  'romantic',
  'sensual',
  'nostalgic',
  'melancholic',
  'somber',
  'dark',
  'tense',
  'eerie',
  'gritty',
  'epic',
];

export const GENRES: Genre[] = [
  'cinematic',
  'indie',
  'hip-hop',
  'electronic',
  'lo-fi',
  'ambient',
  'pop',
  'rock',
  'folk',
  'classical',
  'soul',
  'funk',
  'jazz',
  'rnb',
  'synthwave',
  'post-rock',
  'metal',
  'country',
];

export const ENERGIES: Energy[] = ['low', 'medium', 'high'];

export const SCENES: SceneFit[] = [
  'travel-montage',
  'drone-aerial',
  'time-lapse',
  'slow-motion',
  'sunset',
  'night-drive',
  'nature',
  'urban',
  'action',
  'sports',
  'workout',
  'party',
  'fashion',
  'food-cooking',
  'romance',
  'emotional-beat',
  'vlog-vo-bed',
  'intro-outro',
  'credits',
];

export const SETTINGS: Setting[] = [
  'city',
  'neon',
  'tokyo',
  'new-york',
  'london',
  'paris',
  'beach',
  'ocean',
  'mountains',
  'forest',
  'desert',
  'countryside',
  'road',
  'rain',
  'snow',
  'club',
  'studio',
  'home',
];

export const FOODS: Food[] = [
  'coffee',
  'brunch',
  'fine-dining',
  'street-food',
  'cocktails',
  'wine',
  'baking',
  'bbq',
];

/** Override labels where labelize() isn't pretty enough. */
export const LABEL_OVERRIDES: Record<string, string> = {
  rnb: 'R&B',
  'lo-fi': 'Lo-Fi',
  'hip-hop': 'Hip-Hop',
  'vlog-vo-bed': 'Vlog VO Bed',
  'drone-aerial': 'Drone / Aerial',
  'food-cooking': 'Food & Cooking',
  'new-york': 'New York',
  'night-drive': 'Night Drive',
  bbq: 'BBQ',
};

export function tagLabel(token: string): string {
  return LABEL_OVERRIDES[token] ?? labelize(token);
}

export const ENERGY_LABEL: Record<Energy, string> = {
  low: 'Low / Calm',
  medium: 'Medium',
  high: 'High / Driving',
};
