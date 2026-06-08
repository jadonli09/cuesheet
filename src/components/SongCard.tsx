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

interface SongCardProps {
  song: Song;
  /** When set, the card shows match score + rationale + matched chips. */
  recommendation?: Recommendation;
  /** The queue to load into the player when this card is played. */
  queue?: Song[];
  onSimilar?: (song: Song) => void;
}

export function SongCard({ song, recommendation, queue, onSimilar }: SongCardProps) {
  const [ref, inView] = useInView<HTMLElement>();
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

  const handlePlay = () => {
    if (noPreview) return;
    if (isCurrent) toggle();
    else playSong(song, queue ?? [song]);
  };

  const showArt = preview?.artworkUrl && !artFailed;

  return (
    <article
      ref={ref}
      className={`group flex flex-col overflow-hidden rounded-[var(--radius-card)] border bg-surface transition-colors duration-200 ${
        isCurrent ? 'border-accent/70' : 'border-border hover:border-border-bright'
      }`}
    >
      {/* ── Artwork / waveform ─────────────────────────────────────────────── */}
      <div className="relative aspect-square w-full overflow-hidden bg-surface-2">
        {showArt ? (
          <img
            src={preview!.artworkUrl!}
            alt={`${song.title} cover art`}
            loading="lazy"
            decoding="async"
            onError={() => setArtFailed(true)}
            className={`h-full w-full object-cover transition-transform duration-500 ${
              playing ? 'scale-[1.04]' : 'group-hover:scale-[1.03]'
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-2 to-surface">
            <div className="h-1/2 w-3/4 opacity-70">
              <Waveform seed={song.id} bars={22} playing={playing} />
            </div>
          </div>
        )}

        {/* gradient + animated waveform strip while playing */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        {showArt && (
          <div
            className={`pointer-events-none absolute inset-x-3 bottom-3 h-8 transition-opacity duration-300 ${
              playing ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'
            }`}
          >
            <Waveform seed={song.id} bars={32} playing={playing} />
          </div>
        )}

        {/* score badge */}
        {recommendation && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-bg/80 px-2 py-1 text-[11px] font-semibold text-accent backdrop-blur mono-nums">
            {recommendation.fromAI && <SparkIcon size={12} />}
            {recommendation.score}
            <span className="text-text-dim">match</span>
          </div>
        )}

        {/* play button */}
        <button
          type="button"
          onClick={handlePlay}
          disabled={noPreview}
          aria-label={
            noPreview
              ? 'No preview available'
              : playing
                ? `Pause ${song.title}`
                : `Play ${song.title}`
          }
          title={noPreview ? 'No 30s preview found — out-links still work' : undefined}
          className={`absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-full text-bg transition-all duration-200 ${
            noPreview
              ? 'cursor-not-allowed bg-surface-3 text-text-dim opacity-80'
              : playing
                ? 'bg-accent glow-accent'
                : 'translate-y-1 bg-accent opacity-0 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100'
          }`}
        >
          {loading && !preview ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg border-t-transparent" />
          ) : playing ? (
            <PauseIcon size={22} />
          ) : (
            <PlayIcon size={22} />
          )}
        </button>
      </div>

      {/* ── Meta ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-[15px] leading-tight text-text" title={song.title}>
            {song.title}
          </h3>
          <p className="mt-0.5 truncate text-[13px] text-text-dim" title={song.artist}>
            {song.artist}
            {song.year ? <span className="text-text-dim/60"> · {song.year}</span> : null}
          </p>
        </div>

        {/* tags / meta */}
        <div className="flex flex-wrap gap-1.5">
          <Chip readOnly title={ENERGY_LABEL[song.energy]}>
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
          <Chip readOnly>{tagLabel(song.genre)}</Chip>
          {(recommendation?.matched.length
            ? recommendation.matched.slice(0, 2)
            : song.moods.slice(0, 2).map(tagLabel)
          ).map((m) => (
            <Chip readOnly key={m}>
              {m}
            </Chip>
          ))}
        </div>

        {recommendation && (
          <p className="text-[12.5px] leading-relaxed text-text-dim text-balance">
            {recommendation.rationale}
          </p>
        )}

        {/* actions */}
        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5 text-text-dim">
            <a className="transition-colors hover:text-text" href={links.apple} target="_blank" rel="noreferrer" title="Search on Apple Music">
              <span className="text-[11px] font-medium">Apple</span>
            </a>
            <span className="text-border-bright">·</span>
            <a className="transition-colors hover:text-text" href={links.spotify} target="_blank" rel="noreferrer" title="Search on Spotify">
              <span className="text-[11px] font-medium">Spotify</span>
            </a>
            <span className="text-border-bright">·</span>
            <a className="inline-flex items-center gap-0.5 transition-colors hover:text-text" href={links.youtube} target="_blank" rel="noreferrer" title="Search on YouTube">
              <span className="text-[11px] font-medium">YouTube</span>
              <ExternalIcon size={11} />
            </a>
          </div>

          <div className="flex items-center gap-1">
            {onSimilar && (
              <button
                type="button"
                onClick={() => onSimilar(song)}
                title="Find similar songs"
                aria-label="Find similar songs"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-dim transition-colors hover:border-border-bright hover:text-text"
              >
                <SparkIcon size={15} />
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
              {isShortlisted ? <CheckIcon size={15} /> : <PlusIcon size={15} />}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
