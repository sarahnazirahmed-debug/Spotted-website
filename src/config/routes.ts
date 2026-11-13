// Where "get in touch" and "apply" buttons on the pricing, how-to-join and Log in pages go.
// Restaurants and shops are the Spotted Partners, so both go to the one Partner page.
// While the Apply page is ON (features.ts) they go straight to the Apply form (Insider or Partner version).
// Otherwise they go to the page itself, and while that page is OFF they go to the Contact page.
import { FEATURES } from "./features.ts";

// The Join forms live in the dashboard app (Step 6 there): applications go straight to the team's review,
// the 60-day journey and the mail trail. NEXT_PUBLIC_JOIN_URL is the dashboard app's web address,
// for example https://dashboard.example.com (no slash at the end). While it is empty, the buttons use this site's own
// Apply page, so nothing is broken before the dashboard has an address.
export const JOIN_URL = (process.env.NEXT_PUBLIC_JOIN_URL ?? "").trim().replace(/\/+$/, "");

export const joinLink = (kind: "insider" | "partner"): string | null => (JOIN_URL ? `${JOIN_URL}/#/join/${kind}` : null);

export const applyLink = (kind: "insider" | "partner", how?: "founding"): string =>
  joinLink(kind) ?? `/apply?type=${kind}${how ? `&how=${how}` : ""}`;

// The dashboard's Join forms are the ONE place to apply (they save straight into the team's review screens).
// When NEXT_PUBLIC_JOIN_URL is set, every "Become an Insider / Partner" button goes there, even while this site's own Apply page is OFF.
export const partnerLink = (page: "restaurants" | "shops" | "insider"): string => {
  const dashboard = joinLink(page === "insider" ? "insider" : "partner");
  if (dashboard) return dashboard;
  if (page === "insider") {
    if (FEATURES.applyPage) return applyLink("insider");
    return FEATURES.insiderPage ? "/insider#get-in-touch" : "/contact";
  }
  if (FEATURES.applyPage) return applyLink("partner");
  return FEATURES.businessPages ? "/partners#get-in-touch" : "/contact";
};

// The "Founding Insider" button. The dashboard's Insider form has a "founding Insider" choice in its first bar, so it goes to the same form.
export const foundingLink = (): string => joinLink("insider") ?? (FEATURES.applyPage ? applyLink("insider", "founding") : "/contact");
