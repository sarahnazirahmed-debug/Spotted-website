// The /about page (About us): the story of Spotted, made in the UAE, and how to reach us.
// The words are in src/content/en.ts (about). The contact details are in src/config/contactDetails.ts.
import { text } from "@/content";
import ContactDetails from "../site/ContactDetails";
import DraftPage from "../site/DraftPage";
import { Section } from "../insider/ProfileLanding";

export default function AboutPage() {
  const a = text.about;
  return (
    <DraftPage chip={a.chip} title={a.title} lead={a.lead}>
      <Section title={a.sections[0].title}>
        <div className="grid max-w-3xl gap-10">
          {a.sections.map((s, i) => (
            <div key={s.title}>
              {i > 0 && <h3 className="mb-3 font-brand text-2xl font-bold text-maroonink">{s.title}</h3>}
              <p className="text-lg leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </Section>
      <Section title={a.contactTitle} tint>
        <p className="mb-6 max-w-2xl text-lg leading-relaxed">{a.contactLead}</p>
        <ContactDetails />
      </Section>
    </DraftPage>
  );
}
