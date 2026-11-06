// A tiny PDF writer: text and tables on A4 pages, no other tools needed.
// It uses the plain built-in PDF fonts, so only simple Latin letters work. Other letters become "?".

export type PdfItem =
  | { text: string; size?: number; bold?: boolean; gap?: number }
  | { cells: string[]; widths: number[]; size?: number; bold?: boolean };

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 50;

// Plain letters only: remove accents, replace anything else with "?".
export function plain(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x20-\x7e]/g, "?");
}
const escape = (s: string) => plain(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

// Cut text that would be wider than the room (Helvetica letters are about half as wide as they are tall).
function fit(text: string, width: number, size: number): string {
  const max = Math.max(1, Math.floor(width / (size * 0.52)));
  const t = plain(text);
  return t.length <= max ? t : `${t.slice(0, Math.max(1, max - 1))}.`;
}

export function makePdf(items: PdfItem[]): Uint8Array {
  const pages: string[][] = [[]];
  let y = PAGE_H - MARGIN;
  for (const it of items) {
    const size = it.size ?? 10;
    const lead = size * 1.45 + ("gap" in it && it.gap ? it.gap : 0);
    if (y - lead < MARGIN) {
      pages.push([]);
      y = PAGE_H - MARGIN;
    }
    y -= lead;
    const font = it.bold ? "F2" : "F1";
    const ops = pages[pages.length - 1];
    if ("cells" in it) {
      let x = MARGIN;
      it.cells.forEach((c, i) => {
        ops.push(`BT /${font} ${size} Tf ${x} ${y.toFixed(1)} Td (${escape(fit(c, it.widths[i] - 6, size))}) Tj ET`);
        x += it.widths[i];
      });
    } else {
      ops.push(`BT /${font} ${size} Tf ${MARGIN} ${y.toFixed(1)} Td (${escape(fit(it.text, PAGE_W - 2 * MARGIN, size))}) Tj ET`);
    }
  }

  // objects: 1 catalog, 2 pages, 3 font, 4 bold font, then for each page: a page and its content
  const objects: string[] = [];
  const kids: number[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  pages.forEach((ops, i) => {
    const pageNo = 5 + i * 2;
    const content = ops.join("\n");
    kids.push(pageNo);
    objects[pageNo] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageNo + 1} 0 R >>`;
    objects[pageNo + 1] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });
  objects[2] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let n = 1; n < objects.length; n++) {
    offsets[n] = out.length;
    out += `${n} 0 obj\n${objects[n]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let n = 1; n < objects.length; n++) out += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}
