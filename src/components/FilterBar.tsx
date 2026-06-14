import { useEffect, useRef, useState } from 'react';
import type { FilterState } from '../types';
import { useStore } from '../store/useStore';
import { filtersActive } from '../lib/scoring';
import {
  ENERGIES,
  ERAS,
  ERA_LABEL,
  FOODS,
  GENRES,
  MOODS,
  SCENES,
  SETTINGS,
  TEMPO_BANDS,
  TEMPO_LABEL,
  VOCALITIES,
  VOCALITY_LABEL,
  tagLabel,
  ENERGY_LABEL,
} from '../data/vocab';
import { Chip } from './Chip';
import { CloseIcon, SearchIcon } from './icons';

type ArrKey =
  | 'moods'
  | 'genres'
  | 'energies'
  | 'scenes'
  | 'settings'
  | 'food'
  | 'tempo'
  | 'vocals'
  | 'eras';

interface MenuDef {
  key: ArrKey;
  label: string;
  options: readonly string[];
  format: (v: string) => string;
}

const MENUS: MenuDef[] = [
  { key: 'moods', label: 'Mood', options: MOODS, format: tagLabel },
  { key: 'scenes', label: 'Scene', options: SCENES, format: tagLabel },
  { key: 'genres', label: 'Genre', options: GENRES, format: tagLabel },
  { key: 'energies', label: 'Energy', options: ENERGIES, format: (v) => ENERGY_LABEL[v as keyof typeof ENERGY_LABEL] },
  { key: 'tempo', label: 'Tempo', options: TEMPO_BANDS, format: (v) => TEMPO_LABEL[v as keyof typeof TEMPO_LABEL] },
  { key: 'vocals', label: 'Vocals', options: VOCALITIES, format: (v) => VOCALITY_LABEL[v as keyof typeof VOCALITY_LABEL] },
  { key: 'settings', label: 'Place', options: SETTINGS, format: tagLabel },
  { key: 'eras', label: 'Era', options: ERAS, format: (v) => ERA_LABEL[v as keyof typeof ERA_LABEL] },
  { key: 'food', label: 'Food', options: FOODS, format: tagLabel },
];

function FilterMenu({ def }: { def: MenuDef }) {
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const selected = filters[def.key] as string[];
  const toggle = (val: string) => {
    const has = selected.includes(val);
    const nextArr = has ? selected.filter((v) => v !== val) : [...selected, val];
    setFilters({ ...filters, [def.key]: nextArr } as FilterState);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-[13px] font-medium transition-colors ${
          selected.length || open
            ? 'border-accent/60 bg-accent/10 text-accent'
            : 'border-border bg-surface-2 text-text-dim hover:border-border-bright hover:text-text'
        }`}
      >
        {def.label}
        {selected.length > 0 && (
          <span className="rounded-full bg-accent px-1.5 text-[11px] font-bold text-bg mono-nums">
            {selected.length}
          </span>
        )}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[min(320px,calc(100vw-32px))] rounded-2xl border border-border bg-surface/95 p-3 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap gap-1.5">
            {def.options.map((opt) => (
              <Chip key={opt} active={selected.includes(opt)} onClick={() => toggle(opt)}>
                {def.format(opt)}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function FilterBar() {
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const resetFilters = useStore((s) => s.resetFilters);
  const active = filtersActive(filters);

  // Flatten active selections into removable chips.
  const activeChips: { key: ArrKey; value: string; label: string }[] = [];
  for (const def of MENUS) {
    for (const v of filters[def.key] as string[]) {
      activeChips.push({ key: def.key, value: v, label: def.format(v) });
    }
  }
  const removeChip = (key: ArrKey, value: string) => {
    setFilters({
      ...filters,
      [key]: (filters[key] as string[]).filter((v) => v !== value),
    } as FilterState);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* search */}
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <input
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            placeholder="Search title, artist, instrument…"
            aria-label="Search catalog"
            className="w-full rounded-full border border-border bg-surface-2 py-2 pl-9 pr-3 text-[13px] text-text outline-none placeholder:text-text-dim focus:border-accent"
          />
        </div>
        {MENUS.map((def) => (
          <FilterMenu key={def.key} def={def} />
        ))}
        {active && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 rounded-full border border-border px-3 py-2 text-[13px] text-text-dim transition-colors hover:border-warm hover:text-warm"
          >
            <CloseIcon size={14} /> Reset
          </button>
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeChips.map((c) => (
            <button
              key={`${c.key}:${c.value}`}
              onClick={() => removeChip(c.key, c.value)}
              className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-[12px] text-accent transition-colors hover:border-accent"
            >
              {c.label}
              <CloseIcon size={12} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
