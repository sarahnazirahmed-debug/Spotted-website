// The reference code shown after an application is sent. It is MADE BY THE DATABASE (supabase/apply_reference_codes.sql); the website only shows it.
//   Partner (restaurant or shop) : 4 letters then 4 numbers   for example  QMTR4827
//   Insider (influencer)         : 6 letters then 6 numbers   for example  WXZKPL705314
// Letters first, then numbers. Never O or I (letters), never 0 or 1 (numbers).
export type ApplyKind = "insider" | "partner";

export const SHAPE: Record<ApplyKind, { letters: number; numbers: number; pattern: RegExp }> = {
  partner: { letters: 4, numbers: 4, pattern: /^[A-HJ-NP-Z]{4}[2-9]{4}$/ },
  insider: { letters: 6, numbers: 6, pattern: /^[A-HJ-NP-Z]{6}[2-9]{6}$/ },
};

export const isReferenceCode = (kind: ApplyKind, code: string) => SHAPE[kind].pattern.test(code);

// The letters and the numbers, to show them in two groups: "QMTR 4827".
export function splitCode(kind: ApplyKind, code: string): { letters: string; numbers: string } {
  const n = SHAPE[kind].letters;
  return { letters: code.slice(0, n), numbers: code.slice(n) };
}

// The note under the code.
export const CODE_NOTE = "Reference number for now. It becomes your active code once the team approves you.";

// Is this the answer of a database that does not have the code functions yet (apply_reference_codes.sql not run)?
export const isMissingFunction = (error: { code?: string; message?: string } | null) =>
  !!error && (error.code === "PGRST202" || error.code === "42883" || /could not find the function|does not exist/i.test(error.message ?? ""));
