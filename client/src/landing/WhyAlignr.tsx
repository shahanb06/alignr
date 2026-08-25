import MarkList from './ListItems';
import { CARD_LIFT, CARD_LIFT_FLAT, sectionRevealClass, useInViewOnce } from './motion';

export default function WhyAlignr() {
  const [revealRef, inView] = useInViewOnce<HTMLElement>();
  return (
    <section
      ref={revealRef}
      id="why"
      className={`mx-auto max-w-6xl px-5 py-20 sm:px-8 ${sectionRevealClass(inView)}`}
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-[-0.02em] text-charcoal sm:text-4xl">
          Why Alignr
        </h2>
        <p className="mt-3 text-lg text-charcoal/60">The difference is what it won&apos;t do.</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Muted "other tools" card */}
        <div
          className={`rounded-2xl border border-charcoal/10 bg-charcoal/[0.03] p-7 sm:p-8 ${CARD_LIFT_FLAT}`}
        >
          <h3 className="text-lg font-semibold text-charcoal/70">Typical AI resume tools</h3>
          <MarkList
            variant="cross"
            className="mt-6"
            items={[
              'Invent experience and metrics to hit keywords',
              "Rewrite silently, so you can't tell what changed",
              'Optimize for the bot, not a real recruiter',
              'Leave you unable to defend it in an interview',
            ]}
          />
        </div>

        {/* Emphasized Alignr card */}
        <div
          className={`rounded-2xl border border-charcoal/15 bg-white p-7 shadow-xl shadow-charcoal/5 sm:p-8 ${CARD_LIFT}`}
        >
          <div className="flex items-center gap-2.5">
            <img src="/alignr-logo.png" alt="Alignr" className="h-6 w-auto" />
            <h3 className="text-lg font-semibold text-charcoal">Alignr</h3>
          </div>
          <MarkList
            variant="check"
            className="mt-6"
            items={[
              'Rewrites only what your resume already supports',
              'A plain language reason for every change',
              'Flags what a recruiter might question',
              'A full before and after diff you stay in control of',
            ]}
          />
        </div>
      </div>
    </section>
  );
}
