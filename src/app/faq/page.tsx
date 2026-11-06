import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import { text } from "@/content";
import PageShell, { Section } from "@/components/site/PageShell";
import SocialButtons from "@/components/site/SocialButtons";

export const metadata: Metadata = { title: "FAQ", description: "Questions and answers about Spotted." };

export default function Page() {
  if (!FEATURES.faqPage) notFound();
  const t = text.faq;
  return (
    <PageShell chip={t.chip} title={t.title}>
      <Section>
        <div className="grid max-w-3xl gap-3">
          {t.items.map((it) => (
            <details key={it.q} className="group rounded-2xl bg-box p-5 text-onpanel">
              <summary className="min-h-11 cursor-pointer text-xl font-extrabold">{it.q}</summary>
              <p className="mt-3 text-lg leading-relaxed text-mist">{it.a}</p>
            </details>
          ))}
        </div>
        {FEATURES.removeReelsPage && (
          <Link href="/remove-reels" className="mt-6 inline-flex min-h-11 items-center font-bold underline">
            {t.removeLink}
          </Link>
        )}
        <h2 className="mb-4 mt-12 text-2xl font-extrabold text-heading">{t.talkTitle}</h2>
        <SocialButtons message="Hi Spotted! I have a question." />
      </Section>
    </PageShell>
  );
}
