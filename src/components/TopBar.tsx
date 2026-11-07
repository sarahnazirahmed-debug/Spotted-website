"use client";

// The top bar for all public pages (maroon, cream text).
//   Left:  the Spotted bookmark and the word Spotted.
//   Links: Home, Insiders, Partners, Careers.
//   Right: a small Admin link and the Log in button. Both open the SAME Log in page (/login).
// The page you are on is underlined in coral.
// A link whose page is switched OFF in features.ts shows a small "coming soon" note instead.
// On phones and small screens the links go into a menu button (three lines).
// alwaysVisible: show the bar from the start. When it is false (the old animated home page), the bar
// is hidden on the landing section and fades in as the visitor scrolls down.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FEATURES, type FeatureName } from "@/config/features";
import { text } from "@/content";

type LinkItem = { label: string; href: string; feature?: FeatureName };

const n = text.nav;
const LINKS: LinkItem[] = [
  { label: n.home, href: "/" },
  { label: n.insiders, href: "/insider", feature: "insiderPage" },
  { label: n.partners, href: "/restaurants", feature: "businessPages" },
  { label: n.careers, href: "/careers", feature: "careersPage" },
];
// Both go to the one Log in page. People never need to type /admin.
const ADMIN: LinkItem = { label: n.admin, href: "/login", feature: "loginPage" };
const LOG_IN: LinkItem = { label: n.logIn, href: "/login", feature: "loginPage" };

// Partners covers both the Restaurants and the Shops pages.
const PARTNER_PATHS = ["/restaurants", "/shops"];

export default function TopBar({ alwaysVisible = false }: { alwaysVisible?: boolean }) {
  const pathname = usePathname();
  const bar = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  // Only matters when the bar is not always visible: fade in with scroll.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = bar.current;
      if (!el) return;
      const t = Math.min(1, Math.max(0, (window.scrollY - window.innerHeight * 0.35) / (window.innerHeight * 0.4)));
      const v = alwaysVisible ? 1 : reduce ? (t > 0.5 ? 1 : 0) : t;
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
  }, [alwaysVisible]);

  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(""), 2200);
    return () => window.clearTimeout(t);
  }, [note]);

  // Only the four main links get the coral underline (Admin and Log in both open /login).
  const isCurrent = (item: LinkItem) =>
    item === ADMIN ? false : item.href === "/restaurants" ? PARTNER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) : pathname === item.href;
  const isOn = (item: LinkItem) => !item.feature || FEATURES[item.feature];

  const base =
    "flex min-h-11 items-center rounded-xl px-2 font-bar text-sm font-semibold text-onbar transition hover:text-coral focus-visible:outline-2 focus-visible:outline-coral";
  const underline = "underline decoration-coral decoration-2 underline-offset-8";

  // A real link when the page is ON; a button with a small note when it is switched OFF.
  function item(l: LinkItem, extra = "", onGo?: () => void) {
    const cls = `${base} ${extra} ${isCurrent(l) ? underline : ""}`;
    if (isOn(l))
      return (
        <Link key={l.label} href={l.href} aria-current={isCurrent(l) ? "page" : undefined} className={cls} onClick={onGo}>
          {l.label}
        </Link>
      );
    return (
      <button key={l.label} type="button" className={cls} onClick={() => { onGo?.(); setNote(n.comingSoonNote(l.label)); }}>
        {l.label}
      </button>
    );
  }

  const logIn = (extra: string, onGo?: () => void) => {
    const cls = `flex min-h-11 items-center justify-center rounded-full border border-barline px-5 font-bar text-sm font-semibold text-onbar transition hover:border-coral hover:text-coral focus-visible:outline-2 focus-visible:outline-coral ${extra}`;
    return isOn(LOG_IN) ? (
      <Link href={LOG_IN.href} className={cls} onClick={onGo}>
        {LOG_IN.label}
      </Link>
    ) : (
      <button type="button" className={cls} onClick={() => { onGo?.(); setNote(n.comingSoonNote(LOG_IN.label)); }}>
        {LOG_IN.label}
      </button>
    );
  };

  const close = () => setOpen(false);

  return (
    <header
      ref={bar}
      style={alwaysVisible ? undefined : { opacity: 0, pointerEvents: "none" }}
      className="fixed inset-x-0 top-0 z-30 bg-bar text-onbar"
    >
      <div className={`mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 ${FEATURES.themeLamp ? "xl:pr-[8.5rem]" : ""}`}>
        <Link href="/" aria-label="Spotted, home" className="flex min-h-11 items-center gap-2 font-brand text-xl font-bold text-onbar focus-visible:outline-2 focus-visible:outline-coral">
          <svg width="22" height="26" viewBox="0 0 24 28" aria-hidden="true">
            <path d="M3 1h18v26l-9-7-9 7z" fill="var(--coral)" />
          </svg>
          Spotted
        </Link>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => item(l))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          {item(ADMIN, "!px-2 !text-xs !font-medium opacity-80")}
          {logIn("")}
        </div>

        <button
          type="button"
          aria-label={n.menu}
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((o) => !o)}
          className="ml-auto flex size-11 items-center justify-center rounded-full text-onbar focus-visible:outline-2 focus-visible:outline-coral lg:hidden"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div id="site-menu" className="max-h-[80dvh] overflow-y-auto border-t border-barline/40 bg-bar px-4 pb-4 pt-2 lg:hidden">
          <nav aria-label={n.menu} className="mx-auto flex max-w-6xl flex-col">
            {LINKS.map((l) => item(l, "text-base", close))}
            {item(ADMIN, "text-base opacity-80", close)}
            {logIn("mt-2 text-base", close)}
          </nav>
        </div>
      )}

      {note && (
        <p role="status" className="absolute left-1/2 top-full mt-2 -translate-x-1/2 rounded-full bg-chip px-4 py-2 text-sm font-bold text-onchip shadow-lg">
          {note}
        </p>
      )}
    </header>
  );
}
