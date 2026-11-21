// K1550 (27K) diag 2: on one hook-broken gf page, dump the poisoned
// objects, clear every _gpuData under the root by traversal, then try a
// probe-driven scene rebuild (__knotPlayDaily) as the rebuild test.
//   node .claude/probes/K1537/diag2_27k.mjs <base> <outDir> <profileDir> <refPng>
import puppeteer from "puppeteer-core";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { alignFreezeParity } from "../freeze_parity.mjs";
import { waitViewStill } from "../view_still.mjs";
const [, , base, outDir, profileDir, refPath] = process.argv;
const SIMT = 20, DSF = 2, TOL = 6;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const refB64 = readFileSync(refPath).toString("base64");
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
const diff = (page, a, b, box) => page.evaluate(async (x, y, bx, tol) => {
  const load = (s) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = "data:image/png;base64," + s; });
  const img = async (s) => { const im = await load(s); const cv = document.createElement("canvas"); cv.width = im.width; cv.height = im.height; const cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(im, 0, 0); return cx.getImageData(0, 0, im.width, im.height); };
  const A = await img(x), B = await img(y);
  let inN = 0, outN = 0;
  for (let yy = 0; yy < A.height; yy++) for (let xx = 0; xx < A.width; xx++) {
    if (yy > A.height - 80) continue;
    const o = (yy * A.width + xx) * 4;
    if (Math.max(Math.abs(A.data[o] - B.data[o]), Math.abs(A.data[o + 1] - B.data[o + 1]), Math.abs(A.data[o + 2] - B.data[o + 2])) <= tol) continue;
    if (xx >= bx.x0 && xx <= bx.x1 && yy >= bx.y0 && yy <= bx.y1) inN++; else outN++;
  }
  return { inN, outN };
}, a, b, box, TOL);

