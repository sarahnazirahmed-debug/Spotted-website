// Rules for the reel form's links to a restaurant or shop and to a location, and the "Posted on" date.
export type BizOption = { id: string; name: string; type: "restaurant" | "shop"; code?: string };
export type LocOption = {
  id: string;
  name: string;
  emirate: string | null;
  maps_url: string | null;
  lat: number | null;
  lng: number | null;
  is_building: boolean;
  business_id: string | null;
};

// "Posted on" is needed when the reel has items (dishes) or a deal (offer). It cannot be in the future.
export function postedOnProblem(v: { dishCount: number; dealCount: number; postedOn: string }, today = new Date().toISOString().slice(0, 10)): string | null {
  const needed = v.dishCount > 0 || v.dealCount > 0;
  if (!v.postedOn) return needed ? 'Add the "Posted on" date. It is needed when the reel has items or a deal.' : null;
  if (v.postedOn < "2010-01-01") return '"Posted on" is too long ago.';
  if (v.postedOn > today) return '"Posted on" cannot be in the future.';
  return null;
}

// Which locations can be picked. With a restaurant or shop chosen: its own locations, then malls and hotels
// (a mall that belongs to a different restaurant or shop is left out, the database would refuse it).
// With none chosen: every location.
export function locationGroups(businessId: string, locations: LocOption[]): { title: string; items: LocOption[] }[] {
  const sorted = [...locations].sort((a, b) => a.name.localeCompare(b.name));
  if (!businessId) return [{ title: "All locations", items: sorted }];
  const mine = sorted.filter((l) => l.business_id === businessId);
  const buildings = sorted.filter((l) => l.is_building && l.business_id === null);
  return [
    { title: "This restaurant or shop", items: mine },
    { title: "Malls and hotels", items: buildings },
  ].filter((g) => g.items.length > 0);
}

// Can this location go with this restaurant or shop?
export const locationFits = (loc: LocOption | undefined, businessId: string) => !loc || !loc.business_id || !businessId || loc.business_id === businessId;
