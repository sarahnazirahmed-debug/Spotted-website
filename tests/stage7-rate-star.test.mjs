// Stage 7: the "Rate us" star, its card, the bin, the footer link, and the star_feedback table.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { AUTO_CLOSE_MS, CROSS_DELAY_MS, DRAG_LIMIT_PX, KEYS, MOUTHS, RATE_LIMIT, RATINGS, buildRow, cleanNote, crossDelay, isDrag, isHoneypotFilled, newVisitorKey, overBin, rateLimited } from "../src/lib/ratingStar.ts";
import { FEATURES } from "../src/config/features.ts";
import { en } from "../src/content/en.ts";
import { addUser, attempt, makeDb } from "./helpers-db.mjs";

const read = (f) => readFileSync(f, "utf8");
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const star = code("src/components/rate/RateStar.tsx");
const css = read("src/app/globals.css");

// ---------------------------------------------------------------- the rules
test("a tap moves 6 pixels or less; more than that is a drag", () => {
  assert.equal(DRAG_LIMIT_PX, 6);
  assert.equal(isDrag(0, 0), false);
  assert.equal(isDrag(6, 0), false);
  assert.equal(isDrag(3, 4), false); // exactly 5 away
  assert.equal(isDrag(4, 5), true); // about 6.4 away
  assert.equal(isDrag(0, -7), true);
});

test("the close cross waits 2.5 seconds (3 on phones); the thank-you closes by itself after about 5 seconds", () => {
  assert.deepEqual(CROSS_DELAY_MS, { desktop: 2500, phone: 3000 });
  assert.equal(crossDelay(false), 2500);
  assert.equal(crossDelay(true), 3000);
  assert.equal(AUTO_CLOSE_MS, 5000);
});

test("rate limit in the browser: 3 an hour, 10 seconds apart", () => {
  const now = 10_000_000;
  assert.equal(rateLimited([], now), "ok");
  assert.equal(rateLimited([now - 5_000], now), "gap");
  assert.equal(rateLimited([now - 11_000], now), "ok");
  assert.equal(rateLimited([now - 20_000, now - 40_000, now - 60_000], now), "max");
  assert.equal(rateLimited([now - 3_700_000, now - 3_800_000, now - 3_900_000], now), "ok"); // over an hour ago
  assert.deepEqual([RATE_LIMIT.max, RATE_LIMIT.windowMs, RATE_LIMIT.gapMs], [3, 3_600_000, 10_000]);
});

test("the row that is sent has no id and no date, and a blank note becomes nothing", () => {
  const row = buildRow({ about: "app", rating: 5, note: "   ", page: "/faq", visitor: "abc123def456" });
  assert.deepEqual(Object.keys(row).sort(), ["about", "note", "page", "rating", "visitor_key"]);
  assert.equal(row.note, null);
  assert.equal(cleanNote("  hello  "), "hello");
  assert.equal(cleanNote("x".repeat(900)).length, 500);
  assert.match(newVisitorKey(), /^[a-f0-9]{32}$/);
  assert.notEqual(newVisitorKey(), newVisitorKey());
});

test("the honeypot: empty is a person, anything in it is a robot", () => {
  assert.equal(isHoneypotFilled(""), false);
  assert.equal(isHoneypotFilled("   "), false);
  assert.equal(isHoneypotFilled("http://spam"), true);
});

test("the bin: the middle of the star must be over it (a little generous)", () => {
  const bin = { left: 100, top: 100, right: 160, bottom: 160 };
  assert.equal(overBin({ left: 110, top: 110, right: 150, bottom: 150 }, bin), true);
  assert.equal(overBin({ left: 300, top: 300, right: 340, bottom: 340 }, bin), false);
  assert.equal(overBin({ left: 70, top: 110, right: 110, bottom: 150 }, bin), true); // the middle is 90, within the 12px slack
  assert.equal(overBin({ left: 20, top: 110, right: 60, bottom: 150 }, bin), false);
});

// ---------------------------------------------------------------- the faces: mouth only, no eyes
test("five faces, a round outline and ONLY A MOUTH: no eyes", () => {
  assert.deepEqual(RATINGS, [1, 2, 3, 4, 5]);
  assert.equal(new Set(Object.values(MOUTHS)).size, 5); // five different mouths
  const face = code("src/components/rate/RateFace.tsx");
  assert.equal([...face.matchAll(/<circle /g)].length, 1); // just the outline
  assert.equal([...face.matchAll(/<path /g)].length, 1); // just the mouth
  assert.doesNotMatch(face, /<ellipse|<rect|<line|<polygon/);
  // the outline is the only round shape in the card's faces
  assert.doesNotMatch(star, /<circle|<ellipse/);
});

