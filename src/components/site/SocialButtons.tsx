"use client";

// The Instagram button (a round icon: our own simple camera drawing) that opens the Spotted Instagram page.
// There is no big WhatsApp button any more: the only WhatsApp button on the site is the small round one in the
// bottom-right corner (src/components/WhatsApp.tsx). The address comes from the Pin Desk (Website settings);
// the .env.local value is only the backup. With no address, nothing is shown.
import { LINKS } from "@/config/links";
import { useSiteSettings } from "@/lib/siteSettings";
import { Icon } from "./Icons";

export default function SocialButtons({ className = "" }: { className?: string }) {
  const ig = useSiteSettings().instagram_url || LINKS.instagramUrl;
  if (!ig) return null;
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <a
        href={ig}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Spotted on Instagram"
        title="Spotted on Instagram"
        className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-line text-heading transition active:scale-95"
      >
        <Icon name="instagram" size={24} />
      </a>
    </div>
  );
}
