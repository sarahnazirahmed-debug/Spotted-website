// Who may see the dashboard, and what. The main admin and associates see everything. Staff see counts
// only: never money. Helpers (and anyone else) do not see the dashboard at all.
import type { TeamRole } from "../teamRules.ts";
import { CARDS, type CardDef } from "./cards.ts";

export type DashboardAccess = "none" | "counts" | "full";

export function dashboardAccess(role: TeamRole | null): DashboardAccess {
  if (role === "main_admin" || role === "associate") return "full";
  if (role === "staff") return "counts";
  return "none";
}

export const canOpenDashboard = (role: TeamRole | null) => dashboardAccess(role) !== "none";
export const canSeeMoney = (role: TeamRole | null) => dashboardAccess(role) === "full";

// The cards this person may see. Money cards are removed for staff.
export function visibleCards(role: TeamRole | null): CardDef[] {
  const a = dashboardAccess(role);
  if (a === "none") return [];
  return CARDS.filter((c) => a === "full" || !c.money);
}
