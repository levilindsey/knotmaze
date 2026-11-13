// K1362 s2: rp off (today's look) and rp=outline, master's build against this branch's, one frozen
// state each (phy=0: a deterministic layout; K83 k83_ab.mjs's clock, background and chrome pins),
// differing pixels counted in the page (createImageBitmap). A control pair loads master twice.
//   node k1362s2_ab.mjs <out.json> <masterBase> <branchBase> <query> [<query> ...]
// Pair order per query: control (master, master), then master vs branch.
import puppeteer from "puppeteer-core";
import { writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [, , outFile, baseA, baseB, ...queries] = process.argv;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "k1362s2-ab-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profile, defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 },
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    "--window-size=1720,1060"],
});
const shot = async (url) => {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.bringToFront();
  await page.mouse.move(1, 1);
  await page.waitForFunction(() => window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 120000 });
  await page.evaluate(() => window.__knotLoop?.({ continuous: true }));
  await page.waitForFunction(() => {
    const o = window.__knotOutline;
    return !o || (o.stats.replies > 0 && o.settled);
  }, { timeout: 60000, polling: 250 }).catch(() => errors.push("outline not settled"));
  await sleep(1500);
  await page.evaluate(() => {
    const r = window.__knotRenderer(), proto = Object.getPrototypeOf(r);
    r.advanceClocks = function () {}; r.paintClock = 100; r.pulseBorn = 0;
    r.tickPaint = function () { return proto.tickPaint.call(this, 0); };
    try {
      const L = window.__knotBackgroundLayer && window.__knotBackgroundLayer();
      if (L) { L.tick = function () { return false; }; L.clock.time = 40; if (L.active) L.renderTexture(); }
    } catch (e) { /* no background layer */ }
    for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden";
  });
  await sleep(1200);
  const buf = await page.screenshot();
  const stamp = await page.evaluate(() => (window.__knotBuild ? JSON.stringify(window.__knotBuild) : ""));
  await page.close();
  return { buf, errors, stamp };
};
const cmp = await browser.newPage();
await cmp.goto("about:blank");
const diff = (a, b) => cmp.evaluate(async (A, B) => {
  const dec = async (s) => {
    const bin = Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    const bm = await createImageBitmap(new Blob([bin], { type: "image/png" }));
    const c = new OffscreenCanvas(bm.width, bm.height);
    const g = c.getContext("2d");
    g.drawImage(bm, 0, 0);
    return g.getImageData(0, 0, bm.width, bm.height).data;
  };
  const x = await dec(A), y = await dec(B);
  if (x.length !== y.length) return { px: -1 };
  let px = 0, maxD = 0;
  for (let i = 0; i < x.length; i += 4) {
    const d = Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2]));
    if (d) { px++; if (d > maxD) maxD = d; }
  }
  return { px, maxD, total: x.length / 4 };
}, a.toString("base64"), b.toString("base64"));
const out = [];
try {
  for (const q of queries) {
    const m1 = await shot(baseA + q), m2 = await shot(baseA + q), br = await shot(baseB + q);
    const rec = { q, control: await diff(m1.buf, m2.buf), branch: await diff(m1.buf, br.buf), bytesEqual: Buffer.compare(m1.buf, br.buf) === 0, errors: [...m1.errors, ...m2.errors, ...br.errors] };
    out.push(rec);
    console.log(JSON.stringify(rec));
  }
} finally {
  writeFileSync(outFile, JSON.stringify(out, null, 1));
  await browser.close();
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
