// K1208 Run K - K15: during a reveal, a fan opaque beside a striped fill.
// Stand: seed 7 fabric with the slowest tailored reveal (trace-roots,
// speed 1.5) - Run K adds &snd=none&phw=0&fw=0. Poll one junction's crop
// through the reveal: fan coverage (thread-coloured pixels within 0.8
// half-widths of the centre) against the arm's coverage along 1.5-4
// half-widths of its centreline (the base ribbon still striped/partial).
// The frame where the arm reads closest to 60% is the measured frame.
//   node k15.mjs <outDir>
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, sleep, stampText } from "./lib.mjs";
import { decode, upscale3 } from "./crop.mjs";

const OUT = resolve(process.argv[2] || "out");
mkdirSync(OUT, { recursive: true });
const Q = "7&am=trace-roots&fw=0&snd=none&phw=0";
const browser = await openBrowser();
try {
  const log = [];
  const page = await openPage(browser, Q, log);
  await page.waitForFunction(() => { const r = window.__knotRenderer && window.__knotRenderer(); return !!(r && r.junctionArms && r.junctionArms.length > 0 && r.fieldProbe); }, { timeout: 60000 });
  await sleep(300);
  // Junction + arm geometry once the scene exists.
  const geo = await page.evaluate(() => {
    const k = window.__knotFabric(), r = window.__knotRenderer();
    const w0 = k.toWorld(0, 0), w1 = k.toWorld(100, 0), w2 = k.toWorld(0, 100);
    const ax = (w1.x - w0.x) / 100, ay = (w1.y - w0.y) / 100, bx = (w2.x - w0.x) / 100, by = (w2.y - w0.y) / 100;
    const det = ax * by - bx * ay;
    const toScreen = (x, y) => { const dx = x - w0.x, dy = y - w0.y; return [(by * dx - bx * dy) / det, (-ay * dx + ax * dy) / det]; };
    const fp = r.fieldProbe;
    for (let ji = 0; ji < r.junctionArms.length; ji++) {
      const c = fp && fp.center(ji);
      if (!c) continue;
      const [sx, sy] = toScreen(c[0], c[1]);
      if (sx > 400 && sx < 1300 && sy > 250 && sy < 700) {
        return { ji, sx, sy, fh: r.style.threadWidth / 2, scale: window.__knotView().s, arms: fp.arms(ji).map((a) => a.ang) };
      }
    }
    return null;
  });
  if (!geo) throw new Error("no junction in view");
  console.log(`junction ji${geo.ji} at ${geo.sx.toFixed(0)},${geo.sy.toFixed(0)} fh ${geo.fh} scale ${geo.scale.toFixed(1)}`);
  const dsf = 1.5, fhPx = geo.fh * geo.scale * dsf;
  const S = 200;
  const clip = { x: Math.max(0, Math.round(geo.sx - S / 2)), y: Math.max(0, Math.round(geo.sy - S / 2)), width: S, height: S };
  const cx = (geo.sx - clip.x) * dsf, cy = (geo.sy - clip.y) * dsf;
  const armAng = geo.arms[0];
  const frames = [];
  let best = null;
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    const buf = await page.screenshot({ type: "png", clip });
    const img = decode(buf);
    // Background reference: crop corner.
    const bg = [img.data[0], img.data[1], img.data[2]];
    const isThread = (x, y) => {
      if (x < 0 || y < 0 || x >= img.W || y >= img.H) return false;
      const i = (y * img.W + x) * 3;
      return Math.hypot(img.data[i] - bg[0], img.data[i + 1] - bg[1], img.data[i + 2] - bg[2]) > 50;
    };
    let fanN = 0, fanT = 0;
    for (let y = Math.floor(cy - fhPx * 0.8); y <= cy + fhPx * 0.8; y++) for (let x = Math.floor(cx - fhPx * 0.8); x <= cx + fhPx * 0.8; x++) {
      if (Math.hypot(x - cx, y - cy) > fhPx * 0.8) continue;
      fanT++; if (isThread(x, y)) fanN++;
    }
    let armN = 0, armT = 0;
    for (let d = fhPx * 1.5; d <= fhPx * 4; d += 2) {
      const x = Math.round(cx + Math.cos(armAng) * d), y = Math.round(cy + Math.sin(armAng) * d);
      armT++; if (isThread(x, y)) armN++;
    }
    const fan = fanT ? fanN / fanT : 0, arm = armT ? armN / armT : 0;
    const rec = { t: +((Date.now() - t0) / 1000).toFixed(1), fan: +fan.toFixed(3), arm: +arm.toFixed(3) };
    frames.push(rec);
    if (arm > 0.15 && arm < 0.9 && (!best || Math.abs(arm - 0.6) < Math.abs(best.arm - 0.6))) {
      best = { ...rec, buf };
    }
    const done = await page.evaluate(() => { const rv = window.__knotReveal && window.__knotReveal(); return rv ? !!rv.done : false; }).catch(() => false);
    if (done && arm >= 0.99) break;
    await sleep(400);
  }
  console.log(`frames ${frames.length} best ${best ? JSON.stringify({ t: best.t, fan: best.fan, arm: best.arm }) : "none"}`);
  if (best) writeFileSync(join(OUT, "k15_crop.png"), upscale3(best.buf));
  const stamp = await stampText(page);
  const ctxLost = await page.evaluate(() => window.__ctxLost);
  writeFileSync(join(OUT, "k15.json"), JSON.stringify({ q: Q, geo: { ji: geo.ji, fhPx: +fhPx.toFixed(1) }, frames, best: best ? { t: best.t, fan: best.fan, arm: best.arm } : null, stamp, ctxLost }, null, 1));
  console.log(`stamp ${stamp} ctxLost ${ctxLost}`);
  await page.close();
} finally { await browser.close(); }
console.log("wrote k15.json");
