// Tests for the code maker (supabase/pindesk_codes.sql): length, no look-alike characters, no clashes,
// never typed, never changed, and never shown to app users or the public. Run on a real in-memory Postgres.
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { addUser, attempt, makeDb } from "./helpers-db.mjs";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

let db;
const P = {};
const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";

before(async () => {
  db = await makeDb();
  for (const [k, email] of Object.entries({ main: "main@example.com", staff: "staff@example.com", helper: "helper@example.com", user: "user@example.com" })) {
    P[k] = { id: await addUser(db, email), email };
  }
  await db.exec(`insert into public.team_members (email, name, role) values
    ('main@example.com','Main','main_admin'), ('staff@example.com','Staff','staff'), ('helper@example.com','Helper','helper');`);
});

const codesFrom = async (letters, digits, n) =>
  (await db.query("select public.make_code($1, $2) as c from generate_series(1, $3)", [letters, digits, n])).rows.map((r) => r.c);

// ---------------------------------------------------------------- length and shape
test("a restaurant or shop code is 4 letters then 4 numbers; a location 10 and 10; a reel 8 and 8", async () => {
  await db.exec(`
    insert into public.businesses (name, type) values ('Shape Cafe', 'restaurant'), ('Shape Shop', 'shop');
    insert into public.locations (name) values ('Shape place');
    insert into public.reels (url, link_key, platform) values ('https://www.instagram.com/reel/SH1/', 'instagram/SH1', 'instagram');
  `);
  const get = async (sql) => (await db.query(sql)).rows.map((r) => r.code);
  for (const code of await get("select code from public.businesses")) {
    assert.equal(code.length, 8);
    assert.match(code, /^[A-Z]{4}[0-9]{4}$/);
  }
  for (const code of await get("select code from public.locations")) {
    assert.equal(code.length, 20);
    assert.match(code, /^[A-Z]{10}[0-9]{10}$/);
  }
  for (const code of await get("select code from public.reels")) {
    assert.equal(code.length, 16);
    assert.match(code, /^[A-Z]{8}[0-9]{8}$/);
  }
});

test("the shape works for any length (lengths 1 to 40 in total) and refuses silly ones", async () => {
  for (const [l, d] of [[1, 1], [4, 4], [10, 10], [8, 8], [20, 20]]) {
    const [c] = await codesFrom(l, d, 1);
    assert.equal(c.length, l + d);
    assert.match(c, new RegExp(`^[A-Z]{${l}}[0-9]{${d}}$`));
  }
  for (const [l, d] of [[0, 4], [4, 0], [30, 30]]) {
    assert.equal((await attempt(db, null, "select 1")).ok, true);
    await assert.rejects(db.query("select public.make_code($1, $2)", [l, d]));
  }
});

// ---------------------------------------------------------------- no look-alike characters
test("a code never has O, 0, I or 1: letters come only from 24 letters and numbers from 8 numbers", async () => {
  const codes = [...(await codesFrom(10, 10, 3000)), ...(await codesFrom(4, 4, 3000)), ...(await codesFrom(8, 8, 3000))];
  const seenLetters = new Set();
  const seenDigits = new Set();
  for (const c of codes) {
    assert.ok(!/[OI01]/.test(c), `${c} has a look-alike character`);
    const letters = c.match(/^[A-Z]+/)[0];
    const digits = c.slice(letters.length);
    assert.ok([...letters].every((ch) => LETTERS.includes(ch)), `${c}: bad letter`);
    assert.ok([...digits].every((ch) => DIGITS.includes(ch)), `${c}: bad number`);
    [...letters].forEach((ch) => seenLetters.add(ch));
    [...digits].forEach((ch) => seenDigits.add(ch));
  }
  // every allowed letter and number really does turn up (so none is missing or stuck)
  assert.equal(seenLetters.size, 24);
  assert.equal(seenDigits.size, 8);
});

test("the characters are spread evenly (the random picking does not lean)", async () => {
  const codes = await codesFrom(10, 10, 4000); // 40,000 letters and 40,000 numbers
  const count = (chars, pool) => Object.fromEntries([...pool].map((c) => [c, [...chars].filter((x) => x === c).length]));
  const all = codes.join("");
  const letters = count(all.replace(/[0-9]/g, ""), LETTERS);
  const digits = count(all.replace(/[A-Z]/g, ""), DIGITS);
  for (const [c, n] of Object.entries(letters)) assert.ok(Math.abs(n - 40000 / 24) < 40000 / 24 * 0.12, `letter ${c} came up ${n} times`);
  for (const [c, n] of Object.entries(digits)) assert.ok(Math.abs(n - 40000 / 8) < 40000 / 8 * 0.08, `number ${c} came up ${n} times`);
});

