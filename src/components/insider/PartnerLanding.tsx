// The Spotted Partner page (step 4): the shared template (ProfileLanding) with the Partner words, eight small price
// cards (monthly price, yearly price shown as [TBD]) and the same pink "First 2 months free" strip. No Founding box.
// Words: src/content/en.ts (partnerPage, and insiderPage.dealStrip for the strip). Prices: src/config/pricing.ts.
import { PARTNER_PRICE_CARDS, PARTNER_YEARLY_TBD, type PartnerCard } from "@/config/pricing";
import { text } from "@/content";
import ProfileLanding from "./ProfileLanding";

const t = text.partnerPage;

function Cards({ group, title }: { group: PartnerCard["group"]; title: string }) {
  return (
    <div>
      <h3 className="mb-3 font-brand text-xl font-bold">{title}</h3>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PARTNER_PRICE_CARDS.filter((c) => c.group === group).map((c) => (
          <li key={c.id} className="rounded-2xl border border-rosesoft bg-cream p-4">
            <p className="font-brand text-base font-bold leading-snug">{c.name}</p>
            {c.forWho && <p className="text-xs font-semibold text-mutedtext">{c.forWho}</p>}
            <p className="mt-3 font-brand text-2xl font-bold text-maroon">AED {c.priceAed}</p>
            <p className="text-xs font-semibold text-mutedtext">{t.dealMonthly}</p>
            <p className="mt-2 text-sm font-semibold">
              {PARTNER_YEARLY_TBD} <span className="text-xs text-mutedtext">{t.dealYearly}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PartnerLanding() {
  const deal = (
    <div>
      <p className="mb-6 max-w-2xl text-base font-semibold text-mutedtext">{t.dealRule}</p>
      <div className="grid gap-8">
        <Cards group="restaurants" title={t.restaurantsTitle} />
        <Cards group="shops" title={t.shopsTitle} />
      </div>
      <p className="mt-8 max-w-2xl rounded-2xl border border-rose-line bg-pagebase px-5 py-4 text-base font-semibold leading-relaxed">
        {text.insiderPage.dealStrip}
      </p>
    </div>
  );
  return <ProfileLanding t={t} deal={deal} />;
}
