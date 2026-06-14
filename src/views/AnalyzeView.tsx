import { useMemo, useState } from 'react';
import type { TranscriptSignals, VisualSignals } from '../types';
import { useStore } from '../store/useStore';
import { analyzeVideo } from '../lib/videoAnalysis';
import {
  manualTranscript,
  transcribeVideo,
  type TranscribeProgress,
} from '../lib/transcription';
import { assembleProfile } from '../lib/profile';
import { getRecommendations } from '../lib/recommend';
import { UploadDropzone } from '../components/UploadDropzone';
import { MoodProfileView } from '../components/MoodProfileView';
import { PinGate } from '../components/PinGate';
import { SparkIcon, WaveIcon } from '../components/icons';

interface AnalyzeViewProps {
  onResults: () => void;
}

type Sub = 'video' | 'brief';

const BRIEF_EXAMPLES = [
  'moody Tokyo night drive, neon, introspective VO',
  'sunny beach travel montage, upbeat, drone shots',
  'slow emotional wedding film, warm, strings',
  'high-energy gym workout, aggressive, trap',
  'cozy coffee shop brunch vlog, mellow lo-fi',
];

export function AnalyzeView({ onResults }: AnalyzeViewProps) {
  const [sub, setSub] = useState<Sub>('video');
  const mode = useStore((s) => s.mode);
  const setProfile = useStore((s) => s.setProfile);
  const setRecommendations = useStore((s) => s.setRecommendations);
  // Unlock is intentionally LOCAL + ephemeral: this view unmounts when you leave
  // the Analyze tab, so the access code is required again on every visit. It is
  // never persisted (no localStorage), so a reload re-locks too.
  const [unlocked, setUnlocked] = useState(false);

  // ── Video state ─────────────────────────────────────────────────────────────
  const [fileName, setFileName] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisMsg, setAnalysisMsg] = useState('');
  const [visual, setVisual] = useState<VisualSignals | null>(null);
  const [keyframe, setKeyframe] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [transcript, setTranscript] = useState<TranscriptSignals | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeMsg, setTranscribeMsg] = useState('');
  const [transcribeFailed, setTranscribeFailed] = useState(false);
  const [manualText, setManualText] = useState('');
  const [notes, setNotes] = useState('');

  const [building, setBuilding] = useState(false);

  // ── Brief state ─────────────────────────────────────────────────────────────
  const [briefText, setBriefText] = useState('');

  // Live preview profile from current video signals.
  const videoProfile = useMemo(() => {
    if (!visual) return null;
    return assembleProfile({
      source: 'video',
      label: fileName ?? 'Untitled clip',
      visual,
      transcript: transcript ?? undefined,
      brief: notes.trim() || undefined,
    });
  }, [visual, transcript, notes, fileName]);

  const handleFile = async (file: File) => {
    setError(null);
    setWarnings([]);
    setVisual(null);
    setTranscript(null);
    setTranscribeFailed(false);
    setKeyframe(null);
    setFileName(file.name);
    setAnalyzing(true);
    setAnalysisMsg('Decoding video…');

    try {
      const result = await analyzeVideo(file, (p) => {
        if (p.stage === 'sampling') setAnalysisMsg(`Sampling frame ${p.current}/${p.total}…`);
        else if (p.stage === 'loading') setAnalysisMsg('Decoding video…');
      });
      setVisual(result.visual);
      setKeyframe(result.keyframeDataUrl);
      setWarnings(result.warnings);
      setAnalyzing(false);

      // Best-effort transcription.
      void runTranscription(file);
    } catch (e) {
      setAnalyzing(false);
      setError(e instanceof Error ? e.message : 'Could not analyze this video.');
    }
  };

  const runTranscription = async (file: File) => {
    setTranscribing(true);
    setTranscribeFailed(false);
    setTranscribeMsg('Preparing transcription…');
    try {
      const t = await transcribeVideo(file, (p: TranscribeProgress) => {
        setTranscribeMsg(
          p.detail ??
            (p.stage === 'loading-model'
              ? 'Loading Whisper model…'
              : p.stage === 'decoding-audio'
                ? 'Extracting audio…'
                : 'Transcribing…'),
        );
      });
      setTranscript(t);
    } catch {
      setTranscribeFailed(true);
    } finally {
      setTranscribing(false);
    }
  };

  const applyManual = () => {
    if (!manualText.trim()) return;
    setTranscript(manualTranscript(manualText));
    setTranscribeFailed(false);
  };

  const buildFromVideo = async () => {
    if (!videoProfile) return;
    setBuilding(true);
    try {
      const recs = await getRecommendations(videoProfile, mode, keyframe);
      setProfile(videoProfile);
      setRecommendations(recs);
      onResults();
    } finally {
      setBuilding(false);
    }
  };

  const buildFromBrief = async () => {
    if (!briefText.trim()) return;
    setBuilding(true);
    try {
      const profile = assembleProfile({
        source: 'brief',
        label: briefText.trim().slice(0, 48),
        brief: briefText.trim(),
      });
      const recs = await getRecommendations(profile, mode);
      setProfile(profile);
      setRecommendations(recs);
      onResults();
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <span className="kicker flex items-center gap-2 text-signal">
          <WaveIcon size={14} /> AI cue engine
        </span>
        <h1 className="font-display text-3xl leading-[0.95] text-text sm:text-4xl">
          Build a <span className="text-grade">mood profile</span>
        </h1>
        <p className="max-w-xl text-[14px] leading-relaxed text-text-dim">
          Drop a clip to read its visuals &amp; voiceover, or describe the vibe in words. Then we rank the catalog against it — every pick comes with a reason.
        </p>
      </header>

      {!unlocked ? (
        <PinGate onUnlock={() => setUnlocked(true)} />
      ) : (
        <div className="animate-reveal flex flex-col gap-6">
          {renderTools()}
        </div>
      )}
    </div>
  );

  function renderTools() {
    return (
      <>
      {/* segmented control */}
      <div className="inline-flex w-fit rounded-full border border-border bg-surface-2 p-1">
        {(['video', 'brief'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
              sub === s ? 'bg-accent text-bg' : 'text-text-dim hover:text-text'
            }`}
          >
            {s === 'video' ? 'From a clip' : 'From a brief'}
          </button>
        ))}
      </div>

      {sub === 'video' ? (
        <div className="flex flex-col gap-5">
          {!visual && !analyzing && (
            <UploadDropzone onFile={handleFile} disabled={analyzing} />
          )}

          {analyzing && (
            <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-10">
              <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-surface-3 border-t-accent" />
              <p className="font-display text-text">{analysisMsg}</p>
              <p className="text-[12px] text-text-dim">{fileName}</p>
            </div>
          )}

          {error && (
            <div className="rounded-[var(--radius-card)] border border-warm/40 bg-warm/5 p-5">
              <p className="font-display text-warm">Couldn’t analyze that clip</p>
              <p className="mt-1 text-[13px] text-text-dim">{error}</p>
              <p className="mt-2 text-[13px] text-text-dim">
                Try a different file, or switch to{' '}
                <button onClick={() => setSub('brief')} className="text-accent underline">
                  a written brief
                </button>{' '}
                instead.
              </p>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-[12px] text-text-dim">
              {warnings.map((w, i) => (
                <p key={i}>⚠ {w}</p>
              ))}
            </div>
          )}

          {videoProfile && (
            <>
              <MoodProfileView profile={videoProfile} />

              {/* Transcription status / fallback */}
              <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-display text-text">Voiceover & dialogue</h3>
                  {transcribing && (
                    <span className="flex items-center gap-2 text-[12px] text-text-dim">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-surface-3 border-t-accent" />
                      {transcribeMsg}
                    </span>
                  )}
                </div>

                {transcript && transcript.source === 'whisper' && (
                  <p className="text-[13px] text-text-dim">
                    Transcribed in-browser with Whisper · {transcript.keywords.length} keywords folded into your profile.
                  </p>
                )}
                {transcript && transcript.source === 'manual' && (
                  <p className="text-[13px] text-text-dim">Using your pasted notes.</p>
                )}

                {(transcribeFailed || (!transcript && !transcribing)) && (
                  <div className="mt-1">
                    {transcribeFailed && (
                      <p className="mb-2 text-[13px] text-text-dim">
                        Couldn’t auto-transcribe (no audio track, or the model didn’t load). Paste any voiceover or notes below — optional.
                      </p>
                    )}
                    <textarea
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder="Paste a transcript or describe what’s said / shown…"
                      rows={3}
                      className="w-full resize-y rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none placeholder:text-text-dim focus:border-accent"
                    />
                    <button
                      onClick={applyManual}
                      disabled={!manualText.trim()}
                      className="mt-2 rounded-full border border-border px-4 py-1.5 text-[13px] text-text transition-colors hover:border-border-bright disabled:opacity-40"
                    >
                      Add to profile
                    </button>
                  </div>
                )}

                {/* extra creative notes */}
                <div className="mt-4 border-t border-border pt-4">
                  <label className="mb-1.5 block text-[12px] font-medium text-text-dim">
                    Add a creative note (optional)
                  </label>
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. nostalgic, want it to build to a triumphant ending"
                    className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-text outline-none placeholder:text-text-dim focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={buildFromVideo}
                  disabled={building}
                  className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-display text-[15px] font-semibold text-bg transition-transform hover:scale-[1.02] disabled:opacity-60"
                >
                  {building ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg border-t-transparent" />
                      {mode === 'ai' ? 'Asking Claude…' : 'Ranking catalog…'}
                    </>
                  ) : (
                    <>
                      <SparkIcon size={18} /> Find matching songs
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setVisual(null);
                    setFileName(null);
                    setTranscript(null);
                  }}
                  className="rounded-full border border-border px-5 py-3 text-[13px] text-text-dim transition-colors hover:text-text"
                >
                  Use another clip
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6">
            <textarea
              value={briefText}
              onChange={(e) => setBriefText(e.target.value)}
              placeholder="Describe the scene & vibe — setting, mood, energy, any voiceover themes…"
              rows={4}
              className="w-full resize-y rounded-xl border border-border bg-bg px-4 py-3 text-[15px] text-text outline-none placeholder:text-text-dim focus:border-accent"
            />
            <div className="mt-4">
              <p className="mb-2 text-[12px] font-medium text-text-dim">Try one of these</p>
              <div className="flex flex-wrap gap-2">
                {BRIEF_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setBriefText(ex)}
                    className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-[12px] text-text-dim transition-colors hover:border-border-bright hover:text-text"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={buildFromBrief}
            disabled={!briefText.trim() || building}
            className="flex w-fit items-center gap-2 rounded-full bg-accent px-6 py-3 font-display text-[15px] font-semibold text-bg transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {building ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg border-t-transparent" />
                {mode === 'ai' ? 'Asking Claude…' : 'Finding songs…'}
              </>
            ) : (
              <>
                <SparkIcon size={18} /> Find songs from this brief
              </>
            )}
          </button>
        </div>
      )}
      </>
    );
  }
}
