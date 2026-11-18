// K1458: today's gap windows (the slots' winNeg / winPos) against gf's baked ones (GfGapTable.wins), same page,
// same state. Needs the Vite DEV server (imports /src in the page).
//   node win.mjs <devBase> <profileDir> [fl=1.2] [link extra]   env SIMT=20
import puppeteer from "puppeteer-core";
const [, , base, profileDir, fl = "1.2", extra = ""] = process.argv;
const SIMT = Number(process.env.SIMT ?? 20);
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${base}/?3&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none&fl=${fl}${extra}`, { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  const res = await page.evaluate(async (t) => {
    await window.__knotPhysFreeze(true);
    await window.__knotStepUntil(t);
    await new Promise((r) => setTimeout(r, 1500));
    const M = await import("/src/render/gpu_field/gf_look.ts");
    const r = window.__knotRenderer();
    const T = new M.GfGapTable(); T.wins = [];
    T.values({
      kd: r.kd, kcv: r.kcv, chainSamples: r.chainSamples,
      crossings: r.ps.crossings.map((c) => ({ overChain: c.over.chain, overCtrl: r.renderCtrl(c.over), underChain: c.under.chain, underCtrl: r.renderCtrl(c.under) })),
      fillHalf: r.style.threadWidth / 2, margin: M.lookGap(r), fade: M.lookFade(r), joints: r.junctionArcCtrls, jointClear: M.gfJointClear(r.style.threadWidth / 2, r.FILLET_REACH_PER_HALF, r.cuspRadius, M.lookGap(r)),
    });
    const rows = [];
    for (let i = 0; i < T.wins.length; i += 5) {
      const ci = T.wins[i];
      const d = r.gaps.describeSlot(ci);
      rows.push({ ci, gf: [T.wins[i + 1], T.wins[i + 2]], cap: [T.wins[i + 3], T.wins[i + 4]], today: [d.winNeg, d.winPos], arcScale: d.arcScale, margin: d.margin, fade: d.fade, scales: d.scales, self: r.ps.crossings[ci].over.chain === r.ps.crossings[ci].under.chain });
    }
    return { fade: r.fadeLength, gap: M.lookGap(r), lf: M.lookFade(r), rows };
  }, SIMT);
  console.log(`fadeLength ${res.fade} lookGap ${res.gap} lookFade ${res.lf} crossings ${res.rows.length}`);
  const diffs = [];
  for (const w of res.rows) for (const k of [0, 1]) diffs.push({ ci: w.ci, side: k ? "pos" : "neg", gf: w.gf[k], today: w.today[k], cap: w.cap[k], d: w.gf[k] - w.today[k], self: w.self, scales: w.scales, as: w.arcScale });
  const ad = diffs.map((x) => Math.abs(x.d)).sort((a, b) => a - b);
  const q = (p) => ad[Math.floor(p * (ad.length - 1))].toFixed(3);
  console.log(`|gf - today| window: median ${q(0.5)} p75 ${q(0.75)} p90 ${q(0.9)} max ${q(1)}; gf longer by >0.05: ${diffs.filter((x) => x.d > 0.05).length}, shorter: ${diffs.filter((x) => x.d < -0.05).length} of ${diffs.length}`);
  diffs.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  for (const x of diffs.slice(0, 25)) console.log(`ci ${x.ci} ${x.side} gf ${x.gf.toFixed(3)} today ${x.today.toFixed(3)} cap ${x.cap.toFixed(3)} self ${x.self} scales ${x.scales.map((v) => v.toFixed(2))} arcScale ${x.as}`);
} finally { await browser.close(); }
