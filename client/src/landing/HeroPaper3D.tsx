import { Suspense, lazy, useEffect, useState } from 'react';

// Lazy so three.js ships in its own chunk and never blocks first paint.
const PaperSheetsScene = lazy(() => import('./PaperSheetsScene'));

/**
 * Decorative 3D layer for the hero. Sits behind the wordmark and eyebrow pill
 * and is purely presentational, so it is hidden from assistive tech.
 *
 * Renders nothing at all below 768px, and renders the sheets fully static when
 * prefers-reduced-motion is set. The hero is complete without it.
 */
export default function HeroPaper3D() {
  const [enabled, setEnabled] = useState(false);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 768px)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    const sync = () => {
      setEnabled(wide.matches);
      setAnimate(!reduced.matches);
    };

    sync();
    wide.addEventListener('change', sync);
    reduced.addEventListener('change', sync);
    return () => {
      wide.removeEventListener('change', sync);
      reduced.removeEventListener('change', sync);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 z-0 hidden h-full w-1/2 md:block"
    >
      <Suspense fallback={null}>
        <PaperSheetsScene animate={animate} />
      </Suspense>
    </div>
  );
}
