// Empty state for the Tailored Output zone.
//
// Design: a muted paper-sheet mock with a ghost score ring in the top-right,
// sitting on top of a subtle dot pattern. The ring position matches where the
// real match-score ring lands once generation completes, so the empty state
// reads as a wireframe of the real output rather than decoration.
//
// The dot pattern echoes the landing page's closing-CTA texture, tying the
// app's output surface back to the marketing surface without depending on the
// landing page's separate token set — colors here use the app's ink-* scale.

export default function EmptyState() {
  return (
    <div
      className="relative flex h-full flex-col items-center justify-center gap-5 overflow-hidden rounded-xl border border-dashed border-ink-200 bg-white/50 p-8 text-center"
      style={{
        backgroundImage: 'radial-gradient(circle, rgb(228 228 231 / 0.6) 1px, transparent 1px)',
        backgroundSize: '14px 14px',
      }}
    >
      {/* Heading and subline, above the paper mock. */}
      <div className="relative z-10 max-w-sm">
        <h3 className="text-sm font-semibold tracking-[-0.01em] text-ink-900">
          Your Tailored Resume Will Appear Here
        </h3>
        <p className="mt-1 text-sm leading-snug text-ink-500">
          Paste or upload your resume on the left, paste a job description on the right, and click{' '}
          <span className="font-medium text-ink-700">Tailor My Resume</span>.
        </p>
      </div>

      {/* Paper mock: white sheet with placeholder lines and a ghost score ring. */}
      <div
        className="relative z-10 w-[74%] max-w-md rounded-md border border-ink-200 bg-white p-5 shadow-card"
        aria-hidden
      >
        {/* Ghost score ring — sits exactly where the real ring will render. */}
        <div className="absolute right-3 top-3 h-9 w-9 rounded-full border-[2.5px] border-ink-200" />

        {/* Header cluster: name-ish + contact-ish */}
        <div className="mb-4 space-y-1.5">
          <div className="h-2 w-2/5 rounded-sm bg-ink-900/10" />
          <div className="h-1.5 w-3/5 rounded-sm bg-ink-900/[0.06]" />
        </div>

        {/* Section cluster 1 */}
        <div className="mb-3 space-y-1">
          <div className="h-1.5 w-1/4 rounded-sm bg-ink-900/10" />
          <div className="h-1 w-11/12 rounded-sm bg-ink-900/[0.06]" />
          <div className="h-1 w-9/12 rounded-sm bg-ink-900/[0.06]" />
          <div className="h-1 w-10/12 rounded-sm bg-ink-900/[0.06]" />
        </div>

        {/* Section cluster 2 */}
        <div className="mb-3 space-y-1">
          <div className="h-1.5 w-1/4 rounded-sm bg-ink-900/10" />
          <div className="h-1 w-10/12 rounded-sm bg-ink-900/[0.06]" />
          <div className="h-1 w-8/12 rounded-sm bg-ink-900/[0.06]" />
        </div>

        {/* Section cluster 3 */}
        <div className="space-y-1">
          <div className="h-1.5 w-1/5 rounded-sm bg-ink-900/10" />
          <div className="h-1 w-11/12 rounded-sm bg-ink-900/[0.06]" />
          <div className="h-1 w-7/12 rounded-sm bg-ink-900/[0.06]" />
        </div>
      </div>
    </div>
  );
}
