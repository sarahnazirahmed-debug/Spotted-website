import DesktopDashboard from "@/components/dashboard/DesktopDashboard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DesktopDashboard>{children}</DesktopDashboard>;
}
