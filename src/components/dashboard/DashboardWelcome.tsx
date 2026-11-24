"use client";

import { useEffect, useState, type ReactNode } from "react";
import styles from "./DashboardWelcome.module.css";

const seenKey = "spotted-dashboard-welcome-at";
const day = 24 * 60 * 60 * 1000;
let lastSeenInTab = 0;

function welcomeDue() {
  let seen = lastSeenInTab;
  try {
    const stored = Number(localStorage.getItem(seenKey));
    if (Number.isFinite(stored) && stored <= Date.now()) seen = Math.max(seen, stored);
  } catch { /* Storage may be disabled. The current tab still remembers. */ }
  return !seen || Date.now() - seen >= day;
}

function greeting(name?: string) {
  const first = name?.trim().replace(/^(?:(?:mr|mrs|ms|miss|dr|prof)\.?\s+)+/i, "").split(/\s+/)[0];
  if (!first || first.includes("@")) return "Hello";
  const hour = new Date().getHours();
  const words = hour < 4 ? "Hello" : hour < 12 ? "Good morning" : hour < 16 ? "Good afternoon" : "Good evening";
  return words + ", " + first;
}

// Mounted only after the dashboard confirms access on a desktop-sized screen.
export default function DashboardWelcome({ name, children }: { name?: string; children: ReactNode }) {
  const [show, setShow] = useState(welcomeDue);
  useEffect(() => {
    if (!show) return;
    lastSeenInTab = Date.now();
    try { localStorage.setItem(seenKey, String(lastSeenInTab)); } catch { /* Use the tab fallback. */ }
    const timer = window.setTimeout(() => setShow(false), 1800);
    return () => window.clearTimeout(timer);
  }, [show]);
  if (!show) return children;
  return (
    <main className={styles.screen} aria-label="Welcome">
      <span className={styles.brand}>Spotted</span>
      <p className={styles.greeting}>{greeting(name)}</p>
    </main>
  );
}
