"use client";

// The 3D night street. Light on purpose: simple shapes, no shadows.
// Everything moving reads the scroll position (story.p) and the camera rides one smooth path.

import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor, RoundedBox } from "@react-three/drei";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { story, range, smooth, lerp, easeOutBack, dayFactor, type StoryId } from "@/lib/story";
import { cameraFor, carState, passerAt, reelAt, curve3, CREDIT_PTS, WINDOW_A } from "@/lib/paths";
import {
  reelTexture,
  reelStripTexture,
  signTexture,
  questionTexture,
  adTexture,
  facadeMat,
  roadMat,
} from "./textures";
import { C, bookmarkGeo, starGeo, Figure, HomeBuilding, PhoneBody, Car, ContactShadow } from "./parts";

const YEL = new THREE.Color(C.yellow);
const DEEP = new THREE.Color(C.deep);
const LILAC = new THREE.Color(C.lilac);
const BRAND = new THREE.Color(C.brand);

// Shared materials: the day/night code changes their colour.
const windowMat = new THREE.MeshBasicMaterial({ color: C.yellow });
const bulbMat = new THREE.MeshBasicMaterial({ color: C.yellow });
const haloMat = new THREE.MeshBasicMaterial({
  color: C.yellow,
  transparent: true,
  opacity: 0.2,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const starsMat = new THREE.PointsMaterial({ color: "#ffffff", size: 2, sizeAttenuation: false, transparent: true, fog: false });

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// ---------------------------------------------------------------- street
const LEFT_Z = [7.2, -0.4, -15.6, -23.2, -30.8, -38.4, -46, -53.6, -61.2, -68.8, -76.4]; // -8 is the home
const RIGHT: [number, number][] = [
  [7.2, 7.6],
  [-0.4, 7.6],
  [-8, 7.6],
  [-14.15, 4.7],
  [-25.8, 7.6],
  [-33.4, 7.6],
  [-41, 7.6],
  [-56, 7.6],
  [-63.6, 7.6],
  [-71.2, 7.6],
  [-78.8, 7.6],
]; // gap at -22..-16.5 is the side street, -48.4 is the second home
const LAMP_Z = [2, -10, -22, -38, -52, -66];
const SIDE_BUILDINGS: [number, number, number, number, number][] = [
  // x, z, width, depth, height
  [28, -11, 6, 6, 9],
  [34, -14, 6, 7, 12],
  [24, -27, 6, 7, 10],
  [31, -27, 6, 7, 13],
  [38, -26, 6, 7, 9],
];

function Street() {
  const { buildings, windows } = useMemo(() => {
    const r = rng(7);
    const list: { x: number; z: number; d: number; dz: number; h: number }[] = [];
    const wins: THREE.Matrix4[] = [];
    const dummy = new THREE.Object3D();
    const add = (side: -1 | 1, z: number, dz: number) => {
      const d = 5 + r() * 3;
      const h = 7 + r() * 8;
      list.push({ x: side * (5.5 + d / 2), z, d, dz, h });
      const rows = Math.floor((h - 1) / 2.2);
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < 3; col++) {
          if (r() < 0.55) continue; // most windows stay dark
          dummy.position.set(side * 5.47, 2 + row * 2.2, z - (dz / 3) * 0.95 + col * (dz / 3) * 0.95);
          dummy.rotation.set(0, -side * (Math.PI / 2), 0);
          dummy.updateMatrix();
          wins.push(dummy.matrix.clone());
        }
      }
    };
    LEFT_Z.forEach((z) => add(-1, z, 7.6));
    RIGHT.forEach(([z, dz]) => add(1, z, dz));
    return { buildings: list, windows: wins };
  }, []);

  const mats = useMemo(() => ({ main: roadMat(2, 40), side: roadMat(12, 2) }), []);
  const dashes = useMemo(() => {
    const dummy = new THREE.Object3D();
    const m: THREE.Matrix4[] = [];
    for (let k = 0; k < 30; k++) {
      dummy.position.set(0, 0.02, 8 - k * 4.5);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.updateMatrix();
      m.push(dummy.matrix.clone());
    }
    for (let k = 0; k < 7; k++) {
      dummy.position.set(8 + k * 4.5, 0.02, -19.25);
      dummy.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
      dummy.updateMatrix();
      m.push(dummy.matrix.clone());
    }
    return m;
  }, []);

  return (
    <group>
      {/* ground, main road, side road, sidewalks */}
      <mesh rotation-x={-Math.PI / 2} position={[10, -0.02, -40]}>
        <planeGeometry args={[160, 180]} />
        <meshLambertMaterial color={C.deep} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, -40]} material={mats.main}>
        <planeGeometry args={[8, 150]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[22, 0, -19.25]} material={mats.side}>
        <planeGeometry args={[36, 5.5]} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 4.75, 0.08, -40]}>
          <boxGeometry args={[1.5, 0.16, 150]} />
          <meshLambertMaterial color={C.deep} />
        </mesh>
      ))}
      <mesh position={[22, 0.08, -15.7]}>
        <boxGeometry args={[36, 0.16, 1.5]} />
        <meshLambertMaterial color={C.deep} />
      </mesh>
      <mesh position={[22, 0.08, -22.8]}>
        <boxGeometry args={[36, 0.16, 1.5]} />
        <meshLambertMaterial color={C.deep} />
      </mesh>
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
        <group key={k}>
          <mesh position={[b.x, b.h / 2, b.z]}>
            <boxGeometry args={[b.d, b.h, b.dz]} />
            <primitive object={facadeMat()} attach="material" />
          </mesh>
          <mesh position={[b.x, b.h + 0.15, b.z]}>
            <boxGeometry args={[b.d + 0.4, 0.3, b.dz + 0.4]} />
            <meshLambertMaterial color={C.deep} />
          </mesh>
        </group>
      ))}
      {SIDE_BUILDINGS.map(([x, z, w, d, h], k) => (
        <group key={`s${k}`}>
          <mesh position={[x, h / 2, z]}>
            <boxGeometry args={[w, h, d]} />
            <primitive object={facadeMat()} attach="material" />
          </mesh>
          <mesh position={[x, h + 0.15, z]}>
            <boxGeometry args={[w + 0.4, 0.3, d + 0.4]} />
            <meshLambertMaterial color={C.deep} />
          </mesh>
        </group>
      ))}

      <instancedMesh
        args={[undefined, undefined, windows.length]}
        material={windowMat}
        ref={(m) => {
          if (!m) return;
          const tints = ["#ffffff", "#ffe9b0", "#e8d4ff", "#ffffff"];
          const col = new THREE.Color();
          windows.forEach((mat, k) => {
            m.setMatrixAt(k, mat);
            m.setColorAt(k, col.set(tints[k % tints.length]));
          });
          m.instanceMatrix.needsUpdate = true;
          if (m.instanceColor) m.instanceColor.needsUpdate = true;
        }}
      >
        <planeGeometry args={[0.9, 1.1]} />
      </instancedMesh>

      {[-1, 1].flatMap((side) =>
        LAMP_Z.map((z) => (
          <group key={`${side}${z}`} position={[side * 4.6, 0, z]}>
            <mesh position={[0, 1.7, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 3.4, 6]} />
              <meshLambertMaterial color={C.lilac} />
            </mesh>
            <mesh position={[0, 3.5, 0]} material={bulbMat}>
              <sphereGeometry args={[0.22, 10, 10]} />
            </mesh>
            <mesh position={[0, 3.5, 0]} material={haloMat}>
              <sphereGeometry args={[0.8, 10, 10]} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

// ---------------------------------------------------------------- sky, light, sun and moon
// A few hundred stars on a big dome, seen at night.
const starsGeo = (() => {
  const r = rng(99);
  const pos: number[] = [];
  for (let i = 0; i < 260; i++) {
    const a = r() * Math.PI * 2;
    const h = 0.25 + r() * 0.75;
    const rad = 95;
    pos.push(Math.cos(a) * rad * (1 - h * 0.35), 18 + h * 80, -30 + Math.sin(a) * rad * (1 - h * 0.35));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
})();
function Sky({ id }: { id: StoryId }) {
  const amb = useRef<THREE.AmbientLight>(null);
  const dir = useRef<THREE.DirectionalLight>(null);
  const sun = useRef<THREE.Mesh>(null);
  const moon = useRef<THREE.Mesh>(null);
  const tmp = useMemo(() => new THREE.Color(), []);
  useFrame(({ scene }) => {
    const p = story.p;
    const d = dayFactor(id, p);
    tmp.copy(DEEP).lerp(LILAC, d);
    (scene.background as THREE.Color).copy(tmp);
    (scene.fog as THREE.Fog).color.copy(tmp);
    if (amb.current) amb.current.intensity = lerp(0.6, 0.95, d);
    haloMat.opacity = 0.22 * (1 - d);
    starsMat.opacity = 0.9 * (1 - d);
    if (dir.current) dir.current.intensity = lerp(1.6, 2.0, d);
    windowMat.color.copy(YEL).lerp(BRAND, d);
    bulbMat.color.copy(YEL).lerp(BRAND, d);
    // sun and moon cross the sky three times in "You"
    const active = id === "you" && p > 0.4 && p < 0.66;
    const f = (range(p, 0.4, 0.66) * 3) % 1;
    if (sun.current) {
      sun.current.visible = active;
      sun.current.position.set(lerp(-14, 14, f), 3 + 12 * Math.sin(Math.PI * f), -22);
    }
    if (moon.current) {
      const m = (f + 0.5) % 1;
      moon.current.visible = active;
      moon.current.position.set(lerp(-14, 14, m), 3 + 12 * Math.sin(Math.PI * m), -22);
    }
  });
  return (
    <>
      <ambientLight ref={amb} intensity={0.6} />
      <hemisphereLight args={[C.lilac, C.deep, 0.6]} />
      <points material={starsMat} geometry={starsGeo} />
      <directionalLight ref={dir} position={[3, 8, 6]} intensity={1.6} />
      <mesh ref={sun} visible={false}>
        <sphereGeometry args={[1.6, 20, 20]} />
        <meshBasicMaterial color={C.yellow} fog={false} />
      </mesh>
      <mesh ref={moon} visible={false}>
        <sphereGeometry args={[1.2, 20, 20]} />
        <meshBasicMaterial color={C.white} fog={false} />
      </mesh>
    </>
  );
}

// ---------------------------------------------------------------- cafe (side street, right side)
function Cafe({ id }: { id: StoryId }) {
  const sign = useMemo(() => signTexture("Café Luna"), []);
  const winMats = useMemo(() => [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: C.deep })), []);
  useFrame(() => {
    const p = story.p;
    winMats.forEach((m, k) => {
      const lit =
        id === "you" ? range(p, 0.89 + k * 0.01, 0.93) : id === "influencer" ? 1 : range(p, 0.86 + k * 0.01, 0.9);
      m.color.copy(DEEP).lerp(YEL, lit);
    });
  });

  return (
    <group position={[19, 0, -12.4]} rotation-y={Math.PI / 2}>
      <ContactShadow w={8} d={9.5} opacity={0.5} />
      <mesh position={[0, 2.2, 0]}>
        <boxGeometry args={[5, 4.4, 6.6]} />
        <meshLambertMaterial color={C.lilac} />
      </mesh>
      <mesh position={[0, 4.55, 0]}>
        <boxGeometry args={[5.6, 0.3, 7.2]} />
        <meshLambertMaterial color={C.red} />
      </mesh>
      <mesh position={[2.52, 3.5, 0.2]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[3.2, 0.8]} />
        <meshBasicMaterial map={sign} transparent />
      </mesh>
      {/* door, handle, striped awning */}
      <mesh position={[2.52, 1.1, -2.2]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[1.1, 2.2]} />
        <meshLambertMaterial color={C.deep} />
      </mesh>
      <mesh position={[2.56, 1.1, -1.75]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={C.yellow} />
      </mesh>
      {[-0.6, -0.2, 0.2, 0.6].map((dz, k) => (
        <mesh key={dz} position={[2.9, 2.5, -2.2 + dz]}>
          <boxGeometry args={[0.8, 0.12, 0.4]} />
          <meshLambertMaterial color={k % 2 ? C.white : C.red} />
        </mesh>
      ))}
      {/* three windows with frames */}
      {[-0.4, 1, 2.4].map((z, k) => (
        <group key={z}>
          <mesh position={[2.5, 1.9, z]}>
            <boxGeometry args={[0.05, 1.65, 1.25]} />
            <meshLambertMaterial color={C.deep} />
          </mesh>
          <mesh position={[2.53, 1.9, z]} rotation-y={Math.PI / 2} material={winMats[k]}>
            <planeGeometry args={[1.1, 1.5]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------- the cafe's little terrace (and a customer when they arrive)
const TABLE_X = [17.6, 19.6, 21.6];
function Patio({ id }: { id: StoryId }) {
  const guest = useRef<THREE.Group>(null);
  const cup = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const a = id === "restaurant" ? smooth(range(story.p, 0.87, 0.91)) : 0;
    if (guest.current) {
      guest.current.visible = a > 0.01;
      guest.current.scale.setScalar(Math.max(0.001, a));
    }
    if (cup.current) cup.current.scale.setScalar(Math.max(0.001, a));
  });
  return (
    <group>
      {TABLE_X.map((x) => (
        <group key={x}>
          <mesh position={[x, 0.38, -15.5]}>
            <cylinderGeometry args={[0.05, 0.05, 0.76, 6]} />
            <meshLambertMaterial color={C.deep} />
          </mesh>
          <mesh position={[x, 0.78, -15.5]}>
            <cylinderGeometry args={[0.45, 0.45, 0.05, 16]} />
            <meshLambertMaterial color={C.lilac} />
          </mesh>
          <mesh position={[x, 0.5, -16.15]}>
            <boxGeometry args={[0.45, 0.06, 0.45]} />
            <meshLambertMaterial color={C.yellow} />
          </mesh>
          <mesh position={[x, 0.78, -16.4]}>
            <boxGeometry args={[0.45, 0.5, 0.06]} />
            <meshLambertMaterial color={C.yellow} />
          </mesh>
        </group>
      ))}
      <group ref={guest} position={[19.6, 0.62, -16.15]} visible={false}>
        <Figure sit body={C.yellow} hands={{ l: [-0.22, 0.28, 0.7], r: [0.22, 0.28, 0.7] }} />
      </group>
      <mesh ref={cup} position={[19.6, 0.88, -15.5]}>
        <cylinderGeometry args={[0.1, 0.08, 0.14, 12]} />
        <meshLambertMaterial color={C.white} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- restaurant story: flyers, an advert, cars driving past
function Flyers() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  const items = useMemo(() => {
    const r = rng(5);
    return Array.from({ length: 18 }, () => ({
      x: 8 + r() * 18,
      z: -22 + r() * 6.4,
      delay: r() * 0.08,
      sway: r() * 6,
      yaw: r() * Math.PI,
    }));
  }, []);
  useFrame(() => {
    const p = story.p;
    refs.current.forEach((m, k) => {
      if (!m) return;
      const it = items[k];
      const a = range(p, it.delay, it.delay + 0.12);
      const e = smooth(a);
      m.visible = a > 0;
      m.position.set(it.x + (1 - a) * Math.sin(a * 8 + it.sway) * 0.9, lerp(9, 0.06, e), it.z);
      m.rotation.order = "YXZ";
      m.rotation.set(-Math.PI / 2 + (1 - a) * Math.sin(a * 10 + it.sway) * 0.9, it.yaw + (1 - a) * 3, 0);
    });
  });
  return (
    <>
      {items.map((_, k) => (
        <mesh
          key={k}
          ref={(m) => {
            refs.current[k] = m;
          }}
          visible={false}
        >
          <planeGeometry args={[0.5, 0.7]} />
          <meshLambertMaterial color={k % 2 ? C.yellow : C.white} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </>
  );
}

function Billboard() {
  const tex = useMemo(() => adTexture(), []);
  return (
    <group position={[14.9, 0, -15.9]} rotation-y={Math.PI}>
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, 1.2, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 2.4, 6]} />
          <meshLambertMaterial color={C.deep} />
        </mesh>
      ))}
      <mesh position={[0, 2.9, 0]}>
        <boxGeometry args={[2.6, 1.7, 0.1]} />
        <meshLambertMaterial color={C.deep} />
      </mesh>
      <mesh position={[0, 2.9, 0.06]}>
        <planeGeometry args={[2.4, 1.5]} />
        <meshBasicMaterial map={tex} />
      </mesh>
    </group>
  );
}

const PASSER_COLORS = [C.lilac, C.yellow, C.white];
function Passers() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    refs.current.forEach((g, k) => {
      if (!g) return;
      const st = passerAt(k, story.p);
      g.visible = st.visible;
      if (st.visible) g.position.set(2, 0, st.z);
    });
  });
  return (
    <>
      {PASSER_COLORS.map((c, k) => (
        <group
          key={k}
          ref={(g) => {
            refs.current[k] = g;
          }}
          visible={false}
        >
          <Car color={c} />
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- a person on a bed, scrolling reels
// Lives inside a HomeBuilding (local frame). The person's back is to the window, so the camera
// can look over the shoulder at the phone.
function ScrollingPerson({
  scrollAt,
  popAt,
}: {
  scrollAt: (p: number) => number;
  popAt: number;
}) {
  const tex = useMemo(() => reelStripTexture(), []);
  const bm = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const p = story.p;
    const k = scrollAt(p);
    tex.offset.set(0, ((((2 - (k % 3)) % 3) + 3) % 3) / 3);
    if (bm.current) bm.current.scale.setScalar(Math.max(0, easeOutBack(range(p, popAt, popAt + 0.04))) * 0.45);
  });
  return (
    <group>
      <mesh position={[-3.7, 7.75, 0]}>
        <boxGeometry args={[3.4, 0.7, 3.2]} />
        <meshLambertMaterial color={C.lilac} />
      </mesh>
      <mesh position={[-5.2, 8.45, 0]}>
        <boxGeometry args={[0.5, 0.9, 3.2]} />
        <meshLambertMaterial color={C.red} />
      </mesh>
      <group position={[-3.3, 8.35, 0]} rotation-y={-Math.PI / 2}>
        <Figure sit body={C.red} hands={{ l: [-0.2, 0.85, 0.95], r: [0.2, 0.85, 0.95] }} />
      </group>
      <group position={[-4.4, 9.2, 0]} rotation-y={Math.PI / 2}>
        <PhoneBody tex={tex} />
      </group>
      <mesh ref={bm} position={[-4.4, 10.3, 0]} rotation-y={Math.PI / 2} geometry={bookmarkGeo()}>
        <meshLambertMaterial color={C.red} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- the person making a reel (influencer)
function FilmingPerson() {
  const tex = useMemo(() => reelTexture(C.yellow), []);
  return (
    <group>
      <group position={[-3.6, 8.45, 0.65]} rotation-y={Math.PI / 2}>
        <Figure body={C.yellow} hands={{ l: [0.45, 0.9, 0.9], r: [0.8, 0.9, 0.9] }} />
      </group>
      <group position={[-2.65, 9.35, 0]} rotation-y={-Math.PI / 2}>
        <PhoneBody w={0.6} h={1.1} tex={tex} />
      </group>
      {/* table with a coffee cup */}
      <mesh position={[-1.05, 7.9, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial color={C.lilac} />
      </mesh>
      <mesh position={[-1.05, 8.6, 0]}>
        <cylinderGeometry args={[0.22, 0.18, 0.3, 16]} />
        <meshLambertMaterial color={C.yellow} />
      </mesh>
      <mesh position={[-1.05, 8.43, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.04, 16]} />
        <meshLambertMaterial color={C.white} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- bookmark logo that flies into the window (You)
const HERO_PTS: [number, number, number][] = [
  [0, 1.9, -4],
  [-2, 4.5, -6],
  [-4.5, 8, -8],
  [-6.4, 9.2, -8],
  [-8.6, 10, -8],
  [-9.9, 10.3, -8],
];
function Hero() {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => {
    const o = g.current;
    if (!o) return;
    const p = story.p;
    const time = s.clock.elapsedTime;
    const fly = smooth(range(p, 0.04, 0.17));
    const pos = curve3(HERO_PTS, fly);
    o.position.set(pos[0], pos[1] + Math.sin(time * 1.4) * 0.1 * (1 - fly), pos[2]);
    const env = 1 - smooth(range(p, 0.37, 0.4));
    o.visible = env > 0.01;
    o.scale.setScalar(lerp(1.15, 0.45, fly) * env);
    o.rotation.y = lerp(-0.5 + p * 3, Math.PI / 2, fly);
  });
  return (
    <group ref={g}>
      <mesh geometry={bookmarkGeo()}>
        <meshLambertMaterial color={C.red} />
      </mesh>
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

// One saved bookmark appears above the window for each day (You).
function DayBadges() {
  const refs = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(() => {
    refs.current.forEach((m, k) => {
      if (!m) return;
      const a = easeOutBack(range(story.p, 0.43 + k * 0.09, 0.47 + k * 0.09));
      m.visible = a > 0.01;
      m.scale.setScalar(Math.max(0, a) * 0.5);
    });
  });
  return (
    <>
      {[0, 1, 2].map((k) => (
        <mesh
          key={k}
          ref={(m) => {
            refs.current[k] = m;
          }}
          position={[-5.2, 11.6, WINDOW_A[2] + (k - 1) * 1.3]}
          rotation-y={Math.PI / 2}
          geometry={bookmarkGeo()}
          visible={false}
        >
          <meshLambertMaterial color={C.red} />
        </mesh>
      ))}
    </>
  );
}

// The saved place glows above the cafe once the car is on its way (You).
function PlaceMarker() {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => {
    const o = g.current;
    if (!o) return;
    const env = smooth(range(story.p, 0.72, 0.78));
    o.visible = env > 0.01;
    o.scale.setScalar(env * 0.9);
    o.position.set(19.2, 7.6 + Math.sin(s.clock.elapsedTime * 1.5) * 0.15, -12.4);
    o.lookAt(s.camera.position.x, o.position.y, s.camera.position.z);
  });
  return (
    <group ref={g}>
      <mesh geometry={bookmarkGeo()}>
        <meshLambertMaterial color={C.red} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------- the car
function DrivingCar({ id }: { id: StoryId }) {
  const g = useRef<THREE.Group>(null);
  const driver = useRef<THREE.Group>(null);
  useFrame(() => {
    const o = g.current;
    if (!o) return;
    // in the restaurant story the driver steps out to sit at a table
    if (driver.current) driver.current.visible = !(id === "restaurant" && story.p > 0.885);
    const c = carState(id, story.p);
    if (!c || c.scale < 0.01) {
      o.visible = false;
      return;
    }
    o.visible = true;
    o.position.set(c.x, 0, c.z);
    o.rotation.y = c.yaw;
    o.scale.setScalar(c.scale);
  });
  return (
    <group ref={g} visible={false}>
      <Car driverRef={driver} />
    </group>
  );
}

// ---------------------------------------------------------------- influencer extras
function FlyingReel() {
  const g = useRef<THREE.Group>(null);
  const tex = useMemo(() => reelTexture(C.yellow), []);
  useFrame((s) => {
    const o = g.current;
    if (!o) return;
    const p = story.p;
    const env = smooth(range(p, 0.12, 0.15)) * (1 - smooth(range(p, 0.335, 0.36)));
    o.visible = env > 0.01;
    if (!o.visible) return;
    const pos = reelAt(p);
    o.position.set(pos[0], pos[1], pos[2]);
    o.scale.setScalar(env);
    o.lookAt(s.camera.position);
  });
  return (
    <group ref={g}>
      <RoundedBox args={[1.1, 1.9, 0.08]} radius={0.08} smoothness={3}>
        <meshLambertMaterial color={C.lilac} />
      </RoundedBox>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[0.95, 1.75]} />
        <meshBasicMaterial map={tex} />
      </mesh>
    </group>
  );
}

function QuestionBubble() {
  const g = useRef<THREE.Mesh>(null);
  const tex = useMemo(() => questionTexture(), []);
  useFrame((s) => {
    const o = g.current;
    if (!o) return;
    const p = story.p;
    const env = smooth(range(p, 0.66, 0.69)) * (1 - smooth(range(p, 0.78, 0.82)));
    o.visible = env > 0.01;
    if (!o.visible) return;
    o.scale.setScalar(env * 2.2);
    o.position.set(19.2, 6.4 + Math.sin(s.clock.elapsedTime * 2) * 0.1, -14.9);
    o.lookAt(s.camera.position);
  });
  return (
    <mesh ref={g} visible={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent />
    </mesh>
  );
}

// A glowing yellow thread grows from the cafe back to the influencer's window, with a coin on it.
function CreditThread() {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(CREDIT_PTS.map((v) => new THREE.Vector3(...v))), []);
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 60, 0.07, 5, false), [curve]);
  const coin = useRef<THREE.Group>(null);
  const star = useRef<THREE.Mesh>(null);
  const tube = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    const p = story.p;
    const q = smooth(range(p, 0.79, 0.9));
    geo.setDrawRange(0, Math.floor(q * 60) * 5 * 6);
    if (tube.current) tube.current.visible = q > 0.01;
    if (coin.current) {
      coin.current.visible = q > 0.01 && q < 0.995;
      const v = curve.getPoint(q);
      coin.current.position.copy(v);
      coin.current.rotation.y = s.clock.elapsedTime * 4;
    }
    if (star.current) {
      const a = easeOutBack(range(p, 0.9, 0.94));
      star.current.visible = a > 0.01;
      star.current.scale.setScalar(Math.max(0, a) * 2.2);
      star.current.rotation.y = s.clock.elapsedTime * 1.2;
    }
  });
  return (
    <>
      <mesh ref={tube} geometry={geo} visible={false}>
        <meshBasicMaterial color={C.yellow} />
      </mesh>
      <group ref={coin} visible={false}>
        <mesh rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.4, 0.4, 0.1, 18]} />
          <meshBasicMaterial color={C.yellow} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.8, 14, 14]} />
          <meshBasicMaterial color={C.yellow} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      </group>
      <mesh ref={star} geometry={starGeo()} position={[-4.6, 11.4, -8]} rotation-x={0} visible={false}>
        <meshBasicMaterial color={C.yellow} />
      </mesh>
    </>
  );
}

// ---------------------------------------------------------------- the camera
function Rig({ id }: { id: StoryId }) {
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    const c = cameraFor(id, story.p);
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

// How fast the phone scrolls through reels (a whole number of cards at the stopping points).
const scrollYou = (p: number) => 12 * range(p, 0.15, 0.3) + 18 * range(p, 0.4, 0.66);
const scrollB = (p: number) => 9 * range(p, 0.3, 0.4);

export default function World({ id, onSlow }: { id: StoryId; onSlow: () => void }) {
  const [dpr, setDpr] = useState(1.5);
  const declines = useRef(0);
  return (
    <Canvas dpr={dpr} camera={{ position: [0, 2.2, 5], fov: 50, near: 0.1, far: 140 }}>
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
      <fog attach="fog" args={[C.deep, 22, 80]} />
      <Sky id={id} />
      <Rig id={id} />
      <Street />
      <Cafe id={id} />
      <Patio id={id} />

      {/* left home: the customer in "You", the influencer in "Influencer" */}
      <HomeBuilding side={-1} z={-8} roomLight={id !== "restaurant"}>
        {id === "you" && <ScrollingPerson scrollAt={scrollYou} popAt={0.29} />}
        {id === "influencer" && <FilmingPerson />}
      </HomeBuilding>
      {/* right home far down the street: the customer in "Influencer" */}
      <HomeBuilding side={1} z={-48.4} roomLight={id === "influencer"}>
        {id === "influencer" && <ScrollingPerson scrollAt={scrollB} popAt={0.42} />}
      </HomeBuilding>

      {id === "you" && (
        <>
          <Hero />
          <DayBadges />
          <PlaceMarker />
          <DrivingCar id="you" />
        </>
      )}
      {id === "restaurant" && (
        <>
          <Flyers />
          <Billboard />
          <Passers />
          <DrivingCar id="restaurant" />
        </>
      )}
      {id === "influencer" && (
        <>
          <FlyingReel />
          <DrivingCar id="influencer" />
          <QuestionBubble />
          <CreditThread />
        </>
      )}
    </Canvas>
  );
}
