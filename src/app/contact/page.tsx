import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CONTACT, FEATURES } from "@/config/features";
import { text } from "@/content";
import PageShell, { Section } from "@/components/site/PageShell";
import SocialButtons from "@/components/site/SocialButtons";
import IfInstagram from "@/components/site/IfInstagram";

export const metadata: Metadata = {
  title: "Contact Spotted",
  description: "Message Spotted on WhatsApp or Instagram.",
};

export default function Page() {
  if (!FEATURES.contactPage) notFound();
  const c = text.contact;
  return (
    <PageShell chip={c.chip} title={c.title} lead={c.lead}>
      <IfInstagram also={CONTACT.emailLive}>
      <Section>
        <SocialButtons />
        {CONTACT.emailLive && (
          <p className="mt-6 text-lg">
            {c.emailLabel}:{" "}
            <a href={`mailto:${CONTACT.email}`} className="font-bold underline">
              {CONTACT.email}
            </a>
          </p>
        )}
      </Section>
      </IfInstagram>
    </PageShell>
  );
}
