import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import SiteChrome from "@/components/SiteChrome";
import Footer from "@/components/Footer";
import PageHeader from "@/components/pages/PageHeader";
import Dashboard from "@/components/account/Dashboard";

export const metadata: Metadata = { title: "Partner dashboard", robots: { index: false } };

export default function Page() {
  if (!FEATURES.accounts) notFound();
  return (
    <>
      <PageHeader chip="Partners" title="Your dashboard." />
      <main className="bg-page px-5 py-16 text-onpage md:py-24">
        <Dashboard />
      </main>
      {FEATURES.footer && <Footer />}
      <SiteChrome alwaysVisible />
    </>
  );
}
