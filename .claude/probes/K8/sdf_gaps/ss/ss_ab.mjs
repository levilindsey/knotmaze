// ss_ab.mjs (K8 sdf gaps): the same-state pair, rp=sdf against the default
// on one build, with a same-build control first (K390), then the GL checks.
//   node ss_ab.mjs <host> <outDir> <tag> <query> [glQuery ...]
// Pages, in one headed off-screen Chrome (fresh profile, deleted after):
//   A  = <query>            (default ribbons)
//   A2 = <query>            (the control: must read 0 px against A)
//   B  = <query>&rp=sdf     (the SDF pass)
// Each: phw=0 is expected in <query> (in-thread physics: every load sleeps
// in the same state), wait for sleep, freeze (__knotPhysFreeze), hash the
// state (__knotPhysDump: A, A2 and B must agree), k83's pins + the flow
// clock and background (g3_probe's PIN), park the pointer, screenshot.
// Diffs: every pixel (max channel delta), and the CLUSTERS of visible
// diffs (delta > 24, 8-connected) thicker than 2 px (a pixel whose 3x3
// neighbourhood differs entirely survives one erosion): each one listed
// with its bbox and crop for attribution.
// Every page also reports gl.getError() and isContextLost() on the app's
// context and counts webglcontextlost; each extra glQuery is opened as
// default and rp=sdf for that check alone.
import puppeteer from "puppeteer-core";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decodePNG, encodePNG } from "./png.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const [, , host, outDir, tag, query, ...glQueries] = process.argv;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = 1400, H = 900;

const PRELUDE = () => {
  window.__k8 = { lost: 0 };
  const hook = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    if (!this.__k8hooked && /webgl/.test(String(type)) && this.isConnected !== undefined) {
      this.__k8hooked = true;
      this.addEventListener("webglcontextlost", () => { if (this.isConnected) window.__k8.lost++; });
    }
    return hook.call(this, type, ...rest);
  };
};

async function openPage(browser, q, h = host) {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.evaluateOnNewDocument(PRELUDE);
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto(`${h}/?${q}`, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(1, 1);
  await page.waitForFunction(() => typeof window.__knotPerf === "function" && window.__knotRenderer && window.__knotRenderer(), { timeout: 90000, polling: 250 });
  return { page, errors };
}

async function waitAsleep(page, maxMs = 240000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const ok = await page.evaluate(() => {
      const p = window.__knotPerf();
      return (p.state === "frozen" || p.asleep) && !p.plucks;
    });
    if (ok) return Date.now() - t0;
    await sleep(500);
  }
  return -1;
}

const waitStill = async (page, maxMs = 8000) => {
  let prev = null, calm = 0;
  for (let t = 0; t < maxMs; t += 150) {
    const v = await page.evaluate(() => window.__knotView());
    if (prev && v.s === prev.s && v.x === prev.x && v.y === prev.y) { if (++calm >= 5) return true; } else calm = 0;
    prev = v;
    await sleep(150);
  }
  return false;
};

const PIN = () => {
  const r = window.__knotRenderer(), proto = Object.getPrototypeOf(r);
  r.advanceClocks = function () {}; r.paintClock = 100; r.pulseBorn = 0;
  r.tickPaint = function () { return proto.tickPaint.call(this, 0); };
  r.flowTime = 0;
  try {
    const L = window.__knotBackgroundLayer && window.__knotBackgroundLayer();
    if (L) { L.tick = function () { return false; }; L.clock.time = 40; if (L.active) L.renderTexture(); }
  } catch (e) { /* no background layer */ }
  for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden";
  if (window.__knotLoop) window.__knotLoop({ continuous: true });
};

const GLCHECK = () => {
  const L = window.__knotBackgroundLayer && window.__knotBackgroundLayer();
  const gl = L && L.renderer && L.renderer.gl;
  return { glError: gl ? gl.getError() : -1, contextLost: gl ? gl.isContextLost() : null, lostEvents: window.__k8.lost,
    pass: (() => { const r = window.__knotRenderer && window.__knotRenderer(); return r ? `${r.stripPass && r.stripPass.constructor.name}${r.rpFallback ? " (fallback)" : ""}` : null; })() };
};

async function shoot(browser, name, q, h = host) {
  const { page, errors } = await openPage(browser, q, h);
  // env MAXREST: the sleep wait's cap in ms (max fabric never sleeps;
  // past the cap the page is frozen where it stands, restMs -1)
  const restMs = await waitAsleep(page, Number(process.env.MAXREST ?? 240000));
  const frozen = await page.evaluate(async () => (typeof window.__knotPhysFreeze === "function" ? await window.__knotPhysFreeze(true) : null));
  const dump = await page.evaluate(async () => (typeof window.__knotPhysDump === "function" ? await window.__knotPhysDump({}) : null));
  await page.evaluate(PIN);
  await sleep(1000);
  const still = await waitStill(page);
  await sleep(500);
  const buf = await page.screenshot();
  writeFileSync(join(outDir, `${tag}_${name}.png`), buf);
  const gl = await page.evaluate(GLCHECK);
  const stamp = await page.evaluate(() => [...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /^P\d/.test(t)) || "");
  await page.close();
  return { img: decodePNG(buf), info: { q, restMs, frozen, dump, still, gl, errors, stamp: stamp.slice(0, 80) } };
}

