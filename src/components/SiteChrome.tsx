"use client";

// The parts that float over every page: the top bar (with the sun/moon theme button), the WhatsApp button and the Rate us star.
// (The pull-string lamp is retired; its switch `themeLamp` stays OFF.)
import { FEATURES } from "@/config/features";
import TopBar from "./TopBar";
import WhatsApp from "./WhatsApp";
import RateStar from "./rate/RateStar";

// alwaysVisible: show the top bar from the start (pages with no full-screen landing section).
export default function SiteChrome({ alwaysVisible = false }: { alwaysVisible?: boolean }) {
  return (
    <>
      {FEATURES.topBar && <TopBar alwaysVisible={alwaysVisible} />}
      {FEATURES.whatsappButton && <WhatsApp />}
      {FEATURES.feedbackStar && <RateStar />}
    </>
  );
}
