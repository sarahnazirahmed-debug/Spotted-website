// Who may do what in /admin. This only decides which buttons the website SHOWS.
// The real protection is in the database (supabase/admin.sql), which refuses anything not allowed.

export type TeamRole = "main_admin" | "associate" | "staff" | "helper";
export const ROLE_LABEL: Record<TeamRole, string> = {
  main_admin: "Main admin",
  associate: "Associate",
  staff: "Staff",
  helper: "Helper",
};

export const canOpenTeam = (me: TeamRole | null) => me === "main_admin" || me === "associate";
// Applications (personal details and PDFs of people who applied) are for the main admin and associates only.
export const canOpenApplications = (me: TeamRole | null) => me === "main_admin" || me === "associate";
export const canUsePinDesk = (me: TeamRole | null) => me !== null;
export const canSeeEarnings = (me: TeamRole | null) => me === "main_admin" || me === "associate";
// Only the main admin and associates may mark a detail "Not needed" (the database checks this too).
export const canMarkNotNeeded = (me: TeamRole | null) => me === "main_admin" || me === "associate";
// Only Sarah (the primary owner) may mark a reel Pinned. The database enforces it (supabase/pindesk_pin_rules.sql); this only hides the button.
export const canPinReels = (me: TeamRole | null) => me === "main_admin";
export const canDeleteReels = (me: TeamRole | null) => me === "main_admin" || me === "associate";

// The roles that `me` may give to a new person (or change a person to).
export function rolesICanGive(me: TeamRole | null): TeamRole[] {
  if (me === "main_admin") return ["associate", "staff", "helper"];
  if (me === "associate") return ["staff", "helper"];
  return [];
}

// May `me` change or remove a person whose role is `target`? The main admin: never.
export function canManage(me: TeamRole | null, target: TeamRole): boolean {
  if (target === "main_admin") return false;
  return rolesICanGive(me).includes(target);
}
