import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import { text } from "@/content";
import { Section } from "@/components/insider/ProfileLanding";
import ContactDetails from "@/components/site/ContactDetails";
import DraftPage from "@/components/site/DraftPage";
import IfInstagram from "@/components/site/IfInstagram";
import SocialButtons from "@/components/site/SocialButtons";

export const metadata: Metadata = {
  title: "Contact Spotted",
  description: "How to reach Spotted: questions, complaints and phone.",
};

// The contact details (two emails and a phone) are in src/config/contactDetails.ts. WhatsApp is only the round button in the corner.
export default function Page() {
  if (!FEATURES.contactPage) notFound();
  const c = text.contact;
  return (
    <DraftPage chip={c.chip} title={c.title} lead={c.lead}>
      <Section title={c.chip}>
        <ContactDetails />
        <IfInstagram>
          <h2 className="mb-4 mt-12 font-brand text-2xl font-bold text-maroonink">{c.instagramTitle}</h2>
          <SocialButtons />
        </IfInstagram>
      </Section>
    </DraftPage>
  );
}
