# How to add a helper (today, two short forms)

A helper needs TWO things: a place in the staff dashboard (what they can see) and a place on the Pin Desk team (so the database lets them add reels).

## One time: add Muhammad as Associate (so he can add people too)
1. Open the website `/admin/team` (you are the main admin).
2. Type Muhammad's email and name, choose **Associate**, click **Add**.

## For every new helper (add them ONE AT A TIME)
**A. The staff dashboard (what they can see)**
1. Open the staff dashboard and sign in as yourself.
2. Go to the team page and click **Add a team member**.
3. Type their name and work email. Role: **Staff**. Choose a department and a **5 or 6** day week.
4. Tick **Pin Desk** (only tick what you want them to see). Save.
   (Behind the scenes this adds them to `approved_staff` and gives them `staff_access`.)

**B. The Pin Desk team (so they can add reels)**
1. Open the website `/admin/team`.
2. Type the same email and name, choose **Helper**, click **Add**. The change is written to the log (`team_log`) by itself.

**C. Tell them**
1. Open the dashboard or the website, type your email, then the 6-digit code that arrives in your inbox.

## Warning: only a few codes per hour
Supabase's free built-in email sends only a **few codes per hour for the whole project**. If many people ask for a code at once, some will wait. Add and test helpers **one at a time**, and ask each person to request their code only once.
