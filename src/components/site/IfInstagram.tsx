"use client";

// Shows its content only when the Spotted Instagram address is set (Pin Desk > Website settings). Used around blocks
// that exist only to hold the Instagram button, so no empty heading or gap is left when there is no address yet.
// `also` keeps the block when something else in it should still show (for example the contact email).
import type { ReactNode } from "react";
import { LINKS } from "@/config/links";
import { useSiteSettings } from "@/lib/siteSettings";

export default function IfInstagram({ children, also = false }: { children: ReactNode; also?: boolean }) {
  const ig = useSiteSettings().instagram_url || LINKS.instagramUrl;
  return ig || also ? <>{children}</> : null;
}
