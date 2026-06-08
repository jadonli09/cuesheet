import { useEffect, useRef, useState } from 'react';
import { useStore, useActiveProject } from '../store/useStore';
import { CheckIcon, FolderIcon, PlusIcon } from './icons';

export function ProjectSwitcher() {
  const projects = useStore((s) => s.projects);
  const active = useActiveProject();
  const setActiveProject = useStore((s) => s.setActiveProject);
  const createProject = useStore((s) => s.createProject);

  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const submit = () => {
    if (!name.trim()) return;
    createProject(name.trim());
    setName('');
    setCreating(false);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-border bg-surface-2 py-1.5 pl-2.5 pr-3 text-[13px] text-text transition-colors hover:border-border-bright"
      >
        <FolderIcon size={15} className="text-accent" />
        <span className="max-w-[120px] truncate font-medium sm:max-w-[180px]">
          {active ? active.name : 'No project'}
        </span>
        {active && active.shortlist.length > 0 && (
          <span className="rounded-full bg-surface-3 px-1.5 text-[11px] text-text-dim mono-nums">
            {active.shortlist.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 rounded-2xl border border-border bg-surface/95 p-1.5 shadow-2xl backdrop-blur-xl">
          <div className="max-h-64 overflow-y-auto">
            {projects.length === 0 && (
              <p className="px-3 py-3 text-[12px] text-text-dim">
                No projects yet. Create one to start a shortlist.
              </p>
            )}
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setActiveProject(p.id);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-text">{p.name}</span>
                  <span className="block text-[11px] text-text-dim">
                    {p.shortlist.length} {p.shortlist.length === 1 ? 'track' : 'tracks'}
                  </span>
                </span>
                {p.id === active?.id && <CheckIcon size={16} className="text-accent" />}
              </button>
            ))}
          </div>

          <div className="mt-1 border-t border-border pt-1.5">
            {creating ? (
              <div className="flex items-center gap-1.5 px-1">
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submit();
                    if (e.key === 'Escape') setCreating(false);
                  }}
                  placeholder="Project name…"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[13px] text-text outline-none placeholder:text-text-dim focus:border-accent"
                />
                <button
                  onClick={submit}
                  className="rounded-lg bg-accent px-2.5 py-1.5 text-[12px] font-semibold text-bg"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-accent transition-colors hover:bg-surface-2"
              >
                <PlusIcon size={16} />
                New project
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
