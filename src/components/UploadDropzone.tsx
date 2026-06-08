import { useRef, useState } from 'react';
import { FilmIcon, UploadIcon } from './icons';

interface UploadDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function UploadDropzone({ onFile, disabled }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      alert('Please drop a video file (MP4, MOV, WebM…).');
      return;
    }
    onFile(file);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) pick(e.dataTransfer.files);
      }}
      className={`group relative flex w-full flex-col items-center justify-center gap-4 rounded-[var(--radius-card)] border-2 border-dashed px-6 py-14 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        dragging
          ? 'border-accent bg-accent/5'
          : 'border-border bg-surface/40 hover:border-border-bright'
      }`}
    >
      <span className="absolute inset-0 grid-texture rounded-[var(--radius-card)] opacity-[0.12]" />
      <span className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface-2 transition-colors ${dragging ? 'text-accent' : 'text-text-dim group-hover:text-text'}`}>
        {dragging ? <UploadIcon size={28} /> : <FilmIcon size={28} />}
      </span>
      <span className="relative">
        <span className="block font-display text-lg text-text">
          {dragging ? 'Drop to analyze' : 'Drop a video clip'}
        </span>
        <span className="mt-1 block text-[13px] text-text-dim">
          or click to browse · MP4, MOV, WebM · analyzed locally in your browser
        </span>
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />
    </button>
  );
}
