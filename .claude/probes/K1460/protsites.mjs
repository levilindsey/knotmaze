// K1460 s5: where today's PROTECT term changes the picture (gap_mask.ts: margin and fade scale by 1 - pr,
// pr = gapInterval(offA, protA, protB) x gapProtCover(B's centreline)). Loads today's renderer at the frozen state
// (cap.mjs's EARLY freeze, then __knotStepUntil(SIMT)) and, per gap slot side with a protect interval, walks a grid
// over the under thread A's ribbon inside the interval (0.01 world along, 9 lanes across): pr there, and the cut the
// slot would make without it (today's perp ramp: e = dO - hO - margin, fadeP = fade * max(sin, 0.2), inside the
// window). A site = the slot side's point where pr * cut is largest; score = the sum of pr * cut over the grid
// (x 0.01 x lane width: world area the protect saves). Prints the sites with max pr > 0.2, largest first, in css px.
//
//   node .claude/probes/K1460/protsites.mjs <base> <profileDir> <query> [out.json]   env SIMT=20 DSF=2
import { writeFileSync } from "node:fs";
import { launch, sleep } from "./cap.mjs";
const [, , base, profileDir, query, outJson] = process.argv;
const SIMT = +(process.env.SIMT ?? 20), DSF = +(process.env.DSF ?? 2);
const browser = await launch(profileDir);
try {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { window.__knotLoopMode = "continuous"; });
  await page.evaluateOnNewDocument(() => { const iv = setInterval(() => { if (typeof window.__knotPhysFreeze === "function" && window.__knotPS?.()) { clearInterval(iv); window.__knotPhysFreeze(true); } }, 0); });
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: DSF });
  await page.goto(`${base}/?${query}`, { waitUntil: "load", timeout: 900000 });
  await page.waitForFunction(() => { const s = window.__knotPerf?.()?.state; return s && s !== "loading"; }, { timeout: 900000, polling: 300 });
  const hash = await page.evaluate(async (t) => {
    await window.__knotPhysFreeze(true);
    await window.__knotStepUntil(t);
    const d = await window.__knotPhysDump();
    const h = d?.hashes ?? d; return String(h?.all ?? JSON.stringify(h).slice(0, 80));
  }, SIMT);
  await sleep(1500);
  const res = await page.evaluate(() => {
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
      const x = pos[i * 2] + (pos[j * 2] - pos[i * 2]) * u, y = pos[i * 2 + 1] + (pos[j * 2 + 1] - pos[i * 2 + 1]) * u;
      const tx = pos[j * 2] - pos[i * 2], ty = pos[j * 2 + 1] - pos[i * 2 + 1], l = Math.hypot(tx, ty) || 1;
      return { x, y, tx: tx / l, ty: ty / l };
    };
    // a local polyline of chain S around arc a0 (+-R world), and the nearest distance / tangent from p
    const local = (S, a0, R) => { const pts = []; for (let a = a0 - R; a <= a0 + R + 1e-9; a += 0.01) { if (!S.closed && (a < 0 || a > S.totalLength)) continue; pts.push(at(S, a)); } return pts; };
    const near = (pts, x, y) => {
      let bd = Infinity, bt = null;
      for (let i = 0; i + 1 < pts.length; i++) {
        const A = pts[i], B = pts[i + 1], dx = B.x - A.x, dy = B.y - A.y, l2 = dx * dx + dy * dy;
        const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - A.x) * dx + (y - A.y) * dy) / l2)) : 0;
        const ex = x - A.x - dx * t, ey = y - A.y - dy * t, d = ex * ex + ey * ey;
        if (d < bd) { bd = d; bt = A; }
      }
      return { d: Math.sqrt(bd), t: bt };
    };
    const pxW = 1 / (view.s * 2);
    const scr = (x, y) => [x * view.s + view.x, y * view.s + view.y];
    const sites = [];
    ps.crossings.forEach((c, ci) => {
      let d; try { d = r.gaps.describeSlot(ci); } catch { return; }
      if (!d || !(d.n >= 1)) return;
      const SA = r.chainSamples[c.under.chain], SO = r.chainSamples[c.over.chain];
      if (!SA || !SO) return;
      const h = d.hOver, oArc = arcOf(SO, r.renderCtrl(c.over));
      const Opts = local(SO, oArc, 3.4);
      for (let side = 0; side < 2; side++) {
        const pa = d.prot[side * 2], pb = d.prot[side * 2 + 1];
        if (!(pa < pb)) continue;
        const bCh = r.slotProtChain[ci * 2 + side];
        if (bCh < 0) continue;
        const SB = r.chainSamples[bCh];
        const bArc = arcOf(SB, r.slotProtCtrl[ci * 2 + side]);
        const Bpts = local(SB, bArc, 3.0);
        const scale = side === 0 ? d.scales : d.scales; // [marginNeg?, marginPos?, fadeNeg?, fadePos?] (texels 6.zw, 5.xy)
        let score = 0, best = null, maxPr = 0;
        for (let off = pa; off <= pb + 1e-9; off += 0.01) {
          const ival = Math.max(0, Math.min(1, Math.min(off - pa, pb - off) / 0.04 + 0.5));
          if (ival <= 0) continue;
          const m = Math.min(off + d.winNeg, d.winPos - off);
          if (m <= -pxW) continue;
          const inWin = Math.max(0, Math.min(1, m / pxW + 0.5));
          const P = at(SA, d.centerArc + off);
          for (let li = -4; li <= 4; li++) {
            const lat = (li / 4) * h * 0.95;
            const x = P.x - P.ty * lat, y = P.y + P.tx * lat;
            const cov = Math.max(0, Math.min(1, (h - near(Bpts, x, y).d) / pxW + 0.5));
            const pr = ival * cov;
            if (pr <= 0) continue;
            maxPr = Math.max(maxPr, pr);
            const N = near(Opts, x, y);
            const sinT = Math.abs(P.tx * N.t.ty - P.ty * N.t.tx);
            const posSide = off >= 0;
            const margin = d.margin * (posSide ? d.scales[1] : d.scales[0]);
            const fadeP = d.fade * Math.max(sinT, 0.2) * (posSide ? d.scales[3] : d.scales[2]);
            const e = N.d - h - margin;
            let k = Math.max(0, Math.min(1, (e + 0.5 * pxW) / Math.max(fadeP, pxW))); k = k * k * (3 - 2 * k);
            const cut = (1 - k) * inWin * (N.d < h ? 0 : 1);
            const v = pr * cut;
            score += v * 0.01 * (h * 0.95 / 4);
            if (!best || v > best.v) best = { v, x, y, pr, cut };
          }
        }
        if (maxPr > 0.2 && best) {
          const [sx, sy] = scr(best.x, best.y);
          sites.push({ ci, win: [d.winNeg, d.winPos], margin: d.margin, fade: d.fade, h, side: side ? "pos" : "neg", B: bCh, A: c.under.chain, O: c.over.chain, interval: [pa, pb], score, peak: best.v, pr: best.pr, cut: best.cut, maxPr, css: [Math.round(sx), Math.round(sy)] });
        }
      }
    });
    sites.sort((a, b) => b.score - a.score);
    return { fadeLength: r.fadeLength, pxW, n: ps.crossings.length, sites };
  });
  console.log(`hash ${hash} fadeLength ${res.fadeLength} crossings ${res.n} protect sides with pr > 0.2: ${res.sites.length}`);
  for (const s of res.sites) console.log(`ci ${s.ci} ${s.side} A${s.A} under O${s.O}, covers B${s.B}: css ${s.css.join(",")} score ${(s.score * 1e3).toFixed(2)}e-3 peak pr*cut ${s.peak.toFixed(2)} (pr ${s.pr.toFixed(2)} cut ${s.cut.toFixed(2)}) interval ${s.interval.map((v) => v.toFixed(2)).join("..")} win ${(-s.win[0]).toFixed(2)}..${s.win[1].toFixed(2)} h ${s.h.toFixed(2)} margin ${s.margin.toFixed(2)} fade ${s.fade.toFixed(2)}`);
  if (outJson) writeFileSync(outJson, JSON.stringify({ hash, ...res }, null, 1));
} finally { await browser.close(); }
