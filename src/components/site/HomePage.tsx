// The new home page: a clean business page. What Spotted is, how it helps people, live numbers,
// and where restaurants, shops and creators can learn more. (The old animated home is still in the
// code: switch `hero` ON in features.ts to bring it back.)
import Link from "next/link";
import { text } from "@/content";
import { FEATURES } from "@/config/features";
import { Icon, type IconName } from "./Icons";
import LiveCounters from "./LiveCounters";
import PhoneLoop from "./PhoneLoop";
import PageShell, { Section } from "./PageShell";
import SocialButtons from "./SocialButtons";
import StoreButtons from "./StoreButtons";
import HomeLanding from "./HomeLanding";

const HELP_ICONS: IconName[] = ["bookmark", "bell", "globe"];

// `newLanding` ON (features.ts) = the new maroon and cream landing page. OFF = the older dark look below.
export default function HomePage() {
  return FEATURES.newLanding ? <HomeLanding /> : <OlderHomePage />;
}

function OlderHomePage() {
  const h = text.home;
  // the cards for restaurants, shops and Insiders show only while their pages are switched ON in features.ts
  const cards = h.forBusiness.filter((x) => (x.href === "/insider" ? FEATURES.insiderPage : FEATURES.businessPages));
  return (
    <PageShell
      chip={h.chip}
      title={h.title}
      lead={h.lead}
      aside={<PhoneLoop />}
      headerExtra={
        <>
          <SocialButtons className="mt-8" message="Hi Spotted!" />
          <StoreButtons />
        </>
      }
    >
      <Section id="how-it-works" title={h.helpsTitle}>
        <div className="grid gap-5 md:grid-cols-3">
          {h.helps.map((x, i) => (
            <div key={x.title} className="rounded-3xl bg-box p-7 text-onpanel">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-chip text-onchip">
                <Icon name={HELP_ICONS[i]} />
              </span>
              <h3 className="mt-5 text-2xl font-extrabold leading-tight">{x.title}</h3>
              <p className="mt-2 text-lg leading-relaxed text-mist">{x.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-base font-bold">{h.helpsNote}</p>
      </Section>

      {FEATURES.liveCounters && <LiveCounters />}

      {cards.length > 0 && (
      <Section title={h.forBusinessTitle}>
        <p className="mb-8 max-w-2xl text-xl leading-relaxed">{h.forBusinessLead}</p>
        <div className="grid gap-5 md:grid-cols-3">
          {cards.map((x) => (
            <Link key={x.href} href={x.href} className="group rounded-3xl border-2 border-line p-7 transition hover:bg-alt">
              <h3 className="text-2xl font-extrabold text-heading">{x.title}</h3>
              <p className="mt-2 text-lg leading-relaxed">{x.text}</p>
              <span className="mt-5 inline-flex min-h-11 items-center gap-2 font-extrabold text-heading">
                {text.common.learnMore}
                <Icon name="arrow" size={18} />
              </span>
            </Link>
          ))}
        </div>
      </Section>
      )}

      <Section title={h.talkTitle} alt>
        <p className="mb-6 max-w-2xl text-xl leading-relaxed">{h.talkLead}</p>
        <SocialButtons message="Hi Spotted! I have a question." />
      </Section>
    </PageShell>
  );
}
