// SECTION SWITCHES: the one place that turns big parts of the website on or off.
//
// `true`  = the section is shown.
// `false` = the section is hidden. The code stays in the project, so bringing it back
//           means changing one word here. Never delete a hidden section.
//
// Rule: every time we add a new big section to the site, add a switch for it here first.

export type FeatureName = "hero" | "whatsSpotted" | "businessPages" | "businessWaitlist" | "insiderWaitlist" | "creatorCredit" | "businessDirectory" | "adminArea" | "accounts" | "loginPage" | "insiderPage" | "careersPage" | "aboutPage" | "legalPages" | "legalPlaceholders" | "footer" | "topBar" | "themeLamp" | "waitlist" | "whatsappButton" | "pricingPage" | "howToJoinPage" | "faqPage" | "removeReelsPage" | "liveCounters" | "storeButtons" | "getInTouch" | "contactPage" | "designDraft" | "applyPage" | "newLanding";

export const FEATURES: Record<FeatureName, boolean> = {
  // The full-screen landing section at the very top (moving banner, "Spotted", launch words).
  // (Now OFF: the new home page is a clean business page. The cloth banner, the stories and the old
  // "What's Spotted" page stay in the code, ready to switch back on.)
  hero: false,
  // The "What's Spotted" page under the landing section (why, how it works, never miss out, UAE, notify me).
  whatsSpotted: true,
  // Part A: the /restaurants and /shops pages (cloth banner "COMING SOON", pitch, business waitlist form).
  // PARTNERS switch (restaurants and shops are the Spotted Partners).
  // ON in the draft look. Switch OFF to hide the pages, their menu links and the home page cards.
  businessPages: true,
  // Part B: the place directory on those pages (curved video row, list and grid, filters, place pages).
  // It is built and tested with EXAMPLE data, and OFF until real partners join.
  businessDirectory: false,
  // The /admin area for the team (Pin Desk and Team). It works on its own: it does NOT need "accounts".
  // Everyone logs in with an email + 6-digit code, and the database only lets team members in.
  adminArea: true,
  // Sign up, log in (email code) and the partner dashboard. OFF until Supabase is connected
  // (see supabase/schema.sql and .env.example).
  accounts: false,
  // The ONE Log in page (/login) and the Insider and Partner dashboards it sends people to.
  // Owners and crew go to /admin, Insiders to /dashboard/insider, Partners to /dashboard.
  // (Separate from "accounts", which is the old sign-up.)
  loginPage: true,
  // INSIDERS switch. The /insider page ("Spotted Insider": the paid plan for creators, example stats).
  // ON in the draft look. Switch OFF to hide the page and every link to it.
  insiderPage: true,
  // CAREERS switch. The /careers page ("We are not hiring yet", email form).
  // ON in the draft look. Switch OFF to hide the page and its menu link.
  // (Step 8: OFF. The Careers page is hidden: no menu link, no footer link, and the address shows the 404 page.)
  careersPage: false,
  // The /about page (the story of Spotted, contact).
  aboutPage: true,
  // The /privacy and /terms pages.
  legalPages: true,
  // The /terms, /privacy and /confidentiality pages show an EMPTY "Coming soon" placeholder until the
  // lawyer-checked PDF is ready. The draft texts stay in the code: switch OFF to show them again.
  legalPlaceholders: true,
  // The footer with links to every page.
  footer: true,
  // The top bar that fades in when you scroll down (logo, links, Sign up / Log in).
  topBar: true,
  // The pull-string lamp (top right) that switches between light and dark.
  // (OFF for now. The site stays in the dark theme until it is switched back on.)
  themeLamp: false,
  // The "Join the waitlist" email form for visitors, and the careers email form.
  // OFF for now (no place to save emails yet): the pages show a WhatsApp message button instead.
  waitlist: false,
  // The business waitlist form on /restaurants and /shops. OFF for now (WhatsApp button instead).
  businessWaitlist: false,
  // The Insider waitlist form on /insider. OFF for now (WhatsApp button instead).
  insiderWaitlist: false,
  // Public creator CREDIT and creator STARS: the Influencer story, creator handles on place pages,
  // and the star row in the simple version. OFF: only paying Spotted Insider members ever get anything
  // about them, and nothing about a creator is shown to the public.
  creatorCredit: false,
  // The /pricing page (plans and what is included: edit src/config/pricing.ts).
  pricingPage: true,
  // The /how-to-join page (numbered steps for partners and Insiders).
  howToJoinPage: true,
  // The /faq page (questions and answers).
  faqPage: true,
  // The "Creators: remove my reels" page and form.
  removeReelsPage: true,
  // The live counter bar on the home page (UAE only: Accounts, Saved places, Saved reels, and later Partners and Insiders).
  // It stays hidden until accounts, saved places and saved reels are each above 500: src/config/counters.ts.
  liveCounters: true,
  // The App Store and Google Play buttons on the home page. OFF until the app is out; the two store
  // links go in LAUNCH.stores below.
  storeButtons: false,
  // The "Get in touch" forms on Restaurants, Shops and Insiders (saved to Supabase).
  // If OFF, those pages show a WhatsApp message button instead.
  getInTouch: true,
  // The round WhatsApp button (bottom right).
  whatsappButton: true,
  // The /contact page (WhatsApp, Instagram and the contact email once it works).
  contactPage: true,
  // The small "Design draft" label on pages that are still a draft design (the Insider page).
  // ON while we build the design. Switch OFF before the site goes public so the live site never shows it.
  designDraft: true,
  // The Apply page (/apply: Insider and Partner versions) and its thank-you page.
  // If OFF, the "Become an Insider / Partner" buttons go to the Contact page instead.
  applyPage: true,
  // The home page in the new maroon, cream, Merriweather and Inter look (step 8). OFF brings back the older dark look.
  newLanding: true,
};

// LAUNCH WORDS: what the banner says, and whether the App Store / Google Play buttons show.
// There are NO dates on the website: it only says "Coming soon".
// On launch day, change `status` to "outNow" (one word) and fill in the two store links.
export const LAUNCH = {
  status: "comingSoon" as "comingSoon" | "outNow",
  comingSoon: { label: "COMING SOON" },
  outNow: { label: "OUT NOW" },
  // Shown on the sign-up thank-you screen next to the store buttons until the app is out.
  storeNote: "Coming soon",
  // Shown only when status is "outNow".
  stores: {
    appStore: "", // paste the App Store link here
    googlePlay: "", // paste the Google Play link here
  },
};

// The words currently printed on the banner (one line; pages can add a second line, like "Restaurants").
export const bannerWords = (): { label: string; line2?: string } =>
  LAUNCH.status === "outNow" ? LAUNCH.outNow : LAUNCH.comingSoon;

// Contact details shown on the About page, the legal pages and in the footer.
// The email address is only shown once the domain is bought and the mailbox works:
// buy the domain, create the mailbox, change the address below, then set emailLive to true.
export const CONTACT = { email: "hello@spotted.ae", emailLive: false };

// The privacy and terms pages are drafts until a lawyer has read them.
// Set to false (and update the dates) once they are reviewed. The notice is shown on both pages.
export const LEGAL = { draftNotice: true, lastUpdated: "30 October 2026" };
