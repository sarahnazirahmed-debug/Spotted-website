"use client";

// The frame around every /admin page: sends visitors to /login, the "not on the team" message, the first-visit
// confidentiality tick box, and the top menu (Pin Desk, Team if allowed, Sign out).
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminTabs } from "@/lib/adminTabs";
import { titleFor } from "@/lib/pindeskTitle";
import { ROLE_LABEL } from "@/lib/teamRules";
import { useAdmin } from "./AdminProvider";

function Confidential() {
  const { agree, signOut } = useAdmin();
  const [ticked, setTicked] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      <h1 className="text-3xl font-extrabold text-heading">Before you start</h1>
      <div className="mt-6 rounded-3xl bg-panel p-6 text-onpanel">
        <ul className="grid list-disc gap-2 pl-5 text-lg">
          <li>I will only store links and place facts.</li>
          <li>I will keep everything on the Pin Desk confidential.</li>
          <li>I will not store anything about app users.</li>
        </ul>
        <label className="mt-6 flex min-h-11 cursor-pointer items-start gap-3 font-bold">
          <input type="checkbox" checked={ticked} onChange={(e) => setTicked(e.target.checked)} className="mt-1 size-6 accent-[var(--c-accent)]" />
          I agree to all of this.
        </label>
        <button
          type="button"
          disabled={!ticked}
          onClick={async () => setMessage((await agree()) ?? "")}
          className="mt-6 min-h-12 w-full rounded-full bg-accent px-7 font-extrabold text-onaccent disabled:opacity-40"
        >
          Continue
        </button>
        {message && <p role="alert" className="mt-3 text-sm font-bold">{message}</p>}
      </div>
      <button type="button" onClick={signOut} className="mt-4 min-h-11 font-bold underline">
        Sign out
      </button>
    </div>
  );
}

export default function AdminFrame({ children }: { children: React.ReactNode }) {
  const { status, me, signOut } = useAdmin();
  const path = usePathname();
  const router = useRouter();

  // Not logged in? There is only ONE place to log in: /login. Typing an /admin address sends you there.
  useEffect(() => {
    if (status === "loggedOut") router.replace("/login");
  }, [status, router]);

  if (status === "checking" || status === "loggedOut") return <p className="mx-auto max-w-md px-5 py-20 text-lg">Loading...</p>;
  if (status === "closed")
    return <p className="mx-auto max-w-md px-5 py-20 text-lg">Log in is not open yet. Supabase is not connected.</p>;
  if (status === "notMember" || !me)
    return (
      <div className="mx-auto max-w-md px-5 py-20">
        <h1 className="text-3xl font-extrabold text-heading">Not on the team</h1>
        <p className="mt-3 text-lg">This email is not on the Spotted team, so there is nothing for you here.</p>
        <button type="button" onClick={signOut} className="mt-6 min-h-12 rounded-full bg-accent px-7 font-extrabold text-onaccent">
          Sign out
        </button>
      </div>
    );
  if (!me.agreed) return <Confidential />;

  // "Pin Desk" is the home page and every Pin Desk screen under it (everything except Dashboard and Team)
  const tabs = adminTabs(me.role);
  const inPinDesk = !path.startsWith("/admin/dashboard") && !path.startsWith("/admin/team") && !path.startsWith("/admin/applications");
  const tab = (href: string, text: string, active = path === href) => (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center rounded-full px-5 font-extrabold ${active ? "bg-accent text-onaccent" : "text-heading hover:underline"}`}
    >
      {text}
    </Link>
  );
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-page/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2">
          <span className="mr-2 text-xl font-extrabold text-heading">Spotted team</span>
          <nav aria-label="Admin" className="flex flex-wrap items-center gap-1">
            {tabs.includes("pin") && tab("/admin", "Pin Desk", inPinDesk)}
            {tabs.includes("dashboard") && tab("/admin/dashboard", "Dashboard")}
            {tabs.includes("applications") && tab("/admin/applications", "Applications")}
            {tabs.includes("team") && tab("/admin/team", "Team")}
          </nav>
          <span className="ml-auto text-sm font-bold">
            {me.name} ({titleFor(me.name, ROLE_LABEL[me.role])})
          </span>
          <button type="button" onClick={signOut} className="min-h-11 rounded-full border-2 border-line px-5 font-extrabold text-heading">
            Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </>
  );
}
