import { motion } from 'framer-motion';

interface Props {
  label: string;
  history: string[];
}

export default function LoadingState({ label, history }: Props) {
  return (
    <div className="flex h-full flex-col items-start justify-start gap-5 rounded-xl border border-ink-200 bg-white p-6 shadow-card">
      <div className="flex items-center gap-2.5">
        <motion.span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full bg-ink-900"
          animate={{ scale: [0.85, 1.05, 0.85], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <h3 className="text-sm font-semibold tracking-[-0.01em] text-ink-900">Tailoring your resume…</h3>
      </div>

      <ol className="space-y-2 text-sm">
        {history.map((entry, i) => {
          const isCurrent = i === history.length - 1 && entry === label;
          return (
            <li key={`${entry}-${i}`} className="flex items-start gap-2">
              {isCurrent ? (
                <motion.span
                  aria-hidden
                  className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-ink-900"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                />
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 text-emerald-600"
                  aria-hidden
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              <span className={isCurrent ? 'text-ink-900' : 'text-ink-500'}>{entry}</span>
            </li>
          );
        })}
      </ol>

      <p className="text-xs leading-relaxed text-ink-500">
        Honest tailoring takes a few seconds. We're parsing the job description, matching evidence in
        your resume, and rewriting only what's already supported by your source.
      </p>
    </div>
  );
}
