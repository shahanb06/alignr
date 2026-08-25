import type { CSSProperties } from 'react';

/**
 * Shared dot texture for the dark closing-CTA + footer band.
 *
 * The closing CTA and the footer are separate elements, so both import this
 * constant to keep the dot grid identical across the seam between them. The
 * dots are a faint warm grey so they stay subtly visible on #1F1D1A without
 * reading as noise.
 */
export const DARK_DOTS: CSSProperties = {
  backgroundImage: 'radial-gradient(rgba(250, 249, 246, 0.08) 1px, transparent 1px)',
  backgroundSize: '22px 22px',
};
