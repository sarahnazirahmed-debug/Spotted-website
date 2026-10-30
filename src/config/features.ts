// SECTION SWITCHES: the one place that turns big parts of the website on or off.
//
// `true`  = the section is shown.
// `false` = the section is hidden. The code stays in the project, so bringing it back
//           means changing one word here. Never delete a hidden section.
//
// Rule: every time we add a new big section to the site, add a switch for it here first.

export type FeatureName = "themeLamp" | "waitlist" | "whatsappButton";

export const FEATURES: Record<FeatureName, boolean> = {
  // The pull-string lamp (top right) that switches between light and dark.
  themeLamp: true,
  // The "Join the waitlist" email form.
  waitlist: true,
  // The round WhatsApp button (bottom right).
  whatsappButton: true,
};
