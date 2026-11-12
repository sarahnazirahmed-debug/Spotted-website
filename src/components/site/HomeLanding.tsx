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
import IfInstagram from "./IfInstagram";
import StoreButtons from "./StoreButtons";
import { Section, coralButton } from "../insider/ProfileLanding";

// one picture for each of the six steps (objects only: no people, no faces)
const HELP_ICONS: IconName[] = ["arrow", "check", "bookmark", "bell", "range", "globe"];

export default function HomeLanding() {
  const h = text.home;
  // The three cards. Users always open the "How Spotted helps" part below. A card whose page is switched OFF
  // in features.ts shows "Coming soon" and is not a link.
  const audience = [
    { ...h.usersCard, on: true },
    { ...h.partnersCard, on: FEATURES.businessPages },
    { ...h.insidersCard, on: FEATURES.insiderPage },
  ];
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
            <SocialButtons className="mt-8" />
            <StoreButtons />
          </div>
          <PhoneLoop />
        </div>
      </header>

      <main>
        {/* 2. WHO IS SPOTTED FOR (three cards; the Users card glides down to "How Spotted helps") */}
        <Section title={h.audienceTitle} tint>
          <p className="mb-8 max-w-2xl text-lg leading-relaxed">{h.forBusinessLead}</p>
          <div className="grid gap-5 md:grid-cols-3">
            {audience.map((x) => {
              const card = "flex h-full flex-col rounded-2xl border border-rosesoft bg-card p-7";
              const body = (
                <>
                  <h3 className="font-brand text-2xl font-bold text-maroonink">{x.title}</h3>
                  <p className="mt-2 flex-1 text-base leading-relaxed">{x.text}</p>
                  <span className="mt-5 inline-flex min-h-11 items-center gap-2 font-bold text-maroonink">
                    {x.on ? text.common.learnMore : text.common.comingSoon}
                    {x.on && <Icon name="arrow" size={18} />}
                  </span>
                </>
              );
              return x.on ? (
                <a key={x.title} href={x.href} className={`${card} transition hover:border-maroonink motion-safe:active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral`}>
                  {body}
                </a>
              ) : (
                <div key={x.title} className={`${card} opacity-90`}>
                  {body}
                </div>
              );
            })}
          </div>
        </Section>

        {/* 3. HOW SPOTTED HELPS: six cards, one on the left, the next on the right, and so on */}
        <Section id="how-it-works" title={h.helpsTitle}>
          <ol className="relative grid gap-5 md:gap-6 md:before:absolute md:before:inset-y-3 md:before:left-1/2 md:before:w-px md:before:bg-rosesoft md:before:content-['']">
            {h.helps.map((x, i) => (
              <li key={x.title} className={`relative md:w-[calc(50%-1.25rem)] ${i % 2 === 0 ? "md:justify-self-start" : "md:justify-self-end"}`}>
                <div className="rounded-2xl border border-rosesoft bg-card p-6">
                  <div className="flex items-center gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-pinktint text-maroonink">
                      <Icon name={HELP_ICONS[i]} />
                    </span>
                    <span className="font-brand text-sm font-bold text-mutedtext">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-brand text-xl font-bold leading-tight">{x.title}</h3>
                  <p className="mt-2 text-base leading-relaxed text-mutedtext">{x.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-base font-semibold">{h.helpsNote}</p>
        </Section>

        {FEATURES.liveCounters && (
          <div className="bg-pagebase px-5 pb-16 text-darktext">
            <div className="mx-auto max-w-5xl">
              <LiveCounters />
            </div>
          </div>
        )}

        {/* 4. TALK TO US */}
        <IfInstagram>
          <section className="bg-maroon px-5 py-14 text-cream">
            <div className="mx-auto max-w-5xl">
              <h2 className="font-brand text-[clamp(1.7rem,4.5vw,2.6rem)] font-bold leading-tight">{h.talkTitle}</h2>
              <p className="mb-6 mt-3 max-w-2xl text-lg leading-relaxed text-cream/90">{h.talkLead}</p>
              <SocialButtons />
            </div>
          </section>
        </IfInstagram>
      </main>

      {FEATURES.footer && <Footer />}
      <SiteChrome alwaysVisible />
    </div>
  );
}
