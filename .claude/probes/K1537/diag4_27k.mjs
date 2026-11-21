// K1550 (27K) diag 4: dump GPU object state on one hook-broken page.
//   node .claude/probes/K1537/diag4_27k.mjs <base> <outDir> <profileDir> <refPng>
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
if (!page) { console.log("DIAG4: no broken page"); await browser.close().catch(() => {}); process.exit(0); }
const dump = await page.evaluate(() => {
  const F = window.__knotFabricRenderer();
  const R = window.__knotRenderer();
  const m = F.markers.start.mesh;
  const geo = m.geometry;
  const gpu = geo._gpuData?.[0];
  const bufs = geo.buffers.map((b) => {
    const g = b._gpuData?.[0];
    return { upd: b._updateID, gUpd: g?.updateID, bufNull: !g?.buffer, byteLen: g?.byteLength, dataLen: b.data?.byteLength ?? null };
  });
  const glowSrc = F.glowSprite?.texture?.source;
  const glowGpu = glowSrc?._gpuData?.[0];
  const uni = m.shader?.resources?.markerUniforms;
  const ubuf = uni?.buffer ?? uni?._bufferResource?.buffer;
  const ubGpu = ubuf?._gpuData?.[0];
  const cv = [...document.querySelectorAll("canvas")].find((c) => { try { return !!c.getContext("webgl2"); } catch { return false; } });
  const gl = cv.getContext("webgl2");
  return {
    vaoKeys: gpu ? Object.keys(gpu.vaoCache) : null,
    vaoValsNull: gpu ? Object.values(gpu.vaoCache).map((v) => !v) : null,
    bufs,
    glow: { texNull: !glowGpu?.texture, w: glowGpu?.width, h: glowGpu?.height },
    ubo: ubuf ? { upd: ubuf._updateID, gUpd: ubGpu?.updateID, bufNull: !ubGpu?.buffer } : null,
    glErr: gl.getError(),
    progAttr: m.shader?.glProgram?._attributeData ? Object.keys(m.shader.glProgram._attributeData) : null,
    fills: R.fills?.length ?? null,
    rootChildren: R.root?.children?.length ?? null,
  };
});
console.log("DUMP4", JSON.stringify(dump, null, 1));
writeFileSync(join(outDir, "diag4.json"), JSON.stringify(dump, null, 2));
await browser.close().catch(() => {});
console.log("DIAG4 done");
