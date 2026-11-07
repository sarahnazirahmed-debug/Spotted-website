// The footer: links to every page, the WhatsApp and Instagram buttons, and the contact email (once it exists).
import Link from "next/link";
import { CONTACT, FEATURES } from "@/config/features";
import { text } from "@/content";
import SocialButtons from "./site/SocialButtons";

export default function Footer() {
  // The footer has five links: Privacy, Terms, Contact, About, FAQ. (Each shows only while its page is switched ON.)
  const links: [string, string, boolean][] = [
    [text.footer.privacy, "/privacy", FEATURES.legalPages],
    [text.footer.terms, "/terms", FEATURES.legalPages],
    [text.footer.contact, "/contact", FEATURES.contactPage],
    [text.nav.about, "/about", FEATURES.aboutPage],
    [text.nav.faq, "/faq", FEATURES.faqPage],
  ];
  return (
    <footer className="bg-footer px-5 py-12 text-paper">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 md:flex-row md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-2xl font-extrabold">
            <svg width="22" height="26" viewBox="0 0 24 28" aria-hidden="true">
              <path d="M3 1h18v26l-9-7-9 7z" fill="var(--c-accent)" />
            </svg>
            Spotted
          </p>
          <p className="mt-2 text-mist">{text.footer.tagline}</p>
          <p className="mb-3 mt-6 text-sm font-bold text-mist">{text.footer.follow}</p>
          <SocialButtons />
          {CONTACT.emailLive && (
            <a href={`mailto:${CONTACT.email}`} className="mt-4 inline-flex min-h-11 items-center font-bold underline">
              {CONTACT.email}
            </a>
          )}
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10">
          {links
            .filter(([, , on]) => on)
            .map(([name, href]) => (
              <Link key={href} href={href} className="flex min-h-11 items-center font-bold hover:underline">
                {name}
              </Link>
            ))}
        </nav>
      </div>
    </footer>
  );
}
