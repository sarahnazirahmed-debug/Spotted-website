// The /about page: the story of Spotted, made in the UAE, how to reach us.
import SiteChrome from "../SiteChrome";
import Footer from "../Footer";
import PageHeader from "./PageHeader";
import { H2, P, Prose } from "./Prose";
import { CONTACT, FEATURES } from "@/config/features";

export default function AboutPage() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const btn =
    "flex min-h-12 items-center justify-center rounded-full px-7 text-base font-extrabold transition active:scale-95";
  return (
    <>
      <PageHeader chip="About" title="The story of Spotted." lead="Made in the UAE, for everyone who saves places and forgets them." />
      <main className="bg-page">
        <Prose>
          <H2>Why we made it</H2>
          <P>
            People save dozens of restaurants, cafés, shops and things to do from Instagram reels, then forget about them. When
            they are actually nearby, they do not remember.
          </P>
          <H2>What Spotted does</H2>
          <P>
            Spotted lets you share a reel straight to the app, confirm which place it is, and then get a gentle phone notification
            when you are close to that place.
          </P>
          <H2>Made in the UAE</H2>
          <P>
            Spotted is made in the UAE and launches in Khalifa City, Abu Dhabi. It works wherever you are, and it is built for
            people who love finding new places to eat, shop and play.
          </P>
          <H2>Say hello</H2>
          <P>We would love to hear from you.</P>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${btn} bg-[#25D366] text-deep`}
              >
                Chat on WhatsApp
              </a>
            )}
            {CONTACT.emailLive && (
              <a href={`mailto:${CONTACT.email}`} className={`${btn} bg-brand text-white`}>
                {CONTACT.email}
              </a>
            )}
          </div>
        </Prose>
      </main>
      {FEATURES.footer && <Footer />}
      <SiteChrome alwaysVisible />
    </>
  );
}
