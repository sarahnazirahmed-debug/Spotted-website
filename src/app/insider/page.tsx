import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import InsiderPage from "@/components/creators/InsiderPage";

export const metadata: Metadata = {
  title: "Spotted Insider",
  description: "Spotted Insider: see when people save, visit and order from the places in your reels.",
};

export default function Page() {
  if (!FEATURES.insiderPage) notFound();
  return <InsiderPage />;
}
