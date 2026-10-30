import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import InfluencerPage from "@/components/creators/InfluencerPage";

export const metadata: Metadata = {
  title: "Spotted for Influencers",
  description: "See when people save and visit the places in your reels. Join the creator waitlist.",
};

export default function Page() {
  if (!FEATURES.influencersPage) notFound();
  return <InfluencerPage />;
}
