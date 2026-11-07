import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import { TermsPage, LegalPlaceholder } from "@/components/pages/LegalPages";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The simple rules for using Spotted.",
};

export default function Page() {
  if (!FEATURES.legalPages) notFound();
  // While the lawyer-checked PDF is not ready, the page is an empty "Coming soon" placeholder.
  if (FEATURES.legalPlaceholders) return <LegalPlaceholder title="Terms" />;
  return <TermsPage />;
}
