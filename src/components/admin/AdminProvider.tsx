"use client";

// Keeps the /admin log-in for as long as the page stays open (it is NOT saved: reload = new code).
// It also asks the database who you are (whoami) and what your role is.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminSupabase } from "@/lib/adminSupabase";
import type { TeamRole } from "@/lib/teamRules";

export type Me = { role: TeamRole; name: string; email: string; agreed: boolean };
// "checking" = we are asking whether someone just logged in on the Log in page (/login).
export type AdminStatus = "closed" | "checking" | "loggedOut" | "notMember" | "ready";

type Ctx = {
  status: AdminStatus;
  me: Me | null;
  supabase: SupabaseClient | null;
  sendCode: (email: string) => Promise<string | null>; // returns a problem message, or null
  verify: (email: string, code: string) => Promise<string | null>;
  agree: () => Promise<string | null>;
  signOut: () => Promise<void>;
};
const AdminContext = createContext<Ctx | null>(null);

export function useAdmin(): Ctx {
  const c = useContext(AdminContext);
  if (!c) throw new Error("useAdmin must be used inside <AdminProvider>");
  return c;
}

export default function AdminProvider({ children }: { children: React.ReactNode }) {
  const supabase = getAdminSupabase();
  const [status, setStatus] = useState<AdminStatus>("checking");
  const [me, setMe] = useState<Me | null>(null);

  const loadMe = useCallback(async (): Promise<string | null> => {
    if (!supabase) return "Log in is not open yet.";
    const { data, error } = await supabase.rpc("whoami");
    if (error) return "Something went wrong. Please try again.";
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      setMe(null);
      setStatus("notMember");
      return null;
    }
    setMe({ role: row.role, name: row.name || row.email, email: row.email, agreed: !!row.agreed_confidentiality_at });
    setStatus("ready");
    return null;
  }, [supabase]);

  // The one Log in page (/login) logs the team in and then opens /admin. Pick that log-in up here.
  // If nobody is logged in, the status becomes "loggedOut" and the frame sends the visitor to /login.
  useEffect(() => {
    if (!supabase) return;
    let dead = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (dead) return;
      if (data.session) await loadMe();
      else setStatus("loggedOut");
    })();
    return () => {
      dead = true;
    };
  }, [supabase, loadMe]);

  const sendCode = useCallback(
    async (email: string) => {
      if (!supabase) return "Log in is not open yet.";
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
      return error ? "We could not send the code. Please check the email and try again." : null;
    },
    [supabase],
  );

  const verify = useCallback(
    async (email: string, code: string) => {
      if (!supabase) return "Log in is not open yet.";
      const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: "email" });
      if (error) return "That code did not work. Please check it, or ask for a new one.";
      return loadMe();
    },
    [supabase, loadMe],
  );

  const agree = useCallback(async () => {
    if (!supabase) return "Log in is not open yet.";
    const { error } = await supabase.rpc("agree_confidentiality");
    if (error) return "Something went wrong. Please try again.";
    return loadMe();
  }, [supabase, loadMe]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    setMe(null);
    setStatus("loggedOut");
  }, [supabase]);

  const value = useMemo<Ctx>(
    () => ({ status: supabase ? status : "closed", me, supabase, sendCode, verify, agree, signOut }),
    [status, me, supabase, sendCode, verify, agree, signOut],
  );
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}
