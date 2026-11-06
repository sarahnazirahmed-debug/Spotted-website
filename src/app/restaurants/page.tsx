import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import PartnerPage from "@/components/site/PartnerPage";

export const metadata: Metadata = {
  title: "Spotted for Restaurants",
  description: "How Spotted helps restaurants be remembered. Coming soon: get in touch.",
};

export default function Page() {
  if (!FEATURES.businessPages) notFound();
  return <PartnerPage kind="restaurants" />;
}
