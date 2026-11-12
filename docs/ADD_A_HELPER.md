# How to add a helper (one form)

The form in the staff dashboard now does both jobs at once.

## One time: add Muhammad as Associate (so he can add people too)
1. Open the website `/admin/team` (you are the main admin).
2. Type Muhammad's email and name, choose **Associate**, click **Add**.

## For every new helper (add them ONE AT A TIME)
1. Open the staff dashboard and sign in as yourself or Muhammad (only the two owners see the button).
2. Go to **My Desk, Team members** and click **Add team member**.
3. Type their name and work email. Role: **Staff**. Choose a department and a **5 or 6** day week.
4. Tick **Pin Desk** (only tick what you want them to see). Save.
   One save does everything: the dashboard list, the sections they can see, the Pin Desk team (as **Helper**), and a line in the log (`team_log`).
5. Tell them to open the dashboard (or the Pin Desk page), type their email, then the 6-digit code from their inbox.

## Warning: only a few codes per hour
Supabase's free built-in email sends only a **few codes per hour for the whole project**. If many people ask for a code at once, some will wait. Add and test helpers **one at a time**, and ask each person to request their code only once.
