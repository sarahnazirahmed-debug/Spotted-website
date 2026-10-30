// SECTION SWITCHES: the one place that turns big parts of the website on or off.
//
// `true`  = the section is shown.
// `false` = the section is hidden. The code stays in the project, so bringing it back
//           means changing one word here. Never delete a hidden section.
//
// Rule: every time we add a new big section to the site, add a switch for it here first.

export type FeatureName = "hero" | "whatsSpotted" | "topBar" | "themeLamp" | "waitlist" | "whatsappButton";

export const FEATURES: Record<FeatureName, boolean> = {
  // The full-screen landing section at the very top (moving banner, "Spotted", launch words).
  hero: true,
  // The "What's Spotted" page under the landing section (why, how it works, never miss out, UAE, notify me).
  whatsSpotted: true,
  // The top bar that fades in when you scroll down (logo, links, Sign up / Log in).
  topBar: true,
  // The pull-string lamp (top right) that switches between light and dark.
  themeLamp: true,
  // The "Join the waitlist" email form.
  waitlist: true,
  // The round WhatsApp button (bottom right).
  whatsappButton: true,
};

// LAUNCH WORDS: what the banner says, and whether the App Store / Google Play buttons show.
// On launch day, change `status` to "outNow" (one word) and fill in the two store links.
export const LAUNCH = {
  status: "comingSoon" as "comingSoon" | "outNow",
  comingSoon: { label: "COMING SOON", date: "01.01.2027" },
  outNow: { label: "OUT NOW", date: "01.01.2027" },
  // Shown only when status is "outNow".
  stores: {
    appStore: "", // paste the App Store link here
    googlePlay: "", // paste the Google Play link here
  },
};

// The words currently printed on the banner.
export const bannerWords = () => (LAUNCH.status === "outNow" ? LAUNCH.outNow : LAUNCH.comingSoon);
