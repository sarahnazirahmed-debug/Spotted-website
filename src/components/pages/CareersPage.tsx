// The /careers page: we are not hiring yet; leave an email for future roles.
import SiteChrome from "../SiteChrome";
import Footer from "../Footer";
import PageHeader from "./PageHeader";
import Waitlist from "../Waitlist";
import ContactCta from "../ContactCta";
import { FEATURES } from "@/config/features";

export default function CareersPage() {
  return (
    <>
      <PageHeader
        chip="Careers"
        title="We're not hiring yet."
        lead={FEATURES.waitlist ? "Leave your email for future roles." : "Message us to hear about future roles."}
      />
      <main className="bg-page px-5 py-20 text-onpage md:py-28">
        <div id="waitlist" className="mx-auto max-w-2xl rounded-3xl bg-brand p-8 text-white md:p-12">
          <h2 className="text-[clamp(1.8rem,6vw,3rem)] font-extrabold leading-tight">Tell us you are interested.</h2>
          {FEATURES.waitlist ? (
            <>
              <p className="mb-6 mt-3 text-lg text-lilac">We will email you when a role opens.</p>
              <Waitlist label="Leave my email" list="careers" />
            </>
          ) : (
            <>
              <p className="mb-6 mt-3 text-lg text-lilac">Message us on WhatsApp and we will tell you when a role opens.</p>
              <ContactCta text="Hi Spotted! Please tell me about future roles." label="Message us about future roles" />
            </>
          )}
        </div>
      </main>
      {FEATURES.footer && <Footer />}
      <SiteChrome alwaysVisible />
    </>
  );
}
