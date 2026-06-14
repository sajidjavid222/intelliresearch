"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Html, MeshDistortMaterial, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type Node = { label: string; color: string; pos: [number, number, number] };

const AGENTS = [
  { label: "Papers", color: "#34d3a1" },
  { label: "Lit Review", color: "#8b5cf6" },
  { label: "Datasets", color: "#38bdf8" },
  { label: "Grants", color: "#f59e0b" },
  { label: "Conferences", color: "#2dd4bf" },
  { label: "Code", color: "#a78bfa" },
  { label: "Patents", color: "#60a5fa" },
  { label: "Research Gaps", color: "#fb7185" },
  { label: "Proposals", color: "#34d3a1" },
  { label: "Collaborators", color: "#c084fc" },
];

function AgentNode({ node }: { node: Node }) {
  const orb = useRef<THREE.Mesh>(null);
  const label = useRef<HTMLDivElement>(null);
  const wp = useMemo(() => new THREE.Vector3(), []);
  const cd = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    if (!orb.current || !label.current) return;
    orb.current.getWorldPosition(wp);
    cd.copy(state.camera.position).normalize();
    // dot > 0 → this agent is on the hemisphere facing the camera.
    const facing = wp.normalize().dot(cd);
    label.current.style.opacity = String(
      THREE.MathUtils.clamp((facing + 0.1) / 0.55, 0, 1)
    );
  });

  return (
    <Float position={node.pos} speed={1.4} rotationIntensity={0.5} floatIntensity={0.4}>
      <mesh ref={orb}>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshPhysicalMaterial
          color={node.color}
          transmission={1}
          thickness={1.4}
          roughness={0.08}
          ior={1.4}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.12}
          transparent
        />
      </mesh>
      <Html center distanceFactor={10} position={[0, 0.62, 0]} zIndexRange={[20, 0]}>
        <div
          ref={label}
          style={{ transition: "opacity 0.25s ease" }}
          className="whitespace-nowrap rounded-full border border-white/50 bg-white/60 px-2.5 py-0.5 text-[11px] font-semibold text-ink-700 shadow-soft backdrop-blur-md dark:border-white/10 dark:bg-ink-900/50 dark:text-ink-100"
        >
          {node.label}
        </div>
      </Html>
    </Float>
  );
}

function Orbit() {
  const R = 2.4;
  // Fibonacci-sphere distribution — agents surround the core like an atom.
  const nodes = useMemo(() => {
    const golden = Math.PI * (3 - Math.sqrt(5));
    return AGENTS.map((a, i) => {
      const y = 1 - (i / (AGENTS.length - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      return {
        ...a,
        pos: [Math.cos(theta) * rad * R, y * R, Math.sin(theta) * rad * R] as [
          number,
          number,
          number,
        ],
      };
    });
  }, []);
  const lines = useMemo(
    () => new Float32Array(nodes.flatMap((n) => [0, 0, 0, ...n.pos])),
    [nodes]
  );

  return (
    <group>
      <ambientLight intensity={1} />
      <pointLight position={[0, 0, 0]} intensity={3.2} color="#34d3a1" distance={18} />
      <directionalLight position={[5, 6, 5]} intensity={1.1} />
      <directionalLight position={[-6, -3, -4]} intensity={0.5} color="#8b5cf6" />

      {/* Bonds from the nucleus core to each agent */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={lines.length / 3}
            array={lines}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#34d3a1" transparent opacity={0.16} />
      </lineSegments>

      {/* Big morphing glass core fills the centre */}
      <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.25}>
        <mesh>
          <sphereGeometry args={[1.1, 48, 48]} />
          <MeshDistortMaterial
            color="#13b886"
            emissive="#0a4e3c"
            emissiveIntensity={0.42}
            distort={0.4}
            speed={1.9}
            roughness={0.12}
            metalness={0.15}
            transparent
            opacity={0.92}
          />
        </mesh>
      </Float>

      {/* Glass agent orbs (labels fade out on the far side) */}
      {nodes.map((n, i) => (
        <AgentNode key={i} node={n} />
      ))}
    </group>
  );
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export default function AgentOrbit() {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [reduced, setReduced] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasWebGL()) return;
    setReduced(!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
    setReady(true);
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ready]);

  if (!ready) return null;

  return (
    <div ref={wrap} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 1, 8], fov: 45 }}
        dpr={[1, 1.5]}
        frameloop={active ? "always" : "never"}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <Orbit />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate={!reduced && active}
          autoRotateSpeed={0.9}
          minPolarAngle={Math.PI / 3.5}
          maxPolarAngle={Math.PI / 1.55}
        />
      </Canvas>
    </div>
  );
}
