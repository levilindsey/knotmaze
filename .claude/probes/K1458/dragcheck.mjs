// K1458 Done 2: after each real-mouse stop of the panel's "Crossing fade" slider (K1444/drag.mjs's drag), does the page
// draw what a fresh load at that fade draws (the frame fade.mjs measured)? One load at fl=<start> on fade.mjs's link and
// frozen state (phw=0, SIMT), then drags to each value without a reload; after each stop it checks the live fade
// (renderer.fadeLength), that location.search keeps rp=gf (and gfh=1), and diffs the frame against fade.mjs's
// shot_<mode>_<v>.png outside the panel. A stop passes when <= MAXPX pixels differ by more than TOL levels.
//
//   node .claude/probes/K1458/dragcheck.mjs <base> <fadeOutDir> <profileDir> <gf|gfh> [stops=0,0.5,1.2,0.14] [start=0.14]
//     env SIMT=20 DSF=2 TOL=24 MAXPX=200
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [, , base, fadeDir, profileDir, mode = "gf", stopArg = "0,0.5,1.2,0.14", start = "0.14"] = process.argv;
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2), TOL = +(process.env.TOL ?? 24), MAXPX = +(process.env.MAXPX ?? 200);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
let failed = false;
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
  const link = `${base}/?3&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none&fl=${start}&rp=gf${mode === "gfh" ? "&gfh=1" : ""}`;
  await page.goto(link, { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  await page.waitForFunction(() => (globalThis.__knotGf?.stats?.composites ?? 0) > 0, { timeout: 900000, polling: 300 });
  await page.evaluate(async (t) => {
    await window.__knotPhysFreeze(true);
    await window.__knotStepUntil(t);
    const r = window.__knotRenderer();
    r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0;
    window.__knotLoop?.({ continuous: true });
  }, SIMT);
  await sleep(2500);
  const rect = async () => page.evaluate(() => {
    const lab = [...document.querySelectorAll(".tp-lblv_l")].find((e) => e.textContent.startsWith("Crossing fade"));
    if (!lab) return null;
    const row = lab.closest(".tp-lblv");
    for (let f = row; f; f = f.parentElement) if (f.classList?.contains("tp-fldv") && !f.classList.contains("tp-fldv-expanded")) f.querySelector(".tp-fldv_b")?.click();
    row.scrollIntoView({ block: "center" });
    const t = row.querySelector(".tp-sldv_t"), k = row.querySelector(".tp-sldv_k"), i = row.querySelector("input");
    const r = t?.getBoundingClientRect(), kr = k?.getBoundingClientRect();
    return r ? { x: r.x, y: r.y, w: r.width, h: r.height, kx: kr ? kr.x + kr.width / 2 : null, box: i?.value } : "notrack";
  });
  let r = await rect();
  if (!r || r === "notrack") throw new Error("no Crossing fade slider (panel closed?)");
  await sleep(800);
  for (const v of stopArg.split(",")) {
    r = await rect();
    // the range's ends are dragged past the track (the slider clamps): a stop on the end pixel read 0.02 / 1.18
    const y = r.y + r.h / 2, x0 = r.kx ?? r.x + r.w * (Number(r.box) / 1.2);
    const x1 = Number(v) <= 0 ? r.x - 20 : Number(v) >= 1.2 ? r.x + r.w + 20 : r.x + 1 + (r.w - 2) * (Number(v) / 1.2);
    await page.mouse.move(x0, y); await page.mouse.down();
    for (let s = 1; s <= 12; s++) { await page.mouse.move(x0 + (x1 - x0) * s / 12, y); await sleep(40); }
    await page.mouse.up(); await page.mouse.move(5, 5);
    await sleep(1500);
    const c0 = await page.evaluate(() => { globalThis.__knotGfOpts = { ...(globalThis.__knotGfOpts ?? {}), redraw: true }; return globalThis.__knotGf.stats.composites; });
    await page.waitForFunction((c) => globalThis.__knotGf.stats.composites > c + 2, { timeout: 60000, polling: 100 }, c0);
    await sleep(600);
    const live = await page.evaluate(() => {
      const p = document.querySelector(".tp-rotv, .tp-dfwv")?.getBoundingClientRect();
      return { fl: window.__knotRenderer()?.fadeLength, search: location.search, panel: p ? { x: p.x, y: p.y, w: p.width, h: p.height } : null };
    });
    const png = await page.screenshot({ type: "png" });
    writeFileSync(join(fadeDir, `drag_${mode}_${v}.png`), png);
    let refB64;
    try { refB64 = readFileSync(join(fadeDir, `shot_${mode}_${v}.png`)).toString("base64"); } catch { console.log(`no shot_${mode}_${v}.png in ${fadeDir}`); failed = true; continue; }
    const cmp = await page.evaluate(async (a, b, panel, dsf, tol) => {
      const load = (b64) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = "data:image/png;base64," + b64; });
      const img = async (b64) => { const im = await load(b64); const cv = document.createElement("canvas"); cv.width = im.width; cv.height = im.height; const cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(im, 0, 0); return cx.getImageData(0, 0, im.width, im.height); };
      const A = await img(a), B = await img(b);
      let n = 0, tot = 0;
      for (let y = 0; y < A.height; y++) for (let x = 0; x < A.width; x++) {
        if (panel && x >= (panel.x - 4) * dsf && y <= (panel.y + panel.h + 4) * dsf) continue; // the panel (its rows differ)
        if (y > A.height - 40 * dsf) continue; // the stamp / HUD strip
        tot++;
        const o = (y * A.width + x) * 4;
        if (Math.max(Math.abs(A.data[o] - B.data[o]), Math.abs(A.data[o + 1] - B.data[o + 1]), Math.abs(A.data[o + 2] - B.data[o + 2])) > tol) n++;
      }
      return { n, tot };
    }, png.toString("base64"), refB64, live.panel, DSF, TOL);
    const flOk = Math.abs((live.fl ?? -1) - Number(v)) < 0.011;
    const qOk = live.search.includes("rp=gf") && (mode !== "gfh" || live.search.includes("gfh=1"));
    const ok = flOk && qOk && cmp.n <= MAXPX;
    if (!ok) failed = true;
    console.log(`[${mode}] stop ${v}: fadeLength ${live.fl} search ${live.search} | ${cmp.n} of ${cmp.tot} px differ > ${TOL} from the fresh load -> ${ok ? "PASS" : "FAIL"}`);
  }
} finally { await browser.close(); }
console.log(failed ? "DRAG CHECK: FAIL" : "DRAG CHECK: PASS");
process.exit(failed ? 1 : 0);
