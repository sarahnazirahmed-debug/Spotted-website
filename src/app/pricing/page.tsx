import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import { text } from "@/content";
import PageShell, { Section } from "@/components/site/PageShell";
import PricingPage from "@/components/site/PricingPage";

export const metadata: Metadata = { title: "Pricing", description: "Simple plans for restaurants, shops and creators. Your first 2 months are free." };

export default function Page() {
  if (!FEATURES.pricingPage) notFound();
  return (
    <PageShell chip={text.pricing.chip} title={text.pricing.title} lead={text.pricing.lead}>
      <Section>
        <PricingPage />
      </Section>
    </PageShell>
  );
}
