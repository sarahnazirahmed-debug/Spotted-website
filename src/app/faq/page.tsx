import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import { text } from "@/content";
import { Section } from "@/components/insider/ProfileLanding";
import DraftPage from "@/components/site/DraftPage";
import FaqList from "@/components/site/FaqList";
import IfInstagram from "@/components/site/IfInstagram";
import SocialButtons from "@/components/site/SocialButtons";

export const metadata: Metadata = { title: "FAQs", description: "Questions and answers about Spotted." };

export default function Page() {
  if (!FEATURES.faqPage) notFound();
  const t = text.faq;
  return (
    <DraftPage chip={t.chip} title={t.title}>
      <Section title={t.chip}>
        <FaqList items={t.items} pick={t.pick} />
        {FEATURES.removeReelsPage && (
          <Link href="/remove-reels" className="mt-8 inline-flex min-h-11 items-center font-bold text-maroonink underline">
            {t.removeLink}
          </Link>
        )}
        <IfInstagram>
          <h2 className="mb-4 mt-12 font-brand text-2xl font-bold text-maroonink">{t.talkTitle}</h2>
          <SocialButtons />
        </IfInstagram>
      </Section>
    </DraftPage>
  );
}
