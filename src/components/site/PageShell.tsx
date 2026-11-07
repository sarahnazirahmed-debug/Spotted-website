// The frame of every public page: header, content, footer, and the floating top bar / WhatsApp button.
import { FEATURES } from "@/config/features";
import Footer from "../Footer";
import SiteChrome from "../SiteChrome";
import PageHeader from "../pages/PageHeader";

export default function PageShell({
  chip,
  title,
  lead,
  headerExtra,
  aside,
  children,
}: {
  chip: string;
  title: string;
  lead?: string;
  headerExtra?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader chip={chip} title={title} lead={lead} aside={aside}>
        {headerExtra}
      </PageHeader>
      <main>{children}</main>
      {FEATURES.footer && <Footer />}
      <SiteChrome alwaysVisible />
    </>
  );
}

// A section with a heading, used by every page. `alt` swaps the background so sections alternate.
export function Section({ id, title, alt = false, children }: { id?: string; title?: string; alt?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={`${alt ? "bg-alt" : "bg-page"} px-5 py-16 text-onpage md:py-24`}>
      <div className="mx-auto max-w-5xl">
        {title && <h2 className="mb-8 text-[clamp(1.8rem,5vw,3rem)] font-extrabold leading-tight text-heading">{title}</h2>}
        {children}
      </div>
    </section>
  );
}
