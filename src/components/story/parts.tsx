"use client";

// Shared 3D building blocks: the shapes, the figure (ball head, no face), a window room, and a car.
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { V3 } from "@/lib/story";
import { facadeMat, glowTexture } from "./textures";

export const C = {
  brand: "#6A1FB0",
  deep: "#3C096C",
  red: "#E5383B",
  lilac: "#C9A2FF",
  yellow: "#FFD23F",
  white: "#FFFFFF",
};

// ---- Shared shapes (built once) ----
let bookmarkCache: THREE.BufferGeometry | null = null;
export function bookmarkGeo() {
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
export function starGeo() {
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

// A soft dark patch on the ground under an object, so it does not look like it floats.
export function ContactShadow({
  w,
  d,
  opacity = 0.5,
  y = 0.03,
}: {
  w: number;
  d: number;
  opacity?: number;
  y?: number;
}) {
  return (
    <mesh position={[0, y, 0]} rotation-x={-Math.PI / 2}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial map={glowTexture()} color={C.deep} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

// A rounded stick between two points (used for arms and legs).
function Limb({ a, b, r, color }: { a: V3; b: V3; r: number; color: string }) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  return (
    <mesh position={mid} quaternion={quat}>
      <capsuleGeometry args={[r, Math.max(0.01, len - 2 * r), 4, 8]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

// The figure: a round white head and a simple body. Never any face.
// Origin = hips. The figure faces +z. `hands` are the hand positions.
export function Figure({
  body = C.red,
  sit = false,
  hands,
}: {
  body?: string;
  sit?: boolean;
  hands: { l: V3; r: V3 };
}) {
  return (
    <group>
      <mesh position={[0, 0.58, 0]}>
        <capsuleGeometry args={[0.3, 0.5, 4, 12]} />
        <meshLambertMaterial color={body} />
      </mesh>
      <mesh position={[0, 1.4, 0]}>
        <sphereGeometry args={[0.28, 20, 20]} />
        <meshLambertMaterial color={C.white} emissive={C.lilac} emissiveIntensity={0.5} />
      </mesh>
      <Limb a={[-0.34, 0.98, 0]} b={hands.l} r={0.09} color={body} />
      <Limb a={[0.34, 0.98, 0]} b={hands.r} r={0.09} color={body} />
      {sit ? (
        <>
          <Limb a={[-0.16, 0, 0]} b={[-0.16, 0.05, 0.75]} r={0.11} color={C.deep} />
          <Limb a={[0.16, 0, 0]} b={[0.16, 0.05, 0.75]} r={0.11} color={C.deep} />
          <Limb a={[-0.16, 0.05, 0.75]} b={[-0.16, -0.65, 0.8]} r={0.1} color={C.deep} />
          <Limb a={[0.16, 0.05, 0.75]} b={[0.16, -0.65, 0.8]} r={0.1} color={C.deep} />
        </>
      ) : (
        <>
          <Limb a={[-0.16, 0, 0]} b={[-0.16, -1.0, 0]} r={0.11} color={C.deep} />
          <Limb a={[0.16, 0, 0]} b={[0.16, -1.0, 0]} r={0.11} color={C.deep} />
        </>
      )}
    </group>
  );
}

// A home building with a high window and a lit room behind it.
// side = -1: left side of the street (window faces +x). side = 1: right side.
// Local frame: the front wall is at x = 0, the room goes toward -x, the window is centred at z = 0.
export function HomeBuilding({
  side,
  z,
  dz = 7.6,
  height = 14,
  roomLight = true,
  children,
}: {
  side: -1 | 1;
  z: number;
  dz?: number;
  height?: number;
  roomLight?: boolean;
  children?: React.ReactNode;
}) {
  const wall = C.brand;
  const hz = dz / 2;
  return (
    <group position={[side * 5.5, 0, z]} rotation-y={side === -1 ? 0 : Math.PI}>
      {/* lower and upper blocks */}
      <mesh position={[-3.5, 3.7, 0]}>
        <boxGeometry args={[7, 7.4, dz]} />
        <primitive object={facadeMat()} attach="material" />
      </mesh>
      <mesh position={[-3.5, (10.6 + height) / 2, 0]}>
        <boxGeometry args={[7, height - 10.6, dz]} />
        <primitive object={facadeMat()} attach="material" />
      </mesh>
      {/* roof ledge */}
      <mesh position={[-3.5, height + 0.15, 0]}>
        <boxGeometry args={[7.4, 0.3, dz + 0.4]} />
        <meshLambertMaterial color={C.deep} />
      </mesh>
      {/* front wall around the window opening (2.6 wide, 2 tall) */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[-0.15, 9, sd * ((1.3 + hz) / 2)]}>
          <boxGeometry args={[0.3, 3.2, hz - 1.3]} />
          <meshLambertMaterial color={wall} />
        </mesh>
      ))}
      <mesh position={[-0.15, 7.7, 0]}>
        <boxGeometry args={[0.3, 0.6, 2.6]} />
        <meshLambertMaterial color={C.lilac} />
      </mesh>
      <mesh position={[-0.15, 10.3, 0]}>
        <boxGeometry args={[0.3, 0.6, 2.6]} />
        <meshLambertMaterial color={wall} />
      </mesh>
      {/* the room: back wall, side walls, ceiling, rug */}
      <mesh position={[-6.85, 9, 0]}>
        <boxGeometry args={[0.3, 3.2, dz]} />
        <meshLambertMaterial color={wall} />
      </mesh>
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[-3.5, 9, sd * (hz - 0.15)]}>
          <boxGeometry args={[7, 3.2, 0.3]} />
          <meshLambertMaterial color={wall} />
        </mesh>
      ))}
      <mesh position={[-3.5, 10.55, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[6.6, dz - 0.6]} />
        <meshLambertMaterial color={C.brand} />
      </mesh>
      <mesh position={[-3.5, 7.42, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[6.6, dz - 0.6]} />
        <meshLambertMaterial color={C.deep} />
      </mesh>
      {roomLight && <pointLight position={[-3, 9.2, 0]} intensity={22} distance={11} color={C.yellow} />}
      {children}
    </group>
  );
}

// A small phone that shows a scrolling reel. Screen faces +z in its own frame.
export function PhoneBody({
  w = 0.7,
  h = 1.35,
  tex,
}: {
  w?: number;
  h?: number;
  tex: THREE.Texture;
}) {
  return (
    <group>
      <RoundedBox args={[w + 0.1, h + 0.1, 0.06]} radius={0.05} smoothness={2}>
        <meshLambertMaterial color={C.lilac} />
      </RoundedBox>
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={tex} />
      </mesh>
    </group>
  );
}

// A friendly open-top car. It drives toward -z. Pass a driver if you want one.
// `driverRef` lets the page hide the driver once the car has stopped.
export function Car({
  driver = true,
  color = C.red,
  driverRef,
}: {
  driver?: boolean;
  color?: string;
  driverRef?: React.RefObject<THREE.Group | null>;
}) {
  return (
    <group>
      <ContactShadow w={3.2} d={5.2} opacity={0.55} />
      <RoundedBox args={[1.9, 0.5, 4]} radius={0.14} smoothness={3} position={[0, 0.55, 0]}>
        <meshLambertMaterial color={color} />
      </RoundedBox>
      <RoundedBox args={[1.8, 0.3, 1.1]} radius={0.1} smoothness={2} position={[0, 0.98, -1.55]}>
        <meshLambertMaterial color={color} />
      </RoundedBox>
      {/* bumpers */}
      <mesh position={[0, 0.38, -2.05]}>
        <boxGeometry args={[1.8, 0.14, 0.12]} />
        <meshLambertMaterial color={C.lilac} />
      </mesh>
      <mesh position={[0, 0.38, 2.05]}>
        <boxGeometry args={[1.8, 0.14, 0.12]} />
        <meshLambertMaterial color={C.lilac} />
      </mesh>
      {/* seats and backs */}
      {[-0.45, 0.45].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.92, 0.4]}>
            <boxGeometry args={[0.8, 0.3, 0.8]} />
            <meshLambertMaterial color={C.lilac} />
          </mesh>
          <mesh position={[x, 1.25, 0.82]}>
            <boxGeometry args={[0.8, 0.5, 0.15]} />
            <meshLambertMaterial color={C.lilac} />
          </mesh>
        </group>
      ))}
      {/* windscreen with a frame */}
      <mesh position={[0, 1.3, -0.75]} rotation-x={-0.5}>
        <planeGeometry args={[1.7, 0.6]} />
        <meshBasicMaterial color={C.lilac} transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.02, -0.62]} rotation-x={-0.5}>
        <boxGeometry args={[1.8, 0.05, 0.05]} />
        <meshLambertMaterial color={C.deep} />
      </mesh>
      {/* one wide light bar at the front, a lilac one at the back, and a plate */}
      <mesh position={[0, 0.62, -2.01]}>
        <boxGeometry args={[1.4, 0.12, 0.04]} />
        <meshBasicMaterial color={C.yellow} />
      </mesh>
      <mesh position={[0, 0.62, 2.01]}>
        <boxGeometry args={[1.4, 0.12, 0.04]} />
        <meshBasicMaterial color={C.lilac} />
      </mesh>
      <mesh position={[0, 0.5, 2.03]}>
        <boxGeometry args={[0.6, 0.16, 0.02]} />
        <meshLambertMaterial color={C.white} />
      </mesh>
      {/* wheels with rims */}
      {[
        [-0.98, -1.3],
        [0.98, -1.3],
        [-0.98, 1.3],
        [0.98, 1.3],
      ].map(([x, zz]) => (
        <group key={`${x}${zz}`} position={[x, 0.38, zz]} rotation-z={Math.PI / 2}>
          <mesh>
            <cylinderGeometry args={[0.38, 0.38, 0.28, 16]} />
            <meshLambertMaterial color={C.deep} />
          </mesh>
          <mesh position={[0, x > 0 ? 0.15 : -0.15, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.02, 12]} />
            <meshLambertMaterial color={C.lilac} />
          </mesh>
        </group>
      ))}
      {/* steering wheel */}
      <mesh position={[-0.45, 1.25, -0.35]} rotation-x={-0.9}>
        <torusGeometry args={[0.2, 0.03, 8, 16]} />
        <meshLambertMaterial color={C.deep} />
      </mesh>
      {driver && (
        <group ref={driverRef} position={[-0.45, 1.05, 0.4]} rotation-y={Math.PI}>
          <Figure sit body={C.yellow} hands={{ l: [-0.22, 0.75, 0.6], r: [0.22, 0.75, 0.6] }} />
        </group>
      )}
    </group>
  );
}
