"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Solid() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    const m = ref.current;
    if (!m) return;
    m.rotation.x += delta * 0.8;
    m.rotation.y += delta * 1.15;
    // pulse/morph the scale so it feels alive
    m.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.13);
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial color="#13b886" wireframe />
    </mesh>
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

/** A small spinning/pulsing wireframe solid — used as the search loader. */
export default function Loader3D() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !hasWebGL()) return;
    setReady(true);
  }, []);
  if (!ready) return null;
  return (
    <Canvas
      camera={{ position: [0, 0, 3.2], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      style={{ background: "transparent" }}
    >
      <Solid />
    </Canvas>
  );
}
