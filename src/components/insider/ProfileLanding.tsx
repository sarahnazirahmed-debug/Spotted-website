// The shared template for the Insider page and the Spotted Partner page (same structure, different words).
// Sections, in this order (the hero has just the title and the intro text: the ONLY apply button is in the closing band, 7):
//   1. Hero   2. Why become ...   3. What you need to apply   4. Your dashboard, on any screen
//   5. The deal   6. (optional extra box, e.g. Founding Insiders)   7. Closing maroon band
// The words come from src/content/en.ts (insiderPage or partnerPage). The `deal` and `extra` parts are given by each page.
import Link from "next/link";
import { FEATURES } from "@/config/features";
import Footer from "../Footer";
import SiteChrome from "../SiteChrome";
import PhoneLoop from "../site/PhoneLoop";
import ApplyDevice, { type ApplyCopy } from "./ApplyDevice";
import DashboardDrawing, { type DashCopy } from "./DashboardDrawing";
import FlipCards from "./FlipCards";

export type LandingCopy = ApplyCopy & {
  draft: string;
  hero: { title: string; lead: string; apply: string }; // apply = the words on the coral button in the closing maroon band
  whyTitle: string;
  flipHint: string;
  cards: { title: string; text: string; stars: boolean }[];
  applyTitle: string;
  dashTitle: string;
  dash: DashCopy;
  dealTitle: string;
};

export const coralButton =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-coral px-7 font-bar text-base font-bold text-darktext transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";
export const heading = "font-brand text-[clamp(1.7rem,4.5vw,2.6rem)] font-bold leading-tight text-darktext";

export function Section({ id, title, children, tint = false }: { id?: string; title: string; children: React.ReactNode; tint?: boolean }) {
  return (
    <section id={id} className={`${tint ? "bg-pinktint" : "bg-pagebase"} px-5 py-16 text-darktext md:py-24`}>
      <div className="mx-auto max-w-5xl">
        <h2 className={`mb-8 ${heading}`}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

// applyHref: where the "Become an ..." button (closing maroon band) goes (the Apply form, or the Contact page while the Apply page is OFF).
export default function ProfileLanding({ t, deal, extra, applyHref }: { t: LandingCopy; deal: React.ReactNode; extra?: React.ReactNode; applyHref: string }) {
  return (
    <div className="font-bar">
      {/* 1. HERO (maroon) */}
      <header className="relative bg-maroon px-5 pb-16 pt-28 text-cream md:pb-24 md:pt-36">
        {FEATURES.designDraft && (
          <span className="absolute right-4 top-20 rounded-full border border-dashed border-rose-line px-3 py-1 text-xs font-bold text-rose-line">{t.draft}</span>
        )}
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-[1.3fr_1fr]">
          <div>
            <h1 className="font-brand text-[clamp(2.4rem,8vw,4.4rem)] font-bold leading-[1.05]">{t.hero.title}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-cream/90">{t.hero.lead}</p>
          </div>
          <PhoneLoop />
        </div>
      </header>

      <main>
        {/* 2. WHY BECOME */}
        <Section title={t.whyTitle}>
          <FlipCards cards={t.cards} hint={t.flipHint} />
        </Section>

        {/* 3. WHAT YOU NEED TO APPLY */}
        <Section title={t.applyTitle} tint>
          {/* only plain words are passed to the browser-side parts (a function inside `t` cannot be sent) */}
          <ApplyDevice
            t={{ items: t.items, applyChecklistTitle: t.applyChecklistTitle, applyNote: t.applyNote, screenTitle: t.screenTitle, uploadPdf: t.uploadPdf, device: t.device }}
          />
        </Section>

        {/* 4. YOUR DASHBOARD, ON ANY SCREEN */}
        <Section title={t.dashTitle}>
          <DashboardDrawing t={t.dash} />
        </Section>

        {/* 5. THE DEAL */}
        <Section title={t.dealTitle} tint>
          {deal}
        </Section>

        {/* 6. EXTRA BOX (Founding Insiders on the Insider page; nothing on the Partner page) */}
        {extra}

        {/* 7. CLOSING MAROON BAND */}
        <section id="get-in-touch" className="bg-maroon px-5 py-14 text-center text-cream">
          <Link href={applyHref} className={coralButton}>
            {t.hero.apply}
          </Link>
        </section>
      </main>

      {FEATURES.footer && <Footer />}
      <SiteChrome alwaysVisible />
    </div>
  );
}
