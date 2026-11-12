"use client";

// THE "RATE US" STAR. No sign-in needed.
//   * A star floats on the right side. TAP it: it grows into a card (the page behind goes blurry) with Website or App,
//     five mouth-only faces (no eyes) with a note that changes, an optional note, and the Submit button (letters drop to "Submitted").
//   * After rating, the card becomes the chosen face and says thank you, closes by itself after about 5 seconds, and the star is
//     "vacuumed" off the right edge. It stays away for THIS VISIT only (sessionStorage) and is back next visit.
//   * The close cross is hidden at first. It fades in after the visitor has been still on the card for 2.5 seconds (3 on phones).
//     Any tap, slide, click or typing hides it again and restarts the wait. Escape also closes. Closing shrinks the card into the star.
//   * DRAG the star (more than 6px) to the bin at the bottom (it fades in, the lid opens) to hide it for good (localStorage).
//     The footer's "Rate us" link always opens the card, even when the star is hidden.
//   * Safety: a hidden honeypot box, a rate limit (here and in the database), and a table that only accepts new rows.
// With Reduce Motion: no growing, shrinking, floating, vacuum or lid; things just appear and disappear.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { text } from "@/content";
import { getSupabase } from "@/lib/supabase";
import { successWait, type CodeState } from "@/lib/codeEntry";
import {
  AUTO_CLOSE_MS, KEYS, NOTE_MAX, RATE_OPEN_EVENT, RATINGS, buildRow, crossDelay, isDrag, isHoneypotFilled, newVisitorKey, overBin, rateLimited,
  type About, type Rating,
} from "@/lib/ratingStar";
import VerifyButton from "../code/VerifyButton";
import RateFace from "./RateFace";

const t = text.rate;
const SUBMIT_WORDS = { verify: t.submit, checking: t.sending, tryAgain: t.tryAgain, verified: t.submitted };
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isPhone = () => window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 640;

// ---- what is remembered (a visit, or for good). If the browser blocks storage we remember in memory instead.
const memory = new Set<string>();
const listeners = new Set<() => void>();
const store = (kind: "local" | "session") => (kind === "local" ? localStorage : sessionStorage);
function readFlag(kind: "local" | "session", key: string): boolean {
  if (memory.has(key)) return true;
  try {
    return store(kind).getItem(key) === "1";
  } catch {
    return false;
  }
}
function setFlag(kind: "local" | "session", key: string) {
  memory.add(key);
  try {
    store(kind).setItem(key, "1");
  } catch {
    // blocked: it is remembered until the page closes
  }
  listeners.forEach((l) => l());
}
const useFlag = (kind: "local" | "session", key: string) =>
  useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => readFlag(kind, key),
    () => false,
  );

function visitorKey(): string {
  try {
    let k = localStorage.getItem(KEYS.visitor);
    if (!k) {
      k = newVisitorKey();
      localStorage.setItem(KEYS.visitor, k);
    }
    return k;
  } catch {
    return newVisitorKey();
  }
}
const readTimes = (): number[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEYS.times) ?? "[]");
    return Array.isArray(v) ? v.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
};
const saveTime = () => {
  try {
    localStorage.setItem(KEYS.times, JSON.stringify([...readTimes(), Date.now()].slice(-10)));
  } catch {
    // not remembered: the database still limits
  }
};
const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms));

type Phase = "idle" | "open" | "thanks" | "closing";

