import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import AccountPage from "@/components/account/AccountPage";

export const metadata: Metadata = {
  title: "Log in to Spotted",
  robots: { index: false },
};

export default function Page() {
  if (!FEATURES.accounts) notFound();
  return <AccountPage mode="login" />;
}
