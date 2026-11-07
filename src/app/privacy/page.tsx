import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import { PrivacyPage, LegalPlaceholder } from "@/components/pages/LegalPages";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Spotted handles your information.",
};

export default function Page() {
  if (!FEATURES.legalPages) notFound();
  // While the lawyer-checked PDF is not ready, the page is an empty "Coming soon" placeholder.
  if (FEATURES.legalPlaceholders) return <LegalPlaceholder title="Privacy policy" />;
  return <PrivacyPage />;
}
