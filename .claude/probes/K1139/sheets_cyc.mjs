// K1139 S4 sheets: per new stand (cyc: the cycle arm e210; loop: the
// self-loop e102) a 2x crop of the two-ended arm and the fans at its ends
// at four moments a quarter period apart (t 100 + k P/4, P = spacing /
// PULSE_SPEED), rows base (25ce2321) and S4, in Stage 3's layout
// (sheets_s3.mjs: grey gutters, no labels), plus a kymograph along the
// arm: the GPU's centreline pixels (runPoint samples, one per screenshot
// px of arc), arc across from the arm's ctrlA end (left) to its ctrlB end,
// time down over 1.5 periods in P/48 rows (each row 2 px), base on top,
// S4 below. Same state in both builds (phw=0, fw=0, clocks pinned).
//   node sheets_cyc.mjs <baseHost> <s4Host> [stands=cyc,loop]
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";
import { sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";

const ARM = { cyc: 210, loop: 102, preloop: 102 };
const DSF = 1.5, G = 6, S = 2, MASK_R = 1.35, PULSE_SPEED = 1.6, KROWS = 72;
const [BASE, S4, ONLYARG] = process.argv.slice(2);
const ONLY = ONLYARG ? ONLYARG.split(",") : ["cyc", "loop"];
// S4b: K1139_SHEETS_OUT picks the folder (S4b ran S4 above S4b into
// out/s4b/sheets), so a rerun does not overwrite S4's tracked sheets.
const OUT = process.env.K1139_SHEETS_OUT || "out/s4cyc/sheets";
mkdirSync(OUT, { recursive: true });

async function openBrowser() {
  mkdirSync(join(import.meta.dirname, "udd"), { recursive: true });
  const udd = mkdtempSync(join(import.meta.dirname, "udd", "k1139shc-"));
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

async function shoot(host, stand) {
  const st = STANDS[stand];
  const browser = await openBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1700, height: 950, deviceScaleFactor: DSF });
    const cdp = await page.createCDPSession();
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
    await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
    await page.goto(`${host}/?${linkOf(st)}`, { waitUntil: "load", timeout: 90000 });
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
      if (!(await page.evaluate((e) => window.__knotTurnMove(e), eid))) throw new Error(`${stand} move e${eid} refused on ${host}`);
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
    }, ARM[stand]);
    await page.evaluate(() => { for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden"; });
    const xs = arm.pts.map((p) => p[0]), ys = arm.pts.map((p) => p[1]);
    const m = MASK_R * arm.ppw;
    const clip = { x: Math.floor(Math.min(...xs) - m), y: Math.floor(Math.min(...ys) - m) };
    clip.width = Math.ceil(Math.max(...xs) + m) - clip.x;
    clip.height = Math.ceil(Math.max(...ys) + m) - clip.y;
    const P = arm.spacing / PULSE_SPEED;
    const frame = async (t) => {
      await page.evaluate((tt) => window.__knotPinClocks(tt), t);
      await page.evaluate(() => new Promise((res) => { let k = 0; const f = () => (++k >= 3 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
      await sleep(60);
      return toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip }))));
    };
    const moments = [];
    for (let k = 0; k < 4; k++) moments.push(await frame(100 + (k * P) / 4));
    // Centreline samples, one per screenshot px of arc.
    const samp = [];
    for (let i = 0; i < arm.pts.length - 1; i++) {
      const [ax, ay] = arm.pts[i], [bx, by] = arm.pts[i + 1];
      const L = Math.hypot(bx - ax, by - ay) * DSF, n = Math.max(1, Math.round(L));
      for (let j = 0; j < n; j++) samp.push([(ax + ((bx - ax) * j) / n - clip.x) * DSF, (ay + ((by - ay) * j) / n - clip.y) * DSF]);
    }
    const rows = [];
    for (let r = 0; r < KROWS; r++) rows.push(await frame(100 + (r * 1.5 * P) / KROWS));
    return { clip, moments, samp, rows, P, ppw: arm.ppw, head: arm.head };
  } finally {
    await browser.close();
  }
}

function scaled(img, s) {
  const out = { W: img.W * s, H: img.H * s, data: Buffer.alloc(img.W * s * img.H * s * 3) };
  for (let y = 0; y < out.H; y++) for (let x = 0; x < out.W; x++) {
    const i = (Math.floor(y / s) * img.W + Math.floor(x / s)) * 3;
    img.data.copy(out.data, (y * out.W + x) * 3, i, i + 3);
  }
  return out;
}
function sheet(file, cols, imgs) {
  const W = Math.max(...imgs.map((i) => i.W)), H = Math.max(...imgs.map((i) => i.H));
  const nr = Math.ceil(imgs.length / cols);
  const SW = cols * W + (cols + 1) * G, SH = nr * H + (nr + 1) * G;
  const data = Buffer.alloc(SW * SH * 3, 40);
  imgs.forEach((im, i) => {
    const ox = G + (i % cols) * (W + G), oy = G + Math.floor(i / cols) * (H + G);
    for (let y = 0; y < im.H; y++) im.data.copy(data, ((oy + y) * SW + ox) * 3, y * im.W * 3, (y + 1) * im.W * 3);
  });
  writeFileSync(join(OUT, file), encodePNG({ W: SW, H: SH, data }));
  console.log(`${join(OUT, file)}: ${SW}x${SH}`);
}
function kymo(cap) {
  const W = cap.samp.length, H = cap.rows.length * 2;
  const out = { W, H, data: Buffer.alloc(W * H * 3) };
  cap.rows.forEach((img, r) => {
    cap.samp.forEach(([x, y], i) => {
      const sx = Math.min(img.W - 1, Math.max(0, Math.round(x))), sy = Math.min(img.H - 1, Math.max(0, Math.round(y)));
      for (let k = 0; k < 2; k++) img.data.copy(out.data, ((2 * r + k) * W + i) * 3, (sy * img.W + sx) * 3, (sy * img.W + sx) * 3 + 3);
    });
  });
  return out;
}

for (const stand of ONLY) {
  const a = await shoot(BASE, stand);
  const b = await shoot(S4, stand);
  console.log(`${stand}: arm e${ARM[stand]}, head ${a.head}/${b.head}, clip ${JSON.stringify(a.clip)} vs ${JSON.stringify(b.clip)}, P ${a.P.toFixed(3)} s, ${a.samp.length} kymo samples, ppw ${a.ppw.toFixed(2)}`);
  sheet(`${stand}_e${ARM[stand]}_moments.png`, 4, [...a.moments, ...b.moments].map((im) => scaled(im, S)));
  sheet(`${stand}_e${ARM[stand]}_kymo.png`, 1, [kymo(a), kymo(b)]);
  // How much each moment moved, base vs S4 (same state, same clip).
  for (let k = 0; k < 4; k++) {
    const A = a.moments[k], B = b.moments[k];
    let n = 0, max = 0;
    for (let i = 0; i < A.data.length; i += 3) { const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2])); if (d) { n++; if (d > max) max = d; } }
    console.log(`  moment ${k} (t ${(100 + (k * a.P) / 4).toFixed(3)}): ${n} px differ in the crop, max ${max}/255`);
  }
}
