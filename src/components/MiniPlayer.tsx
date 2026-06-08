import { useEffect, useRef, useState } from 'react';
import { useStore, useCurrentSong } from '../store/useStore';
import { resolvePreview } from '../lib/preview';
import { Waveform } from './Waveform';
import {
  CloseIcon,
  NextIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
} from './icons';

function fmt(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function MiniPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const song = useCurrentSong();
  const isPlaying = useStore((s) => s.isPlaying);
  const setPlaying = useStore((s) => s.setPlaying);
  const toggle = useStore((s) => s.toggle);
  const next = useStore((s) => s.next);
  const prev = useStore((s) => s.prev);
  const stop = useStore((s) => s.stop);
  const queue = useStore((s) => s.queue);
  const currentId = useStore((s) => s.currentId);
  const playSong = useStore((s) => s.playSong);

  const [src, setSrc] = useState<string | null>(null);
  const [art, setArt] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [resolving, setResolving] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  // Resolve preview whenever the current song changes.
  useEffect(() => {
    if (!song) {
      setSrc(null);
      setArt(null);
      return;
    }
    let cancelled = false;
    setResolving(true);
    setTime(0);
    resolvePreview(song).then((p) => {
      if (cancelled) return;
      setResolving(false);
      setArt(p.artworkUrl);
      if (p.previewUrl) {
        setSrc(p.previewUrl);
      } else {
        // No preview for this track — skip ahead so audition keeps flowing.
        setSrc(null);
        next();
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song?.id]);

  // Drive play/pause from store.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (isPlaying) {
      const p = audio.play();
      if (p) p.catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, src, setPlaying]);

  // Global spacebar = play/pause (ignored while typing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t &&
        (t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.isContentEditable);
      if (e.code === 'Space' && !typing && currentId) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, currentId]);

  const pct = duration ? (time / duration) * 100 : 0;

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = (Number(e.target.value) / 100) * duration;
    audio.currentTime = t;
    setTime(t);
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={src ?? undefined}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) =>
          setDuration(e.currentTarget.duration || 30)
        }
        onEnded={() => next()}
        onError={() => next()}
      />

      {/* Queue popover */}
      {queueOpen && queue.length > 0 && (
        <div className="fixed bottom-[84px] right-3 z-40 max-h-[50vh] w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-border bg-surface/95 p-2 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-dim">
              Up next · {queue.length}
            </span>
            <button
              onClick={() => setQueueOpen(false)}
              className="text-text-dim hover:text-text"
              aria-label="Close queue"
            >
              <CloseIcon size={16} />
            </button>
          </div>
          {queue.map((q) => (
            <button
              key={q.id}
              onClick={() => playSong(q, queue)}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2 ${
                q.id === currentId ? 'bg-surface-2' : ''
              }`}
            >
              <span className="h-7 w-7 shrink-0 overflow-hidden rounded">
                <Waveform seed={q.id} bars={6} playing={q.id === currentId && isPlaying} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] text-text">{q.title}</span>
                <span className="block truncate text-[11px] text-text-dim">{q.artist}</span>
              </span>
              {q.id === currentId && (
                <span className="text-[10px] font-semibold text-accent">NOW</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Docked player bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 backdrop-blur-xl">
        {/* progress line on the very top edge */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-surface-3">
          <div
            className="h-full bg-accent transition-[width] duration-150"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mx-auto flex h-[72px] max-w-[1400px] items-center gap-3 px-3 sm:gap-4 sm:px-5">
          {/* now playing */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-2">
              {art ? (
                <img src={art} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-2">
                  <Waveform seed={song?.id ?? 'idle'} bars={7} playing={isPlaying} />
                </div>
              )}
            </div>
            <div className="min-w-0">
              {song ? (
                <>
                  <p className="truncate text-[13px] font-medium text-text">{song.title}</p>
                  <p className="truncate text-[12px] text-text-dim">{song.artist}</p>
                </>
              ) : (
                <>
                  <p className="text-[13px] font-medium text-text">Nothing queued</p>
                  <p className="text-[12px] text-text-dim">Hit play on any track to audition it</p>
                </>
              )}
            </div>
          </div>

          {/* transport */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              onClick={prev}
              disabled={!song}
              aria-label="Previous track"
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-dim transition-colors hover:text-text disabled:opacity-40"
            >
              <PrevIcon size={20} />
            </button>
            <button
              onClick={toggle}
              disabled={!song || resolving}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-accent text-bg transition-transform hover:scale-105 disabled:opacity-50"
            >
              {resolving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg border-t-transparent" />
              ) : isPlaying ? (
                <PauseIcon size={22} />
              ) : (
                <PlayIcon size={22} />
              )}
            </button>
            <button
              onClick={next}
              disabled={!song}
              aria-label="Next track"
              className="flex h-9 w-9 items-center justify-center rounded-full text-text-dim transition-colors hover:text-text disabled:opacity-40"
            >
              <NextIcon size={20} />
            </button>
          </div>

          {/* scrubber (desktop) */}
          <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
            <span className="w-9 text-right text-[11px] text-text-dim mono-nums">{fmt(time)}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={pct}
              onChange={seek}
              disabled={!song}
              aria-label="Seek"
              className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-surface-3 accent-accent disabled:opacity-40"
              style={{
                background: `linear-gradient(to right, var(--color-accent) ${pct}%, var(--color-surface-3) ${pct}%)`,
              }}
            />
            <span className="w-9 text-[11px] text-text-dim mono-nums">{fmt(duration)}</span>
          </div>

          {/* queue toggle */}
          <button
            onClick={() => setQueueOpen((o) => !o)}
            disabled={queue.length === 0}
            aria-label="Toggle queue"
            className={`hidden h-9 items-center gap-1.5 rounded-full border px-3 text-[12px] transition-colors sm:flex disabled:opacity-40 ${
              queueOpen
                ? 'border-accent text-accent'
                : 'border-border text-text-dim hover:border-border-bright hover:text-text'
            }`}
          >
            <span className="flex h-3.5 w-3.5 items-end gap-[2px]">
              <span className="w-[2px] flex-1 rounded bg-current" style={{ height: '40%' }} />
              <span className="w-[2px] flex-1 rounded bg-current" style={{ height: '100%' }} />
              <span className="w-[2px] flex-1 rounded bg-current" style={{ height: '65%' }} />
            </span>
            Queue
          </button>

          {song && (
            <button
              onClick={stop}
              aria-label="Close player"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-text-dim transition-colors hover:text-text lg:flex"
            >
              <CloseIcon size={18} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}
