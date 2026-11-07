import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import PartnerLanding from "@/components/insider/PartnerLanding";

export const metadata: Metadata = {
  title: "Spotted Partner",
  description: "Spotted Partner: for restaurants and shops. Let people find you from the reels they already love.",
};

// The Partners page (the Partners switch is businessPages in features.ts).
export default function Page() {
  if (!FEATURES.businessPages) notFound();
  return <PartnerLanding />;
}
