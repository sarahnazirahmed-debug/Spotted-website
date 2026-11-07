import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import ApplyPage from "@/components/apply/ApplyPage";

export const metadata: Metadata = {
  title: "Apply to Spotted",
  description: "Apply to become a Spotted Insider or a Spotted Partner.",
  robots: { index: false },
};

// One Apply page for both: /apply?type=insider or /apply?type=partner.
export default function Page() {
  if (!FEATURES.applyPage) notFound();
  return (
    <Suspense>
      <ApplyPage />
    </Suspense>
  );
}
