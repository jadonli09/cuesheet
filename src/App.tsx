import { useEffect, useState } from 'react';
import type { ViewKey } from './types';
import { useStore } from './store/useStore';
import { detectMode } from './lib/aiClient';
import { MiniPlayer } from './components/MiniPlayer';
import { ModeBadge } from './components/ModeBadge';
import { ProjectSwitcher } from './components/ProjectSwitcher';
import { BrowseView } from './views/BrowseView';
import { AnalyzeView } from './views/AnalyzeView';
import { ResultsView } from './views/ResultsView';
import { ProjectView } from './views/ProjectView';
import {
  BrowseIcon,
  FilmIcon,
  FolderIcon,
  SparkIcon,
} from './components/icons';

const NAV: { key: ViewKey; label: string; icon: typeof BrowseIcon }[] = [
  { key: 'browse', label: 'Browse', icon: BrowseIcon },
  { key: 'analyze', label: 'Analyze', icon: FilmIcon },
  { key: 'results', label: 'Results', icon: SparkIcon },
  { key: 'project', label: 'Project', icon: FolderIcon },
];

export function App() {
  const [view, setView] = useState<ViewKey>('browse');
  const setMode = useStore((s) => s.setMode);
  const recommendations = useStore((s) => s.recommendations);
  const activeShortlist = useStore(
    (s) => s.projects.find((p) => p.id === s.activeProjectId)?.shortlist.length ?? 0,
  );

  useEffect(() => {
    detectMode().then(setMode);
  }, [setMode]);

  const badges: Partial<Record<ViewKey, number>> = {
    results: recommendations.length,
    project: activeShortlist,
  };

  return (
    <div className="min-h-full pb-[84px]">
      {/* ── Top bar ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-[1400px] items-center gap-3 px-4 sm:px-6">
          <button
            onClick={() => setView('browse')}
            className="flex items-center gap-2.5"
            aria-label="CueSheet home"
          >
            <span className="flex h-7 w-7 items-end justify-center gap-[2px] rounded-md bg-accent px-1.5 py-1.5">
              <span className="w-[3px] flex-1 rounded-full bg-bg" style={{ height: '45%' }} />
              <span className="w-[3px] flex-1 rounded-full bg-bg" style={{ height: '100%' }} />
              <span className="w-[3px] flex-1 rounded-full bg-bg" style={{ height: '70%' }} />
            </span>
            <span className="font-display text-[19px] font-700 tracking-tight text-text">
              Cue<span className="text-accent">Sheet</span>
            </span>
          </button>

          {/* desktop nav */}
          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavButton
                key={n.key}
                active={view === n.key}
                onClick={() => setView(n.key)}
                icon={<n.icon size={16} />}
                label={n.label}
                badge={badges[n.key]}
              />
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden sm:block">
              <ModeBadge />
            </span>
            <ProjectSwitcher />
          </div>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
        {view === 'browse' && <BrowseView />}
        {view === 'analyze' && <AnalyzeView onResults={() => setView('results')} />}
        {view === 'results' && <ResultsView onAnalyze={() => setView('analyze')} />}
        {view === 'project' && <ProjectView onBrowse={() => setView('browse')} />}
      </main>

      {/* ── Mobile bottom nav (above the player) ─────────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-[72px] z-30 flex border-t border-border bg-surface/95 backdrop-blur-xl md:hidden">
        {NAV.map((n) => (
          <button
            key={n.key}
            onClick={() => setView(n.key)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              view === n.key ? 'text-accent' : 'text-text-dim'
            }`}
          >
            <span className="relative">
              <n.icon size={20} />
              {!!badges[n.key] && (
                <span className="absolute -right-2 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent px-1 text-[8px] font-bold text-bg mono-nums">
                  {badges[n.key]}
                </span>
              )}
            </span>
            {n.label}
          </button>
        ))}
      </nav>

      <MiniPlayer />
    </div>
  );
}

function NavButton({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
        active
          ? 'bg-surface-2 text-text'
          : 'text-text-dim hover:bg-surface/60 hover:text-text'
      }`}
    >
      <span className={active ? 'text-accent' : ''}>{icon}</span>
      {label}
      {!!badge && (
        <span className="rounded-full bg-surface-3 px-1.5 text-[11px] text-text-dim mono-nums">
          {badge}
        </span>
      )}
    </button>
  );
}
