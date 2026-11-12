"use client";

// The page around both dashboards: a maroon header with the title and the Log out button, the messages for
// "not logged in", "not approved" and "free period ended", the five number cards, and the footer.
import Link from "next/link";
import { FEATURES } from "@/config/features";
import { text } from "@/content";
import Footer from "../Footer";
import SiteChrome from "../SiteChrome";
import { Star } from "../creators/Stars";
import type { MemberState, Numbers } from "./useMember";

const t = text.dashboard;
export const card = "rounded-2xl border border-rosesoft bg-card p-5";
export const inputCls =
  "min-h-12 w-full rounded-xl border border-rosesoft bg-pagebase px-4 text-base text-darktext outline-none focus:border-maroonink focus:ring-4 focus:ring-coral/40";
export const labelCls = "mb-1 block text-sm font-semibold";
export const addButton =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-coral px-7 font-bar text-base font-bold text-oncoral transition active:scale-95 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon";
export const removeButton =
  "min-h-11 rounded-full border border-rosesoft px-4 font-bar text-sm font-bold text-maroonink hover:bg-pinktint focus-visible:outline-2 focus-visible:outline-coral";

export function StatCard({ label, value, note, star }: { label: string; value: React.ReactNode; note?: string; star?: "visit" | "sale" }) {
  return (
    <li className={card}>
      <p className="flex items-center gap-2 text-sm font-semibold text-mutedtext">
        {star && <Star kind={star} size={20} />}
        {label}
      </p>
      <p className="mt-2 font-brand text-3xl font-bold text-maroonink">{value}</p>
      {note && <p className="mt-1 text-xs font-semibold text-mutedtext">{note}</p>}
    </li>
  );
}

export function paidUntilText(n: Numbers | null): string | null {
  if (!n?.paid_until) return null;
  return t.paidUntil(new Date(n.paid_until).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));
}

export default function DashboardFrame({
  title, state, signOut, numbers, children,
}: { title: string; state: MemberState; signOut: () => void; numbers: Numbers | null; children?: React.ReactNode }) {
  const paid = paidUntilText(numbers);
  const message =
    state === "loading" ? t.loading
    : state === "closed" ? t.closed
    : state === "notMember" ? t.notMember
    : state === "ended" ? t.ended
    : null;
  return (
    <div className="font-bar">
      <header className="bg-maroon px-5 pb-10 pt-28 text-cream md:pt-32">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-brand text-[clamp(1.8rem,5vw,3rem)] font-bold leading-tight">{title}</h1>
            {paid && <p className="mt-2 text-sm font-semibold text-rose-line">{paid}</p>}
          </div>
          {(state === "ready" || state === "ended" || state === "notMember") && (
            <button
              type="button"
              onClick={signOut}
              className="min-h-11 rounded-full border border-rose-line px-6 font-bar text-sm font-semibold text-cream transition hover:border-coral hover:text-coral focus-visible:outline-2 focus-visible:outline-coral"
            >
              {t.logOut}
            </button>
          )}
        </div>
      </header>
      <main className="bg-pagebase px-5 py-10 text-darktext md:py-14">
        <div className="mx-auto max-w-5xl">
          {state === "loggedOut" && (
            <div className={card}>
              <p className="text-lg font-semibold">{t.pleaseLogIn}</p>
              <Link href="/login" className={`${addButton} mt-4`}>
                {t.logIn}
              </Link>
            </div>
          )}
          {message && (
            <div className={card}>
              <p className="text-lg font-semibold">{message}</p>
              {(state === "ended" || state === "notMember") && (
                <Link href="/contact" className={`${addButton} mt-4`}>
                  {t.contact}
                </Link>
              )}
            </div>
          )}
          {state === "ready" && children}
        </div>
      </main>
      {FEATURES.footer && <Footer />}
      <SiteChrome alwaysVisible />
    </div>
  );
}
