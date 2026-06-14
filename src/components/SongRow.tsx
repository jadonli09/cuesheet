import { useState } from 'react';
import type { Recommendation, Song } from '../types';
import { useStore } from '../store/useStore';
import { usePreview } from '../hooks/usePreview';
import { useInView } from '../hooks/useInView';
import { outLinks } from '../lib/links';
import { tagLabel, ENERGY_LABEL } from '../data/vocab';
import { Waveform } from './Waveform';
import { Chip } from './Chip';
import {
  CheckIcon,
  ExternalIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  SparkIcon,
} from './icons';

interface SongRowProps {
  song: Song;
  recommendation?: Recommendation;
  queue?: Song[];
  onSimilar?: (song: Song) => void;
}

/** Compact horizontal row — the "Rows" layout alternative to the card grid. */
export function SongRow({ song, recommendation, queue, onSimilar }: SongRowProps) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const { preview, loading } = usePreview(song, inView);

  const currentId = useStore((s) => s.currentId);
  const isPlaying = useStore((s) => s.isPlaying);
  const playSong = useStore((s) => s.playSong);
  const toggle = useStore((s) => s.toggle);
  const isShortlisted = useStore((s) => s.isShortlisted(song.id));
  const toggleShortlist = useStore((s) => s.toggleShortlist);

  const [artFailed, setArtFailed] = useState(false);

  const isCurrent = currentId === song.id;
  const playing = isCurrent && isPlaying;
  const noPreview = preview !== null && !preview.previewUrl;
  const links = outLinks(song);
  const showArt = preview?.artworkUrl && !artFailed;

  const handlePlay = () => {
    if (noPreview) return;
    if (isCurrent) toggle();
    else playSong(song, queue ?? [song]);
  };

  const tags = recommendation?.matched.length
    ? recommendation.matched.slice(0, 3)
    : song.moods.slice(0, 3).map(tagLabel);

  return (
    <div
      ref={ref}
      className={`group flex items-center gap-3 rounded-2xl border bg-surface px-2.5 py-2 transition-colors ${
        isCurrent ? 'border-accent/60' : 'border-border hover:border-border-bright'
      }`}
    >
      {/* thumb + play */}
      <button
        onClick={handlePlay}
        title={noPreview ? 'No 30s preview found — out-links still work' : undefined}
        aria-label={playing ? 'Pause' : 'Play preview'}
        className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2 ${
          noPreview ? 'cursor-not-allowed' : ''
        }`}
      >
        {showArt ? (
          <img
            src={preview!.artworkUrl!}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setArtFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-1/2 w-3/4 opacity-70">
              <Waveform seed={song.id} bars={12} playing={playing} />
            </div>
          </div>
        )}
        <span
          className={`absolute inset-0 flex items-center justify-center bg-black/45 text-white transition-opacity ${
            playing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {loading && !preview ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : playing ? (
            <PauseIcon size={16} />
          ) : (
            <PlayIcon size={16} />
          )}
        </span>
      </button>

      {/* title / artist */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[14px] leading-tight text-text" title={song.title}>
          {song.title}
        </p>
        <p className="truncate text-[12px] text-text-dim" title={song.artist}>
          {song.artist}
          {song.year ? <span className="text-text-dim/60"> · {song.year}</span> : null}
        </p>
      </div>

      {/* tags — progressively revealed as the row widens */}
      <div className="hidden shrink-0 items-center gap-1 md:flex">
        <Chip readOnly size="sm" title={ENERGY_LABEL[song.energy]}>
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              song.energy === 'high'
                ? 'bg-accent'
                : song.energy === 'medium'
                  ? 'bg-cool'
                  : 'bg-text-dim'
            }`}
          />
          {song.energy}
          {song.bpm ? <span className="text-text-faint mono-nums"> {song.bpm}</span> : null}
        </Chip>
        <Chip readOnly size="sm">{tagLabel(song.genre)}</Chip>
        {tags.map((m) => (
          <Chip readOnly size="sm" key={m} className="hidden lg:inline-flex">
            {m}
          </Chip>
        ))}
      </div>

      {/* actions */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden items-center gap-2 text-text-dim sm:flex">
          <a
            className="text-[11px] font-medium transition-colors hover:text-text"
            href={links.spotify}
            target="_blank"
            rel="noreferrer"
            title="Search on Spotify"
          >
            Spotify
          </a>
          <a
            className="inline-flex items-center gap-0.5 text-[11px] font-medium transition-colors hover:text-text"
            href={links.youtube}
            target="_blank"
            rel="noreferrer"
            title="Search on YouTube"
          >
            YouTube
            <ExternalIcon size={10} />
          </a>
        </div>
        {onSimilar && (
          <button
            type="button"
            onClick={() => onSimilar(song)}
            title="Find similar songs"
            aria-label="Find similar songs"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-dim transition-colors hover:border-border-bright hover:text-text"
          >
            <SparkIcon size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={() => toggleShortlist(song)}
          aria-pressed={isShortlisted}
          title={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
          aria-label={isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
          className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
            isShortlisted
              ? 'border-accent bg-accent text-bg'
              : 'border-border text-text-dim hover:border-border-bright hover:text-text'
          }`}
        >
          {isShortlisted ? <CheckIcon size={14} /> : <PlusIcon size={14} />}
        </button>
      </div>
    </div>
  );
}
