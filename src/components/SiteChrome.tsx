"use client";

// The parts that float over every page: the top bar (with the sun/moon theme button) and the WhatsApp button.
// (The pull-string lamp is retired; its switch `themeLamp` stays OFF.)
import { FEATURES } from "@/config/features";
import TopBar from "./TopBar";
import WhatsApp from "./WhatsApp";

// alwaysVisible: show the top bar from the start (pages with no full-screen landing section).
export default function SiteChrome({ alwaysVisible = false }: { alwaysVisible?: boolean }) {
  return (
    <>
      {FEATURES.topBar && <TopBar alwaysVisible={alwaysVisible} />}
      {FEATURES.whatsappButton && <WhatsApp />}
    </>
  );
}
