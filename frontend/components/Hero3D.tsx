"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Pointer position (-1..1), updated globally so the scene can parallax even
// though the canvas is pointer-events-none (it sits behind the hero text).
const mouse = { x: 0, y: 0 };

function Constellation({ mobile }: { mobile: boolean }) {
  const group = useRef<THREE.Group>(null);

  const { positions, lines } = useMemo(() => {
    const COUNT = mobile ? 190 : 340;
    const pts: THREE.Vector3[] = [];
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const r = 1.6 + Math.random() * 1.0;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
      pts.push(new THREE.Vector3(x, y, z));
    }
    // Connect each node to its 2 nearest neighbours → a "knowledge graph".
    const seg: number[] = [];
    const edges = new Set<string>();
    for (let i = 0; i < pts.length; i++) {
      const near = pts
        .map((p, j) => [pts[i].distanceToSquared(p), j] as [number, number])
        .filter(([, j]) => j !== i)
        .sort((a, b) => a[0] - b[0])
        .slice(0, 2);
      for (const [, j] of near) {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (edges.has(key)) continue;
        edges.add(key);
        seg.push(pts[i].x, pts[i].y, pts[i].z, pts[j].x, pts[j].y, pts[j].z);
      }
    }
    return { positions: arr, lines: new Float32Array(seg) };
  }, [mobile]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += delta * 0.11;
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, mouse.y * 0.3, 0.04);
    g.position.x = THREE.MathUtils.lerp(g.position.x, mouse.x * 0.35, 0.04);
  });

  return (
    <group ref={group}>
      {/* connecting edges */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={lines.length / 3}
            array={lines}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#8b5cf6"
          transparent
          opacity={0.12}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
      {/* nodes */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.03}
          color="#34d3a1"
          transparent
          opacity={0.95}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {/* faint structural core */}
      <mesh>
        <icosahedronGeometry args={[1.45, 1]} />
        <meshBasicMaterial color="#8b5cf6" wireframe transparent opacity={0.16} />
      </mesh>
    </group>
  );
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl") || c.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

export default function Hero3D() {
  const [ready, setReady] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [active, setActive] = useState(true); // pause rendering when scrolled away
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !hasWebGL()) return; // fall back to the static blobs
    setMobile(window.innerWidth < 768);
    setReady(true);
    const onMove = (e: PointerEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // Pause the render loop (save battery) whenever the hero scrolls out of view.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      threshold: 0.01,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ready]);

  if (!ready) return null;

  return (
    <div ref={wrap} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 55 }}
        dpr={mobile ? [1, 1] : [1, 1.5]}
        frameloop={active ? "always" : "never"}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <Constellation mobile={mobile} />
      </Canvas>
    </div>
  );
}
