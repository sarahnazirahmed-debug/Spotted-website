import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import BusinessPage from "@/components/business/BusinessPage";

export const metadata: Metadata = {
  title: "Spotted for Shops",
  description: "Coming soon: Spotted for shops and cafés. Join the waitlist.",
};

export default function Page() {
  if (!FEATURES.businessPages) notFound();
  return <BusinessPage kind="shops" />;
}
