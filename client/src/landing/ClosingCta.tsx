import CtaButton from './CtaButton';
import CtaPattern from './CtaPattern';

export default function ClosingCta() {
  return (
    <section className="relative overflow-hidden bg-[#FAF9F6]">
      <CtaPattern />
      <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-12 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-4xl font-semibold tracking-[-0.02em] text-charcoal sm:text-5xl">
            Tailored to the role. True to your experience.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-charcoal/60">
            Paste a resume and a job description. Get a tailored result you can defend in an
            interview.
          </p>
          <div className="mt-9 flex justify-center">
            <CtaButton size="lg">Tailor My Resume</CtaButton>
          </div>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-charcoal/45">
            New, and honest about it. No inflated numbers or borrowed logos, paste your real
            resume and judge the output yourself.
          </p>
        </div>
      </div>
    </section>
  );
}
