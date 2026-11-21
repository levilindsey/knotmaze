// K1537 (27G): does the start marker's glow ring come back after a WebGL
// context loss? Per load: reach one frozen state (alignFreezeParity, as
// dragcheck.mjs does), pin clocks (__knotPinClocks, the K1530-fixed pin),
// wait for the view to hold still, shoot; shoot again (the no-loss floor);
// lose the app canvas's context (WEBGL_lose_context), restore it 2 s
// later (EARLY mode: lose within 1 s of load, restore 5 s later, before
// the freeze), wait until the page draws again, shoot. Counts px over
// tol (default 6) between the shots inside the ring box (centred on the
// start/head marker, BOX_HALF device px) and outside it; the panel and
// the bottom stamp strip are excluded from the outside count, as in
// dragcheck.mjs.
//
//   node .claude/probes/K1537/repro.mjs <base> <outDir> <profileDir> <gf|today> [loads=5]
//     env SIMT=20 DSF=2 TOL=6 BOX_HALF=45 MODE=late|early WAITMS=180000
import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { alignFreezeParity } from "../freeze_parity.mjs";
import { waitViewStill } from "../view_still.mjs";

const [, , base, outDir, profileDir, mode = "gf", loadsArg = "5"] = process.argv;
if (!base || !outDir || !profileDir) { console.error("usage: repro.mjs <base> <outDir> <profileDir> <gf|today> [loads]"); process.exit(2); }
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2), TOL = +(process.env.TOL ?? 6);
const BOX_HALF = +(process.env.BOX_HALF ?? 45), LOADS = +loadsArg, MODE = process.env.MODE ?? "late";
const WAIT_MS = +(process.env.WAITMS ?? 180000);
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
  await page.waitForFunction((c) => (globalThis.__knotGf?.stats?.composites ?? -1) > c + 2, { timeout: WAIT_MS, polling: 100 }, c0);
  return page.evaluate(() => globalThis.__knotGf?.stats?.composites ?? -1);
}

// Freeze + pin + settle, as dragcheck.mjs/fade.mjs do (with __knotPinClocks).
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
    const cx = (F.headX * view.s + view.x) * dsf, cy = (F.headY * view.s + view.y) * dsf;
    window.__k1537ids = { r: window.__knotRenderer(), f: F, gf: globalThis.__knotGf ?? null };
    return {
      cx, cy, view: { x: view.x, y: view.y, s: view.s },
      glowVisible: F.glowSprite?.visible ?? null, glowPos: F.glowSprite ? [F.glowSprite.position.x, F.glowSprite.position.y] : null,
      walkerGlow: !!F.walkerGlow, paintClock: window.__knotRenderer()?.paintClock ?? null,
      ctx: window.__knotContext?.() ?? null, gfFallback: globalThis.__knotGf?.stats?.fallback ?? null,
      gfComp: globalThis.__knotGf?.stats?.composites ?? null,
    };
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
    let inN = 0, outN = 0, maxIn = 0, maxOut = 0;
    let bb = null;
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
    return { inN, outN, maxIn, maxOut, outBox: bb, w: A.width, h: A.height };
  }, aB64, bB64, box, TOL);
}

async function cropSheet(page, aB64, bB64, box, path) {
  const dataUrl = await page.evaluate(async (a, b, bx) => {
    const load = (s) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = "data:image/png;base64," + s; });
    const A = await load(a), B = await load(b);
    const S = 4, half = 90, cw = half * 2;
    const cv = document.createElement("canvas"); cv.width = cw * S * 2 + 8; cv.height = cw * S;
    const cx = cv.getContext("2d"); cx.imageSmoothingEnabled = false; cx.fillStyle = "#888"; cx.fillRect(0, 0, cv.width, cv.height);
    cx.drawImage(A, bx.cx - half, bx.cy - half, cw, cw, 0, 0, cw * S, cw * S);
    cx.drawImage(B, bx.cx - half, bx.cy - half, cw, cw, cw * S + 8, 0, cw * S, cw * S);
    cx.strokeStyle = "#f0f"; cx.lineWidth = 2;
    cx.strokeRect((bx.x0 - (bx.cx - half)) * S, (bx.y0 - (bx.cy - half)) * S, (bx.x1 - bx.x0) * S, (bx.y1 - bx.y0) * S);
    cx.strokeRect(cw * S + 8 + (bx.x0 - (bx.cx - half)) * S, (bx.y0 - (bx.cy - half)) * S, (bx.x1 - bx.x0) * S, (bx.y1 - bx.y0) * S);
    return cv.toDataURL("image/png");
  }, aB64, bB64, box);
  writeFileSync(path, Buffer.from(dataUrl.split(",")[1], "base64"));
}

