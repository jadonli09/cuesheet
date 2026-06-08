import { useMemo, useState } from 'react';
import type { Song } from '../types';
import { CATALOG } from '../data/catalog';
import { useStore, useActiveProject } from '../store/useStore';
import { outLinks } from '../lib/links';
import { SongGrid } from '../components/SongGrid';
import { EmptyState } from '../components/EmptyState';
import { FolderIcon, TrashIcon } from '../components/icons';

const byId = new Map(CATALOG.map((s) => [s.id, s] as const));

interface ProjectViewProps {
  onBrowse: () => void;
}

export function ProjectView({ onBrowse }: ProjectViewProps) {
  const active = useActiveProject();
  const projects = useStore((s) => s.projects);
  const createProject = useStore((s) => s.createProject);
  const renameProject = useStore((s) => s.renameProject);
  const deleteProject = useStore((s) => s.deleteProject);

  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const songs = useMemo<Song[]>(() => {
    if (!active) return [];
    return active.shortlist
      .map((e) => byId.get(e.songId))
      .filter((s): s is Song => Boolean(s));
  }, [active]);

  if (projects.length === 0 || !active) {
    return (
      <EmptyState
        icon={<FolderIcon size={24} />}
        title="No projects yet"
        body="A project is one video you’re cutting. Create one, then shortlist the tracks you’re auditioning — it all persists locally."
        action={
          <button
            onClick={() => createProject('My first cut')}
            className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-bg transition-transform hover:scale-[1.03]"
          >
            Create a project
          </button>
        }
      />
    );
  }

  const copyText = async () => {
    const lines = songs.map((s) => `${s.artist} – ${s.title} – ${outLinks(s).youtube}`);
    await navigator.clipboard.writeText(lines.join('\n'));
    flash('text');
  };
  const copyCsv = async () => {
    const rows = [
      'artist,title,year,genre,energy,youtube',
      ...songs.map((s) =>
        [s.artist, s.title, s.year || '', s.genre, s.energy, outLinks(s).youtube]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(','),
      ),
    ];
    await navigator.clipboard.writeText(rows.join('\n'));
    flash('csv');
  };
  const flash = (k: string) => {
    setCopied(k);
    window.setTimeout(() => setCopied(null), 1600);
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Project shortlist</p>
          {renaming ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => {
                renameProject(active.id, nameDraft);
                setRenaming(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  renameProject(active.id, nameDraft);
                  setRenaming(false);
                }
              }}
              className="mt-1 rounded-lg border border-accent bg-bg px-2 py-1 font-display text-3xl text-text outline-none"
            />
          ) : (
            <h1
              className="mt-1 cursor-text font-display text-3xl text-text sm:text-4xl"
              onClick={() => {
                setNameDraft(active.name);
                setRenaming(true);
              }}
              title="Click to rename"
            >
              {active.name}
            </h1>
          )}
          <p className="mt-1 text-[14px] text-text-dim mono-nums">
            {songs.length} {songs.length === 1 ? 'track' : 'tracks'} shortlisted
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={copyText}
            disabled={songs.length === 0}
            className="rounded-full border border-border px-4 py-2 text-[13px] text-text-dim transition-colors hover:border-border-bright hover:text-text disabled:opacity-40"
          >
            {copied === 'text' ? 'Copied!' : 'Copy as text'}
          </button>
          <button
            onClick={copyCsv}
            disabled={songs.length === 0}
            className="rounded-full border border-border px-4 py-2 text-[13px] text-text-dim transition-colors hover:border-border-bright hover:text-text disabled:opacity-40"
          >
            {copied === 'csv' ? 'Copied!' : 'Copy as CSV'}
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete project “${active.name}”? This can’t be undone.`)) {
                deleteProject(active.id);
              }
            }}
            aria-label="Delete project"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-dim transition-colors hover:border-warm hover:text-warm"
          >
            <TrashIcon size={16} />
          </button>
        </div>
      </header>

      {songs.length === 0 ? (
        <EmptyState
          icon={<FolderIcon size={24} />}
          title="This shortlist is empty"
          body="Audition tracks in Browse or Recommendations and hit the + on any card to drop it here."
          action={
            <button
              onClick={onBrowse}
              className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-semibold text-bg transition-transform hover:scale-[1.03]"
            >
              Browse the catalog
            </button>
          }
        />
      ) : (
        <SongGrid songs={songs} queue={songs} />
      )}
    </div>
  );
}
