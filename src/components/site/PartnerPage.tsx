// ONE design for the Restaurants, Shops and Insiders pages:
// what they are missing today, how Spotted helps, "Coming soon", and a "Get in touch" form.
// There is no sign-up yet: the form saves the person's details in Supabase so you can contact them.
import Link from "next/link";
import { FEATURES } from "@/config/features";
import { text } from "@/content";
import Directory from "../business/Directory";
import { placesFor } from "../business/data";
import ContactForm from "./ContactForm";
import { Icon, type IconName } from "./Icons";
import { Section } from "./PageShell";
import PageShell from "./PageShell";
import SocialButtons from "./SocialButtons";
import IfInstagram from "./IfInstagram";

export type PartnerKind = "restaurants" | "shops" | "insiders";

const ICONS: Record<PartnerKind, IconName[]> = {
  restaurants: ["bell", "qr", "chart"],
  shops: ["bell", "qr", "chart"],
  insiders: ["bookmark", "pin", "star"],
};

export default function PartnerPage({ kind, extra }: { kind: PartnerKind; extra?: React.ReactNode }) {
  const c = text.partner[kind];
  const p = text.partner;
  return (
    <PageShell chip={c.chip} title={c.title} lead={c.lead}>
      {FEATURES.businessDirectory && kind !== "insiders" && <Directory kind={kind} places={placesFor(kind)} />}

      <Section title={c.missingTitle}>
        <p className="max-w-3xl text-xl leading-relaxed">{c.missing}</p>
      </Section>

      <Section title={c.helpsTitle} alt>
        <div className="grid gap-5 md:grid-cols-3">
          {c.helps.map((h, i) => (
            <div key={h.title} className="rounded-3xl bg-box p-7 text-onpanel">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-chip text-onchip">
                <Icon name={ICONS[kind][i]} />
              </span>
              <h3 className="mt-5 text-2xl font-extrabold leading-tight">{h.title}</h3>
              <p className="mt-2 text-lg leading-relaxed text-mist">{h.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {extra}

      <Section id="get-in-touch" title={p.comingSoonTitle}>
        <div className="mx-auto max-w-2xl rounded-3xl bg-panel p-8 text-onpanel md:p-10">
          <p className="text-lg leading-relaxed text-mist">{p.comingSoonText}</p>
          {FEATURES.getInTouch && (
            <>
              <h3 className="mb-5 mt-6 text-2xl font-extrabold">{text.form.title}</h3>
              <ContactForm kind={c.form.kind} businessLabel={c.form.business} />
            </>
          )}
          <IfInstagram>
            <div className="mt-6">
              <p className="mb-3 text-sm font-bold text-mist">{text.form.or}</p>
              <SocialButtons />
            </div>
          </IfInstagram>
          <Link href="/pricing" className="mt-6 inline-flex min-h-11 items-center font-bold underline">
            {p.pricingLink}
          </Link>
        </div>
      </Section>
    </PageShell>
  );
}
