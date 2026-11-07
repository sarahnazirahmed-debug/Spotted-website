// The checks for the Apply page (Insider and Partner). Plain functions, so they can be tested.
// The DATABASE checks everything again (supabase/applications.sql): these only give a friendly message before sending.
import { cleanHandle, emailOk, handleOk } from "./businessRules.ts";
import { isPhone } from "./signupRules.ts";

export type ApplyKind = "insider" | "partner";
export const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB

export const EMIRATES = ["Abu Dhabi", "Dubai", "Sharjah", "Ajman", "Umm Al Quwain", "Ras Al Khaimah", "Fujairah"];
// Anything food or drink is a Restaurant (it needs a food permit); everything else is a Shop.
export const BUSINESS_TYPES = ["Restaurant", "Cafe", "Cafeteria", "Bakery", "Sweets", "Cloud or home kitchen", "Shop"];
export const isFoodType = (t: string) => t !== "" && t !== "Shop";

// The age, worked out from the date of birth ("YYYY-MM-DD"). null when the date is not a real date.
export function ageFromDob(dob: string, today: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null;
  let age = today.getUTCFullYear() - y;
  if (today.getUTCMonth() + 1 < mo || (today.getUTCMonth() + 1 === mo && today.getUTCDate() < d)) age -= 1;
  return age;
}
export const isAdult = (dob: string, today: Date = new Date()) => {
  const a = ageFromDob(dob, today);
  return a !== null && a >= 18;
};

// A handle ready to save: "@Name" -> "name" ("" when nothing was typed)
export const cleanHandleOrEmpty = (raw: string) => (raw.trim() ? cleanHandle(raw) : "");

export const isLink = (v: string) => /^https?:\/\/[^\s/]+\.[^\s]{2,}$/i.test(v.trim());

// A PDF file: the name, the type, the size, and the first bytes (a real PDF starts with "%PDF").
export function pdfProblem(file: { name: string; type: string; size: number }, head: Uint8Array | null): string | null {
  if (file.size > MAX_PDF_BYTES) return "That file is bigger than 5 MB. Please send a smaller PDF.";
  if (file.size === 0) return "That file is empty.";
  const looksPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const startsPdf = head !== null && head.length >= 4 && head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46;
  if (!looksPdf || (head !== null && !startsPdf)) return "Only PDF files are allowed.";
  return null;
}

// Where an upload goes in the private bucket: pending/<random id>/<permit | licence | food-permit>.pdf
export const pdfPath = (uploadId: string, name: "permit" | "licence" | "food-permit") => `pending/${uploadId}/${name}.pdf`;

export type InsiderValues = {
  joinType: "regular" | "founding"; inviteCode: string; fullName: string; dob: string; email: string; phone: string;
  profileLink: string; instagram: string; tiktok: string; youtube: string; snapchat: string; otherName: string; otherLink: string;
  hasPermit: boolean;
};
export type PartnerValues = {
  businessName: string; businessType: string; ownerName: string; email: string; phone: string; instagram: string; website: string;
  emirate: string; branches: string; hasLicence: boolean; hasFoodPermit: boolean;
};

// The first problem in an Insider form, or null when it is fine.
export function insiderProblem(v: InsiderValues, today: Date = new Date()): string | null {
  if (v.joinType === "founding" && !v.inviteCode.trim()) return "Please type your invite code.";
  if (!v.fullName.trim()) return "Please tell us your full name.";
  if (!v.dob) return "Please enter your date of birth.";
  if (!isAdult(v.dob, today)) return ageFromDob(v.dob, today) === null ? "Please enter a real date of birth." : "You must be 18 or over to apply.";
  if (!emailOk(v.email.trim())) return "Please enter a valid business email.";
  if (!isPhone(v.phone.trim())) return "Please check your phone or WhatsApp number.";
  if (!isLink(v.profileLink)) return "Please add the link to your main profile (it starts with https://).";
  if (!v.instagram.trim() && !v.tiktok.trim()) return "Please add your Instagram or TikTok handle.";
  if (v.instagram.trim() && !handleOk(cleanHandle(v.instagram))) return "Please check your Instagram handle.";
  if (v.tiktok.trim() && !handleOk(cleanHandle(v.tiktok))) return "Please check your TikTok handle.";
  if (v.youtube.trim() && !isLink(v.youtube)) return "Please check the YouTube channel link (it starts with https://).";
  if (Boolean(v.otherName.trim()) !== Boolean(v.otherLink.trim())) return "For another platform, please add both the name and the link.";
  if (v.otherLink.trim() && !isLink(v.otherLink)) return "Please check the other platform link (it starts with https://).";
  if (!v.hasPermit) return "Please upload your UAE Advertiser Permit (PDF).";
  return null;
}

export function partnerProblem(v: PartnerValues): string | null {
  if (!v.businessName.trim()) return "Please enter the business name.";
  if (!BUSINESS_TYPES.includes(v.businessType)) return "Please choose what kind of business you are.";
  if (!v.ownerName.trim()) return "Please tell us the owner or manager name.";
  if (!emailOk(v.email.trim())) return "Please enter a valid contact email.";
  if (!isPhone(v.phone.trim())) return "Please check your phone or WhatsApp number.";
  if (!handleOk(cleanHandle(v.instagram))) return "Please add the business Instagram handle.";
  if (v.website.trim() && !isLink(v.website)) return "Please check the website link (it starts with https://).";
  if (!EMIRATES.includes(v.emirate)) return "Please choose the emirate.";
  const n = Number(v.branches);
  if (!Number.isInteger(n) || n < 1 || n > 500) return "Please enter the number of branches (1 or more).";
  if (!v.hasLicence) return "Please upload your UAE trade licence (PDF).";
  if (isFoodType(v.businessType) && !v.hasFoodPermit) return "Please upload your food permit (PDF). It is required for food and drink businesses.";
  return null;
}
