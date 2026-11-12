// Stage 6: loading skeletons and the 6-digit code screen (rolling digits, magnetic Verify button, liquid fill, three states).
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { BUTTON_CLASS, LIQUID_CLASS, LIQUID_LEVEL, boxCount, lean, onlyDigits, successWait, SUCCESS_WAIT_MS, SUCCESS_WAIT_REDUCED_MS } from "../src/lib/codeEntry.ts";
import { en } from "../src/content/en.ts";

const read = (f) => readFileSync(f, "utf8");
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const css = read("src/app/globals.css");
const colours = read("src/styles/colors.css");
// the text of a media block that starts at `startIndex` (up to its closing brace on its own line)
const block = (startIndex) => css.slice(startIndex, css.indexOf("\n}\n", startIndex) + 3);

// ---------------------------------------------------------------- skeleton loading
test("loading blocks are grey, with theme colours in colors.css and no purple", () => {
  for (const n of ["--skeleton", "--skeleton-shine", "--grey-light", "--grey-shine-light", "--grey-dark", "--grey-shine-dark"]) assert.match(colours, new RegExp(`${n}:`), n);
  for (const hex of [...colours.matchAll(/--grey[\w-]*:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1])) {
    const n = hex.slice(1), [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
    assert.ok(Math.max(r, g, b) - Math.min(r, g, b) < 30, `${hex} is not a grey`); // a warm grey, never a colour
  }
  // dark and light each have their own
  assert.match(colours, /:root,\s*:root\[data-theme="dark"\] \{[\s\S]*?--skeleton:\s*var\(--grey-dark\)/);
  assert.match(colours, /:root\[data-theme="light"\] \{[\s\S]*?--skeleton:\s*var\(--grey-light\)/);
});

test("a light band sweeps across the grey blocks every 1.4 seconds, and stays still with Reduce Motion", () => {
  assert.match(css, /\.skeleton \{[^}]*background: var\(--skeleton\)/);
  assert.match(css, /\.skeleton::after \{[^}]*linear-gradient\(90deg, transparent 0%, var\(--skeleton-shine\) 50%, transparent 100%\)/);
  const at = css.indexOf(".skeleton::after { animation");
  assert.ok(at > 0);
  const open = css.lastIndexOf("@media (prefers-reduced-motion: no-preference) {", at);
  assert.ok(open > css.indexOf(".skeleton::after {"), "the animation is inside its own no-preference block");
  assert.match(block(open), /animation: skeleton-sweep 1\.4s ease-in-out infinite/);
  assert.equal([...css.matchAll(/animation: skeleton-sweep/g)].length, 1); // only there
});

test("EVERY page has a loading screen, and no plain 'Loading...' text is left anywhere", () => {
  assert.ok(existsSync("src/app/loading.tsx"));
  assert.match(code("src/app/loading.tsx"), /<PageSkeleton \/>/);
  const sk = code("src/components/Skeleton.tsx");
  assert.match(sk, /export function Skeleton/);
  assert.match(sk, /export function LoadingBlocks/);
  assert.match(sk, /export function PageSkeleton/);
  assert.match(sk, /role="status" aria-busy="true"/);
  assert.match(sk, /sr-only">Loading</); // a screen reader still hears "Loading"
  for (const f of walk("src").filter((x) => /\.(ts|tsx)$/.test(x))) assert.doesNotMatch(read(f), /Loading\.\.\./, f);
  // the places that fetch data show grey blocks while they wait
  for (const f of ["src/components/admin/ListShell.tsx", "src/components/admin/PinDesk.tsx", "src/components/admin/AdminFrame.tsx", "src/components/admin/BusinessView.tsx", "src/components/admin/BusinessEdit.tsx", "src/components/admin/LocationEdit.tsx", "src/components/admin/ReelEdit.tsx", "src/components/admin/ChangeHistory.tsx", "src/components/admin/TeamPage.tsx", "src/components/admin/ApplicationsPage.tsx", "src/components/account/Dashboard.tsx", "src/components/dashboard/DashboardFrame.tsx"]) assert.match(code(f), /LoadingBlocks/, f);
  assert.doesNotMatch(code("src/components/Skeleton.tsx"), /#[0-9a-fA-F]{3,8}\b/);
});

// ---------------------------------------------------------------- the code boxes
test("the code boxes: numbers only, six boxes, more only if more are typed", () => {
  assert.equal(onlyDigits("12a 3-4 56789", 6), "123456");
  assert.equal(onlyDigits("12 34", 8), "1234");
  assert.equal(boxCount(6, 6, 0), 6);
  assert.equal(boxCount(6, 8, 6), 6);
  assert.equal(boxCount(6, 8, 7), 7);
  assert.equal(boxCount(6, 8, 12), 8);
  assert.equal(boxCount(6, 6, 9), 6);
});

test("each digit rolls in like a slot machine, a pasted code one digit after another, and Reduce Motion just shows it", () => {
  const ce = code("src/components/code/CodeEntry.tsx");
  assert.match(ce, /className="reel"/);
  assert.match(ce, /Array\.from\(\{ length: 20 \}/); // a strip of 0 to 9, twice, so it rolls a full turn
  assert.match(ce, /"--d": Number\(d\)/); // where it stops
  assert.match(ce, /\(i - pastedFrom\) \* 70/); // pasted digits roll one after another
  assert.match(ce, /key=\{`\$\{i\}-\$\{d\}`\}/); // a changed digit rolls again
  // the rolling is inside the no-preference block; outside it the strip is already at the digit
  assert.match(css, /\.reel-strip \{ display: flex; flex-direction: column; transform: translateY\(calc\(var\(--d\) \* -1\.2em - 12em\)\); \}/);
  const at = css.indexOf(".reel-strip { animation: reel-roll");
  assert.ok(at > 0);
  const open = css.lastIndexOf("@media (prefers-reduced-motion: no-preference) {", at);
  assert.ok(open > css.indexOf(".liquid-body"), "inside the no-preference block");
  assert.equal([...css.matchAll(/animation: reel-roll/g)].length, 1);
});

test("the code field is ONE real input, so paste, the phone's code suggestion and screen readers work", () => {
  const ce = code("src/components/code/CodeEntry.tsx");
  assert.equal([...ce.matchAll(/<input/g)].length, 1);
  assert.match(ce, /inputMode="numeric"/);
  assert.match(ce, /autoComplete="one-time-code"/);
  assert.match(ce, /<label htmlFor=\{id\}/);
  assert.match(ce, /aria-hidden="true" className="flex justify-center/); // the boxes are only a picture
  assert.match(ce, /focused \? "outline outline-2 outline-offset-4 outline-coral"/); // a clear focus ring
  assert.match(ce, /state === "wrong" \? "code-shake"/);
  assert.match(css, /\.code-shake \{ animation: code-shake/); // the shake is inside the no-preference block too
});

// ---------------------------------------------------------------- the three states
test("three states: waiting is blush with a rose line, wrong is coral, correct is maroon", () => {
  assert.match(BUTTON_CLASS.waiting, /border-barline/); // rose line
  assert.match(BUTTON_CLASS.waiting, /bg-paper/); // blush
  assert.equal(BUTTON_CLASS.checking, BUTTON_CLASS.waiting); // checking still looks like waiting
  assert.match(BUTTON_CLASS.wrong, /bg-coral/);
  assert.match(BUTTON_CLASS.wrong, /border-coral/);
  assert.match(BUTTON_CLASS.correct, /bg-maroon/);
  assert.match(BUTTON_CLASS.correct, /text-cream/);
  assert.match(LIQUID_CLASS.wrong, /text-coral/);
  assert.match(LIQUID_CLASS.correct, /text-maroon/);
  assert.match(colours, /--rose-line:\s*#e8a9b6/i);
  assert.match(colours, /--blush:\s*#f4d7d4/i);
  assert.match(colours, /--coral:\s*#ff6b6b/i);
  assert.match(colours, /--brand-maroon:\s*#5c0f24/i);
  assert.match(LIQUID_LEVEL.waiting, /^$/); // no liquid before the button is pressed
  assert.match(LIQUID_LEVEL.checking, /liquid-level-checking/); // it rises while checking
  assert.match(LIQUID_LEVEL.correct, /liquid-level-full/); // and fills when the code is right
  // the boxes show the same three states
  const ce = code("src/components/code/CodeEntry.tsx");
  assert.match(ce, /state === "wrong" \? "border-coral" : state === "correct" \? "border-maroonink"/);
});

// ---------------------------------------------------------------- the Verify button
test("the Verify button leans toward the mouse a little, only for a real mouse, never with Reduce Motion", () => {
  const vb = code("src/components/code/VerifyButton.tsx");
  assert.match(vb, /onPointerMove=\{pull\}/);
  assert.match(vb, /e\.pointerType !== "mouse" \|\| reduced\(\)/);
  assert.match(vb, /onPointerLeave=\{settle\}/); // it settles back
  assert.match(vb, /-m-4 p-4/); // it starts leaning a little before the pointer arrives
  // small and limited
  assert.deepEqual(lean(0, 0), { x: 0, y: 0 });
  assert.deepEqual(lean(1000, 1000), { x: 8, y: 5 });
  assert.deepEqual(lean(-1000, -1000), { x: -8, y: -5 });
  const small = lean(20, 10);
  assert.ok(Math.abs(small.x) < 8 && Math.abs(small.y) < 5 && small.x > 0 && small.y > 0); // toward the pointer
});

test("pressing starts a two-wave liquid; a right code fills it, the letters DROP and 'Verified' drops in", () => {
  const vb = code("src/components/code/VerifyButton.tsx");
  assert.match(vb, /liquid-wave liquid-wave-a/);
  assert.match(vb, /liquid-wave liquid-wave-b/); // two waves
  assert.equal([...vb.matchAll(/<path /g)].length, 2);
  assert.match(vb, /letter-in/); // the new word's letters drop in
  assert.match(vb, /letters-out/); // the old word's letters drop away
  assert.match(vb, /FILL_MS/); // the word changes only after the liquid has filled
  assert.deepEqual([en.codeEntry.verify, en.codeEntry.checking, en.codeEntry.verified, en.codeEntry.tryAgain], ["Verify", "Checking", "Verified", "Try again"]);
  assert.match(vb, /type="submit"/);
});

test("with Reduce Motion there are no waves, no dropping letters and no leaning: only the colour and the word change", () => {
  const first = css.indexOf(".liquid { position: absolute");
  assert.ok(first > 0);
  // all of these appear ONLY inside the no-preference block
  for (const rule of ["animation: wave-a", "animation: wave-b", "animation: letter-in", "animation: letter-out", ".letters-out { display: inline-flex", ".liquid { transition"]) {
    const at = css.indexOf(rule);
    assert.ok(at > 0, rule);
    const open = css.lastIndexOf("@media (prefers-reduced-motion: no-preference) {", at);
    assert.ok(open > first && at < css.indexOf("\n}\n", open), `${rule} is not inside the no-preference block`);
  }
  assert.match(css, /\.letters-out \{ display: none; \}/); // the dropping old word is hidden otherwise
  // after a correct code the next page opens quickly with Reduce Motion
  assert.equal(successWait(false), SUCCESS_WAIT_MS);
  assert.equal(successWait(true), SUCCESS_WAIT_REDUCED_MS);
  assert.ok(SUCCESS_WAIT_REDUCED_MS < SUCCESS_WAIT_MS);
});

// ---------------------------------------------------------------- used on every code screen
test("the Log in page, the sign-up and log-in form and the team log-in all use the new code screen", () => {
  for (const f of ["src/components/account/LoginForm.tsx", "src/components/account/AuthForm.tsx", "src/components/admin/AdminLogin.tsx"]) {
    const c = code(f);
    assert.match(c, /<CodeEntry/, f);
    assert.match(c, /<VerifyButton state=\{status\} \/>/, f);
    assert.doesNotMatch(c, /autoComplete="one-time-code"/, f); // the plain box is gone
    assert.match(c, /setStatus\("checking"\)/, f);
    assert.match(c, /setStatus\("wrong"\)/, f);
    assert.match(c, /if \(status === "wrong"\) setStatus\("waiting"\)/, f); // typing again clears the red
  }
  // a right code shows "Verified" before moving on
  for (const f of ["src/components/account/LoginForm.tsx", "src/components/account/AuthForm.tsx"]) assert.match(code(f), /setStatus\("correct"\)[\s\S]{0,260}successWait\(/, f);
  assert.match(code("src/components/admin/AdminLogin.tsx"), /setStatus\("correct"\)/);
  // the rules about the code did not change: 6 numbers on the log-in pages, 6 to 8 on the sign-up form
  assert.match(code("src/components/account/LoginForm.tsx"), /\^\\d\{6\}\$/);
  assert.match(code("src/components/account/AuthForm.tsx"), /maxLength=\{8\}/);
});

test("the new parts use no colour codes and no emoji", () => {
  for (const f of ["src/components/code/CodeEntry.tsx", "src/components/code/VerifyButton.tsx", "src/lib/codeEntry.ts", "src/components/Skeleton.tsx"]) {
    assert.doesNotMatch(code(f), /#[0-9a-fA-F]{3,8}\b/, f);
    assert.doesNotMatch(code(f), /\p{Extended_Pictographic}/u, f);
  }
});
