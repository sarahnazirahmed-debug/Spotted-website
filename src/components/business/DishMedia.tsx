"use client";

// The picture / video for a place. Only an ACTIVE one plays: a real muted video if the place has
// one, otherwise the drawn stand-in with gentle movement. Not active (or Reduce Motion): a still.
import { useReducedMotion } from "@/lib/useReducedMotion";
import DishArt from "./DishArt";
import type { Place } from "./data";

export default function DishMedia({
  place,
  active = false,
  zoom = 1,
  className = "",
}: {
  place: Place;
  active?: boolean;
  zoom?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const play = active && !reduce;
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <DishArt art={place.art} palette={place.palette} live={play} zoom={zoom} className="absolute inset-0 h-full w-full" />
      {play && place.video && (
        <video
          src={place.video}
          autoPlay
          muted
          loop
          playsInline
          aria-label={`${place.signature} at ${place.name}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <span className="absolute left-3 top-3 rounded-full bg-deep/80 px-3 py-1 text-xs font-extrabold tracking-wide text-white">
        EXAMPLE
      </span>
    </div>
  );
}
