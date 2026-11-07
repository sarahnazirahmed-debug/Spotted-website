// Rules for the "Add location" form. Plain functions, so they can be tested.
export const MAX_BUILDING_PLACES = 500;

// The pasted box: one place per line. Empty lines are dropped, repeats are dropped (capital letters do not matter).
export function parsePlaces(text: string): { places: string[]; problem: string | null; repeats: number } {
  const seen = new Set<string>();
  const places: string[] = [];
  let repeats = 0;
  for (const line of text.split(/\r?\n/)) {
    const name = line.replace(/\s+/g, " ").trim();
    if (!name) continue;
    if (name.length > 160) return { places: [], repeats, problem: `One line is too long (160 letters at most): "${name.slice(0, 30)}..."` };
    const key = name.toLowerCase();
    if (seen.has(key)) {
      repeats++;
      continue;
    }
    seen.add(key);
    places.push(name);
  }
  if (places.length > MAX_BUILDING_PLACES) return { places, repeats, problem: `A building can list at most ${MAX_BUILDING_PLACES} places. You pasted ${places.length}.` };
  return { places, problem: null, repeats };
}

export function locationProblem(v: { name: string; building: boolean; placesText: string }): string | null {
  if (!v.name.trim()) return "Type the name.";
  if (v.name.trim().length > 160) return "The name is too long (160 letters at most).";
  if (v.building) return parsePlaces(v.placesText).problem;
  return null;
}

// A Google Maps link must start with https:// (the database insists on it)
export function mapsUrlToSave(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const full = /^https?:\/\//i.test(t) ? t.replace(/^http:\/\//i, "https://") : `https://${t}`;
  return full;
}
