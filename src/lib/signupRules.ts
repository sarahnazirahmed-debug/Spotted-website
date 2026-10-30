// Small checks for the sign-up form. Plain functions so they can be tested.

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// Phone / WhatsApp numbers: optional, digits with an optional + and spaces. At least 7 digits.
export const isPhone = (v: string) => /^\+?[0-9 ()-]+$/.test(v.trim()) && v.replace(/\D/g, "").length >= 7;

// The one-time code from the email (Supabase sends 6 to 8 digits).
export const isCode = (v: string) => /^[0-9]{6,8}$/.test(v.trim());

// Birthday is optional. If given it must be a real past date, and the person must be 13 or older
// (the privacy policy says Spotted is not designed for children under 13).
export function birthdayProblem(value: string, today = new Date()): string | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return "Please enter a real date.";
  if (d.getUTCFullYear() < 1900 || d > today) return "Please enter a real birthday.";
  const t = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  let age = t.getUTCFullYear() - d.getUTCFullYear();
  if (t.getUTCMonth() < d.getUTCMonth() || (t.getUTCMonth() === d.getUTCMonth() && t.getUTCDate() < d.getUTCDate())) age--;
  return age < 13 ? "Spotted is for people aged 13 and older." : null;
}
