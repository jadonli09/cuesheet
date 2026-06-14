import { create } from 'zustand';
import type {
  FilterState,
  MoodProfile,
  Project,
  Recommendation,
  Song,
} from '../types';
import { emptyFilters } from '../lib/scoring';
import {
  loadCardLayout,
  loadState,
  newId,
  saveActiveId,
  saveCardLayout,
  saveProjects,
} from '../lib/storage';
import type { DetectedMode } from '../lib/aiClient';

export type CardLayout = 'grid' | 'rows';

const initial = loadState();

interface AppState {
  // ── App mode ──────────────────────────────────────────────────────────────
  mode: DetectedMode;
  setMode: (m: DetectedMode) => void;

  // ── Projects & shortlists ───────────────────────────────────────────────────
  projects: Project[];
  activeProjectId: string | null;
  createProject: (name: string) => string;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string) => void;
  addToShortlist: (song: Song, note?: string) => void;
  removeFromShortlist: (songId: string) => void;
  toggleShortlist: (song: Song) => void;
  isShortlisted: (songId: string) => boolean;

  // ── Browse filters ──────────────────────────────────────────────────────────
  filters: FilterState;
  setFilters: (next: FilterState) => void;
  resetFilters: () => void;

  // ── Result layout (grid vs rows) ────────────────────────────────────────────
  cardLayout: CardLayout;
  setCardLayout: (layout: CardLayout) => void;

  // ── Profile + recommendations ───────────────────────────────────────────────
  profile: MoodProfile | null;
  recommendations: Recommendation[];
  setProfile: (p: MoodProfile | null) => void;
  setRecommendations: (r: Recommendation[]) => void;

  // ── Player ──────────────────────────────────────────────────────────────────
  queue: Song[];
  currentId: string | null;
  isPlaying: boolean;
  playSong: (song: Song, queue?: Song[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  setPlaying: (playing: boolean) => void;
  stop: () => void;
}

function persist(projects: Project[], activeId: string | null): void {
  saveProjects(projects);
  saveActiveId(activeId);
}

export const useStore = create<AppState>((set, get) => ({
  mode: 'local',
  setMode: (m) => set({ mode: m }),

  projects: initial.projects,
  activeProjectId:
    initial.activeId ?? initial.projects[0]?.id ?? null,

  createProject: (name) => {
    const id = newId('proj');
    const now = Date.now();
    const project: Project = {
      id,
      name: name.trim() || 'Untitled project',
      createdAt: now,
      updatedAt: now,
      shortlist: [],
    };
    const projects = [project, ...get().projects];
    persist(projects, id);
    set({ projects, activeProjectId: id });
    return id;
  },

  renameProject: (id, name) => {
    const projects = get().projects.map((p) =>
      p.id === id ? { ...p, name: name.trim() || p.name, updatedAt: Date.now() } : p,
    );
    persist(projects, get().activeProjectId);
    set({ projects });
  },

  deleteProject: (id) => {
    const projects = get().projects.filter((p) => p.id !== id);
    const activeProjectId =
      get().activeProjectId === id
        ? projects[0]?.id ?? null
        : get().activeProjectId;
    persist(projects, activeProjectId);
    set({ projects, activeProjectId });
  },

  setActiveProject: (id) => {
    saveActiveId(id);
    set({ activeProjectId: id });
  },

  addToShortlist: (song, note) => {
    const { projects, activeProjectId } = get();
    let activeId = activeProjectId;
    let list = projects;
    if (!activeId) {
      // Auto-create a first project so shortlisting always works.
      activeId = get().createProject('My first cut');
      list = get().projects;
    }
    const updated = list.map((p) => {
      if (p.id !== activeId) return p;
      if (p.shortlist.some((e) => e.songId === song.id)) return p;
      return {
        ...p,
        updatedAt: Date.now(),
        shortlist: [{ songId: song.id, addedAt: Date.now(), note }, ...p.shortlist],
      };
    });
    persist(updated, activeId);
    set({ projects: updated });
  },

  removeFromShortlist: (songId) => {
    const { projects, activeProjectId } = get();
    const updated = projects.map((p) =>
      p.id === activeProjectId
        ? {
            ...p,
            updatedAt: Date.now(),
            shortlist: p.shortlist.filter((e) => e.songId !== songId),
          }
        : p,
    );
    persist(updated, activeProjectId);
    set({ projects: updated });
  },

  toggleShortlist: (song) => {
    if (get().isShortlisted(song.id)) get().removeFromShortlist(song.id);
    else get().addToShortlist(song);
  },

  isShortlisted: (songId) => {
    const { projects, activeProjectId } = get();
    const active = projects.find((p) => p.id === activeProjectId);
    return active?.shortlist.some((e) => e.songId === songId) ?? false;
  },

  filters: emptyFilters(),
  setFilters: (next) => set({ filters: next }),
  resetFilters: () => set({ filters: emptyFilters() }),

  cardLayout: loadCardLayout(),
  setCardLayout: (layout) => {
    saveCardLayout(layout);
    set({ cardLayout: layout });
  },

  profile: null,
  recommendations: [],
  setProfile: (p) => set({ profile: p }),
  setRecommendations: (r) => set({ recommendations: r }),

  queue: [],
  currentId: null,
  isPlaying: false,

  playSong: (song, queue) => {
    set({
      queue: queue ?? [song],
      currentId: song.id,
      isPlaying: true,
    });
  },

  toggle: () => {
    if (!get().currentId) return;
    set({ isPlaying: !get().isPlaying });
  },

  next: () => {
    const { queue, currentId } = get();
    const idx = queue.findIndex((s) => s.id === currentId);
    if (idx === -1 || idx >= queue.length - 1) {
      set({ isPlaying: false });
      return;
    }
    set({ currentId: queue[idx + 1].id, isPlaying: true });
  },

  prev: () => {
    const { queue, currentId } = get();
    const idx = queue.findIndex((s) => s.id === currentId);
    if (idx <= 0) return;
    set({ currentId: queue[idx - 1].id, isPlaying: true });
  },

  setPlaying: (playing) => set({ isPlaying: playing }),
  stop: () => set({ isPlaying: false, currentId: null, queue: [] }),
}));

/** Selector helper: the active project (or null). */
export function useActiveProject(): Project | null {
  return useStore((s) => s.projects.find((p) => p.id === s.activeProjectId) ?? null);
}

/** Selector helper: the currently-loaded song object. */
export function useCurrentSong(): Song | null {
  return useStore((s) => s.queue.find((x) => x.id === s.currentId) ?? null);
}