function diff(a, b, name) {
  let n = 0, maxD = 0;
  const vis = new Uint8Array(a.W * a.H);
  const img = Buffer.alloc(a.W * a.H * 3);
  for (let i = 0; i < a.W * a.H; i++) {
    const p = i * a.ch, q = i * b.ch;
    const d = Math.max(Math.abs(a.data[p] - b.data[q]), Math.abs(a.data[p + 1] - b.data[q + 1]), Math.abs(a.data[p + 2] - b.data[q + 2]));
    let col = [a.data[p] >> 2, a.data[p + 1] >> 2, a.data[p + 2] >> 2];
    if (d > 0) { n++; if (d > maxD) maxD = d; col = d > 24 ? [255, 0, 0] : [255, 200, 0]; }
    if (d > 24) vis[i] = 1;
    img[i * 3] = col[0]; img[i * 3 + 1] = col[1]; img[i * 3 + 2] = col[2];
  }
  if (n) writeFileSync(join(outDir, `${tag}_diff_${name}.png`), encodePNG({ W: a.W, H: a.H, data: img }));
  // clusters of visible diffs, and their cores (pixels whose 3x3 all differ)
  const comp = new Int32Array(a.W * a.H).fill(-1);
  const clusters = [];
  let visN = 0;
  for (let s = 0; s < a.W * a.H; s++) {
    if (!vis[s] || comp[s] >= 0) continue;
    const id = clusters.length;
    const c = { px: 0, core: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1 };
    const stack = [s];
    comp[s] = id;
    while (stack.length) {
      const i = stack.pop();
      const x = i % a.W, y = (i / a.W) | 0;
      c.px++; visN++;
      c.x0 = Math.min(c.x0, x); c.y0 = Math.min(c.y0, y); c.x1 = Math.max(c.x1, x); c.y1 = Math.max(c.y1, y);
      let all = true;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= a.W || yy >= a.H) { all = false; continue; }
        const j = yy * a.W + xx;
        if (!vis[j]) { all = false; continue; }
        if (comp[j] < 0) { comp[j] = id; stack.push(j); }
      }
      if (all) c.core++;
    }
    clusters.push(c);
  }
  const thick = clusters.filter((c) => c.core > 0).sort((p, q) => q.core - p.core);
  return { differingPx: n, maxDelta: maxD, visiblePx: visN, clusters: clusters.length, thickClusters: thick.length, thick: thick.slice(0, 40) };
}

mkdirSync(outDir, { recursive: true });
mkdirSync(join(HERE, "profiles"), { recursive: true });
const profile = mkdtempSync(join(HERE, "profiles", "ss-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: profile,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding",
    `--window-size=${W + 120},${H + 160}`],
});
const res = { tag, query };
try {
  const A = await shoot(browser, "A", query);
  const A2 = await shoot(browser, "A2", query);
  // env HOSTB / QB: B's build and link suffix (default: this build, &rp=sdf);
  // HOSTB=<other build> QB=none is a cross-build check of the default path.
  const qb = process.env.QB ?? "&rp=sdf";
  const B = await shoot(browser, "B", `${query}${qb === "none" ? "" : qb}`, process.env.HOSTB ?? host);
  res.pages = { A: A.info, A2: A2.info, B: B.info };
  res.control = diff(A.img, A2.img, "control");
  res.pair = diff(A.img, B.img, "pair");
  res.gl = [];
  for (const q of glQueries) {
    for (const v of [q, `${q}&rp=sdf`]) {
      const { page, errors } = await openPage(browser, v);
      await sleep(15000);
      const g = await page.evaluate(GLCHECK);
      res.gl.push({ q: v, ...g, errors });
      await page.close();
    }
  }
} finally {
  await browser.close();
  rmSync(profile, { recursive: true, force: true });
}
writeFileSync(join(outDir, `${tag}_result.json`), JSON.stringify(res, null, 1));
console.log(JSON.stringify({ control: { ...res.control, thick: res.control.thick.slice(0, 5) }, pair: { ...res.pair, thick: res.pair.thick.slice(0, 8) },
  hashes: Object.fromEntries(Object.entries(res.pages).map(([k, v]) => [k, v.dump && (v.dump.hash ?? v.dump.hashes ?? v.dump)])),
  glPages: Object.fromEntries(Object.entries(res.pages).map(([k, v]) => [k, v.gl])), gl: res.gl,
  rest: Object.fromEntries(Object.entries(res.pages).map(([k, v]) => [k, [v.restMs, v.still, v.errors.length]])) }, null, 1));
