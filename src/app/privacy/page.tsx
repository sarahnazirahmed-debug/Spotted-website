import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import { PrivacyPage } from "@/components/pages/LegalPages";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Spotted handles your information.",
};

export default function Page() {
  if (!FEATURES.legalPages) notFound();
  return <PrivacyPage />;
}
