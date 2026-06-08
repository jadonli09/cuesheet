# Build Log — CueSheet

## Phase 0: Research — 2026-06-07
- Studied facet-search music tools (Epidemic/Artlist/Musicbed), preview/queue
  patterns (Splice/Spotify), and AI-discovery framing (Soundraw). Confirmed the
  spine: persistent mini-player + stackable mood/scene chips + per-result rationale.
- Confirmed keyless integration paths: iTunes Search (JSONP) → Deezer (JSONP)
  for previews/art; transformers.js Whisper for in-browser STT; canvas for visual
  analysis; Anthropic Messages API (vision) behind a keyless-by-default Vercel fn.
- Wrote `RESEARCH_NOTES.md`. Committed to acid-lime-on-charcoal, Space Grotesk +
  IBM Plex Sans, waveform motif.

## Phase 1: Foundation — 2026-06-07
- Vite + React 18 + TS (strict, no `any`) + Tailwind v4 (`@tailwindcss/vite`,
  CSS-first `@theme`). Fonts bundled via `@fontsource`.
- Design system in `index.css`: tokens, focus rings, scrollbars, eq-bounce /
  fade-up / shimmer keyframes, grid texture.
- TypeScript models in `types.ts` (`Song`, tag unions, `MoodProfile`,
  `DerivedSignals`, `Recommendation`, `Project`, `FilterState`).
- `localStorage` store via Zustand (`store/useStore.ts`) with persistence for
  projects/shortlists/active project; in-memory + disk cache for previews.
- JSONP util + iTunes→Deezer preview resolver (`lib/jsonp.ts`, `lib/preview.ts`).
- Persistent `MiniPlayer` shell (single `<audio>`, store-driven, queue popover,
  global space-bar play/pause).

## Phase 2: Catalog + Browse/Filter — 2026-06-07
- Seed catalog (167 real songs) generated to the controlled vocab; wired in.
- `FilterBar` with category popovers (Mood/Scene/Genre/Energy/Place/Food) +
  search + removable active-chip row + reset. AND-across / OR-within filtering in
  `lib/scoring.ts`.
- `SongCard` (lazy art via IntersectionObserver, hover/playing waveform, score +
  rationale slots, shortlist toggle, similar trigger, Apple/Spotify/YouTube links).
- Designed empty + loading + no-preview states.
- Decision: lazy-resolve previews only when a card enters the viewport to avoid
  167 simultaneous JSONP calls.

## Phase 3: Video Analysis Pipeline — 2026-06-07
- `lib/videoAnalysis.ts`: `<video>`→`<canvas>` frame sampling (16 frames, 8 for
  large files), dominant palette (histogram bucketing), brightness/saturation/
  warmth, cut-rate via frame differencing, pace score, mid-clip keyframe for vision.
- `lib/transcription.ts`: WebAudio decode + 16k resample → transformers.js
  `whisper-tiny.en` (dynamic import, lazy). Manual paste fallback.
- `lib/profile.ts`: maps visual + transcript + notes → `DerivedSignals`; assembles
  the `MoodProfile`. `MoodProfileView` renders palette/meters/keywords/"reads as".
- Edge cases: large files (frame cap + warning), unsupported codec (error +
  redirect to brief), no audio (skip STT), Whisper fail (manual box).
- QA: a generated orange/teal clip extracted #e7914b/#113a4a, 16 frames, and
  Whisper returned "[Music]" for the speechless tone — all paths exercised.

## Phase 4: Recommendation Engine — 2026-06-07
- `lib/scoring.ts`: weighted scoring (scene > mood > energy > setting > genre >
  keyword), 0–100 normalization, human-readable rationale builder, `rankCatalog`,
  `similarSongs`, browse filters.
- Results view with profile summary, ranked cards (score + why), similar drawer.

## Phase 5: AI mode + Brief + Projects — 2026-06-07
- `api/recommend.ts` Vercel fn: GET reports `aiAvailable`; POST calls Anthropic
  Messages (vision on the keyframe) for fresh known-song picks → JSON. Keyless by
  default (returns `picks:[]`). `lib/aiClient.ts` detects mode + enriches AI picks
  via the same iTunes/Deezer path; `lib/recommend.ts` merges AI ahead of deduped
  local, degrading silently on any failure. `ModeBadge` shows AI/Local.
- `lib/brief.ts`: synonym lexicon → tags for free-text briefs.
- Multi-project create/switch/rename/delete (`ProjectSwitcher`, `ProjectView`),
  shortlist add/remove, export as text + CSV to clipboard.

## Phase 6: Seed Data & Content — 2026-06-07
- Finalized 167-track catalog spanning 18 genres, all moods/energies/scenes.
  Microcopy for empty/loading/error/no-preview states written throughout.

## Phase 7: Testing & Debugging — 2026-06-07
- Headless-Chromium QA (gstack browse) at 375 / 768 / 1440. Verified: catalog +
  artwork load, stackable filters (Energy=high → 55, all high), audio preview
  through the mini-player (real iTunes preview playing), shortlist + reload
  persistence, brief → ranked results with rationales, full video pipeline
  (palette/metrics/Whisper) → mood profile → matches. **Zero console errors** on
  every view (onnxruntime "Removing initializer" lines are model warnings, not errors).
- Fixed: CSS module typing (`vite-env.d.ts`), `useInView` ref type.

## Phase 8: Polish & Deploy — 2026-06-07
- Favicon (waveform SVG), OG/meta tags, theme-color, README, this log.
- `vercel.json` (Vite preset + SPA rewrite excluding /api). Production build clean;
  transformers.js isolated into a lazy 827KB chunk (not in initial load).
- Live deploy: see README "Deploy". Build verified to run with **zero env vars**.
