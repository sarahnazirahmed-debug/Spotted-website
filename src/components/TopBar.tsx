"use client";

// The top bar. It is hidden on the landing section and fades in as the visitor scrolls down.
// Left: logo. Middle: links. Right: Sign up / Log in. The lamp string hangs just to the right of it.
// On phones the links go into a menu button (three lines).
import { useEffect, useRef, useState } from "react";
import type { StoryId } from "@/lib/story";

type LinkItem = { label: string; story?: StoryId; to?: string };
const LINKS: LinkItem[] = [
  { label: "What's Spotted", to: "stories" },
  { label: "Restaurants", story: "restaurant" },
  { label: "Shops" },
  { label: "Influencers", story: "influencer" },
  { label: "Careers" },
  { label: "About" },
];

export default function TopBar({ onStory }: { onStory: (id: StoryId) => void }) {
  const bar = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  // Fade in with scroll: invisible on the landing section, fully there after half a screen.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = bar.current;
      if (!el) return;
      const t = Math.min(1, Math.max(0, (window.scrollY - window.innerHeight * 0.35) / (window.innerHeight * 0.4)));
      const v = reduce ? (t > 0.5 ? 1 : 0) : t;
      el.style.opacity = String(v);
      el.style.pointerEvents = v > 0.3 ? "auto" : "none";
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(""), 2200);
    return () => window.clearTimeout(t);
  }, [note]);

  function go(item: LinkItem) {
    setOpen(false);
    if (item.story) onStory(item.story);
    else if (item.to) document.getElementById(item.to)?.scrollIntoView();
    else setNote(`${item.label} is coming soon.`);
  }

  const link =
    "flex min-h-11 items-center rounded-xl px-2 text-sm font-bold text-heading transition hover:text-brand focus-visible:outline-2 focus-visible:outline-brand";

  return (
    <header
      ref={bar}
      style={{ opacity: 0, pointerEvents: "none" }}
      className="fixed inset-x-0 top-0 z-30 bg-page/90 backdrop-blur"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 lg:pr-[8.5rem]">
        <a
          href="#top"
          aria-label="Spotted, back to the top"
          className="flex min-h-11 items-center gap-2 text-xl font-extrabold text-heading"
        >
          <svg width="22" height="26" viewBox="0 0 24 28" aria-hidden="true">
            <path d="M3 1h18v26l-9-7-9 7z" fill="#E5383B" />
          </svg>
          Spotted
        </a>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <button key={l.label} type="button" className={link} onClick={() => go(l)}>
              {l.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <button type="button" className={link} onClick={() => go({ label: "Log in" })}>
            Log in
          </button>
          <button
            type="button"
            className="min-h-11 rounded-full bg-brand px-5 text-sm font-extrabold text-white transition active:scale-95"
            onClick={() => go({ label: "Sign up" })}
          >
            Sign up
          </button>
        </div>

        <button
          type="button"
          aria-label="Site menu"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((o) => !o)}
          className="ml-auto flex size-11 items-center justify-center rounded-full text-heading lg:hidden"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div id="site-menu" className="border-t border-lilac bg-page px-4 pb-4 pt-2 lg:hidden">
          <nav aria-label="Site menu" className="mx-auto flex max-w-6xl flex-col">
            {LINKS.map((l) => (
              <button key={l.label} type="button" className={`${link} text-base`} onClick={() => go(l)}>
                {l.label}
              </button>
            ))}
            <div className="mt-2 flex gap-2">
              <button type="button" className={`${link} flex-1 justify-center border border-lilac text-base`} onClick={() => go({ label: "Log in" })}>
                Log in
              </button>
              <button
                type="button"
                className="min-h-11 flex-1 rounded-full bg-brand px-5 text-base font-extrabold text-white"
                onClick={() => go({ label: "Sign up" })}
              >
                Sign up
              </button>
            </div>
          </nav>
        </div>
      )}

      {note && (
        <p role="status" className="absolute left-1/2 top-full mt-2 -translate-x-1/2 rounded-full bg-lilac px-4 py-2 text-sm font-bold text-deep shadow-lg">
          {note}
        </p>
      )}
    </header>
  );
}
