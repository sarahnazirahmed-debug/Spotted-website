// The /insider page: "Spotted Insider", the PAID plan for creators (price and the free months are in
// src/config/pricing.ts). It uses the same design as Restaurants and Shops (PartnerPage), plus the
// three stars and an example of the stats. Creators who do not pay get nothing shown on the site.
"use client";

import Link from "next/link";
import { useSiteSettings } from "@/lib/siteSettings";
import { FEATURES } from "@/config/features";
import { INSIDER_PLAN, FREE_MONTHS, priceLabel } from "@/config/pricing";
import { text } from "@/content";
import { Section } from "../site/PageShell";
import PartnerPage from "../site/PartnerPage";
import InsiderLanding from "../insider/InsiderLanding";
import { Star, STAR_COLOUR, type StarKind } from "./Stars";

// EXAMPLE numbers, to show how the stats will look.
const REELS = [
  { title: "The bowl everyone is saving", place: "Saffron Table", saved: 128, looked: 19, ordered: 41 },
  { title: "Sunday brunch spot", place: "Date & Bean", saved: 86, looked: 14, ordered: 29 },
  { title: "Three outfits, one shop", place: "Thread & Co", saved: 54, looked: 9, ordered: 22 },
];
const MAX = Math.max(...REELS.map((r) => r.saved));

function Extras() {
  const c = text.partner.insiders;
  const insiderPrice = useSiteSettings().prices.insider ?? null; // typed on the Pin Desk; empty = "Price to confirm"
  return (
    <>
      <Section title={c.examplesTitle}>
        <p className="mb-6 text-sm font-bold">{c.examplesNote}</p>
        <ul className="grid gap-4">
          {REELS.map((r) => (
            <li key={r.title} className="rounded-3xl bg-box p-6 text-onpanel">
              <p className="text-xl font-extrabold">{r.title}</p>
              <p className="text-sm font-bold text-mist">{r.place} (example)</p>
              <div className="mt-4 grid gap-3">
                {(
                  [
                    ["saved", r.saved, "saved"],
                    ["visitedNoOrder", r.looked, "no order"],
                    ["ordered", r.ordered, "ordered"],
                  ] as [StarKind, number, string][]
                ).map(([kind, n, word]) => (
                  <div key={kind} className="flex items-center gap-3">
                    <Star kind={kind} size={24} />
                    <div className="h-4 flex-1 overflow-hidden rounded-full bg-charcoal-deep">
                      <div className="h-full rounded-full" style={{ width: `${(n / MAX) * 100}%`, background: STAR_COLOUR[kind] }} />
                    </div>
                    <span className="w-28 text-right font-extrabold">
                      {n} {word}
                    </span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section alt>
        <div className="max-w-2xl rounded-3xl bg-box p-7 text-onpanel">
          <p className="text-2xl font-extrabold">
            {INSIDER_PLAN.name}: {priceLabel(insiderPrice)} / month. First {FREE_MONTHS} months free.
          </p>
          <h3 className="mt-5 text-xl font-extrabold">{c.keepTitle}</h3>
          <p className="mt-2 text-lg leading-relaxed text-mist">{c.keepText}</p>
          <div className="mt-5 flex flex-wrap gap-4">
            <Link href="/pricing" className="inline-flex min-h-11 items-center font-bold underline">
              {text.partner.pricingLink}
            </Link>
            {FEATURES.removeReelsPage && (
              <Link href="/remove-reels" className="inline-flex min-h-11 items-center font-bold underline">
                {c.removeLink}
              </Link>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}

// The OLD Insider page (same design as Restaurants and Shops). It is not used any more: the new
// page is src/components/insider/InsiderLanding.tsx. Kept in the code, never deleted.
export function LegacyInsiderPage() {
  return <PartnerPage kind="insiders" extra={<Extras />} />;
}

export default function InsiderPage() {
  return <InsiderLanding />;
}
