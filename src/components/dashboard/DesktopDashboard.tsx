"use client";

import { useSyncExternalStore, type ReactNode } from "react";

import { DashboardSignOut } from "./DashboardSignOut";

const desktopQuery = "(min-width: 1024px)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

const isDesktop = () => window.matchMedia(desktopQuery).matches;
const serverSnapshot = () => false;

export default function DesktopDashboard({ children }: { children: ReactNode }) {
  const desktop = useSyncExternalStore(subscribe, isDesktop, serverSnapshot);
  return <DashboardSignOut>{desktop ? children : (
    <main className="grid min-h-dvh place-items-center bg-[var(--brand-maroon)] px-6 text-center text-lg font-semibold text-cream min-[1024px]:hidden">
      Please open this dashboard on a laptop or desktop.
    </main>
  )}</DashboardSignOut>;
}
