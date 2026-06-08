# Research Notes — CueSheet

Pre-build research for a single-user music-supervision tool that recommends
known commercial songs for video, runs keyless client-side, and layers optional
AI mode on top.

## Competitive / reference (what to borrow, what to avoid)

- **Epidemic Sound / Artlist / Musicbed / Soundstripe** — the dominant pattern is
  *facet search by mood + genre + energy*, with a small set of high-signal
  "scene" facets ("vlog", "travel", "cinematic"). Mood is the primary axis, genre
  secondary. Takeaway: lead with **Mood** and **Scene** chips, keep energy as a
  3-band toggle, and let facets stack (AND across categories, OR within). Their
  card → hover-preview → audition-in-place loop is the core interaction.
- **Splice / Sounds.com** — preview-on-hover and a persistent player that lets you
  audition packs back-to-back without losing your place. Takeaway: a **persistent
  mini-player with a queue** of the current result set is the spine of the UX.
- **Spotify / Apple Music** — player + queue ergonomics; "now playing" art, scrubber,
  prev/next, space = play/pause. Mood/energy surfaced as editorial tags.
- **Soundraw / Cosmos** — AI discovery framed as "describe your video, get matches".
  Takeaway: a **free-text brief** box is a familiar entry point; pair it with the
  filter UI rather than replacing it.

Anti-patterns to avoid: generic SaaS card-soup, Inter + purple gradients, opaque
"AI magic" with no rationale. Decision: every recommendation shows a one-line
**why-it-fits** so the tool feels like a music supervisor, not a black box.

## Technical

- **iTunes Search API** — `https://itunes.apple.com/search?term=<artist title>&media=music&entity=song&limit=3&callback=<cb>`.
  Supports JSONP via `callback`, so it works from a static client with no CORS/key.
  Fields: `previewUrl` (30s m4a), `artworkUrl100` (swap `100x100bb` → `400x400bb`
  for higher res). Generous unauthenticated rate limits for light use. Primary
  source for previews + art.
- **Deezer API** — `https://api.deezer.com/search?q=...&output=jsonp&callback=<cb>`.
  Also JSONP, returns `data[].preview` (30s mp3) + `album.cover_big`. Used as the
  fallback when iTunes has no preview.
- **transformers.js (Xenova) Whisper** — `pipeline('automatic-speech-recognition',
  'Xenova/whisper-tiny.en')`. Runs ONNX in-browser; expects mono Float32 @ 16kHz.
  `whisper-tiny.en` (~40MB) is the right size/perf tradeoff for short clips.
  Decode strategy: WebAudio `decodeAudioData` → `OfflineAudioContext` resample to
  16k mono. Failure modes handled: no audio track, model load failure, slow device
  → fall back to a manual paste box. Lazy-loaded via dynamic `import()` so it never
  touches the initial bundle. (Verified: it loaded and transcribed in headless QA.)
- **Canvas frame extraction** — `<video>` + seek to N evenly-spaced timestamps,
  `drawImage` to a small (64×36) canvas, `getImageData`. Dominant color via coarse
  3-bit/channel histogram bucketing (cheap, no dependency vs color-thief). Cut rate
  via mean abs grayscale frame-difference with a threshold; pace blends cut-rate +
  motion. A mid-clip keyframe is grabbed at higher res as a JPEG data URL for AI vision.
- **Anthropic Messages API** — `POST https://api.anthropic.com/v1/messages`,
  headers `x-api-key`, `anthropic-version: 2023-06-01`. Vision = an `image` content
  block with `source: {type:'base64', media_type, data}` alongside text. Model:
  `claude-sonnet-4-6` (quality + speed for a recommendation call). Output coerced to
  strict JSON `{picks:[{artist,title,why}]}` and tolerantly parsed.
- **Vercel** — zero-config Vite preset; `api/*.ts` become serverless functions.
  Env via `process.env.ANTHROPIC_API_KEY`. The function is keyless-by-default: GET
  reports availability, POST returns `picks:[]` when no key is set. The whole app
  ships functional with **no env vars**.

## Design

- Direction: **dark editorial pro-tool** (Linear / Splice / CapCut energy), not SaaS.
- Palette: deep charcoal base (`#0A0B0D` + surfaces) with a single committed accent —
  **acid lime `#CCFF00`** — used sparingly for play/active/match states. Cool `#5AD1FF`
  and warm `#FF8A3D` appear only inside data viz (saturation/warmth meters).
- Type: **Space Grotesk** (display) + **IBM Plex Sans** (body), bundled locally via
  `@fontsource` (no CDN dependency, `font-display: swap`). Explicitly not Inter.
- Motif: **waveform / equalizer** everywhere — card art hover, the logo, the player,
  the queue rows — drawn as deterministic per-song bars that animate while playing.
- Grid: 4/8px spacing. Responsive at 375 / 768 / 1440 with a mobile bottom-nav that
  sits above the persistent player.
