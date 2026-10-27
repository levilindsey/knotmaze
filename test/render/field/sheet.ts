// K868 S1b: contact sheets as captioned HTML, screenshotted by a headless
// system Chrome through puppeteer-core (a temp profile, deleted after).

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const CHROME = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface Tile {
  /** Image path relative to the sheet's HTML. */
  src: string;
  /** Displayed width in CSS px (pixelated upscale when larger than the image). */
  width: number;
  label: string;
}

export interface Row {
  title: string;
  tiles: Tile[];
  /** Caption lines (check results); a line starting "FAIL" is shown in red. */
  lines: string[];
  /** Wrap the tiles at this width (CSS px); default: one line. */
  wrapAt?: number;
}

export function sheetHtml(title: string, intro: string[], rows: Row[]): string {
  const css = `
  body { margin: 0; padding: 16px; background: #fff; color: #111; font: 13px/1.35 system-ui, sans-serif; }
  h1 { font-size: 20px; margin: 0 0 6px; }
  .intro { margin: 0 0 14px; color: #333; max-width: 1500px; }
  .row { border-top: 1px solid #bbb; padding: 10px 0 12px; display: flex; gap: 14px; align-items: flex-start; }
  .tiles { display: flex; gap: 10px; flex-wrap: nowrap; }
  figure { margin: 0; }
  figure img { display: block; image-rendering: pixelated; border: 1px solid #999; }
  figcaption { font-size: 12px; color: #333; margin-top: 3px; max-width: 420px; }
  .cap { min-width: 360px; max-width: 520px; font-family: ui-monospace, Consolas, monospace; font-size: 12px; }
  .cap h2 { font: 600 15px system-ui, sans-serif; margin: 0 0 4px; }
  .fail { color: #b00020; font-weight: 600; }
  .pass { color: #0a6b2a; }
  .info { color: #444; }`;
  const rowHtml = rows
    .map((r) => {
      const tiles = r.tiles
        .map(
          (t) =>
            `<figure><img src="${esc(t.src)}" style="width:${t.width}px"><figcaption>${esc(t.label)}</figcaption></figure>`,
        )
        .join("");
      const lines = r.lines
        .map((l) => {
          const cls = /^FAIL|: FAIL/.test(l) ? "fail" : /PASS/.test(l) ? "pass" : "info";
          return `<div class="${cls}">${esc(l)}</div>`;
        })
        .join("");
      const wrap = r.wrapAt ? ` style="flex-wrap:wrap;max-width:${r.wrapAt}px"` : "";
      return `<div class="row"><div class="tiles"${wrap}>${tiles}</div><div class="cap"><h2>${esc(r.title)}</h2>${lines}</div></div>`;
    })
    .join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body><h1>${esc(
    title,
  )}</h1><div class="intro">${intro.map((l) => `<div>${esc(l)}</div>`).join("")}</div>${rowHtml}</body></html>`;
}

/** Writes `<base>.html` and screenshots it to `<base>.png` (full page). */
export async function renderSheet(dir: string, base: string, html: string, width = 1600): Promise<string> {
  const htmlPath = join(dir, `${base}.html`);
  writeFileSync(htmlPath, html);
  const { default: puppeteer } = await import("puppeteer-core");
  const profile = mkdtempSync(join(tmpdir(), "k868-sheet-"));
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    userDataDir: profile,
    args: ["--allow-file-access-from-files", "--hide-scrollbars"],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
    const png = join(dir, `${base}.png`);
    await page.screenshot({ path: png as `${string}.png`, fullPage: true });
    return png;
  } finally {
    await browser.close();
    rmSync(profile, { recursive: true, force: true });
  }
}
