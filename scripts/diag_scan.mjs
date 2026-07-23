// Automated broken-crossing scanner: loads a knot, settles it, pulls the
// renderer's per-crossing diagnostics, flags missing-gap and oversized-gap
// suspects, dumps their full inspect state, and saves a crop around each.
// Usage: node scripts/diag_scan.mjs <url> <outPrefix> [settleMs]
import puppeteer from "puppeteer-core";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [, , url, outPrefix, settleMsArg] = process.argv;
const settleMs = Number(settleMsArg ?? 16000);
const profileDir = join(tmpdir(), "knotmaze-diag-scan");

const browser = await puppeteer.launch({
  executablePath:
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--window-size=1720,1000"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  const inspects = [];
  page.on("console", (m) => {
    if (m.text().startsWith("CROSSING INSPECT")) inspects.push(m.text());
  });
  await page.goto(url, { waitUntil: "load", timeout: 30000 });
  await page.bringToFront();
  await new Promise((r) => setTimeout(r, settleMs));

  const diag = await page.evaluate(() => window.__knotDiag());
  const view = await page.evaluate(() => window.__knotView());

  const crossings = [];
  for (let i = 0; i * 5 < diag.length; i++) {
    crossings.push({
      index: i,
      x: diag[i * 5],
      y: diag[i * 5 + 1],
      eraseSpan: diag[i * 5 + 2],
      overSpan: diag[i * 5 + 3],
      selfDist: diag[i * 5 + 4],
    });
  }

  const noGap = crossings
    .filter((c) => c.eraseSpan < 0.14)
    .sort((a, b) => a.eraseSpan - b.eraseSpan)
    .slice(0, 6);
  // Healthy spans scale with thread width and gap: ~2*(fillHalf/sin) +
  // 2*gap, moderately oblique. Derive the threshold from the URL's tw
  // and gap (defaults 0.42 / 0.18) - a fixed 0.85 flagged healthy fat
  // threads and once (at 1.3) certified the naked-gap bug as healthy.
  const q = new URL(url).searchParams;
  const tw = Number(q.get("tw") ?? 0.42);
  const gapParam = Number(q.get("gap") ?? 0.18);
  const bigGapThreshold = (tw * 1.5 + gapParam * 2) * 1.15;
  console.log(`big-gap threshold ${bigGapThreshold.toFixed(2)}`);
  // A long erase whose over-patch out-spans it is a COVERED long
  // crossing (the P3.36 long-overlap reach renders cinched twists this
  // way) - healthy. Flag only spans the over fill fails to cover.
  const bigGap = crossings
    .filter(
      (c) => c.eraseSpan > bigGapThreshold && c.overSpan < c.eraseSpan + 0.2
    )
    .sort((a, b) => b.eraseSpan - a.eraseSpan)
    .slice(0, 6);

  console.log(`crossings: ${crossings.length}`);
  console.log(
    `eraseSpan distribution: min ${Math.min(...crossings.map((c) => c.eraseSpan)).toFixed(2)} ` +
      `max ${Math.max(...crossings.map((c) => c.eraseSpan)).toFixed(2)}`
  );
  for (const [label, list] of [
    ["NO-GAP", noGap],
    ["BIG-GAP", bigGap],
  ]) {
    console.log(`--- ${label} suspects: ${list.length}`);
    for (const c of list) {
      console.log(
        `  #${c.index} span ${c.eraseSpan.toFixed(2)} over ${c.overSpan.toFixed(2)} ` +
          `selfDist ${c.selfDist.toFixed(2)} at (${c.x.toFixed(1)}, ${c.y.toFixed(1)})`
      );
      await page.evaluate((cc) => window.__knotInspect(cc.x, cc.y), c);
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  await page.screenshot({ path: `${outPrefix}_full.png` });
  const suspects = [...noGap, ...bigGap].slice(0, 8);
  for (let i = 0; i < suspects.length; i++) {
    const c = suspects[i];
    const sx = c.x * view.s + view.x;
    const sy = c.y * view.s + view.y;
    await page.screenshot({
      path: `${outPrefix}_s${i}.png`,
      clip: {
        x: Math.max(0, Math.min(1300, sx - 150)),
        y: Math.max(0, Math.min(600, sy - 150)),
        width: 300,
        height: 300,
      },
    });
  }

  for (const line of inspects) console.log(line);
} finally {
  await browser.close();
  try {
    rmSync(profileDir, { recursive: true, force: true });
  } catch {
    // Best-effort cleanup.
  }
}
