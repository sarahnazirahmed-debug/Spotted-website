// A WhatsApp message button. Used in place of a waitlist form while the waitlists are OFF
// (see features.ts), and for contact. The message is already written; the visitor just sends it.
export default function ContactCta({ text, label = "Message us on WhatsApp" }: { text: string; label?: string }) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  if (!number) return null;
  return (
    <a
      href={`https://wa.me/${number}?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-12 w-fit items-center justify-center rounded-full bg-[#25D366] px-7 text-base font-extrabold text-deep transition active:scale-95"
    >
      {label}
    </a>
  );
}
