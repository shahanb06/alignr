import type { CSSProperties } from 'react';

/**
 * Dot texture for the dark footer band.
 *
 * The dots are a faint warm grey so they stay subtly visible on #1F1D1A
 * without reading as noise.
 */
export const DARK_DOTS: CSSProperties = {
  backgroundImage: 'radial-gradient(rgba(250, 249, 246, 0.08) 1px, transparent 1px)',
  backgroundSize: '22px 22px',
};