test("the table itself refuses a code with a look-alike character or the wrong shape, even if the maker is skipped", async () => {
  // switch the triggers off (only the database owner can) to try to slip a bad code in
  for (const bad of ["OKQM4729", "KQXM4701", "KQXMI729", "kqxm4729", "KQXM472", "KQXM47291"]) {
    await db.exec("set session_replication_role = replica");
    await assert.rejects(db.query("insert into public.businesses (code, name, type) values ($1, 'Sneaky', 'shop')", [bad]), /businesses_code_shape/, bad);
    await db.exec("set session_replication_role = origin");
  }
  await db.exec("set session_replication_role = replica");
  await assert.rejects(db.query("insert into public.locations (code, name) values ('KQXM4729', 'Short loc')"), /locations_code_shape/);
  await assert.rejects(db.query("insert into public.reels (code, url, link_key, platform) values ('KQXMWTZR4729385O', 'https://www.instagram.com/reel/Z1/', 'instagram/Z1', 'instagram')"), /reels_code_shape/);
  await db.exec("set session_replication_role = origin");
});

// ---------------------------------------------------------------- no clashes
test("no two codes are the same: 3,000 restaurants, 3,000 locations and 3,000 reels all get different codes", async () => {
  await db.exec(`
    insert into public.businesses (name, type) select 'Bulk ' || g, 'restaurant' from generate_series(1, 3000) g;
    insert into public.locations (name) select 'Bulk place ' || g from generate_series(1, 3000) g;
    insert into public.reels (url, link_key, platform) select 'https://www.instagram.com/reel/B' || g || '/', 'instagram/B' || g, 'instagram' from generate_series(1, 3000) g;
  `);
  for (const t of ["businesses", "locations", "reels"]) {
    const r = (await db.query(`select count(*)::int as n, count(distinct lower(code))::int as d from public.${t}`)).rows[0];
    assert.equal(r.d, r.n, `${t} has repeated codes`);
    assert.ok(r.n >= 3000);
  }
});

test("when the first pick is taken the maker tries again, and says so if no free code is left", async () => {
  // a tiny table of 1 letter + 1 number codes (only 24 x 8 = 192 possible)
  await db.exec("create table scratch (code text)");
  const all = [];
  for (const l of LETTERS) for (const d of DIGITS) all.push(`${l}${d}`);
  const keep = all.slice(0, 150);
  await db.exec(`insert into scratch (code) values ${keep.map((c) => `('${c}')`).join(",")}`);
  const free = new Set(all.slice(150));
  for (let i = 0; i < 20; i++) {
    const c = (await db.query("select public.next_free_code('scratch'::regclass, 1, 1) as c")).rows[0].c;
    assert.ok(free.has(c), `${c} was already taken`);
  }
  await db.exec(`insert into scratch (code) values ${all.slice(150).map((c) => `('${c}')`).join(",")}`);
  await assert.rejects(db.query("select public.next_free_code('scratch'::regclass, 1, 1)"), /free code/);
});

test("capital letters do not hide a clash (the table compares without caring)", async () => {
  await db.exec("insert into public.businesses (name, type) values ('Case Cafe', 'shop')");
  const code = (await db.query("select code from public.businesses where name = 'Case Cafe'")).rows[0].code;
  // the rule on the table: the same code in small letters is refused (the shape rule refuses it first)
  await db.exec("set session_replication_role = replica");
  await assert.rejects(db.query("insert into public.businesses (code, name, type) values ($1, 'Copy', 'shop')", [code.toLowerCase()]));
  await assert.rejects(db.query("insert into public.businesses (code, name, type) values ($1, 'Copy 2', 'shop')", [code]), /unique|duplicate/i);
  await db.exec("set session_replication_role = origin");
});

// ---------------------------------------------------------------- never typed, never changed
test("a code that is typed in is ignored, and an existing code can never be changed", async () => {
  await db.exec("insert into public.businesses (name, type, code) values ('Typed Cafe', 'shop', 'TYPE1234')");
  const code = (await db.query("select code from public.businesses where name = 'Typed Cafe'")).rows[0].code;
  assert.notEqual(code, "TYPE1234");
  const a = await attempt(db, P.main, "update public.businesses set code = 'ABCD2345' where name = 'Typed Cafe'");
  assert.equal(a.ok, true); // the save goes through, but the code is kept
  assert.equal((await db.query("select code from public.businesses where name = 'Typed Cafe'")).rows[0].code, code);
  await db.exec("update public.businesses set code = 'ABCD2345', name = 'Typed Cafe 2' where name = 'Typed Cafe'"); // even the SQL Editor
  assert.equal((await db.query("select code from public.businesses where name = 'Typed Cafe 2'")).rows[0].code, code);
});

