# Spotted website: site rules

These rules are for the Spotted website (this folder). Follow them in every step. If a request clashes with a rule, say so before building.

## 1. Colours (brand colours only)

| Colour | Hex | Use |
|---|---|---|
| Purple | `#6A1FB0` | Main brand colour |
| Deep purple | `#3C096C` | Dark backgrounds, strong text |
| Red | `#E5383B` | Pins, bookmarks, alerts |
| Lilac | `#C9A2FF` | Soft backgrounds, tags |
| Yellow | `#FFD23F` | **Highlights only** (small stickers, one key word, a star) |
| White | `#FFFFFF` | Backgrounds, text on purple |
| Green | `#2BB673` | **Only** for green stars and growth (up arrows, rising bars) |
| WhatsApp green | `#25D366` | **Only** on the WhatsApp button |
| Black | `#000000` or near-black | **Only** for small text |

Any other colour is not allowed. Define colours once as variables (in `globals.css`) and use the variables.

## 2. Font

Poppins only, weights 500, 700 and 800. No other font, no other weight.

## 3. Drawings: never draw people

- Never draw people, faces, eyes, hands or any human figure (no heads, no headscarves on a body, no arms, no silhouettes).
- Draw things instead: pins, phones, roads, cafes, plates, bags, stars, cars without a driver, bookmarks.
- Avoid round shapes that look like eyes (paired headlights, paired windows, a phone camera dot).

## 4. No real social logos

No real Instagram or TikTok logos or look-alikes. Use generic icons (a play triangle in a rounded square, a heart, a bookmark). The WhatsApp button is the only brand icon allowed, and only because the user asked for it.

## 5. Light and dark theme on every page

- Every page and every section works in light and dark.
- Colours come from variables that change with the theme (`prefers-color-scheme`, plus a manual switch later).
- Check text contrast in both themes.

## 6. Mobile first

- Design for a small phone first, then widen for tablet and desktop.
- Tap targets at least 44 x 44.
- No sideways scrolling. Respect the iPhone safe areas.

## 7. Animation needs a still fallback

- Every animation must have a still version (a plain picture, no movement) for slow phones and for people who turned on Reduce Motion.
- The still version shows the same message as the animated one.
- Never make the animation the only way to read something.

## 8. Every big section has an on/off switch

- Every big section of the site can be switched on or off from `src/config/features.ts`.
- One true/false word per section. Never delete a hidden section; to bring it back, change its switch.
- Before the site goes public, check every switch is set the way you want.
