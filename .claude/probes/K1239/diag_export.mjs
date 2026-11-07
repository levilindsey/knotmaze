// K1239: dump __knotSceneExport + renderer/ps state for one family.
// Usage: node diag_export.mjs <base> <out.json> [family=def]
import puppeteer from "puppeteer-core";
import { writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const [, , base, out, fam = "def"] = process.argv;
const SEEDS = { muse: "3", def: "b", fat: "p9ar6", ring: "1rphqy1", user: "1471kin" };
const profileDir = join(tmpdir(), `k1239-diag-${process.pid}`);
const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: false,
  userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000", "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1.5 });
  const url = `${base}/?${SEEDS[fam]}&tlk=border&am=instant&snd=none&phy=0&fw=0&phw=0`;
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.__knotPerf?.().state && window.__knotPerf().state !== "loading", { timeout: 60000 });
  await page.waitForFunction(() => typeof window.__knotRenderer === "function" && typeof window.__knotSceneExport === "function" && window.__knotRenderer(), { timeout: 60000 });
  await sleep(1500);
  const desc = await page.evaluate(() => { const d = Object.getOwnPropertyDescriptor(window, "__knotSceneExport"); return { t: typeof window.__knotSceneExport, has: !!d, desc: d ? { writable: d.writable, enumerable: d.enumerable, configurable: d.configurable, hasGet: !!d.get, valType: typeof d.value } : null }; });
  console.log(JSON.stringify({ desc }));
  const data = await page.evaluate(async () => {
    const hooks = { renderer: typeof window.__knotRenderer, ps: typeof window.__knotPS, exp: typeof window.__knotSceneExport, perf: typeof window.__knotPerf, knotKeys: Object.keys(window).filter((k) => k.includes("knot")) };
    let r, ps, exp;
    try { r = window.__knotRenderer(); } catch (e) { return { hooks, err: `renderer: ${e.message}` }; }
    try { ps = window.__knotPS(); } catch (e) { return { hooks, err: `ps: ${e.message}` }; }
    try { exp = await window.__knotSceneExport({ name: "diag" }); } catch (e) { return { hooks, err: `export: ${e.message}` }; }
    const samples = r.chainSamples.map((s, i) => s ? { i, count: s.count, closed: s.closed, total: s.totalLength, cal: Array.from(s.controlArcLengths) } : { i, missing: true });
    return {
      url: location.href,
      scene: exp.scene, diag: exp.diag,
      samples,
      junctionArms: r.junctionArms,
      freeTips: r.freeTips,
      fusedTips: (r.joinery?.fusedTips ?? r.fusedTips ?? null),
      chains: ps.chains.map((c, i) => ({ i, len: c.length, brk: ps.chainBreakAfter[i], particles: Array.from(c) })),
      fusedJunctions: ps.fusedJunctions,
      anchored: ps.chains.map((c, i) => [ps.isAnchored(c[0]), ps.isAnchored(c[c.length - 1])]),
      slots: (() => { const out = []; for (let i = 0; i < r.slotLive.length; i++) { if (!r.slotLive[i]) continue; out.push({ i, over: r.slotOverChain[i], overCtrl: r.slotOverCtrl[i], under: r.slotUnderChain[i], cutNeg: r.slotCutNeg[i], cutPos: r.slotCutPos[i], coverNeg: r.slotCoverNeg[i], coverPos: r.slotCoverPos[i], allNeg: r.slotAllNeg[i], allPos: r.slotAllPos[i], uc: [r.slotUnderCenter[i * 2], r.slotUnderCenter[i * 2 + 1]] }); } return out; })(),
      juncCuts: (r.junctionCutEntries ?? []).map((e) => ({ ...e })),
      psCrossings: ps.crossings.map((x) => ({ over: { chain: x.over.chain, ctrl: x.over.ctrl }, under: { chain: x.under.chain, ctrl: x.under.ctrl } })),
      nCross: ps.crossings.length, nEmerg: ps.emergentCrossings.length,
      h: r.style.threadWidth / 2, bdw: r.borderWidth,
    };
  });
  writeFileSync(out, JSON.stringify(data));
  console.log(JSON.stringify({ chains: data.scene.chains.length, junctions: data.scene.junctions.length, crossings: data.scene.crossings.length, deadEnds: data.scene.deadEnds, diag: { free: data.diag.freeTips, anchored: data.diag.anchoredTips, anchoredOnScreen: data.diag.anchoredOnScreen, arms: data.diag.arms } }));
} finally {
  await browser.close();
  try { rmSync(profileDir, { recursive: true, force: true }); } catch {}
}
