// K268 round 2026-11-09b: does a slot change reach the screen under a still camera (cam=fit, phy=0)?
// The frame loop is on demand (frame_loop.ts stopTicker): with nothing moving the ticker stops, and the census's
// setSlot (g.setVis + g.upload) pushes no flag. Shoot one crossing's clip: A, slot 0 without a push (B), then a push
// via __knotPhysFreeze(true) (it calls ctx.invalidate(); phy=0 never steps, so the freeze changes nothing else) (C).
// Run: PASSCFG=<config.json> CVP=1000x900 node redraw_test.mjs
import puppeteer from "puppeteer-core";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { decodePNG } from "./png.mjs";
const PASS = JSON.parse(readFileSync(process.env.PASSCFG, "utf8"));
const TRIPFILE = join(PASS.out, "state", "watchdog.trip");
if (existsSync(TRIPFILE)) throw new Error("WATCHDOG TRIPPED");
const CVP = (process.env.CVP || "1000x900").split("x").map(Number);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.connect({ browserURL: PASS.cdp, defaultViewport: null, protocolTimeout: 120000 });
const mine = (await browser.pages()).filter((p) => [PASS.hostA, PASS.hostB].some((h) => p.url().startsWith(h + "/")));
let page = null;
for (const p of mine) if ((await p.evaluate(() => document.visibilityState)) === "visible") { page = p; break; }
page ??= mine[0];
const res = {};
try {
  await page.setViewport({ width: CVP[0], height: CVP[1], deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await page.goto(PASS.hostB + "/?k111.L&am=instant&snd=none&fw=0&phy=0" + (process.env.CAM || "&cam=fit"), { waitUntil: "load", timeout: 30000 });
  await sleep(7000);
  if (process.env.LOOPC === "1") res.loop = await page.evaluate(() => { window.__knotLoop({ continuous: true }); return 1; });
  const frames = (n) => page.evaluate((n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  const cx = await page.evaluate(() => {
    const r = window.__knotRenderer(), ps = window.__knotPS(), v = window.__knotView();
    const thr = r.style.threadWidth;
    let best = null;
    for (let c = 0; c < ps.crossings.length; c++) {
      if (!r.slotLive[c]) continue;
      const cr = ps.crossings[c], n = ps.chains[cr.over.chain].length, oc = r.renderCtrl(cr.over);
      const q = window.__knotPoint(cr.over.chain, ((oc % n) + n) % n);
      if (!q) continue;
      const x = q.x * v.s + v.x, y = q.y * v.s + v.y, R = Math.ceil((thr * 2.2 + 0.6) * v.s);
      const d = Math.hypot(x - innerWidth / 2, y - innerHeight / 2);
      if (!best || d < best.d) best = { c, x, y, R, d, k: r.gaps.visOf(c) };
    }
    return { ...best, view: [v.x, v.y, v.s] };
  });
  res.crossing = cx;
  const clip = async () => decodePNG(await page.screenshot({ clip: { x: Math.round(cx.x - cx.R), y: Math.round(cx.y - cx.R), width: 2 * cx.R, height: 2 * cx.R }, captureBeyondViewport: process.env.CBV !== "0" }));
  const diff = (a, b) => { let n = 0; for (let i = 0; i < a.data.length; i += 4) if (a.data[i] !== b.data[i] || a.data[i + 1] !== b.data[i + 1] || a.data[i + 2] !== b.data[i + 2]) n++; return n; };
  const tick = () => page.evaluate(() => { const r = window.__knotRenderer(); r.paintClock = 100; r.tickPaint(0); });
  await tick(); await frames(3); await sleep(120);
  const F0pre = decodePNG(await page.screenshot());
  const A = await clip();
  res.trace = await page.evaluate(async (c) => {
    const r = window.__knotRenderer(), g = r.gaps, t = [];
    const raf = () => new Promise((ok) => requestAnimationFrame(() => ok()));
    t.push(["start", g.visOf(c)]);
    g.setVis(c, 0); t.push(["setVis0", g.visOf(c)]);
    g.upload(); t.push(["upload", g.visOf(c)]);
    r.paintClock = 100; r.tickPaint(0); t.push(["tickPaint", g.visOf(c)]);
    await raf(); t.push(["raf1", g.visOf(c)]);
    await raf(); t.push(["raf2", g.visOf(c)]);
    g.setVis(c, 0); g.upload(); t.push(["setVis0 again", g.visOf(c)]);
    await raf(); t.push(["raf3", g.visOf(c)]);
    await raf(); await raf(); t.push(["raf5", g.visOf(c)]);
    return t;
  }, cx.c);
  await page.evaluate((c) => { const g = window.__knotRenderer().gaps; g.setVis(c, 0); g.upload(); }, cx.c);
  await tick(); await frames(3); await sleep(120);
  const B = await clip();
  res.noPush_px = diff(A, B);
  await page.evaluate(() => { window.__rs = 0; addEventListener("resize", () => window.__rs++); });
  await page.evaluate((c) => { const g = window.__knotRenderer().gaps; g.setVis(c, 0); g.upload(); }, cx.c);
  await frames(3);
  res.shotTest = { before: await page.evaluate((c) => [window.__knotRenderer().gaps.visOf(c), window.__rs, innerWidth, innerHeight], cx.c) };
  const Ffull = decodePNG(await page.screenshot());
  res.shotTest.afterFull = await page.evaluate((c) => [window.__knotRenderer().gaps.visOf(c), window.__rs, innerWidth, innerHeight], cx.c);
  await clip();
  res.shotTest.afterClip = await page.evaluate((c) => [window.__knotRenderer().gaps.visOf(c), window.__rs, innerWidth, innerHeight], cx.c);
  await page.evaluate((c) => { const g = window.__knotRenderer().gaps; g.setVis(c, 0); g.upload(); }, cx.c);
  await frames(3); await sleep(150);
  const Ffull2 = decodePNG(await page.screenshot());
  res.shotTest.afterFull2 = await page.evaluate((c) => [window.__knotRenderer().gaps.visOf(c), window.__rs], cx.c);
  res.shotTest.fullCutPx = diff(F0pre, Ffull2);
  res.shotTest.fullCutPx_first = diff(F0pre, Ffull);
  res.visAfterFrames = await page.evaluate((c) => { const r = window.__knotRenderer(); return { k: r.gaps.visOf(c), loop: window.__knotLoop({}).mode ?? null, stopped: window.__knotLoop({}).stopped ?? null }; }, cx.c);
  await page.evaluate(() => window.__knotPhysFreeze(true));
  await frames(3); await sleep(120);
  const C = await clip();
  res.afterPush_px = diff(A, C);
  await page.evaluate(() => { const r = window.__knotRenderer(); r.applyExploreGaps(); r.gaps.upload(); });
  await page.evaluate(() => window.__knotPhysFreeze(true));
  await frames(3); await sleep(120);
  const D = await clip();
  res.restored_px = diff(A, D);
  // All slots at once, full frame: the slot table's reach, with and without a push.
  const full = async () => decodePNG(await page.screenshot());
  const F0 = await full();
  res.slotCount = await page.evaluate(() => { const r = window.__knotRenderer(), g = r.gaps; let n = 0; for (let c = 0; c < r.slotLive.length; c++) if (r.slotLive[c]) { g.setVis(c, 0); n++; } g.upload(); return n; });
  await tick(); await frames(3); await sleep(150);
  res.allNoPush_px = diff(F0, await full());
  await page.evaluate(() => window.__knotPhysFreeze(true));
  await frames(3); await sleep(150);
  res.allAfterPush_px = diff(F0, await full());
  res.gapInfo = await page.evaluate(() => { const r = window.__knotRenderer(); const p = window.__knotParams(); return { rp: p.rp ?? p.renderPath ?? null, gm: p.gm ?? p.gapMask ?? null, keys: Object.keys(p).filter((k) => /gap|sdf|path|rp/i.test(k)), gapsKind: r.gaps?.constructor?.name, hasMask: !!r.gapMask }; });
  await page.evaluate(() => { const r = window.__knotRenderer(); r.applyExploreGaps(); r.gaps.upload(); });
  await page.evaluate(() => window.__knotPhysFreeze(true));
  await frames(3); await sleep(150);
  res.allRestored_px = diff(F0, await full());
  res.stamp = await page.evaluate(() => document.querySelector("#stamp, .stamp, [data-stamp]")?.textContent?.slice(0, 90) ?? null);
} catch (e) { res.error = e.message; }
finally {
  try { await page.goto(PASS.hostB + "/favicon.svg", { waitUntil: "load", timeout: 30000 }); } catch {}
  await browser.disconnect();
}
console.log(JSON.stringify(res));







