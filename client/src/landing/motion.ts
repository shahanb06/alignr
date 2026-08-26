import { useEffect, useRef, useState } from 'react';
import type { MotionProps } from 'framer-motion';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

/** Reads the reduced-motion preference without subscribing to changes. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(REDUCED_QUERY).matches
  );
}

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ *
 * 1. Hero entrance: fade + 12px rise, staggered 70ms, ~400ms each.
 * ------------------------------------------------------------------ */

export const ENTRANCE_STAGGER = 0.07;

/**
 * Motion props for one item in the hero entrance sequence. `index` sets the
 * stagger position. Returns no props at all when reduced motion is set, so the
 * element renders in its final state with no animation attached.
 */
export function entranceProps(index: number, reduced: boolean | null): MotionProps {
  if (reduced) return {};
  return {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay: index * ENTRANCE_STAGGER, ease: EASE_OUT },
  };
}

/* ------------------------------------------------------------------ *
 * 2. Showcase callouts: fade + 8px rise, 150ms apart, gated on `show`.
 * ------------------------------------------------------------------ */

export const CALLOUT_STAGGER = 0.15;

export function calloutProps(index: number, show: boolean, reduced: boolean | null): MotionProps {
  if (reduced) return {};
  return {
    initial: { opacity: 0, y: 8 },
    animate: show ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
    transition: {
      duration: 0.35,
      delay: show ? index * CALLOUT_STAGGER : 0,
      ease: EASE_OUT,
    },
  };
}

/* ------------------------------------------------------------------ *
 * 3. Section scroll reveal: fade + 20px rise, once at 25% visibility.
 * ------------------------------------------------------------------ */

/**
 * Flips to true the first time the element is `threshold` visible, then stops
 * observing. Mirrors the IntersectionObserver pattern used by
 * useRevealProgress in HeroShowcase. Starts already-revealed under reduced
 * motion so the content is simply present.
 */
export function useInViewOnce<T extends HTMLElement>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(() => prefersReducedMotion());

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        }
      },
      { threshold }
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
}

/** Opacity/transform-only classes, so the reveal never affects layout. */
export function sectionRevealClass(inView: boolean): string {
  return [
    'transition-[opacity,transform] duration-500 ease-out',
    'motion-reduce:transition-none',
    inView ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0',
  ].join(' ');
}

/* ------------------------------------------------------------------ *
 * 4. Card hover lift: -2px translate + deeper shadow, 180ms ease.
 * ------------------------------------------------------------------ */

const LIFT_BASE =
  'transition-[transform,box-shadow] duration-[180ms] ease-out hover:-translate-y-0.5 ' +
  'motion-reduce:transition-none motion-reduce:hover:translate-y-0';

/** For cards that already carry an elevated shadow. */
export const CARD_LIFT = `${LIFT_BASE} hover:shadow-2xl hover:shadow-charcoal/10`;

/** For flat cards, so the hover shadow stays proportionate. */
export const CARD_LIFT_FLAT = `${LIFT_BASE} hover:shadow-lg hover:shadow-charcoal/5`;
