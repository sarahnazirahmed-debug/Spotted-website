// Google Maps: build a search link, and read the pin (latitude, longitude) from a pasted Maps link.

// "Find on Google Maps": opens a search for the place.
export function mapsSearchUrl(place: string, branch: string, emirate: string): string {
  const query = [place, branch, emirate].map((s) => s.trim()).filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?${new URLSearchParams({ api: "1", query }).toString()}`;
}

export type PinResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; needFullLink?: boolean; reason: string };

const valid = (lat: number, lng: number) => Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

// Reads  @LAT,LNG   or   !3dLAT!4dLNG   or   ?q=LAT,LNG   (also query=, ll=, center=).
export function readMapsPin(input: string): PinResult {
  const text = input.trim();
  if (!text) return { ok: false, reason: "Paste a Google Maps link first." };
  let host = "";
  try {
    host = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`).hostname.toLowerCase();
  } catch {
    return { ok: false, reason: "That does not look like a link." };
  }
  // Short links hide the pin. The website cannot open them, so ask for the full link.
  if (host === "maps.app.goo.gl" || host === "goo.gl" || host.endsWith(".page.link")) {
    return {
      ok: false,
      needFullLink: true,
      reason: "That is a short link. Open it in your browser, then copy the full address from the address bar and paste that.",
    };
  }
  let decoded = text;
  try {
    decoded = decodeURIComponent(text);
  } catch {
    // keep the text as it is
  }
  const num = String.raw`(-?\d{1,3}(?:\.\d+)?)`;
  // The !3d !4d form is the exact pin of the place, so it wins over the @ map-centre form.
  const patterns = [
    new RegExp(`!3d${num}!4d${num}`),
    new RegExp(`@${num},${num}`),
    new RegExp(`[?&](?:q|query|ll|center|destination)=${num}\\s*,\\s*${num}`),
  ];
  for (const re of patterns) {
    const m = decoded.match(re);
    if (m) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      if (valid(lat, lng)) return { ok: true, lat, lng };
    }
  }
  return { ok: false, reason: "Could not find a pin in that link. Open the place in Google Maps and copy the full address from the address bar." };
}
