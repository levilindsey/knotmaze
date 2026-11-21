// K1550 (27K) diag 7: GL state on a clean page vs a hook-broken page.
//   node .claude/probes/K1537/diag7_27k.mjs <base> <outDir> <profileDir> <refPng>
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

async function settled(p, armed) {
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
  const box = { x0: Math.round(info.cx) - 45, x1: Math.round(info.cx) + 45, y0: Math.round(info.cy) - 45, y1: Math.round(info.cy) + 45 };
  await forceGfRedraw(p);
  const png = await p.screenshot({ type: "png" });
  const d0 = await diff(p, png.toString("base64"), refB64, box);
  return { box, d0 };
}
const glState = (p) => p.evaluate(() => {
  const cv = [...document.querySelectorAll("canvas")].find((c) => { try { return !!c.getContext("webgl2"); } catch { return false; } });
  const gl = cv.getContext("webgl2");
  const arr = (v) => (v ? [...v] : null);
  return {
    viewport: arr(gl.getParameter(gl.VIEWPORT)),
    fb: gl.getParameter(gl.FRAMEBUFFER_BINDING) === null,
    prog: gl.getParameter(gl.CURRENT_PROGRAM) !== null,
    blend: gl.getParameter(gl.BLEND), mask: arr(gl.getParameter(gl.COLOR_WRITEMASK)),
    scissor: gl.getParameter(gl.SCISSOR_TEST), box: arr(gl.getParameter(gl.SCISSOR_BOX)),
    cw: cv.width, ch: cv.height, err: gl.getError(),
  };
});

// Clean page.
{
  const p = await browser.newPage();
  await p.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
  await p.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
  await p.goto(`${base}/?3&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none&fl=1.2&rp=gf&gfh=1`, { waitUntil: "load", timeout: 900000 });
  const { d0 } = await settled(p, false);
  console.log("CLEAN diff", JSON.stringify(d0), "GL", JSON.stringify(await glState(p)));
  await p.close().catch(() => {});
}
// Broken page (retry until broken).
for (let attempt = 1; attempt <= 6; attempt++) {
  const p = await browser.newPage();
  await p.evaluateOnNewDocument(() => {
    window.__knotLoopMode = "continuous";
    const K = { lostDone: false };
    window.__k27k = K;
    const hook = (proto) => {
      if (!proto || proto.__k27kHooked) return;
      proto.__k27kHooked = true;
      const orig = proto.compileShader;
      proto.compileShader = function (shader) {
        try {
          const gl = this;
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
  const { d0 } = await settled(p, true);
  console.log(`[try${attempt}] diff in ${d0.inN} out ${d0.outN}`);
  if (d0.inN > 100) {
    console.log("BROKEN GL", JSON.stringify(await glState(p)));
    writeFileSync(join(outDir, "diag7.json"), JSON.stringify(d0));
    await p.close().catch(() => {});
    break;
  }
  await p.close().catch(() => {});
}
await browser.close().catch(() => {});
console.log("DIAG7 done");
