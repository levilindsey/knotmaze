// K1482 s12: today's fan layer (root child 1, the one TriFanMesh rebuildFillets fills) at link A's frozen state: every
// triangle with an edge longer than LONG world units, grouped by the junction-field record its vertices carry
// (recData), with device-px endpoints, plus the junctions and tips the layer was built from. Attributes the long
// straight strokes today draws (step 1).
//   node .claude/probes/K1482/s12/tfan.mjs <base> <out.json> <profileDir>   env HASH (fff8c9e5) SIMT=20 TRIES=3 LONG=1.5 Q
import puppeteer from "puppeteer-core";
import { writeFileSync } from "node:fs";
const [, , base, outFile, profileDir] = process.argv;
const SIMT = +(process.env.SIMT ?? 20), TRIES = +(process.env.TRIES ?? 3), LONG = +(process.env.LONG ?? 1.5);
const HASH = process.env.HASH ?? "fff8c9e5";
const query = `3.FGH1HtvQeDjm6e4BII&xp=off&am=instant${process.env.Q ?? ""}`;
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: false, userDataDir: profileDir, protocolTimeout: 1800000,
  args: ["--use-angle=d3d11", "--no-first-run", "--no-default-browser-check", "--window-position=2200,50", "--window-size=1660,1060",
    "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding"],
});
const T0 = Date.now(); const T = () => ((Date.now() - T0) / 1000).toFixed(0) + "s";
try {
  for (let k = 0; k < TRIES; k++) {
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.log(`pageerror ${e.message.slice(0, 200)}`));
    await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; try { localStorage.setItem("knotmaze.panelOpen", "0"); } catch {} });
    await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });
    await page.goto(`${base}/?${query}&phw=0&snd=none&prp=off`, { waitUntil: "load", timeout: 900000 });
    await page.bringToFront();
    await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
    { const f0 = await page.evaluate(() => window.__knotLoop().frames); await page.waitForFunction((f) => window.__knotLoop().frames > f + 20, { timeout: 900000, polling: 300 }, f0); }
    const h = await page.evaluate(async (t) => {
      await window.__knotPhysFreeze(true); await window.__knotStepUntil(t);
      const r = window.__knotRenderer(); r.advanceClocks = () => {}; r.paintClock = 100; r.pulseBorn = 0;
      window.__knotLoop?.({ continuous: true });
      const d = await window.__knotPhysDump(); return String(d.hashes.all);
    }, SIMT);
    console.log(T(), "hash", h);
    if (h !== HASH && k < TRIES - 1) { await page.close(); continue; }
    { const f0 = await page.evaluate(() => window.__knotLoop().frames); await page.waitForFunction((f) => window.__knotLoop().frames > f + 6, { timeout: 900000, polling: 200 }, f0); }
    await page.evaluate((s) => { window.__pts = JSON.parse(s); }, process.env.PTS ?? "[]");
    const res = await page.evaluate((LONG) => {
      const r = window.__knotRenderer(); const fm = r.filletMesh; const V = fm.vertexData, I = fm.indexData, Rd = fm.recData;
      const m = r.root.worldTransform, dpr = window.devicePixelRatio;
      const dev = (x, y) => [+((m.a * x + m.c * y + m.tx) * dpr).toFixed(1), +((m.b * x + m.d * y + m.ty) * dpr).toFixed(1)];
      const long = new Map();
      for (let t = 0; t + 2 < fm.iUsed; t += 3) {
        const a = I[t], b = I[t + 1], c = I[t + 2]; if (a === b && b === c) continue;
        const P = [a, b, c].map((v) => [V[2 * v], V[2 * v + 1]]);
        const e = Math.max(Math.hypot(P[0][0] - P[1][0], P[0][1] - P[1][1]), Math.hypot(P[1][0] - P[2][0], P[1][1] - P[2][1]), Math.hypot(P[0][0] - P[2][0], P[0][1] - P[2][1]));
        if (e < LONG) continue;
        const rec = Rd[a]; const g = long.get(rec) ?? { rec, tris: 0, maxEdge: 0, pts: [] }; g.tris++; g.maxEdge = Math.max(g.maxEdge, +e.toFixed(2));
        if (g.pts.length < 6) g.pts.push(P.map((p) => dev(p[0], p[1]))); long.set(rec, g);
      }
      const FP = r.joinery.fieldProbe; const nJ = (r.junctionArms ?? []).length; const recToJ = new Map();
      for (let ji = 0; ji < nJ; ji++) { const rb = FP?.record(ji) ?? -1; if (rb >= 0) recToJ.set(rb, ji); }
      // per record: every vertex any triangle uses, its farthest distance from the junction centre (world)
      const far = new Map();
      for (let t = 0; t + 2 < fm.iUsed; t += 3) {
        const a = I[t], b = I[t + 1], c = I[t + 2]; if (a === b && b === c) continue;
        const rec = Rd[a]; const ji = recToJ.get(rec); const cen = ji === undefined ? null : FP.center(ji);
        const g = far.get(rec) ?? { rec, ji: ji ?? null, center: cen ? dev(cen[0], cen[1]) : null, tris: 0, maxR: 0, farPt: null };
        g.tris++;
        if (cen) for (const v of [a, b, c]) { const d = Math.hypot(V[2 * v] - cen[0], V[2 * v + 1] - cen[1]); if (d > g.maxR) { g.maxR = +d.toFixed(2); g.farPt = dev(V[2 * v], V[2 * v + 1]); } }
        far.set(rec, g);
      }
      const PTS = (window.__pts ?? []); const hits = PTS.map((p) => {
        const inv = (X, Y) => { const x = X / dpr - m.tx, y = Y / dpr - m.ty, det = m.a * m.d - m.b * m.c; return [(m.d * x - m.c * y) / det, (-m.b * x + m.a * y) / det]; };
        const [wx, wy] = inv(p[0], p[1]); const recs = new Set();
        for (let t = 0; t + 2 < fm.iUsed; t += 3) {
          const a = I[t], b = I[t + 1], c = I[t + 2]; if (a === b && b === c) continue;
          const x0 = V[2 * a], y0 = V[2 * a + 1], x1 = V[2 * b], y1 = V[2 * b + 1], x2 = V[2 * c], y2 = V[2 * c + 1];
          const s1 = (x1 - x0) * (wy - y0) - (y1 - y0) * (wx - x0), s2 = (x2 - x1) * (wy - y1) - (y2 - y1) * (wx - x1), s3 = (x0 - x2) * (wy - y2) - (y0 - y2) * (wx - x2);
          if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) recs.add(Rd[a]);
        }
        return { p, recs: [...recs].map((rb) => ({ rb, ji: recToJ.get(rb) ?? null, arms: recToJ.has(rb) ? (r.junctionArms[recToJ.get(rb)].arms.map((q) => q.chain)) : null })) };
      });
      const farList = [...far.values()].sort((x, y) => y.maxR - x.maxR).slice(0, 40);
      const ps = r.ps;
      const jpos = (j) => { const q = j.particles?.[0]; return q === undefined ? null : dev(ps.positions[2 * q], ps.positions[2 * q + 1]); };
      const junctions = (r.junctionArms ?? []).map((j, i) => ({ i, at: jpos(j), arms: j.arms?.map((a) => ({ chain: a.chain, end: a.end, ctrl: a.ctrl })) }));
      const keys = (o) => o ? Object.keys(o).slice(0, 40) : null;
      return { hits, farList, iUsed: fm.iUsed, vUsed: fm.vUsed, nLongGroups: long.size, long: [...long.values()].sort((x, y) => y.tris - x.tris).slice(0, 60),
        junctions, fusedTips: r.joinery.fusedTips?.map((f) => ({ ...f })), freeTips: r.freeTips?.map((f) => ({ ...f })),
        armKeys: keys(r.junctionArms?.[0]?.arms?.[0]), jKeys: keys(r.junctionArms?.[0]), fusedKeys: keys(r.joinery.fusedTips?.[0]) };
    }, LONG);
    res.hash = h; writeFileSync(outFile, JSON.stringify(res, null, 1));
    console.log(T(), "iUsed", res.iUsed, "long groups", res.nLongGroups, "junctions", res.junctions.length, "fused", res.fusedTips?.length, "free", res.freeTips?.length);
    await page.close(); break;
  }
} finally { await browser.close(); }
console.log(T(), "done");
