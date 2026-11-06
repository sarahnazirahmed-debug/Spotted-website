import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURES } from "@/config/features";
import AdminProvider from "@/components/admin/AdminProvider";
import AdminFrame from "@/components/admin/AdminFrame";

// The admin area is for the team only: search engines must not list it.
export const metadata: Metadata = { title: "Spotted team", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!FEATURES.adminArea) notFound();
  return (
    <AdminProvider>
      <div className="min-h-dvh bg-page text-onpage">
        <AdminFrame>{children}</AdminFrame>
      </div>
    </AdminProvider>
  );
}
