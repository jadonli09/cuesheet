import { useStore } from '../store/useStore';
import type { CardLayout } from '../store/useStore';
import { BrowseIcon, RowsIcon } from './icons';

const OPTIONS: { key: CardLayout; label: string; Icon: typeof RowsIcon }[] = [
  { key: 'grid', label: 'Grid', Icon: BrowseIcon },
  { key: 'rows', label: 'Rows', Icon: RowsIcon },
];

/** Segmented control to switch the results between the card grid and a rows list. */
export function LayoutToggle() {
  const layout = useStore((s) => s.cardLayout);
  const setLayout = useStore((s) => s.setCardLayout);

  return (
    <div
      className="inline-flex rounded-full border border-border bg-surface-2 p-0.5"
      role="group"
      aria-label="Result layout"
    >
      {OPTIONS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => setLayout(key)}
          title={`${label} view`}
          aria-label={`${label} view`}
          aria-pressed={layout === key}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
            layout === key
              ? 'bg-accent text-bg'
              : 'text-text-dim hover:text-text'
          }`}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}
