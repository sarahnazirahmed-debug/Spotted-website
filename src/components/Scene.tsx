"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { useRef, useState } from "react";
import type { Group } from "three";

// A simple map pin made of a ball and a cone. No faces or people.
function Pin({ reduceMotion }: { reduceMotion: boolean }) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (ref.current && !reduceMotion) ref.current.rotation.y += delta * 0.6;
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.8, 48, 48]} />
        <meshStandardMaterial color="#C9A2FF" roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.7, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.6, 1.4, 48]} />
        <meshStandardMaterial color="#C9A2FF" roughness={0.3} />
      </mesh>
      {/* A ring around the pin */}
      <mesh position={[0, 0.55, 0]} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[1.25, 0.06, 24, 80]} />
        <meshStandardMaterial color="#FFD23F" />
      </mesh>
    </group>
  );
}

// A floating coin (a flat yellow cylinder).
function Coin({ position }: { position: [number, number, number] }) {
  return (
    <Float speed={2} floatIntensity={1.2} rotationIntensity={1.5}>
      <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.07, 40]} />
        <meshStandardMaterial color="#FFD23F" metalness={0.4} roughness={0.3} />
      </mesh>
    </Float>
  );
}

export default function Scene() {
  // Safe to read here because this file only runs in the browser.
  const [reduceMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  return (
    <Canvas camera={{ position: [0, 0.3, 6], fov: 45 }} dpr={[1, 2]}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 5, 5]} intensity={2} />
      <Float speed={reduceMotion ? 0 : 1.5} floatIntensity={reduceMotion ? 0 : 1}>
        <Pin reduceMotion={reduceMotion} />
      </Float>
      <Coin position={[-2, 1.2, 0]} />
      <Coin position={[2.1, -0.4, 0.5]} />
      <Coin position={[1.5, 1.8, -0.5]} />
    </Canvas>
  );
}
