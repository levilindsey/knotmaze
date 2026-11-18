// K1460 s3: the kink loop's centreline, for loop.py's step metric (Done 2, item 1). Loads today's renderer once at
// the frozen state and writes <out.json>: for the self crossing whose under pass is nearest the css point, the
// chain's centreline from the under pass round the loop to the over pass and past each by 1.2 world, every 0.01
// world, in device px, with each station's arc distance from the under pass and its lateral normal.
//
//   node .claude/probes/K1460/loopgeo.mjs <base> <out.json> <profileDir> <x,y css> [query]   env SIMT=20 DSF=2 HASH=
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , base, outJson, profileDir, at, qArg = "3&xp=off&am=instant&prp=off&phw=0&fw=0&bg=none&snd=none"] = process.argv;
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2), want = process.env.HASH ?? "";
const [px, py] = at.split(",").map(Number);
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1720,1000",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
try {
  for (let t = 0; t < 6; t++) {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
    await page.evaluateOnNewDocument(() => { const iv = setInterval(() => { if (typeof window.__knotPhysFreeze === "function" && window.__knotPS?.()) { clearInterval(iv); window.__knotPhysFreeze(true); } }, 0); }); // shot.mjs EARLY=1
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
    await page.goto(`${base}/?${qArg}&fl=0`, { waitUntil: "load", timeout: 900000 });
    await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
    const hash = await page.evaluate(async (t) => {
      await window.__knotPhysFreeze(true);
      await window.__knotStepUntil(t);
      const d = await window.__knotPhysDump();
      const h = d?.hashes ?? d; return String(h?.all ?? JSON.stringify(h).slice(0, 80));
    }, SIMT);
    if (want && hash !== want) { console.log(`hash ${hash} != ${want}, retry`); await page.close(); continue; }
    const geo = await page.evaluate((dsf, px, py) => {
      const r = window.__knotRenderer(), ps = window.__knotPS(), view = window.__knotView();
      const arcOf = (S, f) => {
        const cal = S.controlArcLengths, n = cal.length;
        if (S.closed) { const ff = ((f % n) + n) % n, i = Math.floor(ff), u = ff - i, j = (i + 1) % n; const a0 = cal[i], a1 = j === 0 ? S.totalLength : cal[j]; return a0 + (a1 - a0) * u; }
        const ff = Math.max(0, Math.min(n - 1, f)), i = Math.min(Math.floor(ff), n - 2), u = Math.max(0, Math.min(1, ff - i));
        return cal[i] + (cal[i + 1] - cal[i]) * u;
      };
      const at = (S, arc) => {
        const n = S.count, pos = S.positions;
        const a = S.closed ? ((arc % S.totalLength) + S.totalLength) % S.totalLength : Math.max(0, Math.min(S.totalLength, arc));
        const fi = S.closed ? (a / S.totalLength) * n : (a / S.totalLength) * (n - 1);
        const i = Math.floor(fi) % n, j = S.closed ? (i + 1) % n : Math.min(i + 1, n - 1), u = fi - Math.floor(fi);
        return { x: pos[i * 2] + (pos[j * 2] - pos[i * 2]) * u, y: pos[i * 2 + 1] + (pos[j * 2 + 1] - pos[i * 2 + 1]) * u };
      };
      const scr = (p) => ({ x: (p.x * view.s + view.x) * dsf, y: (p.y * view.s + view.y) * dsf });
      let best = null;
      ps.crossings.forEach((c, ci) => {
        if (c.over.chain !== c.under.chain) return;
        const S = r.chainSamples[c.under.chain];
        const u = arcOf(S, r.renderCtrl(c.under)), o = arcOf(S, r.renderCtrl(c.over));
        const s = scr(at(S, u));
        const d = Math.hypot(s.x / dsf - px, s.y / dsf - py);
        if (!best || d < best.d) best = { d, ci, ch: c.under.chain, u, o, S };
      });
      if (!best) return null;
      const { S, u, o } = best;
      // the loop: the shorter way from the under pass to the over pass
      let fwd = o - u;
      if (S.closed) fwd = ((fwd % S.totalLength) + S.totalLength) % S.totalLength;
      let dir = 1, len = Math.abs(fwd);
      if (S.closed && fwd > S.totalLength / 2) { dir = -1; len = S.totalLength - fwd; } else if (!S.closed && fwd < 0) dir = -1;
      const prof = [];
      for (let da = -1.2; da <= len + 1.2 + 1e-9; da += 0.01) {
        const a = u + dir * da, p = scr(at(S, a)), p0 = scr(at(S, a - 0.01)), p1 = scr(at(S, a + 0.01));
        const tx = p1.x - p0.x, ty = p1.y - p0.y, l = Math.hypot(tx, ty) || 1;
        prof.push([+da.toFixed(3), p.x, p.y, -ty / l, tx / l]);
      }
      return { ci: best.ci, chain: best.ch, uArc: u, oArc: o, loopLen: len, dist: best.d, hDev: (r.style.threadWidth / 2) * view.s * dsf, pxPerWorld: view.s * dsf, prof };
    }, DSF, px, py);
    writeFileSync(outJson, JSON.stringify(geo));
    console.log(`hash ${hash} crossing ${geo?.ci} loop ${geo?.loopLen?.toFixed(3)} dist ${geo?.dist?.toFixed(1)} css, ${geo?.prof?.length} stations`);
    await page.close();
    break;
  }
} finally { await browser.close(); }
