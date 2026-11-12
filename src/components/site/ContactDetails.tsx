// The three contact details: questions email, complaints email and phone. They come from src/config/contactDetails.ts.
// While a detail is not live yet it is shown as plain text with a small "Placeholder" tag, and is not a link.
import { CONTACT_DETAILS, type ContactDetail } from "@/config/contactDetails";
import { text } from "@/content";

function Item({ label, detail, href }: { label: string; detail: ContactDetail; href: string }) {
  const t = text.contact;
  return (
    <div className="rounded-2xl border border-rosesoft bg-card p-6">
      <p className="text-sm font-bold text-mutedtext">{label}</p>
      <p className="mt-2 break-all font-brand text-xl font-bold text-maroonink">
        {detail.live ? (
          <a href={href} className="underline decoration-coral decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral">
            {detail.value}
          </a>
        ) : (
          detail.value
        )}
      </p>
      {!detail.live && <span className="mt-3 inline-block rounded-full border border-dashed border-rose-line px-3 py-0.5 text-xs font-bold text-mutedtext">{t.placeholder}</span>}
    </div>
  );
}

export default function ContactDetails() {
  const t = text.contact;
  const d = CONTACT_DETAILS;
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        <Item label={t.inquiry} detail={d.inquiryEmail} href={`mailto:${d.inquiryEmail.value}`} />
        <Item label={t.complaints} detail={d.complaintsEmail} href={`mailto:${d.complaintsEmail.value}`} />
        <Item label={t.phone} detail={d.phone} href={`tel:${d.phone.value.replace(/\s+/g, "")}`} />
      </div>
      {[d.inquiryEmail, d.complaintsEmail, d.phone].some((x) => !x.live) && <p className="mt-4 text-sm font-semibold text-mutedtext">{t.placeholderNote}</p>}
    </div>
  );
}
