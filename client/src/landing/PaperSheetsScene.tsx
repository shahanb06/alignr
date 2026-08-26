import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Cool-toned frosted glass, sitting on the warm #FAF9F6 hero background.
const GLASS = '#E8F0F3';
const EDGE = '#B9CBD4';
const SHADOW = '#2A3B44';
const INK = '#7C8E99';
const TRACK = '#C9D6DC';
const ACCENT = '#1F9D57';

// Hard ceiling on the whole-composition tilt. Kept well under the 8 degree
// cap so the parallax reads as a restrained microinteraction.
const MAX_TILT = (5.5 * Math.PI) / 180;

/**
 * Flat, rounded rectangle in the XY plane. Built from a THREE.Shape so the
 * corners are genuinely rounded, and deliberately given no thickness or vertex
 * displacement: the cards must always read as flat documents and can never
 * bend into a cone or an ambiguous shape.
 */
function useRoundedRect(width: number, height: number, radius: number) {
  return useMemo(() => {
    const w = width / 2;
    const h = height / 2;
    const r = Math.min(radius, w, h);
    const shape = new THREE.Shape();
    shape.moveTo(-w + r, -h);
    shape.lineTo(w - r, -h);
    shape.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false);
    shape.lineTo(w, h - r);
    shape.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
    shape.lineTo(-w + r, h);
    shape.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false);
    shape.lineTo(-w, -h + r);
    shape.absarc(-w + r, -h + r, r, Math.PI, Math.PI * 1.5, false);
    return new THREE.ShapeGeometry(shape, 12);
  }, [width, height, radius]);
}

