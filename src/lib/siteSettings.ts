"use client";

// The prices and links Sarah types on the Pin Desk (in the dashboard). The website reads them when a page opens,
// so a change shows up without building the site again. If they cannot be read (or nothing is typed yet), prices say
// "Price to confirm" and the Instagram button stays hidden. Nothing secret is here: it is public information.
import { useEffect, useSyncExternalStore } from "react";
import { getSupabase } from "./supabase";

export type SiteSettings = {
  prices: Record<string, number | null>;
  instagram_url: string | null;
  whatsapp_number: string | null;
};

const EMPTY: SiteSettings = { prices: {}, instagram_url: null, whatsapp_number: null };
let current: SiteSettings = EMPTY;
let started = false;
const listeners = new Set<() => void>();

function start() {
  if (started) return;
  started = true;
  const supabase = getSupabase();
  if (!supabase) return;
  void supabase.rpc("public_site_settings").then(({ data }) => {
    if (data && typeof data === "object") {
      const d = data as Partial<SiteSettings>;
      current = { prices: d.prices ?? {}, instagram_url: d.instagram_url ?? null, whatsapp_number: d.whatsapp_number ?? null };
      listeners.forEach((l) => l());
    }
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useSiteSettings(): SiteSettings {
  useEffect(start, []);
  return useSyncExternalStore(subscribe, () => current, () => EMPTY);
}
