"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Window-normalized pointer for a gentle parallax (canvas is pointer-events-none).
const fmouse = { x: 0, y: 0 };

type Shape = {
  type: "icosahedron" | "torus" | "octahedron" | "dodecahedron" | "tetrahedron";
  args: number[];
  position: [number, number, number];
  color: string;
  opacity: number;
};

const BASE: Omit<Shape, "color" | "opacity">[] = [
  { type: "icosahedron", args: [0.7, 0], position: [-2.4, 0.4, -1] },
  { type: "torus", args: [0.5, 0.16, 16, 40], position: [2.3, 1.1, -2] },
  { type: "octahedron", args: [0.62, 0], position: [1.9, -1.1, -1] },
  { type: "dodecahedron", args: [0.55, 0], position: [-1.9, -1.3, -2] },
  { type: "icosahedron", args: [0.42, 1], position: [0.3, 1.7, -2.6] },
  { type: "tetrahedron", args: [0.62, 0], position: [-0.5, -0.4, -0.4] },
];

function Geo({ type, args }: { type: Shape["type"]; args: number[] }) {
  if (type === "torus") return <torusGeometry args={args as [number, number, number, number]} />;
  if (type === "octahedron") return <octahedronGeometry args={args as [number, number]} />;
  if (type === "dodecahedron") return <dodecahedronGeometry args={args as [number, number]} />;
  if (type === "tetrahedron") return <tetrahedronGeometry args={args as [number, number]} />;
  return <icosahedronGeometry args={args as [number, number]} />;
}

function FloatBody({ type, args, position, color, opacity }: Shape) {
  const ref = useRef<THREE.Mesh>(null);
  const seed = useMemo(() => Math.random() * 100, []);
  const spin = useMemo(() => 0.1 + Math.random() * 0.18, []);
  useFrame((state, delta) => {
    const m = ref.current;
    if (!m) return;
    const t = state.clock.elapsedTime + seed;
    m.position.y = position[1] + Math.sin(t * 0.6) * 0.25;
    m.rotation.x += delta * spin;
    m.rotation.y += delta * spin * 0.8;
  });
  return (
    <mesh ref={ref} position={position}>
      <Geo type={type} args={args} />
      <meshBasicMaterial color={color} wireframe transparent opacity={opacity} />
    </mesh>
  );
}

function Scene({ shapes }: { shapes: Shape[] }) {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, fmouse.x * 0.25, 0.03);
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -fmouse.y * 0.18, 0.03);
  });
  return (
    <group ref={group}>
      {shapes.map((s, i) => (
        <FloatBody key={i} {...s} />
      ))}
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

export default function FloatingShapes({ tone = "brand" }: { tone?: "brand" | "light" }) {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);
  const [mobile, setMobile] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !hasWebGL()) return;
    setMobile(window.innerWidth < 768);
    setReady(true);
    const onMove = (e: PointerEvent) => {
      fmouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      fmouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      threshold: 0.01,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [ready]);

  const shapes = useMemo<Shape[]>(() => {
    const palette = tone === "light" ? ["#ffffff"] : ["#34d3a1", "#8b5cf6", "#38bdf8"];
    const opacity = tone === "light" ? 0.42 : 0.5;
    const base = mobile ? BASE.slice(0, 4) : BASE;
    return base.map((b, i) => ({ ...b, color: palette[i % palette.length], opacity }));
  }, [tone, mobile]);

  if (!ready) return null;

  return (
    <div ref={wrap} style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={mobile ? [1, 1] : [1, 1.5]}
        frameloop={active ? "always" : "never"}
        gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <Scene shapes={shapes} />
      </Canvas>
    </div>
  );
}
