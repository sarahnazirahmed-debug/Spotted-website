import type { Dish } from "./dishes";
import type { Platform } from "./reelLinks";
import type { ReelStatus } from "./pinRules";

// One row of the "reels" table (the Pin Desk).
export type Reel = {
  id: string;
  url: string;
  link_key: string;
  platform: Platform;
  place_name: string | null;
  branch: string | null;
  emirate: string | null;
  country: string;
  category: "Eat" | "Shop" | "Play" | null;
  collection: string | null;
  maps_url: string | null;
  lat: number | null;
  lng: number | null;
  creator_handle: string | null; // hidden from app users
  code: string; // made by the database on Save; for the team only
  business_id: string | null; // the restaurant or shop (optional)
  location_id: string | null; // the location (optional)
  posted_on: string | null; // the day the reel was posted
  dishes: Dish[];
  offer_text: string | null;
  offer_start: string | null;
  offer_end: string | null;
  offer_hours: string | null;
  notes: string | null;
  status: ReelStatus;
  added_by: string | null;
  pinned_by: string | null;
  created_at: string;
  updated_at: string;
};

// What we send when adding a reel. The database fills in the rest (id, added_by, pinned_by, dates).
export type ReelInput = Omit<Reel, "id" | "code" | "business_id" | "location_id" | "posted_on" | "added_by" | "pinned_by" | "created_at" | "updated_at"> &
  Partial<Pick<Reel, "business_id" | "location_id" | "posted_on">>;

export type ShareRequest = {
  link_key: string;
  url: string;
  platform: Platform;
  times_shared: number;
  first_shared_at: string;
  last_shared_at: string;
};
