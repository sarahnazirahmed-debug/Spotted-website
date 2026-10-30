"use client";

// The parts that float over every page: top bar, WhatsApp button, light/dark lamp.
// (The home page adds the same three itself, because it also switches stories.)
import { FEATURES } from "@/config/features";
import TopBar from "./TopBar";
import WhatsApp from "./WhatsApp";
import ThemeLamp from "./ThemeLamp";

export default function SiteChrome() {
  return (
    <>
      {FEATURES.topBar && <TopBar />}
      {FEATURES.whatsappButton && <WhatsApp />}
      {FEATURES.themeLamp && <ThemeLamp />}
    </>
  );
}
