// Which tabs a person sees at the top of /admin. (The database is what really protects the data; this only decides what to show.)
//   helper: Pin Desk only.   staff: Pin Desk and Dashboard (counts only, never money).   main admin and associate: Pin Desk, Dashboard, Team.
import { canOpenDashboard } from "./dashboard/access.ts";
import { canOpenTeam, canUsePinDesk, type TeamRole } from "./teamRules.ts";

export type AdminTab = "pin" | "dashboard" | "team";

export function adminTabs(role: TeamRole | null): AdminTab[] {
  const tabs: AdminTab[] = [];
  if (canUsePinDesk(role)) tabs.push("pin");
  if (canOpenDashboard(role)) tabs.push("dashboard");
  if (canOpenTeam(role)) tabs.push("team");
  return tabs;
}
