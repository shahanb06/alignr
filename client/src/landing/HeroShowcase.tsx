import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { calloutProps } from './motion';

// Drives a 0→1 progress value once the element is 40% visible. Runs a single
// ~1.2s ease-out ramp via rAF. If prefers-reduced-motion is set, jumps to the
// final state without animating.
function useRevealProgress(): [React.RefObject<HTMLElement>, number] {
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setProgress(1);
      return;
    }

    let raf = 0;
    let started = false;
    const DURATION = 1200;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min((now - start) / DURATION, 1);
        setProgress(easeOut(t));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started) {
            started = true;
            observer.disconnect();
            run();
          }
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return [ref, progress];
}

const MATCHED = [
  'A skill the role calls for',
  'A tool you already use',
  'Experience your resume shows',
  "A responsibility you've held",
  'A strength backed by your history',
  'A qualification you hold',
];

const MISSING = [
  "A requirement your resume doesn't show",
  'A skill worth preparing for',
  'A gap flagged for you',
];

/**
 * `order` sets the position in the 150ms-apart sequence; `show` gates the
 * sequence on the score reveal having finished.
 */
function CalloutPill({ label, order, show }: { label: string; order: number; show: boolean }) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      {...calloutProps(order, show, reduced)}
      className="inline-flex items-center gap-1.5 rounded-full bg-charcoal px-3 py-1.5 text-xs font-medium text-paper shadow-lg shadow-charcoal/20"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-positive" aria-hidden="true" />
      {label}
    </motion.span>
  );
}

function ScoreRing({ progress }: { progress: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const pct = 0.76 * progress;
  const score = Math.round(76 * progress);
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true" className="shrink-0">
      <circle cx="36" cy="36" r={r} fill="none" stroke="#E4E4E1" strokeWidth="4" />
      <circle
        cx="36"
        cy="36"
        r={r}
        fill="none"
        stroke="#1F9D57"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform="rotate(-90 36 36)"
      />
      <text
        x="36"
        y="36"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-charcoal text-[18px] font-semibold tabular-nums"
      >
        {score}
      </text>
    </svg>
  );
}

function Pill({ label, tone }: { label: string; tone: 'matched' | 'missing' }) {
  const styles =
    tone === 'matched'
      ? 'bg-positive-soft border-positive-border text-positive-ink'
      : 'bg-negative-soft border-negative-border text-negative-ink';
  const dot = tone === 'matched' ? 'bg-positive' : 'bg-negative';
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium leading-tight ${styles}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className = '',
  listClassName = 'flex flex-wrap gap-2',
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
  listClassName?: string;
}) {
  return (
    <div className={`rounded-xl border border-charcoal/10 bg-white p-5 sm:p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-charcoal">{title}</h3>
      <p className="mt-1 text-sm text-charcoal/50">{subtitle}</p>
      <div className={`mt-5 ${listClassName}`}>{children}</div>
    </div>
  );
}

export default function HeroShowcase() {
  const [revealRef, progress] = useRevealProgress();
  const keywords = Math.round(13 * progress);
  // The 0→76 score ramp has finished, so the callouts may start their sequence.
  const calloutsReady = progress >= 1;
  return (
    <section
      ref={revealRef}
      className="mx-auto max-w-6xl px-5 pb-20 sm:px-8"
      aria-label="Example of an Alignr tailoring result"
    >
      <div className="relative">
        {/* Floating white frame */}
        <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white p-2 shadow-2xl shadow-charcoal/10 sm:p-3">
          <div className="rounded-xl bg-[#F7F6F3] p-4 sm:p-6">
            {/* Score row */}
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl border border-charcoal/10 bg-white px-5 py-4 sm:px-6">
              <div className="flex items-center gap-4">
                <ScoreRing progress={progress} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">
                    Match score
                  </p>
                  <p className="text-sm text-charcoal/60">Honest estimate of fit</p>
                </div>
              </div>
              <div className="hidden h-10 w-px bg-charcoal/10 sm:block" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">
                  Keywords matched
                </p>
                <p className="text-sm text-charcoal/60">
                  <span className="text-base font-semibold tabular-nums text-charcoal">
                    {keywords}
                  </span>{' '}
                  / 15 Job Description Keywords
                </p>
              </div>
            </div>

            {/* Panels — Matched spans wider, Missing stacks so heights stay balanced */}
            <div className="mt-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-5">
              <Panel
                title="Matched keywords"
                subtitle="Backed by evidence in your resume"
                className="lg:col-span-3"
              >
                {MATCHED.map((k) => (
                  <Pill key={k} label={k} tone="matched" />
                ))}
              </Panel>

              <div className="relative lg:col-span-2">
                {/* Callout sits directly on the Missing skills panel */}
                <div className="pointer-events-none absolute -top-3 right-5 z-10 hidden lg:block">
                  <CalloutPill label="flagged, never added" order={1} show={calloutsReady} />
                </div>
                <Panel
                  title="Missing skills"
                  subtitle="Listed honestly, not added to your resume"
                  className="h-full"
                  listClassName="flex flex-col gap-2"
                >
                  {MISSING.map((k) => (
                    <Pill key={k} label={k} tone="missing" />
                  ))}
                </Panel>
              </div>
            </div>
          </div>
        </div>

        {/* Callout anchored near the score row */}
        <div className="pointer-events-none absolute -left-3 top-8 z-10 hidden lg:block">
          <CalloutPill label="honest estimate of fit" order={0} show={calloutsReady} />
        </div>
        {/* Callout overlapping the frame's bottom edge, clear of the pills */}
        <div className="pointer-events-none absolute -bottom-3 left-10 z-10 hidden lg:block">
          <CalloutPill label="every change, with a reason" order={2} show={calloutsReady} />
        </div>
      </div>

      {/* Callout labels for small screens, stacked below the frame */}
      <div className="mt-5 flex flex-wrap justify-center gap-2 lg:hidden">
        <CalloutPill label="honest estimate of fit" order={0} show={calloutsReady} />
        <CalloutPill label="flagged, never added" order={1} show={calloutsReady} />
        <CalloutPill label="every change, with a reason" order={2} show={calloutsReady} />
      </div>
    </section>
  );
}
