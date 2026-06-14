import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  /** Render as a non-interactive label. */
  readOnly?: boolean;
  /** Compact density for tight card rows. */
  size?: 'sm' | 'md';
  /** 'surface' (default) or 'glass' for readOnly chips laid over artwork. */
  tone?: 'surface' | 'glass';
  className?: string;
  title?: string;
}

export function Chip({
  children,
  active = false,
  onClick,
  readOnly = false,
  size = 'md',
  tone = 'surface',
  className = '',
  title,
}: ChipProps) {
  const sizeCls =
    size === 'sm'
      ? 'gap-1 px-1.5 py-0.5 text-[10px]'
      : 'gap-1.5 px-3 py-1.5 text-[13px]';
  const base = `inline-flex items-center rounded-full font-medium transition-colors duration-150 select-none whitespace-nowrap ${sizeCls}`;

  if (readOnly) {
    const toneCls =
      tone === 'glass'
        ? 'border-white/15 bg-black/55 text-white/90 backdrop-blur-sm'
        : 'border-border bg-surface-2 text-text-dim';
    return (
      <span title={title} className={`${base} border ${toneCls} ${className}`}>
        {children}
      </span>
    );
  }

  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={`${base} border ${
        active
          ? 'border-accent bg-accent text-bg shadow-[0_2px_14px_-4px_rgba(204,255,0,0.6)]'
          : 'border-border bg-surface-2 text-text-dim hover:border-border-bright hover:text-text'
      } ${className}`}
    >
      {children}
    </button>
  );
}
