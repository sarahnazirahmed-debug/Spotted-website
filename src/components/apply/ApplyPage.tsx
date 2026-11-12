"use client";

// The page around the Apply form: a maroon header (Insider or Partner version), the form, the footer.
import { useSearchParams } from "next/navigation";
import { FEATURES } from "@/config/features";
import { text } from "@/content";
import Footer from "../Footer";
import SiteChrome from "../SiteChrome";
import ApplyForm from "./ApplyForm";
import InsiderWizard from "./InsiderWizard";

export default function ApplyPage() {
  const t = text.apply;
  const partner = useSearchParams().get("type") === "partner";
  return (
    <div className="font-bar">
      <header className="relative bg-maroon px-5 pb-12 pt-28 text-cream md:pb-16 md:pt-36">
        {FEATURES.designDraft && (
          <span className="absolute right-4 top-20 rounded-full border border-dashed border-rose-line px-3 py-1 text-xs font-bold text-rose-line">{t.draft}</span>
        )}
        <div className="mx-auto max-w-2xl">
          <h1 className="font-brand text-[clamp(2rem,6vw,3.4rem)] font-bold leading-tight">{partner ? t.partnerTitle : t.insiderTitle}</h1>
          <p className="mt-4 text-lg text-cream/90">{partner ? t.partnerLead : t.insiderLead}</p>
        </div>
      </header>
      <main className="bg-pinktint px-5 py-12 md:py-16">
        {partner ? <ApplyForm /> : <InsiderWizard />}
      </main>
      {FEATURES.footer && <Footer />}
      <SiteChrome alwaysVisible />
    </div>
  );
}
