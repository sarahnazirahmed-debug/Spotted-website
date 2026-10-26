"use client";

// Loads the 3D scene only in the browser (3D needs the browser to work).
import dynamic from "next/dynamic";

const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => null,
});

export default function HeroScene() {
  return <Scene />;
}
