"use client";

// The frame around every /admin page: log-in, the "not on the team" message, the first-visit
// confidentiality tick box, and the top menu (Pin Desk, Team if allowed, Sign out).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { canOpenDashboard } from "@/lib/dashboard/access";
import { canOpenTeam, ROLE_LABEL } from "@/lib/teamRules";
import AdminLogin from "./AdminLogin";
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

  if (status === "closed")
    return <p className="mx-auto max-w-md px-5 py-20 text-lg">Log in is not open yet. Supabase is not connected.</p>;
  if (status === "loggedOut") return <AdminLogin />;
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

  const tab = (href: string, text: string) => (
    <Link
      href={href}
      aria-current={path === href ? "page" : undefined}
      className={`flex min-h-11 items-center rounded-full px-5 font-extrabold ${path === href ? "bg-accent text-onaccent" : "text-heading hover:underline"}`}
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
            {tab("/admin/pin", "Pin Desk")}
            {canOpenDashboard(me.role) && tab("/admin/dashboard", "Dashboard")}
            {canOpenTeam(me.role) && tab("/admin/team", "Team")}
          </nav>
          <span className="ml-auto text-sm font-bold">
            {me.name} ({ROLE_LABEL[me.role]})
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
