// K1203 21D look check (Claude): real frames of x4's mnode_27 fan and its
// child arm e18 with K1203's end-window switch off, on and off again, at
// pinned clocks over 1.5 pulse periods. Same stand and pins as K1202's
// frames21c_claude.mjs (x4 from ../stands_cyc.mjs, verbatim). Prints per
// clock the off/on and off/off pixel counts; writes off | on | |off-on| x4
// strips (x2, nearest) for the three clocks with the most changed pixels.
//   (from this folder) node frames21d.mjs   env K1203_HOST, default :5848
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { decodePNG, encodePNG, toRGB } from "../png.mjs";
import { sleep } from "../lib.mjs";
import { STANDS, linkOf } from "../stands_cyc.mjs";

const HOST = process.env.K1203_HOST || "http://127.0.0.1:5848";
const DSF = 1.5, N = 36, ZOOM = 2, GAP = 6, EXTRA = 30, CHILD = 18, PARENT = 135;
const OUT = "out21d";
mkdirSync(OUT, { recursive: true });
const st = STANDS.x4;

mkdirSync(join(import.meta.dirname, "udd"), { recursive: true });
const udd = mkdtempSync(join(import.meta.dirname, "udd", "k1203fr21d-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: udd,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding", "--window-size=1760,1060"],
});
try {
  const page = await browser.newPage();
  let lost = 0;
  await page.setViewport({ width: 1700, height: 950, deviceScaleFactor: DSF });
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
  await page.exposeFunction("__k1203Lost", () => { lost++; });
  await page.goto(`${HOST}/?${linkOf(st)}`, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer() && window.__knotFabric(), { timeout: 60000 });
  await page.evaluate(() => { const c = document.querySelector("canvas"); c.addEventListener("webglcontextlost", () => window.__k1203Lost()); });
  const stamp = () => page.evaluate(() => [...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /sim .* wall/.test(t)) || "");
  for (let n = 0, t0 = Date.now(); Date.now() - t0 < 40000;) { const s = await stamp(); n = /asleep/.test(s) ? n + 1 : 0; if (n >= 3) break; await sleep(300); }
  console.log(`stamp: ${(await stamp()).slice(0, 120)}`);
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
  const geo = await page.evaluate((ids) => {
    const k = window.__knotFabric(), r = window.__knotRenderer();
    const arm = (eid) => { const pts = []; for (let i = 0; i <= 128; i++) { const q = k.runPoint(eid, i / 128); pts.push([q.x, q.y]); } return pts; };
    const p0 = k.vertexScreen(k.head);
    const a = k.toWorld(p0.x, p0.y), b = k.toWorld(p0.x + 100, p0.y);
    return { child: arm(ids[0]), parent: arm(ids[1]), ppw: 100 / Math.hypot(b.x - a.x, b.y - a.y), spacing: r.pulseSpacing, head: k.head };
  }, [CHILD, PARENT]);
  // The clip: the child arm whole, plus the parent arm's first world unit
  // from the shared junction (the end of e135 nearest e18's ends).
  const d2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
  const ce = [geo.child[0], geo.child[geo.child.length - 1]];
  const pe = [geo.parent[0], geo.parent[geo.parent.length - 1]];
  let best = [0, 0, Infinity];
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const d = d2(ce[i], pe[j]); if (d < best[2]) best = [i, j, d]; }
  const par = best[1] === 0 ? geo.parent : [...geo.parent].reverse();
  const parNear = [];
  let len = 0;
  for (let i = 0; i < par.length; i++) { if (i) len += Math.sqrt(d2(par[i], par[i - 1])) / geo.ppw; if (len > 1.0) break; parNear.push(par[i]); }
  const pts = [...geo.child, ...parNear];
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const m = 1.35 * geo.ppw + EXTRA;
  const clip = { x: Math.floor(Math.min(...xs) - m), y: Math.floor(Math.min(...ys) - m) };
  clip.width = Math.ceil(Math.max(...xs) + m) - clip.x;
  clip.height = Math.ceil(Math.max(...ys) + m) - clip.y;
  if (clip.x < 0 || clip.y < 0 || clip.x + clip.width > 1700 || clip.y + clip.height > 950) {
    console.log(`clip ${JSON.stringify(clip)} leaves the 1700x950 viewport: clamped`);
    const x1 = Math.min(1700, clip.x + clip.width), y1 = Math.min(950, clip.y + clip.height);
    clip.x = Math.max(0, clip.x); clip.y = Math.max(0, clip.y);
    clip.width = x1 - clip.x; clip.height = y1 - clip.y;
  }
  const dev =(p) => [((p[0] - clip.x) * DSF).toFixed(0), ((p[1] - clip.y) * DSF).toFixed(0)];
  const junction = ce[best[0]], farEnd = ce[1 - best[0]];
  console.log(`clip ${JSON.stringify(clip)}, ppw ${geo.ppw.toFixed(2)}, head ${geo.head}; junction at ${dev(junction)}, e${CHILD}'s far end at ${dev(farEnd)} (device px in the clip)`);
  await page.evaluate(() => { for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden"; });
  const P = geo.spacing / 1.6;
  const raf3 = () => page.evaluate(() => new Promise((res) => { let k = 0; const f = () => (++k >= 3 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
  const frame = async (t) => {
    await page.evaluate((tt) => window.__knotPinClocks(tt), t);
    await raf3();
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
    await raf3();
  };
  const diffImg = (a, b) => { const o = { W: a.W, H: a.H, data: Buffer.alloc(a.data.length) }; let n = 0, mx = 0; for (let i = 0; i < a.data.length; i += 3) { let d = 0; for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(a.data[i + c] - b.data[i + c])); if (d) { n++; mx = Math.max(mx, d); } const v = Math.min(255, d * 4); o.data[i] = v; o.data[i + 1] = v; o.data[i + 2] = v; } return { img: o, n, mx }; };
  const strip = (tiles) => {
    const W = tiles[0].W * ZOOM, H = tiles[0].H * ZOOM, SW = tiles.length * W + (tiles.length - 1) * GAP;
    const data = Buffer.alloc(SW * H * 3, 40);
    tiles.forEach((im, t) => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = (Math.floor(y / ZOOM) * im.W + Math.floor(x / ZOOM)) * 3; im.data.copy(data, (y * SW + t * (W + GAP) + x) * 3, s, s + 3); } });
    return { W: SW, H, data };
  };
  const ts = Array.from({ length: N }, (_, i) => 100 + (i * 1.5 * P) / N);
  const pass = async (on) => { await setWin(on); const out = []; for (const t of ts) out.push(await frame(t)); return out; };
  const off1 = await pass(false), on = await pass(true), off2 = await pass(false);
  const rows = ts.map((t, i) => ({ i, t, on: diffImg(off1[i], on[i]), ctl: diffImg(off1[i], off2[i]) }));
  for (const r of rows) console.log(`t ${r.t.toFixed(3)}: off/on ${r.on.n} px max ${r.on.mx}; off/off ${r.ctl.n} px max ${r.ctl.mx}`);
  const tot = rows.reduce((a, r) => a + r.on.n, 0), totc = rows.reduce((a, r) => a + r.ctl.n, 0);
  console.log(`all ${N} clocks: off/on ${tot} px, max ${Math.max(...rows.map((r) => r.on.mx))}; off/off ${totc} px, max ${Math.max(...rows.map((r) => r.ctl.mx))}; context lost ${lost}`);
  const top = [...rows].sort((a, b) => b.on.n - a.on.n).slice(0, 3).filter((r) => r.on.n > 0);
  for (const r of top) {
    const name = join(OUT, `t${String(r.i).padStart(2, "0")}_off_on_diff.png`);
    writeFileSync(name, encodePNG(strip([off1[r.i], on[r.i], r.on.img])));
    writeFileSync(join(OUT, `t${String(r.i).padStart(2, "0")}_off.png`), encodePNG(off1[r.i]));
    writeFileSync(join(OUT, `t${String(r.i).padStart(2, "0")}_on.png`), encodePNG(on[r.i]));
    console.log(`clock ${r.i} (t ${r.t.toFixed(3)}): ${r.on.n} px, max ${r.on.mx}/255 -> ${name}`);
  }
  await setWin(false);
  await page.close();
} finally {
  await browser.close();
  for (let i = 0; i < 10; i++) { try { rmSync(udd, { recursive: true, force: true }); break; } catch { await sleep(300); } }
}
