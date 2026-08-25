import { useState } from 'react';

const FAQS = [
  {
    q: 'Does Alignr ever invent experience?',
    a: 'No. Alignr only rewrites what your resume already supports. It never adds employers, skills, projects, credentials, or metrics that are not already there.',
  },
  {
    q: 'What happens to skills I am missing?',
    a: 'Missing skills are listed honestly and kept separate from your resume. You see the gap clearly instead of having it papered over with fabricated claims.',
  },
  {
    q: 'Can I see exactly what changed?',
    a: 'Yes. Every run includes a full before and after diff, and each edit carries a plain language reason so you understand the intent behind it.',
  },
  {
    q: 'Do I need an account to use it?',
    a: 'No account is required. Paste your resume and a job description, and you get a tailored result you can review right away.',
  },
  {
    q: 'Will the result hold up in an interview?',
    a: 'That is the goal! Because nothing is fabricated and every change is explained, you can speak to everything on the page with confidence.',
  },
];

function FaqItem({
  item,
  isOpen,
  onToggle,
}: {
  item: { q: string; a: string };
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-charcoal/10">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-base font-medium text-charcoal">{item.q}</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-charcoal/50 transition-transform duration-200 ${
            isOpen ? 'rotate-45' : ''
          }`}
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      {isOpen && (
        <p className="pb-5 pr-8 text-[15px] leading-relaxed text-charcoal/60">{item.a}</p>
      )}
    </div>
  );
}

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-6xl px-5 pb-10 pt-20 sm:px-8">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.02em] text-charcoal sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-charcoal/60">
            Straight answers about how Alignr stays true to your experience.
          </p>
        </div>
        <div>
          {FAQS.map((item, i) => (
            <FaqItem
              key={item.q}
              item={item}
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
