// K1202 21C task 5: e210's kymograph on the cyc stand, flag off above
// flag on, with a same-build flag-off/flag-off control pair first.
// Stand verbatim from stands_cyc.mjs (k111&am=instant&fw=0&snd=none&
// phw=0, moves 0,246,82,83,199,150,151,38,155,211; head node_221),
// clocks pinned as sheets_cyc.mjs pins them (__knotPinClocks per row,
// 72 rows over 1.5 periods). The flag is set in the page through a
// /src import of junction_field.ts, then rebuildFillets(true) makes
// setFieldParams ride it to uJParams.z; the same pinned state is
// re-shot for every capture. Sheet: ctrl1, ctrl2, off, on stacked.
//   node sheet21c.mjs
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";
import { sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";

const HOST = process.env.K1139_HOST || "http://127.0.0.1:5830";
const DSF = 1.5, G = 6, KROWS = 72;
const OUT = "out21c/sheet";
mkdirSync(OUT, { recursive: true });
const st = STANDS.cyc;

async function openBrowser() {
  mkdirSync(join(import.meta.dirname, "udd"), { recursive: true });
  const udd = mkdtempSync(join(import.meta.dirname, "udd", "k1202sh21c-"));
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: false, userDataDir: udd,
    args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
      "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding", "--window-size=1760,1060"],
  });
  const close = browser.close.bind(browser);
  browser.close = async () => { try { await close(); } finally { for (let i = 0; i < 10; i++) { try { rmSync(udd, { recursive: true, force: true }); break; } catch { await sleep(300); } } } };
  return browser;
}

