// K1450 guard: does every frame at rest (or in a drag) show the maze? Loads a link the ordinary way (no forced
// frames, no hooks that draw), waits for rp=gf's first composite (when the link has rp=gf) plus `wait` ms, then
// takes N full-viewport screenshots `gap` ms apart and counts each one's EDGE pixels (luminance step > EDGE to the
// right or below neighbour): the maze's thread borders are thousands of them, a background-only frame (the
// shader backdrop, the markers, the HUD) a few hundred. Exit 1 when any frame has under `ratio` x the run's
// largest count, or the largest is under `min` (no maze at all).
//
//   node .claude/probes/K1450/hold.mjs <url> <outDir> <profileDir> [frames=60] [gapMs=250] [waitMs=5000]
//     env DRAG=1   drag a thread for the whole burst (pressed on a maze pixel near the centre, moved in a circle)
//     env SAVE=6   save every 10th frame as png (and the worst one) under outDir; SAVE=all saves every frame
//     env RATIO=.6 MIN=4000
//     env EDGE=16  the luminance step that counts as an edge: the border look's dim outlines (tlk=border) are
//                  7.5-8.8k edges at 16 and lost at 48 (1.2k, background level); a background-only frame is 1.5-2.5k
//     env XMAX=.78 count only x < XMAX * width: the open panel's text is ~20k edges of its own
//
// Keep one profileDir across runs: Chrome's shader cache lives there, and a cold first rp=gf load blocks the
// main thread for minutes (K1450 handoff). Ports, links: probes.md (a bare URL is today's daily: pass a query).
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
const [, , url, outDir, profileDir, nArg = "60", gapArg = "250", waitArg = "5000"] = process.argv;
if (!url || !outDir || !profileDir) {
  console.error("usage: hold.mjs <url> <outDir> <profileDir> [frames] [gapMs] [waitMs]");
  process.exit(2);
}
const N = Number(nArg), GAP = Number(gapArg), WAIT = Number(waitArg);
const RATIO = Number(process.env.RATIO ?? 0.6), MIN = Number(process.env.MIN ?? 4000);
const DRAG = process.env.DRAG === "1";
const SAVE = process.env.SAVE ?? "6";
const EDGE = Number(process.env.EDGE ?? 16), XMAX = Number(process.env.XMAX ?? 0.78);
mkdirSync(outDir, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--window-size=1720,1000", "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
let code = 0;
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  const logs = [];
  page.on("console", (m) => logs.push(m.text()));
  page.on("pageerror", (e) => logs.push(`PAGEERROR: ${e.message}`));
  // A second page decodes the screenshots, so the page under test does no extra work.
  const dec = await browser.newPage();
  await dec.goto("about:blank");
  const edges = (png) => dec.evaluate(async (b64, EDGE, XMAX) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = new OffscreenCanvas(img.width, img.height);
    const g = c.getContext("2d");
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data;
    const W = img.width, H = img.height;
    const L = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) L[i] = 0.299 * d[4 * i] + 0.587 * d[4 * i + 1] + 0.114 * d[4 * i + 2];
    let n = 0;
    for (let y = 0; y < H - 1; y++)
      for (let x = 0; x < Math.min(W - 1, Math.round(XMAX * W)); x++) {
        const i = y * W + x;
        if (Math.abs(L[i + 1] - L[i]) > EDGE || Math.abs(L[i + W] - L[i]) > EDGE) n++;
      }
    return n;
  }, png.toString("base64"), EDGE, XMAX);
  await page.bringToFront();
  const t0 = Date.now();
  await page.goto(url, { waitUntil: "load", timeout: 600000 });
  const gf = new URL(url).searchParams.get("rp") === "gf";
  if (gf) {
    await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 600000, polling: 200 });
    console.log(`gf first composite at ${Date.now() - t0} ms`);
  }
  await new Promise((r) => setTimeout(r, WAIT));
  let held = false;
  if (DRAG) {
    // a maze pixel near the centre: the first strong edge on a spiral out from it
    const shot = await page.screenshot({ type: "png" });
    const at = await dec.evaluate(async (b64) => {
      const img = new Image();
      img.src = `data:image/png;base64,${b64}`;
      await img.decode();
      const c = new OffscreenCanvas(img.width, img.height);
      const g = c.getContext("2d");
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, img.width, img.height).data;
      const W = img.width, H = img.height;
      const lum = (x, y) => { const i = 4 * (y * W + x); return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; };
      for (let r = 0; r < 300; r += 2)
        for (let a = 0; a < 64; a++) {
          const x = Math.round(W / 2 + r * Math.cos((a / 64) * 2 * Math.PI)), y = Math.round(H / 2 + r * Math.sin((a / 64) * 2 * Math.PI));
          if (Math.abs(lum(x + 1, y) - lum(x, y)) > 60) return [x + 3, y];
        }
      return [W / 2, H / 2];
    }, shot.toString("base64"));
    await page.mouse.move(at[0], at[1]);
    await page.mouse.down();
    held = true;
    var dragAt = at;
    console.log(`drag from ${at}`);
  }
  const rows = [];
  for (let i = 0; i < N; i++) {
    if (DRAG) {
      const a = (i / N) * 4 * Math.PI;
      await page.mouse.move(dragAt[0] + 60 * Math.sin(a), dragAt[1] + 40 * (1 - Math.cos(a)), { steps: 3 });
    }
    const buf = await page.screenshot({ type: "png" });
    const e = await edges(buf);
    rows.push({ i, t: Date.now() - t0, edges: e, buf });
    if (SAVE === "all" || i % 10 === 0) writeFileSync(`${outDir}/f${String(i).padStart(2, "0")}.png`, buf);
    const wait = GAP - (Date.now() - t0 - rows[rows.length - 1].t);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
  if (held) await page.mouse.up();
  const max = Math.max(...rows.map((r) => r.edges));
  const bad = rows.filter((r) => r.edges < RATIO * max || r.edges < MIN);
  const worst = rows.reduce((a, b) => (b.edges < a.edges ? b : a));
  writeFileSync(`${outDir}/worst_f${String(worst.i).padStart(2, "0")}.png`, worst.buf);
  const summary = {
    url, frames: N, gapMs: GAP, drag: DRAG, edge: EDGE, xmax: XMAX, max, min: worst.edges, minFrame: worst.i,
    bad: bad.map((r) => r.i), edges: rows.map((r) => r.edges),
    gf: await page.evaluate(() => { const s = globalThis.__knotGf?.stats; return s ? { passes: s.passes, composites: s.composites, rebuilds: s.rebuilds, fallback: s.fallback } : null; }),
    logs: logs.filter((l) => /error|warn|K1362|PAGEERROR/i.test(l)).slice(0, 10),
  };
  writeFileSync(`${outDir}/summary.json`, JSON.stringify(summary, null, 1));
  console.log(JSON.stringify({ ...summary, edges: summary.edges.join(" ") }));
  code = bad.length || max < MIN ? 1 : 0;
  console.log(code ? `FAIL: ${bad.length} of ${N} frames lack the maze` : `PASS: all ${N} frames show the maze`);
} finally {
  await browser.close();
}
process.exit(code);
