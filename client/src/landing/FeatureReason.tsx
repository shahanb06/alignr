import MarkList from './ListItems';
import { CARD_LIFT, sectionRevealClass, useInViewOnce } from './motion';

/** Neutral, generic representation of a single tracked edit. No real copy. */
function ChangeRecordCard() {
  return (
    <div
      className={`rounded-2xl border border-charcoal/10 bg-white p-6 shadow-xl shadow-charcoal/5 sm:p-7 ${CARD_LIFT}`}
    >
      <div className="mb-5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">
          Change record
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-positive-soft px-2.5 py-1 text-xs font-medium text-positive-ink">
          Grounded In Your Resume
        </span>
      </div>

      {/* Original block */}
      <div className="rounded-xl border border-charcoal/10 bg-paper p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-charcoal/40">
          Original
        </span>
        <div className="mt-3 space-y-2" aria-hidden="true">
          <div className="h-2.5 w-full rounded-full bg-charcoal/10" />
          <div className="h-2.5 w-4/5 rounded-full bg-charcoal/10" />
        </div>
      </div>

      {/* Revised block */}
      <div className="mt-3 rounded-xl border border-positive-border bg-positive-soft p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-positive-ink">
          Revised
        </span>
        <div className="mt-3 space-y-2" aria-hidden="true">
          <div className="h-2.5 w-full rounded-full bg-positive/25" />
          <div className="h-2.5 w-3/4 rounded-full bg-positive/25" />
        </div>
        <div className="mt-4 inline-flex rounded-md bg-white px-2.5 py-1 text-xs font-medium text-positive-ink">
          Phrasing aligned to the role
        </div>
      </div>

      {/* Reason line */}
      <div className="mt-5 border-t border-charcoal/5 pt-4">
        <p className="text-sm leading-relaxed text-charcoal/55">
          <span className="font-semibold text-charcoal/70">Reason:</span> wording mirrors the job
          description while the underlying meaning stays exactly as your resume stated it.
        </p>
      </div>
    </div>
  );
}

export default function FeatureReason() {
  const [revealRef, inView] = useInViewOnce<HTMLElement>();
  return (
    <section
      ref={revealRef}
      id="features"
      className={`mx-auto max-w-6xl px-5 py-20 sm:px-8 ${sectionRevealClass(inView)}`}
    >
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.02em] text-charcoal sm:text-4xl">
            A Reason For Every Change
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-charcoal/60">
            Every rewrite is transparent, so you always know what changed and why before you send
            it anywhere.
          </p>
          <MarkList
            variant="check"
            className="mt-8"
            items={[
              'See the original and the rewrite side by side',
              'Every edit carries a plain language rationale',
              'Nothing is altered without explanation',
            ]}
          />
        </div>
        <ChangeRecordCard />
      </div>
    </section>
  );
}
