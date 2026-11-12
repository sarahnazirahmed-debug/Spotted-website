// The Insider application, in 7 steps. Plain functions: the rules of each step, and the payload that is sent.
// The DATABASE checks everything again (supabase/apply_insider_form.sql); these only give friendly messages first.
import { cleanHandle, handleOk } from "./businessRules.ts";
import { checkEmail } from "./emailCheck.ts";
import { ageFromDob, EMIRATES, isAdult, isLink } from "./applyRules.ts";
import { isPhone } from "./signupRules.ts";

export { EMIRATES };
export const STEPS = ["joining", "type", "details", "emails", "phones", "social", "documents"] as const;
export type StepId = (typeof STEPS)[number];

export type Gender = "female" | "male" | "none";
export type Account = { link: string; handle: string };
export type Values = {
  joinType: "regular" | "founding"; inviteCode: string;
  type: "" | "solo" | "agency";
  firstName: string; middleName: string; lastName: string; gender: Gender; dob: string; emirate: string;
  companyName: string; contactFirst: string; contactLast: string; contactDob: string; // country is always UAE, locked
  email: string; personalEmail: string; backupEmail: string;
  phone: string; whatsapp: string; sameAsPhone: boolean; backupPhone: string; landline: string;
  accounts: Account[]; tiktok: string; youtube: string; snapchat: string; otherName: string; otherLink: string;
  // what was really verified with a code: the address or number itself, so changing it cancels the tick
  verified: { email: string; personalEmail: string; backupEmail: string; phone: string; whatsapp: string };
  accepted: { terms: boolean; privacy: boolean; confidentiality: boolean };
};

export const COUNTRY = "UAE"; // locked
export const MAX_SOLO_ACCOUNTS = 1;
export const MAX_AGENCY_ACCOUNTS = 10;

export const emptyValues = (): Values => ({
  joinType: "regular", inviteCode: "", type: "",
  firstName: "", middleName: "", lastName: "", gender: "none", dob: "", emirate: "",
  companyName: "", contactFirst: "", contactLast: "", contactDob: "",
  email: "", personalEmail: "", backupEmail: "",
  phone: "", whatsapp: "", sameAsPhone: false, backupPhone: "", landline: "",
  accounts: [{ link: "", handle: "" }], tiktok: "", youtube: "", snapchat: "", otherName: "", otherLink: "",
  verified: { email: "", personalEmail: "", backupEmail: "", phone: "", whatsapp: "" },
  accepted: { terms: false, privacy: false, confidentiality: false },
});

export const normEmail = (s: string) => s.trim().toLowerCase();
export const normPhone = (s: string) => s.replace(/[^\d+]/g, "");
export const emailVerified = (v: Values, k: "email" | "personalEmail" | "backupEmail") => v[k].trim() !== "" && normEmail(v.verified[k]) === normEmail(v[k]);
export const phoneVerified = (v: Values, k: "phone" | "whatsapp") => v[k].trim() !== "" && normPhone(v.verified[k]) === normPhone(v[k]);
// With "same as my phone" the WhatsApp number IS the phone number (free, nothing more to verify).
export const whatsappNumber = (v: Values) => (v.sameAsPhone ? v.phone : v.whatsapp);

// FREE phone check (no SMS): the person sends Spotted a WhatsApp message FROM their own number. The message says the number they
// typed, so the team can match it to the sender. Nothing is sent by us, and nothing is saved from the message here.
export const whatsappCheckMessage = (v: Values) =>
  `Hi Spotted, I am applying as an Insider. Please confirm my number: ${whatsappNumber(v).trim() || v.phone.trim()}`;

// SMS codes cost money (a provider is needed). While SMS is OFF in features.ts the phone is not required to be verified.
export type Context = { today?: Date; smsOn?: boolean };

const blank = (s: string) => s.trim() === "";
const need = (s: string, msg: string) => (blank(s) ? msg : null);

// Account rules: Instagram needs a profile link AND a handle. Solo: one account. Agency: several.
export const accountFilled = (a: Account) => !blank(a.link) || !blank(a.handle);
export function accountProblem(a: Account): string | null {
  if (!isLink(a.link)) return "Please add the Instagram profile link (it starts with https://).";
  if (!handleOk(cleanHandle(a.handle))) return "Please add the Instagram handle (letters, numbers, dots and underscores).";
  return null;
}
export const filledAccounts = (v: Values) => v.accounts.filter(accountFilled);
export const hasTikTok = (v: Values) => handleOk(cleanHandle(v.tiktok));

