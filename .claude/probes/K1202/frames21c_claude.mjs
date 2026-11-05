// K1202 21C look check (Claude): the frames behind sheet21c's kymograph, flag
// off beside flag on, at the rows where col 20->21 steps. Same stand, moves,
// pinned clocks and viewport as sheet21c.mjs (copied from it; the clip gains
// 30 css px of context). Per chosen row: off | on | |off-on| x4, each tile
// scaled x2 (nearest), one PNG per row under out21c/claude_frames/, plus an
// off/off control at the first row.
//   node frames21c_claude.mjs
import { mkdirSync, writeFileSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";
import { sleep } from "./lib.mjs";
import { STANDS, linkOf } from "./stands_cyc.mjs";

const HOST = process.env.K1139_HOST || "http://127.0.0.1:5831";
const DSF = 1.5, KROWS = 72, ZOOM = 2, GAP = 6, EXTRA = 30;
const OUT = "out21c/claude_frames";
mkdirSync(OUT, { recursive: true });
const st = STANDS.cyc;

// Rows whose col 20->21 step is over 10 luma in sheet21c's flag-off kymograph.
const ko = toRGB(decodePNG(readFileSync("out21c/sheet/cyc_e210_kymo_off.png")));
const lum = (im, x, y) => { const k = (y * im.W + x) * 3; return 0.2126 * im.data[k] + 0.7152 * im.data[k + 1] + 0.0722 * im.data[k + 2]; };
const stepRows = [];
for (let r = 0; r < KROWS; r++) { const d = Math.abs(lum(ko, 21, 2 * r) - lum(ko, 20, 2 * r)); if (d > 10) stepRows.push([r, d]); }
if (!stepRows.length) throw new Error("no step rows in the off kymograph");
const best = stepRows.reduce((a, b) => (b[1] > a[1] ? b : a));
const pick = [...new Set([stepRows[0][0], best[0], stepRows[stepRows.length - 1][0]])];
console.log(`step rows (>10 luma at 20->21): ${stepRows.map(([r, d]) => `${r}:${d.toFixed(0)}`).join(" ")}; picked ${pick.join(", ")}`);

const udd = mkdtempSync(join(import.meta.dirname, "udd", "k1202fr21c-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: udd,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding", "--window-size=1760,1060"],
});
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
  const m = 1.35 * arm.ppw + EXTRA;
  const clip = { x: Math.floor(Math.min(...xs) - m), y: Math.floor(Math.min(...ys) - m) };
  clip.width = Math.ceil(Math.max(...xs) + m) - clip.x;
  clip.height = Math.ceil(Math.max(...ys) + m) - clip.y;
  const P = arm.spacing / 1.6;
  // Where kymograph cols 17 and 21 sit in the clip (device px), for the report.
  const cum = [0];
  for (let i = 0; i < arm.pts.length - 1; i++) { const [ax, ay] = arm.pts[i], [bx, by] = arm.pts[i + 1]; cum.push(cum[i] + Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) * DSF))); }
  const at = (c) => { let i = 0; while (i < cum.length - 2 && cum[i + 1] <= c) i++; const [ax, ay] = arm.pts[i], [bx, by] = arm.pts[i + 1], n = cum[i + 1] - cum[i], j = c - cum[i]; return [((ax + ((bx - ax) * j) / n - clip.x) * DSF).toFixed(0), ((ay + ((by - ay) * j) / n - clip.y) * DSF).toFixed(0)]; };
  console.log(`clip ${JSON.stringify(clip)}, ppw ${arm.ppw.toFixed(2)}, head ${arm.head}; kymo col 0 at ${at(0)}, col 17 at ${at(17)}, col 21 at ${at(21)} (device px in the clip)`);
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
  const diffImg = (a, b) => { const o = { W: a.W, H: a.H, data: Buffer.alloc(a.data.length) }; let n = 0, mx = 0; for (let i = 0; i < a.data.length; i += 3) { let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(a.data[i + c] - b.data[i + c])); if (d) { n++; mx = Math.max(mx, d); } const v = Math.min(255, d * 4); o.data[i] = v; o.data[i + 1] = v; o.data[i + 2] = v; } return { img: o, n, mx }; };
  const strip = (tiles) => {
    const W = tiles[0].W * ZOOM, H = tiles[0].H * ZOOM, SW = tiles.length * W + (tiles.length - 1) * GAP;
    const data = Buffer.alloc(SW * H * 3, 40);
    tiles.forEach((im, t) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) im.data.copy(data, (y * SW + t * (W + GAP) + x) * 3, ((Math.floor(y / ZOOM)) * im.W + Math.floor(x / ZOOM)) * 3, ((Math.floor(y / ZOOM)) * im.W + Math.floor(x / ZOOM)) * 3 + 3); });
    return { W: SW, H, data };
  };
  for (const [i, r] of pick.entries()) {
    const t = 100 + (r * 1.5 * P) / KROWS;
    await setRamp(false);
    const off = await frame(t);
    if (i === 0) { const c = diffImg(off, await frame(t)); console.log(`row ${r} control off/off: ${c.n} px, max ${c.mx}/255`); }
    await setRamp(true);
    const on = await frame(t);
    const d = diffImg(off, on);
    const name = join(OUT, `row${String(r).padStart(2, "0")}_off_on_diff.png`);
    writeFileSync(name, encodePNG(strip([off, on, d.img])));
    console.log(`row ${r}: off vs on ${d.n} px, max ${d.mx}/255 -> ${name}`);
  }
  await setRamp(false);
  await page.close();
} finally {
  await browser.close();
  for (let i = 0; i < 10; i++) { try { rmSync(udd, { recursive: true, force: true }); break; } catch { await sleep(300); } }
}
