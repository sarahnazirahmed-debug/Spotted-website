import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import PartnerDashboard from "@/components/dashboard/PartnerDashboard";

export const metadata: Metadata = { title: "Partner dashboard", robots: { index: false } };

// Where approved Partners land after they log in. (The older placeholder is src/components/account/Dashboard.tsx, kept but not used.)
export default function Page() {
  if (!FEATURES.loginPage) notFound();
  return <PartnerDashboard />;
}
