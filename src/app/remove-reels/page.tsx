import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import { text } from "@/content";
import PageShell, { Section } from "@/components/site/PageShell";
import RemoveReelsForm from "@/components/site/RemoveReelsForm";

export const metadata: Metadata = { title: "Remove my reels", description: "Creators: ask us to remove your reels from Spotted." };

export default function Page() {
  if (!FEATURES.removeReelsPage) notFound();
  const t = text.removeReels;
  return (
    <PageShell chip={t.chip} title={t.title} lead={t.lead}>
      <Section>
        <div className="max-w-xl rounded-3xl bg-panel p-8 text-onpanel">
          <RemoveReelsForm />
        </div>
      </Section>
    </PageShell>
  );
}
