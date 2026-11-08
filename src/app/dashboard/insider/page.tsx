import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import InsiderDashboard from "@/components/dashboard/InsiderDashboard";

export const metadata: Metadata = { title: "Insider dashboard", robots: { index: false } };

// Where approved Insiders land after they log in.
export default function Page() {
  if (!FEATURES.loginPage) notFound();
  return <InsiderDashboard />;
}
