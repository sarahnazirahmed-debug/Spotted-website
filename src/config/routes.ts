// Where "get in touch" buttons on the pricing and how-to-join pages go.
// While the restaurant, shop and Insider pages are OFF (features.ts), they go to the Contact page instead of a hidden page.
import { FEATURES } from "./features.ts";

export const partnerLink = (page: "restaurants" | "shops" | "insider"): string =>
  (page === "insider" ? FEATURES.insiderPage : FEATURES.businessPages) ? `/${page}#get-in-touch` : "/contact";
