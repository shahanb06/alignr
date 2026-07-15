const MATCHED = [
  'Market and competitor research',
  'Brand strategy support',
  'Marketing project coordination and execution',
  'Presentations and reports creation',
  'Collaborate with internal teams and external partners',
  'Monitor industry trends and recommendations',
  'Brainstorming and creative ideation',
  'Pursuing degree in Marketing, Business, Communications, or related field',
  'Entrepreneurial mindset and proactive approach',
  'Organizational and project management abilities',
  'Microsoft Office Suite (Excel, PowerPoint, Word)',
  'Strong written and verbal communication skills',
  'Ability to work independently and collaboratively',
];

const MISSING = ['Track project timelines and deliverables', 'Packaging transitions'];

function CalloutPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-charcoal px-3 py-1.5 text-xs font-medium text-paper shadow-lg shadow-charcoal/20">
      <span className="h-1.5 w-1.5 rounded-full bg-paper/60" aria-hidden="true" />
      {label}
    </span>
  );
}

function ScoreRing() {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = 0.76;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true" className="shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#E4E4E1" strokeWidth="4" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="#1F9D57"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform="rotate(-90 36 36)"
      />
      <text
        x="36"
        y="36"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-charcoal text-[18px] font-semibold"
      >
        76
      </text>
    </svg>
  );
}

function Pill({ label, tone }: { label: string; tone: 'matched' | 'missing' }) {
  const styles =
    tone === 'matched'
      ? 'bg-positive-soft border-positive-border text-positive-ink'
      : 'bg-negative-soft border-negative-border text-negative-ink';
  const dot = tone === 'matched' ? 'bg-positive' : 'bg-negative';
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium leading-tight ${styles}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-charcoal/10 bg-white p-5 sm:p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-charcoal">{title}</h3>
      <p className="mt-1 text-sm text-charcoal/50">{subtitle}</p>
      <div className="mt-5 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function HeroShowcase() {
  return (
    <section
      className="mx-auto max-w-6xl px-5 pb-20 sm:px-8"
      aria-label="Example of an Alignr tailoring result"
    >
      <div className="relative">
        {/* Floating white frame */}
        <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white p-2 shadow-2xl shadow-charcoal/10 sm:p-3">
          <div className="rounded-xl bg-[#F7F6F3] p-4 sm:p-6">
            {/* Score row */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl border border-charcoal/10 bg-white px-5 py-4 sm:px-6">
              <div className="flex items-center gap-4">
                <ScoreRing />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">
                    Match score
                  </p>
                  <p className="text-sm text-charcoal/60">Honest estimate of fit</p>
                </div>
              </div>
              <div className="hidden h-10 w-px bg-charcoal/10 sm:block" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">
                  Keywords matched
                </p>
                <p className="text-sm text-charcoal/60">
                  <span className="text-base font-semibold text-charcoal">13</span> / 15 Job
                  Description Keywords
                </p>
              </div>
            </div>

            {/* Panels — sized to content so Missing skills is never mostly empty */}
            <div className="mt-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <Panel title="Matched keywords" subtitle="Backed by evidence in your resume">
                {MATCHED.map((k) => (
                  <Pill key={k} label={k} tone="matched" />
                ))}
              </Panel>

              <div className="relative">
                {/* Callout sits directly on the Missing skills panel */}
                <div className="pointer-events-none absolute -top-3 right-5 z-10 hidden lg:block">
                  <CalloutPill label="flagged, never added" />
                </div>
                <Panel
                  title="Missing skills"
                  subtitle="Listed honestly — not added to your resume"
                >
                  {MISSING.map((k) => (
                    <Pill key={k} label={k} tone="missing" />
                  ))}
                </Panel>
              </div>
            </div>
          </div>
        </div>

        {/* Callout anchored near the score row */}
        <div className="pointer-events-none absolute -left-3 top-8 z-10 hidden lg:block">
          <CalloutPill label="honest estimate of fit" />
        </div>
        {/* Callout overlapping the frame near the matched content */}
        <div className="pointer-events-none absolute -left-3 bottom-14 z-10 hidden lg:block">
          <CalloutPill label="every change, with a reason" />
        </div>
      </div>

      {/* Callout labels for small screens, stacked below the frame */}
      <div className="mt-5 flex flex-wrap justify-center gap-2 lg:hidden">
        <CalloutPill label="honest estimate of fit" />
        <CalloutPill label="flagged, never added" />
        <CalloutPill label="every change, with a reason" />
      </div>
    </section>
  );
}
