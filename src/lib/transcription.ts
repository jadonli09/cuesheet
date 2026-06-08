import type { TranscriptSignals } from '../types';

// In-browser speech-to-text via transformers.js Whisper. This is best-effort:
// the model is ~40MB and loads lazily; if anything fails (no audio track, model
// load error, slow device) the caller falls back to a manual notes paste box.

const STOP = new Set([
  'the','a','an','and','or','of','to','in','on','for','with','my','your','this','that','is','it',
  'at','as','by','be','i','we','you','they','he','she','was','were','are','am','so','but','if','then',
  'just','really','like','know','going','get','got','one','out','up','down','from','about','what','when',
  'how','all','can','will','would','there','here','have','has','had','do','does','did','not','no','yes',
  'um','uh','yeah','okay','ok','gonna','wanna','its','im','dont','thats',
]);

export function extractKeywords(text: string, limit = 14): string[] {
  const freq = new Map<string, number>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9']+/)) {
    const w = raw.replace(/'/g, '');
    if (w.length < 3 || STOP.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

/** Decode a media file's audio track to mono Float32 @ 16kHz (Whisper's rate). */
async function extractAudio16k(file: File): Promise<Float32Array | null> {
  const AudioCtx: typeof AudioContext =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) return null;

  const buf = await file.arrayBuffer();
  const ctx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(buf.slice(0));
  } catch {
    await ctx.close();
    return null; // no decodable audio track
  }
  if (decoded.length === 0) {
    await ctx.close();
    return null;
  }

  // Resample to 16kHz mono via OfflineAudioContext.
  const targetRate = 16000;
  const frames = Math.ceil(decoded.duration * targetRate);
  const offline = new OfflineAudioContext(1, frames, targetRate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  await ctx.close();
  return rendered.getChannelData(0).slice();
}

export interface TranscribeProgress {
  stage: 'loading-model' | 'decoding-audio' | 'transcribing';
  detail?: string;
}

// Cache the pipeline across calls.
let transcriberPromise: Promise<unknown> | null = null;

/**
 * Transcribe a video's spoken audio in-browser. Throws on any failure so the UI
 * can fall back to the manual paste box.
 */
export async function transcribeVideo(
  file: File,
  onProgress?: (p: TranscribeProgress) => void,
): Promise<TranscriptSignals> {
  onProgress?.({ stage: 'decoding-audio' });
  const audio = await extractAudio16k(file);
  if (!audio) {
    throw new Error('No decodable audio track found.');
  }

  onProgress?.({ stage: 'loading-model', detail: 'Fetching Whisper (~40MB, first time only)…' });
  // Dynamic import keeps transformers.js out of the initial bundle.
  const mod = (await import('@xenova/transformers')) as {
    pipeline: (task: string, model: string, opts?: unknown) => Promise<unknown>;
    env: { allowLocalModels: boolean };
  };
  mod.env.allowLocalModels = false;

  if (!transcriberPromise) {
    transcriberPromise = mod.pipeline(
      'automatic-speech-recognition',
      'Xenova/whisper-tiny.en',
    );
  }
  const transcriber = (await transcriberPromise) as (
    audio: Float32Array,
    opts?: unknown,
  ) => Promise<{ text: string }>;

  onProgress?.({ stage: 'transcribing', detail: 'Listening to your footage…' });
  const out = await transcriber(audio, {
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  const text = (out.text ?? '').trim();
  return {
    text,
    keywords: extractKeywords(text),
    source: 'whisper',
  };
}

export function manualTranscript(text: string): TranscriptSignals {
  const trimmed = text.trim();
  return {
    text: trimmed,
    keywords: extractKeywords(trimmed),
    source: 'manual',
  };
}
