// A friendly check of an email address BEFORE a code is sent. (Only the 6-digit code proves that an email really exists.)
//   * no "@", or an ending like ".con" or ".cmo"  ->  "That email does not look right."
//   * for Gmail, Yahoo, Hotmail, Outlook and iCloud, a near miss like "iclood.com"  ->  "Did you mean icloud.com?"
export const KNOWN_DOMAINS = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"];
const BAD_ENDINGS = ["con", "cmo", "coom", "vom", "xom", "ocm", "cim", "comm", "c0m", "ocm", "om"];

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = keep;
    }
  }
  return row[b.length]!;
}

export type EmailCheck = { ok: boolean; problem: string | null; suggestion: string | null };

export function checkEmail(raw: string): EmailCheck {
  const e = raw.trim().toLowerCase();
  if (!e) return { ok: false, problem: null, suggestion: null };
  const at = e.indexOf("@");
  const domain = at > 0 ? e.slice(at + 1) : "";
  const shape = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(e);
  const ending = domain.split(".").pop() ?? "";
  const badEnding = BAD_ENDINGS.includes(ending);
  // a near miss of a well-known provider (also when the ending is a typo, like gmail.con)
  let suggestion: string | null = null;
  if (domain) {
    const base = badEnding ? `${domain.slice(0, domain.lastIndexOf("."))}.com` : domain;
    if (!KNOWN_DOMAINS.includes(domain)) {
      const best = KNOWN_DOMAINS.map((d) => ({ d, n: distance(base, d) })).sort((x, y) => x.n - y.n)[0];
      if (best && best.n > 0 && best.n <= 2) suggestion = best.d;
      else if (badEnding && KNOWN_DOMAINS.includes(base)) suggestion = base;
    }
  }
  if (!shape || badEnding) return { ok: false, problem: "That email does not look right.", suggestion: suggestion ? `${e.slice(0, at)}@${suggestion}` : null };
  return { ok: !suggestion, problem: null, suggestion: suggestion ? `${e.slice(0, at)}@${suggestion}` : null };
}
