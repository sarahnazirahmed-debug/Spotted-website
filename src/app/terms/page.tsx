import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import { TermsPage } from "@/components/pages/LegalPages";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The simple rules for using Spotted.",
};

export default function Page() {
  if (!FEATURES.legalPages) notFound();
  return <TermsPage />;
}
