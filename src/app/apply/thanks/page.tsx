import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FEATURES } from "@/config/features";
import { text } from "@/content";
import Footer from "@/components/Footer";
import SiteChrome from "@/components/SiteChrome";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };

// Shown after an application is sent.
export default function Page() {
  if (!FEATURES.applyPage) notFound();
  const t = text.thanks;
  return (
    <div className="font-bar">
      <main className="bg-pagebase px-5 pb-20 pt-36 text-darktext md:pt-44">
        <div className="mx-auto max-w-2xl">
          <span className="flex size-14 items-center justify-center rounded-full bg-maroon text-cream">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
          <h1 className="mt-6 font-brand text-[clamp(2rem,6vw,3.2rem)] font-bold leading-tight">{t.title}</h1>
          <p className="mt-4 text-lg leading-relaxed">{t.body}</p>
          <Link
            href="/"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-coral px-7 font-bar text-base font-bold text-darktext focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon"
          >
            {t.home}
          </Link>
        </div>
      </main>
      {FEATURES.footer && <Footer />}
      <SiteChrome alwaysVisible />
    </div>
  );
}
