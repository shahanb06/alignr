import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import HeroPaper3D from './HeroPaper3D';
import { entranceProps } from './motion';

export default function Hero() {
  const reduced = useReducedMotion();
  const [resume, setResume] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hasContent = resume.trim().length > 0;

  function handleContinue() {
    if (!hasContent) {
      textareaRef.current?.focus();
      return;
    }
    try {
      sessionStorage.setItem('alignr:pastedResume', resume);
    } catch {
      // sessionStorage may be unavailable; navigation still proceeds
    }
    window.location.hash = '#/app';
  }

  return (
    <section id="top" className="relative mx-auto max-w-6xl px-5 pt-16 pb-10 sm:px-8 sm:pt-24">
      <HeroPaper3D />
      <div className="relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Left: pill + giant floating wordmark */}
        <div>
          <motion.span
            {...entranceProps(0, reduced)}
            className="inline-flex items-center gap-2 rounded-full bg-positive-soft px-3.5 py-1.5 text-sm font-medium text-positive-ink"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-positive" aria-hidden="true" />
            AI Resume Tailoring, Grounded in Your Experience
          </motion.span>
          <motion.h1
            {...entranceProps(1, reduced)}
            className="mt-6 font-semibold leading-[0.9] tracking-[-0.04em] text-charcoal"
            style={{ fontSize: 'clamp(4.5rem, 18vw, 12rem)' }}
          >
            Alignr
          </motion.h1>
        </div>

        {/* Right: headline paragraph + supporting copy */}
        <div className="lg:pt-6">
          <motion.p
            {...entranceProps(2, reduced)}
            className="text-balance text-2xl font-medium leading-snug tracking-[-0.01em] text-charcoal sm:text-3xl"
          >
            Most AI tools will invent experience to win keywords. Alignr rewrites only what your
            resume already supports, surfaces what&apos;s missing, and gives a reason for every
            change.
          </motion.p>
          <motion.p
            {...entranceProps(3, reduced)}
            className="mt-5 text-base leading-relaxed text-charcoal/60"
          >
            No account needed. Just paste your resume and a job description.
          </motion.p>

          {/* Paste-teaser card */}
          <motion.div
            {...entranceProps(4, reduced)}
            className={`mt-8 rounded-xl border bg-white transition-colors ${
              hasContent ? 'border-positive' : 'border-[#E7E4DC]'
            }`}
          >
            <textarea
              ref={textareaRef}
              rows={4}
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Paste your resume here to begin..."
              className="block w-full resize-none rounded-t-xl border-0 bg-transparent px-4 pt-4 text-sm leading-relaxed text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-0"
            />
            <div className="border-t border-[#E7E4DC]" />
            <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-charcoal/50">
                {hasContent ? 'Next step: add the job description in the app.' : ''}
              </p>
              <button
                type="button"
                onClick={handleContinue}
                className={`group inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium transition-colors ${
                  hasContent
                    ? 'bg-charcoal text-paper hover:bg-black'
                    : 'bg-[#D6D3CB] text-charcoal/70'
                }`}
              >
                {hasContent ? 'Continue with this resume' : 'Tailor my resume'}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
