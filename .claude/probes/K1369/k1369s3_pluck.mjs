// K1369 s3: the mid-pluck screenshot pair, today's look against rp=gf (lean on by default), on the desktop in the
// phone's viewport (411x753, DPR 2.625, touch), in-thread physics, flow off, paint clocks pinned. The today page picks
// the pluck site (the chain sample nearest the viewport centre, on a chain at least 40 ctrl long); the gf page plucks
// the same (chain, ctrl). Each page plucks through __knotPluck (no tug, no ripple: render-only), steps the pluck's own
// tick by exactly 1/60 s for N frames, then holds it (tick no-op) and shoots a crop around the site and the whole
// frame, at two phases. Also records, per gf shot, whether the renderer ran lean while the pluck was live.
// Writes <outDir>/<phase>_<look>_crop.png, _full.png, pair_<phase>.png (side by side) and pluck.json.
// The default link is seed 7 at today's defaults: the s1/s2 cells' link b.FMKB4DIQ carries threadLook "border", which
// today's look draws as outlines only (gf draws filled threads), so it makes no look pair.
//   node .claude/probes/K1369/k1369s3_pluck.mjs <base url> <outDir> [link=7]
import puppeteer from "puppeteer-core";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";

const [, , base, outDir, linkArg] = process.argv;
const link = linkArg ?? "7";
mkdirSync(outDir, { recursive: true });
const profileDir = join(tmpdir(), `k1369s3-pluck-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=520,900",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PHASES = [6, 18];
const CROP = 200; // CSS px
const LOOKS = { today: "", gf: "&rp=gf" };
const res = { link, phases: PHASES, site: null, looks: {} };

const load = async (page, q) => {
  await page.setViewport({ width: 411, height: 753, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.evaluateOnNewDocument(() => { globalThis.__lost = 0; addEventListener("webglcontextlost", () => { globalThis.__lost++; }, true); });
  await page.goto(`${base}/?${link}&am=instant&snd=none&phw=0&fw=0${q}`, { waitUntil: "load", timeout: 60000 });
  await page.bringToFront();
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { const p = await page.evaluate(() => window.__knotPerf?.(1)); if (p && p.asleep && p.state !== "loading" && p.totalFrames > 30) break; await sleep(200); }
  await page.evaluate(() => { window.__knotLoop?.({ continuous: true }); const r = window.__knotRenderer(); r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0; });
  await sleep(1500);
};
const pickSite = () => {
  const r = window.__knotRenderer(); const v = window.__knotView();
  const cx = innerWidth / 2, cy = innerHeight / 2;
  let best = null;
  r.chainSamples.forEach((s, c) => {
    if (!s || s.controlArcLengths.length < 40) return;
    const nk = s.controlArcLengths.length;
    for (let k = 8; k < nk - 8; k += 2) {
      const i = Math.min(s.count - 1, Math.round((s.controlArcLengths[k] / s.totalLength) * (s.count - 1)));
      const x = v.x + s.positions[i * 2] * v.s, y = v.y + s.positions[i * 2 + 1] * v.s;
      const d = Math.hypot(x - cx, y - cy);
      if (!best || d < best.d) best = { c, k, x, y, d };
    }
  });
  return best;
};
const PLUCK = ({ c, k, n }) => {
  const r = window.__knotRenderer(); const pl = r.plucks;
  pl.clear();
  window.__pk = { frames: 0, leanLive: 0, updates: 0 };
  const tick0 = Object.getPrototypeOf(pl).tick;
  pl.tick = function () { if (window.__pk.frames < n) { window.__pk.frames++; tick0.call(this, 1 / 60); } };
  const up0 = Object.getPrototypeOf(r).update;
  r.update = function () { up0.call(this); window.__pk.updates++; if (this.leanStale) window.__pk.leanLive++; };
  const ok = window.__knotPluck(c, k);
  return { ok, active: pl.activeCount, lean: r.lean };
};
try {
  for (const [look, q] of Object.entries(LOOKS)) {
    const page = await browser.newPage();
    await load(page, q);
    if (!res.site) res.site = await page.evaluate(pickSite);
    const s = res.site;
    const L = (res.looks[look] = { shots: [] });
    for (const n of PHASES) {
      const pre = await page.evaluate(PLUCK, { c: s.c, k: s.k, n });
      const t0 = Date.now();
      while (Date.now() - t0 < 5000) { const f = await page.evaluate(() => window.__pk.frames); if (f >= n) break; await sleep(30); }
      await sleep(400);
      const st = await page.evaluate(() => ({ ...window.__pk, active: window.__knotRenderer().plucks.activeCount, lost: globalThis.__lost,
        gf: window.__knotGf ? { builds: window.__knotGf.stats?.builds ?? null } : null }));
      const x = Math.max(0, Math.min(411 - CROP, s.x - CROP / 2)), y = Math.max(0, Math.min(753 - CROP, s.y - CROP / 2));
      const crop = join(outDir, `p${n}_${look}_crop.png`), full = join(outDir, `p${n}_${look}_full.png`);
      await page.screenshot({ path: crop, clip: { x, y, width: CROP, height: CROP } });
      await page.screenshot({ path: full });
      L.shots.push({ n, pre, st, crop, full });
      console.log(look, `n=${n}`, JSON.stringify({ pre, st }));
    }
    await page.close();
  }
  // Side-by-side pairs, through a page (no image library needed).
  const page = await browser.newPage();
  await page.setViewport({ width: 2 * 525 + 30, height: 600, deviceScaleFactor: 1 });
  for (const n of PHASES) {
    const img = (look) => `data:image/png;base64,${readFileSync(join(outDir, `p${n}_${look}_crop.png`)).toString("base64")}`;
    await page.setContent(`<body style="margin:0;background:#222;color:#ddd;font:14px sans-serif">
      <div style="display:flex;gap:10px;padding:10px"><figure style="margin:0"><img src="${img("today")}" width="525"><figcaption>today, pluck frame ${n}</figcaption></figure>
      <figure style="margin:0"><img src="${img("gf")}" width="525"><figcaption>rp=gf (lean default), pluck frame ${n}</figcaption></figure></div></body>`);
    await sleep(200);
    await page.screenshot({ path: join(outDir, `pair_p${n}.png`), fullPage: true });
  }
  writeFileSync(join(outDir, "pluck.json"), JSON.stringify(res, null, 1));
  console.log("site", JSON.stringify(res.site), "out", outDir);
} finally {
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* in use */ }
}
