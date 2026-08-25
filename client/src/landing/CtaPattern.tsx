/**
 * Decorative line-art texture for the light closing-CTA section.
 *
 * A single 300x260 tile of thin-stroke resume/document motifs (sheets, an
 * avatar-on-card glyph, checkmarks, a magnifying glass, arrows, list lines and
 * sparkles) repeated via <pattern>. Strokes are a warm grey at very low
 * opacity so the result reads as paper texture rather than iconography, and the
 * whole layer is aria-hidden and pointer-events-none so it never interferes
 * with the content sitting on top of it.
 */
export default function CtaPattern() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      focusable="false"
    >
      <defs>
        <pattern
          id="cta-lineart"
          width="300"
          height="260"
          patternUnits="userSpaceOnUse"
          x="0"
          y="0"
        >
          <g
            fill="none"
            stroke="#8A8172"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.055"
          >
            {/* Resume sheet with a folded corner and list lines */}
            <g transform="translate(14 16)">
              <path d="M0 0h20l8 8v34H0z" />
              <path d="M20 0v8h8" />
              <path d="M6 18h14M6 25h14M6 32h9" />
            </g>

            {/* Checkmark in a circle */}
            <g transform="translate(112 24)">
              <circle cx="10" cy="10" r="9.5" />
              <path d="M5.6 10.4l3 3 6-6.6" />
            </g>

            {/* Sparkle */}
            <g transform="translate(168 78)">
              <path d="M8 0v16M0 8h16M2.5 2.5l11 11M13.5 2.5l-11 11" />
            </g>

            {/* Avatar on a card */}
            <g transform="translate(20 104)">
              <rect x="0" y="0" width="42" height="28" rx="3" />
              <circle cx="12" cy="14" r="5" />
              <path d="M23 10h13M23 17h9" />
            </g>

            {/* Magnifying glass */}
            <g transform="translate(126 112)">
              <circle cx="9" cy="9" r="8.5" />
              <path d="M15.2 15.2L22 22" />
            </g>

            {/* Right arrow */}
            <g transform="translate(96 172)">
              <path d="M0 6h16M11 1l5 5-5 5" />
            </g>

            {/* Stacked list lines */}
            <g transform="translate(160 170)">
              <path d="M0 0h34M0 7h26M0 14h30" />
            </g>

            {/* Second, smaller sheet to break up the grid rhythm */}
            <g transform="translate(174 12) rotate(12)">
              <path d="M0 0h18l6 6v26H0z" />
              <path d="M18 0v6h6" />
            </g>

            {/* Lone checkmark */}
            <g transform="translate(60 66)">
              <path d="M0 5.5l4 4L12 0" />
            </g>

            {/* Small sparkle */}
            <g transform="translate(20 176)">
              <path d="M5 0v10M0 5h10" />
            </g>
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cta-lineart)" />
    </svg>
  );
}
