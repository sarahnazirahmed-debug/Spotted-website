"use client";

// The light/dark switch: a pull-string lamp.
// - Mouse: hover the string and a bulb slides down to the middle; leave and it slides back up.
// - Click, tap or keyboard (Enter / Space): the cord stretches and springs back, the bulb flashes,
//   and the theme switches. Without a mouse the bulb shows briefly, then hides.
// - Reduce Motion: no sliding, stretching or flashing. It only switches.
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/lib/theme";

const CORD = 96; // length of the string in pixels

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function ThemeLamp() {
  const { theme, toggle } = useTheme();
  const [shown, setShown] = useState(false); // is the bulb in the middle of the screen?
  const [flash, setFlash] = useState(0); // goes up by one each pull, to replay the flash
  const line = useRef<HTMLSpanElement>(null);
  const handle = useRef<HTMLSpanElement>(null);
  const hovering = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function pull() {
    // The cord stretches 18px down, then springs back with a small wobble.
    const stretch = [0, 18, -4, 3, 0];
    const opts: KeyframeAnimationOptions = { duration: 520, easing: "ease-out" };
    const offsets = [0, 0.3, 0.6, 0.82, 1];
    handle.current?.animate(
      stretch.map((y, i) => ({ transform: `translateY(${y}px)`, offset: offsets[i] })),
      opts,
    );
    line.current?.animate(
      stretch.map((y, i) => ({ transform: `scaleY(${1 + y / CORD})`, offset: offsets[i] })),
      opts,
    );
  }

  function onClick() {
    toggle();
    if (reduceMotion()) return;
    pull();
    setFlash((f) => f + 1);
    if (!hovering.current) {
      // No mouse over the string (phone or keyboard): show the bulb for a moment.
      setShown(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setShown(false), 1300);
    }
  }

  const lit = theme === "light"; // light on = light theme

  return (
    <>
      <button
        type="button"
        aria-label="Switch light/dark"
        onClick={onClick}
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse" || reduceMotion()) return;
          hovering.current = true;
          window.clearTimeout(timer.current);
          setShown(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType !== "mouse") return;
          hovering.current = false;
          setShown(false);
        }}
        className="pointer-events-auto fixed right-[4.75rem] top-0 z-40 w-11 cursor-pointer rounded-b-xl outline-none focus-visible:ring-4 focus-visible:ring-lilac"
        style={{ height: CORD + 32 }}
      >
        <span
          ref={line}
          aria-hidden="true"
          className="absolute top-0 w-[2px] origin-top bg-[var(--lamp-string)]"
          style={{ left: "calc(50% - 1px)", height: CORD }}
        />
        <span
          ref={handle}
          aria-hidden="true"
          className="absolute size-5 rounded-full bg-[var(--lamp-handle)] ring-2 ring-white/70"
          style={{ left: "calc(50% - 10px)", top: CORD }}
        />
      </button>

      {/* The bulb hangs on its own cord and slides in from the top of the screen. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-1/2 top-1/2 z-50"
        style={{
          transform: `translate(-50%, ${shown ? "-50%" : "calc(-50% - 110vh)"})`,
          opacity: shown ? 1 : 0,
          transition: "transform 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.15), opacity 0.4s ease",
        }}
      >
        <span className="absolute bottom-full left-1/2 h-[110vh] w-[2px] -translate-x-1/2 bg-[var(--lamp-string)]" />
        <svg
          key={flash}
          width="120"
          height="170"
          viewBox="0 0 120 170"
          className={flash > 0 ? "bulb-flash" : ""}
          style={lit ? { filter: "drop-shadow(0 0 36px #FFD23F)" } : undefined}
        >
          <path
            d="M60 6C26 6 8 34 8 64c0 24 16 36 24 54v12h56v-12c8-18 24-30 24-54C112 34 94 6 60 6z"
            fill={lit ? "#FFD23F" : "#C9A2FF"}
            fillOpacity={lit ? 1 : 0.3}
            stroke="#C9A2FF"
            strokeWidth="4"
          />
          <path d="M44 126V84l16 14 16-14v42" fill="none" stroke={lit ? "#E5383B" : "#C9A2FF"} strokeWidth="4" strokeLinejoin="round" />
          <rect x="34" y="130" width="52" height="12" rx="4" fill="#C9A2FF" />
          <rect x="38" y="146" width="44" height="12" rx="4" fill="#6A1FB0" />
          <rect x="50" y="160" width="20" height="8" rx="4" fill="#3C096C" />
        </svg>
      </div>
    </>
  );
}
