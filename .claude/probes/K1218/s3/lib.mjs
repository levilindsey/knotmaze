// K1218 S3 copy of S2's lib.mjs (default host :5980, profiles k1218s3-). K1218 S2 copy of K1211's lib.mjs (default host :5970, profiles k1218-). K1211 copy of K1139's lib.mjs (probe helpers, from K299's lib.mjs): an off-screen headed Chrome
// (own profile under udd/, deleted on close), sleep / view waits, the clock
// PIN, setState, moves by walk edge, and the in-page pulse DUMP (world arc
// through the dev server's own paint_math / paint_model modules).
import puppeteer from "puppeteer-core";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";

const PROFILES = join(import.meta.dirname, "udd");
export const HOST = process.env.K1211_HOST || "http://127.0.0.1:5980";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function openBrowser() {
  mkdirSync(PROFILES, { recursive: true });
  const udd = mkdtempSync(join(PROFILES, "k1218s3-"));
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: false,
    userDataDir: udd,
    args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
      "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding", "--window-size=1760,1060"],
  });
  const close = browser.close.bind(browser);
  browser.close = async () => {
    try { await close(); } finally {
      for (let i = 0; i < 10; i++) {
        try { rmSync(udd, { recursive: true, force: true }); break; } catch { await sleep(300); }
      }
    }
  };
  return browser;
}

export async function openPage(browser, query, log, vp = { width: 1700, height: 950, deviceScaleFactor: 1.5 }) {
  const page = await browser.newPage();
  page.on("console", (m) => log.push(`[${m.type()}] ${m.text()}`));
  page.on("pageerror", (e) => log.push(`[pageerror] ${e.message}`));
  await page.setViewport(vp);
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await page.evaluateOnNewDocument(() => {
    // K6-3: an idle on-demand page draws nothing, so a pinned-clock frame
    // strip would shoot one frame N times. Continuous mode before load.
    window.__knotLoopMode = "continuous";
    window.__ctxLost = 0;
    document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true);
  });
  await page.goto(`${HOST}/?${query}`, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer() && window.__knotFabric && window.__knotFabric(), { timeout: 60000 });
  return page;
}

export const stampText = (page) =>
  page.evaluate(() => [...document.querySelectorAll("div")].map((d) => d.textContent || "").find((t) => /sim .* wall/.test(t)) || "");

export async function waitAsleep(page, timeout = 40000) {
  let n = 0, s = "";
  for (const t0 = Date.now(); Date.now() - t0 < timeout; await sleep(300)) {
    s = await stampText(page);
    n = /asleep/.test(s) ? n + 1 : 0;
    if (n >= 3) return s;
  }
  return "TIMEOUT " + s;
}

export async function viewStill(page, timeout = 8000) {
  let last = "", n = 0;
  for (const t0 = Date.now(); Date.now() - t0 < timeout; await sleep(120)) {
    const v = await page.evaluate(() => { const v = window.__knotView(); return [v.x, v.y, v.s].map((a) => a.toFixed(3)).join(","); });
    n = v === last ? n + 1 : 0;
    last = v;
    if (n >= 4) return true;
  }
  return false;
}

// K431: a three-decimal viewStill is not pixel-still (a spring's tail creeps
// ~1e-5 a shot). Wait for a BIT-EXACT view, 10 equal full-precision polls,
// with frames forced between polls so the spring advances.
export async function viewExact(page, timeout = 20000) {
  let last = "", n = 0;
  for (const t0 = Date.now(); Date.now() - t0 < timeout; ) {
    await frames(page, 2);
    const v = await page.evaluate(() => { const v = window.__knotView(); return JSON.stringify([v.x, v.y, v.s]); });
    n = v === last ? n + 1 : 0;
    last = v;
    if (n >= 10) return true;
  }
  return false;
}

