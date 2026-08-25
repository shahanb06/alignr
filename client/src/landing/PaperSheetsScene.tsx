import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PAPER = '#FBFAF5';
const ACCENT = '#1F9D57';

/**
 * A portrait sheet of paper with real thickness. Built from a subdivided
 * BoxGeometry whose vertices are displaced along z by a cylindrical bend plus a
 * soft secondary wave, so the sheet reads as curled paper rather than a flat
 * plane. The displacement is baked once per geometry.
 */
function useCurledSheet(width: number, height: number, curl: number) {
  return useMemo(() => {
    const thickness = 0.012;
    const geo = new THREE.BoxGeometry(width, height, thickness, 24, 32, 1);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const halfW = width / 2;

    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      // Normalised across the width, -1 (left edge) .. 1 (right edge)
      const u = x / halfW;
      // Cylindrical bend: strongest at the edges, flat through the middle.
      const bend = curl * u * u;
      // Gentle lengthwise wave so the curl is not perfectly symmetric.
      const wave = Math.sin(y * 1.15) * curl * 0.28;
      pos.setZ(i, z + bend + wave);
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [width, height, curl]);
}

type SheetProps = {
  position: [number, number, number];
  rotation: [number, number, number];
  size: [number, number];
  curl: number;
  speed: number;
  phase: number;
  accent?: boolean;
  animate: boolean;
};

function Sheet({
  position,
  rotation,
  size,
  curl,
  speed,
  phase,
  accent = false,
  animate,
}: SheetProps) {
  const ref = useRef<THREE.Group>(null);
  const geometry = useCurledSheet(size[0], size[1], curl);

  useFrame((state) => {
    if (!animate || !ref.current) return;
    const t = state.clock.elapsedTime * speed + phase;
    // Non-harmonic multipliers keep each sheet's loop from ever syncing up
    // with the others.
    ref.current.position.y = position[1] + Math.sin(t * 0.62) * 0.11;
    ref.current.position.x = position[0] + Math.cos(t * 0.41) * 0.06;
    ref.current.rotation.x = rotation[0] + Math.sin(t * 0.53) * 0.075;
    ref.current.rotation.y = rotation[1] + Math.cos(t * 0.37) * 0.1;
    ref.current.rotation.z = rotation[2] + Math.sin(t * 0.29) * 0.045;
  });

  return (
    <group ref={ref} position={position} rotation={rotation}>
      <mesh geometry={geometry} castShadow receiveShadow>
        {/* Matte paper: no metalness, high roughness, no reflections. */}
        <meshStandardMaterial color={PAPER} roughness={0.96} metalness={0} />
      </mesh>
      {accent && (
        // Thin accent rule along one vertical edge.
        <mesh position={[-size[0] / 2 + 0.035, 0, curl + 0.016]}>
          <boxGeometry args={[0.022, size[1] * 0.82, 0.004]} />
          <meshStandardMaterial color={ACCENT} roughness={0.85} metalness={0} />
        </mesh>
      )}
    </group>
  );
}

function SheetGroup({ animate }: { animate: boolean }) {
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
      <group scale={0.92} position={[-0.15, 0.1, 0]}>
        <Sheet
          position={[-0.8, 0.32, -0.6]}
          rotation={[0.1, 0.42, 0.14]}
          size={[1.5, 2.1]}
          curl={0.36}
          speed={0.32}
          phase={0}
          animate={animate}
        />
        <Sheet
          position={[0.18, -0.18, 0]}
          rotation={[-0.07, -0.3, -0.09]}
          size={[1.58, 2.2]}
          curl={0.42}
          speed={0.53}
          phase={2.1}
          accent
          animate={animate}
        />
        <Sheet
          position={[0.92, 0.52, -1.15]}
          rotation={[0.14, 0.6, 0.2]}
          size={[1.36, 1.9]}
          curl={0.3}
          speed={0.71}
          phase={4.4}
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
      shadows="soft"
      // `flat` disables ACES tone mapping, which would otherwise crush the
      // off-white paper into a flat mid-grey.
      flat
      frameloop={animate ? 'always' : 'demand'}
      camera={{ position: [0, 0, 6], fov: 35 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      {/* Soft ambient fill. three r155+ uses physical light units, so these
          intensities are scaled by ~PI versus the legacy convention. */}
      <ambientLight intensity={2.25} />
      {/* Soft directional key, casting the contact shadows between sheets. */}
      <directionalLight
        position={[3.5, 4.5, 5]}
        intensity={3.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-radius={8}
        shadow-bias={-0.0005}
      >
        <orthographicCamera attach="shadow-camera" args={[-5, 5, 5, -5, 0.1, 24]} />
      </directionalLight>
      {/* Low counter-fill so the shadowed edges never go muddy. */}
      <directionalLight position={[-4, -1.5, 2]} intensity={0.9} />

      <SheetGroup animate={animate} />
    </Canvas>
  );
}
