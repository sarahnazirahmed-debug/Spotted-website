// THE CONTACT DETAILS: change them HERE and nowhere else.
//
// For now these are PLACEHOLDERS (made-up values on addresses nobody owns). When the domain is bought and the mailboxes
// and phone line work:
//   1. type the real value,
//   2. change `live` to true.
// Then the About us page, the Contact page, the footer and the legal pages show it as a real link (mail or call).
// While `live` is false, the pages show the value as plain text with a small "Placeholder" tag, and nothing is a link.
export type ContactDetail = { value: string; live: boolean };

export const CONTACT_DETAILS: { complaintsEmail: ContactDetail; inquiryEmail: ContactDetail; phone: ContactDetail } = {
  complaintsEmail: { value: "complaints@example.com", live: false },
  inquiryEmail: { value: "hello@example.com", live: false },
  phone: { value: "+971 00 000 0000", live: false },
};
