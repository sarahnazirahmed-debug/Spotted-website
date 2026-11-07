// Step 7 addition: duplicate reels are caught straight after the link is pasted. Which links can and cannot be matched.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readReelLink } from "../src/lib/reelLinks.ts";
import { addUser, attempt, makeDb } from "./helpers-db.mjs";

const key = (s) => { const r = readReelLink(s); return r.ok ? r.linkKey : null; };

test("the same Instagram reel written many ways gives one key", () => {
  const want = "instagram/Cabc123_x";
  for (const s of [
    "https://www.instagram.com/reel/Cabc123_x/",
    "instagram.com/reel/Cabc123_x",
    "https://www.instagram.com/reel/Cabc123_x/?igsh=MWx1cGZ4&utm_source=ig_web_copy_link",
    "https://www.instagram.com/reel/Cabc123_x/?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
    "https://m.instagram.com/reel/Cabc123_x//",
    "https://www.instagram.com/someone/reel/Cabc123_x/?hl=en",
    "https://www.instagram.com/reels/Cabc123_x/",
    "https://www.instagram.com/p/Cabc123_x/",
    "https://instagr.am/reel/Cabc123_x/",
    "Look at this https://www.instagram.com/reel/Cabc123_x/?igsh=abc so good!",
  ]) assert.equal(key(s), want, s);
});

test("TikTok full links match, with or without tracking text", () => {
  const want = "tiktok/7300000000000000001";
  for (const s of [
    "https://www.tiktok.com/@some.one/video/7300000000000000001",
    "https://www.tiktok.com/@some.one/video/7300000000000000001?is_from_webapp=1&sender_device=pc&web_id=123",
    "https://m.tiktok.com/@some.one/video/7300000000000000001/?_r=1&u_code=abc",
  ]) assert.equal(key(s), want, s);
});

test("YouTube links match, with or without tracking text", () => {
  const want = "youtube/dQw4w9WgXcQ";
  for (const s of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share&t=10",
    "https://youtu.be/dQw4w9WgXcQ?si=trackingtext",
    "https://m.youtube.com/shorts/dQw4w9WgXcQ?feature=share",
  ]) assert.equal(key(s), want, s);
});

test("links that CANNOT be matched are refused with a clear reason (never saved with a wrong key)", () => {
  const cannot = {
    "https://vm.tiktok.com/ZMabc123/": /short TikTok link/,
    "https://vt.tiktok.com/ZSabc123/": /short TikTok link/,
    "https://www.tiktok.com/t/ZTabc123/": /short TikTok link/,
    "https://www.instagram.com/share/reel/BAabcdef/": /share link/,
    "https://www.instagram.com/stories/someone/123/": /not a reel or post/,
    "https://www.instagram.com/someone/": /not a reel or post/,
    "https://youtube.com/@channel": /does not have a video/,
    "https://example.com/reel/abc": /Only Instagram, TikTok and YouTube/,
  };
  for (const [s, why] of Object.entries(cannot)) {
    const r = readReelLink(s);
    assert.equal(r.ok, false, s);
    assert.match(r.reason, why, s);
  }
});

test("the add screen checks for a duplicate at once and shows the details and both buttons", () => {
  const desk = readFileSync("src/components/admin/PinDesk.tsx", "utf8");
  assert.match(desk, /eq\("link_key", infoKey\)/);
  assert.match(desk, /<DuplicateNotice/);
  assert.match(desk, /\{info\?\.ok && !duplicate && \(/); // the form is not shown for a duplicate
  const n = readFileSync("src/components/admin/DuplicateNotice.tsx", "utf8");
  for (const t of ["This reel already exists.", "Reel code:", "Restaurant or shop:", "Added by:", "Added on:", "Open it", "Add a different reel"]) assert.ok(n.includes(t), t);
});

test("the database refuses a duplicate reel even if the screen did not catch it", async () => {
  const db = await makeDb();
  const who = { id: await addUser(db, "main@example.com"), email: "main@example.com" };
  await db.exec("insert into public.team_members (email, name, role) values ('main@example.com','Main','main_admin')");
  const sql = "insert into public.reels (url, link_key, platform) values ('https://www.instagram.com/reel/DUP1/', 'instagram/DUP1', 'instagram')";
  await db.exec(sql);
  const r = await attempt(db, who, sql);
  assert.equal(r.ok, false);
  assert.match(r.error, /duplicate|unique/i);
});
