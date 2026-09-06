import { useEffect, useRef, useState } from 'react';
import type { RewriteStyle } from '../lib/types';

interface Props {
  jobDescription: string;
  onChangeJobDescription: (s: string) => void;
  targetRole: string;
  onChangeTargetRole: (s: string) => void;
  rewriteStyle: RewriteStyle;
  onChangeRewriteStyle: (s: RewriteStyle) => void;
  disabled: boolean;
}

const MAX_JD_CHARS = 10000;

const STYLE_OPTIONS: { value: RewriteStyle; label: string; description: string }[] = [
  {
    value: 'conservative',
    label: 'Light',
    description: 'Polish bullets only. Structure untouched.',
  },
  {
    value: 'balanced',
    label: 'Balanced',
    description: 'Rewrites bullets and regroups skills.',
  },
  {
    value: 'strong',
    label: 'Aggressive',
    description: 'Restructures, retitles, reorders.',
  },
];

export default function JobDescriptionPanel({
  jobDescription,
  onChangeJobDescription,
  targetRole,
  onChangeTargetRole,
  rewriteStyle,
  onChangeRewriteStyle,
  disabled,
}: Props) {
  return (
    <section className="flex h-full flex-col rounded-xl border border-ink-200 bg-white shadow-card">
      <header className="flex items-center justify-between border-b border-ink-200 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-ink-900 text-[10px] font-bold text-white transition-transform duration-150 ease-out hover:scale-[1.02]">
            2
          </span>
          <h2 className="text-sm font-semibold tracking-[-0.01em] text-ink-900">Job Description</h2>
        </div>
        <span className="text-xs tabular-nums text-ink-500">
          {jobDescription.length.toLocaleString()} / {MAX_JD_CHARS.toLocaleString()}
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="target-role"
              className="text-xs font-medium uppercase tracking-wide text-ink-500"
            >
              Target role <span className="font-normal normal-case text-ink-400">(optional)</span>
            </label>
            <input
              id="target-role"
              type="text"
              value={targetRole}
              onChange={(e) => onChangeTargetRole(e.target.value.slice(0, 120))}
              disabled={disabled}
              placeholder="Target role"
              className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-ink-400 disabled:opacity-60"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="rewrite-style"
              className="text-xs font-medium uppercase tracking-wide text-ink-500"
            >
              Tailoring style
            </label>
            <StyleDropdown
              value={rewriteStyle}
              onChange={onChangeRewriteStyle}
              disabled={disabled}
            />
            <div>
              <p className="text-xs text-ink-500">
                {STYLE_OPTIONS.find((o) => o.value === rewriteStyle)?.description}
              </p>
              <p className="mt-1 text-xs text-ink-400">
                Match score reflects your underlying fit.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          <label
            htmlFor="jd-text"
            className="text-xs font-medium uppercase tracking-wide text-ink-500"
          >
            Paste the job description
          </label>
          <textarea
            id="jd-text"
            value={jobDescription}
            onChange={(e) => onChangeJobDescription(e.target.value.slice(0, MAX_JD_CHARS))}
            disabled={disabled}
            spellCheck={false}
            placeholder="Paste the full job description, including responsibilities and required skills."
            className="thin-scroll flex-1 min-h-[260px] resize-none rounded-lg border border-ink-200 bg-white p-3 font-mono text-[12.5px] leading-relaxed text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-ink-400 disabled:opacity-60"
          />
        </div>
      </div>
    </section>
  );
}


// Custom tailoring-style dropdown. A native <select> can't be styled — its
// option list is drawn by the OS (the gray macOS menu) — so we render our own
// button + panel to match the app's surface. Behavior mirrors a select: click
// to open, click an option to choose, click outside or Escape to close.
function StyleDropdown({
  value,
  onChange,
  disabled,
}: {
  value: RewriteStyle;
  onChange: (s: RewriteStyle) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = STYLE_OPTIONS.find((o) => o.value === value) ?? STYLE_OPTIONS[1];

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id="rewrite-style"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-lg border border-ink-200 bg-white px-3 py-2 text-left text-sm text-ink-900 outline-none transition hover:border-ink-300 focus:border-ink-400 disabled:opacity-60"
      >
        <span>{current.label}</span>
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 text-ink-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 7.5 10 12.5 15 7.5" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-lg border border-ink-200 bg-white p-1 shadow-lg"
        >
          {STYLE_OPTIONS.map((opt) => {
            const selected = opt.value === value;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left transition ${
                    selected ? 'bg-emerald-50' : 'hover:bg-ink-50'
                  }`}
                >
                  <span className="flex items-center justify-between text-sm text-ink-900">
                    {opt.label}
                    {selected && (
                      <svg viewBox="0 0 20 20" className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M4 10.5 8 14.5 16 6" />
                      </svg>
                    )}
                  </span>
                  <span className="text-xs leading-snug text-ink-500">{opt.description}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
