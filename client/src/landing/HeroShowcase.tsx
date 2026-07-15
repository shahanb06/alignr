const CALLOUTS = [
  'honest estimate of fit',
  'flagged, never added',
  'every change, with a reason',
];

function CalloutPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-charcoal px-3 py-1.5 text-xs font-medium text-paper shadow-lg shadow-charcoal/10">
      <span className="h-1.5 w-1.5 rounded-full bg-paper/60" aria-hidden="true" />
      {label}
    </span>
  );
}

export default function HeroShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
      <div className="relative">
        {/* Floating white frame */}
        <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white p-2 shadow-2xl shadow-charcoal/10 sm:p-3">
          <div className="overflow-hidden rounded-xl border border-charcoal/5">
            <img
              src="/results-summary.png"
              alt="Alignr results summary showing a match score, keywords matched count, matched keyword pills, and honestly listed missing skills"
              className="w-full"
            />
          </div>
        </div>

        {/* Callout labels for large screens, positioned around the frame */}
        <div className="pointer-events-none absolute -left-3 top-10 hidden lg:block">
          <CalloutPill label={CALLOUTS[0]} />
        </div>
        <div className="pointer-events-none absolute -right-3 top-28 hidden lg:block">
          <CalloutPill label={CALLOUTS[1]} />
        </div>
        <div className="pointer-events-none absolute -bottom-4 left-1/2 hidden -translate-x-1/2 lg:block">
          <CalloutPill label={CALLOUTS[2]} />
        </div>
      </div>

      {/* Callout labels for small screens, stacked below the frame */}
      <div className="mt-5 flex flex-wrap justify-center gap-2 lg:hidden">
        {CALLOUTS.map((label) => (
          <CalloutPill key={label} label={label} />
        ))}
      </div>
    </section>
  );
}
