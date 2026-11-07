"use client";

// The top bar for all public pages (maroon, cream text).
//   Left:   the Spotted bookmark and the word Spotted.
//   Links:  How it works, Your data, Questions, Insiders, Partners, Careers (wide screens).
//   Right:  a coral "Get notified" button, a small Admin link, and a three-bar menu button.
// The three-bar menu opens a panel with two groups:
//   "Spotted Crew": Admin, Staff (both open the one Log in page, /login)
//   "Join Spotted": Insiders (For influencers), Partners (For restaurants and shops), Careers (Work with the crew)
// On small screens the panel also holds the main links, because the bar has no room for them.
// The page you are on is underlined in coral. A link whose page is switched OFF in features.ts
// shows a small "coming soon" note instead.
// alwaysVisible: show the bar from the start. When it is false (the old animated home page), the bar
// is hidden on the landing section and fades in as the visitor scrolls down.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FEATURES, type FeatureName } from "@/config/features";
import { text } from "@/content";

type LinkItem = { label: string; href: string; feature?: FeatureName };

const n = text.nav;
const m = text.menuPanel;
const LINKS: LinkItem[] = [
  { label: n.howItWorks, href: "/#how-it-works" },
  { label: n.yourData, href: "/privacy", feature: "legalPages" },
  { label: n.questions, href: "/faq", feature: "faqPage" },
  { label: n.insiders, href: "/insider", feature: "insiderPage" },
  { label: n.partners, href: "/partners", feature: "businessPages" },
  { label: n.careers, href: "/careers", feature: "careersPage" },
];
// Admin and Staff both open the one Log in page. People never need to type /admin.
const ADMIN: LinkItem = { label: n.admin, href: "/login", feature: "loginPage" };
const GET_NOTIFIED: LinkItem = { label: n.getNotified, href: "/contact", feature: "contactPage" };

// Partners covers the Partner page and also the older Restaurants and Shops pages.
const PARTNER_PATHS = ["/partners", "/restaurants", "/shops"];

export default function TopBar({ alwaysVisible = false }: { alwaysVisible?: boolean }) {
  const pathname = usePathname();
  const bar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
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

  // The menu panel closes with the Escape key (focus goes back to the button) or a click outside the bar.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (bar.current && !bar.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  // Only the six main links get the coral underline (Admin and Staff both open /login).
  const isCurrent = (item: LinkItem) =>
    item.href.startsWith("/#") || item === ADMIN
      ? false
      : item.href === "/partners"
        ? PARTNER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
        : pathname === item.href;
  const isOn = (item: LinkItem) => !item.feature || FEATURES[item.feature];
  const close = () => setOpen(false);

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
      <button
        key={l.label}
        type="button"
        className={cls}
        onClick={() => {
          onGo?.();
          setNote(n.comingSoonNote(l.label));
        }}
      >
        {l.label}
      </button>
    );
  }

  // One row in the menu panel: the name and a small line under it.
  function panelRow(label: string, note2: string, href: string, on: boolean) {
    const cls =
      "flex min-h-11 flex-col justify-center rounded-xl px-3 py-1 text-onbar transition hover:bg-onbar/10 focus-visible:outline-2 focus-visible:outline-coral";
    const inner = (
      <>
        <span className="font-bar text-base font-semibold">{label}</span>
        <span className="font-bar text-xs font-medium text-barline">{note2}</span>
      </>
    );
    return on ? (
      <Link key={label} href={href} className={cls} onClick={close}>
        {inner}
      </Link>
    ) : (
      <button
        key={label}
        type="button"
        className={`${cls} text-left`}
        onClick={() => {
          close();
          setNote(n.comingSoonNote(label));
        }}
      >
        {inner}
      </button>
    );
  }

  const groupTitle = "px-3 pb-1 pt-3 font-bar text-xs font-bold uppercase tracking-wide text-barline";

  return (
    <header
      ref={bar}
      style={alwaysVisible ? undefined : { opacity: 0, pointerEvents: "none" }}
      className="fixed inset-x-0 top-0 z-30 bg-bar text-onbar"
    >
      <div className={`mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 ${FEATURES.themeLamp ? "xl:pr-[8.5rem]" : ""}`}>
        <Link href="/" aria-label="Spotted, home" className="flex min-h-11 items-center gap-2 font-brand text-xl font-bold text-onbar focus-visible:outline-2 focus-visible:outline-coral">
          <svg width="22" height="26" viewBox="0 0 24 28" aria-hidden="true">
            <path d="M3 1h18v26l-9-7-9 7z" fill="var(--coral)" />
          </svg>
          Spotted
        </Link>

        <nav aria-label="Main" className="ml-2 hidden items-center gap-0.5 xl:flex">
          {LINKS.map((l) => item(l))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isOn(GET_NOTIFIED) && (
            <Link
              href={GET_NOTIFIED.href}
              className="flex min-h-11 items-center rounded-full bg-coral px-5 font-bar text-sm font-bold text-darktext transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-onbar"
            >
              {GET_NOTIFIED.label}
            </Link>
          )}
          <span className="hidden md:flex">{item(ADMIN, "!text-xs !font-medium opacity-80")}</span>
          <button
            ref={menuButton}
            type="button"
            aria-label={n.menu}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((o) => !o)}
            className="flex size-11 items-center justify-center rounded-full text-onbar focus-visible:outline-2 focus-visible:outline-coral"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div
          id="site-menu"
          className="absolute right-4 top-full mt-1 max-h-[80dvh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-barline/50 bg-bar p-2 shadow-xl"
        >
          <nav aria-label={n.menu} className="flex flex-col">
            {/* the main links, only where the bar itself has no room for them */}
            <div className="xl:hidden">
              <p className={groupTitle}>{m.spotted}</p>
              {LINKS.map((l) => item(l, "text-base !px-3", close))}
            </div>
            <p className={groupTitle}>{m.crew}</p>
            {m.crewLinks.map((c) => panelRow(c.label, c.note, "/login", isOn(ADMIN)))}
            <p className={groupTitle}>{m.join}</p>
            {m.joinLinks.map((j) => panelRow(j.label, j.note, j.href, FEATURES[j.feature as FeatureName]))}
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
