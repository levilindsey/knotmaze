// K1208 Run K - K734: hairline seam inside the i fork junction at xh 3.
// Stand verbatim from K643's batch.ps1 desk pairs (seed 7, "ai", xh 3 =
// no xh2 flag), with snd=manual -> snd=none per Run K's brief:
//   ?7&txt=ai&am=instant&snd=none&fw=0&phw=0#glyphs2
// Viewport K643's desk: 1600x1000 dsf 3.
// Measure: on rows through the fork centre, the largest 1-px luma step
// inside the fan disc against the median step (a hairline scores high);
// the same with the fan meshes hidden attributes it.
//   node k734.mjs <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, sleep } from "./lib.mjs";
import { decode, upscale3, luma } from "./crop.mjs";

const OUT = resolve(process.argv[2] || "out");
mkdirSync(OUT, { recursive: true });
const HOST = process.env.K22K_HOST || "http://127.0.0.1:5980";
const Q = "7&txt=ai&am=instant&snd=none&fw=0&phw=0#glyphs2";
const browser = await openBrowser();
try {
  const page = await browser.newPage();
  const log = [];
  page.on("console", (m) => log.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 3 });
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; window.__ctxLost = 0; document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true); });
  await page.goto(`${HOST}/?${Q}`, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer(), { timeout: 60000 });
  let asleep = false;
  for (const t0 = Date.now(); Date.now() - t0 < 45000; await sleep(300)) {
    asleep = await page.evaluate(() => { const p = window.__knotPerf ? window.__knotPerf() : null; return !!(p && p.asleep); });
    if (asleep) break;
  }
  await sleep(700);
  const info = await page.evaluate(() => {
    const r = window.__knotRenderer(), v = window.__knotView();
    const fp = r.fieldProbe;
    const recs = [];
    for (let ji = 0; ji < (r.junctionArms ? r.junctionArms.length : 0); ji++) {
      const c = fp && fp.center(ji);
      if (!c) continue;
      recs.push({ ji, wx: c[0], wy: c[1], sx: c[0] * v.s + v.x, sy: c[1] * v.s + v.y, arms: r.junctionArms[ji].arms.length });
    }
    const p = window.__knotPS().positions;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i + 1 < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); }
    const el = [...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /^P\d/.test(t)) || "";
    return { recs, view: v, fh: r.style.threadWidth / 2, box: { x0, y0, x1, y1 }, stamp: el.split(" | sim")[0], asleep: window.__knotPerf().asleep };
  });
  console.log(`junctions ${info.recs.length} view s=${info.view.s.toFixed(1)} fh=${info.fh} stamp ${info.stamp} asleep ${asleep}`);
  for (const r of info.recs) console.log(`  ji${r.ji} arms=${r.arms} world ${r.wx.toFixed(2)},${r.wy.toFixed(2)} screen ${r.sx.toFixed(0)},${r.sy.toFixed(0)}`);
  // The i fork: a 3+-arm junction in the left half of the scene (the i of
  // "ai" precedes the a's body on the reading side; dump picks by arms).
  const cands = info.recs.filter((r) => r.arms >= 3);
  const rows = [];
  const shot = async (rec, webs, tag) => {
    await page.evaluate((w) => {
      const r = window.__knotRenderer();
      if (r.filletMesh) r.filletMesh.mesh.renderable = w;
      if (r.filletTopMesh) r.filletTopMesh.mesh.renderable = w;
    }, webs);
    await sleep(250);
    const S = 130;
    const clip = { x: Math.max(0, Math.round(rec.sx - S / 2)), y: Math.max(0, Math.round(rec.sy - S / 2)), width: S, height: S };
    const buf = await page.screenshot({ type: "png", clip });
    const img = decode(buf);
    const cx = (rec.sx - clip.x) * 3, cy = (rec.sy - clip.y) * 3;
    // Hairline measure: sharp 1-px luma steps (|dL|>8) in the fan's
    // interior annulus 0.3-0.75 half-widths (thread edges sit at ~1.0),
    // plus the longest vertical run of sharp pixels (a seam is a chain).
    const fhPx = info.fh * info.view.s * 3;
    let sharp = 0, maxStep = 0, bestRun = 0;
    const sharpAt = (x, y) => {
      if (x < 1 || x >= img.W - 1 || y < 0 || y >= img.H) return 0;
      const i = (y * img.W + x) * 3;
      const d = Math.hypot(img.data[i] - img.data[i - 3], img.data[i + 1] - img.data[i - 2], img.data[i + 2] - img.data[i - 1]);
      if (d > maxStep) maxStep = d;
      return d > 6 ? 1 : 0;
    };
    for (let y = Math.floor(cy - fhPx * 0.75); y <= cy + fhPx * 0.75; y++) {
      let run = 0;
      for (let x = Math.floor(cx - fhPx * 0.75); x <= cx + fhPx * 0.75; x++) {
        const rr = Math.hypot(x - cx, y - cy) / fhPx;
        if (rr < 0.3 || rr > 0.75) { run = 0; continue; }
        const s = sharpAt(x, y);
        sharp += s;
        run = s ? run + 1 : 0;
        if (run > bestRun) bestRun = run;
      }
    }
    // Vertical runs (a flank seam runs along the junction, not across).
    let bestVRun = 0;
    for (let x = Math.floor(cx - fhPx * 0.75); x <= cx + fhPx * 0.75; x++) {
      let run = 0;
      for (let y = Math.floor(cy - fhPx * 0.75); y <= cy + fhPx * 0.75; y++) {
        const rr = Math.hypot(x - cx, y - cy) / fhPx;
        if (rr < 0.3 || rr > 0.75) { run = 0; continue; }
        run = sharpAt(x, y) ? run + 1 : 0;
        if (run > bestVRun) bestVRun = run;
      }
    }
    if (tag) writeFileSync(join(OUT, tag), upscale3(buf));
    return { ji: rec.ji, webs, sharp, maxStep: +maxStep.toFixed(1), bestRun, bestVRun, fhPx: +fhPx.toFixed(1) };
  };
  for (const rec of cands.slice(0, 5)) {
    rows.push(await shot(rec, true, rec === cands[0] ? "k734_on.png" : null));
    rows.push(await shot(rec, false, rec === cands[0] ? "k734_off.png" : null));
  }
  await page.evaluate(() => { const r = window.__knotRenderer(); if (r.filletMesh) r.filletMesh.mesh.renderable = true; if (r.filletTopMesh) r.filletTopMesh.mesh.renderable = true; });
  const ctxLost = await page.evaluate(() => window.__ctxLost);
  writeFileSync(join(OUT, "k734.json"), JSON.stringify({ q: Q, info: { recs: info.recs, view: info.view, stamp: info.stamp }, rows, ctxLost }, null, 1));
  for (const r of rows) console.log(`ji${r.ji} webs=${r.webs} sharp ${r.sharp} maxStep ${r.maxStep} run ${r.bestRun}/${r.bestVRun}`);
  console.log("ctxLost", ctxLost);
  await page.close();
} finally { await browser.close(); }
console.log("wrote k734.json");