const browser = await openBrowser();
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1700, height: 950, deviceScaleFactor: DSF });
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
  await page.goto(`${HOST}/?${linkOf(st)}`, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer() && window.__knotFabric(), { timeout: 60000 });
  const stamp = () => page.evaluate(() => [...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /sim .* wall/.test(t)) || "");
  for (let n = 0, t0 = Date.now(); Date.now() - t0 < 40000;) { const s = await stamp(); n = /asleep/.test(s) ? n + 1 : 0; if (n >= 3) break; await sleep(300); }
  const still = async () => { let last = "", n = 0; for (let t0 = Date.now(); Date.now() - t0 < 8000; await sleep(120)) { const v = await page.evaluate(() => { const v = window.__knotView(); return [v.x, v.y, v.s].map((a) => a.toFixed(3)).join(","); }); n = v === last ? n + 1 : 0; last = v; if (n >= 4) return; } };
  await still();
  for (const eid of st.moves) {
    await still();
    const head0 = await page.evaluate(() => window.__knotFabric().head);
    if (!(await page.evaluate((e) => window.__knotTurnMove(e), eid))) throw new Error(`move e${eid} refused`);
    for (let i = 0; i < 100; i++) { await sleep(100); const f = await page.evaluate(() => { const k = window.__knotFabric(); return { a: k.animating, h: k.head }; }); if (!f.a && f.h !== head0) break; }
    await sleep(300);
    await still();
  }
  const arm = await page.evaluate((eid) => {
    const k = window.__knotFabric(), r = window.__knotRenderer();
    const pts = [];
    for (let i = 0; i <= 256; i++) { const q = k.runPoint(eid, i / 256); pts.push([q.x, q.y]); }
    const p0 = k.vertexScreen(k.head);
    const a = k.toWorld(p0.x, p0.y), b = k.toWorld(p0.x + 100, p0.y);
    return { pts, ppw: 100 / Math.hypot(b.x - a.x, b.y - a.y), spacing: r.pulseSpacing, head: k.head };
  }, 210);
  await page.evaluate(() => { for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden"; });
  const xs = arm.pts.map((p) => p[0]), ys = arm.pts.map((p) => p[1]);
  const m = 1.35 * arm.ppw;
  const clip = { x: Math.floor(Math.min(...xs) - m), y: Math.floor(Math.min(...ys) - m) };
  clip.width = Math.ceil(Math.max(...xs) + m) - clip.x;
  clip.height = Math.ceil(Math.max(...ys) + m) - clip.y;
  const P = arm.spacing / 1.6;
  const samp = [];
  for (let i = 0; i < arm.pts.length - 1; i++) {
    const [ax, ay] = arm.pts[i], [bx, by] = arm.pts[i + 1];
    const L = Math.hypot(bx - ax, by - ay) * DSF, n = Math.max(1, Math.round(L));
    for (let j = 0; j < n; j++) samp.push([(ax + ((bx - ax) * j) / n - clip.x) * DSF, (ay + ((by - ay) * j) / n - clip.y) * DSF]);
  }
  const frame = async (t) => {
    await page.evaluate((tt) => window.__knotPinClocks(tt), t);
    await page.evaluate(() => new Promise((res) => { let k = 0; const f = () => (++k >= 3 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
    await sleep(60);
    return toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip }))));
  };
  const setRamp = async (on) => {
    const got = await page.evaluate(async (o) => {
      const JF = await import("/src/render/junction_field.ts");
      JF.setPulseCoverRamp(o);
      window.__knotRenderer().rebuildFillets(true);
      return JF.pulseCoverRamp;
    }, on);
    if (got !== on) throw new Error(`flag readback ${got} != ${on}`);
    await page.evaluate(() => new Promise((res) => { let k = 0; const f = () => (++k >= 3 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  };
  const capture = async (label) => {
    const rows = [];
    for (let r = 0; r < KROWS; r++) rows.push(await frame(100 + (r * 1.5 * P) / KROWS));
    console.log(`${label}: ${rows.length} rows, clip ${JSON.stringify(clip)}, P ${P.toFixed(3)}, ${samp.length} samples, ppw ${arm.ppw.toFixed(2)}, head ${arm.head}`);
    return rows;
  };
  const kymo = (rows) => {
    const W = samp.length, H = rows.length * 2;
    const out = { W, H, data: Buffer.alloc(W * H * 3) };
    rows.forEach((img, r) => {
      samp.forEach(([x, y], i) => {
        const sx = Math.min(img.W - 1, Math.max(0, Math.round(x))), sy = Math.min(img.H - 1, Math.max(0, Math.round(y)));
        for (let k = 0; k < 2; k++) img.data.copy(out.data, ((2 * r + k) * W + i) * 3, (sy * img.W + sx) * 3, (sy * img.W + sx) * 3 + 3);
      });
    });
    return out;
  };
  await setRamp(false);
  const caps = {};
  caps.ctrl1 = kymo(await capture("ctrl1 (off)"));
  caps.ctrl2 = kymo(await capture("ctrl2 (off)"));
  caps.off = kymo(await capture("off"));
  await setRamp(true);
  caps.on = kymo(await capture("on"));
  await setRamp(false);
  // Sheet: ctrl1, ctrl2, off, on stacked with grey gutters (sheets_cyc shape).
  const order = ["ctrl1", "ctrl2", "off", "on"];
  const W = Math.max(...order.map((k) => caps[k].W)), H = Math.max(...order.map((k) => caps[k].H));
  const SW = W + 2 * G, SH = order.length * H + (order.length + 1) * G;
  const data = Buffer.alloc(SW * SH * 3, 40);
  order.forEach((k, i) => {
    const im = caps[k], oy = G + i * (H + G);
    for (let y = 0; y < im.H; y++) im.data.copy(data, ((oy + y) * SW + G) * 3, y * im.W * 3, (y + 1) * im.W * 3);
    writeFileSync(join(OUT, `cyc_e210_kymo_${k}.png`), encodePNG({ W: im.W, H: im.H, data: im.data }));
  });
  writeFileSync(join(OUT, "cyc_e210_kymo_sheet21c.png"), encodePNG({ W: SW, H: SH, data }));
  console.log(`${join(OUT, "cyc_e210_kymo_sheet21c.png")}: ${SW}x${SH} (ctrl1, ctrl2, off, on top to bottom)`);
  // Pixel diffs between captures (same state; control first).
  const diff = (a, b) => { let n = 0, mx = 0; for (let i = 0; i < a.data.length; i += 3) { const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2])); if (d) { n++; if (d > mx) mx = d; } } return `${n} px, max ${mx}/255`; };
  console.log(`diff ctrl1 vs ctrl2 (control): ${diff(caps.ctrl1, caps.ctrl2)}`);
  console.log(`diff ctrl2 vs off (control): ${diff(caps.ctrl2, caps.off)}`);
  console.log(`diff off vs on: ${diff(caps.off, caps.on)}`);
  // Step table per capture (kymo_steps arithmetic, top 72 rows).
  const lum = (im, x, y) => { const k = (y * im.W + x) * 3; return 0.2126 * im.data[k] + 0.7152 * im.data[k + 1] + 0.0722 * im.data[k + 2]; };
  for (const k of order) {
    const im = caps[k], parts = [];
    for (let c = 15; c <= 24; c++) {
      let mx = 0, n10 = 0;
      for (let r = 0; r < 72; r++) { const d = Math.abs(lum(im, c + 1, 2 * r) - lum(im, c, 2 * r)); if (d > mx) mx = d; if (d > 10) n10++; }
      parts.push(`col ${c}->${c + 1}: ${mx.toFixed(1)} luma, ${n10}/72 rows>10`);
    }
    console.log(`${k}: ${parts.join("; ")}`);
  }
  await page.close();
} finally { await browser.close(); }
