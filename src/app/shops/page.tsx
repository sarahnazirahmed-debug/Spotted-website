import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import PartnerPage from "@/components/site/PartnerPage";

export const metadata: Metadata = {
  title: "Spotted for Shops",
  description: "How Spotted helps shops be remembered. Coming soon: get in touch.",
};

export default function Page() {
  if (!FEATURES.businessPages) notFound();
  return <PartnerPage kind="shops" />;
}
