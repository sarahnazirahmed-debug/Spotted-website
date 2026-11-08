"use client";

// The Pricing page. Every price and every "included" line comes from src/config/pricing.ts.
import { partnerLink } from "@/config/routes";
import Link from "next/link";
import { useState } from "react";
import {
  FREE_MONTHS,
  INSIDER_PLAN,
  PARTNER_INCLUDED,
  RESTAURANT_PLANS,
  SHOP_PLANS,
  yearlyPriceAed,
  priceLabel,
  PRICES_CONFIRMED,
  type Plan,
} from "@/config/pricing";
import { text } from "@/content";
import { Icon } from "./Icons";

function PlanCard({ plan, yearly, includeShared, href }: { plan: Plan; yearly: boolean; includeShared: boolean; href: string }) {
  const t = text.pricing;
  const lines = [
    ...(includeShared ? PARTNER_INCLUDED : []),
    ...(plan.staffLogins !== null ? [t.staff(plan.staffLogins)] : []),
    ...plan.included,
  ];
  const price = plan.priceAed === null ? null : yearly ? yearlyPriceAed(plan.priceAed) : plan.priceAed;
  return (
    <div className="flex flex-col rounded-3xl bg-box p-7 text-onpanel">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-2xl font-extrabold">{plan.name}</h3>
        {plan.priceAed !== null && (
          <span className="rounded-full bg-chip px-3 py-1 text-xs font-extrabold text-onchip">{t.firstMonths(FREE_MONTHS)}</span>
        )}
      </div>
      <p className="mt-1 text-base text-mist">{plan.forWho}</p>
      <p className="mt-4 text-4xl font-extrabold">
        {price === null ? (
          t.custom
        ) : (
          <>
            {priceLabel(price)}
            {PRICES_CONFIRMED && <span className="text-lg font-bold text-mist"> {yearly ? t.perYear : t.perMonth}</span>}
          </>
        )}
      </p>
      {yearly && price !== null && <p className="mt-1 text-sm text-mist">{t.yearlyNote}</p>}
      <ul className="mt-5 grid flex-1 gap-2 text-base">
        {lines.map((l) => (
          <li key={l} className="flex gap-3">
            <span className="mt-0.5 shrink-0">
              <Icon name="star" size={18} />
            </span>
            {l}
          </li>
        ))}
      </ul>
      <Link href={href} className="mt-6 flex min-h-12 items-center justify-center rounded-full bg-btn px-6 font-extrabold text-onbtn transition active:scale-95">
        {plan.priceAed === null ? t.talk : text.common.getInTouch}
      </Link>
    </div>
  );
}

export default function PricingPage() {
  const t = text.pricing;
  const [yearly, setYearly] = useState(false);
  const toggle = (on: boolean, label: string) => (
    <button
      type="button"
      aria-pressed={yearly === on}
      onClick={() => setYearly(on)}
      className={`min-h-11 px-6 font-extrabold ${yearly === on ? "bg-accent text-onaccent" : "text-heading"}`}
    >
      {label}
    </button>
  );
  const heading = "mb-6 mt-14 text-3xl font-extrabold text-heading first:mt-0";
  return (
    <div>
      <div role="group" aria-label="Billing" className="inline-flex overflow-hidden rounded-full border-2 border-line">
        {toggle(false, t.monthly)}
        {toggle(true, t.yearly)}
      </div>
      <p className="mt-3 text-base font-bold">{t.lead}</p>

      <h2 className={heading}>{t.restaurantsTitle}</h2>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {RESTAURANT_PLANS.map((p) => (
          <PlanCard key={p.id} plan={p} yearly={yearly} includeShared={p.priceAed !== null} href={partnerLink("restaurants")} />
        ))}
      </div>

      <h2 className={heading}>{t.shopsTitle}</h2>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {SHOP_PLANS.map((p) => (
          <PlanCard key={p.id} plan={p} yearly={yearly} includeShared href={partnerLink("shops")} />
        ))}
      </div>

      <h2 className={heading}>{t.insiderTitle}</h2>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <PlanCard plan={INSIDER_PLAN} yearly={yearly} includeShared={false} href={partnerLink("insider")} />
      </div>

      <p className="mt-10 max-w-3xl text-base">{t.staffExplain}</p>
      <p className="mt-2 max-w-3xl text-base font-bold">{t.soonNote}</p>
    </div>
  );
}