export const frames = (page, n) => page.evaluate((n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

export const PIN = () => {
  const r = window.__knotRenderer();
  const proto = Object.getPrototypeOf(r);
  r.advanceClocks = function () {};
  r.paintClock = 100;
  r.pulseBorn = 0;
  r.tickPaint = function () { return proto.tickPaint.call(this, 0); };
  try {
    const L = window.__knotBackgroundLayer && window.__knotBackgroundLayer();
    if (L) { L.tick = function () { return false; }; L.clock.time = 40; if (L.active) L.renderTexture(); }
  } catch { /* no background layer */ }
  for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden";
};

export async function setState(page, { t = 100, dbg = 0, webs = true }) {
  await page.evaluate((t, dbg, webs) => {
    const r = window.__knotRenderer();
    r.paintClock = t;
    r.paintDebug = dbg;
    if (r.filletMesh) r.filletMesh.mesh.renderable = webs;
    if (r.filletTopMesh) r.filletTopMesh.mesh.renderable = webs;
    r.tickPaint(0);
  }, t, dbg, webs);
  await frames(page, 3);
  await sleep(150);
}

// One move along walk edge `eid` (must be a choice); waits for the head.
export async function moveEdge(page, eid) {
  await viewStill(page);
  const head0 = await page.evaluate(() => window.__knotFabric().head);
  const ok = await page.evaluate((e) => window.__knotTurnMove(e), eid);
  if (!ok) return false;
  for (let i = 0; i < 100; i++) {
    await sleep(100);
    const f = await page.evaluate(() => { const k = window.__knotFabric(); return { a: k.animating, h: k.head }; });
    if (!f.a && f.h !== head0) break;
  }
  await sleep(300);
  await viewStill(page);
  return true;
}

// In-page: the head, its arms, every declared pulse with its walk edge, the
// edge's LATTICE length and its live WORLD arc span (kArcU over the paint
// geometry the shader reads), and the far vertex's kind and arm count.
export async function dumpPulses(page) {
  return page.evaluate(async () => {
    const PM = await import("/src/render/paint_math.ts");
    const MD = await import("/src/render/paint_model.ts");
    const D = MD.kData();
    const r = window.__knotRenderer(), fb = window.__knotFabricRenderer(), k = window.__knotFabric();
    const W = fb.walk;
    const arms = (v) => { const x = W.vertices.get(v); return x ? x.edges.reduce((n, eid) => n + (W.edges[eid].va === W.edges[eid].vb ? 2 : 1), 0) : 0; };
    const worldSpan = (chain, c0, c1) => {
      const c = PM.kChain(D, chain);
      if (c.closed) return Math.abs(PM.kArcU(D, c, c1) - PM.kArcU(D, c, c0));
      return Math.abs(PM.kArcOfCtrl(D, c, c1) - PM.kArcOfCtrl(D, c, c0));
    };
    const pulses = r.paintState.paintPulses.map((p) => {
      const e = W.edges.find((e) => e.chain === p.chain && ((e.ctrlA === p.cJunction && e.ctrlB === p.cFar) || (e.ctrlB === p.cJunction && e.ctrlA === p.cFar)));
      const atA = e ? e.ctrlA === p.cJunction : null;
      const near = e ? (atA ? e.va : e.vb) : null, far = e ? (atA ? e.vb : e.va) : null;
      return {
        chain: p.chain, cJ: p.cJunction, cF: p.cFar, inward: !!p.inward, hovered: !!p.hovered,
        dist0: p.dist0 ?? 0, cont: !!p.cont, edge: e ? e.id : -1, near, far,
        lattice: e ? e.length : NaN, world: worldSpan(p.chain, p.cJunction, p.cFar),
        farEnd: far ? !!W.vertices.get(far)?.isEnd : null, farArms: far ? arms(far) : 0,
      };
    });
    return {
      head: k.head, headArms: arms(k.head), choices: k.choices.map((c) => ({ edge: c.edge, far: c.far, farDeadEnd: c.farDeadEnd })),
      reach: r.pulseReach, spacing: r.pulseSpacing, pathEdges: k.pathEdges, pulses,
      headScreen: k.vertexScreen(k.head), view: window.__knotView(),
    };
  });
}
