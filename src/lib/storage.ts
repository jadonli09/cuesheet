import type { Project } from '../types';

const PROJECTS_KEY = 'cuesheet:projects:v1';
const ACTIVE_KEY = 'cuesheet:activeProject:v1';
const LAYOUT_KEY = 'cuesheet:cardLayout:v1';

interface PersistShape {
  projects: Project[];
  activeId: string | null;
}

export function loadState(): PersistShape {
  try {
    const projects = JSON.parse(
      localStorage.getItem(PROJECTS_KEY) ?? '[]',
    ) as Project[];
    const activeId = localStorage.getItem(ACTIVE_KEY);
    return { projects: Array.isArray(projects) ? projects : [], activeId };
  } catch {
    return { projects: [], activeId: null };
  }
}

export function saveProjects(projects: Project[]): void {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch {
    /* storage unavailable — non-fatal, state stays in memory */
  }
}

export function saveActiveId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadCardLayout(): 'grid' | 'rows' {
  try {
    return localStorage.getItem(LAYOUT_KEY) === 'rows' ? 'rows' : 'grid';
  } catch {
    return 'grid';
  }
}

export function saveCardLayout(layout: 'grid' | 'rows'): void {
  try {
    localStorage.setItem(LAYOUT_KEY, layout);
  } catch {
    /* ignore */
  }
}

let counter = 0;
export function newId(prefix = 'p'): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
