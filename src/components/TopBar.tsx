"use client";

// The top bar: logo on the left, the menu links, and "Sign in" on the right.
// Menu: Home, Restaurants, Shops, Insiders, Pricing, How to join, FAQ, About, Sign in.
// A link whose page is switched OFF in features.ts shows a small "coming soon" note instead.
// On phones and small screens the links go into a menu button (three lines).
// alwaysVisible: show the bar from the start. When it is false (the old animated home page), the bar
// is hidden on the landing section and fades in as the visitor scrolls down.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FEATURES, type FeatureName } from "@/config/features";
import { text } from "@/content";

type LinkItem = { label: string; href: string; feature?: FeatureName };

const n = text.nav;
const LINKS: LinkItem[] = [
  { label: n.home, href: "/" },
  { label: n.restaurants, href: "/restaurants", feature: "businessPages" },
  { label: n.shops, href: "/shops", feature: "businessPages" },
  { label: n.insiders, href: "/insider", feature: "insiderPage" },
  { label: n.pricing, href: "/pricing", feature: "pricingPage" },
  { label: n.howToJoin, href: "/how-to-join", feature: "howToJoinPage" },
  { label: n.faq, href: "/faq", feature: "faqPage" },
  { label: n.about, href: "/about", feature: "aboutPage" },
];
const SIGN_IN: LinkItem = { label: n.signIn, href: "/login", feature: "accounts" };

export default function TopBar({ alwaysVisible = false }: { alwaysVisible?: boolean }) {
  const router = useRouter();
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

  function go(item: LinkItem) {
    setOpen(false);
    if (item.feature && !FEATURES[item.feature]) setNote(n.comingSoonNote(item.label));
    else router.push(item.href);
  }

  const link =
    "flex min-h-11 items-center rounded-xl px-2 text-sm font-bold text-heading transition hover:text-accent focus-visible:outline-2 focus-visible:outline-accent";
  const current = (href: string) => (pathname === href ? "underline underline-offset-8" : "");

  return (
    <header
      ref={bar}
      style={alwaysVisible ? undefined : { opacity: 0, pointerEvents: "none" }}
      className="fixed inset-x-0 top-0 z-30 bg-page/90 backdrop-blur"
    >
      <div className={`mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 ${FEATURES.themeLamp ? "xl:pr-[8.5rem]" : ""}`}>
        <Link href="/" aria-label="Spotted, home" className="flex min-h-11 items-center gap-2 text-xl font-extrabold text-heading">
          <svg width="22" height="26" viewBox="0 0 24 28" aria-hidden="true">
            <path d="M3 1h18v26l-9-7-9 7z" fill="var(--c-accent)" />
          </svg>
          Spotted
        </Link>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 xl:flex">
          {LINKS.map((l) => (
            <button key={l.label} type="button" aria-current={pathname === l.href ? "page" : undefined} className={`${link} ${current(l.href)}`} onClick={() => go(l)}>
              {l.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 xl:flex">
          <button type="button" className="min-h-11 rounded-full bg-accent px-5 text-sm font-extrabold text-onaccent transition active:scale-95" onClick={() => go(SIGN_IN)}>
            {SIGN_IN.label}
          </button>
        </div>

        <button
          type="button"
          aria-label={n.menu}
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen((o) => !o)}
          className="ml-auto flex size-11 items-center justify-center rounded-full text-heading xl:hidden"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>

      {open && (
        <div id="site-menu" className="max-h-[80dvh] overflow-y-auto border-t border-line bg-page px-4 pb-4 pt-2 xl:hidden">
          <nav aria-label={n.menu} className="mx-auto flex max-w-6xl flex-col">
            {LINKS.map((l) => (
              <button key={l.label} type="button" className={`${link} text-base ${current(l.href)}`} onClick={() => go(l)}>
                {l.label}
              </button>
            ))}
            <button type="button" className="mt-2 min-h-11 rounded-full bg-accent px-5 text-base font-extrabold text-onaccent" onClick={() => go(SIGN_IN)}>
              {SIGN_IN.label}
            </button>
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
