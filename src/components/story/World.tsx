"use client";

// The 3D night street. Light on purpose: simple shapes, no shadows, one cheap light setup.
// Every moving thing reads the scroll position (story.p) and shows only in its own scene.

import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor, RoundedBox } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  story,
  range,
  smooth,
  lerp,
  easeOutBack,
  cameraFor,
  flightProgress,
  FLIGHT_COUNT,
} from "@/lib/story";
import { reelTexture, signTexture } from "./textures";

// Brand colours only.
const C = {
  brand: "#6A1FB0",
  deep: "#3C096C",
  red: "#E5383B",
  lilac: "#C9A2FF",
  yellow: "#FFD23F",
};
const YEL = new THREE.Color(C.yellow);
const DEEP = new THREE.Color(C.deep);
const LILAC = new THREE.Color(C.lilac);

// A tiny repeatable random number maker, so the street looks the same every time.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---- Shared shapes (built once) ----
let bookmarkCache: THREE.BufferGeometry | null = null;
function bookmarkGeo() {
  if (!bookmarkCache) {
    const w = 1;
    const h = 1.6;
    const s = new THREE.Shape();
    s.moveTo(-w / 2, h / 2);
    s.lineTo(w / 2, h / 2);
    s.lineTo(w / 2, -h / 2);
    s.lineTo(0, -h / 2 + 0.45);
    s.lineTo(-w / 2, -h / 2);
    s.closePath();
    bookmarkCache = new THREE.ExtrudeGeometry(s, {
      depth: 0.16,
      bevelEnabled: true,
      bevelSize: 0.04,
      bevelThickness: 0.04,
      bevelSegments: 2,
    });
    bookmarkCache.center();
  }
  return bookmarkCache;
}

let starCache: THREE.BufferGeometry | null = null;
function starGeo() {
  if (!starCache) {
    const s = new THREE.Shape();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? 0.12 : 0.28;
      const a = Math.PI / 2 + (k * Math.PI) / 5;
      if (k === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    s.closePath();
    starCache = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false });
    starCache.center();
  }
  return starCache;
}

// ---- The street ----
const SLOTS = Array.from({ length: 12 }, (_, k) => 6 - k * 8.6);
const LAMP_Z = [2, -10, -22, -38, -52, -66];

