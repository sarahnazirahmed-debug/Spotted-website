// WhatsApp and Instagram buttons. A button with no link (not set in .env.local) is not shown.
// WhatsApp is a word button. Instagram is a round icon button (a simple camera drawing) that opens the Spotted Instagram page.
import { LINKS, whatsappUrl } from "@/config/links";
import { text } from "@/content";
import { Icon } from "./Icons";

// instagram={false}: show only the WhatsApp button.
export default function SocialButtons({ message, className = "", instagram = true }: { message?: string; className?: string; instagram?: boolean }) {
  const wa = whatsappUrl(message);
  const ig = instagram ? LINKS.instagramUrl : "";
  if (!wa && !ig) return null;
  const base = "inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-base font-extrabold transition active:scale-95";
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      {wa && (
        <a href={wa} target="_blank" rel="noopener noreferrer" className={`${base} bg-whatsapp text-charcoal`}>
          {text.common.whatsapp}
          <Icon name="arrow" size={18} />
        </a>
      )}
      {ig && (
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
      )}
    </div>
  );
}
