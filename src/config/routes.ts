// Where "get in touch" and "apply" buttons on the pricing, how-to-join and Log in pages go.
// Restaurants and shops are the Spotted Partners, so both go to the one Partner page.
// While the Apply page is ON (features.ts) they go straight to the Apply form (Insider or Partner version).
// Otherwise they go to the page itself, and while that page is OFF they go to the Contact page.
import { FEATURES } from "./features.ts";

export const applyLink = (kind: "insider" | "partner", how?: "founding"): string =>
  `/apply?type=${kind}${how ? `&how=${how}` : ""}`;

export const partnerLink = (page: "restaurants" | "shops" | "insider"): string => {
  if (page === "insider") {
    if (FEATURES.applyPage) return applyLink("insider");
    return FEATURES.insiderPage ? "/insider#get-in-touch" : "/contact";
  }
  if (FEATURES.applyPage) return applyLink("partner");
  return FEATURES.businessPages ? "/partners#get-in-touch" : "/contact";
};
