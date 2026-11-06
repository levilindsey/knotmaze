// K1208 Run K - K15 v2: slow custom reveal (trace-roots' sequence at
// as=0.3, named here), full-frame polls, six junctions tracked: fan
// coverage within 0.8 half-widths vs arm coverage at 1.5-4 half-widths.
//   node k15b.mjs <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, sleep, stampText } from "./lib.mjs";
import { decode, upscale3 } from "./crop.mjs";

const OUT = resolve(process.argv[2] || "out");
mkdirSync(OUT, { recursive: true });
const Q = "7&am=trace-roots&as=0.3&fw=0&snd=none&phw=0";
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, Q, log);
  await page.waitForFunction(() => { const r = window.__knotRenderer && window.__knotRenderer(); return !!(r && r.junctionArms && r.junctionArms.length > 0 && r.fieldProbe); }, { timeout: 60000 });
  await sleep(200);
  const geos = await page.evaluate(() => {
    const k = window.__knotFabric(), r = window.__knotRenderer();
    const w0 = k.toWorld(0, 0), w1 = k.toWorld(100, 0), w2 = k.toWorld(0, 100);
    const ax = (w1.x - w0.x) / 100, ay = (w1.y - w0.y) / 100, bx = (w2.x - w0.x) / 100, by = (w2.y - w0.y) / 100;
    const det = ax * by - bx * ay;
    const toScreen = (x, y) => { const dx = x - w0.x, dy = y - w0.y; return [(by * dx - bx * dy) / det, (-ay * dx + ax * dy) / det]; };
    const fp = r.fieldProbe;
    const out = [];
    for (let ji = 0; ji < r.junctionArms.length; ji += 17) {
      const c = fp && fp.center(ji);
      if (!c) continue;
      const [sx, sy] = toScreen(c[0], c[1]);
      if (sx > 150 && sx < 1550 && sy > 150 && sy < 800) out.push({ ji, sx, sy, ang: fp.arms(ji)[0].ang });
    }
    return { list: out.slice(0, 8), fh: r.style.threadWidth / 2, scale: window.__knotView().s };
  });
  console.log(`tracking ${geos.list.length} junctions fh ${geos.fh} scale ${geos.scale.toFixed(1)}`);
  const dsf = 1.5, fhPx = geos.fh * geos.scale * dsf;
  const frames = [];
  let best = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 150000) {
    const buf = await page.screenshot({ type: "png" });
    const img = decode(buf);
    const bg = [img.data[0], img.data[1], img.data[2]];
    const isThread = (x, y) => {
      if (x < 0 || y < 0 || x >= img.W || y >= img.H) return false;
      const i = (y * img.W + x) * 3;
      return Math.hypot(img.data[i] - bg[0], img.data[i + 1] - bg[1], img.data[i + 2] - bg[2]) > 50;
    };
    const row = { t: +((Date.now() - t0) / 1000).toFixed(1), js: [] };
    for (const g of geos.list) {
      const cx = g.sx * dsf, cy = g.sy * dsf;
      let fanN = 0, fanT = 0, armN = 0, armT = 0;
      for (let y = Math.floor(cy - fhPx * 0.8); y <= cy + fhPx * 0.8; y++) for (let x = Math.floor(cx - fhPx * 0.8); x <= cx + fhPx * 0.8; x++) {
        if (Math.hypot(x - cx, y - cy) > fhPx * 0.8) continue;
        fanT++; if (isThread(x, y)) fanN++;
      }
      for (let d = fhPx * 1.5; d <= fhPx * 4; d += 2) { armT++; if (isThread(Math.round(cx + Math.cos(g.ang) * d), Math.round(cy + Math.sin(g.ang) * d))) armN++; }
      const fan = fanT ? fanN / fanT : 0, arm = armT ? armN / armT : 0;
      row.js.push({ ji: g.ji, fan: +fan.toFixed(3), arm: +arm.toFixed(3) });
      if (arm > 0.1 && arm < 0.92 && (!best || Math.abs(arm - 0.55) < Math.abs(best.arm - 0.55))) {
        best = { t: row.t, ji: g.ji, fan, arm, buf, cx: g.sx, cy: g.sy };
      }
    }
    frames.push(row);
    const done = await page.evaluate(() => { const rv = window.__knotReveal && window.__knotReveal(); return rv ? !!rv.done : false; }).catch(() => false);
    if (done) break;
    await sleep(350);
  }
  console.log(`frames ${frames.length} best ${best ? `ji${best.ji} fan ${best.fan.toFixed(3)} arm ${best.arm.toFixed(3)} t=${best.t}` : "none"}`);
  if (best) {
    // Re-crop the best frame around its junction at 3x.
    const { decode: dec, upscale3: up } = await import("./crop.mjs");
    const img = dec(best.buf);
    const S = 200, cx = best.cx * dsf, cy = best.cy * dsf;
    const x0 = Math.max(0, Math.round(cx - S / 2)), y0 = Math.max(0, Math.round(cy - S / 2));
    const sub = { W: S, H: S, data: Buffer.alloc(S * S * 3) };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const si = ((y0 + y) * img.W + (x0 + x)) * 3, di = (y * S + x) * 3;
      sub.data[di] = img.data[si]; sub.data[di + 1] = img.data[si + 1]; sub.data[di + 2] = img.data[si + 2];
    }
    const { encodePNG } = await import("./png.mjs");
    // upscale via crop helper on an encoded sub-image
    writeFileSync(join(OUT, "k15_crop.png"), up(encodePNG(sub)));
  }
  const stamp = await stampText(page);
  const ctxLost = await page.evaluate(() => window.__ctxLost);
  writeFileSync(join(OUT, "k15.json"), JSON.stringify({ q: Q, fhPx: +fhPx.toFixed(1), junctions: geos.list.map((g) => g.ji), frames, best: best ? { t: best.t, ji: best.ji, fan: best.fan, arm: best.arm } : null, stamp, ctxLost }, null, 1));
  console.log(`stamp ${stamp} ctxLost ${ctxLost}`);
  await page.close();
} finally { await browser.close(); }
console.log("wrote k15.json");
