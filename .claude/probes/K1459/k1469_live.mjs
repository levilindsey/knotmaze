// K1469: LIVE (unpinned) reveal frames: load the link on a warm profile, then screenshot about every 700 ms
// through the reveal, recording the reveal clock and gf's stats beside each frame. Answers: does gf draw
// the reveal's ink at all when nothing is pinned.
//   node .claude/probes/K1459/k1469_live.mjs <base> <link> <am|def> <tag> [gf|today]
//   env OUT=<dir> PROFILE=<dir> XARGS="--disable-gpu-watchdog"
import puppeteer from "puppeteer-core";
import { join } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
const [, , base, link, amArg, tag, modeArg = "gf"] = process.argv;
const am = amArg && amArg !== "def" ? amArg : null;
const outDir = process.env.OUT;
mkdirSync(outDir, { recursive: true });
const VW = 520, VH = 520;
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false, protocolTimeout: 900000, userDataDir: process.env.PROFILE,
  args: [...(process.env.XARGS ? process.env.XARGS.split(" ") : []), "--use-angle=d3d11", "--no-first-run", "--no-default-browser-check",
    "--window-position=2200,50", `--window-size=${VW + 40},${VH + 160}`, "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const page = await browser.newPage();
  page.on("console", (m) => { const x = m.text(); if (/error|warn|fail|gf|shader|compile/i.test(x)) console.log("CON", m.type(), x.slice(0, 300)); }); page.on("pageerror", (e) => console.log("PGERR", String(e).slice(0, 300)));
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.evaluateOnNewDocument(() => { window.__lost = 0; window.addEventListener("webglcontextlost", () => { window.__lost++; }, true); });
  const url = `${base}/?${link}${am ? `&am=${am}` : ""}&snd=none&phw=0&fw=0${modeArg === "gf" ? "&rp=gf" : ""}`;
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.bringToFront();
  if (modeArg === "gf") {
    await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 500 });
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await page.bringToFront();
    await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 500 });
  }
  await page.waitForFunction(() => !!window.__knotReveal?.() && window.__knotReveal().duration > 0, { timeout: 300000, polling: 100 });
  const rows = [];
  const t0 = Date.now();
  for (let i = 0; i < 30; i++) {
    const st = await page.evaluate(() => {
      const g = globalThis.__knotGf?.stats; const rv = window.__knotReveal?.();
      return { clock: rv?.clock ?? null, done: rv?.done ?? null, c: g?.composites ?? 0, rvp: g?.rvPasses ?? 0, kn: g?.rvKnots?.at(-1) ?? null, act: g?.rvActive?.at(-1) ?? null, lost: window.__lost, ci: g?.compileIssued, cr: g?.compileReady };
    });
    const file = join(outDir, `${tag}_${modeArg}_${String(i).padStart(2, "0")}.png`);
    await page.screenshot({ path: file });
    rows.push({ i, wallMs: Date.now() - t0, ...st });
    console.log(JSON.stringify(rows.at(-1)));
    if (st.done) { for (let k = 0; k < 1; k++) { await sleep(1500); await page.screenshot({ path: join(outDir, `${tag}_${modeArg}_end.png`) }); } break; }
    await sleep(500);
  }
  writeFileSync(join(outDir, `${tag}_${modeArg}.json`), JSON.stringify(rows));
} finally { await browser.close(); }
