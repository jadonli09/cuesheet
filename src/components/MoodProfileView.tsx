import type { MoodProfile } from '../types';
import { tagLabel, ENERGY_LABEL } from '../data/vocab';
import { Chip } from './Chip';

function Meter({
  label,
  value,
  hint,
  accent = 'bg-accent',
}: {
  label: string;
  value: number; // 0–1
  hint?: string;
  accent?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[12px] font-medium text-text-dim">{label}</span>
        <span className="text-[12px] text-text mono-nums">{hint ?? `${Math.round(value * 100)}`}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div className={`h-full rounded-full ${accent}`} style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
      </div>
    </div>
  );
}

export function MoodProfileView({ profile }: { profile: MoodProfile }) {
  const v = profile.visual;
  const t = profile.transcript;
  const d = profile.derived;

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            {profile.source === 'video' ? 'Project Mood Profile' : 'Brief Profile'}
          </p>
          <h2 className="mt-1 font-display text-2xl text-text">{profile.label}</h2>
        </div>
        <Chip readOnly title={ENERGY_LABEL[d.energy]}>
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> {d.energy} energy
        </Chip>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Visual signals */}
        <div className="flex flex-col gap-5">
          {v ? (
            <>
              <div>
                <p className="mb-2 text-[12px] font-medium text-text-dim">Dominant palette</p>
                <div className="flex h-16 overflow-hidden rounded-xl border border-border">
                  {v.palette.length ? (
                    v.palette.map((sw, i) => (
                      <div
                        key={i}
                        title={`${sw.hex} · ${Math.round(sw.weight * 100)}%`}
                        style={{ backgroundColor: sw.hex, flexGrow: Math.max(0.05, sw.weight) }}
                        className="group relative flex items-end justify-center"
                      >
                        <span className="mb-1 rounded bg-black/50 px-1 text-[9px] text-white/80 opacity-0 transition-opacity group-hover:opacity-100 mono-nums">
                          {sw.hex}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="flex w-full items-center justify-center text-[12px] text-text-dim">
                      No palette extracted
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Meter label="Brightness" value={v.brightness} />
                <Meter label="Saturation" value={v.saturation} accent="bg-cool" />
                <Meter label="Warmth" value={v.warmth} accent="bg-warm" hint={v.warmth > 0.55 ? 'warm' : v.warmth < 0.45 ? 'cool' : 'neutral'} />
                <Meter label="Pace" value={v.pace} hint={`${v.cutsPerMinute} cuts/min`} />
              </div>
              <p className="text-[11px] text-text-dim">
                Sampled {v.framesSampled} frames · {v.pace > 0.6 ? 'fast-cut, energetic' : v.pace < 0.3 ? 'long-take, contemplative' : 'steady pacing'}
              </p>
            </>
          ) : (
            <p className="text-[13px] text-text-dim">
              Profile built from text only — no video signals.
            </p>
          )}
        </div>

        {/* Derived + transcript */}
        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-2 text-[12px] font-medium text-text-dim">Reads as</p>
            <div className="flex flex-wrap gap-1.5">
              {[...d.moods, ...d.scenes, ...d.settings].slice(0, 12).map((tok) => (
                <Chip readOnly key={tok}>
                  {tagLabel(tok)}
                </Chip>
              ))}
              {d.moods.length + d.scenes.length + d.settings.length === 0 && (
                <span className="text-[12px] text-text-dim">No strong signals detected.</span>
              )}
            </div>
          </div>

          {t && (
            <div>
              <p className="mb-2 flex items-center gap-2 text-[12px] font-medium text-text-dim">
                {t.source === 'whisper' ? 'Transcript keywords' : t.source === 'manual' ? 'Notes keywords' : 'Keywords'}
                <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-text-dim">
                  {t.source === 'whisper' ? 'Whisper' : t.source === 'manual' ? 'manual' : '—'}
                </span>
              </p>
              {t.keywords.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {t.keywords.map((k) => (
                    <Chip readOnly key={k}>
                      {k}
                    </Chip>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-text-dim">No speech detected.</p>
              )}
              {t.text && (
                <p className="mt-3 line-clamp-3 rounded-lg border border-border bg-bg/50 p-2.5 text-[12px] italic leading-relaxed text-text-dim">
                  “{t.text.slice(0, 220)}{t.text.length > 220 ? '…' : ''}”
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
