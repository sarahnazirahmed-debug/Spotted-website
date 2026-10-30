// The footer: links to every page, contact, and the legal pages.
import Link from "next/link";
import { CONTACT, FEATURES } from "@/config/features";

export default function Footer() {
  const links: [string, string, boolean][] = [
    ["Restaurants", "/restaurants", FEATURES.businessPages],
    ["Shops", "/shops", FEATURES.businessPages],
    ["Influencers", "/influencers", FEATURES.influencersPage],
    ["Careers", "/careers", FEATURES.careersPage],
    ["About", "/about", FEATURES.aboutPage],
    ["Privacy", "/privacy", FEATURES.legalPages],
    ["Terms", "/terms", FEATURES.legalPages],
  ];
  return (
    <footer className="bg-footer px-5 py-12 text-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 md:flex-row md:justify-between">
        <div>
          <p className="flex items-center gap-2 text-2xl font-extrabold">
            <svg width="22" height="26" viewBox="0 0 24 28" aria-hidden="true">
              <path d="M3 1h18v26l-9-7-9 7z" fill="#E5383B" />
            </svg>
            Spotted
          </p>
          <p className="mt-2 text-lilac">Made in the UAE.</p>
          {CONTACT.emailLive && (
            <a href={`mailto:${CONTACT.email}`} className="mt-3 inline-flex min-h-11 items-center font-bold underline">
              {CONTACT.email}
            </a>
          )}
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 sm:grid-cols-3">
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
