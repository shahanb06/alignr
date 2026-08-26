import MarkList from './ListItems';
import { CARD_LIFT, sectionRevealClass, useInViewOnce } from './motion';

const WARNINGS = [
  {
    title: 'Reordered Sections',
    body: 'When roles are resequenced for relevance, Alignr notes it in case strict chronology is expected.',
  },
  {
    title: 'Unsupported Claims',
    body: 'Requirements with no backing evidence in your resume are surfaced, never quietly written in.',
  },
  {
    title: 'Gaps Worth Addressing',
    body: 'Skills a role expects but your resume does not show, so you can prepare rather than be caught out.',
  },
];

function WarningsCard() {
  return (
    <div
      className={`rounded-2xl border border-charcoal/10 bg-white p-4 shadow-xl shadow-charcoal/5 sm:p-5 ${CARD_LIFT}`}
    >
      <div className="mb-4 px-2 pt-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">
          Recruiter warnings
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {WARNINGS.map((w) => (
          <div
            key={w.title}
            className="rounded-xl border border-caution-border bg-caution p-4"
          >
            <p className="text-sm font-semibold text-caution-ink">{w.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-caution-ink/75">{w.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FeatureRecruiter() {
  const [revealRef, inView] = useInViewOnce<HTMLElement>();
  return (
    <section
      ref={revealRef}
      className={`mx-auto max-w-6xl px-5 py-20 sm:px-8 ${sectionRevealClass(inView)}`}
    >
      <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Card first so it sits on the left at desktop, alternating from the prior section */}
        <div className="order-2 lg:order-1">
          <WarningsCard />
        </div>
        <div className="order-1 lg:order-2">
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.02em] text-charcoal sm:text-4xl">
            What A Recruiter Might Flag
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-charcoal/60">
            Alignr reviews the tailored result the way a real recruiter would, then hands the
            decision back to you.
          </p>
          <MarkList
            variant="check"
            className="mt-8"
            items={[
              'Surfaces real risks, not just keyword wins',
              'Explains the reasoning so you decide what to do',
            ]}
          />
        </div>
      </div>
    </section>
  );
}