const results = [];
try {
  for (let n = 1; n <= LOADS; n++) {
    const errors = [];
    const page = await browser.newPage();
    page.on("pageerror", (e) => errors.push(String(e.message ?? e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
    await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; window.__ctxLostN = 0; document.addEventListener("webglcontextlost", () => { window.__ctxLostN++; }, true); });
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
    const tag = `${mode}${MODE === "early" ? "E" : ""}${n}`;
    try {
      const t0 = Date.now();
      if (MODE === "early") {
        await page.goto(linkOf(mode), { waitUntil: "domcontentloaded", timeout: 900000 });
        // Lose within 1 s of the load: as soon as the app canvas has a WebGL2 context.
        await page.waitForFunction(() => [...document.querySelectorAll("canvas")].some((c) => { try { return !!c.getContext("webgl2"); } catch { return false; } }), { timeout: 60000, polling: 50 });
        const lostAt = Date.now() - t0;
        await page.evaluate(() => {
          const cvs = [...document.querySelectorAll("canvas")];
          const cv = cvs.find((c) => { try { return !!c.getContext("webgl2"); } catch { return false; } });
          const gl = cv.getContext("webgl2");
          window.__k1537ext = gl.getExtension("WEBGL_lose_context");
          window.__k1537ext.loseContext();
        });
        await sleep(5000);
        await page.evaluate(() => window.__k1537ext.restoreContext());
        console.log(`[${tag}] early loss at ${lostAt} ms, restored after 5 s`);
      } else {
        await page.goto(linkOf(mode), { waitUntil: "load", timeout: 900000 });
      }
      await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
      if (mode === "gf") await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
      const { hash, view } = await freezePin(page);
      const info = await markerInfo(page);
      const box = { cx: Math.round(info.cx), cy: Math.round(info.cy), x0: Math.round(info.cx) - BOX_HALF, x1: Math.round(info.cx) + BOX_HALF, y0: Math.round(info.cy) - BOX_HALF, y1: Math.round(info.cy) + BOX_HALF };
      const shot = async (name) => { const png = await page.screenshot({ type: "png" }); writeFileSync(join(outDir, `${tag}_${name}.png`), png); return png.toString("base64"); };
      if (mode === "gf") await forceGfRedraw(page);
      const before = await shot("before");
      if (mode === "gf") await forceGfRedraw(page); else await sleep(700);
      const floor2 = await shot("floor2");
      const floor = await diffInPage(page, before, floor2, box);
      let after = null, loss = null, post = null;
      if (MODE !== "early") {
        const loseRes = await page.evaluate(() => {
          const cvs = [...document.querySelectorAll("canvas")];
          const cv = cvs.find((c) => { try { return !!c.getContext("webgl2"); } catch { return false; } });
          if (!cv) return "no-webgl-canvas:" + cvs.length;
          const gl = cv.getContext("webgl2");
          window.__k1537ext = gl.getExtension("WEBGL_lose_context");
          if (!window.__k1537ext) return "no-lose-ext";
          window.__k1537ext.loseContext();
          return "lost on " + cv.width + "x" + cv.height;
        });
        await sleep(2000);
        const midCtx = await page.evaluate(() => window.__knotContext?.() ?? null);
        await page.evaluate(() => window.__k1537ext.restoreContext());
        // Wait until the page draws again: the restore is counted, then gf composites advance (or rAFs pass).
        await page.waitForFunction(() => (window.__knotContext?.()?.restores ?? 0) >= 1, { timeout: 120000, polling: 200 }).catch(() => {});
        if (mode === "gf") await forceGfRedraw(page).catch((e) => console.log(`[${tag}] post-restore gf redraw wait: ${e.message}`));
        else await sleep(2000);
        await waitViewStill(page).catch(() => null);
        await sleep(600);
        after = await shot("after");
        loss = await diffInPage(page, before, after, box);
        post = await page.evaluate(() => {
          const ids = window.__k1537ids ?? {};
          const F = window.__knotFabricRenderer();
          return {
            sameRenderer: ids.r === window.__knotRenderer(), sameFabric: ids.f === F, sameGf: (ids.gf ?? null) === (globalThis.__knotGf ?? null),
            glowVisible: F.glowSprite?.visible ?? null, walkerGlow: !!F.walkerGlow,
            paintClock: window.__knotRenderer()?.paintClock ?? null,
            ctx: window.__knotContext?.() ?? null, ctxLostN: window.__ctxLostN ?? null,
            gfFallback: globalThis.__knotGf?.stats?.fallback ?? null, gfComp: globalThis.__knotGf?.stats?.composites ?? null,
            search: location.search,
          };
        });
        if (loss.inN > Math.max(floor.inN, 0) || loss.outN > Math.max(floor.outN, 0)) await cropSheet(page, before, after, box, join(outDir, `${tag}_crop.png`));
        console.log(`[${tag}] ${loseRes} midCtx ${JSON.stringify(midCtx)}`);
      } else {
        // Early mode: this load's settled shot is its "after"; compare with the before of a clean load later if present.
        after = before; loss = { note: "early: compare across loads in the summary" };
      }
      const row = { tag, hash, view, info, box, floor, loss, post, errors, ms: Date.now() - t0 };
      results.push(row);
      console.log(`[${tag}] hash ${hash} box x${box.x0}-${box.x1} y${box.y0}-${box.y1} floor in ${floor.inN} out ${floor.outN} | loss in ${loss?.inN ?? "-"} out ${loss?.outN ?? "-"} maxIn ${loss?.maxIn ?? "-"} post ${JSON.stringify(post)} errors ${JSON.stringify(errors)}`);
    } catch (e) {
      results.push({ tag, fatal: String(e?.message ?? e), errors });
      console.log(`[${tag}] FATAL ${e?.message ?? e} errors ${JSON.stringify(errors)}`);
    } finally { await page.close().catch(() => {}); }
  }
} finally {
  writeFileSync(join(outDir, `summary_${mode}${MODE === "early" ? "_early" : ""}.json`), JSON.stringify(results, null, 2));
  await browser.close().catch(() => {});
}
const bad = results.filter((r) => r.fatal);
console.log(`K1537 ${mode}/${MODE}: ${results.length} loads, fatal ${bad.length}`);
