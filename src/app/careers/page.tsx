import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import CareersPage from "@/components/pages/CareersPage";

export const metadata: Metadata = {
  title: "Spotted Careers",
  description: "We are not hiring yet. Leave your email for future roles.",
};

export default function Page() {
  if (!FEATURES.careersPage) notFound();
  return <CareersPage />;
}