test("team members get a code made for them when they save", async () => {
  for (const who of [P.main, P.staff, P.helper]) {
    const r = await attempt(db, who, "insert into public.businesses (name, type) values ('By team ' || $1, 'shop') returning code", [who.email]);
    assert.equal(r.ok, true, who.email);
    assert.match(r.rows[0].code, /^[A-HJ-NP-Z]{4}[2-9]{4}$/);
  }
});

// ---------------------------------------------------------------- team only
test("codes are never visible to app users or the public: tables, functions and views", async () => {
  await db.exec("insert into public.businesses (name, type) values ('Secret Cafe', 'shop')");
  for (const t of ["businesses", "locations", "reels"]) {
    const anon = await attempt(db, null, `select code from public.${t}`);
    assert.equal(anon.ok ? anon.rows.length : 0, 0, `${t} codes leaked to the public`);
    const user = await attempt(db, P.user, `select code from public.${t}`);
    assert.equal(user.rows.length, 0, `${t} codes leaked to an app user`);
  }
  // the code-making functions cannot be called by the website or the app
  for (const fn of ["public.make_code(4, 4)", "public.random_below(10)", "public.next_free_code('public.businesses'::regclass, 4, 4)"]) {
    assert.equal((await attempt(db, null, `select ${fn}`)).ok, false, fn);
    assert.equal((await attempt(db, P.user, `select ${fn}`)).ok, false, fn);
    assert.equal((await attempt(db, P.staff, `select ${fn}`)).ok, false, fn);
  }
  // no function that the public or an app user may call hands back a "code" column
  const callable = (await db.query(`
    select p.proname, pg_get_function_result(p.oid) as result
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`)).rows;
  for (const f of callable) assert.doesNotMatch(f.result ?? "", /\bcode\b/i, `${f.proname} returns a code`);
  // and no view that the public may read has one
  const views = (await db.query(`
    select c.relname, a.attname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    where n.nspname = 'public' and c.relkind = 'v' and a.attname = 'code'
      and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('authenticated', c.oid, 'select'))`)).rows;
  assert.deepEqual(views, []);
});

test("the public website pages never ask for these tables, so they can never show a code", () => {
  // every file of the public site (not /admin) must not read businesses, locations or reels from the database
  const walk = (dir) => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (p.includes(join("src", "app", "admin"))) return [];
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
  const files = [...walk("src/app"), ...walk("src/components/site"), ...walk("src/components/pages"), ...walk("src/components/business")].filter((f) => /\.(ts|tsx)$/.test(f));
  assert.ok(files.length > 10);
  for (const f of files) {
    assert.doesNotMatch(readFileSync(f, "utf8"), /\.from\(["'`](businesses|locations|reels|building_places|reel_items|reel_deals|reel_offers)["'`]\)/, `${f} reads a Pin Desk table`);
  }
});

// ---------------------------------------------------------------- upgrading older codes
test("rows saved with the older style codes (BUS-000001 ...) are given new codes when this file is run", async () => {
  const old = await makeDb({ skip: ["pindesk_codes.sql"] });
  await old.exec(`
    insert into public.businesses (name, type) values ('Old A', 'shop'), ('Old B', 'restaurant');
    insert into public.locations (name) values ('Old place');
    insert into public.reels (url, link_key, platform) values ('https://www.instagram.com/reel/OLD1/', 'instagram/OLD1', 'instagram');
  `);
  const before = (await old.query("select code from public.businesses order by name")).rows.map((r) => r.code);
  assert.match(before[0], /^BUS-\d{6}$/); // the old style
  await old.exec(readFileSync("supabase/pindesk_codes.sql", "utf8"));
  const rows = {
    businesses: (await old.query("select code from public.businesses")).rows.map((r) => r.code),
    locations: (await old.query("select code from public.locations")).rows.map((r) => r.code),
    reels: (await old.query("select code from public.reels")).rows.map((r) => r.code),
  };
  for (const c of rows.businesses) assert.match(c, /^[A-HJ-NP-Z]{4}[2-9]{4}$/);
  for (const c of rows.locations) assert.match(c, /^[A-HJ-NP-Z]{10}[2-9]{10}$/);
  for (const c of rows.reels) assert.match(c, /^[A-HJ-NP-Z]{8}[2-9]{8}$/);
  assert.equal(new Set(rows.businesses).size, 2);
  // and from now on the code is fixed again
  await old.exec("update public.businesses set code = 'ZZZZ9999' where name = 'Old A'");
  assert.ok(!(await old.query("select code from public.businesses where name = 'Old A'")).rows[0].code.startsWith("ZZZZ"));
});
