// SPOTTED: EMAIL THE OWNER WHEN A NEW APPLICATION ARRIVES (a Supabase Edge Function, runs on Deno, not in the website).
//
// How it is started: a Database Webhook on INSERT into public.applications calls this function (steps in
// supabase/functions/notify-application/README.md). It then sends ONE email to the owner through Resend.
// The email holds only the kind and the name (no documents, no date of birth, no phone). The owner opens
// /admin/applications to read the rest.
//
// Secrets it needs (set in Supabase > Edge Functions > Secrets, never in the website or in Git):
//   RESEND_API_KEY   the key from resend.com
//   OWNER_EMAIL      where the email goes
//   WEBHOOK_SECRET   a long random text; the webhook sends it in the header "x-webhook-secret" so nobody else can start this function
//   FROM_EMAIL       (optional) the sender. Until you have your own domain, leave it empty: "Spotted <onboarding@resend.dev>" is used.

Deno.serve(async (req: Request) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET") || !Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("Not allowed", { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const row = body?.record;
  if (body?.type !== "INSERT" || !row) return new Response("Nothing to do", { status: 200 });

  const kind = row.kind === "partner" ? "Partner" : row.join_type === "founding" ? "Founding Insider" : "Insider";
  const who = String(row.business_name || row.contact_name || "Someone").slice(0, 120);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: Deno.env.get("FROM_EMAIL") || "Spotted <onboarding@resend.dev>",
      to: [Deno.env.get("OWNER_EMAIL")],
      subject: `New Spotted application: ${kind}`,
      text: `A new ${kind} application arrived from ${who}.\n\nOpen the admin area, then Applications, to read it and approve or decline it.`,
    }),
  });
  return new Response(res.ok ? "Sent" : "Email failed", { status: res.ok ? 200 : 502 });
});
