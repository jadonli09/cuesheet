// ─────────────────────────────────────────────────────────────────────────────
// CueSheet brand mark. A cinematic monogram: nested "cue-sheet" brackets +
// a cue-marker spine + a solid screen blade, finished with a cue-out tick.
// Colors are driven by theme tokens so the mark tracks the palette.
// ─────────────────────────────────────────────────────────────────────────────

interface MarkProps {
  /** Rendered height in px. Width is derived from the 120×140 artboard. */
  height?: number;
  className?: string;
  /** Override the primary color (defaults to the amber accent token). */
  color?: string;
  /** Override the highlight color used on cue nodes + tick. */
  accent?: string;
}

/** The full CueSheet mark (icon only). */
export function CueMark({
  height = 30,
  className,
  color = 'var(--color-accent)',
  accent = 'var(--color-accent-soft)',
}: MarkProps) {
  return (
    <svg
      width={(height * 120) / 140}
      height={height}
      viewBox="0 0 120 140"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {/* nested cue-sheet brackets */}
      <g stroke={color} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M58 26 L40 28 L34 112 L52 116" />
        <path d="M57 41 L48 43 L45 97 L54 99" />
      </g>
      {/* cue-marker spine */}
      <path d="M62 26 L60 116" stroke={color} strokeWidth="2.8" strokeLinecap="round" />
      <rect x="53" y="57" width="6.5" height="6.5" rx="1" fill={accent} />
      <rect x="53" y="78" width="6.5" height="6.5" rx="1" fill={accent} />
      {/* solid screen blade */}
      <path d="M72 34 L90 30 L84 114 L66 118 Z" fill={color} />
      {/* cue-out tick */}
      <path d="M80 72 L108 72" stroke={accent} strokeWidth="2.8" strokeLinecap="round" />
      <rect x="105" y="68" width="7.5" height="7.5" rx="1.2" fill={accent} />
    </svg>
  );
}

/**
 * The CueSheet badge — the gold squircle + three cue blades, identical to the
 * favicon. This is the primary logo used across the app.
 */
export function CueBadge({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cuebadge-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffc266" />
          <stop offset="1" stopColor="#e07c12" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#cuebadge-grad)" />
      <g fill="#231304">
        <path d="M8 23 L11.5 9 L15 9 L11.5 23 Z" />
        <path d="M14 23 L17.5 9 L21 9 L17.5 23 Z" />
        <path d="M20 23 L23.5 9 L27 9 L23.5 23 Z" />
      </g>
    </svg>
  );
}

/** The reduced glyph (three cue blades) — used for tight/small contexts. */
export function CueGlyph({ height = 24, className, color = 'var(--color-accent)' }: MarkProps) {
  return (
    <svg
      width={height}
      height={height}
      viewBox="0 0 100 100"
      className={className}
      fill={color}
      aria-hidden="true"
    >
      <path d="M26 70 L36 30 L47 30 L37 70 Z" />
      <path d="M44 70 L54 30 L65 30 L55 70 Z" />
      <path d="M62 70 L72 30 L83 30 L73 70 Z" />
    </svg>
  );
}

/**
 * Horizontal lockup: mark + "CUESHEET" wordmark + tagline kicker.
 * Thin, wide-tracked, all-caps — matching the brand sheet.
 */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <CueBadge size={30} />
      <span className="flex flex-col items-start text-left leading-none">
        <span
          className="text-[15px] font-light text-text"
          style={{ letterSpacing: '0.34em', fontWeight: 300 }}
        >
          CUESHEET
        </span>
        {!compact && (
          <span className="kicker mt-1 text-[7.5px] tracking-[0.26em] text-text-dim">
            MUSIC INTELLIGENCE
          </span>
        )}
      </span>
    </span>
  );
}