let page = null, box = null;
for (let attempt = 1; attempt <= 5 && !page; attempt++) {
  const p = await browser.newPage();
  await p.evaluateOnNewDocument(() => {
    window.__knotLoopMode = "continuous";
    const K = { compiles: 0, lostCompiles: 0, lostDone: false };
    window.__k27k = K;
    const hook = (proto) => {
      if (!proto || proto.__k27kHooked) return;
      proto.__k27kHooked = true;
      const orig = proto.compileShader;
      proto.compileShader = function (shader) {
        try {
          const gl = this;
          K.compiles++;
          if (gl.isContextLost()) K.lostCompiles++;
          if (!K.lostDone && gl.canvas && gl.canvas.isConnected) {
            K.lostDone = true;
            const ext = gl.getExtension("WEBGL_lose_context");
            window.__k27kExt = ext;
            if (ext) ext.loseContext();
          }
        } catch { /* never break the page */ }
        return orig.call(this, shader);
      };
    };
    hook(window.WebGL2RenderingContext?.prototype);
    hook(window.WebGLRenderingContext?.prototype);
  });
  await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
  await p.goto(`${base}/?3&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none&fl=1.2&rp=gf&gfh=1`, { waitUntil: "domcontentloaded", timeout: 900000 });
  await p.waitForFunction(() => !!window.__k27k?.lostDone, { timeout: 120000, polling: 100 });
  await sleep(5000);
  await p.evaluate(() => window.__k27kExt?.restoreContext());
  await p.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  await p.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
  await alignFreezeParity(p, SIMT);
  await p.evaluate(async (t) => {
    await window.__knotPhysFreeze(true); await window.__knotStepUntil(t);
    window.__knotPinClocks(100); window.__knotLoop?.({ continuous: true });
  }, SIMT);
  await waitViewStill(p);
  await forceGfRedraw(p); await forceGfRedraw(p);
  await sleep(600);
  const info = await p.evaluate((dsf) => {
    const F = window.__knotFabricRenderer(), view = window.__knotView();
    return { cx: (F.headX * view.s + view.x) * dsf, cy: (F.headY * view.s + view.y) * dsf };
  }, DSF);
  box = { x0: Math.round(info.cx) - 45, x1: Math.round(info.cx) + 45, y0: Math.round(info.cy) - 45, y1: Math.round(info.cy) + 45 };
  await forceGfRedraw(p);
  const png = await p.screenshot({ type: "png" });
  const d0 = await diff(p, png.toString("base64"), refB64, box);
  console.log(`[try${attempt}] diff in ${d0.inN} out ${d0.outN}`);
  if (d0.inN > 100) page = p;
  else await p.close().catch(() => {});
}
if (!page) { console.log("DIAG2: no broken page"); await browser.close().catch(() => {}); process.exit(0); }
const dump = await page.evaluate(() => {
  const canvases = [...document.querySelectorAll("canvas")].map((c) => {
    let t = "none"; try { t = c.getContext("webgl2") ? "webgl2" : "other"; } catch { t = "err"; }
    return { w: c.width, h: c.height, ctx: t };
  });
  const F = window.__knotFabricRenderer();
  const m = F.markers.start.mesh;
  const prog = m.shader?.glProgram;
  const glowSrc = F.glowSprite?.texture?.source;
  return {
    canvases,
    progAttr: prog?._attributeData ? Object.keys(prog._attributeData) : null,
    progUniform: prog?._uniformData ? Object.keys(prog._uniformData).slice(0, 12) : null,
    progKey: prog?._key ?? null,
    meshGpu: m.geometry?._gpuData ? Object.keys(m.geometry._gpuData) : null,
    glowGpu: glowSrc?._gpuData ? Object.keys(glowSrc._gpuData) : null,
    glowTex: F.glowSprite ? { visible: F.glowSprite.visible, alpha: F.glowSprite.alpha } : null,
    markerVisible: m.visible, markerRenderable: m.renderable,
  };
});
console.log("DUMP", JSON.stringify(dump));
async function shootDiff(name) {
  await forceGfRedraw(page).catch(() => {});
  await sleep(700);
  const png = await page.screenshot({ type: "png" });
  writeFileSync(join(outDir, `diag2_${name}.png`), png);
  const d = await diff(page, png.toString("base64"), refB64, box);
  console.log(`[${name}] in ${d.inN} out ${d.outN}`);
  return d;
}
// R3: clear every _gpuData reachable under fabric + ribbons.
await page.evaluate(() => {
  const F = window.__knotFabricRenderer();
  const R = window.__knotRenderer();
  const seen = new Set();
  const clear = (o) => {
    if (!o || typeof o !== "object" || seen.has(o)) return;
    seen.add(o);
    if (o._gpuData && typeof o._gpuData === "object") { for (const k of Object.keys(o._gpuData)) o._gpuData[k] = null; }
    if (o.geometry) clear(o.geometry);
    if (o.texture?.source) clear(o.texture.source);
    if (o.shader?.resources) { for (const r of Object.values(o.shader.resources)) { if (r?.buffer) r.buffer._gpuData = {}; if (r?._bufferResource?.buffer) r._bufferResource.buffer._gpuData = {}; } }
    for (const c of o.children ?? []) clear(c);
  };
  clear(F.overContainer); clear(F.underContainer); clear(R.root);
  for (const mk of Object.values(F.markers)) clear(mk.mesh);
});
await shootDiff("r3_gpu_clear");
// R4: rebuild through the daily path (a fresh scene: new ribbons + fabric).
const before = await page.evaluate(() => window.__knotDaily?.()?.daily ?? "none");
await page.evaluate(() => window.__knotPlayDaily?.(1));
await sleep(4000);
const afterDaily = await page.evaluate(() => {
  const F = window.__knotFabricRenderer();
  if (!F) return { built: false };
  const view = window.__knotView();
  return { built: true, head: [F.headX, F.headY], view: { x: view.x, y: view.y, s: view.s }, daily: window.__knotDaily?.()?.daily ?? null };
});
console.log("R4 daily rebuild:", JSON.stringify({ before, afterDaily }));
await sleep(2000);
const png4 = await page.screenshot({ type: "png" });
writeFileSync(join(outDir, "diag2_r4_daily.png"), png4);
await browser.close().catch(() => {});
console.log("DIAG2 done");
