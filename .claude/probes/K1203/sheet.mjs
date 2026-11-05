// K1203 21D task 5: mnode_27's fan on the x4 stand, flag off above
// flag on, with a same-build flag-off/flag-off control pair first.
// Stand verbatim from stands_cyc.mjs (k111&am=instant&fw=0&snd=none&
// phw=0, moves 0,247,248,69,72,73,95,140,180, &pr=8), clocks pinned
// (paintClock t = 100, __knotPinClocks as sheets_cyc.mjs pins them),
// cropped at the fan (a 320 CSS px box on mnode_27's screen point, as
// the S4b crops crop theirs) and shown at 2x. The flag is set in the
// page through a /src import of junction_field.ts, then
// rebuildFillets(true) rides it to uJParams.w; the same pinned state
// is re-shot for every capture. Sheet: ctrl1, ctrl2, off, on stacked.
//   node sheet.mjs
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";
import { sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";

const HOST = process.env.K1139_HOST || "http://127.0.0.1:5840";
const DSF = 1.5, G = 6, BOX = 176;
const OUT = "out/sheet";
mkdirSync(OUT, { recursive: true });
const st = STANDS.x4;

async function openBrowser() {
  mkdirSync(join(import.meta.dirname, "udd"), { recursive: true });
  const udd = mkdtempSync(join(import.meta.dirname, "udd", "k1203sh-"));
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
  const ctr = await page.evaluate(() => {
    const k = window.__knotFabric();
    const p = k.vertexScreen("mnode_27");
    const a = k.toWorld(p.x, p.y), b = k.toWorld(p.x + 100, p.y);
    return { x: p.x, y: p.y, ppw: 100 / Math.hypot(b.x - a.x, b.y - a.y), head: k.head };
  });
  await page.evaluate(() => { for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden"; });
  const clip = { x: Math.max(0, Math.floor(ctr.x - BOX / 2)), y: Math.max(0, Math.floor(ctr.y - BOX / 2)), width: BOX, height: BOX };
  console.log(`mnode_27 screen ${ctr.x.toFixed(1)},${ctr.y.toFixed(1)} ppw ${ctr.ppw.toFixed(2)} head ${ctr.head} clip ${JSON.stringify(clip)}`);
  const frame = async (tt) => {
    await page.evaluate((t2) => window.__knotPinClocks(t2), tt);
    await page.evaluate(() => new Promise((res) => { let k = 0; const f = () => (++k >= 3 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
    await sleep(60);
    return toRGB(decodePNG(Buffer.from(await page.screenshot({ type: "png", clip }))));
  };
  const setWin = async (on) => {
    const got = await page.evaluate(async (o) => {
      const JF = await import("/src/render/junction_field.ts");
      JF.setPulseBandEndWindow(o);
      window.__knotRenderer().rebuildFillets(true);
      return JF.pulseBandEndWindow;
    }, on);
    if (got !== on) throw new Error(`flag readback ${got} != ${on}`);
    await page.evaluate(() => new Promise((res) => { let k = 0; const f = () => (++k >= 3 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  };
  const scaled = (img, s) => {
    const out = { W: img.W * s, H: img.H * s, data: Buffer.alloc(img.W * s * img.H * s * 3) };
    for (let y = 0; y < out.H; y++) for (let x = 0; x < out.W; x++) { const i = (Math.floor(y / s) * img.W + Math.floor(x / s)) * 3; img.data.copy(out.data, (y * out.W + x) * 3, i, i + 3); }
    return out;
  };
  await setWin(false);
  // Sixteen pinned moments over one period (P = spacing / 1.6);
  // the sheet shows the moment whose off/on diff is largest, the same
  // pinned state for its control pair, off and on.
  const P = 2.5 / 1.6;
  const moments = [];
  for (let k = 0; k < 16; k++) moments.push(100 + (k * P) / 16);
  const offs = [], ons = [];
  for (const tt of moments) offs.push(await frame(tt));
  await setWin(true);
  for (const tt of moments) ons.push(await frame(tt));
  await setWin(false);
  const diffN = (a, b) => { let n = 0, mx = 0; for (let i = 0; i < a.data.length; i += 3) { const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2])); if (d) { n++; if (d > mx) mx = d; } } return [n, mx]; };
  let best = 0, bestD = null;
  moments.forEach((tt, k) => { const d = diffN(offs[k], ons[k]); console.log(`moment t ${tt.toFixed(3)}: off vs on ${d[0]} px, max ${d[1]}/255`); if (!bestD || d[0] > bestD[0]) { best = k; bestD = d; } });
  if (bestD[0] === 0) { best = -1; console.log("all scanned moments read 0 px; sheet at the CPU-best phase t 100.1992 (check_gpu4: |band - band(window)| 0.0170 there)"); }
  console.log(`sheet moment: t ${(best >= 0 ? moments[best] : 100.1992).toFixed(3)} (${bestD[0]} px, max ${bestD[1]}/255)`);
  const caps = {};
  const sheetT = best >= 0 ? moments[best] : 100.1992;
  caps.ctrl1 = await frame(sheetT);
  caps.ctrl2 = await frame(sheetT);
  caps.off = best >= 0 ? offs[best] : await frame(sheetT);
  caps.on = ons[best >= 0 ? best : 0];
  if (best < 0) { await setWin(true); caps.on = await frame(sheetT); await setWin(false); }
  const order = ["ctrl1", "ctrl2", "off", "on"];
  const big = {};
  for (const k of order) { big[k] = scaled(caps[k], 2); writeFileSync(join(OUT, `x4_mnode27_fan_${k}.png`), encodePNG({ W: big[k].W, H: big[k].H, data: big[k].data })); }
  const W = Math.max(...order.map((k) => big[k].W)), H = Math.max(...order.map((k) => big[k].H));
  const SW = W + 2 * G, SH = order.length * H + (order.length + 1) * G;
  const data = Buffer.alloc(SW * SH * 3, 40);
  order.forEach((k, i) => { const im = big[k], oy = G + i * (H + G); for (let y = 0; y < im.H; y++) im.data.copy(data, ((oy + y) * SW + G) * 3, y * im.W * 3, (y + 1) * im.W * 3); });
  writeFileSync(join(OUT, "x4_mnode27_fan_sheet.png"), encodePNG({ W: SW, H: SH, data }));
  console.log(`${join(OUT, "x4_mnode27_fan_sheet.png")}: ${SW}x${SH} (ctrl1, ctrl2, off, on top to bottom; 2x)`);
  const diff = (a, b) => { let n = 0, mx = 0; for (let i = 0; i < a.data.length; i += 3) { const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2])); if (d) { n++; if (d > mx) mx = d; } } return `${n} px, max ${mx}/255`; };
  console.log(`diff ctrl1 vs ctrl2 (control): ${diff(caps.ctrl1, caps.ctrl2)}`);
  console.log(`diff ctrl2 vs off (control): ${diff(caps.ctrl2, caps.off)}`);
  console.log(`diff off vs on: ${diff(caps.off, caps.on)}`);
  await page.close();
} finally { await browser.close(); }