// The first problem in a step, or null when the step is fine.
export function stepProblem(step: StepId, v: Values, ctx: Context = {}): string | null {
  const today = ctx.today ?? new Date();
  switch (step) {
    case "joining":
      return v.joinType === "founding" ? need(v.inviteCode, "Please type your invite code.") : null;
    case "type":
      return v.type === "" ? "Please choose: solo creator, or marketing agency or company." : null;
    case "details": {
      if (v.type === "solo") {
        return need(v.firstName, "Please type your first name.") ?? need(v.lastName, "Please type your last name.") ??
          (!isAdult(v.dob, today) ? (ageFromDob(v.dob, today) === null ? "Please choose your date of birth." : "You must be 18 or over to apply.") : null) ??
          (EMIRATES.includes(v.emirate) ? null : "Please choose your emirate.");
      }
      return need(v.companyName, "Please type the company name.") ?? (EMIRATES.includes(v.emirate) ? null : "Please choose the emirate.") ??
        need(v.contactFirst, "Please type the contact person's first name.") ?? need(v.contactLast, "Please type the contact person's last name.") ??
        (!isAdult(v.contactDob, today) ? (ageFromDob(v.contactDob, today) === null ? "Please choose the contact person's date of birth." : "The contact person must be 18 or over.") : null);
    }
    case "emails": {
      const biz = checkEmail(v.email);
      if (blank(v.email) || !biz.ok) return biz.problem ?? (biz.suggestion ? "Please check the business email." : "Please type the business email.");
      if (!emailVerified(v, "email")) return "Please verify the business email with the code we send you.";
      for (const [k, label] of [["personalEmail", "personal"], ["backupEmail", "backup"]] as const) {
        if (!blank(v[k]) && !checkEmail(v[k]).ok) return `The ${label} email does not look right.`;
      }
      return null;
    }
    case "phones": {
      if (!isPhone(v.phone)) return "Please type your phone number.";
      if (ctx.smsOn && !phoneVerified(v, "phone")) return "Please verify your phone with the code we send you.";
      if (!v.sameAsPhone) {
        if (!isPhone(v.whatsapp)) return "Please type your WhatsApp number, or tick that it is the same as your phone.";
        if (ctx.smsOn && !phoneVerified(v, "whatsapp")) return "Please verify your WhatsApp number.";
      }
      if (!blank(v.backupPhone) && !isPhone(v.backupPhone)) return "The backup phone does not look right.";
      if (!blank(v.landline) && !isPhone(v.landline)) return "The landline does not look right.";
      return null;
    }
    case "social": {
      const accounts = filledAccounts(v);
      for (const a of accounts) {
        const p = accountProblem(a);
        if (p) return p;
      }
      if (accounts.length === 0 && !hasTikTok(v)) return "Please add at least one account: Instagram (link and handle) or TikTok (handle).";
      if (!blank(v.tiktok) && !hasTikTok(v)) return "The TikTok handle does not look right.";
      if (v.type === "solo" && accounts.length > MAX_SOLO_ACCOUNTS) return "A solo creator adds one Instagram account.";
      if (accounts.length > MAX_AGENCY_ACCOUNTS) return `You can add up to ${MAX_AGENCY_ACCOUNTS} Instagram accounts.`;
      if (!blank(v.youtube) && !isLink(v.youtube)) return "The YouTube link does not look right (it starts with https://).";
      if (blank(v.otherName) !== blank(v.otherLink)) return "For another platform, add both its name and its link.";
      if (!blank(v.otherLink) && !isLink(v.otherLink)) return "The other platform's link does not look right.";
      return null;
    }
    case "documents":
      return null; // the files are checked where they are chosen (see pdfProblem in applyRules.ts)
  }
}

// The first step that has a problem (used before sending), or null.
export function firstBadStep(v: Values, ctx: Context = {}): StepId | null {
  return STEPS.find((s) => stepProblem(s, v, ctx) !== null) ?? null;
}

