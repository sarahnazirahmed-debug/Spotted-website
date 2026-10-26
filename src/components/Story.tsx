"use client";

// The scroll-driven story. GSAP ScrollTrigger turns scrolling into a number (story.p),
// the 3D world reads that number, and this file draws the captions on top.

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { story, overlayFor, CUT_POINTS, type Overlay } from "@/lib/story";
import Waitlist from "./Waitlist";
import LiteStory from "./LiteStory";

const World = dynamic(() => import("./story/World"), { ssr: false });

// ---- Can this phone handle 3D? If not, show the simple version. ----
let decided: "3d" | "lite" | null = null;
function decide(): "3d" | "lite" {
  if (decided) return decided;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  decided = "3d";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) decided = "lite";
  else if (nav.connection?.saveData) decided = "lite";
  else if ((nav.deviceMemory ?? 8) <= 2 || (nav.hardwareConcurrency ?? 8) <= 2) decided = "lite";
  else {
    try {
      const c = document.createElement("canvas");
      const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
      if (!gl) decided = "lite";
      else gl.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      decided = "lite";
    }
  }
  return decided;
}
const subscribe = () => () => {};

export default function Story() {
  const detected = useSyncExternalStore<"3d" | "lite" | "pending">(subscribe, decide, () => "pending");
  const [forced, setForced] = useState<"3d" | "lite" | null>(null);
  const mode = forced ?? detected;

  if (mode === "pending") return <div className="min-h-dvh bg-deep" />;
  if (mode === "lite") return <LiteStory onSwitch={() => setForced("3d")} />;
  return <Scroller onLite={() => setForced("lite")} />;
}

function Scroller({ onLite }: { onLite: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const [ov, setOv] = useState<Overlay>(() => overlayFor(0));

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const proxy = { p: 0 };
    const ctx = gsap.context(() => {
      gsap.to(proxy, {
        p: 1,
        ease: "none",
        scrollTrigger: { trigger: box.current, start: "top top", end: "bottom bottom", scrub: 0.4 },
        onUpdate: () => {
          story.p = proxy.p;
          // quick white flash at each cut
          const f = Math.max(...CUT_POINTS.map((b) => 1 - Math.abs(proxy.p - b) / 0.012));
          if (flash.current) flash.current.style.opacity = String(Math.max(0, f) * 0.7);
          const next = overlayFor(proxy.p);
          setOv((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
        },
      });
    }, box);
    return () => {
      ctx.revert();
      story.p = 0;
    };
  }, []);

  return (
    <div ref={box} style={{ height: "900vh" }} className="relative">
      <h1 className="sr-only">Spotted. Launching 1 January in the UAE.</h1>
      <div className="fixed inset-0 bg-deep" aria-hidden="true">
        <World onSlow={onLite} />
      </div>

      <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col items-start gap-2">
            <span className="text-2xl font-extrabold text-white">Spotted</span>
            {ov.journey && (
              <span key={ov.journey} className="pop-word rounded-full bg-lilac px-4 py-1 text-sm font-bold text-deep">
                {ov.journey}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onLite}
            className="pointer-events-auto min-h-11 rounded-full bg-white/15 px-4 text-sm font-bold text-white"
          >
            Simple version
          </button>
        </div>

        {ov.bubble && (
          <div className="pop-word mx-auto -mt-[40vh] flex max-w-xs items-center gap-3 rounded-3xl bg-white px-4 py-3 text-deep shadow-xl">
            <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
              <path d="M6 3h12v18l-6-5-6 5z" fill="#E5383B" />
            </svg>
            <p className="text-sm font-bold leading-snug">A place you saved is 1 km away</p>
          </div>
        )}

        <div className="flex flex-col items-center gap-3">
          {ov.hint && (
            <span className="rounded-full bg-sun px-4 py-1 text-sm font-bold text-deep">Scroll</span>
          )}
          {ov.words.length > 0 && (
            <p className="max-w-[92vw] rounded-3xl bg-deep/85 px-5 py-3 text-center text-[clamp(1.4rem,6.2vw,2.4rem)] font-extrabold leading-tight text-white">
              {ov.words.slice(0, ov.shown).map((w, k) => (
                <span
                  key={`${ov.scene}-${ov.step}-${k}`}
                  className={`pop-word mr-[0.28em] ${k === ov.shown - 1 ? "text-sun" : ""}`}
                >
                  {w}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>

      {/* Ending: launch date and waitlist */}
      <div
        className={`fixed inset-x-0 bottom-0 z-10 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-24 transition-opacity duration-300 ${
          ov.end ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ background: "linear-gradient(to top, #3C096C 55%, transparent)" }}
      >
        <div className="mx-auto max-w-xl rounded-3xl bg-brand p-5 text-center text-white">
          <h2 className="text-[clamp(1.6rem,7vw,2.6rem)] font-extrabold leading-tight">
            Launching 1 January in the UAE
          </h2>
          <p className="mt-2 mb-4 text-lilac">Be first to know when Spotted opens.</p>
          <Waitlist />
        </div>
      </div>

      <div ref={flash} className="pointer-events-none fixed inset-0 z-20 bg-white opacity-0" aria-hidden="true" />
    </div>
  );
}
