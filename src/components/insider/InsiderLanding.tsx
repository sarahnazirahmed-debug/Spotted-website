// The Insider page (step 3): the shared template (ProfileLanding) with the Insider words, the AED 249 deal,
// and the "Founding Insiders" box (by invitation only). Words: src/content/en.ts (insiderPage).
// Price and founding group: src/config/pricing.ts.
"use client";

import Link from "next/link";
import { useSiteSettings } from "@/lib/siteSettings";
import { FOUNDING_FREE_PERIOD, FOUNDING_SPOTS, priceLabel, yearlyPriceAed } from "@/config/pricing";
import { text } from "@/content";
import { applyLink, partnerLink } from "@/config/routes";
import ProfileLanding, { heading } from "./ProfileLanding";
import { FEATURES } from "@/config/features";

const t = text.insiderPage;

export default function InsiderLanding() {
  const price = useSiteSettings().prices.insider ?? null; // typed on the Pin Desk; empty = "Price to confirm"
  const aed = (n: number | null) => priceLabel(n);
  const deal = (
    <div className="max-w-2xl">
      <div className="rounded-2xl border border-rosesoft bg-card p-7">
        <p className="font-brand text-4xl font-bold text-maroonink">
          {aed(price)} <span className="font-bar text-lg font-semibold text-mutedtext">{t.dealMonthly}</span>
        </p>
        <p className="mt-3 text-lg">
          <strong>{aed(price === null ? null : yearlyPriceAed(price))}</strong> {t.dealYearly} ({t.dealYearlyNote})
        </p>
      </div>
      <p className="mt-4 rounded-2xl border border-rose-line bg-pagebase px-5 py-4 text-base font-semibold leading-relaxed">{t.dealStrip}</p>
    </div>
  );
  const founding = (
    <section className="bg-pagebase px-5 py-16 text-darktext md:py-24">
      <div className="mx-auto max-w-5xl rounded-2xl border-2 border-dashed border-rose-line bg-card p-8">
        <span className="inline-block rounded-full bg-maroon px-4 py-1 text-sm font-bold text-cream">{t.foundingLabel}</span>
        <h2 className={`mt-4 ${heading}`}>{t.foundingTitle}</h2>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed">{t.foundingText(FOUNDING_SPOTS, FOUNDING_FREE_PERIOD)}</p>
        <Link
          href={FEATURES.applyPage ? applyLink("insider", "founding") : "/contact"}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full border border-maroonink px-7 font-bar text-base font-bold text-maroonink transition hover:bg-pinktint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
        >
          {t.foundingButton}
        </Link>
      </div>
    </section>
  );
  return <ProfileLanding t={t} deal={deal} extra={founding} applyHref={partnerLink("insider")} />;
}