// The seven cards of the final screen: a title and the lines to show.
export function summary(v: Values, files: { permit: string; licence: string }): { step: StepId; title: string; lines: string[] }[] {
  const full = [v.firstName, v.middleName, v.lastName].filter((s) => s.trim()).join(" ");
  const phoneLine = (label: string, value: string, ok: boolean) => (value.trim() ? `${label}: ${value.trim()}${ok ? " (verified)" : ""}` : "");
  const cards: { step: StepId; title: string; lines: string[] }[] = [
    { step: "joining", title: "Joining", lines: [v.joinType === "founding" ? "Founding Insider (by invitation)" : "Regular Insider"] },
    { step: "type", title: "Type", lines: [v.type === "agency" ? "Marketing agency or company" : v.type === "solo" ? "Solo creator" : ""] },
    {
      step: "details", title: "Details",
      lines: v.type === "agency"
        ? [v.companyName, `${COUNTRY}, ${v.emirate}`, `Contact: ${v.contactFirst} ${v.contactLast}`]
        : [full, v.gender === "female" ? "Female" : v.gender === "male" ? "Male" : "Prefers not to say", `Born ${v.dob}`, `${v.emirate}`],
    },
    {
      step: "emails", title: "Emails",
      lines: [`Business: ${v.email.trim()}${emailVerified(v, "email") ? " (verified)" : ""}`, v.personalEmail.trim() ? `Personal: ${v.personalEmail.trim()}` : "", v.backupEmail.trim() ? `Backup: ${v.backupEmail.trim()}` : ""],
    },
    {
      step: "phones", title: "Phone numbers",
      lines: [phoneLine("Phone", v.phone, phoneVerified(v, "phone")), v.sameAsPhone ? "WhatsApp: same as phone" : phoneLine("WhatsApp", v.whatsapp, phoneVerified(v, "whatsapp")), phoneLine("Backup phone", v.backupPhone, false), phoneLine("Landline", v.landline, false)],
    },
    {
      step: "social", title: "Social accounts",
      lines: [...filledAccounts(v).map((a) => `Instagram: @${cleanHandle(a.handle)}`), v.tiktok.trim() ? `TikTok: @${cleanHandle(v.tiktok)}` : "", v.youtube.trim() ? "YouTube added" : "", v.snapchat.trim() ? `Snapchat: ${v.snapchat.trim()}` : "", v.otherName.trim() ? `${v.otherName.trim()} added` : ""],
    },
    { step: "documents", title: "Documents", lines: [files.permit ? `Advertiser Permit: ${files.permit}` : "Advertiser Permit: missing", files.licence ? `Trade licence: ${files.licence}` : v.type === "agency" ? "Trade licence: missing" : "Trade licence: not added"] },
  ];
  return cards.map((c) => ({ ...c, lines: c.lines.filter((l) => l.trim() !== "") }));
}

// What is sent to the database function submit_insider_application.
export function buildPayload(v: Values, paths: { permit?: string; licence?: string }, smsOn: boolean) {
  const agency = v.type === "agency";
  return {
    applicant_type: v.type, join_type: v.joinType, invite_code: v.inviteCode.trim(),
    first_name: v.firstName.trim(), middle_name: v.middleName.trim(), last_name: v.lastName.trim(), gender: v.gender, date_of_birth: v.dob,
    company_name: v.companyName.trim(), country: COUNTRY, emirate: v.emirate,
    contact_first_name: v.contactFirst.trim(), contact_last_name: v.contactLast.trim(), contact_dob: v.contactDob,
    email: normEmail(v.email), personal_email: normEmail(v.personalEmail), backup_email: normEmail(v.backupEmail),
    email_verified: emailVerified(v, "email"), personal_email_verified: emailVerified(v, "personalEmail"), backup_email_verified: emailVerified(v, "backupEmail"),
    phone: v.phone.trim(), whatsapp: whatsappNumber(v).trim(), whatsapp_same_as_phone: v.sameAsPhone, backup_phone: v.backupPhone.trim(), landline: v.landline.trim(),
    phone_verified: smsOn && phoneVerified(v, "phone"), whatsapp_verified: v.sameAsPhone ? smsOn && phoneVerified(v, "phone") : smsOn && phoneVerified(v, "whatsapp"),
    instagram_accounts: filledAccounts(v).slice(0, agency ? MAX_AGENCY_ACCOUNTS : MAX_SOLO_ACCOUNTS).map((a) => ({ link: a.link.trim(), handle: cleanHandle(a.handle) })),
    tiktok: hasTikTok(v) ? cleanHandle(v.tiktok) : "", youtube_link: v.youtube.trim(), snapchat: v.snapchat.trim().replace(/^@+/, ""),
    other_platform_name: v.otherName.trim(), other_platform_link: v.otherLink.trim(),
    advertiser_permit_path: paths.permit ?? "", trade_licence_path: paths.licence ?? "",
    accepted_terms: v.accepted.terms, accepted_privacy: v.accepted.privacy, accepted_confidentiality: v.accepted.confidentiality,
  };
}
