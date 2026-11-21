// K1473 (27X) Done 4: the pulses draw on an ordinary load, in real time.
//   node .claude/probes/K1473/realtime27x.mjs <tag> <origin> <today|gf>
// Same state as the pinned bar (seed 7, 10 cheapest moves) but WITHOUT the
// frame-forcing hooks: no __knotPinClocks, no paintClock writes, no setTime.
// The paint clock runs free; three on/nopulse pairs 0.5 s apart each give a
// pulse mask (on vs nopulse, diff > 8 any channel, as mask_h.mjs) and its
// centroid. Toggling pulses off/on for the mask reuses k1414c's setPaint
// cycle (pulseBorn restored to 0 so the restore does not re-birth the fade);
// it does not pin any clock. Output under out/27X/ (untracked).
// Hold the perf lock while it runs.
import puppeteer from "puppeteer-core";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodePng } from "../K1387/k1387_pngdiff.mjs";

const [, , tag, origin, mode] = process.argv;
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "out", "27X");
mkdirSync(outDir, { recursive: true });
const VW = 1200, VH = 800;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const url = `${origin}/?7&am=instant&mt=hunter&snd=none&fw=0&phw=0${mode === "gf" ? "&rp=gf" : ""}`;
const profileDir = join(tmpdir(), `k1473-rt-${process.pid}-${tag}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50",
    `--window-size=${VW + 40},${VH + 160}`, "--disable-features=CalculateNativeWinOcclusion",
    "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const C = { tag, mode, url, errs: [], walk: [], rounds: [] };
try {
  const page = await browser.newPage();
  await page.setViewport({ width: VW, height: VH, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  page.on("pageerror", (e) => C.errs.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") C.errs.push(m.text()); });
  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.bringToFront();
  const asleep = () => page.waitForFunction(() => {
    const p = window.__knotPerf?.();
    return p && p.state !== "loading" && p.asleep === true;
  }, { timeout: 240000, polling: 100 });
  await asleep();
  await page.evaluate(() => window.__knotLoop?.({ continuous: true }));
  for (let i = 0; i < 10; i++) {
    const step = await page.evaluate(() => {
      const f = window.__knotFabric();
      if (f.solved || !f.choices.length) return null;
      const c = [...f.choices].sort((a, b) => a.cost - b.cost || a.edge - b.edge)[0];
      return { edge: c.edge, ok: window.__knotTurnMove(c.edge) };
    });
    if (!step) break;
    C.walk.push(step.edge);
    await page.waitForFunction(() => !window.__knotFabric().animating, { timeout: 30000, polling: 50 });
    await sleep(150);
  }
  await asleep();
  // Real time from here: let the free paint clock run, pairs 0.5 s apart.
  await sleep(800);
  const pulseOff = () => page.evaluate(() => {
    const r = window.__knotRenderer();
    const ps = r.paintState;
    window.__k1473rt = { pulses: ps.paintPulses };
    r.setPaint(ps.paintSpans, [], ps.paintCaps, ps.paintRoutes, ps.paintTraveled);
    r.update();
    window.__knotGf?.redraw?.();
  });
  const pulseOn = () => page.evaluate(() => {
    const r = window.__knotRenderer();
    const ps = r.paintState;
    r.setPaint(ps.paintSpans, window.__k1473rt.pulses, ps.paintCaps, ps.paintRoutes, ps.paintTraveled);
    r.pulseBorn = 0;
    r.update();
    window.__knotGf?.redraw?.();
  });
  for (let i = 0; i < 3; i++) {
    if (i > 0) await sleep(500);
    const on = join(outDir, `${tag}_${mode}_rt${i}_on.png`);
    const off = join(outDir, `${tag}_${mode}_rt${i}_nopulse.png`);
    await page.screenshot({ path: on });
    await pulseOff();
    await page.screenshot({ path: off });
    await pulseOn();
    const A = decodePng(on), B = decodePng(off);
    let n = 0, sx = 0, sy = 0;
    for (let p = 0; p < A.w * A.h; p++) {
      let d = 0;
      for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(A.px[4 * p + k] - B.px[4 * p + k]));
      if (d > 8) { n++; sx += p % A.w; sy += Math.floor(p / A.w); }
    }
    C.rounds.push({ i, n, cx: n ? +(sx / n).toFixed(1) : -1, cy: n ? +(sy / n).toFixed(1) : -1 });
  }
  C.errs = C.errs.slice(0, 8);
} catch (e) {
  C.errs.push(`probe: ${e.message}`);
} finally {
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
writeFileSync(join(outDir, `${tag}_${mode}_rt.json`), JSON.stringify(C, null, 1));
console.log(`${tag} ${mode} rt: walk ${C.walk.join(",")} rounds ${C.rounds.map((r) => `${r.n}@${r.cx},${r.cy}`).join(" ")} errs ${C.errs.length}`);
if (C.errs.length) console.log(C.errs.join("\n"));
