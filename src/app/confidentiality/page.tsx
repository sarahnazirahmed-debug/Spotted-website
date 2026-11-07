import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import { text } from "@/content";
import { LegalPlaceholder } from "@/components/pages/LegalPages";

export const metadata: Metadata = {
  title: "Confidentiality agreement",
  description: "The Spotted confidentiality agreement. Coming soon.",
};

// An empty "Coming soon" placeholder until the lawyer-checked PDF is ready.
export default function Page() {
  if (!FEATURES.legalPages) notFound();
  return <LegalPlaceholder title={text.placeholder.confidentialityTitle} />;
}
