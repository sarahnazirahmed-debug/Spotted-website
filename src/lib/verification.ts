// Sending and checking the codes on the Insider form.
//   * EMAIL codes use Supabase's own email code (the same 6-digit codes as Log in). It is free, but a code to any address creates
//     a plain Supabase sign-in record for it, and we sign out straight away so nothing stays logged in.
//   * PHONE (SMS) codes need a paid SMS provider. They are OFF (`smsVerification` in features.ts) until Sarah chooses one.
//     WhatsApp "same as my phone" is free. A different WhatsApp number would be checked when the person messages Spotted.
import { getAdminSupabase } from "./adminSupabase";

export type CodeResult = { ok: boolean; message: string };

export async function sendEmailCode(email: string): Promise<CodeResult> {
  const supabase = getAdminSupabase(); // the "in memory" connection: nothing is saved on the computer
  if (!supabase) return { ok: false, message: "Codes are not open yet. Please check back soon." };
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
  return error ? { ok: false, message: "We could not send the code. Please check the email and try again." } : { ok: true, message: "We sent a code. Check your email." };
}

export async function checkEmailCode(email: string, code: string): Promise<CodeResult> {
  const supabase = getAdminSupabase();
  if (!supabase) return { ok: false, message: "Codes are not open yet. Please check back soon." };
  const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
  if (error || !data.session) return { ok: false, message: "That code did not work. Please check it, or ask for a new one." };
  await supabase.auth.signOut({ scope: "local" }); // we only wanted the proof; nobody stays logged in
  return { ok: true, message: "Verified." };
}

// SMS: not connected. (This is the one place to change when a provider is chosen.)
export async function sendPhoneCode(): Promise<CodeResult> {
  return { ok: false, message: "Phone codes are not open yet." };
}
export async function checkPhoneCode(): Promise<CodeResult> {
  return { ok: false, message: "Phone codes are not open yet." };
}