export default function RateStar() {
  const pathname = usePathname();
  const hiddenForGood = useFlag("local", KEYS.hidden);
  const ratedThisVisit = useFlag("session", KEYS.rated);
  const [vacuum, setVacuum] = useState(false);
  const starShown = !hiddenForGood && (!ratedThisVisit || vacuum);

  const [phase, setPhase] = useState<Phase>("idle");
  const [about, setAbout] = useState<About>("website");
  const [rating, setRating] = useState<Rating | null>(null);
  const [note, setNote] = useState("");
  const [honey, setHoney] = useState("");
  const [status, setStatus] = useState<CodeState>("waiting");
  const [message, setMessage] = useState("");
  const [crossVisible, setCrossVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [binOpen, setBinOpen] = useState(false);
  const [toast, setToast] = useState("");

  const star = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const bin = useRef<HTMLDivElement>(null);
  const origin = useRef({ x: 0, y: 0 });
  const returnFocus = useRef<HTMLElement | null>(null);
  const crossTimer = useRef<number | undefined>(undefined);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const binOpenRef = useRef(false);

  const open = useCallback((from?: { x: number; y: number }) => {
    const r = star.current?.getBoundingClientRect();
    origin.current = from ?? (r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight - 40 });
    returnFocus.current = document.activeElement as HTMLElement | null;
    setRating(null);
    setNote("");
    setHoney("");
    setMessage("");
    setStatus("waiting");
    setCrossVisible(false);
    setPhase("open");
  }, []);

  // the footer's "Rate us" link
  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ x: number; y: number }>).detail;
      setPhase((p) => {
        if (p === "idle") window.setTimeout(() => open(d), 0);
        return p;
      });
    };
    window.addEventListener(RATE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(RATE_OPEN_EVENT, onOpen);
  }, [open]);

  // the cross: hidden until the visitor has been still on the card for a while
  const schedule = useCallback(() => {
    window.clearTimeout(crossTimer.current);
    crossTimer.current = window.setTimeout(() => setCrossVisible(true), crossDelay(isPhone()));
  }, []);
  const bump = useCallback(() => {
    setCrossVisible(false);
    schedule();
  }, [schedule]);

  const finishClose = useCallback((afterRating: boolean) => {
    setPhase("idle");
    returnFocus.current?.focus?.();
    if (afterRating) {
      if (starShown && !reduced()) setVacuum(true); // the star is vacuumed off the right edge
      else setFlag("session", KEYS.rated);
    }
  }, [starShown]);

  const close = useCallback(
    (afterRating: boolean) => {
      if (phase === "closing" || phase === "idle") return;
      window.clearTimeout(crossTimer.current);
      setPhase("closing");
      const c = card.current;
      if (!c || reduced()) return finishClose(afterRating);
      const s = star.current?.getBoundingClientRect();
      const to = s ? { x: s.left + s.width / 2, y: s.top + s.height / 2 } : origin.current;
      const r = c.getBoundingClientRect();
      const a = c.animate(
        [{ transform: "none", opacity: 1 }, { transform: `translate(${to.x - (r.left + r.width / 2)}px, ${to.y - (r.top + r.height / 2)}px) scale(0.1)`, opacity: 0 }],
        { duration: 320, easing: "cubic-bezier(0.5, 0, 0.8, 0.4)", fill: "forwards" },
      );
      a.finished.then(() => finishClose(afterRating), () => finishClose(afterRating));
    },
    [phase, finishClose],
  );

  // opening: the card grows out of the star, and the first control gets the focus
  useEffect(() => {
    if (phase !== "open") return;
    const c = card.current;
    if (c && !reduced()) {
      const r = c.getBoundingClientRect();
      c.animate(
        [{ transform: `translate(${origin.current.x - (r.left + r.width / 2)}px, ${origin.current.y - (r.top + r.height / 2)}px) scale(0.1)`, opacity: 0.2 }, { transform: "none", opacity: 1 }],
        { duration: 380, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
      );
    }
    c?.querySelector<HTMLElement>("input,textarea,button")?.focus();
  }, [phase]);

  // the close cross waits for the visitor to be still (on the rating screen and on the thank-you screen)
  useEffect(() => {
    if (phase !== "open" && phase !== "thanks") return;
    schedule();
    return () => window.clearTimeout(crossTimer.current);
  }, [phase, schedule]);

  // the page behind stays still while the card is up
  const locked = phase !== "idle";
  useEffect(() => {
    if (!locked) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, [locked]);

  useEffect(() => {
    if (phase !== "open" && phase !== "thanks") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(phase === "thanks");
      } else if (e.key === "Tab" && card.current) {
        const f = [...card.current.querySelectorAll<HTMLElement>("button,input,textarea,[href]")].filter((el) => !el.hasAttribute("disabled") && el.tabIndex >= 0 && el.offsetParent !== null);
        if (f.length === 0) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [phase, close]);

  // after thank you: the card closes by itself
  useEffect(() => {
    if (phase !== "thanks") return;
    const id = window.setTimeout(() => close(true), AUTO_CLOSE_MS);
    return () => window.clearTimeout(id);
  }, [phase, close]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 5000);
    return () => window.clearTimeout(id);
  }, [toast]);

  async function thanks() {
    setStatus("correct");
    await sleep(successWait(reduced()));
    setPhase("thanks");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "checking" || status === "correct") return;
    if (!rating) {
      setStatus("wrong");
      return setMessage(t.pickFace);
    }
    if (isHoneypotFilled(honey)) {
      // a robot filled the hidden box: look successful, send nothing
      setStatus("checking");
      await sleep(900);
      return thanks();
    }
    const limit = rateLimited(readTimes(), Date.now());
    if (limit !== "ok") {
      setStatus("wrong");
      return setMessage(limit === "gap" ? t.tooFast : t.tooMany);
    }
    const supabase = getSupabase();
    if (!supabase) {
      setStatus("wrong");
      return setMessage(t.cannotSend);
    }
    setStatus("checking");
    const { error } = await supabase.from("star_feedback").insert(buildRow({ about, rating, note, page: pathname ?? "", visitor: visitorKey() }));
    if (error) {
      setStatus("wrong");
      return setMessage(/too many/i.test(error.message) ? t.tooMany : t.cannotSend);
    }
    saveTime();
    await thanks();
  }

  // ---- dragging the star to the bin
  function hideForGood() {
    setFlag("local", KEYS.hidden);
    setToast(t.hiddenNote);
    if (phase === "open") close(false);
  }
  function onDown(e: React.PointerEvent<HTMLButtonElement>) {
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    const el = star.current;
    if (!d || !el) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && !isDrag(dx, dy)) return; // 6px or less is still a tap
    if (!d.moved) {
      d.moved = true;
      setDragging(true);
      el.style.transition = "none";
    }
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    const b = bin.current?.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const over = !!b && overBin(r, b);
    if (over !== binOpenRef.current) {
      binOpenRef.current = over;
      setBinOpen(over);
    }
  }
  function onUp(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    const el = star.current;
    drag.current = null;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    if (!d?.moved || !el) return; // a tap: the click that follows opens the card
    suppressClick.current = true; // the click after a drag must not open the card
    window.setTimeout(() => (suppressClick.current = false), 0);
    setDragging(false);
    const hit = binOpenRef.current;
    binOpenRef.current = false;
    setBinOpen(false);
    if (hit) {
      const b = bin.current?.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (b && !reduced()) {
        el.style.transition = "transform 0.3s ease-in, opacity 0.3s ease-in";
        el.style.transform = `${el.style.transform} translate(${b.left + b.width / 2 - (r.left + r.width / 2)}px, ${b.top + b.height / 2 - (r.top + r.height / 2)}px) scale(0.2)`;
        el.style.opacity = "0";
        window.setTimeout(hideForGood, 320);
      } else hideForGood();
    } else {
      el.style.transition = reduced() ? "none" : "transform 0.25s ease-out";
      el.style.transform = "";
    }
  }

  const word = rating ? t.notes[rating - 1] : t.pickFace;
  const showCard = phase !== "idle";

  return (
    <>
      {starShown && (
        <button
          ref={star}
          type="button"
          aria-label={t.star}
          title={t.star}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onClick={() => {
            if (suppressClick.current) return;
            open();
          }}
          onAnimationEnd={(e) => {
            if (e.animationName === "rate-star-vacuum") {
              setVacuum(false);
              setFlag("session", KEYS.rated);
            }
          }}
          style={{ touchAction: "none" }}
          className={`fixed right-2 top-[58%] z-30 flex size-12 select-none items-center justify-center rounded-full bg-coral text-oncoral shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral ${vacuum ? "rate-star-vacuum" : ""}`}
        >
          <span className="rate-star-float flex">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3l2.800 5.800 6.200.8-4.600 4.300 1.200 6.100L12 17l-5.600 3 1.200-6.100L3 9.600l6.200-.8z" />
            </svg>
          </span>
        </button>
      )}

      {/* the bin: fades in while the star is dragged; the lid opens when the star is over it */}
      <div ref={bin} aria-hidden="true" className={`rate-bin fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-1 text-onbar ${dragging ? "opacity-100" : "opacity-0"}`}>
        <svg width="56" height="64" viewBox="0 0 28 32" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="rounded-xl bg-bar p-2">
          <g className={`rate-bin-lid ${binOpen ? "rate-bin-lid-open" : ""}`}>
            <path d="M4 8h20" />
            <path d="M11 8V5h6v3" />
          </g>
          <path d="M6 11l1.400 15h13.200L22 11" />
          <path d="M11.500 15v7M16.500 15v7" />
        </svg>
        <span className="rounded-full bg-bar px-3 py-1 text-xs font-bold">{t.binLabel}</span>
      </div>

      {toast && (
        <p role="status" className="fixed bottom-20 left-1/2 z-40 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl bg-bar px-4 py-3 text-center text-sm font-bold text-onbar shadow-xl">
          {toast}
        </p>
      )}

      {showCard && (
        <div className="rate-backdrop fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4 backdrop-blur-sm">
          <div
            ref={card}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rate-title"
            onPointerDown={bump}
            onPointerMove={(e) => (e.pointerType !== "mouse" || e.buttons > 0) && bump()}
            onTouchMove={bump}
            onWheel={bump}
            onKeyDown={bump}
            onInput={bump}
            onClick={bump}
            className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-rosesoft bg-card p-6 text-darktext shadow-2xl sm:p-8"
          >
            <button
              type="button"
              aria-label={t.close}
              aria-hidden={!crossVisible}
              tabIndex={crossVisible ? 0 : -1}
              onClick={() => close(phase === "thanks")}
              className={`rate-cross absolute right-3 top-3 flex size-11 items-center justify-center rounded-full text-maroonink hover:bg-pinktint focus-visible:outline-2 focus-visible:outline-coral ${crossVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            {phase === "thanks" || (phase === "closing" && status === "correct") ? (
              <div className="grid justify-items-center gap-4 py-6 text-center" role="status">
                {rating && <RateFace level={rating} size={96} className="text-coral" />}
                <p id="rate-title" className="font-brand text-2xl font-bold text-maroonink">{t.thanks}</p>
              </div>
            ) : (
              <form onSubmit={submit} noValidate className="grid gap-5">
                <h2 id="rate-title" className="pr-10 font-brand text-2xl font-bold text-maroonink">{t.title}</h2>

                <fieldset>
                  <legend className="mb-2 text-sm font-bold">{t.aboutLabel}</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(["website", "app"] as const).map((k) => (
                      <label key={k} className={`flex min-h-12 cursor-pointer items-center justify-center rounded-full border-2 px-4 text-center font-extrabold focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-coral ${about === k ? "border-maroonink bg-maroon text-cream" : "border-rosesoft text-darktext"}`}>
                        <input type="radio" name="about" value={k} checked={about === k} onChange={() => setAbout(k)} className="sr-only" />
                        {k === "website" ? t.website : t.app}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-2 text-sm font-bold">{t.faceLabel}</legend>
                  <div className="flex justify-between gap-1">
                    {RATINGS.map((n) => (
                      <label key={n} className={`flex size-14 cursor-pointer items-center justify-center rounded-2xl border-2 transition focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-coral ${rating === n ? "border-coral bg-coral text-oncoral" : "border-rosesoft text-maroonink hover:bg-pinktint"}`}>
                        <input
                          type="radio"
                          name="rating"
                          value={n}
                          checked={rating === n}
                          aria-label={t.faceName(n)}
                          onChange={() => {
                            setRating(n);
                            setMessage("");
                            if (status === "wrong") setStatus("waiting");
                          }}
                          className="sr-only"
                        />
                        <RateFace level={n} size={36} />
                      </label>
                    ))}
                  </div>
                  <p aria-live="polite" className="mt-3 min-h-6 text-center font-bold text-maroonink">{word}</p>
                </fieldset>

                <div>
                  <label htmlFor="rate-note" className="mb-1 block text-sm font-bold">{t.noteLabel}</label>
                  <textarea id="rate-note" rows={3} maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-xl border border-rosesoft bg-pagebase px-3 py-2 text-base text-darktext outline-none focus:ring-4 focus:ring-coral/40" />
                </div>

                {/* the honeypot: people never see it; a robot fills it in */}
                <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  <label>
                    {t.honeypotLabel}
                    <input type="text" name="website" tabIndex={-1} autoComplete="off" value={honey} onChange={(e) => setHoney(e.target.value)} />
                  </label>
                </div>

                {message && <p role="alert" className="text-sm font-bold text-problem">{message}</p>}
                <VerifyButton state={status} words={SUBMIT_WORDS} />
                <button type="button" onClick={hideForGood} className="min-h-11 text-sm font-semibold text-mutedtext underline">
                  {t.hideForGood}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
