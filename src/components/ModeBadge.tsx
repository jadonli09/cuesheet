import { useStore } from '../store/useStore';
import { SparkIcon } from './icons';

export function ModeBadge() {
  const mode = useStore((s) => s.mode);
  const ai = mode === 'ai';
  return (
    <span
      title={
        ai
          ? 'AI mode active — fresh picks via Claude, enriched with previews.'
          : 'Local engine — deterministic matching, zero API keys. Set ANTHROPIC_API_KEY to enable AI mode.'
      }
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        ai
          ? 'border-accent/50 bg-accent/10 text-accent'
          : 'border-border bg-surface-2 text-text-dim'
      }`}
    >
      {ai ? (
        <SparkIcon size={12} />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-cool" />
      )}
      {ai ? 'AI mode' : 'Local engine'}
    </span>
  );
}
