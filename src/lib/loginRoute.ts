// Where does a person go after they log in? One small rule, easy to test.
//   team = their email is on the Spotted team (owner or crew)
//   partnerKind = the kind of partner account their email has: "restaurant", "shop", "influencer", or null
// Returns the page to open, or null when we do not know the email.
export type PartnerKind = "restaurant" | "shop" | "influencer" | null;

export function destinationFor(team: boolean, partnerKind: PartnerKind): string | null {
  if (team) return "/admin";
  if (partnerKind === "influencer") return "/dashboard/insider";
  if (partnerKind === "restaurant" || partnerKind === "shop") return "/dashboard";
  return null;
}
