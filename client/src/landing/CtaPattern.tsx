/**
 * Decorative line-art texture for the light closing-CTA section.
 *
 * Resume/document motifs (sheets, avatar cards, checkmarks, a magnifying glass,
 * arrows, list lines and sparkles) are scattered across a large tile so the
 * texture reads as organic paper clutter rather than a rigid icon grid.
 *
 * Placement uses a jittered grid driven by a seeded PRNG: one motif per cell,
 * offset by up to ~43% of the cell in each axis and given a random rotation and
 * slight scale. That keeps coverage even (no clumps or bald patches) while
 * destroying the row/column rhythm a plain grid produces. The seed is fixed, so
 * the layout is deterministic across renders.
 *
 * The motif field is defined once and stamped nine times (the tile plus its
 * eight neighbours) inside the <pattern>, so motifs that overhang an edge wrap
 * around seamlessly instead of being clipped at the tile seam.
 *
 * Strokes are a warm grey at low opacity so the layer stays clearly subordinate
 * to the heading and subtext. It is aria-hidden and pointer-events-none, so it
 * never interferes with the content on top.
 */

const TILE_W = 518;
const TILE_H = 444;
const CELL = 74;
const COLS = TILE_W / CELL;
const ROWS = TILE_H / CELL;

/** Fraction of a cell a motif may wander from its cell centre. */
const JITTER = 0.86;

/** Deterministic PRNG so the scatter is identical on every render. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Motif geometry, drawn centred on the origin so rotation pivots through the
 * middle of each glyph rather than swinging it around a corner.
 */
const MOTIFS: Record<string, React.ReactNode> = {
  sheet: (
    <g transform="translate(-14 -21)">
      <path d="M0 0h20l8 8v34H0z" />
      <path d="M20 0v8h8" />
      <path d="M6 18h14M6 25h14M6 32h9" />
    </g>
  ),
  sheetSmall: (
    <g transform="translate(-12 -16)">
      <path d="M0 0h18l6 6v26H0z" />
      <path d="M18 0v6h6" />
      <path d="M5 14h13M5 20h9" />
    </g>
  ),
  checkCircle: (
    <g transform="translate(-10 -10)">
      <circle cx="10" cy="10" r="9.5" />
      <path d="M5.6 10.4l3 3 6-6.6" />
    </g>
  ),
  check: (
    <g transform="translate(-6 -5)">
      <path d="M0 5.5l4 4L12 0" />
    </g>
  ),
  sparkle: (
    <g transform="translate(-8 -8)">
      <path d="M8 0v16M0 8h16M2.5 2.5l11 11M13.5 2.5l-11 11" />
    </g>
  ),
  sparkleSmall: (
    <g transform="translate(-5 -5)">
      <path d="M5 0v10M0 5h10" />
    </g>
  ),
  avatar: (
    <g transform="translate(-21 -14)">
      <rect x="0" y="0" width="42" height="28" rx="3" />
      <circle cx="12" cy="14" r="5" />
      <path d="M23 10h13M23 17h9" />
    </g>
  ),
  glass: (
    <g transform="translate(-11 -11)">
      <circle cx="9" cy="9" r="8.5" />
      <path d="M15.2 15.2L22 22" />
    </g>
  ),
  arrow: (
    <g transform="translate(-8 -6)">
      <path d="M0 6h16M11 1l5 5-5 5" />
    </g>
  ),
  lines: (
    <g transform="translate(-17 -7)">
      <path d="M0 0h34M0 7h26M0 14h30" />
    </g>
  ),
};

const MOTIF_KEYS = Object.keys(MOTIFS);

type Placement = {
  key: string;
  x: number;
  y: number;
  rotate: number;
  scale: number;
};

/** One motif per grid cell, then knocked off the grid by jitter/rotation/scale. */
const PLACEMENTS: Placement[] = (() => {
  const rand = mulberry32(20260825);
  const out: Placement[] = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const key = MOTIF_KEYS[Math.floor(rand() * MOTIF_KEYS.length)];
      out.push({
        key,
        x: Number((col * CELL + CELL / 2 + (rand() - 0.5) * CELL * JITTER).toFixed(1)),
        y: Number((row * CELL + CELL / 2 + (rand() - 0.5) * CELL * JITTER).toFixed(1)),
        rotate: Number(((rand() - 0.5) * 64).toFixed(1)),
        scale: Number((0.82 + rand() * 0.4).toFixed(2)),
      });
    }
  }

  return out;
})();

/** Tile plus its eight neighbours, so edge-overhanging motifs wrap seamlessly. */
const STAMPS = [-1, 0, 1].flatMap((ix) => [-1, 0, 1].map((iy) => [ix, iy] as const));

export default function CtaPattern() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      focusable="false"
    >
      <defs>
        <g
          id="cta-motif-field"
          fill="none"
          stroke="#7C7466"
          strokeWidth="1.15"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {PLACEMENTS.map((p, i) => (
            <g
              key={i}
              transform={`translate(${p.x} ${p.y}) rotate(${p.rotate}) scale(${p.scale})`}
            >
              {MOTIFS[p.key]}
            </g>
          ))}
        </g>

        <pattern
          id="cta-lineart"
          width={TILE_W}
          height={TILE_H}
          patternUnits="userSpaceOnUse"
          x="0"
          y="0"
        >
          <g opacity="0.15">
            {STAMPS.map(([ix, iy]) => (
              <use
                key={`${ix}:${iy}`}
                href="#cta-motif-field"
                transform={`translate(${ix * TILE_W} ${iy * TILE_H})`}
              />
            ))}
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#cta-lineart)" />
    </svg>
  );
}
