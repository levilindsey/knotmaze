// K1458: where two crossings' gap windows overlap on one under chain, gf's bake names ONE over pass per under
// sample (the window with the larger winM), and lkGap's far reach then measures only that pass. Per crossing side,
// the share of its window (from h to the end) that another crossing claims, and how far from the crossing the
// claim starts. Same state as fade.mjs. Needs the Vite DEV server (imports /src in the page).
//   node claims.mjs <devBase> <profileDir> [fl=0.5] [fadeJson]   env SIMT=20
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";
const [, , base, profileDir, fl = "0.5", fadeJson = ""] = process.argv;
const SIMT = Number(process.env.SIMT ?? 20);
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
let res;
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("pageerror", e.message));
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
  await page.goto(`${base}/?3&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none&fl=${fl}`, { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  res = await page.evaluate(async (t) => {
    await window.__knotPhysFreeze(true);
    await window.__knotStepUntil(t);
    await new Promise((r) => setTimeout(r, 1000));
    const M = await import("/src/render/gpu_field/gf_look.ts");
    const PM = await import("/src/render/paint_math.ts");
    const r = window.__knotRenderer();
    const xs = r.ps.crossings.map((c) => ({ oCh: c.over.chain, uCh: c.under.chain, oCtrl: r.renderCtrl(c.over), uCtrl: r.renderCtrl(c.under) }));
    const T = new M.GfGapTable(); T.wins = [];
    T.values({
      kd: r.kd, kcv: r.kcv, chainSamples: r.chainSamples,
      crossings: xs.map((x) => ({ overChain: x.oCh, overCtrl: x.oCtrl, underChain: x.uCh, underCtrl: x.uCtrl })),
      fillHalf: r.style.threadWidth / 2, margin: M.lookGap(r), fade: M.lookFade(r), joints: r.junctionArcCtrls, jointClear: M.gfJointClear(r.style.threadWidth / 2, r.FILLET_REACH_PER_HALF, r.cuspRadius, M.lookGap(r)),
    });
    const W = new Map();
    for (let i = 0; i < T.wins.length; i += 5) W.set(T.wins[i], [T.wins[i + 1], T.wins[i + 2]]);
    const G = r.kd.geom;
    const rows = [];
    const h = r.style.threadWidth / 2;
    for (const [ci, w] of W) {
      const x = xs[ci]; const kc = r.kcv[x.uCh];
      const tot = G[kc.geom * 4], per = G[kc.geom * 4 + 1];
      const uC = PM.kArcOfCtrl(r.kd, kc, x.uCtrl), oC = PM.kArcOfCtrl(r.kd, r.kcv[x.oCh], x.oCtrl);
      for (const side of [0, 1]) {
        const wl = w[side]; let n = 0, lost = 0, first = null, by = null;
        for (let a = h; a < wl; a += per) {
          n++;
          const v = wl - a; const s = uC + (side ? a : -a);
          for (const [cj, w2] of W) {
            if (cj === ci) continue;
            const y = xs[cj]; if (y.uCh !== x.uCh) continue;
            let off = s - PM.kArcOfCtrl(r.kd, kc, y.uCtrl);
            if (kc.closed) { off = ((off % tot) + tot) % tot; if (off > tot / 2) off -= tot; }
            const v2 = (off >= 0 ? w2[1] : w2[0]) - Math.abs(off);
            if (v2 > v) {
              const oC2 = PM.kArcOfCtrl(r.kd, r.kcv[y.oCh], y.oCtrl);
              if (y.oCh !== x.oCh || Math.abs(oC2 - oC) > 0.6) { lost++; if (first === null) { first = a; by = cj; } break; }
            }
          }
        }
        rows.push({ ci, side: side ? "pos" : "neg", win: wl, n, lost, first, by });
      }
    }
    return { rows, fade: r.fadeLength };
  }, SIMT);
} finally { await browser.close(); }
const R = res.rows;
const claimed = R.filter((x) => x.lost > 0);
console.log(`fl ${res.fade}: ${R.length} sides, ${claimed.length} with part of the window (h..end) named to another crossing's over pass`);
if (fadeJson) {
  const j = JSON.parse(readFileSync(fadeJson, "utf8"));
  const px = 0.0225;
  const key = (ci, side) => `${ci}:${side}`;
  const cm = new Map(R.map((x) => [key(x.ci, x.side), x]));
  let fail = 0, failClaimed = 0, pass = 0, passClaimed = 0, unk = 0;
  for (const s of j.sides) {
    if (!s.gf) continue;
    let bad = false;
    for (const k of ["0.9", "0.5", "0.1"]) { const t = s.today[k], g = s.gf[k]; if (t == null || g == null || Math.abs(g - t) > Math.max(0.15 * t, px)) bad = true; }
    const c = cm.get(key(s.ci, s.side === 1 || s.side === "pos" ? "pos" : "neg"));
    if (!c) { unk++; continue; }
    if (bad) { fail++; if (c.lost > 0) failClaimed++; } else { pass++; if (c.lost > 0) passClaimed++; }
  }
  console.log(`fade sides: failing ${fail} (claimed ${failClaimed}), passing ${pass} (claimed ${passClaimed}), unmatched ${unk}`);
}
for (const x of claimed.slice(0, 12)) console.log(`ci ${x.ci} ${x.side} win ${x.win.toFixed(3)} lost ${x.lost}/${x.n} from ${x.first?.toFixed(3)} by ci ${x.by}`);
