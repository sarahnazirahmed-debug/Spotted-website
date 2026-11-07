import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import { text } from "@/content";
import SiteChrome from "@/components/SiteChrome";
import Footer from "@/components/Footer";
import PageHeader from "@/components/pages/PageHeader";
import LoginForm from "@/components/account/LoginForm";

export const metadata: Metadata = {
  title: "Log in to Spotted",
  robots: { index: false },
};

// The ONE Log in page: owners, crew, Insiders and Partners all start here.
export default function Page() {
  if (!FEATURES.loginPage) notFound();
  const t = text.login;
  return (
    <>
      <PageHeader chip={t.chip} title={t.title} lead={t.lead} />
      <main className="bg-page px-5 py-16 text-onpage md:py-24">
        <div className="mx-auto max-w-lg rounded-3xl bg-panel p-8 text-paper md:p-10">
          <LoginForm />
        </div>
      </main>
      {FEATURES.footer && <Footer />}
      <SiteChrome alwaysVisible />
    </>
  );
}
