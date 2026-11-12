"use client";

// The top bar for all public pages (maroon, cream text).
//   Left:   the Spotted bookmark and the word Spotted, at the far left edge of the window (a small gap), NOT inside a centred box.
//   Links:  How it works, FAQs, Insiders, Partners, centred in the bar (screens 1024px wide and up). Careers is added ONLY when careersPage is ON in
//           features.ts; with the switch OFF there is no Careers link and no "coming soon" note anywhere.
//   Right (wide screens, far right): two buttons: "Log in" (thin rose border, opens /login) and "Sign up" (coral, opens /signup).
//   Below 1024px (the lg breakpoint) the links and buttons give way to the three-bar menu button. Its panel holds the same four links plus Log in and Sign up.
// There is NO Admin or Staff link anywhere on the public site (the /admin address still works when typed).
// Every link and both buttons share the same press animation as the coral "Become an Insider" button: a smooth
// transition that shrinks the item slightly while it is pressed (motion-safe:active:scale-95). With Reduce Motion turned on
// there is no movement (motion-safe).
// The page you are on is underlined in coral. A link or button whose page is switched OFF in features.ts
// shows a small "coming soon" note instead.
// alwaysVisible: show the bar from the start. When it is false (the old animated home page), the bar
// is hidden on the landing section and fades in as the visitor scrolls down.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FEATURES, type FeatureName } from "@/config/features";
import { text } from "@/content";
import ThemeToggle from "./ThemeToggle";

type LinkItem = { label: string; href: string; feature?: FeatureName };

const n = text.nav;
const LINKS: LinkItem[] = [
  { label: n.howItWorks, href: "/#how-it-works" },
  { label: n.faqs, href: "/faq", feature: "faqPage" },
  { label: n.insiders, href: "/insider", feature: "insiderPage" },
  { label: n.partners, href: "/partners", feature: "businessPages" },
];
// Careers is shown ONLY while its switch is ON (the page code is kept, so it can be switched back on later).
const CAREERS: LinkItem = { label: n.careers, href: "/careers", feature: "careersPage" };
const LOG_IN: LinkItem = { label: n.logIn, href: "/login", feature: "loginPage" };
const SIGN_UP: LinkItem = { label: n.signUp, href: "/signup", feature: "accounts" };

// The page address after the # (for example #how-it-works), so the "How it works" link can be marked when you are at that part of the home page.
const subscribeHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const useHash = () => useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");

// Partners covers the Partner page and also the older Restaurants and Shops pages.
const PARTNER_PATHS = ["/partners", "/restaurants", "/shops"];

export default function TopBar({ alwaysVisible = false }: { alwaysVisible?: boolean }) {
  const pathname = usePathname();
  const hash = useHash();
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

  // The main links get the coral underline for the page you are on.
  const links = FEATURES.careersPage ? [...LINKS, CAREERS] : LINKS;
  const isCurrent = (item: LinkItem) =>
    item.href.startsWith("/#")
      ? pathname === "/" && hash === item.href.slice(1)
      : item.href === "/partners"
        ? PARTNER_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
        : pathname === item.href;
  const isOn = (item: LinkItem) => !item.feature || FEATURES[item.feature];
  const close = () => setOpen(false);

  const base =
    "flex min-h-11 items-center rounded-xl px-2 font-bar text-sm font-semibold text-onbar transition motion-safe:active:scale-95 hover:text-coral focus-visible:outline-2 focus-visible:outline-coral";
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

  // The two buttons: Log in (thin rose border) and Sign up (coral). A page switched OFF shows the small note instead of a link.
  function authButton(l: LinkItem, kind: "login" | "signup", extra = "", onGo?: () => void) {
    const cls = `flex min-h-11 items-center justify-center rounded-full px-5 font-bar text-sm font-bold transition motion-safe:active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral ${
      kind === "signup" ? "bg-coral text-oncoral" : "border border-rose-line text-onbar hover:border-coral hover:text-coral"
    } ${extra}`;
    if (isOn(l))
      return (
        <Link key={l.label} href={l.href} className={cls} onClick={onGo}>
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

  return (
    <header
      ref={bar}
      style={alwaysVisible ? undefined : { opacity: 0, pointerEvents: "none" }}
      className="fixed inset-x-0 top-0 z-30 bg-bar text-onbar"
    >
      <div className={`flex h-16 w-full items-center gap-3 px-3 lg:grid lg:grid-cols-[1fr_auto_1fr]`}>
        <Link href="/" aria-label="Spotted, home" className="flex min-h-11 items-center gap-2 font-brand text-2xl font-bold text-onbar transition motion-safe:active:scale-95 focus-visible:outline-2 focus-visible:outline-coral lg:justify-self-start">
          <svg width="26" height="31" viewBox="0 0 24 28" aria-hidden="true">
            <path d="M3 1h18v26l-9-7-9 7z" fill="var(--coral)" />
          </svg>
          Spotted
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex lg:justify-self-center">
          {links.map((l) => item(l))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:justify-self-end">
          <ThemeToggle />
          <div className="hidden items-center gap-2 lg:flex">
            {authButton(LOG_IN, "login")}
            {authButton(SIGN_UP, "signup")}
          </div>
          <button
            ref={menuButton}
            type="button"
            aria-label={n.menu}
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => setOpen((o) => !o)}
            className="flex size-11 items-center justify-center rounded-full text-onbar focus-visible:outline-2 focus-visible:outline-coral lg:hidden"
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
          className="absolute right-4 top-full mt-1 max-h-[80dvh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-barline/50 bg-bar p-2 shadow-xl lg:hidden"
        >
          <nav aria-label={n.menu} className="flex flex-col">
            {/* the same links as the bar, plus Log in and Sign up (small screens only) */}
            {links.map((l) => item(l, "text-base !px-3", close))}
            <div className="mt-2 grid gap-2 px-1 pb-1">
              {authButton(LOG_IN, "login", "", close)}
              {authButton(SIGN_UP, "signup", "", close)}
            </div>
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
