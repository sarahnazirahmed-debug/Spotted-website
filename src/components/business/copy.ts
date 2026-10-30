// The words for the two business pages. Both pages use the same design; only these words change.
import type { Kind } from "./data";

export const COPY: Record<
  Kind,
  {
    word: string; // printed on the banner
    singular: string;
    title: string;
    points: string[];
    types: string[];
    namePlaceholder: string;
  }
> = {
  restaurants: {
    word: "Restaurants",
    singular: "restaurant",
    title: "Be remembered when they walk past.",
    points: [
      "People save places they see in reels. Spotted keeps your restaurant in their list.",
      "When someone who saved you is nearby, Spotted sends a nudge, even with the app closed.",
      "We start in Khalifa City, Abu Dhabi.",
    ],
    types: ["Restaurant", "Café", "Bakery", "Food truck", "Other"],
    namePlaceholder: "Your restaurant's name",
  },
  shops: {
    word: "Shops",
    singular: "shop",
    title: "Be remembered when they walk past.",
    points: [
      "People save shops they see in reels. Spotted keeps your shop in their list.",
      "When someone who saved you is nearby, Spotted sends a nudge, even with the app closed.",
      "We start in Khalifa City, Abu Dhabi.",
    ],
    types: ["Fashion", "Beauty", "Gifts", "Home", "Other"],
    namePlaceholder: "Your shop's name",
  },
};
