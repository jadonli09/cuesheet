import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  /** Render as a non-interactive label. */
  readOnly?: boolean;
  className?: string;
  title?: string;
}

export function Chip({
  children,
  active = false,
  onClick,
  readOnly = false,
  className = '',
  title,
}: ChipProps) {
  const base =
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 select-none whitespace-nowrap';

  if (readOnly) {
    return (
      <span
        title={title}
        className={`${base} border border-border bg-surface-2 text-text-dim ${className}`}
      >
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
