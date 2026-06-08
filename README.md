# CueSheet 🎚️

**Find the track for your cut.** CueSheet is a personal music-supervision tool for
a solo video editor. It recommends *known, recognizable commercial songs* to
soundtrack footage — three ways:

1. **Browse & filter** a catalog of 167 hand-tagged real songs by mood, genre,
   energy, scene-fit, place, and food.
2. **Drop in a video** and it builds a **Project Mood Profile** from the visuals
   (dominant palette, brightness, cut/pacing) and the spoken audio (in-browser
   Whisper transcription → keywords), then ranks songs against it.
3. **Type a brief** like *"moody Tokyo night drive, neon, introspective VO"* and
   get matches.

Every result shows artist + title, a **30s legal preview** + artwork (fetched at
runtime), a one-line **why-it-fits** rationale, and out-links to Apple Music /
Spotify / YouTube. Save winners to a named **project shortlist** that persists
across sessions.

> CueSheet stores only song **metadata + tags**. It never hosts or distributes
> copyrighted audio — previews and artwork are fetched at runtime from the iTunes
> Search API (Deezer fallback). Actual sync licensing happens off-platform and is
> the user's responsibility.

---

## Highlights

- **Works with zero API keys.** The entire core loop is client-side: keyless JSONP
  previews, in-browser video analysis, in-browser Whisper, a deterministic local
  scoring engine, and `localStorage` persistence.
- **Optional AI mode.** Set `ANTHROPIC_API_KEY` in Vercel and the app upgrades —
  Claude (with vision on a keyframe) suggests fresh known songs *beyond* the
  catalog, enriched via the same preview path. No key → it silently stays local.
  A badge shows which mode is active.
- **Persistent mini-player** with queue, scrubber, prev/next, and `space` = play/pause.
- **Dark editorial design** — acid-lime-on-charcoal, Space Grotesk + IBM Plex Sans
  (bundled, no CDN), waveform motifs throughout. Responsive at 375 / 768 / 1440.

## Tech stack

React 18 · Vite 6 · TypeScript (strict, no `any`) · Tailwind v4 · Zustand ·
transformers.js (Whisper) · Vercel serverless · Anthropic Messages API (optional).

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
```

Production build / preview:

```bash
npm run build        # tsc -b && vite build  → dist/
npm run preview      # serves dist/ on :4173
```

The local dev/preview server has no `/api`, so the app runs in **Local engine**
mode (exactly the zero-key production behavior). To exercise AI mode locally, run
`vercel dev` with `ANTHROPIC_API_KEY` set.

## Deploy (Vercel)

```bash
npm i -g vercel
vercel --prod        # first run links/creates the project (one-time auth)
```

- The deployed build is **fully functional with no env vars** (local engine + JSONP
  previews).
- Adding `ANTHROPIC_API_KEY` in *Project → Settings → Environment Variables* flips
  it to **AI mode** with no code change. Redeploy to apply.

## Architecture

```
api/
  recommend.ts        Vercel fn — GET reports aiAvailable; POST → Anthropic (vision)
src/
  types.ts            Song, tag unions, MoodProfile, DerivedSignals, Project, …
  data/
    catalog.ts        167 real songs, controlled-vocab tags
    vocab.ts          tag lists + human labels
  lib/
    jsonp.ts          JSONP fetcher
    preview.ts        iTunes → Deezer preview/art resolver (cached)
    scoring.ts        local scoring engine, filters, similar-songs
    brief.ts          free-text brief → tags (synonym lexicon)
    color.ts          palette quantization, brightness, frame-diff
    videoAnalysis.ts  <video>→<canvas> sampling, palette, cut-rate, keyframe
    transcription.ts  WebAudio decode + Whisper (lazy) + manual fallback
    profile.ts        signals → DerivedSignals → MoodProfile
    recommend.ts      orchestrates local + AI
    aiClient.ts       mode detection + AI-pick enrichment
    storage.ts        localStorage projects/shortlists
    links.ts          Apple/Spotify/YouTube out-links
  store/useStore.ts   Zustand: mode, projects, filters, profile, player
  hooks/              useInView, usePreview
  components/         MiniPlayer, SongCard, SongGrid, FilterBar, Chip, Waveform,
                      MoodProfileView, UploadDropzone, ProjectSwitcher, ModeBadge, …
  views/              BrowseView, AnalyzeView, ResultsView, ProjectView
  App.tsx             shell: top nav + mobile bottom nav + mounted MiniPlayer
```

**Data flow:** signals (filters / video analysis / brief) → `DerivedSignals` →
`rankCatalog` (and optionally Claude) → `Recommendation[]` (in the store) →
`ResultsView`. The `MiniPlayer` is mounted once in `App` and driven by store state
so playback survives view changes.

## Known limitations

- Previews/art depend on iTunes/Deezer resolving the track; if neither has a
  preview, the card renders with play disabled but out-links still work.
- Whisper is best-effort (~40MB model, short clips). No audio track or a load
  failure falls back to a manual paste box.
- AI-mode picks that aren't in the local catalog are synthesized with a temporary
  id; if you shortlist one, it persists by id but won't re-resolve its metadata
  after a reload (catalog tracks always do).
