import CtaButton from './CtaButton';
import { DARK_DOTS } from './darkSection';

export default function ClosingCta() {
  return (
    <section className="relative overflow-hidden bg-[#1F1D1A]" style={DARK_DOTS}>
      <div className="mx-auto max-w-6xl px-5 pb-24 pt-12 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-balance text-4xl font-semibold tracking-[-0.02em] text-paper sm:text-5xl">
            Tailored to the role. True to your experience.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-paper/65">
            Paste a resume and a job description. Get a tailored result you can defend in an
            interview.
          </p>
          <div className="mt-9 flex justify-center">
            <CtaButton size="lg" tone="light">
              Tailor My Resume
            </CtaButton>
          </div>
        </div>
      </div>
    </section>
  );
}
