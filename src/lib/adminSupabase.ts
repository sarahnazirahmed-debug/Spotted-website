"use client";

// The connection to Supabase for /admin. Unlike the public site, it does NOT remember the log-in:
// the session lives only in memory, so a reload or a new visit always asks for a new 6-digit code.
// (Moving between /admin pages with the menu keeps you logged in, because the page does not reload.)
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getAdminSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}
