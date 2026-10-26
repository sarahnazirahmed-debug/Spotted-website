"use client";

// The scroll-driven stories. GSAP ScrollTrigger turns scrolling into a number (story.p),
// the 3D world reads that number, and this file draws the key words and menu on top.

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { story, overlayFor, KEYWORDS, STORY_LIST, type Overlay, type StoryId } from "@/lib/story";
import Waitlist from "./Waitlist";
import LiteStory from "./LiteStory";
import Menu from "./Menu";
import WhatsApp from "./WhatsApp";
import FlatWorld from "./flat/FlatWorld";



// ---- Can this phone handle the animated version? If not, show the simple version. ----
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

  return decided;
}
const subscribe = () => () => {};

export default function Story() {
  const detected = useSyncExternalStore<"3d" | "lite" | "pending">(subscribe, decide, () => "pending");
  const [forced, setForced] = useState<"3d" | "lite" | null>(null);
  // Open a story straight from the link: ?story=influencer (or restaurant).
  const [which, setWhich] = useState<StoryId>(() => {
    if (typeof window === "undefined") return "you";
    const q = new URLSearchParams(window.location.search).get("story");
    return q === "influencer" || q === "restaurant" ? q : "you";
  });
  const mode = forced ?? detected;

  const pick = (id: StoryId) => {
    window.scrollTo(0, 0);
    setWhich(id);
    setForced("3d");
  };
  const toggle = () => {
    window.scrollTo(0, 0);
    setForced(mode === "lite" ? "3d" : "lite");
  };

  if (mode === "pending") return <div className="min-h-dvh bg-deep" />;
  return (
    <>
      {mode === "lite" ? (
        <LiteStory current={which} onStory={pick} onToggleLite={toggle} />
      ) : (
        <Scroller key={which} id={which} onLite={() => setForced("lite")} onStory={pick} onToggleLite={toggle} />
      )}
      <WhatsApp />
    </>
  );
}

const TONES: Record<string, string> = {
  white: "bg-deep/85 text-white",
  sun: "bg-sun text-deep",
  red: "bg-spot-red text-white",
  lilac: "bg-lilac text-deep",
};

function Scroller({
  id,
  onLite,
  onStory,
  onToggleLite,
}: {
  id: StoryId;
  onLite: () => void;
  onStory: (id: StoryId) => void;
  onToggleLite: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [ov, setOv] = useState<Overlay>(() => overlayFor(id, 0));
  const meta = STORY_LIST.find((s) => s.id === id)!;

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const proxy = { p: 0 };
    story.p = 0;
    const ctx = gsap.context(() => {
      gsap.to(proxy, {
        p: 1,
        ease: "none",
        scrollTrigger: { trigger: box.current, start: "top top", end: "bottom bottom", scrub: 1 },
        onUpdate: () => {
          story.p = proxy.p;
          const next = overlayFor(id, proxy.p);
          setOv((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
        },
      });
    }, box);
    return () => {
      ctx.revert();
      story.p = 0;
    };
  }, [id]);

  return (
    <div ref={box} style={{ height: `${meta.heightVh}vh` }} className="relative">
      <h1 className="sr-only">Spotted. Launching 1 January in the UAE.</h1>
      <div className="fixed inset-0 bg-deep" aria-hidden="true">
        <FlatWorld
          id={id}
          onSlow={() => {
            // ?force3d keeps the animated version even on a slow screen (for testing).
            if (!new URLSearchParams(window.location.search).has("force3d")) onLite();
          }}
        />
      </div>

      <div className="pointer-events-none fixed inset-0 z-10">
        {/* top bar */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex flex-col items-start gap-2">
            <span className="text-2xl font-extrabold text-white drop-shadow">Spotted</span>
            <span className="rounded-full bg-lilac px-4 py-1 text-sm font-bold text-deep">{meta.label}</span>
          </div>
          <Menu current={id} lite={false} onStory={onStory} onToggleLite={onToggleLite} />
        </div>

        {/* key words, each on its own part of the screen */}
        {KEYWORDS[id].map((k, i) => {
          const on = ov.active.includes(i);
          return (
            <span
              key={`${id}-${i}`}
              aria-hidden="true"
              className={`keyword absolute whitespace-nowrap rounded-2xl px-4 py-1 font-extrabold leading-tight shadow-lg ${
                k.big ? "text-[clamp(1.9rem,9.5vw,3.6rem)]" : "text-[clamp(1.4rem,7vw,2.6rem)]"
              } ${TONES[k.tone ?? "white"]}`}
              style={{
                left: `${k.x}%`,
                top: `${k.y}%`,
                opacity: on ? 1 : 0,
                transform: `translate(-50%, -50%) rotate(${k.rot ?? 0}deg) scale(${on ? 1 : 0.6})`,
              }}
            >
              {k.text}
            </span>
          );
        })}

        {ov.bubble && (
          <div className="pop-word absolute left-1/2 top-[13%] flex w-[min(20rem,88vw)] -translate-x-1/2 items-center gap-3 rounded-3xl bg-white px-4 py-3 text-deep shadow-xl">
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
              <path d="M6 3h12v18l-6-5-6 5z" fill="#E5383B" />
            </svg>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand">Spotted</p>
              <p className="text-base font-extrabold leading-snug">This place is 1 km away</p>
            </div>
          </div>
        )}

        {ov.hint && (
          <span className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full bg-sun px-5 py-2 text-sm font-bold text-deep">
            Scroll
          </span>
        )}
      </div>

      {/* Ending: launch date and waitlist */}
      <div
        className={`fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(5rem,env(safe-area-inset-bottom))] pt-24 transition-opacity duration-300 ${
          ov.end ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ background: "linear-gradient(to top, #3C096C 60%, transparent)" }}
      >
        <div className="mx-auto max-w-xl rounded-3xl bg-brand p-5 text-center text-white">
          <h2 className="text-[clamp(1.6rem,7vw,2.6rem)] font-extrabold leading-tight">
            Launching 1 January in the UAE
          </h2>
          <p className="mb-4 mt-2 text-lilac">Be first to know when Spotted opens.</p>
          <Waitlist />
        </div>
      </div>
    </div>
  );
}
