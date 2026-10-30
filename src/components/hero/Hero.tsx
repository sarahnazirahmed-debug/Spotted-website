"use client";

// The full-screen landing section at the very top.
// Back: a blurred, softly moving purple gradient with lilac glows (pure CSS).
// Front: the 3D cloth banner (banner3d.ts) that flies in and lands. Under it, "Spotted" rises.
// On a slow phone, with Reduce Motion, or if 3D does not work, a still picture of the banner shows.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LAUNCH, bannerWords } from "@/config/features";
import BannerStill from "./BannerStill";

// Can this phone handle the 3D banner? Checked once, then remembered.
let heavyOk: boolean | null = null;
function canDo3d(): boolean {
  if (heavyOk !== null) return heavyOk;
  const q = new URLSearchParams(window.location.search);
  if (q.has("still")) return (heavyOk = false);
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  let ok = true;
  if (!q.has("force3d")) {
    if (nav.connection?.saveData) ok = false;
    if ((nav.deviceMemory ?? 8) <= 2 || (nav.hardwareConcurrency ?? 8) <= 2) ok = false;
  }
  if (ok) {
    // No WebGL means no 3D.
    try {
      const c = document.createElement("canvas");
      ok = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      ok = false;
    }
  }
  return (heavyOk = ok);
}

const reduceQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(cb: () => void) {
  const m = window.matchMedia(reduceQuery);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}
const snapshot = (): "3d" | "still" => (window.matchMedia(reduceQuery).matches || !canDo3d() ? "still" : "3d");

// label and line2 are the two lines printed on the banner. Without them it shows the launch words.
export default function Hero({ label: labelProp, line2 }: { label?: string; line2?: string }) {
  const mode = useSyncExternalStore<"3d" | "still">(subscribeMotion, snapshot, () => "still");
  const [slow, setSlow] = useState(false);
  const [ready, setReady] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const use3d = mode === "3d" && !slow;

  useEffect(() => {
    if (!use3d || !host.current) return;
    let dead = false;
    let banner: { dispose: () => void } | null = null;
    const words = bannerWords();
    const label = labelProp ?? words.label;
    const date = line2 ?? words.date;
    const skipSlowCheck = new URLSearchParams(window.location.search).has("force3d");
    import("./banner3d")
      .then((m) =>
        m.createBanner(host.current!, {
          label,
          date,
          skipSlowCheck,
          onReady: () => setReady(true),
          onSlow: () => setSlow(true),
        }),
      )
      .then((b) => {
        if (dead) b.dispose();
        else banner = b;
      })
      .catch(() => setSlow(true)); // 3D failed: keep the still picture
    return () => {
      dead = true;
      banner?.dispose();
      setReady(false);
    };
  }, [use3d, labelProp, line2]);

  const showStill = !(use3d && ready);
  const out = LAUNCH.status === "outNow";
  const storeBtn =
    "pointer-events-auto flex min-h-12 items-center rounded-full bg-white px-6 text-base font-extrabold text-deep transition active:scale-95";

  return (
    <section id="top" className="relative min-h-dvh overflow-hidden text-white">
      {/* moving gradient and lilac glows */}
      <div className="hero-bg absolute inset-0" aria-hidden="true">
        <span className="hero-glow hero-glow-a" />
        <span className="hero-glow hero-glow-b" />
        <span className="hero-glow hero-glow-c" />
      </div>

      {/* the still banner: shown first, and kept when 3D is off */}
      <div
        aria-hidden={!showStill}
        className="pointer-events-none absolute left-1/2 top-[11%] -translate-x-1/2 transition-opacity duration-500"
        style={{ width: "min(61vw, 37.5dvh)", opacity: showStill ? 1 : 0 }}
      >
        <BannerStill label={labelProp} date={line2} className="block h-auto w-full drop-shadow-2xl" />
      </div>

      {/* the 3D banner draws here */}
      <div ref={host} className="absolute inset-0" />

      <h1
        // just under the banner: banner top is 11% down, and its height follows the screen shape
        style={{ top: "calc(14dvh + min(58.3dvh, 94.4vw))" }}
        className="hero-rise pointer-events-none absolute inset-x-0 text-center text-[clamp(2.8rem,10vw,5.5rem)] font-extrabold leading-none"
      >
        Spotted
      </h1>

      {out && (
        <div
          style={{ top: "calc(14dvh + min(58.3dvh, 94.4vw) + clamp(3.6rem, 12vw, 6.4rem))" }}
          className="hero-rise-late pointer-events-none absolute inset-x-0 flex flex-wrap justify-center gap-3 px-4"
        >
          <a href={LAUNCH.stores.appStore || "#"} className={storeBtn}>
            App Store
          </a>
          <a href={LAUNCH.stores.googlePlay || "#"} className={storeBtn}>
            Google Play
          </a>
        </div>
      )}
    </section>
  );
}
