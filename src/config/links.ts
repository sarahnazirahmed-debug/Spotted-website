// Where the WhatsApp and Instagram buttons go. The values come from .env.local (and Cloudflare's build
// variables), so they are never typed into the code. A button with no value is simply not shown.
export const LINKS = {
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "", // digits only, with country code
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "", // for example https://www.instagram.com/yourname
};

export const whatsappUrl = (message?: string) =>
  LINKS.whatsappNumber ? `https://wa.me/${LINKS.whatsappNumber}${message ? `?text=${encodeURIComponent(message)}` : ""}` : "";
