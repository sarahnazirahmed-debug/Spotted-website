"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type EndSession = () => Promise<void>;
type SignOutState = { pending: boolean; start: (endSession: EndSession) => Promise<void> };
const SignOutContext = createContext<SignOutState | null>(null);

export function DashboardSignOut({ children }: { children: ReactNode }) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const [farewell, setFarewell] = useState("");

  async function start(endSession: EndSession) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(false);
    try {
      await endSession();
      setFarewell(new Date().getHours() >= 18 ? "Good night" : "See you soon");
    } catch {
      busy.current = false;
      setPending(false);
      setError(true);
    }
  }

  useEffect(() => {
    if (!farewell) return;
    const timer = window.setTimeout(() => router.replace("/login"), 1000);
    return () => window.clearTimeout(timer);
  }, [farewell, router]);

  if (farewell) return (
    <main className="grid min-h-dvh place-items-center bg-[var(--brand-maroon)] text-cream">
      <h1 className="font-brand text-5xl font-bold">{farewell}</h1>
    </main>
  );

  return (
    <SignOutContext.Provider value={{ pending, start }}>
      {error && <p role="alert" className="fixed inset-x-0 top-0 z-50 bg-panel p-4 text-center text-onpanel">Could not confirm sign-out. Please try again.</p>}
      {children}
    </SignOutContext.Provider>
  );
}

export function SignOutButton({ endSession, className, children }: {
  endSession: EndSession; className: string; children: ReactNode;
}) {
  const state = useContext(SignOutContext);
  if (!state) throw new Error("SignOutButton requires DashboardSignOut");
  return <button type="button" className={className} disabled={state.pending} onClick={() => void state.start(endSession)}>{children}</button>;
}
