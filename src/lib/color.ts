import type { ColorSwatch } from '../types';

export function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Perceived luma 0–255. */
function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function saturationOf(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

export interface PixelStats {
  palette: ColorSwatch[];
  brightness: number; // 0–1
  saturation: number; // 0–1
  warmth: number; // 0–1 (warm bias)
}

/**
 * Quantize an RGBA buffer into a small dominant palette via coarse 3-bit/channel
 * bucketing, plus average brightness / saturation / warmth. Pixels are expected
 * pre-downscaled by the caller (e.g. 64×36) so this stays cheap.
 */
export function analyzePixels(data: Uint8ClampedArray): PixelStats {
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
  let sumLuma = 0;
  let sumSat = 0;
  let warm = 0;
  let cool = 0;
  let n = 0;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 16) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count++;
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
    } else {
      buckets.set(key, { count: 1, r, g, b });
    }

    sumLuma += luma(r, g, b);
    sumSat += saturationOf(r, g, b);
    // warmth: reds/oranges vs blues
    if (r > b + 12) warm++;
    else if (b > r + 12) cool++;
    n++;
  }

  if (n === 0) {
    return { palette: [], brightness: 0, saturation: 0, warmth: 0.5 };
  }

  const sorted = [...buckets.values()].sort((a, b) => b.count - a.count);
  const top = sorted.slice(0, 6);
  const totalTop = top.reduce((acc, x) => acc + x.count, 0) || 1;
  const palette: ColorSwatch[] = top.map((x) => ({
    hex: rgbToHex(
      Math.round(x.r / x.count),
      Math.round(x.g / x.count),
      Math.round(x.b / x.count),
    ),
    weight: x.count / totalTop,
  }));

  return {
    palette,
    brightness: sumLuma / n / 255,
    saturation: sumSat / n,
    warmth: warm + cool === 0 ? 0.5 : warm / (warm + cool),
  };
}

/** Mean absolute per-pixel grayscale difference between two equal-size buffers, 0–1. */
export function frameDiff(a: Uint8ClampedArray, b: Uint8ClampedArray): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < a.length; i += 4) {
    const la = luma(a[i], a[i + 1], a[i + 2]);
    const lb = luma(b[i], b[i + 1], b[i + 2]);
    sum += Math.abs(la - lb);
    n++;
  }
  return n === 0 ? 0 : sum / n / 255;
}
