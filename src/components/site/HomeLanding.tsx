// The new landing page (step 8): maroon hero, cream sections, Merriweather headings, Inter text.
// The shared look comes from the Insider and Partner pages (ProfileLanding). Words: src/content/en.ts (home).
// Switch: `newLanding` in features.ts. (The older dark home page is still in HomePage.tsx.)
import Link from "next/link";
import { FEATURES } from "@/config/features";
import { text } from "@/content";
import { partnerLink } from "@/config/routes";
import Footer from "../Footer";
import SiteChrome from "../SiteChrome";
import { Icon, type IconName } from "./Icons";
import LiveCounters from "./LiveCounters";
import PhoneLoop from "./PhoneLoop";
import SocialButtons from "./SocialButtons";
import StoreButtons from "./StoreButtons";
import { Section, coralButton } from "../insider/ProfileLanding";

const HELP_ICONS: IconName[] = ["bookmark", "bell", "globe"];
const outlineButton =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-maroon px-7 font-bar text-base font-bold text-maroon transition hover:bg-pinktint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral";

export default function HomeLanding() {
  const h = text.home;
  const audience = [h.partnersCard, h.insidersCard].filter((x) => (x.href === "/insider" ? FEATURES.insiderPage : FEATURES.businessPages));
  return (
    <div className="font-bar">
      {/* 1. HERO (maroon) */}
      <header className="bg-maroon px-5 pb-16 pt-28 text-cream md:pb-24 md:pt-36">
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="inline-block rounded-full border border-rose-line px-4 py-1 text-sm font-semibold">{h.chip}</span>
            <h1 className="mt-5 whitespace-pre-line font-brand text-[clamp(2.4rem,8vw,4.4rem)] font-bold leading-[1.05]">{h.title}</h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-cream/90">{h.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {FEATURES.businessPages && (
                <Link href={partnerLink("restaurants")} className={coralButton}>
                  {h.joinPartner}
                </Link>
              )}
              {FEATURES.insiderPage && (
                <Link
                  href={partnerLink("insider")}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-rose-line px-7 text-base font-semibold text-cream transition hover:border-coral hover:text-coral focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
                >
                  {h.joinInsider}
                </Link>
              )}
            </div>
            <SocialButtons className="mt-8" message="Hi Spotted!" />
            <StoreButtons />
          </div>
          <PhoneLoop />
        </div>
      </header>

      <main>
        {/* 2. HOW SPOTTED HELPS */}
        <Section id="how-it-works" title={h.helpsTitle}>
          <div className="grid gap-5 md:grid-cols-3">
            {h.helps.map((x, i) => (
              <div key={x.title} className="rounded-2xl border border-rosesoft bg-cream p-6">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-pinktint text-maroon">
                  <Icon name={HELP_ICONS[i]} />
                </span>
                <h3 className="mt-5 font-brand text-xl font-bold leading-tight">{x.title}</h3>
                <p className="mt-2 text-base leading-relaxed text-mutedtext">{x.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-base font-semibold">{h.helpsNote}</p>
        </Section>

        {FEATURES.liveCounters && (
          <div className="bg-pagebase px-5 pb-16 text-darktext">
            <div className="mx-auto max-w-5xl">
              <LiveCounters />
            </div>
          </div>
        )}

        {/* 3. WHO IS SPOTTED FOR */}
        {audience.length > 0 && (
          <Section title={h.audienceTitle} tint>
            <p className="mb-8 max-w-2xl text-lg leading-relaxed">{h.forBusinessLead}</p>
            <div className="grid gap-5 md:grid-cols-2">
              {audience.map((x) => (
                <Link key={x.href} href={x.href} className="group rounded-2xl border border-rosesoft bg-cream p-7 transition hover:border-maroon">
                  <h3 className="font-brand text-2xl font-bold text-maroon">{x.title}</h3>
                  <p className="mt-2 text-base leading-relaxed">{x.text}</p>
                  <span className="mt-5 inline-flex min-h-11 items-center gap-2 font-bold text-maroon">
                    {text.common.learnMore}
                    <Icon name="arrow" size={18} />
                  </span>
                </Link>
              ))}
            </div>
          </Section>
        )}

        {/* 4. JOIN */}
        <Section id="join" title={h.joinTitle}>
          <p className="mb-6 max-w-2xl text-lg leading-relaxed">{h.joinLead}</p>
          <div className="flex flex-wrap gap-3">
            <Link href={partnerLink("restaurants")} className={coralButton}>
              {h.joinPartner}
            </Link>
            <Link href={partnerLink("insider")} className={outlineButton}>
              {h.joinInsider}
            </Link>
          </div>
        </Section>

        {/* 5. TALK TO US */}
        <section className="bg-maroon px-5 py-14 text-cream">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-brand text-[clamp(1.7rem,4.5vw,2.6rem)] font-bold leading-tight">{h.talkTitle}</h2>
            <p className="mb-6 mt-3 max-w-2xl text-lg leading-relaxed text-cream/90">{h.talkLead}</p>
            <SocialButtons message="Hi Spotted! I have a question." />
          </div>
        </section>
      </main>

      {FEATURES.footer && <Footer />}
      <SiteChrome alwaysVisible />
    </div>
  );
}
