// A real (tiny) Postgres database that runs in memory, used to test the privacy rules in
// supabase/schema.sql and supabase/admin.sql for real. It pretends to be Supabase: it makes the
// "auth" parts, the three roles (anon, authenticated, service_role) and the same default permissions.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

const FAKE_SUPABASE = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, raw_user_meta_data jsonb default '{}'::jsonb);
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`;

// skip: names of SQL files to leave out (used to test a migration on a database that has the older files only)
export async function makeDb({ skip = [] } = {}) {
  const db = new PGlite();
  await db.exec(FAKE_SUPABASE);
  await db.exec(readFileSync("supabase/schema.sql", "utf8"));
  await db.exec(readFileSync("supabase/admin.sql", "utf8"));
  await db.exec(readFileSync("supabase/public_site.sql", "utf8"));
  await db.exec(readFileSync("supabase/dashboard.sql", "utf8"));
  await db.exec(readFileSync("supabase/pindesk.sql", "utf8"));
  if (!skip.includes("pindesk_codes.sql")) await db.exec(readFileSync("supabase/pindesk_codes.sql", "utf8"));
  return db;
}

// Make a person who can log in (an "auth" user) and return their id.
export async function addUser(db, email) {
  const r = await db.query("insert into auth.users (email) values ($1) returning id", [email]);
  return r.rows[0].id;
}

// Run `fn` while pretending to be this person (or a logged-out visitor when email is null).
// Everything is undone afterwards (rollback), so tests do not affect each other.
export async function as(db, who, fn) {
  await db.exec("begin");
  try {
    if (who === null) {
      await db.exec("set local role anon");
    } else {
      await db.exec("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: who.id, email: who.email, role: "authenticated" })]);
    }
    return await fn(db);
  } finally {
    await db.exec("rollback");
  }
}

// Try something and report what happened: { ok, rows } or { ok: false, error }
export async function attempt(db, who, sql, params = []) {
  try {
    const r = await as(db, who, (d) => d.query(sql, params));
    return { ok: true, rows: r.rows, affected: r.affectedRows };
  } catch (e) {
    return { ok: false, error: String(e.message ?? e) };
  }
}
