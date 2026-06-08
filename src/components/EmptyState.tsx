import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  body: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, body, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface-2 text-accent">
          {icon}
        </div>
      )}
      <h3 className="font-display text-xl text-text">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-text-dim text-balance">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
