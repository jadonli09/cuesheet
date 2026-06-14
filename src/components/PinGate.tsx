import { useCallback, useEffect, useRef, useState } from 'react';
import { BackspaceIcon, LockIcon, SparkIcon, UnlockIcon } from './icons';
import { CODE_LEN as LEN, verifyCode } from '../lib/pin';

type Status = 'idle' | 'checking' | 'error' | 'success';

interface PinGateProps {
  /** Called once the unlock animation has finished. */
  onUnlock: () => void;
  /** Headline shown above the keypad. */
  title?: string;
  /** Sub-line explaining what's behind the gate. */
  subtitle?: string;
}

/**
 * The access gate that stands in front of the AI tools. A hardware-style
 * keypad + segmented readout. Enter 0102 and the console unlocks with a
 * burst, then dissolves to reveal the tools.
 */
export function PinGate({
  onUnlock,
  title = 'Enter access code',
  subtitle = 'The AI cue engine is restricted. Punch in your 4-digit code to open the room.',
}: PinGateProps) {
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [attempts, setAttempts] = useState(0);
  const [pressed, setPressed] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
  };

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const submit = useCallback(
    async (code: string) => {
      setStatus('checking');
      const ok = await verifyCode(code);
      if (ok) {
        setStatus('success');
        later(onUnlock, 1150);
      } else {
        setStatus('error');
        setAttempts((a) => a + 1);
        later(() => {
          setValue('');
          setStatus('idle');
        }, 460);
      }
    },
    [onUnlock],
  );

  const push = useCallback(
    (digit: string) => {
      if (status !== 'idle') return;
      setValue((prev) => {
        if (prev.length >= LEN) return prev;
        const next = prev + digit;
        if (next.length === LEN) later(() => void submit(next), 180);
        return next;
      });
      setPressed(digit);
      later(() => setPressed((p) => (p === digit ? null : p)), 180);
    },
    [status, submit],
  );

  const back = useCallback(() => {
    if (status !== 'idle') return;
    setValue((p) => p.slice(0, -1));
  }, [status]);

  // Physical keyboard support.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        push(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        back();
      } else if (e.key === 'Escape') {
        setValue('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [push, back]);

  const success = status === 'success';
  const busy = success || status === 'checking';

  return (
    <div className="relative flex items-center justify-center overflow-hidden py-4">
      {/* Ambient drifting signal lines behind the console */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-40">
        <div className="absolute left-1/2 top-1/2 h-[280px] w-[1400px] -translate-x-1/2 -translate-y-1/2">
          <svg
            viewBox="0 0 1400 280"
            className="animate-signal-drift h-full w-[200%]"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M0 140 Q 87 40 175 140 T 350 140 T 525 140 T 700 140 T 875 140 T 1050 140 T 1225 140 T 1400 140"
              fill="none"
              stroke="var(--color-signal)"
              strokeWidth="1.5"
              opacity="0.5"
            />
            <path
              d="M0 170 Q 87 250 175 170 T 350 170 T 525 170 T 700 170 T 875 170 T 1050 170 T 1225 170 T 1400 170"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="1.5"
              opacity="0.4"
            />
          </svg>
        </div>
      </div>

      <div
        className={`relative w-full max-w-[420px] ${success ? 'animate-gate-dissolve' : ''}`}
      >
        <div className="panel relative overflow-hidden rounded-[24px] border border-border-bright bg-surface/70 px-7 py-7 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]">
          {/* corner registration ticks — instrument-panel detail */}
          <Ticks />

          {/* Lock badge + bursts */}
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="relative mb-4 flex h-14 w-14 items-center justify-center">
              {success && (
                <>
                  <span className="animate-unlock-ring absolute inset-0 rounded-full border-2 border-accent" />
                  <span
                    className="animate-unlock-ring absolute inset-0 rounded-full border-2 border-signal"
                    style={{ animationDelay: '120ms' }}
                  />
                </>
              )}
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-2xl border transition-all duration-500 ${
                  success
                    ? 'border-accent bg-accent text-bg glow-accent'
                    : status === 'error'
                      ? 'border-warm/60 bg-warm/10 text-warm'
                      : 'animate-breathe border-signal/40 bg-signal/10 text-signal'
                }`}
              >
                {success ? <UnlockIcon size={28} /> : <LockIcon size={26} />}
              </span>
            </div>

            <p className={`kicker mb-2 ${success ? 'text-accent' : 'text-signal'}`}>
              {success ? 'Access granted' : 'Restricted · AI room'}
            </p>
            <h2 className="font-display text-2xl text-text">
              {success ? 'Welcome in.' : title}
            </h2>
            <p className="mt-2 max-w-[300px] text-[13px] leading-relaxed text-text-dim text-balance">
              {success
                ? 'Spinning up the cue engine…'
                : subtitle}
            </p>
          </div>

          {/* Segmented readout */}
          <div
            className={`mb-6 flex justify-center gap-3 ${status === 'error' ? 'animate-shake' : ''}`}
          >
            {Array.from({ length: LEN }).map((_, i) => {
              const filled = i < value.length;
              const state = success ? 'success' : status === 'error' ? 'error' : 'idle';
              return (
                <div
                  key={i}
                  className={`relative flex h-16 w-14 items-center justify-center rounded-xl border font-mono text-2xl transition-colors duration-200 ${
                    state === 'success'
                      ? 'border-accent bg-accent/15 text-accent'
                      : state === 'error'
                        ? 'border-warm/70 bg-warm/10 text-warm'
                        : filled
                          ? 'border-signal/70 bg-signal/10 text-signal'
                          : 'border-border bg-bg/60 text-text-dim'
                  }`}
                >
                  {filled ? (
                    <span key={value[i] + i} className="animate-pin-pop">
                      {value[i]}
                    </span>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                  )}
                  {/* active-cell caret */}
                  {!success &&
                    status === 'idle' &&
                    i === value.length && (
                      <span className="absolute bottom-2 h-[2px] w-6 animate-breathe rounded-full bg-signal" />
                    )}
                </div>
              );
            })}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <KeypadButton
                key={d}
                label={d}
                pressed={pressed === d}
                disabled={busy}
                onClick={() => push(d)}
              />
            ))}
            <KeypadButton
              label="clear"
              variant="ghost"
              disabled={busy}
              onClick={() => setValue('')}
            />
            <KeypadButton
              label="0"
              pressed={pressed === '0'}
              disabled={busy}
              onClick={() => push('0')}
            />
            <KeypadButton
              icon={<BackspaceIcon size={20} />}
              label="delete"
              variant="ghost"
              disabled={busy}
              onClick={back}
            />
          </div>

          {/* Status footer — never reveals the code */}
          <div className="mt-6 flex min-h-[20px] items-center justify-center text-center">
            {status === 'error' ? (
              <p className="text-[12.5px] font-medium text-warm">
                Wrong code — try again{attempts > 1 ? ` (${attempts} attempts)` : ''}.
              </p>
            ) : success ? (
              <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-accent">
                <SparkIcon size={13} /> Unlocking the AI cue engine
              </p>
            ) : status === 'checking' ? (
              <p className="text-[12.5px] font-medium text-signal">Verifying…</p>
            ) : (
              <p className="text-[12px] text-text-dim">
                Ask the project owner for the access code.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KeypadButton({
  label,
  icon,
  pressed,
  disabled,
  variant = 'solid',
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  variant?: 'solid' | 'ghost';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className={`flex h-14 select-none items-center justify-center rounded-xl border font-mono text-xl transition-all duration-150 active:scale-95 disabled:opacity-40 ${
        pressed ? 'animate-pad-press' : ''
      } ${
        variant === 'ghost'
          ? 'border-border bg-transparent text-text-dim hover:border-border-bright hover:text-text'
          : 'border-border bg-surface-2 text-text shadow-[0_2px_0_rgba(0,0,0,0.4)] hover:border-signal/60 hover:bg-surface-3 hover:text-signal'
      }`}
    >
      {icon ?? (variant === 'ghost' ? <span className="text-[11px] uppercase tracking-wider">{label}</span> : label)}
    </button>
  );
}

/** Four corner registration ticks for instrument-panel flavor. */
function Ticks() {
  const corner = 'absolute h-3 w-3 border-signal/30';
  return (
    <div className="pointer-events-none absolute inset-3" aria-hidden="true">
      <span className={`${corner} left-0 top-0 border-l border-t`} />
      <span className={`${corner} right-0 top-0 border-r border-t`} />
      <span className={`${corner} bottom-0 left-0 border-b border-l`} />
      <span className={`${corner} bottom-0 right-0 border-b border-r`} />
    </div>
  );
}
