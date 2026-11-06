import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import { text } from "@/content";
import PageShell, { Section } from "@/components/site/PageShell";
import SocialButtons from "@/components/site/SocialButtons";

export const metadata: Metadata = { title: "How to join", description: "How restaurants, shops and creators join Spotted." };

function Steps({ title, steps, href }: { title: string; steps: string[]; href: string }) {
  return (
    <div className="rounded-3xl bg-box p-7 text-onpanel">
      <h3 className="text-2xl font-extrabold">{title}</h3>
      <ol className="mt-5 grid gap-4">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-chip font-extrabold text-onchip">{i + 1}</span>
            <span className="pt-1 text-lg leading-relaxed">{s}</span>
          </li>
        ))}
      </ol>
      <Link href={href} className="mt-6 flex min-h-12 items-center justify-center rounded-full bg-btn px-6 font-extrabold text-onbtn">
        {text.howToJoin.cta}
      </Link>
    </div>
  );
}

export default function Page() {
  if (!FEATURES.howToJoinPage) notFound();
  const t = text.howToJoin;
  return (
    <PageShell chip={t.chip} title={t.title} lead={t.lead}>
      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <Steps title={t.partnersTitle} steps={t.partnersSteps} href="/restaurants#get-in-touch" />
          <Steps title={t.insidersTitle} steps={t.insidersSteps} href="/insider#get-in-touch" />
        </div>
        <div className="mt-8">
          <SocialButtons message="Hi Spotted! I would like to join." />
        </div>
      </Section>
    </PageShell>
  );
}
