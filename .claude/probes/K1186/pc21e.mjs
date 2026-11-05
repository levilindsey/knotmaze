// K1186 21E positive control: prove the vote override reaches fan
// geometry. At one frozen fat11 state, force arms' votes the other
// way (one at a time) until a fan-layer count moves; then compare
// that arm's full-frame pixels both ways, plus a bogus-key control
// (counts and pixels must both stand pat). Probe only.
//   node pc21e.mjs [outDir]
import puppeteer from "puppeteer-core";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { decodePNG } from "./png.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, process.argv[2] || "out21e");
mkdirSync(OUT, { recursive: true });
const BASE = process.env.K1186_BASE || "http://127.0.0.1:5851";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function diffCount(pa, pb) {
  const a = decodePNG(pa), b = decodePNG(pb);
  let n = 0, maxD = 0;
  for (let i = 0; i < a.data.length; i += a.ch) {
    const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
    if (d > 8) n++;
    if (d > maxD) maxD = d;
  }
  return { n, maxD };
}
const udd = mkdtempSync(join(tmpdir(), "k1186pc-"));
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false, userDataDir: udd,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--window-size=1760,1060"],
});
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log(`[pageerror] ${e.message}`));
  await page.setViewport({ width: 1700, height: 950, deviceScaleFactor: 1.5 });
  const cdp = await page.createCDPSession();
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await page.evaluateOnNewDocument(() => {
    window.__knotLoopMode = "continuous";
    window.__ctxLost = 0;
    document.addEventListener("webglcontextlost", () => { window.__ctxLost++; }, true);
    try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {}
  });
  await page.goto(`${BASE}/?11&am=instant&snd=none&fw=0&phw=0&tw=0.72&cr=4.5`, { waitUntil: "load", timeout: 90000 });
  await page.bringToFront();
  await page.mouse.move(2, 2);
  await page.waitForFunction(() => window.__knotRenderer && window.__knotRenderer(), { timeout: 60000 });
  for (const t0 = Date.now(); Date.now() - t0 < 60000; await sleep(400)) {
    if (await page.evaluate(() => { const p = window.__knotPerf(); return !!(p && p.asleep); })) break;
  }
  await page.evaluate(() => {
    window.__knotPinClocks(100);
    for (const el of document.body.children) if (el.tagName !== "CANVAS") el.style.visibility = "hidden";
    window.__knotPS().step = function () {};
  });
  await sleep(300);
  const out = await page.evaluate(() => {
    const r = window.__knotRenderer(), fp = r.fieldProbe;
    const counts = () => ({ bottom: [r.filletMesh.vUsed, r.filletMesh.iUsed], top: [r.filletTopMesh.vUsed, r.filletTopMesh.iUsed] });
    const cap = r.captureScene();
    r.voteOverride = null; r.restoreScene(cap); r.rebuildFillets(true);
    const base = counts();
    const tried = [];
    let hit = null;
    outer: for (let ji = 0; ji < r.junctionArms.length; ji++) {
      const arms = fp.arms(ji);
      if (!arms || arms.length < 2) continue;
      for (let k = 0; k < arms.length; k++) {
        const a = arms[k];
        const key = `${a.chain}:${a.slot}:${a.dir}`;
        const before = [a.top ? 1 : 0, a.dives ? 1 : 0];
        r.voteOverride = { key, top: !a.top, dives: a.dives };
        r.rebuildFillets(true);
        const c1 = counts();
        const moved = JSON.stringify(c1) !== JSON.stringify(base);
        tried.push({ ji, k, key, before, moved, c1 });
        if (moved) { hit = { ji, k, key, before, forced: [!a.top ? 1 : 0, before[1]], base, c1 }; break outer; }
        r.voteOverride = null; r.rebuildFillets(true);
      }
    }
    return { base, hit, tried: tried.slice(0, 12), cap };
  });
  console.log(JSON.stringify({ base: out.base, hit: out.hit, tried: out.tried }, null, 1));
  if (!out.hit) throw new Error("no arm moved fan counts - override does not reach emission");
  // Pixels both ways for the hit arm, full frame; then bogus key.
  await page.evaluate((s) => { const r = window.__knotRenderer(); r.voteOverride = null; r.restoreScene(s); r.rebuildFillets(true); }, out.cap);
  await sleep(250);
  const shotA = await page.screenshot();
  await page.evaluate((s, key, top, dives) => { const r = window.__knotRenderer(); r.restoreScene(s); r.voteOverride = { key, top: !!top, dives: !!dives }; r.rebuildFillets(true); }, out.cap, out.hit.key, out.hit.forced[0], out.hit.forced[1]);
  await sleep(250);
  const shotB = await page.screenshot();
  await page.evaluate((s) => { const r = window.__knotRenderer(); r.restoreScene(s); r.voteOverride = { key: "999:999:1", top: true, dives: false }; r.rebuildFillets(true); }, out.cap);
  await sleep(250);
  const shotC = await page.screenshot();
  await page.evaluate(() => { const r = window.__knotRenderer(); r.voteOverride = null; r.rebuildFillets(true); });
  writeFileSync(join(OUT, "pc_resolved.png"), shotA);
  writeFileSync(join(OUT, "pc_forced.png"), shotB);
  console.log(`pc pixels: forced-vs-resolved ${JSON.stringify(diffCount(shotA, shotB))}; bogus-key-vs-resolved ${JSON.stringify(diffCount(shotA, shotC))}; ctxLost=${await page.evaluate(() => window.__ctxLost)}`);
  await page.close();
} finally {
  await browser.close();
  try { rmSync(udd, { recursive: true, force: true }); } catch {}
}
