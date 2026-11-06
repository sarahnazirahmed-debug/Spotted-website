// Rules for the Pin Desk.
export type ReelStatus = "to_check" | "pinned" | "skip";

// A reel cannot be marked Pinned without a place name and a pin on the map.
export function pinProblem(r: { place_name?: string | null; lat?: number | null; lng?: number | null }): string | null {
  if (!r.place_name || !r.place_name.trim()) return "Add the place name first.";
  if (r.lat == null || r.lng == null || Number.isNaN(r.lat) || Number.isNaN(r.lng)) return "Add the pin on the map first.";
  return null;
}

export const EMIRATES = ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"];
export const CATEGORIES = ["Eat", "Shop", "Play"] as const;
export const STATUS_LABEL: Record<ReelStatus, string> = { to_check: "To check", pinned: "Pinned", skip: "Skip" };
