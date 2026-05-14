export default function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-ink-200 bg-white/50 p-10 text-center">
      <div className="rounded-lg border border-ink-200 bg-white p-2.5 shadow-card">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-ink-500"
          aria-hidden
        >
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M3 9h18" />
          <path d="M9 21V9" />
        </svg>
      </div>
      <div className="max-w-sm">
        <h3 className="text-sm font-semibold tracking-[-0.01em] text-ink-900">Your tailored resume will appear here</h3>
        <p className="mt-1 text-sm leading-snug text-ink-500">
          Paste or upload your resume on the left, paste a job description on the right, and click{' '}
          <span className="font-medium text-ink-700">Tailor My Resume</span>. You'll see matched
          keywords, recruiter warnings, and a diff of every change.
        </p>
      </div>
    </div>
  );
}
