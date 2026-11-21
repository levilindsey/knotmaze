// K1550 (27K): strong early-loss repro. The loss is driven from
// evaluateOnNewDocument: the first compileShader on the connected app
// canvas loses that canvas's context (env ARM=hook), or, with ARM=timing,
// 27G's shape (lose as soon as the canvas has a WebGL2 context, restore
// 5 s later). ARM=off loads clean. Every load is frozen to 27G's state
// (SIMT 20, hash f9d72040, __knotPinClocks, bit-still view), shot, and
// compared with the run's first clean load of the same renderer (the
// cross-load floor is the clean loads' own spread). A load is BROKEN
// when it is off that floor in the ring box or outside it.
//   node .claude/probes/K1537/repro27k.mjs <base> <outDir> <profileDir> <gf|today> <cleanLoads> <lossLoads>
//     env ARM=hook|timing SIMT=20 DSF=2 TOL=6 BOX_HALF=45
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { alignFreezeParity } from "../freeze_parity.mjs";
import { waitViewStill } from "../view_still.mjs";

const [, , base, outDir, profileDir, mode = "gf", cleanArg = "2", lossArg = "10"] = process.argv;
if (!base || !outDir || !profileDir) { console.error("usage: repro27k.mjs <base> <outDir> <profileDir> <gf|today> [clean] [loss]"); process.exit(2); }
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2), TOL = +(process.env.TOL ?? 6);
const BOX_HALF = +(process.env.BOX_HALF ?? 45), ARM = process.env.ARM ?? "hook";
const N_CLEAN = +cleanArg, N_LOSS = +lossArg;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const GF_Q = "&rp=gf&gfh=1";
const linkOf = (m) => `${base}/?3&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none&fl=1.2${m === "gf" ? GF_Q : ""}`;

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});

async function forceGfRedraw(page) {
  const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; return globalThis.__knotGf?.stats?.composites ?? -1; });
  if (c0 < 0) return -1;
  await page.waitForFunction((c) => (globalThis.__knotGf?.stats?.composites ?? -1) > c + 2, { timeout: 180000, polling: 100 }, c0);
  return page.evaluate(() => globalThis.__knotGf?.stats?.composites ?? -1);
}
async function freezePin(page) {
  await alignFreezeParity(page, SIMT);
  const hash = await page.evaluate(async (t) => {
    await window.__knotPhysFreeze(true);
    await window.__knotStepUntil(t);
    window.__knotPinClocks(100);
    window.__knotLoop?.({ continuous: true });
    const d = await window.__knotPhysDump();
    const h = d?.hashes ?? d; return String(h?.all ?? JSON.stringify(h).slice(0, 80));
  }, SIMT);
  const view = await waitViewStill(page);
  if (mode === "gf") { await forceGfRedraw(page); await forceGfRedraw(page); }
  await sleep(600);
  return { hash, view };
}
async function markerInfo(page) {
  return page.evaluate((dsf) => {
    const F = window.__knotFabricRenderer(), view = window.__knotView();
    return { cx: (F.headX * view.s + view.x) * dsf, cy: (F.headY * view.s + view.y) * dsf, view: { x: view.x, y: view.y, s: view.s } };
  }, DSF);
}
async function diffInPage(page, aB64, bB64, box) {
  return page.evaluate(async (a, b, bx, tol) => {
    const load = (s) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = "data:image/png;base64," + s; });
    const img = async (s) => { const im = await load(s); const cv = document.createElement("canvas"); cv.width = im.width; cv.height = im.height; const cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(im, 0, 0); return cx.getImageData(0, 0, im.width, im.height); };
    const A = await img(a), B = await img(b);
    const panelEl = document.querySelector(".tp-rotv, .tp-dfwv")?.getBoundingClientRect();
    const dsf = window.devicePixelRatio;
    const panel = panelEl ? { x: panelEl.x * dsf, y: panelEl.y * dsf, w: panelEl.width * dsf, h: panelEl.height * dsf } : null;
    let inN = 0, outN = 0, maxIn = 0, maxOut = 0, bb = null;
    for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
      if (panel && x >= panel.x - 4 && y <= panel.y + panel.h + 4) continue;
      if (y > A.height - 40 * dsf) continue;
      const o = (y * A.width + x) * 4;
      const d = Math.max(Math.abs(A.data[o] - B.data[o]), Math.abs(A.data[o + 1] - B.data[o + 1]), Math.abs(A.data[o + 2] - B.data[o + 2]));
      if (d <= tol) continue;
      const inside = x >= bx.x0 && x <= bx.x1 && y >= bx.y0 && y <= bx.y1;
      if (inside) { inN++; if (d > maxIn) maxIn = d; }
      else { outN++; if (d > maxOut) maxOut = d; if (!bb) bb = [x, y, x, y]; else { bb[0] = Math.min(bb[0], x); bb[1] = Math.min(bb[1], y); bb[2] = Math.max(bb[2], x); bb[3] = Math.max(bb[3], y); } }
    }
    return { inN, outN, maxIn, maxOut, outBox: bb };
  }, aB64, bB64, box, TOL);
}

