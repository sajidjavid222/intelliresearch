"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";

const AGENTS = [
  { label: "Papers", color: "#34d3a1" },
  { label: "Lit Review", color: "#8b5cf6" },
  { label: "Datasets", color: "#38bdf8" },
  { label: "Grants", color: "#f59e0b" },
  { label: "Conferences", color: "#34d3a1" },
  { label: "Code", color: "#8b5cf6" },
  { label: "Patents", color: "#38bdf8" },
  { label: "Research Gaps", color: "#f43f5e" },
  { label: "Proposals", color: "#34d3a1" },
  { label: "Collaborators", color: "#8b5cf6" },
];

function Orbit() {
  const R = 3.1;
  const nodes = useMemo(
    () =>
      AGENTS.map((a, i) => {
        const ang = (i / AGENTS.length) * Math.PI * 2;
        return {
          ...a,
          pos: [R * Math.cos(ang), Math.sin(ang * 2) * 0.55, R * Math.sin(ang)] as [
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
      <ambientLight intensity={0.75} />
      <pointLight position={[0, 0, 0]} intensity={3} color="#34d3a1" distance={14} />
      <pointLight position={[5, 5, 5]} intensity={0.6} color="#8b5cf6" />

      {/* Core */}
      <mesh>
        <icosahedronGeometry args={[0.78, 1]} />
        <meshStandardMaterial
          color="#0a4e3c"
          emissive="#13b886"
          emissiveIntensity={0.7}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      {/* Spokes from core to each agent */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={lines.length / 3}
            array={lines}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#8b5cf6" transparent opacity={0.18} />
      </lineSegments>

      {nodes.map((n, i) => (
        <group key={i} position={n.pos}>
          <mesh>
            <sphereGeometry args={[0.32, 28, 28]} />
            <meshStandardMaterial
              color={n.color}
              emissive={n.color}
              emissiveIntensity={0.45}
              roughness={0.35}
            />
          </mesh>
          <Html center distanceFactor={11} position={[0, 0.58, 0]} zIndexRange={[20, 0]}>
            <div className="pointer-events-none whitespace-nowrap rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-ink-700 shadow-soft backdrop-blur dark:bg-ink-900/90 dark:text-ink-200">
              {n.label}
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}

export default function AgentOrbit() {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [reduced, setReduced] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let webgl = true;
    try {
      const c = document.createElement("canvas");
      webgl = !!(
        window.WebGLRenderingContext &&
        (c.getContext("webgl") || c.getContext("experimental-webgl"))
      );
    } catch {
      webgl = false;
    }
    if (!webgl) return;
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
        camera={{ position: [0, 1.6, 8.5], fov: 50 }}
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
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.7}
        />
      </Canvas>
    </div>
  );
}
