"use client";

// The parts that float over every page: top bar, WhatsApp button, light/dark lamp.
// (The home page adds the same three itself, because it also switches stories.)
import { FEATURES } from "@/config/features";
import TopBar from "./TopBar";
import WhatsApp from "./WhatsApp";
import ThemeLamp from "./ThemeLamp";

// alwaysVisible: show the top bar from the start (pages with no full-screen landing section).
export default function SiteChrome({ alwaysVisible = false }: { alwaysVisible?: boolean }) {
  return (
    <>
      {FEATURES.topBar && <TopBar alwaysVisible={alwaysVisible} />}
      {FEATURES.whatsappButton && <WhatsApp />}
      {FEATURES.themeLamp && <ThemeLamp />}
    </>
  );
}
