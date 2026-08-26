/**
 * Decorative line-art texture for the light closing-CTA section.
 *
 * Resume/document motifs (sheets, avatar cards, checkmarks, magnifying glasses,
 * arrows, plus signs and list lines) are scattered once across the section
 * rather than tiled. A tiled <pattern> always clips at the fill boundary, which
 * left half-cut icons along the section edges; placing each motif explicitly
 * inside a padded safe area guarantees every glyph renders complete.
 *
 * Placement uses best-candidate sampling driven by a seeded PRNG: a candidate is
 * kept only if it clears already-placed motifs by a *varying* minimum distance,
 * which yields controlled randomness - a few tight clusters, a few wider gaps -
 * instead of the even spacing a jittered grid produces. Points in the central
 * text band are thinned so the heading and subtext stay dominant. The seed is
 * fixed, so the composition is deterministic across renders.
 *
 * Positions are percentages inside a padded wrapper, so the layer is responsive
 * while the padding absorbs each motif's half-width overhang - no icon can
 * reach the left, right, top or bottom boundary. Strokes are a warm grey at low
 * opacity, and the layer is aria-hidden, non-selectable and pointer-events-none,
 * so it never competes with or interferes with the content on top.
 */

/** Deterministic PRNG so the composition is identical on every render. */
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
 * Motif geometry, drawn centred on the origin inside a -30..30 viewBox. The
 * largest glyph measures 42x28, whose ~50.5 diagonal still clears the 60-unit
 * box, so rotation never clips a motif against its own viewport.
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
  plus: (
    <g transform="translate(-7 -7)">
      <path d="M7 0v14M0 7h14" />
    </g>
  ),
  avatar: (
    <g transform="translate(-21 -14)">
      <rect x="0" y="0" width="42" height="28" rx="3" />
      <circle cx="12" cy="14" r="5" />
      <path d="M23 10h13M23 17h9" />
    </g>
  ),
  avatarSmall: (
    <g transform="translate(-15 -10)">
      <rect x="0" y="0" width="30" height="20" rx="2.5" />
      <circle cx="9" cy="10" r="3.6" />
      <path d="M17 7h9M17 13h6" />
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
  linesShort: (
    <g transform="translate(-11 -4)">
      <path d="M0 0h22M0 8h15" />
    </g>
  ),
};

/**
 * Draw weights: quiet connective glyphs appear more often than the heavier
 * sheets and avatar cards, so denser areas do not turn into visual noise.
 */
const MOTIF_POOL: string[] = [
  'sheet',
  'sheetSmall',
  'sheetSmall',
  'checkCircle',
  'check',
  'check',
  'plus',
  'plus',
  'avatar',
  'avatarSmall',
  'glass',
  'glass',
  'arrow',
  'arrow',
  'lines',
  'linesShort',
  'linesShort',
];

/**
 * Approximate visual weight (ink area) of each motif, used to keep the two
 * halves balanced. The heavy glyphs are the filled-looking sheets and cards.
 */
const MOTIF_WEIGHT: Record<string, number> = {
  sheet: 1.0,
  sheetSmall: 0.7,
  avatar: 1.0,
  avatarSmall: 0.6,
  lines: 0.6,
  linesShort: 0.35,
  checkCircle: 0.5,
  glass: 0.45,
  check: 0.2,
  plus: 0.2,
  arrow: 0.25,
};

/** Subsets used to steer whichever half is currently over- or under-weight. */
const LIGHT_POOL = MOTIF_POOL.filter((k) => MOTIF_WEIGHT[k] <= 0.45);
const HEAVY_POOL = MOTIF_POOL.filter((k) => MOTIF_WEIGHT[k] >= 0.6);

type Placement = {
  key: string;
  /** Percentages within the padded safe area. */
  x: number;
  y: number;
  rotate: number;
  /** Rendered box size in px; the motif scales with it. */
  size: number;
};

/**
 * Best-candidate sampling: each accepted point must clear its neighbours by a
 * randomised minimum distance, which produces clusters and gaps rather than the
 * uniform spacing of a grid. The central band is thinned to protect the copy.
 */
const PLACEMENTS: Placement[] = (() => {
  const rand = mulberry32(20260826);
  const out: Placement[] = [];
  const TARGET = 52;
  const ATTEMPTS = 1400;
  let weightL = 0;
  let weightR = 0;

  // Central band occupied by the heading, subtext and button.
  const inTextBand = (x: number, y: number) => x > 24 && x < 76 && y > 16 && y < 84;

  for (let i = 0; i < ATTEMPTS && out.length < TARGET; i++) {
    const x = rand() * 100;
    const y = rand() * 100;

    // Thin the copy area instead of excluding it, so the texture still reads as
    // continuous behind the text without crowding it.
    if (inTextBand(x, y) && rand() > 0.4) continue;

    // Varying radius: small values allow occasional tight clusters, larger ones
    // open up breathing room.
    const minDist = 7.5 + rand() * 7;
    const clears = out.every((p) => {
      const dx = p.x - x;
      const dy = (p.y - y) * 0.62; // vertical space is scarcer than horizontal
      return Math.hypot(dx, dy) >= minDist;
    });
    if (!clears) continue;

    const size = 30 + rand() * 22;

    // Visual balance without mirroring. Ink scales with the glyph box, so the
    // running total is weighted by size; the half that is ahead draws from the
    // light pool and the half behind draws from the heavy pool. Balance is
    // steered through motif choice, never through matched positions.
    const left = x < 50;
    const mine = left ? weightL : weightR;
    const other = left ? weightR : weightL;
    const pool =
      mine > other * 1.03 ? LIGHT_POOL : mine < other * 0.97 ? HEAVY_POOL : MOTIF_POOL;
    const key = pool[Math.floor(rand() * pool.length)];

    const w = MOTIF_WEIGHT[key] * (size / 40);
    if (left) weightL += w;
    else weightR += w;

    out.push({
      key,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      rotate: Number(((rand() - 0.5) * 58).toFixed(1)),
      size: Number(size.toFixed(1)),
    });
  }

  return out;
})();

export default function CtaPattern() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
    >
      {/*
        The padding is the safe margin. Motif positions are percentages of this
        inner box and each glyph is centred on its point, so the padding absorbs
        the half-size overhang and nothing can touch a section edge. The larger
        bottom padding leaves breathing room before the dark footer divider.
      */}
      <div className="absolute inset-0 px-10 pb-16 pt-12 sm:px-16 sm:pb-20">
        <div className="relative h-full w-full opacity-[0.18]">
          {PLACEMENTS.map((p, i) => (
            <svg
              key={i}
              viewBox="-30 -30 60 60"
              width={p.size}
              height={p.size}
              fill="none"
              stroke="#7C7466"
              strokeWidth="1.15"
              strokeLinecap="round"
              strokeLinejoin="round"
              focusable="false"
              // Each motif is drawn in a 60-unit box but rendered at ~30-52px,
              // so a plain stroke width would thin out as the box scales down
              // and vary between sizes. `vector-effect` is not an inherited SVG
              // property, so it is applied to every descendant shape to keep
              // each glyph at a consistent, readable 1.15px.
              className="absolute [&_*]:[vector-effect:non-scaling-stroke]"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                transform: `translate(-50%, -50%) rotate(${p.rotate}deg)`,
              }}
            >
              {MOTIFS[p.key]}
            </svg>
          ))}
        </div>
      </div>
    </div>
  );
}
