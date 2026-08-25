import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Cool-toned frosted glass, sitting on the warm #FAF9F6 hero background.
const GLASS = '#E8F0F3';
const INK = '#7C8E99';
const TRACK = '#C9D6DC';
const ACCENT = '#1F9D57';

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
    const shape = new THREE.Shape();
    shape.moveTo(-w + radius, -h);
    shape.lineTo(w - radius, -h);
    shape.absarc(w - radius, -h + radius, radius, -Math.PI / 2, 0, false);
    shape.lineTo(w, h - radius);
    shape.absarc(w - radius, h - radius, radius, 0, Math.PI / 2, false);
    shape.lineTo(-w + radius, h);
    shape.absarc(-w + radius, h - radius, radius, Math.PI / 2, Math.PI, false);
    shape.lineTo(-w, -h + radius);
    shape.absarc(-w + radius, -h + radius, radius, Math.PI, Math.PI * 1.5, false);
    return new THREE.ShapeGeometry(shape, 12);
  }, [width, height, radius]);
}

/** Small person glyph: head plus shoulders, near the card's top-left. */
function AvatarGlyph({ x, y }: { x: number; y: number }) {
  const shoulders = useRoundedRect(0.17, 0.08, 0.038);
  return (
    <group position={[x, y, 0]}>
      <mesh position={[0, 0.075, 0]}>
        <circleGeometry args={[0.058, 24]} />
        <meshBasicMaterial color={INK} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh geometry={shoulders} position={[0, -0.015, 0]}>
        <meshBasicMaterial color={INK} transparent opacity={0.5} depthWrite={false} />
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
}: {
  width: number;
  y: number;
  left: number;
  opacity: number;
}) {
  const geo = useRoundedRect(width, 0.032, 0.016);
  return (
    <mesh geometry={geo} position={[left + width / 2, y, 0]}>
      <meshBasicMaterial color={INK} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

/**
 * Thin score ring in the card's top-right corner: a faint full-circle track
 * with a green arc over it. No number inside — the arc alone carries the
 * meaning, and each card gets a different fill so the set implies a range.
 */
function ScoreRing({ x, y, fill }: { x: number; y: number; fill: number }) {
  const inner = 0.112;
  const outer = 0.155;
  // Start at 12 o'clock and sweep so the arc reads as a filling gauge.
  const start = Math.PI / 2 - fill * Math.PI * 2;
  return (
    <group position={[x, y, 0]}>
      <mesh>
        <ringGeometry args={[inner, outer, 48]} />
        <meshBasicMaterial color={TRACK} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <ringGeometry args={[inner, outer, 48, 1, start, fill * Math.PI * 2]} />
        <meshBasicMaterial color={ACCENT} transparent opacity={1} depthWrite={false} />
      </mesh>
    </group>
  );
}

type CardProps = {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  score: number;
  speed: number;
  phase: number;
  order: number;
  animate: boolean;
};

function ResumeCard({
  position,
  rotation,
  size,
  score,
  speed,
  phase,
  order,
  animate,
}: CardProps) {
  const ref = useRef<THREE.Group>(null);
  const [w, h] = size;
  const body = useRoundedRect(w, h, 0.09);

  // Text block: a short "name" rule under the avatar, then body lines.
  const margin = -w / 2 + 0.22;
  const lines = useMemo(() => {
    const rows: { width: number; y: number; opacity: number }[] = [];
    const usable = w - 0.44;
    const widths = [0.62, 0.94, 0.78, 0.88, 0.55, 0.83, 0.7];
    let y = h / 2 - 0.78;
    widths.forEach((frac, i) => {
      rows.push({ width: usable * frac, y, opacity: i === 0 ? 0.42 : 0.28 });
      y -= 0.17;
    });
    return rows;
  }, [w, h]);

  useFrame((state) => {
    if (!animate || !ref.current) return;
    const t = state.clock.elapsedTime * speed + phase;
    // Non-harmonic multipliers keep each card's loop from syncing with the
    // others. Rotation amplitudes stay tiny so the cards never stop reading
    // as flat, front-facing documents.
    ref.current.position.y = position[1] + Math.sin(t * 0.62) * 0.1;
    ref.current.position.x = position[0] + Math.cos(t * 0.41) * 0.055;
    ref.current.rotation.x = rotation[0] + Math.sin(t * 0.53) * 0.022;
    ref.current.rotation.y = rotation[1] + Math.cos(t * 0.37) * 0.03;
    ref.current.rotation.z = rotation[2] + Math.sin(t * 0.29) * 0.016;
  });

  return (
    <group ref={ref} position={position} rotation={rotation}>
      {/* Frosted glass slab: cool, matte, and subtly see-through so the cards
          behind register faintly through it. */}
      <mesh geometry={body} renderOrder={order}>
        <meshPhysicalMaterial
          color={GLASS}
          roughness={0.42}
          metalness={0}
          transparent
          opacity={0.58}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* UI details sit just in front of the face and draw after it. */}
      <group position={[0, 0, 0.014]} renderOrder={order + 1}>
        <AvatarGlyph x={margin + 0.085} y={h / 2 - 0.3} />
        <ScoreRing x={w / 2 - 0.27} y={h / 2 - 0.27} fill={score} />
        {lines.map((line) => (
          <TextLine
            key={line.y}
            width={line.width}
            y={line.y}
            left={margin}
            opacity={line.opacity}
          />
        ))}
      </group>
    </group>
  );
}

function CardGroup({ animate }: { animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  // Eased cursor tilt, capped at 8 degrees per axis.
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const MAX_TILT = (8 * Math.PI) / 180;

  useFrame((state) => {
    if (!group.current) return;

    if (animate) {
      // pointer is -1..1 on each axis; scale to the 8 degree cap.
      target.current.x = -state.pointer.y * MAX_TILT;
      target.current.y = state.pointer.x * MAX_TILT;
      // Critically damped easing rather than instant tracking.
      current.current.x += (target.current.x - current.current.x) * 0.045;
      current.current.y += (target.current.y - current.current.y) * 0.045;
      group.current.rotation.x = current.current.x;
      group.current.rotation.y = current.current.y;

      // Scroll parallax: the group drifts down slower than the page.
      const scrolled = typeof window !== 'undefined' ? window.scrollY : 0;
      group.current.position.y = scrolled * 0.0016;
    }
  });

  return (
    <group ref={group}>
      {/* Lifted and slightly inset so the cluster sits above the wordmark's
          midsection rather than across it. */}
      <group scale={0.84} position={[-0.1, 0.78, 0]}>
        {/* Deepest card first, so the transparent faces blend in depth order. */}
        <ResumeCard
          position={[0.95, 0.55, -1.15]}
          rotation={[0.02, 0.075, 0.05]}
          size={[1.34, 1.86]}
          score={0.4}
          speed={0.71}
          phase={4.4}
          order={0}
          animate={animate}
        />
        <ResumeCard
          position={[-0.85, 0.3, -0.6]}
          rotation={[0.015, -0.06, -0.038]}
          size={[1.46, 2.02]}
          score={0.9}
          speed={0.32}
          phase={0}
          order={10}
          animate={animate}
        />
        <ResumeCard
          position={[0.14, -0.24, 0]}
          rotation={[-0.012, 0.045, 0.022]}
          size={[1.52, 2.1]}
          score={0.7}
          speed={0.53}
          phase={2.1}
          order={20}
          animate={animate}
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
