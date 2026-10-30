import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import AboutPage from "@/components/pages/AboutPage";

export const metadata: Metadata = {
  title: "About Spotted",
  description: "The story of Spotted, made in the UAE.",
};

export default function Page() {
  if (!FEATURES.aboutPage) notFound();
  return <AboutPage />;
}
