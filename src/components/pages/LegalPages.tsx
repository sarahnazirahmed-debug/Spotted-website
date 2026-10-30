// The /privacy and /terms pages.
// PRIVACY: copied from the app's docs/PRIVACY_POLICY.md, plus a short section about this website.
// TERMS: a short plain-language draft. Neither is legal advice. Have both reviewed before launch.
import { CONTACT, FEATURES, LEGAL } from "@/config/features";
import SiteChrome from "../SiteChrome";
import Footer from "../Footer";
import PageHeader from "./PageHeader";
import { Draft, H2, P, Prose, UL } from "./Prose";

// Contact line: the email once it exists, otherwise WhatsApp.
function Contact() {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  return (
    <P>
      {CONTACT.emailLive && (
        <a href={`mailto:${CONTACT.email}`} className="font-bold underline">
          {CONTACT.email}
        </a>
      )}
      {CONTACT.emailLive && number && " or "}
      {number && (
        <a href={`https://wa.me/${number}`} target="_blank" rel="noopener noreferrer" className="font-bold underline">
          message us on WhatsApp
        </a>
      )}
    </P>
  );
}

function Shell({ chip, title, children }: { chip: string; title: string; children: React.ReactNode }) {
  return (
    <>
      <PageHeader chip={chip} title={title} />
      <main className="bg-page">
        <Prose>
          <Draft show={LEGAL.draftNotice} date={LEGAL.lastUpdated} />
          {children}
        </Prose>
      </main>
      {FEATURES.footer && <Footer />}
      <SiteChrome alwaysVisible />
    </>
  );
}

export function PrivacyPage() {
  return (
    <Shell chip="Legal" title="Spotted Privacy Policy">
      <P>
        Spotted helps you remember places you find on Instagram reels and reminds you when you are nearby. This policy
        explains what the app does with your information, in plain words.
      </P>

      <H2>The short version</H2>
      <UL>
        <li>
          Your saved places, settings and sign-in details stay <strong>on your phone</strong>. We have no servers. (When we add real
          accounts and SMS codes later, this policy will be updated first.)
        </li>
        <li>
          Your location is used <strong>on your phone</strong> to remind you when you are near a saved place. We never receive it.
        </li>
        <li>We do not run ads, we do not sell data, and we do not use analytics.</li>
      </UL>

      <H2>What the app stores on your phone</H2>
      <UL>
        <li>The places you save: name, address, map position, Google place ID, your category and note, and the reel link you attached.</li>
        <li>Your settings: reminders on/off, distance, and quiet hours.</li>
        <li>Your sign-in details, if you sign in: phone number, name and email. In this version they are kept on your phone only.</li>
        <li>A note that you finished the welcome screens.</li>
      </UL>
      <P>
        This information never leaves your phone. You can erase all of it any time: <strong>Settings &rarr; Delete all my data</strong>.
        Uninstalling the app also removes it.
      </P>

      <H2>Location</H2>
      <P>Spotted asks for your location so it can:</P>
      <UL>
        <li>show how far your saved places are, and put search results near you;</li>
        <li>
          remind you when you are near a saved place, <strong>even when the app is closed</strong> (this needs the &ldquo;Allow all the
          time&rdquo; location permission).
        </li>
      </UL>
      <P>
        Your location is processed on your phone only. You can turn reminders off in Settings, or change the location permission in
        your phone settings. The rest of the app keeps working without it.
      </P>

      <H2>Notifications</H2>
      <P>
        Spotted shows notifications on your phone only, to tell you that you are near a saved place. They are created by the app on
        your phone. No notification server is involved.
      </P>

      <H2>Information shared with other services</H2>
      <UL>
        <li>
          <strong>Google Places:</strong> when you search for a place, the text you type and your approximate location (to prefer
          nearby results) are sent to Google. Google handles it under its own privacy policy.
        </li>
        <li>
          <strong>Google Maps:</strong> the Map tab is drawn by Google Maps. <strong>Directions</strong> opens Google Maps.
        </li>
        <li>
          <strong>Instagram:</strong> Spotted does not connect to Instagram and does not read reels or any Instagram content. It only
          keeps the link you share or paste. <strong>Open reel</strong> opens that link in Instagram or your browser.
        </li>
      </UL>

      <H2>This website</H2>
      <UL>
        <li>
          The website remembers your light or dark choice in your browser. It does not use ads or analytics.
        </li>
        <li>
          If you fill in a form on the website (the waitlist, the business waitlist, the creator waitlist or the careers form), we
          receive what you type in it, such as your name, email or WhatsApp number, and use it only to contact you about Spotted.
        </li>
        <li>If you message us on WhatsApp or by email, we receive what you send.</li>
      </UL>

      <H2>Children</H2>
      <P>Spotted is not designed for children under 13, and we do not knowingly collect information from them.</P>

      <H2>Changes to this policy</H2>
      <P>If this policy changes, we will update the date at the top and explain what changed.</P>

      <H2>Contact</H2>
      <Contact />
    </Shell>
  );
}

export function TermsPage() {
  return (
    <Shell chip="Legal" title="Terms of use">
      <P>These terms are the simple rules for using the Spotted app and this website. By using them, you agree to these terms.</P>

      <H2>What Spotted does</H2>
      <P>
        Spotted lets you save places you find in reels, see them in a list and on a map, and get a reminder on your phone when you
        are near one. Features may change as the app grows.
      </P>

      <H2>Your account and your data</H2>
      <UL>
        <li>Your saved places and settings are kept on your phone. You can erase them any time in Settings.</li>
        <li>Please keep your phone and any sign-in details safe.</li>
        <li>How we handle your information is explained in our Privacy Policy.</li>
      </UL>

      <H2>Places and information</H2>
      <P>
        Place names, addresses, opening details and maps come from other services, such as Google. They can be wrong or out of date.
        Please check before you travel. Spotted is not responsible for what a place offers or for changes to it.
      </P>

      <H2>Reminders and location</H2>
      <P>
        Reminders depend on your phone, your settings and your location permission. We cannot promise that every reminder will arrive
        on time, or at all.
      </P>

      <H2>Using Spotted fairly</H2>
      <UL>
        <li>Use Spotted for yourself, and in a lawful way.</li>
        <li>Do not try to break, copy or misuse the app or the website.</li>
        <li>Do not use Spotted to collect other people&rsquo;s information.</li>
      </UL>

      <H2>Content from other services</H2>
      <P>
        Spotted does not read Instagram, TikTok or YouTube. It keeps only the link you share. Those services have their own rules, and
        their names belong to them.
      </P>

      <H2>The service &ldquo;as is&rdquo;</H2>
      <P>
        We work hard to make Spotted useful, but we provide it as it is, without promises that it will always work or be free of
        mistakes. To the extent the law allows, we are not responsible for losses that come from using it.
      </P>

      <H2>Changes</H2>
      <P>We may update these terms. When we do, we will change the date at the top.</P>

      <H2>Contact</H2>
      <Contact />
    </Shell>
  );
}
