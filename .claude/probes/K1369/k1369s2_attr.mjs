// K1369 s2: where main's renderer.update() time goes while a thread is dragged (desktop, phone viewport), by wrapping
// the renderer instance's own methods and its parts' (inclusive ms per update; "rest" = update minus the top-level
// parts = the controls copy, the spline sampling, the crossing gates and the loops' glue). Also the gf gather and install.
//   node .claude/probes/K1369/k1369s2_attr.mjs <base url> <settings,...> [link=b.FMKB4DIQ]
// Settings as k1369s2_desk.mjs (today, gf, gfo, gf2, ...). Run under the perf lock.
import puppeteer from "puppeteer-core";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync } from "node:fs";

const [, , base, setArg, linkArg] = process.argv;
const link = linkArg ?? "b.FMKB4DIQ";
const SETQ = { today: "", gf: "&rp=gf", gfo: "&rp=gf", gf2: "&rp=gf", gff: "&rp=gf" };
const SETO = { gfo: { gate: false }, gf2: { depth: 2 }, gff: { fillets: true } };
const profileDir = join(tmpdir(), `k1369s2-attr-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=520,900",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WRAP = () => {
  const r = window.__knotRenderer?.(); if (!r) return "no renderer";
  const acc = {}; const cnt = {}; window.__k1369a = { acc, cnt };
  const wrap = (o, name, key) => { if (!o || typeof o[name] !== "function") return; const f = o[name]; acc[key] = 0; cnt[key] = 0;
    o[name] = function (...a) { const t = performance.now(); try { return f.apply(this, a); } finally { acc[key] += performance.now() - t; cnt[key]++; } }; };
  wrap(r, "update", "update");
  for (const m of ["assignGapIds", "writeRootTables", "g3WriteChain", "applyExploreGaps", "withTaper", "taperLeanFor", "renderCtrl", "rebuildFillets", "computeGapSlot", "gateStrength"]) wrap(r, m, m);
  wrap(r.stripPass, "extrude", "strip.extrude"); wrap(r.stripPass, "tuck", "strip.tuck");
  wrap(r.paintScene, "writeGeom", "paint.writeGeom"); wrap(r.paintScene, "flushGeom", "paint.flushGeom");
  for (const m of ["renderEmergent", "renderMarkerGaps", "computeGapSlot"]) wrap(r.crossing, m, "crossing." + m);
  wrap(r.gaps, "upload", "gaps.upload");
  for (const m of ["lifecycle", "drawRevealTips", "widthMulFor"]) wrap(r.revealFx, m, "reveal." + m);
  const app = window.__knotApp?.(); if (app?.renderer) wrap(app, "render", "app.render");
  return "ok";
};
const PERF = () => { const p = window.__knotPerf?.(1); return p ? { now: performance.now(), frames: p.totalFrames, cost: p.totalCostMs } : null; };
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 411, height: 753, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  for (const st of setArg.split(",")) {
    await page.evaluateOnNewDocument((o) => { if (o) globalThis.__knotGfOpts = o; }, SETO[st] ?? null);
    await page.goto(`${base}/?${link}&am=instant&snd=none${SETQ[st]}`, { waitUntil: "load", timeout: 60000 });
    await page.bringToFront();
    const t0 = Date.now();
    while (Date.now() - t0 < 45000) { const p = await page.evaluate(() => window.__knotPerf?.(1)); if (p && p.asleep && p.state !== "loading" && p.totalFrames > 30) break; await sleep(200); }
    const w = await page.evaluate(WRAP);
    const g0 = await page.evaluate(() => { const s = globalThis.__knotGf?.stats; return s ? { gather: s.gatherMs.length, main: s.mainMs.length } : null; });
    const a = await page.evaluate(PERF);
    const [x0, y0, x1, y1] = [150, 330, 265, 455];
    await page.touchscreen.touchStart(x0, y0);
    for (let i = 1; i <= 60; i++) { const u = i / 60; await page.touchscreen.touchMove(x0 + (x1 - x0) * u, y0 + (y1 - y0) * Math.sin(u * Math.PI)); await sleep(50); }
    await page.touchscreen.touchEnd();
    const b = await page.evaluate(PERF);
    const res = await page.evaluate((g0) => { const { acc, cnt } = window.__k1369a; const s = globalThis.__knotGf?.stats;
      const sum = (x) => x.reduce((p, c) => p + c, 0);
      return { acc, cnt, gf: s && g0 ? { gatherMs: sum(s.gatherMs.slice(g0.gather)), n: s.gatherMs.length - g0.gather, installMs: sum(s.mainMs.slice(g0.main)), ni: s.mainMs.length - g0.main } : null }; }, g0);
    const wall = (b.now - a.now) / 1000, frames = b.frames - a.frames, n = res.cnt.update || 1;
    const top = ["computeGapSlot", "strip.extrude", "strip.tuck", "paint.writeGeom", "paint.flushGeom", "g3WriteChain", "withTaper", "taperLeanFor", "crossing.renderEmergent", "crossing.renderMarkerGaps", "renderCtrl", "assignGapIds", "writeRootTables", "applyExploreGaps", "gaps.upload", "reveal.lifecycle", "reveal.drawRevealTips"];
    const parts = top.filter((k) => res.acc[k] !== undefined).map((k) => [k, res.acc[k] / n]);
    const rest = res.acc.update / n - parts.reduce((p, [, v]) => p + v, 0);
    console.log(`${st} (${w}): frames ${frames} in ${wall.toFixed(2)} s, main ${((b.cost - a.cost) / wall).toFixed(0)} ms/s; updates ${res.cnt.update} at ${(res.acc.update / n).toFixed(2)} ms` +
      (res.acc["app.render"] !== undefined ? `; app.render ${(res.acc["app.render"] / Math.max(1, res.cnt["app.render"])).toFixed(2)} ms x${res.cnt["app.render"]}` : "") +
      (res.acc.rebuildFillets !== undefined ? `; rebuildFillets ${(res.acc.rebuildFillets / Math.max(1, res.cnt.rebuildFillets)).toFixed(2)} ms x${res.cnt.rebuildFillets}` : "") +
      (res.gf ? `; gf gather ${(res.gf.gatherMs / Math.max(1, res.gf.n)).toFixed(2)} ms x${res.gf.n}, install ${(res.gf.installMs / Math.max(1, res.gf.ni)).toFixed(2)} ms x${res.gf.ni}` : ""));
    console.log("  all (inclusive ms per update, calls): " + Object.keys(res.acc).map((k) => `${k} ${(res.acc[k] / n).toFixed(2)}x${res.cnt[k]}`).join(", "));
    console.log("  per update: " + parts.filter(([, v]) => v >= 0.05).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(", ") + `, rest ${rest.toFixed(2)}`);
  }
} finally {
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch { /* in use */ }
}
