// The /signup and /login pages: a header and the form card.
import SiteChrome from "../SiteChrome";
import Footer from "../Footer";
import PageHeader from "../pages/PageHeader";
import AuthForm from "./AuthForm";
import { FEATURES } from "@/config/features";

export default function AccountPage({ mode }: { mode: "signup" | "login" }) {
  const signup = mode === "signup";
  return (
    <>
      <PageHeader
        chip={signup ? "Sign up" : "Log in"}
        title={signup ? "Join Spotted." : "Welcome back."}
        lead={signup ? "Make your account now. We will send you a one-time code by email." : "We will send you a one-time code by email."}
      />
      <main className="bg-page px-5 py-16 text-onpage md:py-24">
        <div className="mx-auto max-w-lg rounded-3xl bg-brand p-8 text-white md:p-10">
          <AuthForm mode={mode} />
        </div>
        <p className="mx-auto mt-6 max-w-lg text-center text-base font-bold">
          {signup ? (
            <>
              Already have an account? <a href="/login" className="underline">Log in</a>
            </>
          ) : (
            <>
              New here? <a href="/signup" className="underline">Sign up</a>
            </>
          )}
        </p>
      </main>
      {FEATURES.footer && <Footer />}
      <SiteChrome alwaysVisible />
    </>
  );
}
