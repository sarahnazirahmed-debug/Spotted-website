// The frame of a simple page in the new look: a maroon top (small tag, title, one line), then the page, the footer and the top bar.
// Used by About us, Contact and FAQs. The colours follow the light or dark theme (src/styles/colors.css).
import Footer from "../Footer";
import SiteChrome from "../SiteChrome";
import { FEATURES } from "@/config/features";

export default function DraftPage({ chip, title, lead, children }: { chip: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <div className="font-bar">
      <header className="bg-maroon px-5 pb-12 pt-28 text-cream md:pb-16 md:pt-36">
        <div className="mx-auto max-w-5xl">
          <span className="inline-block rounded-full border border-rose-line px-4 py-1 text-sm font-semibold">{chip}</span>
          <h1 className="mt-5 font-brand text-[clamp(2.2rem,7vw,3.8rem)] font-bold leading-[1.05]">{title}</h1>
          {lead && <p className="mt-5 max-w-xl text-lg leading-relaxed text-cream/90">{lead}</p>}
        </div>
      </header>
      <main>{children}</main>
      {FEATURES.footer && <Footer />}
      <SiteChrome alwaysVisible />
    </div>
  );
}