function Street() {
  const { buildings, windows } = useMemo(() => {
    const r = rng(7);
    const list: { x: number; z: number; d: number; h: number }[] = [];
    const wins: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    for (const side of [-1, 1]) {
      for (const z of SLOTS) {
        if (side === -1 && z < -26 && z > -34) continue; // room for the cafe
        const d = 5 + r() * 3;
        const h = 7 + r() * 8;
        list.push({ x: side * (5.5 + d / 2), z, d, h });
        const rows = Math.floor((h - 1) / 2.2);
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < 3; col++) {
            if (r() < 0.55) continue; // most windows stay dark
            dummy.position.set(side * 5.47, 2 + row * 2.2, z - 2.4 + col * 2.4);
            dummy.rotation.set(0, -side * (Math.PI / 2), 0);
            dummy.updateMatrix();
            wins.push(dummy.matrix.clone());
          }
        }
      }
    }
    return { buildings: list, windows: wins };
  }, []);

  const dashes = useMemo(() => {
    const dummy = new THREE.Object3D();
    return Array.from({ length: 30 }, (_, k) => {
      dummy.position.set(0, 0.02, 8 - k * 4.5);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      return dummy.matrix.clone();
    });
  }, []);

  return (
    <group>
      {/* purple road and sidewalks */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -40]}>
        <planeGeometry args={[8, 150]} />
        <meshLambertMaterial color={C.brand} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 4.75, 0.08, -40]}>
          <boxGeometry args={[1.5, 0.16, 150]} />
          <meshLambertMaterial color={C.deep} />
        </mesh>
      ))}
      <instancedMesh
        args={[undefined, undefined, dashes.length]}
        ref={(m) => {
          if (!m) return;
          dashes.forEach((mat, k) => m.setMatrixAt(k, mat));
          m.instanceMatrix.needsUpdate = true;
        }}
      >
        <planeGeometry args={[0.22, 1.8]} />
        <meshBasicMaterial color={C.lilac} />
      </instancedMesh>

      {buildings.map((b, k) => (
        <mesh key={k} position={[b.x, b.h / 2, b.z]}>
          <boxGeometry args={[b.d, b.h, 7.6]} />
          <meshLambertMaterial color={C.brand} />
        </mesh>
      ))}

      <instancedMesh
        args={[undefined, undefined, windows.length]}
        ref={(m) => {
          if (!m) return;
          windows.forEach((mat, k) => m.setMatrixAt(k, mat));
          m.instanceMatrix.needsUpdate = true;
        }}
      >
        <planeGeometry args={[0.9, 1.1]} />
        <meshBasicMaterial color={C.yellow} />
      </instancedMesh>

      {/* street lamps */}
      {[-1, 1].flatMap((side) =>
        LAMP_Z.map((z) => (
          <group key={`${side}${z}`} position={[side * 4.6, 0, z]}>
            <mesh position={[0, 1.7, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 3.4, 6]} />
              <meshLambertMaterial color={C.lilac} />
            </mesh>
            <mesh position={[0, 3.5, 0]}>
              <sphereGeometry args={[0.22, 10, 10]} />
              <meshBasicMaterial color={C.yellow} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

// ---- Cafe Luna (with its windows, rings and rating stars) ----
function Cafe() {
  const sign = useMemo(() => signTexture("Café Luna"), []);
  const winMats = useMemo(
    () => [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: C.deep })),
    [],
  );
  const starMats = useMemo(
    () => Array.from({ length: 5 }, () => new THREE.MeshBasicMaterial({ color: C.yellow })),
    [],
  );
  const haloMats = useMemo(
    () =>
      Array.from(
        { length: 5 },
        () =>
          new THREE.MeshBasicMaterial({
            color: C.lilac,
            transparent: true,
            opacity: 0,
            depthWrite: false,
          }),
      ),
    [],
  );
  const ringMats = useMemo(
    () =>
      [0, 1, 2].map(
        () => new THREE.MeshBasicMaterial({ color: C.yellow, transparent: true, depthWrite: false }),
      ),
    [],
  );
  const ringsGroup = useRef<THREE.Group>(null);
  const starsGroup = useRef<THREE.Group>(null);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const starRefs = useRef<(THREE.Group | null)[]>([]);

  useFrame((state) => {
    const p = story.p;
    const t3 = range(p, 0.6, 0.84); // how far through the influencer part
    // windows light up one by one while the bookmarks rain, then stay lit
    winMats.forEach((m, k) => {
      m.color.copy(DEEP).lerp(YEL, range(p, 0.46 + k * 0.035, 0.51 + k * 0.035));
    });
    // offer rings pulse outwards, fading in and out smoothly
    const ringEnv = range(p, 0.42, 0.46) * (1 - range(p, 0.58, 0.63));
    if (ringsGroup.current) ringsGroup.current.visible = ringEnv > 0.01;
    ringRefs.current.forEach((ring, k) => {
      if (!ring) return;
      const ph = (state.clock.elapsedTime * 0.5 + k / 3) % 1;
      ring.scale.setScalar(0.6 + ph * 3);
      ringMats[k].opacity = (1 - ph) * 0.85 * ringEnv;
    });
    // rating stars: yellow, then lilac with a glow as each bookmark lands
    const starEnv = smooth(range(p, 0.6, 0.65));
    if (starsGroup.current) {
      starsGroup.current.visible = starEnv > 0.01;
      starsGroup.current.scale.setScalar(Math.max(0.001, starEnv));
    }
    starRefs.current.forEach((g, k) => {
      if (!g) return;
      const done = flightProgress(t3, k) >= 1;
      const pop = easeOutBack(range(t3, 0.42 + k * 0.1, 0.52 + k * 0.1));
      starMats[k].color.copy(done ? LILAC : YEL);
      g.scale.setScalar(done ? 1 + 0.25 * pop : 1);
      haloMats[k].opacity = done ? 0.4 * Math.min(1, pop) : 0;
    });
  });

  return (
    <group position={[-8, 0, -30]}>
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[5, 4.4, 6.6]} />
        <meshLambertMaterial color={C.lilac} />
      </mesh>
      <mesh position={[0, 4.55, 0]}>
        <boxGeometry args={[5.6, 0.3, 7.2]} />
        <meshLambertMaterial color={C.red} />
      </mesh>
      {/* sign */}
      <mesh position={[2.52, 3.5, 0.2]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[3.2, 0.8]} />
        <meshBasicMaterial map={sign} transparent />
      </mesh>
      {/* door and awning */}
      <mesh position={[2.52, 1.1, -2.2]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[1.1, 2.2]} />
        <meshLambertMaterial color={C.deep} />
      </mesh>
      <mesh position={[2.9, 2.5, -2.2]}>
        <boxGeometry args={[0.8, 0.12, 1.6]} />
        <meshLambertMaterial color={C.red} />
      </mesh>
      {/* three windows */}
      {[-0.4, 1, 2.4].map((z, k) => (
        <mesh key={z} position={[2.52, 1.9, z]} rotation-y={Math.PI / 2} material={winMats[k]}>
          <planeGeometry args={[1.1, 1.5]} />
        </mesh>
      ))}

      {/* offer rings */}
      <group ref={ringsGroup} position={[2.6, 3.5, 0.2]} rotation-y={Math.PI / 2}>
        {ringMats.map((mat, k) => (
          <mesh
            key={k}
            ref={(m) => {
              ringRefs.current[k] = m;
            }}
            material={mat}
          >
            <torusGeometry args={[1, 0.035, 8, 48]} />
          </mesh>
        ))}
      </group>

      {/* rating stars above the roof edge */}
      <group ref={starsGroup}>
        {starMats.map((mat, k) => (
          <group
            key={k}
            ref={(g) => {
              starRefs.current[k] = g;
            }}
            position={[2.6, 5.5, -1.7 + k * 0.85]}
            rotation-y={Math.PI / 2}
          >
            <mesh geometry={starGeo()} material={mat} />
            <mesh position={[0, 0, -0.05]} material={haloMats[k]}>
              <circleGeometry args={[0.5, 16]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

// ---- The red bookmark with a pin hanging from the top (always floating over the road) ----
function Hero() {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => {
    const o = g.current;
    if (!o) return;
    const time = s.clock.elapsedTime;
    o.position.set(0, 1.9 + Math.sin(time * 1.4) * 0.12, -4);
    o.scale.setScalar(1.15);
    o.rotation.y = -0.5 + story.p * 3 + Math.sin(time) * 0.1;
  });
  return (
    <group ref={g}>
      <mesh geometry={bookmarkGeo()}>
        <meshLambertMaterial color={C.red} />
      </mesh>
      {/* ring at the top, a string, and a location pin hanging down */}
      <mesh position={[0, 0.92, 0.18]}>
        <torusGeometry args={[0.1, 0.028, 8, 20]} />
        <meshLambertMaterial color={C.lilac} />
      </mesh>
      <mesh position={[0, 0.66, 0.18]}>
        <cylinderGeometry args={[0.012, 0.012, 0.44, 5]} />
        <meshBasicMaterial color={C.lilac} />
      </mesh>
      <mesh position={[0, 0.34, 0.2]}>
        <sphereGeometry args={[0.17, 20, 20]} />
        <meshLambertMaterial color={C.yellow} />
      </mesh>
      <mesh position={[0, 0.1, 0.2]} rotation-x={Math.PI}>
        <coneGeometry args={[0.14, 0.32, 20]} />
        <meshLambertMaterial color={C.yellow} />
      </mesh>
    </group>
  );
}

// ---- The phone floats over the road. The camera glides up to it, then past it. ----
function Phone() {
  const g = useRef<THREE.Group>(null);
  const bm = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => reelTexture(C.yellow), []);
  useFrame((s) => {
    const o = g.current;
    if (!o || !bm.current) return;
    const p = story.p;
    // grows in as the camera gets near, shrinks away once the camera has passed
    const env = smooth(range(p, 0.04, 0.12)) * (1 - smooth(range(p, 0.24, 0.31)));
    o.visible = env > 0.01;
    if (!o.visible) return;
    const time = s.clock.elapsedTime;
    o.scale.setScalar(env);
    o.position.set(0, 1.6 + Math.sin(time * 1.2) * 0.06, -14);
    o.lookAt(s.camera.position.x * 0.5, o.position.y, s.camera.position.z);
    bm.current.scale.setScalar(Math.max(0, easeOutBack(range(p, 0.135, 0.185))) * 0.5);
  });
  return (
    <group ref={g}>
      <RoundedBox args={[1.5, 2.9, 0.14]} radius={0.12} smoothness={3}>
        <meshLambertMaterial color={C.lilac} />
      </RoundedBox>
      <mesh position={[0, 0, 0.075]}>
        <planeGeometry args={[1.32, 2.7]} />
        <meshBasicMaterial map={tex} />
      </mesh>
      <mesh ref={bm} position={[0.45, -0.135, 0.22]} geometry={bookmarkGeo()}>
        <meshLambertMaterial color={C.red} />
      </mesh>
    </group>
  );
}

// ---- The glowing dot that walks past Cafe Luna ----
function Dot() {
  const g = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const o = g.current;
    if (!o) return;
    const p = story.p;
    const env = smooth(range(p, 0.25, 0.29)) * (1 - smooth(range(p, 0.43, 0.47)));
    o.visible = env > 0.01;
    if (!o.visible) return;
    const z = lerp(-20, -41, range(p, 0.26, 0.45));
    o.position.set(-1.5, 0.5 + Math.abs(Math.sin(z * 2.2)) * 0.12, z);
    o.scale.setScalar(env);
    if (halo.current) halo.current.scale.setScalar(1 + Math.sin(s.clock.elapsedTime * 5) * 0.12);
  });
  return (
    <group ref={g}>
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color={C.yellow} />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[0.45, 16, 16]} />
        <meshBasicMaterial color={C.yellow} transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshBasicMaterial color={C.yellow} transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ---- Scene 3: small purple bookmarks rain onto the cafe roof ----
const RAIN_COUNT = 22;
function Rain() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const items = useMemo(() => {
    const r = rng(11);
    return Array.from({ length: RAIN_COUNT }, (_, k) => ({
      x: -8 + (r() - 0.5) * 4.4,
      z: -30 + (r() - 0.5) * 6,
      y: 4.85 + (k % 3) * 0.04,
      delay: (k / RAIN_COUNT) * 0.6,
      spin: 2 + r() * 3,
      turn: (r() - 0.5) * 3,
    }));
  }, []);
  useFrame(() => {
    const f = range(story.p, 0.4, 0.6);
    refs.current.forEach((m, k) => {
      if (!m) return;
      const it = items[k];
      const a = range(f, it.delay, it.delay + 0.35);
      m.visible = a > 0;
      const fall = a * a;
      m.position.set(it.x, lerp(11, it.y, fall), it.z);
      m.rotation.set(lerp(it.spin, -Math.PI / 2, smooth(a)), it.turn * (1 - a), 0);
    });
  });
  return (
    <group>
      {items.map((_, k) => (
        <mesh
          key={k}
          ref={(m) => {
            refs.current[k] = m;
          }}
          geometry={bookmarkGeo()}
          scale={0.6}
          visible={false}
        >
          <meshLambertMaterial color={C.brand} emissive={C.deep} />
        </mesh>
      ))}
    </group>
  );
}

// ---- Scene 4: a reel card on the street, bookmarks fly from it to the cafe ----
const CARD_POS = new THREE.Vector3(1.4, 2.4, -22);
const CAFE_SIGN = new THREE.Vector3(-5.6, 3.7, -30);
const ARC = new THREE.Vector3(-2, 7.5, -26);

function ReelCard() {
  const g = useRef<THREE.Group>(null);
  const tex = useMemo(() => reelTexture(C.lilac), []);
  const flyRefs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame((s) => {
    const o = g.current;
    if (!o) return;
    const p = story.p;
    const t3 = range(p, 0.6, 0.84);
    flyRefs.current.forEach((m, j) => {
      if (!m) return;
      const f = flightProgress(t3, j);
      m.visible = f > 0 && f < 1;
      if (!m.visible) return;
      const e = smooth(f);
      const a = 1 - e;
      // a curved path: card -> high arc -> cafe sign
      m.position.set(
        a * a * CARD_POS.x + 2 * a * e * ARC.x + e * e * CAFE_SIGN.x,
        a * a * CARD_POS.y + 2 * a * e * ARC.y + e * e * CAFE_SIGN.y,
        a * a * CARD_POS.z + 2 * a * e * ARC.z + e * e * (CAFE_SIGN.z + (j - 2.5) * 0.4),
      );
      m.rotation.set(0, f * 6, f * 3);
    });
    // the card grows in as the camera arrives and shrinks away at the end
    const env = smooth(range(p, 0.56, 0.62)) * (1 - smooth(range(p, 0.82, 0.88)));
    o.visible = env > 0.01;
    if (!o.visible) return;
    o.scale.setScalar(env);
    o.position.set(CARD_POS.x, CARD_POS.y + Math.sin(s.clock.elapsedTime * 1.3) * 0.08, CARD_POS.z);
    o.lookAt(s.camera.position);
  });
  return (
    <>
      <group ref={g}>
        <RoundedBox args={[1.7, 3, 0.12]} radius={0.1} smoothness={3}>
          <meshLambertMaterial color={C.lilac} />
        </RoundedBox>
        <mesh position={[0, 0, 0.065]}>
          <planeGeometry args={[1.5, 2.8]} />
          <meshBasicMaterial map={tex} />
        </mesh>
      </group>
      {Array.from({ length: FLIGHT_COUNT }, (_, j) => (
        <mesh
          key={j}
          ref={(m) => {
            flyRefs.current[j] = m;
          }}
          geometry={bookmarkGeo()}
          scale={0.35}
          visible={false}
        >
          <meshLambertMaterial color={C.red} />
        </mesh>
      ))}
    </>
  );
}

// ---- Camera: moves along the street, with hard cuts between scenes ----
function Rig() {
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    const c = cameraFor(story.p);
    camera.position.set(c.pos[0], c.pos[1], c.pos[2]);
    look.set(c.look[0], c.look[1], c.look[2]);
    camera.lookAt(look);
    // On tall phone screens, widen the view so the scenes still fit.
    const cam = camera as THREE.PerspectiveCamera;
    const asp = size.width / size.height;
    const fov = asp >= 1 ? 50 : Math.min(78, 50 + (1 - asp) * 50);
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

export default function World({ onSlow }: { onSlow: () => void }) {
  const [dpr, setDpr] = useState(1.5);
  const declines = useRef(0);
  return (
    <Canvas dpr={dpr} camera={{ position: [0, 2.2, 5], fov: 50, near: 0.1, far: 120 }}>
      <PerformanceMonitor
        bounds={(refresh) => (refresh > 90 ? [60, 90] : [30, 55])}
        onDecline={() => {
          // Slow phone: first lower the sharpness, then switch to the simple version.
          declines.current += 1;
          if (declines.current === 1) setDpr(1);
          else onSlow();
        }}
      />
      <color attach="background" args={[C.deep]} />
      <fog attach="fog" args={[C.deep, 22, 75]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 8, 6]} intensity={1.6} />
      <Rig />
      <Street />
      <Cafe />
      <Hero />
      <Phone />
      <Dot />
      <Rain />
      <ReelCard />
    </Canvas>
  );
}
