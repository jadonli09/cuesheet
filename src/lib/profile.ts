import type {
  DerivedSignals,
  Energy,
  Mood,
  MoodProfile,
  SceneFit,
  Setting,
  TranscriptSignals,
  VisualSignals,
} from '../types';
import { parseBrief } from './brief';
import { targetBpmFromPace } from './features';

let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${performance.now().toString(36).replace('.', '')}-${idCounter}`;
}

/** Translate raw visual signals into mood/scene/setting/energy hints. */
function visualToSignals(v: VisualSignals): {
  moods: Mood[];
  scenes: SceneFit[];
  settings: Setting[];
  energy: Energy;
} {
  const moods = new Set<Mood>();
  const scenes = new Set<SceneFit>();
  const settings = new Set<Setting>();

  const bright = v.brightness;
  const warm = v.warmth;
  const sat = v.saturation;
  const pace = v.pace;

  // Brightness ↔ tone
  if (bright > 0.62) {
    moods.add('uplifting');
    moods.add('hopeful');
  } else if (bright < 0.32) {
    moods.add('dark');
    moods.add('melancholic');
    // "Neon" implies *saturated* darkness — don't tag a merely dim clip as neon.
    if (sat > 0.4) settings.add('neon');
  } else {
    moods.add('dreamy');
  }

  // Warmth ↔ palette feeling
  if (warm > 0.6) {
    moods.add('nostalgic');
    scenes.add('sunset');
    settings.add('beach');
  } else if (warm < 0.4) {
    moods.add('chill');
    settings.add('city');
    if (bright < 0.4) scenes.add('night-drive');
  }

  // Saturation ↔ vibrancy (euphoria only when it's also bright; energy comes
  // from pace below, so we don't double-count it here).
  if (sat > 0.45 && bright > 0.5) {
    moods.add('euphoric');
  } else if (sat < 0.18) {
    moods.add('somber');
  }

  // Pace ↔ energy + scene
  let energy: Energy;
  if (pace > 0.62) {
    energy = 'high';
    moods.add('energetic');
    scenes.add('action');
    scenes.add('travel-montage');
  } else if (pace < 0.3) {
    energy = 'low';
    scenes.add('emotional-beat');
    scenes.add('slow-motion');
  } else {
    energy = 'medium';
    scenes.add('travel-montage');
  }

  return {
    moods: [...moods],
    scenes: [...scenes],
    settings: [...settings],
    energy,
  };
}

function mergeEnergy(a?: Energy, b?: Energy): Energy {
  if (a && b) {
    const rank = { low: 0, medium: 1, high: 2 } as const;
    const avg = Math.round((rank[a] + rank[b]) / 2);
    return (['low', 'medium', 'high'] as const)[avg];
  }
  return a ?? b ?? 'medium';
}

interface AssembleInput {
  source: 'video' | 'brief';
  label: string;
  visual?: VisualSignals;
  transcript?: TranscriptSignals;
  brief?: string;
}

/** Assemble a complete, scorer-ready MoodProfile from any available signals. */
export function assembleProfile(input: AssembleInput): MoodProfile {
  const moods = new Set<Mood>();
  const scenes = new Set<SceneFit>();
  const settings = new Set<Setting>();
  const genres = new Set<string>();
  const keywords = new Set<string>();
  let visualEnergy: Energy | undefined;
  let textEnergy: Energy | undefined;

  if (input.visual) {
    const vs = visualToSignals(input.visual);
    vs.moods.forEach((m) => moods.add(m));
    vs.scenes.forEach((s) => scenes.add(s));
    vs.settings.forEach((s) => settings.add(s));
    visualEnergy = vs.energy;
  }

  // Fold transcript text + free-text brief through the same NL parser.
  const textBlobs: string[] = [];
  if (input.transcript?.text) textBlobs.push(input.transcript.text);
  if (input.brief) textBlobs.push(input.brief);
  let textBpm: { min: number; max: number } | undefined;
  let textPrefersInstrumental = false;
  if (textBlobs.length) {
    const parsed = parseBrief(textBlobs.join('. '));
    parsed.moods.forEach((m) => moods.add(m));
    parsed.scenes.forEach((s) => scenes.add(s));
    parsed.settings.forEach((s) => settings.add(s));
    parsed.genres.forEach((g) => genres.add(g));
    parsed.keywords.forEach((k) => keywords.add(k));
    textEnergy = parsed.energy;
    textBpm = parsed.targetBpm;
    textPrefersInstrumental = Boolean(parsed.prefersInstrumental);
  }
  input.transcript?.keywords.forEach((k) => keywords.add(k));

  // A clip with substantial voiceover wants a clean instrumental bed.
  const hasVoiceover =
    Boolean(input.transcript?.text && input.transcript.text.trim().length > 40) ||
    scenes.has('vlog-vo-bed');

  // Prefer a cut-rate-derived tempo for videos; fall back to an explicit brief bpm.
  const targetBpm = input.visual
    ? targetBpmFromPace(input.visual.pace, input.visual.cutsPerMinute)
    : textBpm;

  const derived: DerivedSignals = {
    moods: [...moods],
    scenes: [...scenes],
    settings: [...settings],
    genres: [...genres] as DerivedSignals['genres'],
    energy: mergeEnergy(visualEnergy, textEnergy),
    keywords: [...keywords].slice(0, 28),
    targetBpm,
    prefersInstrumental: hasVoiceover || textPrefersInstrumental || undefined,
  };

  return {
    id: uid('profile'),
    label: input.label,
    source: input.source,
    createdAt: Date.now(),
    visual: input.visual,
    transcript: input.transcript,
    brief: input.brief,
    derived,
  };
}