const rows = [];
let refB64 = null, refBox = null;
async function oneLoad(tag, armed) {
  const errors = [];
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e.message ?? e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.evaluateOnNewDocument((arm, armMode) => {
    window.__knotLoopMode = "continuous";
    const K = { compiles: 0, lostCompiles: 0, lostAt: 0, restoredAt: 0, armed: arm, armMode, lostDone: false };
    window.__k27k = K;
    document.addEventListener("webglcontextlost", () => { if (!K.lostAt) K.lostAt = performance.now(); }, true);
    document.addEventListener("webglcontextrestored", () => { K.restoredAt = performance.now(); }, true);
    if (!arm) return;
    const hook = (proto) => {
      if (!proto || proto.__k27kHooked) return;
      proto.__k27kHooked = true;
      const orig = proto.compileShader;
      proto.compileShader = function (shader) {
        try {
          const gl = this;
          K.compiles++;
          if (gl.isContextLost()) K.lostCompiles++;
          if (armMode === "hook" && !K.lostDone && !sessionStorage.getItem("k27kLost") && gl.canvas && gl.canvas.isConnected) {
            K.lostDone = true;
            sessionStorage.setItem("k27kLost", "1");
            const ext = gl.getExtension("WEBGL_lose_context");
            window.__k27kExt = ext;
            if (ext) ext.loseContext();
          }
        } catch { /* the hook never breaks the page */ }
        return orig.call(this, shader);
      };
    };
    hook(window.WebGL2RenderingContext?.prototype);
    hook(window.WebGLRenderingContext?.prototype);
  }, armed, ARM);
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
  const t0 = Date.now();
  try {
    if (armed && ARM === "timing") {
      await page.goto(linkOf(mode), { waitUntil: "domcontentloaded", timeout: 900000 });
      await page.waitForFunction(() => [...document.querySelectorAll("canvas")].some((c) => { try { return !!c.getContext("webgl2"); } catch { return false; } }), { timeout: 60000, polling: 50 });
      await page.evaluate(() => {
        const cv = [...document.querySelectorAll("canvas")].find((c) => { try { return !!c.getContext("webgl2"); } catch { return false; } });
        window.__k27kExt = cv.getContext("webgl2").getExtension("WEBGL_lose_context");
        window.__k27kExt.loseContext();
      });
      await sleep(5000);
      await page.evaluate(() => window.__k27kExt.restoreContext());
    } else if (armed && ARM === "hook") {
      await page.goto(linkOf(mode), { waitUntil: "domcontentloaded", timeout: 900000 });
      // The hook loses the context at the first app compile; restore 5 s after it lands.
      await page.waitForFunction(() => !!window.__k27k?.lostDone, { timeout: 120000, polling: 100 });
      await sleep(5000);
      await page.evaluate(() => window.__k27kExt?.restoreContext());
    } else {
      await page.goto(linkOf(mode), { waitUntil: "load", timeout: 900000 });
    }
    await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
    if (mode === "gf") await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
    const { hash, view } = await freezePin(page);
    const info = await markerInfo(page);
    const box = { cx: Math.round(info.cx), cy: Math.round(info.cy), x0: Math.round(info.cx) - BOX_HALF, x1: Math.round(info.cx) + BOX_HALF, y0: Math.round(info.cy) - BOX_HALF, y1: Math.round(info.cy) + BOX_HALF };
    if (mode === "gf") await forceGfRedraw(page);
    const png = await page.screenshot({ type: "png" });
    writeFileSync(join(outDir, `${tag}.png`), png);
    const b64 = png.toString("base64");
    const diag = await page.evaluate(() => ({
      k27k: window.__k27k ? { compiles: window.__k27k.compiles, lostCompiles: window.__k27k.lostCompiles, lostAt: Math.round(window.__k27k.lostAt), restoredAt: Math.round(window.__k27k.restoredAt) } : null,
      ctx: window.__knotContext?.() ?? null,
      gfFallback: globalThis.__knotGf?.stats?.fallback ?? null,
      gfComp: globalThis.__knotGf?.stats?.composites ?? null,
    }));
    const row = { tag, armed, hash, view, box, diag, errors, ms: Date.now() - t0 };
    if (!refB64) { refB64 = b64; refBox = box; row.diff = { note: "reference" }; }
    else row.diff = await diffInPage(page, refB64, b64, refBox);
    rows.push(row);
    console.log(`[${tag}] hash ${hash} diff in ${row.diff?.inN ?? "-"} out ${row.diff?.outN ?? "-"} maxIn ${row.diff?.maxIn ?? "-"} lostCompiles ${diag.k27k?.lostCompiles} ctx ${JSON.stringify(diag.ctx)} errors ${errors.length}`);
    return row;
  } catch (e) {
    const row = { tag, armed, fatal: String(e?.message ?? e), errors, ms: Date.now() - t0 };
    rows.push(row);
    console.log(`[${tag}] FATAL ${e?.message ?? e} errors ${JSON.stringify(errors)}`);
    return row;
  } finally { await page.close().catch(() => {}); }
}

try {
  for (let i = 1; i <= N_CLEAN; i++) await oneLoad(`${mode}_clean${i}`, false);
  for (let i = 1; i <= N_LOSS; i++) await oneLoad(`${mode}_loss${i}`, true);
} finally {
  writeFileSync(join(outDir, `summary_${mode}_${ARM}.json`), JSON.stringify(rows, null, 2));
  await browser.close().catch(() => {});
}
const cleans = rows.filter((r) => !r.armed && !r.fatal);
const losses = rows.filter((r) => r.armed);
const floorIn = Math.max(0, ...cleans.map((r) => r.diff?.inN ?? 0));
const broken = losses.filter((r) => !r.fatal && ((r.diff?.inN ?? 0) > floorIn || (r.diff?.outN ?? 0) > 0));
console.log(`K1550 repro ${mode}/${ARM}: clean ${cleans.length} (floor in ${floorIn}), loss ${losses.length}, broken ${broken.length}, fatal ${rows.filter((r) => r.fatal).length}`);
