"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Float, Html, MeshDistortMaterial, OrbitControls } from "@react-three/drei";

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

function Orbit() {
  const R = 2.9;
  const nodes = useMemo(
    () =>
      AGENTS.map((a, i) => {
        const ang = (i / AGENTS.length) * Math.PI * 2;
        return {
          ...a,
          pos: [R * Math.cos(ang), Math.sin(ang * 2) * 0.5, R * Math.sin(ang)] as [
            number,
            number,
            number,
          ],
        };
      }),
    []
  );
  const lines = useMemo(
    () => new Float32Array(nodes.flatMap((n) => [0, 0, 0, ...n.pos])),
    [nodes]
  );

  return (
    <group>
      <ambientLight intensity={1} />
      <pointLight position={[0, 0, 0]} intensity={3} color="#34d3a1" distance={16} />
      <directionalLight position={[5, 6, 5]} intensity={1.1} />
      <directionalLight position={[-6, -3, -4]} intensity={0.5} color="#8b5cf6" />

      {/* Morphing glassy core */}
      <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.4}>
        <mesh>
          <sphereGeometry args={[0.95, 48, 48]} />
          <MeshDistortMaterial
            color="#13b886"
            emissive="#0a4e3c"
            emissiveIntensity={0.35}
            distort={0.38}
            speed={1.8}
            roughness={0.12}
            metalness={0.15}
            transparent
            opacity={0.92}
          />
        </mesh>
      </Float>

      {/* Spokes */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={lines.length / 3}
            array={lines}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#8b5cf6" transparent opacity={0.14} />
      </lineSegments>

      {/* Glass agent orbs */}
      {nodes.map((n, i) => (
        <Float
          key={i}
          position={n.pos}
          speed={1.5}
          rotationIntensity={0.5}
          floatIntensity={0.7}
        >
          <mesh>
            <sphereGeometry args={[0.36, 32, 32]} />
            <meshPhysicalMaterial
              color={n.color}
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
          <Html center distanceFactor={11} position={[0, 0.62, 0]} zIndexRange={[20, 0]}>
            <div className="whitespace-nowrap rounded-full border border-white/50 bg-white/55 px-2.5 py-0.5 text-[11px] font-semibold text-ink-700 shadow-soft backdrop-blur-md dark:border-white/10 dark:bg-ink-900/50 dark:text-ink-100">
              {n.label}
            </div>
          </Html>
        </Float>
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
        camera={{ position: [0, 1.4, 9], fov: 50 }}
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
          autoRotateSpeed={0.85}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.7}
        />
      </Canvas>
    </div>
  );
}