/** Small person glyph: head plus shoulders, near the card's top-left. */
function AvatarGlyph({ x, y, order }: { x: number; y: number; order: number }) {
  const shoulders = useRoundedRect(0.16, 0.075, 0.036);
  return (
    <group position={[x, y, 0]}>
      <mesh position={[0, 0.07, 0]} renderOrder={order}>
        <circleGeometry args={[0.053, 24]} />
        <meshBasicMaterial color={INK} transparent opacity={0.48} depthWrite={false} />
      </mesh>
      <mesh geometry={shoulders} position={[0, -0.015, 0]} renderOrder={order}>
        <meshBasicMaterial color={INK} transparent opacity={0.48} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** One faint horizontal rule, anchored to the card's left text margin. */
function TextLine({
  width,
  y,
  left,
  opacity,
  order,
}: {
  width: number;
  y: number;
  left: number;
  opacity: number;
  order: number;
}) {
  const geo = useRoundedRect(width, 0.03, 0.015);
  return (
    <mesh geometry={geo} position={[left + width / 2, y, 0]} renderOrder={order}>
      <meshBasicMaterial color={INK} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

/**
 * Thin score ring in the card's top-right corner: a faint full-circle track
 * with a green arc over it. No number inside — the arc alone carries the
 * meaning, and each card gets a different fill so the set implies a range.
 */
function ScoreRing({
  x,
  y,
  fill,
  order,
}: {
  x: number;
  y: number;
  fill: number;
  order: number;
}) {
  const inner = 0.108;
  const outer = 0.15;
  // Start at 12 o'clock and sweep so the arc reads as a filling gauge.
  const start = Math.PI / 2 - fill * Math.PI * 2;
  return (
    <group position={[x, y, 0]}>
      <mesh renderOrder={order}>
        <ringGeometry args={[inner, outer, 48]} />
        <meshBasicMaterial color={TRACK} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.002]} renderOrder={order + 1}>
        <ringGeometry args={[inner, outer, 48, 1, start, fill * Math.PI * 2]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={1} depthWrite={false} />
      </mesh>
    </group>
  );
}

/**
 * Stack of progressively larger, fainter slabs behind a card. Approximates a
 * soft shadow without a blur pass, which keeps the scene to flat geometry.
 */
function SoftShadow({
  width,
  height,
  radius,
  order,
  strength,
}: {
  width: number;
  height: number;
  radius: number;
  order: number;
  strength: number;
}) {
  // Feathered falloff: many closely-spaced slabs whose opacity decays toward
  // ~0 at the outer edge, so the shadow dissolves into the background instead
  // of terminating on a visible step.
  const layers = [
    { grow: 0.02, opacity: 0.03 },
    { grow: 0.06, opacity: 0.025 },
    { grow: 0.11, opacity: 0.02 },
    { grow: 0.17, opacity: 0.015 },
    { grow: 0.24, opacity: 0.011 },
    { grow: 0.32, opacity: 0.007 },
    { grow: 0.42, opacity: 0.0035 },
  ];
  return (
    <>
      {layers.map((layer, i) => (
        <ShadowLayer
          key={layer.grow}
          width={width + layer.grow}
          height={height + layer.grow}
          radius={radius + layer.grow / 2}
          opacity={layer.opacity * strength}
          order={order + i}
        />
      ))}
    </>
  );
}

function ShadowLayer({
  width,
  height,
  radius,
  opacity,
  order,
}: {
  width: number;
  height: number;
  radius: number;
  opacity: number;
  order: number;
}) {
  const geo = useRoundedRect(width, height, radius);
  return (
    <mesh geometry={geo} renderOrder={order}>
      <meshBasicMaterial color={SHADOW} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

/** Eased, normalised cursor state shared by the whole composition. */
type PointerState = { x: number; y: number; strength: number };

/**
 * The 3D layer is `pointer-events-none`, so R3F's own `state.pointer` never
 * receives events. Track the cursor at the window level instead, normalised
 * against the hero section so the whole hero area drives the parallax.
 *
 * Mouse input only: on touch there is no hover, so the composition stays in
 * its idle state rather than lurching on tap.
 */
function useHeroPointer(enabled: boolean) {
  const gl = useThree((state) => state.gl);
  const pointer = useRef<PointerState>({ x: 0, y: 0, strength: 0 });

  useEffect(() => {
    if (!enabled) return;
    const canvas = gl.domElement;
    const area = canvas.closest('section') ?? canvas.parentElement;
    if (!area) return;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      const rect = area.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      const inside = nx >= -1 && nx <= 1 && ny >= -1 && ny <= 1;
      pointer.current.x = THREE.MathUtils.clamp(nx, -1, 1);
      pointer.current.y = THREE.MathUtils.clamp(ny, -1, 1);
      // Outside the hero the composition eases back to rest.
      pointer.current.strength = inside ? 1 : 0;
    };
    const onLeave = () => {
      pointer.current.strength = 0;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, [enabled, gl]);

  return pointer;
}

type CardProps = {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  /** Outward direction this card drifts when the layers spread apart. */
  spread: [number, number];
  /** Parallax weight: the front card responds most, rear cards least. */
  depth: number;
  score: number;
  opacity: number;
  speed: number;
  phase: number;
  order: number;
  animate: boolean;
  pointer: React.MutableRefObject<PointerState>;
};

function ResumeCard({
  position,
  rotation,
  size,
  spread,
  depth,
  score,
  opacity,
  speed,
  phase,
  order,
  animate,
  pointer,
}: CardProps) {
  const ref = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Group>(null);
  const [w, h] = size;
  const radius = 0.085;
  const body = useRoundedRect(w, h, radius);
  const border = useRoundedRect(w + 0.018, h + 0.018, radius + 0.009);

  // Content is derived from the card's own inner box, so every glyph and rule
  // is guaranteed to land inside the card bounds rather than spilling past the
  // rounded edge. Line count follows from the space that is actually left.
  const layout = useMemo(() => {
    const pad = 0.17;
    const top = h / 2 - pad;
    const bottom = -h / 2 + pad;
    const left = -w / 2 + pad;
    const innerW = w - pad * 2;
    const headerH = 0.32;
    const gap = 0.158;
    const firstLineY = top - headerH - 0.14;
    const rows: { width: number; y: number; opacity: number }[] = [];
    const fractions = [0.58, 0.95, 0.8, 0.9, 0.62, 0.86, 0.72, 0.93, 0.67];
    const count = Math.max(0, Math.floor((firstLineY - bottom) / gap) + 1);
    for (let i = 0; i < count; i += 1) {
      const y = firstLineY - i * gap;
      if (y < bottom) break;
      rows.push({
        width: innerW * fractions[i % fractions.length],
        y,
        opacity: i === 0 ? 0.4 : 0.26,
      });
    }
    return {
      left,
      rows,
      avatar: { x: left + 0.08, y: top - 0.13 },
      // Ring is inset by its own outer radius so it never clips the corner.
      ring: { x: w / 2 - pad - 0.15, y: top - 0.15 },
    };
  }, [w, h]);

  useFrame((state) => {
    const group = ref.current;
    if (!animate || !group) return;

    const t = state.clock.elapsedTime * speed + phase;
    // Non-harmonic multipliers with per-card speed and phase, so the three
    // cards never drift in sync. Amplitudes stay tiny: this should read as
    // floating, never as bouncing.
    const floatX = Math.cos(t * 0.41) * 0.03;
    const floatY = Math.sin(t * 0.62) * 0.05;
    const floatZ = Math.sin(t * 0.47) * 0.04;

    const p = pointer.current;
    // Cards closer to the cursor lean toward it a little more.
    const cursorX = p.x * 1.7;
    const proximity = 1 - Math.min(Math.abs(cursorX - position[0]) / 2.8, 1);
    const pull = (0.05 + proximity * 0.045) * depth;
    const spreadAmount = p.strength * 0.05;

    group.position.x = position[0] + floatX + p.x * pull + spread[0] * spreadAmount;
    group.position.y = position[1] + floatY - p.y * pull * 0.7 + spread[1] * spreadAmount;
    group.position.z = position[2] + floatZ + p.strength * depth * 0.05;

    group.rotation.x = rotation[0] + Math.sin(t * 0.53) * 0.011 - p.y * 0.018 * depth;
    group.rotation.y = rotation[1] + Math.cos(t * 0.37) * 0.015 + p.x * 0.024 * depth;
    group.rotation.z = rotation[2] + Math.sin(t * 0.29) * 0.008;

    // Shadow spreads a touch as the card lifts toward the cursor.
    if (shadowRef.current) {
      shadowRef.current.scale.setScalar(1 + p.strength * 0.14);
      shadowRef.current.position.set(0.035 + p.x * 0.018, -0.055 - p.strength * 0.02, -0.02);
    }
  });

  return (
    <group ref={ref} position={position} rotation={rotation}>
      <group ref={shadowRef} position={[0.035, -0.055, -0.02]}>
        <SoftShadow
          width={w}
          height={h}
          radius={radius}
          order={order}
          strength={depth * 0.9 + 0.35}
        />
      </group>
      {/* Thin rim just behind the face, reading as a card edge. */}
      <mesh geometry={border} position={[0, 0, -0.004]} renderOrder={order + 8}>
        <meshBasicMaterial color={EDGE} transparent opacity={opacity * 0.55} depthWrite={false} />
      </mesh>
      {/* Frosted glass slab: cool, matte, and subtly see-through so the cards
          behind register faintly through it. Rear cards are fainter, which
          separates the layers without adding weight. */}
      <mesh geometry={body} renderOrder={order + 9}>
        <meshPhysicalMaterial
          color={GLASS}
          roughness={0.42}
          metalness={0}
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* UI details sit just in front of the face and draw after it. */}
      <group position={[0, 0, 0.014]}>
        <AvatarGlyph x={layout.avatar.x} y={layout.avatar.y} order={order + 11} />
        <ScoreRing x={layout.ring.x} y={layout.ring.y} fill={score} order={order + 11} />
        {layout.rows.map((row) => (
          <TextLine
            key={row.y}
            width={row.width}
            y={row.y}
            left={layout.left}
            opacity={row.opacity}
            order={order + 11}
          />
        ))}
      </group>
    </group>
  );
}

function CardGroup({ animate }: { animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  const raw = useHeroPointer(animate);
  // Eased copy of the cursor state. Every card reads this, so nothing ever
  // snaps to raw mouse coordinates.
  const eased = useRef<PointerState>({ x: 0, y: 0, strength: 0 });

  useFrame(() => {
    if (!animate || !group.current) return;

    const p = raw.current;
    // Critically damped follow, and the target collapses to rest when the
    // cursor leaves so the composition settles rather than sticking.
    eased.current.x += (p.x * p.strength - eased.current.x) * 0.045;
    eased.current.y += (p.y * p.strength - eased.current.y) * 0.045;
    eased.current.strength += (p.strength - eased.current.strength) * 0.045;

    // Whole-composition perspective tilt, capped at 8 degrees per axis.
    group.current.rotation.y = eased.current.x * MAX_TILT;
    group.current.rotation.x = eased.current.y * MAX_TILT;

    // Scroll parallax: the group drifts down slower than the page.
    const scrolled = typeof window !== 'undefined' ? window.scrollY : 0;
    group.current.position.y = scrolled * 0.0016;
  });

  return (
    <group ref={group}>
      {/* Dropped low enough that the cards' lower halves run behind the giant
          wordmark, which sits in front via the hero's own stacking order. */}
      <group scale={0.82} position={[-0.06, -0.32, 0]}>
        {/* Back-most first, so the transparent faces blend in depth order. */}
        <ResumeCard
          position={[-1.28, -0.1, -1.15]}
          rotation={[0.02, 0.06, 0.055]}
          size={[1.32, 1.84]}
          spread={[-1, 0.35]}
          depth={0.34}
          score={0.4}
          opacity={0.44}
          speed={0.32}
          phase={0}
          order={0}
          animate={animate}
          pointer={eased}
        />
        <ResumeCard
          position={[1.02, 0.32, -0.8]}
          rotation={[0.016, -0.05, -0.048]}
          size={[1.3, 1.81]}
          spread={[1, 0.3]}
          depth={0.5}
          score={0.9}
          opacity={0.5}
          speed={0.71}
          phase={4.4}
          order={20}
          animate={animate}
          pointer={eased}
        />
        <ResumeCard
          position={[0.11, -0.2, 0.1]}
          rotation={[-0.01, 0.014, 0.006]}
          size={[1.5, 2.06]}
          spread={[0, -0.55]}
          depth={1}
          score={0.7}
          opacity={0.64}
          speed={0.53}
          phase={2.1}
          order={40}
          animate={animate}
          pointer={eased}
        />
      </group>
    </group>
  );
}

export default function PaperSheetsScene({ animate }: { animate: boolean }) {
  return (
    <Canvas
      dpr={[1, 2]}
      // `flat` disables ACES tone mapping, which would otherwise crush the
      // cool off-white glass into a flat mid-grey.
      flat
      frameloop={animate ? 'always' : 'demand'}
      camera={{ position: [0, 0, 6], fov: 35 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      {/* Soft ambient fill. three r155+ uses physical light units, so these
          intensities are scaled by ~PI versus the legacy convention. */}
      <ambientLight intensity={2.4} />
      {/* Soft directional key, giving the glass faces a gentle falloff. */}
      <directionalLight position={[3.5, 4.5, 5]} intensity={3.1} />
      {/* Low counter-fill so the far edges never go muddy. */}
      <directionalLight position={[-4, -1.5, 2]} intensity={1.1} />

      <CardGroup animate={animate} />
    </Canvas>
  );
}
