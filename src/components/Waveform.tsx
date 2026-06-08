interface WaveformProps {
  /** Stable seed so each song renders a consistent silhouette. */
  seed: string;
  bars?: number;
  playing?: boolean;
  className?: string;
  /** Tailwind color class for the bars, e.g. "bg-accent". */
  color?: string;
}

// Deterministic 0–1 hash so a given song always draws the same waveform.
function seededHeights(seed: string, count: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    const v = ((h >>> 0) % 1000) / 1000;
    // bias toward a centered, music-like envelope
    const env = Math.sin((i / count) * Math.PI) * 0.5 + 0.5;
    out.push(0.18 + v * 0.82 * (0.55 + env * 0.45));
  }
  return out;
}

/** A waveform / spectrum motif. Animates as an equalizer while playing. */
export function Waveform({
  seed,
  bars = 28,
  playing = false,
  className = '',
  color = 'bg-accent',
}: WaveformProps) {
  const heights = seededHeights(seed, bars);
  return (
    <div
      className={`flex h-full w-full items-end gap-[2px] ${className}`}
      aria-hidden="true"
    >
      {heights.map((hgt, i) => (
        <div
          key={i}
          className={`flex-1 rounded-full ${color} ${playing ? 'eq-bar' : ''}`}
          style={{
            height: `${Math.round(hgt * 100)}%`,
            animationDelay: playing ? `${(i % 7) * 90}ms` : undefined,
            opacity: playing ? 1 : 0.55,
          }}
        />
      ))}
    </div>
  );
}
