import CtaButton from './CtaButton';

export default function Hero() {
  return (
    <section id="top" className="mx-auto max-w-6xl px-5 pt-16 pb-10 sm:px-8 sm:pt-24">
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Left: pill + giant floating wordmark */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-positive-soft px-3.5 py-1.5 text-sm font-medium text-positive-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-positive" aria-hidden="true" />
            Evidence-based AI resume tailoring
          </span>
          <h1
            className="mt-6 font-semibold leading-[0.9] tracking-[-0.04em] text-charcoal"
            style={{ fontSize: 'clamp(4.5rem, 18vw, 12rem)' }}
          >
            Alignr
          </h1>
        </div>

        {/* Right: headline paragraph + supporting copy */}
        <div className="lg:pt-6">
          <p className="text-balance text-2xl font-medium leading-snug tracking-[-0.01em] text-charcoal sm:text-3xl">
            Most AI tools will invent experience to win keywords. Alignr rewrites only what your
            resume already supports, surfaces what&apos;s missing, and gives a reason for every
            change.
          </p>
          <p className="mt-5 text-base leading-relaxed text-charcoal/60">
            No account needed. Just paste your resume and a job description.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <CtaButton size="lg">Tailor my resume</CtaButton>
            <a
              href="#features"
              className="text-sm font-medium text-charcoal underline decoration-charcoal/25 underline-offset-4 transition-colors hover:decoration-charcoal"
            >
              See how it works
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
