"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Pointer state. `mouse` is window-normalized (for parallax); `glowMouse` is in
// the canvas's clip space (-1..1) so the shader can light up nearby nodes.
const mouse = { x: 0, y: 0 };
const glowMouse = { x: -2, y: -2 };
// 0..1 as the hero scrolls out of view — drives extra rotation + zoom.
const heroScroll = { v: 0 };

// Nodes glow + grow as the cursor passes near them (proximity in clip space),
// with a gentle per-node twinkle so the graph feels alive.
const POINT_VERT = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uSize;
  varying float vGlow;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vec4 clip = projectionMatrix * mvPosition;
    vec2 ndc = clip.xy / clip.w;
    float prox = 1.0 - smoothstep(0.0, 0.4, distance(ndc, uMouse));
    float twinkle = 0.78 + 0.22 * sin(uTime * 1.4 + position.x * 5.0 + position.y * 3.0);
    vGlow = prox;
    float s = uSize * (1.0 + prox * 2.2) * twinkle;
    gl_PointSize = s * 300.0 / -mvPosition.z;
    gl_Position = clip;
  }
`;

const POINT_FRAG = `
  uniform vec3 uColor;
  uniform vec3 uGlow;
  varying float vGlow;
  void main() {
    float r = length(gl_PointCoord - 0.5);
    if (r > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.15, 0.5, r);
    vec3 col = mix(uColor, uGlow, vGlow);
    gl_FragColor = vec4(col, alpha * (0.85 + vGlow * 0.15));
  }
`;

function Constellation({ mobile }: { mobile: boolean }) {
  const group = useRef<THREE.Group>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(-2, -2) },
      uSize: { value: mobile ? 0.045 : 0.035 },
      uColor: { value: new THREE.Color("#34d3a1") },
      uGlow: { value: new THREE.Color("#d1fae9") },
    }),
    [mobile]
  );

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

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += delta * 0.11;
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, mouse.y * 0.3, 0.04);
    g.position.x = THREE.MathUtils.lerp(g.position.x, mouse.x * 0.35, 0.04);
    // Scroll-reactive: bank and zoom in as the hero scrolls away.
    g.rotation.z = THREE.MathUtils.lerp(g.rotation.z, heroScroll.v * 0.6, 0.06);
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, 1 + heroScroll.v * 0.4, 0.06));
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uMouse.value.set(glowMouse.x, glowMouse.y);
  });

  return (
    <group ref={group}>
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
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={uniforms}
          vertexShader={POINT_VERT}
          fragmentShader={POINT_FRAG}
        />
      </points>
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
  const [active, setActive] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !hasWebGL()) return;
    setMobile(window.innerWidth < 768);
    setReady(true);
    const onMove = (e: PointerEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
      const el = wrap.current;
      if (el) {
        const r = el.getBoundingClientRect();
        glowMouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        glowMouse.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      }
    };
    const onScroll = () => {
      heroScroll.v = Math.min(1, window.scrollY / Math.max(1, window.innerHeight * 0.9));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
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
