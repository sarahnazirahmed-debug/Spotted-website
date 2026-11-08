// The Spotted Partner page (step 8): the shared template (ProfileLanding) with the Partner words, TWO TIERS
// (Restaurants and Shops), a card for every plan with a "See more" drop-down, the reward cap, and the pink
// "First 2 months free" strip. Every price says "Price to confirm" until the real prices are given
// (PRICES_CONFIRMED in src/config/pricing.ts). Words: src/content/en.ts (partnerPage). Prices: src/config/pricing.ts.
import Link from "next/link";
import {
  FREE_MONTHS,
  PARTNER_INCLUDED,
  PARTNER_PRICE_CARDS,
  PRICE_TO_CONFIRM,
  priceLabel,
  type PartnerCard,
} from "@/config/pricing";
import { text } from "@/content";
import { partnerLink } from "@/config/routes";
import { Icon } from "../site/Icons";
import ProfileLanding, { coralButton } from "./ProfileLanding";

const t = text.partnerPage;

function PlanCard({ c, joinHref }: { c: PartnerCard; joinHref: string }) {
  // what "See more" shows: the lines every Partner plan has, this plan's staff logins, the free months, and the reward cap
  const lines = [...PARTNER_INCLUDED, t.staffLogins(c.staffLogins), t.freeMonths(FREE_MONTHS), t.rewardLine];
  return (
    <li className="flex flex-col rounded-2xl border border-rosesoft bg-cream p-5">
      <p className="font-brand text-lg font-bold leading-snug">{c.name}</p>
      {c.forWho && <p className="text-sm font-semibold text-mutedtext">{c.forWho}</p>}
      <p className="mt-4 font-brand text-xl font-bold text-maroon">{priceLabel(c.priceAed)}</p>
      <p className="text-xs font-semibold text-mutedtext">{t.dealMonthly}</p>
      <p className="mt-2 text-sm font-semibold">
        {PRICE_TO_CONFIRM} <span className="text-xs text-mutedtext">{t.dealYearly}</span>
      </p>
      <Link href={joinHref} className={`${coralButton} mt-4 !min-h-11 !px-5 text-sm`}>
        {t.joinPlan}
      </Link>
      <details className="group mt-3 border-t border-rosesoft">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-bar text-sm font-bold text-maroon marker:hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral [&::-webkit-details-marker]:hidden">
          {t.seeMore}
          <span className="transition group-open:rotate-90" aria-hidden="true">
            <Icon name="arrow" size={16} />
          </span>
        </summary>
        <ul className="grid gap-2 pb-2 text-sm leading-snug">
          {lines.map((l) => (
            <li key={l} className="flex gap-2">
              <span className="mt-0.5 shrink-0 text-maroon">
                <Icon name="star" size={14} />
              </span>
              {l}
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

function Tier({ n, group, title, joinHref }: { n: number; group: PartnerCard["group"]; title: string; joinHref: string }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-maroon px-3 py-1 text-xs font-bold text-cream">{t.tierLabel(n)}</span>
        <h3 className="font-brand text-xl font-bold">{title}</h3>
      </div>
      <ul className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PARTNER_PRICE_CARDS.filter((c) => c.group === group).map((c) => (
          <PlanCard key={c.id} c={c} joinHref={joinHref} />
        ))}
      </ul>
    </div>
  );
}

export default function PartnerLanding() {
  const joinHref = partnerLink("restaurants");
  const deal = (
    <div>
      <p className="mb-2 max-w-2xl text-base font-semibold text-mutedtext">{t.tiersNote}</p>
      <p className="mb-6 max-w-2xl text-base font-semibold text-mutedtext">{t.dealRule}</p>
      <div className="grid gap-10">
        <Tier n={1} group="restaurants" title={t.restaurantsTitle} joinHref={joinHref} />
        <Tier n={2} group="shops" title={t.shopsTitle} joinHref={joinHref} />
      </div>
      <div className="mt-8 max-w-2xl rounded-2xl border-2 border-maroon bg-cream px-6 py-5">
        <h3 className="font-brand text-xl font-bold text-maroon">{t.rewardTitle}</h3>
        <p className="mt-2 text-base leading-relaxed">{t.rewardText}</p>
      </div>
      <p className="mt-6 max-w-2xl rounded-2xl border border-rose-line bg-pagebase px-5 py-4 text-base font-semibold leading-relaxed">
        {text.insiderPage.dealStrip}
      </p>
    </div>
  );
  return <ProfileLanding t={t} deal={deal} applyHref={joinHref} />;
}