// ---------------------------------------------------------------- the star, card, bin, footer
test("a floating star on the right, no sign-in, with a switch", () => {
  assert.equal(FEATURES.feedbackStar, true);
  assert.match(star, /fixed right-2 top-\[58%\]/);
  assert.match(star, /aria-label=\{t\.star\}/);
  assert.match(code("src/components/SiteChrome.tsx"), /FEATURES\.feedbackStar && <RateStar \/>/);
  assert.doesNotMatch(star, /signIn|login|auth\./i); // nothing about signing in
});

test("tap opens the card; a drag (more than 6px) goes to the bin and never opens the card", () => {
  assert.match(star, /isDrag\(dx, dy\)/);
  assert.match(star, /suppressClick\.current = true/);
  assert.match(star, /if \(suppressClick\.current\) return;\s*open\(\);/);
  assert.match(star, /touchAction: "none"/);
  assert.match(star, /rate-bin/);
  assert.match(star, /rate-bin-lid \$\{binOpen \? "rate-bin-lid-open"/); // the lid opens when the star is over the bin
  assert.match(star, /\$\{dragging \? "opacity-100" : "opacity-0"\}/); // the bin fades in while dragging
  assert.match(star, /setFlag\("local", KEYS\.hidden\)/); // hidden for good
});

test("hidden for good = localStorage; hidden for this visit only = sessionStorage", () => {
  assert.deepEqual(Object.keys(KEYS).sort(), ["hidden", "rated", "times", "visitor"]);
  assert.match(star, /const store = \(kind: "local" \| "session"\) => \(kind === "local" \? localStorage : sessionStorage\)/);
  assert.match(star, /useFlag\("local", KEYS\.hidden\)/);
  assert.match(star, /useFlag\("session", KEYS\.rated\)/);
  assert.match(star, /setFlag\("session", KEYS\.rated\)/);
  // storage in a try/catch: if it is blocked the page still works
  assert.match(star, /try \{\s*return store\(kind\)\.getItem\(key\) === "1";\s*\} catch/);
});

test("the card: Website or App, five faces with a changing note, an optional note, and the Submit button with 'Submitted'", () => {
  assert.match(star, /name="about"/);
  assert.match(star, /RATINGS\.map/);
  assert.match(star, /t\.notes\[rating - 1\]/);
  assert.deepEqual(en.rate.notes.length, 5);
  assert.match(star, /id="rate-note"/);
  assert.match(star, /<VerifyButton state=\{status\} words=\{SUBMIT_WORDS\} \/>/);
  assert.deepEqual([en.rate.submit, en.rate.sending, en.rate.submitted], ["Submit", "Sending", "Submitted"]);
  assert.match(star, /role="dialog"/);
  assert.match(star, /aria-modal="true"/);
  assert.match(star, /backdrop-blur-sm/); // the blurred background
});

test("the close cross: hidden at first, fades in after stillness, any tap/slide/click/typing hides it again, Escape closes", () => {
  assert.match(star, /useState\(false\);\s*const \[dragging/); // crossVisible starts false (the line before dragging)
  assert.match(star, /crossDelay\(isPhone\(\)\)/);
  for (const h of ["onPointerDown={bump}", "onTouchMove={bump}", "onWheel={bump}", "onKeyDown={bump}", "onInput={bump}", "onClick={bump}"]) assert.ok(star.includes(h), h);
  assert.match(star, /e\.pointerType !== "mouse" \|\| e\.buttons > 0\) && bump\(\)/); // a plain mouse move does not count, a drag or touch does
  assert.match(star, /setCrossVisible\(false\);\s*schedule\(\)/); // restart the wait
  assert.match(star, /aria-hidden=\{!crossVisible\}/);
  assert.match(star, /tabIndex=\{crossVisible \? 0 : -1\}/);
  assert.match(star, /e\.key === "Escape"/);
  assert.match(css, /\.rate-cross \{ transition: opacity 0\.4s ease; \}/); // fades in
});

test("closing shrinks the card back into the star; after a rating the card shows the chosen face, closes itself, and the star is vacuumed away", () => {
  assert.match(star, /scale\(0\.1\)/); // grows from and shrinks to the star
  assert.match(star, /a\.finished\.then\(\(\) => finishClose\(afterRating\)/);
  assert.match(star, /<RateFace level=\{rating\} size=\{96\}/); // the card becomes the chosen face
  assert.match(star, /t\.thanks/);
  assert.match(star, /window\.setTimeout\(\(\) => close\(true\), AUTO_CLOSE_MS\)/);
  assert.match(star, /rate-star-vacuum/);
  assert.match(css, /@keyframes rate-star-vacuum[\s\S]*translateX\(110px\)/); // off the right edge
  assert.match(star, /e\.animationName === "rate-star-vacuum"/);
  assert.match(en.rate.thanks, /Thank you/);
});

test("the footer 'Rate us' link always opens the card; there is no link in the top menu", () => {
  const link = code("src/components/rate/RateUsLink.tsx");
  assert.match(link, /new CustomEvent\(RATE_OPEN_EVENT/);
  assert.match(star, /window\.addEventListener\(RATE_OPEN_EVENT/);
  assert.match(code("src/components/Footer.tsx"), /FEATURES\.feedbackStar && <RateUsLink \/>/);
  assert.doesNotMatch(code("src/components/TopBar.tsx"), /rate/i);
  assert.equal(en.rate.star, "Rate us");
});

test("safety: a hidden honeypot, a rate limit, and rows are only ever added (no reading back)", () => {
  assert.match(star, /isHoneypotFilled\(honey\)/);
  assert.match(star, /absolute -left-\[9999px\] h-0 w-0 overflow-hidden/);
  assert.match(star, /tabIndex=\{-1\} autoComplete="off"/);
  assert.match(star, /rateLimited\(readTimes\(\), Date\.now\(\)\)/);
  assert.match(star, /from\("star_feedback"\)\.insert\(buildRow\(/);
  assert.doesNotMatch(star, /from\("star_feedback"\)[\s\S]{0,120}\.(select|update|delete)\(/);
  assert.doesNotMatch(star, /service_role/i);
});

test("with Reduce Motion nothing moves: every animation of the star is inside the no-preference block", () => {
  const start = css.indexOf("/* ---- The Rate us star ----");
  assert.ok(start > 0);
  const tail = css.slice(start);
  const open = tail.indexOf("@media (prefers-reduced-motion: no-preference) {");
  assert.ok(open > 0);
  const inside = tail.slice(open);
  for (const rule of [".rate-star-float { animation", ".rate-star-vacuum { animation", ".rate-backdrop { animation", ".rate-bin { transition", ".rate-bin-lid { transition", ".rate-cross { transition"]) {
    assert.ok(inside.includes(rule), rule);
    assert.ok(!tail.slice(0, open).includes(rule), `${rule} appears outside the block`);
  }
  // and the code skips the growing, shrinking and vacuum
  assert.ok((star.match(/reduced\(\)/g) ?? []).length >= 5);
});

test("the new files use no colour codes and no emoji, and the words are marked as a draft", () => {
  for (const f of ["src/components/rate/RateStar.tsx", "src/components/rate/RateFace.tsx", "src/components/rate/RateUsLink.tsx", "src/lib/ratingStar.ts"]) {
    assert.doesNotMatch(code(f), /#[0-9a-fA-F]{3,8}\b/, f);
    assert.doesNotMatch(code(f), /\p{Extended_Pictographic}/u, f);
  }
  assert.match(read("src/content/en.ts"), /The Rate us star\. DRAFT WORDING: to be approved by Sarah/);
  for (const f of walk("src").filter((x) => x.endsWith(".tsx") && !x.includes("/admin/"))) assert.doesNotMatch(read(f), /spotted-star-/, `${f}: keys belong in src/lib/ratingStar.ts`);
});

// ---------------------------------------------------------------- the table (real database rules)
const KEY = (n) => `a${String(n).padStart(11, "0")}`;
const ins = (key, extra = "") => `insert into public.star_feedback (about, rating, visitor_key${extra ? ", " + extra.split("|")[0] : ""}) values ('website', 4, '${key}'${extra ? ", " + extra.split("|")[1] : ""})`;

async function setup() {
  const db = await makeDb();
  const P = {};
  for (const [k, role] of [["main", "main_admin"], ["assoc", "associate"], ["staff", "staff"]]) {
    P[k] = { id: await addUser(db, `${k}@example.com`), email: `${k}@example.com` };
    await db.exec(`insert into public.team_members (email, name, role) values ('${k}@example.com','${k}','${role}')`);
  }
  P.user = { id: await addUser(db, "user@example.com"), email: "user@example.com" };
  return { db, P };
}

test("database: anyone, even logged out, can add a rating; nobody on the website can read, change or delete one", async () => {
  const { db, P } = await setup();
  assert.ok((await attempt(db, null, ins(KEY(1)))).ok);
  assert.ok((await attempt(db, P.user, ins(KEY(2)))).ok); // a signed-in person who is not on the team
  await db.exec(ins(KEY(3)));
  for (const who of [null, P.user]) {
    assert.equal((await attempt(db, who, "select * from public.star_feedback")).ok && (await attempt(db, who, "select * from public.star_feedback")).rows.length > 0, false, "read");
    const upd = await attempt(db, who, "update public.star_feedback set rating = 1");
    assert.ok(!upd.ok || upd.affected === 0, "update");
    const del = await attempt(db, who, "delete from public.star_feedback");
    assert.ok(!del.ok || del.affected === 0, "delete");
  }
  assert.equal((await db.query("select count(*)::int n, min(rating)::int r from public.star_feedback")).rows[0].n, 1); // the one row is still there and unchanged
  assert.equal((await db.query("select rating from public.star_feedback")).rows[0].rating, 4);
});

test("database: the team reads the ratings; only the main admin and associates delete", async () => {
  const { db, P } = await setup();
  await db.exec(ins(KEY(5)));
  for (const who of [P.main, P.assoc, P.staff]) assert.equal((await attempt(db, who, "select * from public.star_feedback")).rows.length, 1);
  const staffDelete = await attempt(db, P.staff, "delete from public.star_feedback");
  assert.ok(!staffDelete.ok || staffDelete.affected === 0);
  assert.equal((await attempt(db, P.assoc, "delete from public.star_feedback")).affected, 1);
});

test("database: only valid ratings are accepted", async () => {
  const { db } = await setup();
  const bad = [
    "insert into public.star_feedback (about, rating, visitor_key) values ('website', 0, 'abcdef123456')",
    "insert into public.star_feedback (about, rating, visitor_key) values ('website', 6, 'abcdef123456')",
    "insert into public.star_feedback (about, rating, visitor_key) values ('shop', 3, 'abcdef123456')",
    "insert into public.star_feedback (about, rating, visitor_key) values ('app', 3, 'NOT A KEY!')",
    "insert into public.star_feedback (about, rating, visitor_key) values ('app', 3, 'abc')",
    "insert into public.star_feedback (about, rating, visitor_key) values (null, 3, 'abcdef123456')",
  ];
  for (const sql of bad) assert.equal((await attempt(db, null, sql)).ok, false, sql);
  assert.ok((await attempt(db, null, "insert into public.star_feedback (about, rating, visitor_key, note, page) values ('app', 5, 'abcdef123456', '  nice  ', '/faq')")).ok);
  // a too-long note is cut to 500 letters, never refused (the box on the card allows 300)
  await db.exec("insert into public.star_feedback (about, rating, visitor_key, note) values ('app', 3, 'fedcba654321', repeat('x', 900))");
  assert.equal((await db.query("select char_length(note)::int n from public.star_feedback where visitor_key = 'fedcba654321'")).rows[0].n, 500);
});

test("database: the date and id are made by the database and cannot be forged; blank notes become nothing", async () => {
  const { db } = await setup();
  await db.exec("insert into public.star_feedback (id, created_at, about, rating, visitor_key, note) values ('00000000-0000-0000-0000-000000000001', '2001-01-01', 'app', 3, 'abcdef123456', '   ')");
  const row = (await db.query("select id::text, created_at > now() - interval '1 minute' as fresh, note from public.star_feedback")).rows[0];
  assert.notEqual(row.id, "00000000-0000-0000-0000-000000000001");
  assert.equal(row.fresh, true);
  assert.equal(row.note, null);
});

test("database rate limit: 3 an hour from one browser, then it is refused; an hour later it is fine again", async () => {
  const { db } = await setup();
  for (let i = 0; i < 3; i++) await db.exec(ins("bbbbbbbbbbbb"));
  const fourth = await attempt(db, null, ins("bbbbbbbbbbbb"));
  assert.equal(fourth.ok, false);
  assert.match(fourth.error, /Too many ratings from this browser/);
  assert.ok((await attempt(db, null, ins("cccccccccccc"))).ok); // another browser is fine
  await db.exec("update public.star_feedback set created_at = now() - interval '2 hours' where visitor_key = 'bbbbbbbbbbbb'");
  assert.ok((await attempt(db, null, ins("bbbbbbbbbbbb"))).ok);
});

test("database rate limit: the whole site accepts at most 120 ratings an hour", async () => {
  const { db } = await setup();
  for (let i = 0; i < 120; i++) await db.exec(ins(KEY(i)));
  const over = await attempt(db, null, ins(KEY(999)));
  assert.equal(over.ok, false);
  assert.match(over.error, /Too many ratings right now/);
});

test("the table file exists, the older SQL files are not edited, and it tells Sarah how to read the ratings", () => {
  const sql = read("supabase/star_feedback.sql");
  assert.ok(existsSync("supabase/star_feedback.sql"));
  assert.match(sql, /Table Editor > star_feedback/);
  assert.match(sql, /grant insert on public\.star_feedback to anon, authenticated/);
  assert.doesNotMatch(sql, /grant[^;]*select[^;]*to anon/i); // visitors never read
  for (const f of readdirSync("supabase").filter((x) => x.endsWith(".sql") && x !== "star_feedback.sql")) assert.doesNotMatch(read(`supabase/${f}`), /star_feedback/, f);
});
