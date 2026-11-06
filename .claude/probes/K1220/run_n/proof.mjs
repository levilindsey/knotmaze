// K1220 Run N proof shots for the i fork (ai, xh 3): one clip + fan census.
//   node proof.mjs <outDir> <tag>
// Run once per src state (base / radius edit / colour edit); edits are made
// outside this script and restored before committing (see SUMMARY.md).
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, sleep } from "./lib.mjs";
import { decode, upscale3 } from "./crop.mjs";

const OUT = resolve(process.argv[2] || "out");
const TAG = process.argv[3] || "base";
mkdirSync(OUT, { recursive: true });
const HOST = process.env.K1220N_HOST || "http://127.0.0.1:5970";
const browser = await openBrowser();
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 3 });
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; window.__ctxLost = 0; document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true); });
  await page.goto(`${HOST}/?7&txt=ai&am=instant&snd=none&fw=0&phw=0#glyphs2`, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer(), { timeout: 60000 });
  for (const t0 = Date.now(); Date.now() - t0 < 60000; await sleep(300)) {
    const a = await page.evaluate(() => !!(window.__knotPerf && window.__knotPerf().asleep));
    if (a) break;
  }
  await sleep(700);
  const info = await page.evaluate(() => {
    const r = window.__knotRenderer(), v = window.__knotView();
    const c = r.fieldProbe.center(0);
    const fh = r.style.threadWidth / 2;
    const g = r.filletMesh.mesh.geometry;
    const pos = g.getBuffer("aPosition").data, recA = g.getBuffer("aRec").data;
    const byRec = {};
    for (let i = 0; i < recA.length; i++) {
      const dx = pos[i * 2] - c[0], dy = pos[i * 2 + 1] - c[1];
      const d = Math.hypot(dx, dy) / fh;
      if (d > 3) continue;
      const k = String(Math.round(recA[i] * 4) / 4);
      const e = byRec[k] || (byRec[k] = { n: 0, maxFh: 0, apex: null });
      e.n++;
      if (d > e.maxFh) e.maxFh = +d.toFixed(3);
      if (d < 0.05 && !e.apex) e.apex = [+(pos[i * 2] - c[0]).toFixed(3), +(pos[i * 2 + 1] - c[1]).toFixed(3)];
    }
    return { c, sx: c[0] * v.s + v.x, sy: c[1] * v.s + v.y, fh, byRec, stamp: ([...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /^P\d/.test(t)) || "").split(" | sim")[0] };
  });
  const S = 180;
  const clip = { x: Math.round(info.sx - S / 2), y: Math.round(info.sy - S / 2), width: S, height: S };
  const buf = await page.screenshot({ type: "png", clip });
  writeFileSync(join(OUT, `proof_${TAG}_1x.png`), buf);
  writeFileSync(join(OUT, `proof_${TAG}_3x.png`), upscale3(buf));
  const img = decode(buf);
  const cx = (info.sx - clip.x) * 3, cy = (info.sy - clip.y) * 3;
  const cols = [];
  for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) {
    const i = (((cy + y) | 0) * img.W + ((cx + x) | 0)) * 3;
    cols.push([img.data[i], img.data[i + 1], img.data[i + 2]]);
  }
  const med = (a) => { const s = [...a].sort((p, q) => p - q); return s[Math.floor(s.length / 2)]; };
  const centre = [med(cols.map((c) => c[0])), med(cols.map((c) => c[1])), med(cols.map((c) => c[2]))];
  console.log(TAG, JSON.stringify({ centre, fh: info.fh, byRec: info.byRec, stamp: info.stamp }));
  await page.close();
} finally { await browser.close(); }
