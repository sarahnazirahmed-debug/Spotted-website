// WhatsApp and Instagram buttons. A button with no link (not set in .env.local) is not shown.
// No real Instagram or WhatsApp logos here: just words and a plain arrow.
import { LINKS, whatsappUrl } from "@/config/links";
import { text } from "@/content";
import { Icon } from "./Icons";

// instagram={false}: show only the WhatsApp button (the footer does this).
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
        <a href={ig} target="_blank" rel="noopener noreferrer" className={`${base} border-2 border-line text-heading`}>
          {text.common.instagram}
          <Icon name="arrow" size={18} />
        </a>
      )}
    </div>
  );
}
