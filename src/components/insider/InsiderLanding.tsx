// The new Insider page (step 3), in the same style as the landing page (maroon, cream, coral;
// Merriweather headings, Inter text). Sections, in this order:
//   1. Hero   2. Why become an Insider (flip cards)   3. What you need to apply
//   4. Your dashboard, on any screen   5. The deal   6. Founding Insiders   7. Closing maroon band
// All the words are in src/content/en.ts (insiderPage). The price and the founding group are in src/config/pricing.ts.
import Link from "next/link";
import { FEATURES } from "@/config/features";
import { FOUNDING_FREE_PERIOD, FOUNDING_SPOTS, INSIDER_PLAN, yearlyPriceAed } from "@/config/pricing";
import { text } from "@/content";
import Footer from "../Footer";
import SiteChrome from "../SiteChrome";
import PhoneLoop from "../site/PhoneLoop";
import ApplyDevice from "./ApplyDevice";
import DashboardDrawing from "./DashboardDrawing";
import FlipCards from "./FlipCards";

const t = text.insiderPage;
const coralButton =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-coral px-7 font-bar text-base font-bold text-darktext transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";
const heading = "font-brand text-[clamp(1.7rem,4.5vw,2.6rem)] font-bold leading-tight text-darktext";

function Section({ id, title, children, tint = false }: { id?: string; title: string; children: React.ReactNode; tint?: boolean }) {
  return (
    <section id={id} className={`${tint ? "bg-pinktint" : "bg-pagebase"} px-5 py-16 text-darktext md:py-24`}>
      <div className="mx-auto max-w-5xl">
        <h2 className={`mb-8 ${heading}`}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

export default function InsiderLanding() {
  const price = INSIDER_PLAN.priceAed ?? 0;
  const aed = (n: number) => `AED ${n.toLocaleString("en-US")}`;
  return (
    <div className="font-bar">
      {/* 1. HERO (maroon) */}
      <header className="relative bg-maroon px-5 pb-16 pt-28 text-cream md:pb-24 md:pt-36">
        {FEATURES.designDraft && (
          <span className="absolute right-4 top-20 rounded-full border border-dashed border-rose-line px-3 py-1 text-xs font-bold text-rose-line">{t.draft}</span>
        )}
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="inline-block rounded-full border border-rose-line px-4 py-1 text-sm font-semibold">{t.hero.label}</span>
            <h1 className="mt-5 font-brand text-[clamp(2.4rem,8vw,4.4rem)] font-bold leading-[1.05]">{t.hero.title}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-cream/90">{t.hero.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/contact" className={coralButton}>
                {t.hero.apply}
              </Link>
              {FEATURES.loginPage && (
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-rose-line px-7 text-base font-semibold text-cream transition hover:border-coral hover:text-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
                >
                  {t.hero.account}
                </Link>
              )}
            </div>
          </div>
          <PhoneLoop />
        </div>
      </header>

      <main>
        {/* 2. WHY BECOME AN INSIDER */}
        <Section title={t.whyTitle}>
          <FlipCards />
        </Section>

        {/* 3. WHAT YOU NEED TO APPLY */}
        <Section title={t.applyTitle} tint>
          <ApplyDevice />
        </Section>

        {/* 4. YOUR DASHBOARD, ON ANY SCREEN */}
        <Section title={t.dashTitle}>
          <DashboardDrawing />
        </Section>

        {/* 5. THE DEAL */}
        <Section title={t.dealTitle} tint>
          <div className="max-w-2xl">
            <div className="rounded-2xl border border-rosesoft bg-cream p-7">
              <p className="font-brand text-4xl font-bold text-maroon">
                {aed(price)} <span className="font-bar text-lg font-semibold text-mutedtext">{t.dealMonthly}</span>
              </p>
              <p className="mt-3 text-lg">
                <strong>{aed(yearlyPriceAed(price))}</strong> {t.dealYearly} ({t.dealYearlyNote})
              </p>
            </div>
            <p className="mt-4 rounded-2xl border border-rose-line bg-pagebase px-5 py-4 text-base font-semibold leading-relaxed">{t.dealStrip}</p>
          </div>
        </Section>

        {/* 6. FOUNDING INSIDERS (by invitation only) */}
        <section className="bg-pagebase px-5 py-16 text-darktext md:py-24">
          <div className="mx-auto max-w-5xl rounded-2xl border-2 border-dashed border-rose-line bg-cream p-8">
            <span className="inline-block rounded-full bg-maroon px-4 py-1 text-sm font-bold text-cream">{t.foundingLabel}</span>
            <h2 className={`mt-4 ${heading}`}>{t.foundingTitle}</h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed">{t.foundingText(FOUNDING_SPOTS, FOUNDING_FREE_PERIOD)}</p>
            <Link
              href="/contact"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-maroon px-7 font-bar text-base font-bold text-maroon transition hover:bg-pinktint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
            >
              {t.foundingButton}
            </Link>
          </div>
        </section>

        {/* 7. CLOSING MAROON BAND */}
        <section id="get-in-touch" className="bg-maroon px-5 py-14 text-center text-cream">
          <Link href="/contact" className={coralButton}>
            {t.hero.apply}
          </Link>
        </section>
      </main>

      {FEATURES.footer && <Footer />}
      <SiteChrome alwaysVisible />
    </div>
  );
}
