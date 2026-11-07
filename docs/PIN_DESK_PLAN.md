# Pin Desk: the plan (plain words)

Written for Step 1. This is a plan only. No code has been written for it yet.

## What the Pin Desk is

The Pin Desk is a private page for the Spotted team, inside `/admin`. The team uses it to put the places
people find in reels into Spotted: which restaurant or shop it is, where it is on the map, and which reel
showed it. It is **website only** and the team logs in with an email and a 6-digit code (that already works,
and stays as it is).

Rules that stay true everywhere: we only store **reel links and place facts**, never copied videos, photos or
captions. Nothing about app users. No launch dates. No emoji, faces or eyes.

## What the home page should look like

- The word **Spotted** at the top.
- Under it, the name of the person who logged in and their title, for example "Sarah Nazir Ahmed, Main admin".
- Three big bars (big buttons, easy to tap on a phone):
  1. **Add reel**
  2. **Add restaurant or shop**
  3. **Add location**
- Links to three lists: **Locations**, **Restaurants**, **Reels**.
- A link to the **Incomplete** list, with a number on it (how many things still need work).

## What already exists

| Piece | State |
|---|---|
| Log-in with an emailed 6-digit code, every time | Built and working. Keep it. |
| Name and title of the person | The top bar already shows "name (Main admin)". It is not on a home page yet. |
| Team roles (main admin, associate, staff, helper) and who may do what | Built, enforced by the database, and tested. |
| First-visit confidentiality tick box | Built. |
| A page for reels at `/admin/pin` | Built: add a reel by pasting its link, clean the link, warn "Already on the desk", edit, search, filters, counts (All, To check, Pinned, Skip, Waiting). |
| Reel details: place name, branch, emirate, country, category, collection, Google Maps link, pin (latitude and longitude), creator, up to 9 dishes with AED prices, offer, notes, status | Built. |
| "Find on Google Maps" button and reading the pin from a pasted Maps link (short links ask for the full link) | Built and tested. |
| Cannot mark a reel Pinned without a place name and a pin | Built, in the website and in the database. |
| "Added by" and "Pinned by" filled in by the database | Built and tested. |
| Excel download and import for reels | Built. |
| Team page, Dashboard page, menu (Pin Desk, Dashboard, Team, Sign out) | Built. |
| Database today | The reels table is **empty** (0 reels), so nothing old needs moving. |

## What is missing

1. **A real home page.** Today `/admin` jumps straight to the reels list.
2. **Restaurants and shops as their own things.** Today a reel only has a place name typed into it. There is no
   list of restaurants or shops, and no way to add one.
3. **Locations as their own things.** Today the pin (map position) is typed into each reel. There is no list of
   locations, and no way to add one.
4. **Linking.** A reel cannot yet say "this is the reel for *that* restaurant at *that* location".
5. **Three lists:** Locations, Restaurants, Reels (the reels list exists, but under the Pin Desk page).
6. **The Incomplete list.**
7. **Database tables** for restaurants/shops and locations (the existing `places` table belongs to paying
   partners, so it cannot be used for the team's own work).

## The idea in three words

- A **restaurant or shop** is the business (for example "Saffron Table").
- A **location** is a place on the map (for example "Saffron Table, Khalifa City branch", with its pin).
  One restaurant can have several locations.
- A **reel** is a link that shows a restaurant or shop at a location.

So a reel points to one restaurant or shop and one location. Fill each thing once, and reuse it.

## The three "add" forms (what each one asks)

**Add reel**: paste the link (Instagram, TikTok or YouTube), then choose the restaurant or shop and the
location (or add a new one on the spot). Plus the details we already have: creator (hidden from app users),
dishes and AED prices, offer, notes, status. The link is cleaned, and the warning "Already on the desk" stays.

**Add restaurant or shop**: name, type (Restaurant or Shop), category (Eat, Shop or Play), what they serve or
sell, notes. The branches are added as locations.

**Add location**: which restaurant or shop it belongs to, branch name, area, emirate, country, the Google Maps
link (read the pin from it, same as today), and the pin numbers. "Find on Google Maps" stays.

## The lists

- **Locations**: every location, with search and filters (emirate, has a pin or not).
- **Restaurants**: every restaurant and shop, with a filter for Restaurant or Shop.
- **Reels**: every reel, with the counts and filters that exist today.
- **Incomplete**: everything that still needs work, with the reason written next to it, and a button to fix it.

## What "Incomplete" means (my proposal)

- A **reel** is incomplete if it has no restaurant or shop, or no location, or its location has no pin.
- A **restaurant or shop** is incomplete if it has no category, or no location yet.
- A **location** is incomplete if it has no pin, or no emirate.

Each row says what is missing, for example "Missing: pin".

## Who can do what

The same as today. Everyone on the team can add and edit. Only the main admin and associates can delete.
The database enforces this, not just the buttons.

## The order I would build it in

Each step ends with: `npm run check`, numbered test steps for you, a commit, and then I stop and wait for
"next". Nothing is pushed unless you say so.

1. **Step 2, the database.** Two new tables (restaurants and shops, locations) and two new links on reels,
   with privacy rules, and tests on a real in-memory database. I will **ask your OK** before putting it in
   your Supabase project.
2. **Step 3, the home page.** Spotted, your name and title, the three bars, and the four links.
3. **Step 4, Add location.**
4. **Step 5, Add restaurant or shop.**
5. **Step 6, Add reel** (choose the restaurant or shop and the location).
6. **Step 7, the three lists** (Locations, Restaurants, Reels).
7. **Step 8, the Incomplete list.**
8. **Step 9, Excel** for the new lists, and a last polish.

I need no new libraries for this. If that changes, I will ask first.

## Questions for you (my answer is in brackets, so you can just say "yes to all")

1. **What is a "Location"?** [A place on the map. A restaurant or shop can have one or more. A location can also
   stand alone, for example a park or a beach for things to do.]
2. **Is the "title" the team role?** [Yes: Main admin, Associate, Staff or Helper, as already stored.]
3. **Is my "Incomplete" list right?** (see above) [Yes.]
4. **The list called "Restaurants":** should it also show shops? [Yes, one list with a Restaurant or Shop filter.]
5. **Which details does a restaurant or shop need** besides name, type, category, what they serve or sell, and
   notes? [None. Keep it to those. Phone and opening hours can come later.]
6. **Old reels:** there are none today, so the existing reel fields (place name, pin) can stay in the table
   for now and be retired later. [Yes, keep, never delete.]
