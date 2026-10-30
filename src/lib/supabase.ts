"use client";

// The connection to Supabase (our database and log-in service).
// It uses the PUBLIC "anon" key. That is safe: the row-level rules in supabase/schema.sql decide
// what each person can see. The secret "service_role" key must never be used in the website.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// null means Supabase is not connected yet (the .env.local settings are empty).
export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}
