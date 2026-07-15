import CtaButton from './CtaButton';

export default function ClosingCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-balance text-4xl font-semibold tracking-[-0.02em] text-charcoal sm:text-5xl">
          Tailored to the role. True to your experience.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-charcoal/60">
          Paste a resume and a job description. Get a tailored result you can defend in an
          interview.
        </p>
        <div className="mt-9 flex justify-center">
          <CtaButton size="lg">Tailor my resume</CtaButton>
        </div>
      </div>
    </section>
  );
}
