// Reel links: find the platform, clean the link, make the unique "link key", read @creator from TikTok.
// We only store the LINK and place facts. We never fetch or copy the video, photos or captions.

export type Platform = "instagram" | "tiktok" | "youtube";

export type LinkInfo =
  | { ok: true; platform: Platform; linkKey: string; url: string; creator?: string }
  | { ok: false; reason: string };

const ID = "[A-Za-z0-9._-]+";

export function readReelLink(input: string): LinkInfo {
  const text = input.trim();
  if (!text) return { ok: false, reason: "Paste a link first." };
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return { ok: false, reason: "That does not look like a link." };
  }
  const host = u.hostname.toLowerCase().replace(/^(www|m|vm|vt)\./, "");
  const path = u.pathname.replace(/\/+$/, "");

  // ---- Instagram: /reel/ABC, /reels/ABC, /p/ABC, /tv/ABC (also /username/reel/ABC) ----
  if (host === "instagram.com" || host === "instagr.am") {
    const m = path.match(new RegExp(`/(?:reels?|p|tv)/(${ID})$`));
    if (!m) return { ok: false, reason: "That Instagram link is not a reel or post link." };
    return { ok: true, platform: "instagram", linkKey: `instagram/${m[1]}`, url: `https://www.instagram.com/reel/${m[1]}/` };
  }

  // ---- TikTok: /@creator/video/123. Short links (vm.tiktok.com, /t/xxx) hide the video number. ----
  if (host === "tiktok.com") {
    const full = path.match(new RegExp(`^/(@[A-Za-z0-9._-]+)/video/(\\d+)$`));
    if (full) {
      return {
        ok: true,
        platform: "tiktok",
        linkKey: `tiktok/${full[2]}`,
        url: `https://www.tiktok.com/${full[1]}/video/${full[2]}`,
        creator: full[1],
      };
    }
    return { ok: false, reason: "That is a short TikTok link. Open the video and paste the full link (it has @name/video/number)." };
  }

  // ---- YouTube: watch?v=abc, youtu.be/abc, /shorts/abc ----
  if (host === "youtube.com" || host === "youtu.be") {
    let id = "";
    if (host === "youtu.be") id = path.slice(1);
    else if (path === "/watch") id = u.searchParams.get("v") ?? "";
    else {
      const s = path.match(new RegExp(`^/(?:shorts|embed|live)/(${ID})$`));
      id = s ? s[1] : "";
    }
    if (!new RegExp(`^${ID}$`).test(id)) return { ok: false, reason: "That YouTube link does not have a video in it." };
    const short = path.startsWith("/shorts/");
    return {
      ok: true,
      platform: "youtube",
      linkKey: `youtube/${id}`,
      url: short ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
    };
  }

  return { ok: false, reason: "Only Instagram, TikTok and YouTube links are supported." };
}
