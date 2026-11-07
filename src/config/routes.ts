// Where "get in touch" buttons on the pricing and how-to-join pages go.
// While the restaurant, shop and Insider pages are OFF (features.ts), they go to the Contact page instead of a hidden page.
import { FEATURES } from "./features.ts";

// Restaurants and shops are the Spotted Partners, so both go to the one Partner page (/partners).
export const partnerLink = (page: "restaurants" | "shops" | "insider"): string => {
  if (page === "insider") return FEATURES.insiderPage ? "/insider#get-in-touch" : "/contact";
  return FEATURES.businessPages ? "/partners#get-in-touch" : "/contact";
};
