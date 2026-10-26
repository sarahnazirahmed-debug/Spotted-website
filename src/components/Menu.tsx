"use client";

// The three-dot menu: pick a story, or switch between the 3D and the simple version.
import { useState } from "react";
import { STORY_LIST, type StoryId } from "@/lib/story";

export default function Menu({
  current,
  lite,
  onStory,
  onToggleLite,
}: {
  current: StoryId;
  lite: boolean;
  onStory: (id: StoryId) => void;
  onToggleLite: () => void;
}) {
  const [open, setOpen] = useState(false);
  const item =
    "flex min-h-11 w-full items-center rounded-xl px-4 text-left text-base font-bold text-deep active:bg-lilac/60";
  return (
    <div className="pointer-events-auto relative">
      <button
        type="button"
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex size-11 items-center justify-center rounded-full bg-white/20 backdrop-blur"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="#fff">
          <circle cx="12" cy="5" r="2.2" />
          <circle cx="12" cy="12" r="2.2" />
          <circle cx="12" cy="19" r="2.2" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 w-56 rounded-2xl bg-white p-2 shadow-xl">
          {STORY_LIST.map((s) => (
            <button
              key={s.id}
              role="menuitem"
              type="button"
              className={`${item} ${!lite && s.id === current ? "bg-lilac/50" : ""}`}
              onClick={() => {
                setOpen(false);
                onStory(s.id);
              }}
            >
              {s.label === "You" ? "Your story" : `${s.label} story`}
            </button>
          ))}
          <div className="my-1 h-px bg-lilac" />
          <button
            role="menuitem"
            type="button"
            className={item}
            onClick={() => {
              setOpen(false);
              onToggleLite();
            }}
          >
            {lite ? "3D version" : "Simple version"}
          </button>
        </div>
      )}
    </div>
  );
}
