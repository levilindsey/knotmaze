// K1582 (27Z5): border-look captures of the bar's two spot scenes on any build,
// for the K1444 spots bisect. Same freeze/view recipe as the bar's
// .claude/probes/K1436/k1436_screen.mjs (K868 freeze, parity align, clocks
// pinned, bit-still view), trimmed to what this run needs: threadLook 1
// (border, white) only, no fill shot and no GfTables dump, so one build's
// two scenes cost one gf compile, not two stable-shot pairs plus a table
// serialisation. A shot is kept only when two redrawn shots are
// byte-identical (k1436_screen's K1519 settle proof).
//
//   node .claude/probes/K1582/capbox.mjs <base> <outDir> <profileDir> <jobs.json>
//     jobs.json: [{ name, query, t, hash }] (query without "?")
//     env EXPECT_SHA=<short sha the served page must carry, logged only>
//   writes <outDir>/<name>/border.png and meta.json { view, hash, stampSha }
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { waitViewStill } from "../view_still.mjs";
const [, , base, outDir, profileDir, jobsPath] = process.argv;
const DSF = 3, TRIES = 3;
const jobs = JSON.parse(readFileSync(jobsPath, "utf8"));
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1300,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
async function redraw(page) {
  const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; globalThis.__knotGf.redraw(); return globalThis.__knotGf.stats.composites; });
  await page.waitForFunction((c) => globalThis.__knotGf.stats.composites > c + 2, { timeout: 900000, polling: 200 }, c0);
  await sleep(500);
}
async function once(job) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log(`[${job.name}] pageerror ${e.message.slice(0, 160)}`));
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; window.__lost = 0; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} const gc = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (...a) { if (!this.__h) { this.__h = 1; this.addEventListener("webglcontextlost", () => { if (this.isConnected) window.__lost++; }); } return gc.apply(this, a); }; });
  await page.setViewport({ width: 1240, height: 900, deviceScaleFactor: DSF });
  await page.goto(`${base}/?${job.query}`, { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  await page.waitForFunction(() => (globalThis.__knotGf?.stats?.switchedMs ?? -1) > 0 && globalThis.__knotGf.stats.composites > 0, { timeout: 900000, polling: 300 });
  const f0 = await page.evaluate(() => window.__knotLoop().frames);
  await page.waitForFunction((f) => window.__knotLoop().frames > f + 20, { timeout: 900000, polling: 500 }, f0);
  const hash = await page.evaluate(async (t) => {
    await window.__knotPhysFreeze(true);
    try {
      const ps = window.__knotPS();
      const want = Math.round((t + 0.008) * 120);
      if ((await window.__knotPhysDump())?.kind === "in-thread" && Math.round(ps.simTime * 120) % 2 !== want % 2) ps.accumulator = (ps.accumulator ?? 0) + 1 / 120;
    } catch {}
    await window.__knotStepUntil(t);
    const r = window.__knotRenderer();
    r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0;
    window.__knotLoop?.({ continuous: true });
    const d = await window.__knotPhysDump();
    const h = d?.hashes ?? d; return String(h?.all ?? JSON.stringify(h).slice(0, 80));
  }, (job.t ?? 40) - 0.008);
  await page.addStyleTag({ content: "body * { visibility: hidden !important; } canvas { visibility: visible !important; }" });
  await sleep(2000);
  const still = await waitViewStill(page);
  if (!still) console.log(`[${job.name}] WARNING view never bit-still in 60 s; shooting unpinned (K1529)`);
  else console.log(`[${job.name}] view still x=${still.x} y=${still.y} s=${still.s} dpr=${still.dpr}`);
  await page.evaluate(() => { const r = window.__knotRenderer(); r.threadLook = 1; r.borderColor = 0xffffff; });
  let prev = null, png = null, shots = 0;
  for (let k = 0; k < 8; k++) {
    await redraw(page);
    const cur = await page.screenshot({ type: "png" });
    shots = k + 1;
    if (prev && Buffer.compare(Buffer.from(prev), Buffer.from(cur)) === 0) { png = cur; break; }
    prev = cur; png = cur;
    await sleep(600);
  }
  const meta = await page.evaluate(() => ({ view: window.__knotView(), dpr: window.devicePixelRatio, lost: window.__lost, stamp: (document.body?.textContent ?? "").slice(0, 20000) }));
  await page.close();
  return { hash, png, meta, shots, view: still };
}
for (const job of jobs) {
  let got = null;
  for (let k = 0; k < TRIES; k++) {
    const P = await once(job);
    console.log(`[${job.name}] try ${k + 1} hash ${P.hash} want ${job.hash ?? "-"} shots ${P.shots} lost ${P.meta.lost}`);
    got = P;
    if (!job.hash || P.hash === job.hash) break;
  }
  if (job.hash && got.hash !== job.hash) { console.log(`[${job.name}] HASH MISS saw ${got.hash}`); process.exitCode = 2; continue; }
  const d = join(outDir, job.name); mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "border.png"), got.png);
  const sha = (process.env.EXPECT_SHA ?? "").toLowerCase();
  const stampSha = sha ? String(got.meta.stamp ?? "").toLowerCase().includes(sha) : null;
  writeFileSync(join(d, "meta.json"), JSON.stringify({ hash: got.hash, view: got.view, dpr: got.meta.dpr, lost: got.meta.lost, stampSha }, null, 1));
  console.log(`[${job.name}] wrote ${join(d, "border.png")} stampSha=${stampSha}`);
}
await browser.close();
