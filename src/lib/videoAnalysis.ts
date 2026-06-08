import type { ColorSwatch, VisualSignals } from '../types';
import { analyzePixels, frameDiff } from './color';

const SAMPLE_W = 64;
const SAMPLE_H = 36;
const MAX_FRAMES = 16;
/** Files larger than this get fewer frames to stay responsive. */
const LARGE_FILE_BYTES = 120 * 1024 * 1024;

export interface VideoAnalysisProgress {
  stage: 'loading' | 'sampling' | 'done';
  current: number;
  total: number;
}

export interface VideoAnalysisResult {
  visual: VisualSignals;
  /** A representative mid-clip keyframe as a JPEG data URL, for AI vision. */
  keyframeDataUrl: string | null;
  durationSec: number;
  warnings: string[];
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('seek error'));
    };
    const timer = window.setTimeout(() => {
      cleanup();
      resolve(); // best-effort: proceed with whatever frame is shown
    }, 3000);
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = time;
  });
}

function loadVideo(file: File): Promise<{ video: HTMLVideoElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    const onLoaded = () => {
      cleanup();
      resolve({ video, url });
    };
    const onError = () => {
      cleanup();
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode this video. The codec may be unsupported.'));
    };
    const timer = window.setTimeout(() => {
      cleanup();
      if (video.readyState >= 1) resolve({ video, url });
      else {
        URL.revokeObjectURL(url);
        reject(new Error('Timed out loading video metadata.'));
      }
    }, 12000);
    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener('loadeddata', onLoaded);
      video.removeEventListener('error', onError);
    };
    video.addEventListener('loadeddata', onLoaded);
    video.addEventListener('error', onError);
    video.src = url;
  });
}

function pace01(cutsPerMinute: number, avgMotion: number): number {
  // Blend cut rate (a strong editorial cue) with raw motion between frames.
  const cutScore = Math.min(1, cutsPerMinute / 40); // 40+ cpm = frantic
  const motionScore = Math.min(1, avgMotion * 4);
  return Math.max(0, Math.min(1, cutScore * 0.65 + motionScore * 0.35));
}

/**
 * Analyze an uploaded video entirely client-side: sample frames to a canvas,
 * derive a dominant palette + brightness/saturation/warmth, and estimate a
 * cut rate via frame differencing. Returns a representative keyframe too.
 */
export async function analyzeVideo(
  file: File,
  onProgress?: (p: VideoAnalysisProgress) => void,
): Promise<VideoAnalysisResult> {
  const warnings: string[] = [];
  onProgress?.({ stage: 'loading', current: 0, total: 1 });

  const { video, url } = await loadVideo(file);
  const duration = Number.isFinite(video.duration) ? video.duration : 0;

  const frames = file.size > LARGE_FILE_BYTES ? 8 : MAX_FRAMES;
  if (file.size > LARGE_FILE_BYTES) {
    warnings.push(
      `Large file (${(file.size / 1024 / 1024).toFixed(0)} MB) — sampled ${frames} frames for speed.`,
    );
  }

  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_W;
  canvas.height = SAMPLE_H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error('Canvas 2D context unavailable.');
  }

  const palettesAcc = new Map<string, number>();
  let sumBrightness = 0;
  let sumSaturation = 0;
  let sumWarmth = 0;
  let sumDiff = 0;
  let diffCount = 0;
  let cuts = 0;
  let prev: Uint8ClampedArray | null = null;
  let sampled = 0;

  // A keyframe (full-res) for AI vision, grabbed near the middle.
  let keyframeDataUrl: string | null = null;
  const kfCanvas = document.createElement('canvas');

  const safeDuration = duration > 0 ? duration : 1;
  for (let i = 0; i < frames; i++) {
    const t = (safeDuration * (i + 0.5)) / frames;
    onProgress?.({ stage: 'sampling', current: i + 1, total: frames });
    try {
      await seekTo(video, Math.min(t, Math.max(0, safeDuration - 0.05)));
      ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
      const { data } = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);

      const stats = analyzePixels(data);
      for (const sw of stats.palette) {
        palettesAcc.set(sw.hex, (palettesAcc.get(sw.hex) ?? 0) + sw.weight);
      }
      sumBrightness += stats.brightness;
      sumSaturation += stats.saturation;
      sumWarmth += stats.warmth;

      if (prev) {
        const d = frameDiff(prev, data);
        sumDiff += d;
        diffCount++;
        if (d > 0.12) cuts++; // hard-ish cut threshold
      }
      prev = data;
      sampled++;

      // grab a mid-clip keyframe at decent resolution for vision
      if (keyframeDataUrl === null && i >= Math.floor(frames / 2)) {
        const kw = Math.min(640, video.videoWidth || 640);
        const kh = Math.round(
          (kw * (video.videoHeight || 360)) / (video.videoWidth || 640),
        );
        kfCanvas.width = kw;
        kfCanvas.height = kh;
        const kctx = kfCanvas.getContext('2d');
        if (kctx) {
          kctx.drawImage(video, 0, 0, kw, kh);
          try {
            keyframeDataUrl = kfCanvas.toDataURL('image/jpeg', 0.7);
          } catch {
            keyframeDataUrl = null;
          }
        }
      }
    } catch {
      // skip unreadable frame
    }
  }

  URL.revokeObjectURL(url);
  onProgress?.({ stage: 'done', current: frames, total: frames });

  if (sampled === 0) {
    throw new Error('No frames could be sampled from this file.');
  }

  const palette: ColorSwatch[] = [...palettesAcc.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([hex, weight]) => ({ hex, weight }));
  const totalW = palette.reduce((a, p) => a + p.weight, 0) || 1;
  palette.forEach((p) => (p.weight = p.weight / totalW));

  const avgMotion = diffCount ? sumDiff / diffCount : 0;
  const cutsPerMinute = duration > 0 ? (cuts / duration) * 60 : cuts * 4;

  const visual: VisualSignals = {
    palette,
    brightness: sumBrightness / sampled,
    saturation: sumSaturation / sampled,
    warmth: sumWarmth / sampled,
    cutsPerMinute: Math.round(cutsPerMinute * 10) / 10,
    pace: pace01(cutsPerMinute, avgMotion),
    framesSampled: sampled,
  };

  return { visual, keyframeDataUrl, durationSec: duration, warnings };
}
