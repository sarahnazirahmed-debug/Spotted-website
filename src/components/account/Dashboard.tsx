"use client";

// The partner dashboard (restaurants, shops, influencers). For now it only greets the partner and
// shows their trial; the real dashboard (places, offers, media, stars) comes next.
// Anyone who is not a partner is told that Spotted works in the app.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

type Partner = { business_name: string; kind: string; status: string; trial_started_at: string };
type View = "loading" | "partner" | "notPartner" | "loggedOut" | "closed";

export default function Dashboard() {
  const router = useRouter();
  const [view, setView] = useState<View>("loading");
  const [partner, setPartner] = useState<Partner | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      queueMicrotask(() => setView("closed"));
      return;
    }
    let dead = false;
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (dead) return;
      if (!s.session) return setView("loggedOut");
      const { data } = await supabase.from("partner_accounts").select("business_name, kind, status, trial_started_at").maybeSingle();
      if (dead) return;
      if (data) {
        setPartner(data as Partner);
        setView("partner");
      } else setView("notPartner");
    })();
    return () => {
      dead = true;
    };
  }, []);

  async function signOut() {
    await getSupabase()?.auth.signOut();
    router.push("/login");
  }

  const box = "mx-auto max-w-lg rounded-3xl bg-brand p-8 text-center text-white md:p-10";
  const link = "mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 font-extrabold text-deep";

  if (view === "loading") return <div className={box}>Loading...</div>;
  if (view === "closed") return <div className={box}>Log in is not open yet. Please check back soon.</div>;
  if (view === "loggedOut")
    return (
      <div className={box}>
        <h2 className="text-2xl font-extrabold">Please log in.</h2>
        <a href="/login" className={link}>
          Log in
        </a>
      </div>
    );
  if (view === "notPartner")
    return (
      <div className={box}>
        <h2 className="text-2xl font-extrabold">Spotted works in the app.</h2>
        <p className="mt-3 text-lilac">This page is for restaurants, shops and creators.</p>
        <button type="button" onClick={signOut} className={link}>
          Log out
        </button>
      </div>
    );
  const trialEnds = partner ? new Date(new Date(partner.trial_started_at).getTime() + 61 * 864e5) : null;
  return (
    <div className={box}>
      <h2 className="text-[clamp(1.6rem,5vw,2.4rem)] font-extrabold leading-tight">Welcome, {partner?.business_name}.</h2>
      <p className="mt-3 text-lg text-lilac">Your dashboard is coming soon.</p>
      {partner?.status === "trial" && trialEnds && (
        <p className="mt-4 rounded-2xl bg-white/15 p-4 font-bold">
          Your 2 free months run until about {trialEnds.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}. Your data
          is saved, even if you continue later.
        </p>
      )}
      <button type="button" onClick={signOut} className={link}>
        Log out
      </button>
    </div>
  );
}
