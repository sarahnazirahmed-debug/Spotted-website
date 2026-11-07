# Email the owner when a new application arrives

You do this once, in the Supabase website. It needs a free Resend account (resend.com). No domain is needed to start:
Resend can send from `onboarding@resend.dev` to the email address you signed up with.

1. In Resend: make an account with the email where you want the alerts, then create an API key.
2. In Supabase: Edge Functions > Deploy a new function > name it `notify-application` > paste `index.ts` > Deploy.
   (Turn OFF "Verify JWT" for this function: the webhook secret protects it instead.)
3. Edge Functions > Secrets: add `RESEND_API_KEY`, `OWNER_EMAIL` (your email) and `WEBHOOK_SECRET` (a long random text you make up).
4. Database > Webhooks > Create a new hook: table `applications`, event `Insert`, type `Supabase Edge Functions`,
   function `notify-application`, and add the HTTP header `x-webhook-secret` with the same secret as in step 3.
5. Test: send an application from the website. An email "New Spotted application" should arrive within a minute.
