// ALL THE WORDS of the new public pages, in ONE file (English).
// To add a language later: copy this file (for example to ar.ts), translate the words, and add it to
// src/content/index.ts. Nothing else needs to change. (Prices live in src/config/pricing.ts.)
// Rules: no launch dates (say "Coming soon"), no emoji, plain words.

export const en = {
  nav: {
    home: "Home",
    restaurants: "Restaurants",
    shops: "Shops",
    insiders: "Insiders",
    pricing: "Pricing",
    howToJoin: "How to join",
    faq: "FAQ",
    about: "About",
    signIn: "Sign in",
    menu: "Site menu",
    comingSoonNote: (label: string) => `${label} is coming soon.`,
  },

  common: {
    comingSoon: "Coming soon",
    getInTouch: "Get in touch",
    whatsapp: "WhatsApp",
    instagram: "Instagram",
    learnMore: "Learn more",
    seePricing: "See pricing",
    howToJoin: "How to join",
  },

  home: {
    chip: "Spotted",
    title: "Saw it in a reel?\nSpotted remembers it.",
    lead: "Save it once, get a nudge when you're nearby. Coming soon.",
    helpsTitle: "How Spotted helps",
    helps: [
      { title: "Save places from reels", text: "Share a reel to Spotted and confirm the place. It goes into your list and onto your map." },
      {
        title: "Reminders when you are near",
        text: "When you get close to a place you saved, Spotted sends you a notification, even when the app is closed. You choose how close: 200 m, 300 m, 500 m or 1 km.",
      },
      { title: "Works in any country", text: "Save a place anywhere in the world. Your reminders come with you when you travel." },
    ],
    helpsNote: "For reminders with the app closed, allow location \"Always\" when Spotted asks.",
    countersTitle: "Spotted in numbers",
    forBusinessTitle: "For restaurants, shops and creators",
    forBusinessLead: "People save places from reels and forget them. Spotted helps them remember, and helps you be remembered.",
    forBusiness: [
      { title: "Restaurants", text: "Be remembered after the reel goes viral.", href: "/restaurants" },
      { title: "Shops", text: "Be remembered when people walk past.", href: "/shops" },
      { title: "Insiders", text: "See where your reels send people.", href: "/insider" },
    ],
    talkTitle: "Questions? Talk to us.",
    talkLead: "Message us on WhatsApp or Instagram. We read every message.",
  },

  counters: {
    labels: { people: "Accounts", saved_places: "Saved places", saved_reels: "Saved reels", partners: "Spotted Partners", insiders: "Spotted Insiders" },
    worldwide: "Worldwide",
    inUae: "In the UAE",
    inCountry: (country: string) => `In ${country}`,
    pickerLabel: "Show numbers for",
    pickerNone: "Choose a country",
  },

  partner: {
    restaurants: {
      chip: "Spotted for Restaurants",
      title: "Be remembered after the reel goes viral.",
      lead: "Spotted helps the people who saved your restaurant remember it, right when they are close.",
      missingTitle: "What is missing today",
      missing:
        "A reel about your restaurant goes viral. Thousands of people save it, and then forget it. When they are right outside your door, they do not remember your name.",
      helpsTitle: "How Spotted helps",
      helps: [
        { title: "Reminds the people who saved you", text: "When someone who saved your place gets close, Spotted reminds them." },
        { title: "Real visits, counted", text: "Visits are counted with a QR scan, so you see who really came." },
        { title: "See which Insider brings customers", text: "See which creator's reel sends people to your door." },
      ],
      form: { business: "Restaurant name", kind: "restaurant" as const },
    },
    shops: {
      chip: "Spotted for Shops",
      title: "Be remembered when people walk past.",
      lead: "Spotted helps the people who saved your shop remember it, right when they are close.",
      missingTitle: "What is missing today",
      missing:
        "A reel about your shop goes viral. Thousands of people save it, and then forget it. When they are walking past your window, they do not remember your name.",
      helpsTitle: "How Spotted helps",
      helps: [
        { title: "Reminds the people who saved you", text: "When someone who saved your shop gets close, Spotted reminds them." },
        { title: "Real visits, counted", text: "Visits are counted with a QR scan, so you see who really came." },
        { title: "See which Insider brings customers", text: "See which creator's reel sends people to your shop." },
      ],
      form: { business: "Shop name", kind: "shop" as const },
    },
    insiders: {
      chip: "Spotted Insider",
      title: "See where your reels send people.",
      lead: "Spotted Insider is the paid plan for creators. See when someone saves, visits or orders from the places in your reels.",
      missingTitle: "What is missing today",
      missing:
        "Your reels send people to places, but you never see what happens next. You cannot tell who saved a place, who went, and who ordered.",
      helpsTitle: "How Spotted helps",
      helps: [
        { title: "Yellow star: saved", text: "Someone saved your reel's place." },
        { title: "Purple star: visited", text: "Someone visited but did not order." },
        { title: "Green star: ordered", text: "Someone visited and ordered." },
      ],
      form: { business: "Your name on Instagram, TikTok or YouTube", kind: "insider" as const },
      examplesTitle: "This is how your stats will look",
      examplesNote: "Example numbers, to show the idea.",
      keepTitle: "Your first 2 months are saved.",
      keepText:
        "During your first 2 months you see every star, and all of that data is kept. If you choose to continue, now or weeks or months later, your first 2 months are still there and new data carries on from them.",
      removeLink: "Want your reels removed? Tell us here.",
    },
    comingSoonTitle: "Coming soon",
    comingSoonText: "Partner tools are coming soon. There is no sign-up yet. Leave your details and we will contact you.",
    pricingLink: "See the plans and prices",
  },

  form: {
    title: "Get in touch",
    name: "Your name",
    phone: "Phone or WhatsApp number",
    email: "Email",
    submit: "Send",
    sending: "Sending...",
    done: "Thank you. We will contact you soon.",
    invalid: "Please add your name, and a phone or WhatsApp number or an email that works.",
    failed: "Something went wrong. Please try again, or message us on WhatsApp.",
    closed: "This form is not open yet. Please message us on WhatsApp.",
    or: "or message us on WhatsApp",
  },

  pricing: {
    chip: "Pricing",
    title: "Simple plans.",
    lead: "Your first 2 months are free. Pay yearly and get 1 month free.",
    monthly: "Monthly",
    yearly: "Yearly",
    perMonth: "/ month",
    perYear: "/ year",
    custom: "Custom",
    yearlyNote: "Pay for 11 months, get the 12th free.",
    firstMonths: (n: number) => `First ${n} ${n === 1 ? "month" : "months"} free`,
    staff: (n: number | "unlimited") => (n === "unlimited" ? "Unlimited staff logins" : `${n} staff logins`),
    staffExplain: "Staff logins are the people on your team who can log in for your place.",
    restaurantsTitle: "Restaurants",
    shopsTitle: "Shops",
    insiderTitle: "Spotted Insider",
    soonNote: "Partner tools and Spotted Insider are coming soon. There is no sign-up yet: get in touch and we will contact you.",
    talk: "Talk to us",
  },

  howToJoin: {
    chip: "How to join",
    title: "Joining is simple.",
    lead: "There is no sign-up yet. Here is how it works now, and how it will work.",
    partnersTitle: "Restaurants and shops (Spotted Partners)",
    partnersSteps: [
      "Get in touch. Send us your details on your page, or message us on WhatsApp.",
      "We contact you, and help you pick the plan that fits your place.",
      "Your first 2 months are free.",
      "We set up your place and your staff logins.",
      "Later: sign in as a Partner, and see your place, your visits and your Insiders.",
    ],
    insidersTitle: "Creators (Spotted Insiders)",
    insidersSteps: [
      "Get in touch. Send us your details on the Insiders page, or message us on WhatsApp.",
      "We contact you, and explain the plan.",
      "Your first 2 months are free.",
      "We set up your account.",
      "Later: sign in as an Insider, and see your stars and stats.",
    ],
    cta: "Get in touch",
  },

  faq: {
    chip: "FAQ",
    title: "Questions and answers.",
    items: [
      {
        q: "Is my information private?",
        a: "Yes. The places you save, your settings and your sign-in details stay on your phone. We do not run ads, we do not sell data, and we do not use analytics. Read the privacy policy for the full story.",
      },
      {
        q: "Why does Spotted need my location in the background?",
        a: "So it can remind you when you are near a place you saved, even when the app is closed. This needs the location setting \"Always\". Your location is used on your phone only, and we never receive it. You can turn reminders off in Settings.",
      },
      {
        q: "How does saving a place work?",
        a: "You share a reel to Spotted, and Spotted suggests the place. You confirm it is the right one. Then it goes into your saved list and onto your map. Spotted does not read Instagram, TikTok or YouTube. It only keeps the link you shared.",
      },
      {
        q: "Does Spotted work offline?",
        a: "Your saved places and menus work offline. Finding new places needs the internet.",
      },
      {
        q: "How much does it cost?",
        a: "Spotted is for people to use. For restaurants, shops and creators there are simple monthly plans. See the Pricing page for every plan.",
      },
      {
        q: "Is there a free trial?",
        a: "Yes. The first 2 months are free for Spotted Partners and for Spotted Insiders. If you pay yearly, you get 1 month free.",
      },
      {
        q: "Can I cancel?",
        a: "Yes, you can cancel. Tell us and we will stop your plan. Your data from the free months stays saved, so if you come back later, it carries on from there.",
      },
      {
        q: "How are visits counted?",
        a: "With a QR scan. When someone visits your place, they scan your QR code, and that counts as a real visit. Only real, scanned visits are counted.",
      },
      {
        q: "Is my business information confidential?",
        a: "Yes. Only the Spotted team can see your details, and everyone on the team agrees to keep them confidential. We only store links and place facts, and nothing about app users.",
      },
      {
        q: "I am a creator. Can I have my reels removed?",
        a: "Yes. Use the form on the \"Remove my reels\" page and tell us which reels. We will remove them.",
      },
    ],
    removeLink: "Remove my reels",
    talkTitle: "Still have a question?",
  },

  removeReels: {
    chip: "For creators",
    title: "Remove my reels.",
    lead: "If a reel of yours is on Spotted and you want it removed, tell us. We will remove it.",
    name: "Your name (optional)",
    handles: "Your handle or handles (for example @yourname)",
    links: "Which reels? Paste the links, or write \"all\"",
    email: "Your email, so we can reply",
    submit: "Send",
    sending: "Sending...",
    done: "Thank you. We have your request and will remove the reels.",
    invalid: "Please add your handle and an email that works.",
    failed: "Something went wrong. Please try again, or message us on WhatsApp.",
    closed: "This form is not open yet. Please message us on WhatsApp.",
  },

  contact: {
    chip: "Contact",
    title: "Say hello.",
    lead: "Message us on WhatsApp or Instagram. We read every message.",
    emailLabel: "Email",
  },

  footer: {
    tagline: "Made in the UAE.",
    follow: "Find us",
    removeReels: "Remove my reels",
    contact: "Contact",
    privacy: "Privacy",
    terms: "Terms",
    careers: "Careers",
  },
};

export type Content = typeof en;
