// K1537 (27G): hunt a live early-loss-broken page, dump the poisoned GPU
// state, try the in-page revival (drop the dead _gpuData entries), and
// re-shoot. A load counts as broken when its settled shot differs from
// the clean reference inside the ring box by more than 100 px.
//   node .claude/probes/K1537/hunt.mjs <base> <outDir> <profileDir> <refPng> [maxLoads=8]
import puppeteer from "puppeteer-core";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { alignFreezeParity } from "../freeze_parity.mjs";
import { waitViewStill } from "../view_still.mjs";
const [, , base, outDir, profileDir, refPath, maxArg = "8"] = process.argv;
const SIMT = 20, DSF = 2, TOL = 6, MAX = +maxArg;
mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const refB64 = readFileSync(refPath).toString("base64");
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const diff = (page, a, b, box) => page.evaluate(async (x, y, bx, tol) => {
  const load = (s) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = "data:image/png;base64," + s; });
  const img = async (s) => { const im = await load(s); const cv = document.createElement("canvas"); cv.width = im.width; cv.height = im.height; const cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(im, 0, 0); return cx.getImageData(0, 0, im.width, im.height); };
  const A = await img(x), B = await img(y);
  let inN = 0, outN = 0;
  for (let yy = 0; yy < A.height; yy++) for (let xx = 0; xx < A.width; xx++) {
    if (xx >= 2500 || yy > A.height - 80) continue;
    const o = (yy * A.width + xx) * 4;
    if (Math.max(Math.abs(A.data[o] - B.data[o]), Math.abs(A.data[o + 1] - B.data[o + 1]), Math.abs(A.data[o + 2] - B.data[o + 2])) <= tol) continue;
    if (xx >= bx.x0 && xx <= bx.x1 && yy >= bx.y0 && yy <= bx.y1) inN++; else outN++;
  }
  return { inN, outN };
}, a, b, box, TOL);
try {
  for (let n = 1; n <= MAX; n++) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message ?? e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
    await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
    await page.goto(`${base}/?3&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none&fl=1.2&rp=gf&gfh=1`, { waitUntil: "domcontentloaded", timeout: 900000 });
    await page.waitForFunction(() => [...document.querySelectorAll("canvas")].some((c) => { try { return !!c.getContext("webgl2"); } catch { return false; } }), { timeout: 60000, polling: 50 });
    await page.evaluate(() => {
      const cv = [...document.querySelectorAll("canvas")].find((c) => { try { return !!c.getContext("webgl2"); } catch { return false; } });
      window.__k1537ext = cv.getContext("webgl2").getExtension("WEBGL_lose_context");
      window.__k1537ext.loseContext();
    });
    await sleep(5000);
    await page.evaluate(() => window.__k1537ext.restoreContext());
    await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
    await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
    await alignFreezeParity(page, SIMT);
    const hash = await page.evaluate(async (t) => {
      await window.__knotPhysFreeze(true); await window.__knotStepUntil(t);
      window.__knotPinClocks(100); window.__knotLoop?.({ continuous: true });
      const d = await window.__knotPhysDump(); const h = d?.hashes ?? d; return String(h?.all ?? "");
    }, SIMT);
    await waitViewStill(page);
    const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; return globalThis.__knotGf.stats.composites; });
    await page.waitForFunction((c) => globalThis.__knotGf.stats.composites > c + 2, { timeout: 180000, polling: 100 }, c0);
    await sleep(600);
    const info = await page.evaluate((dsf) => {
      const F = window.__knotFabricRenderer(), view = window.__knotView();
      return { cx: (F.headX * view.s + view.x) * dsf, cy: (F.headY * view.s + view.y) * dsf };
    }, DSF);
    const box = { x0: Math.round(info.cx) - 45, x1: Math.round(info.cx) + 45, y0: Math.round(info.cy) - 45, y1: Math.round(info.cy) + 45 };
    const png = await page.screenshot({ type: "png" });
    writeFileSync(join(outDir, `hunt${n}.png`), png);
    const d0 = await diff(page, png.toString("base64"), refB64, box);
    console.log(`[hunt${n}] hash ${hash} vs clean: in ${d0.inN} out ${d0.outN} errors ${errors.length}`);
    if (d0.inN <= 100) { await page.close().catch(() => {}); continue; }
    // Broken: dump the GPU state, revive, re-shoot.
    const state = await page.evaluate(() => {
      const F = window.__knotFabricRenderer();
      const chain = (o) => { const r = []; for (let p = o; p; p = p.parent) r.push({ label: p.label ?? p.constructor?.name, visible: p.visible, alpha: p.alpha }); return r; };
      const markers = {};
      for (const [k, m] of Object.entries(F.markers)) {
        const gp = m.mesh.getGlobalPosition?.();
        markers[k] = { visible: m.mesh.visible, renderable: m.mesh.renderable, pos: [m.mesh.position.x, m.mesh.position.y], global: gp ? [gp.x, gp.y] : null, scale: m.mesh.scale.x };
      }
      const gs = F.glowSprite;
      const ggp = gs?.getGlobalPosition?.();
      return {
        markers,
        glow: gs ? { visible: gs.visible, renderable: gs.renderable, alpha: gs.alpha, w: gs.width, pos: [gs.position.x, gs.position.y], global: ggp ? [ggp.x, ggp.y] : null, texW: gs.texture?.source?.width, chain: chain(gs) } : null,
        over: { visible: F.overContainer.visible, parent: F.overContainer.parent?.constructor?.name ?? null, children: F.overContainer.children.length },
        under: { visible: F.underContainer.visible, parent: F.underContainer.parent?.constructor?.name ?? null, children: F.underContainer.children.length },
        gf: { fallback: globalThis.__knotGf?.stats?.fallback, comp: globalThis.__knotGf?.stats?.composites, rebuilds: globalThis.__knotGf?.stats?.rebuilds },
        ctx: window.__knotContext?.() ?? null,
        rootChildren: (window.__knotRenderer()?.root?.children ?? []).map((c) => ({ t: c.constructor?.name, visible: c.visible, children: c.children?.length ?? -1 })),
        fabricParents: { overParent: F.overContainer.parent?.constructor?.name ?? null, underParent: F.underContainer.parent?.constructor?.name ?? null },
      };
    });
    console.log("state " + JSON.stringify(state));
    const revived = await page.evaluate(() => {
      const F = window.__knotFabricRenderer();
      const drop = (o) => { if (o?._gpuData) for (const k of Object.keys(o._gpuData)) delete o._gpuData[k]; };
      drop(F.glowSprite?.texture?.source);
      for (const m of Object.values(F.markers)) {
        drop(m.mesh.texture?.source);
        drop(m.mesh.geometry);
        for (const b of m.mesh.geometry.buffers) drop(b);
        const res = m.mesh.shader?.resources;
        for (const v of Object.values(res ?? {})) { drop(v); drop(v?._buffer); }
      }
      globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true };
      return "dropped";
    });
    console.log("revive " + revived);
    const c1 = await page.evaluate(() => globalThis.__knotGf.stats.composites);
    await page.waitForFunction((c) => globalThis.__knotGf.stats.composites > c + 2, { timeout: 180000, polling: 100 }, c1).catch(() => {});
    await sleep(800);
    const png2 = await page.screenshot({ type: "png" });
    writeFileSync(join(outDir, `hunt${n}_revived.png`), png2);
    const d1 = await diff(page, png2.toString("base64"), refB64, box);
    console.log(`[hunt${n}] after revive vs clean: in ${d1.inN} out ${d1.outN} errors ${JSON.stringify(errors.slice(0, 6))}`);
    // Battery R2: re-upload every overlay texture source; R3: mark every
    // marker geometry buffer dirty; then shoot again.
    await page.evaluate(() => {
      const F = window.__knotFabricRenderer();
      const srcs = new Set();
      const addT = (t) => { if (t?.source) srcs.add(t.source); };
      addT(F.glowSprite?.texture);
      for (const s of F.haloSprites ?? []) addT(s.texture);
      if (F.walkerGlow) addT(F.walkerGlow.texture);
      for (const m of Object.values(F.markers)) { addT(m.mesh.texture); for (const b of m.mesh.geometry.buffers) b.update?.(); }
      for (const s of srcs) { try { s.update?.(); } catch {} try { s.emit?.("update", s); } catch {} }
      globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true };
    });
    await sleep(1200);
    const png3 = await page.screenshot({ type: "png" });
    writeFileSync(join(outDir, `hunt${n}_revived2.png`), png3);
    const d2 = await diff(page, png3.toString("base64"), refB64, box);
    console.log(`[hunt${n}] after R2/R3 vs clean: in ${d2.inN} out ${d2.outN}`);
    // R4: hide gf's composite child (root index 2) and un-hide the ribbon
    // layers gf switched off: can Pixi draw the overlay at all?
    await page.evaluate(() => {
      const root = window.__knotRenderer().root;
      root.children.forEach((c, i) => { c.visible = i !== 2; });
    });
    await sleep(1000);
    const png4 = await page.screenshot({ type: "png" });
    writeFileSync(join(outDir, `hunt${n}_r4.png`), png4);
    const centre = await page.evaluate(async (b64, x, y) => {
      const im = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = "data:image/png;base64," + b64; });
      const cv = document.createElement("canvas"); cv.width = im.width; cv.height = im.height;
      const cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(im, 0, 0);
      return [...cx.getImageData(x, y, 1, 1).data];
    }, png4.toString("base64"), box.x0 + 45, box.y0 + 45);
    console.log(`[hunt${n}] R4 (gf hidden) marker centre px ${JSON.stringify(centre)}`);
    // R5: restore the gf view, then re-emit Pixi's contextChange (and clear
    // the shader system's program cache) through the ribbon renderer's
    // Pixi renderer handle: does the overlay come back?
    await page.evaluate(() => {
      const root = window.__knotRenderer().root;
      root.children.forEach((c, i) => { c.visible = i >= 2; });
      const F = window.__knotFabricRenderer();
      const R = F.ribbons?.renderer;
      window.__k1537R = { hasR: !!R, keys: R ? Object.keys(R).slice(0, 40) : [] };
      try { R?.runners?.contextChange?.emit(R.gl); } catch (e) { window.__k1537R.emitErr = String(e); }
      if (R?.shader) { R.shader._programDataHash = {}; R.shader._shaderSyncFunctions = {}; R.shader._activeProgram = null; }
      globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true };
    });
    const rInfo = await page.evaluate(() => window.__k1537R);
    await sleep(1500);
    const png5 = await page.screenshot({ type: "png" });
    writeFileSync(join(outDir, `hunt${n}_r5.png`), png5);
    const d5 = await diff(page, png5.toString("base64"), refB64, box);
    console.log(`[hunt${n}] R5 (contextChange re-emit) vs clean: in ${d5.inN} out ${d5.outN} R ${JSON.stringify(rInfo)}`);
    await page.close().catch(() => {});
    break;
  }
} finally { await browser.close().catch(() => {}); }
