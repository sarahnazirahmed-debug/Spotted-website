"use client";

// The Pin Desk home page (/admin): "Spotted", who you are, three big bars to add things,
// links to the lists, and a greyed row for what comes later.
// Colours come from src/styles/colors.css only. Everything is at least 44px tall. Nothing moves.
import Link from "next/link";
import { titleFor } from "@/lib/pindeskTitle";
import { ROLE_LABEL } from "@/lib/teamRules";
import { useAdmin } from "./AdminProvider";

const BARS = [
  { label: "Add reel", href: "/admin/pin?add=1" },
  { label: "Add restaurant or shop", href: "/admin/add-restaurant" },
  { label: "Add location", href: "/admin/add-location" },
];

const LISTS = [
  { label: "Locations", href: "/admin/locations" },
  { label: "Restaurants", href: "/admin/restaurants" },
  { label: "Reels", href: "/admin/pin" },
  { label: "Incomplete", href: "/admin/incomplete" },
];

export function PinDeskHomeView({ name, title }: { name: string; title: string }) {
  return (
    <div className="mx-auto grid max-w-3xl gap-8 py-2">
      <header>
        <h1 className="text-5xl font-extrabold leading-none text-heading">Spotted</h1>
        <p className="mt-4 text-2xl font-extrabold text-heading">{name}</p>
        <p className="text-lg font-bold text-ash">{title}</p>
      </header>

      <nav aria-label="Add" className="grid gap-4">
        {BARS.map((b) => (
          <Link
            key={b.href}
            href={b.href}
            className="flex min-h-24 items-center justify-center rounded-3xl bg-accent px-6 text-center text-2xl font-extrabold text-onaccent hover:opacity-90 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-heading"
          >
            {b.label}
          </Link>
        ))}
      </nav>

      <nav aria-label="Lists" className="grid grid-cols-2 gap-3">
        {LISTS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex min-h-14 items-center justify-center rounded-full border-2 border-line px-5 text-center text-lg font-extrabold text-heading hover:bg-alt focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-heading"
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <p
        aria-disabled="true"
        className="flex min-h-14 items-center rounded-2xl border-2 border-dashed border-line bg-alt px-5 text-base font-bold text-ash"
      >
        Offers and loyalty cards, Phase 3
      </p>
    </div>
  );
}

// The page: it reads who is logged in, then shows the home page for them.
export default function PinDeskHome() {
  const { me } = useAdmin();
  if (!me) return null;
  return <PinDeskHomeView name={me.name} title={titleFor(me.name, ROLE_LABEL[me.role])} />;
}
