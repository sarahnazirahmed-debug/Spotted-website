"use client";

// Loads who is logged in on a dashboard: are they an approved member, of the right kind, with access switched on?
// States:  loading, closed (Supabase not connected), loggedOut, notMember, ended (free period over, no payment), ready.
// A member of the other kind is sent to their own dashboard.
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import { dashboardPath, type MemberKind } from "@/lib/memberRules";

export type Numbers = {
  kind: MemberKind; green_stars: number; yellow_stars: number; saves: number; paid_until: string | null;
  reels_added?: number; amount_range?: string; items?: number; offers_live?: number;
};
export type MemberState = "loading" | "closed" | "loggedOut" | "notMember" | "ended" | "ready";

export function useMember(kind: MemberKind) {
  const router = useRouter();
  const [state, setState] = useState<MemberState>("loading");
  const [numbers, setNumbers] = useState<Numbers | null>(null);
  const [supabase] = useState<SupabaseClient | null>(() => getSupabase());

  // asks the database; returns what to show
  const fetchState = useCallback(async (): Promise<{ state: MemberState; numbers: Numbers | null; goTo?: string }> => {
    if (!supabase) return { state: "closed", numbers: null };
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) return { state: "loggedOut", numbers: null };
    const { data } = await supabase.rpc("my_access");
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { state: "notMember", numbers: null };
    if (row.kind !== kind) return { state: "loading", numbers: null, goTo: dashboardPath(row.kind) };
    if (!row.access_ok) return { state: "ended", numbers: null };
    const { data: n } = await supabase.rpc("my_numbers");
    return n ? { state: "ready", numbers: n as Numbers } : { state: "ended", numbers: null };
  }, [supabase, kind]);

  const apply = useCallback(
    (r: { state: MemberState; numbers: Numbers | null; goTo?: string }) => {
      if (r.goTo) return router.replace(r.goTo);
      setState(r.state);
      setNumbers(r.numbers);
    },
    [router],
  );
  const reload = useCallback(async () => apply(await fetchState()), [apply, fetchState]);

  useEffect(() => {
    let dead = false;
    void fetchState().then((r) => {
      if (!dead) apply(r);
    });
    return () => {
      dead = true;
    };
  }, [fetchState, apply]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    router.push("/login");
  }, [supabase, router]);

  return { state, numbers, supabase, reload, signOut };
}
