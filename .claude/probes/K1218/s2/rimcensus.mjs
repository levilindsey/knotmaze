// K1218 S2: every drawn wedge's rim against its two arm edges, in world
// units, for today's rim (the quadratic through the straight-edge corner,
// joinery.ts's wedge loop) and for a candidate (the quadratic whose control
// is where the two TIP tangents meet, G1 at both tips; today's corner when
// they meet behind a tip or past a flank's length). Per wedge: how far the
// rim dips INTO either arm (a rim that crosses an arm edge leaves the
// outline a corner where it crosses: loop ji 113) and each tip's kink.
//   node rimcensus.mjs <stand> <outDir> ; stands loop | x4 | cross, no moves.
// Writes <outDir>/rimcensus.json (summary + the worst wedges).
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, PIN, sleep } from "./lib.mjs";

const Q = "k111&am=instant&fw=0&snd=none&phw=0";
const STANDS = { cross: Q, x4: Q + "&pr=8", loop: "1&am=instant&fw=0&snd=none&phw=0&pr=8" };
const [, , STAND = "loop", OUTARG = "out/rimcensus"] = process.argv;
const OUT = resolve(OUTARG);
mkdirSync(OUT, { recursive: true });
const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, STANDS[STAND], log);
  await waitAsleep(page);
  await viewStill(page);
  await page.evaluate(PIN);
  await sleep(200);
  const res = await page.evaluate(async () => {
    const rcm = await import("/src/render/ribbon/rim_curve.ts");
    const r = window.__knotRenderer();
    r.rebuildFillets(true);
    const fp = r.fieldProbe;
    const w = (r.style.threadWidth / 2) * 0.97;
    const cross = (ax, ay, bx, by) => ax * by - ay * bx;
    const deg = (u, v) => Math.atan2(cross(u[0], u[1], v[0], v[1]), u[0] * v[0] + u[1] * v[1]) * 180 / Math.PI;
    // Signed depth of p into the arm behind an edge polyline (outward order):
    // > 0 = on the arm's side; side +1 = the wedge lies left of the outward
    // direction (A's left edge), -1 = right (B's right edge).
    const depth = (p, edge, side) => {
      let best = Infinity, sd = 0;
      for (let i = 0; i + 1 < edge.length; i++) {
        const [x0, y0] = edge[i], [x1, y1] = edge[i + 1];
        const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy;
        if (L2 < 1e-12) continue;
        let t = ((p[0] - x0) * dx + (p[1] - y0) * dy) / L2;
        const inside = t >= 0 && t <= 1;
        t = Math.max(0, Math.min(1, t));
        const qx = p[0] - (x0 + dx * t), qy = p[1] - (y0 + dy * t);
        const d = Math.hypot(qx, qy);
        if (d < best) {
          best = d;
          const L = Math.sqrt(L2);
          // wedge-side normal
          const nx = side > 0 ? -dy / L : dy / L, ny = side > 0 ? dx / L : -dx / L;
          sd = inside ? -(qx * nx + qy * ny) : 0;
        }
      }
      return sd;
    };
    const rimOf = (pa, ta, pb, tb, cx, cy) => {
      const c = rcm.rimCurvePoints(pa[0], pa[1], ta[0], ta[1], pb[0], pb[1], tb[0], tb[1], cx, cy, 8);
      const pts = [pa];
      for (let i = 0; i < c.pts.length; i += 2) pts.push([c.pts[i], c.pts[i + 1]]);
      pts.push(pb);
      return pts;
    };
    const measure = (rim, edgeA, edgeB, ta, tb) => {
      let inA = 0, inB = 0;
      // Dense: 4 sub-points per rim chord.
      for (let i = 0; i + 1 < rim.length; i++) {
        for (let k = 0; k < 4; k++) {
          const q = k / 4, p = [rim[i][0] + (rim[i + 1][0] - rim[i][0]) * q, rim[i][1] + (rim[i + 1][1] - rim[i][1]) * q];
          if (i > 0 || k > 0) inA = Math.max(inA, depth(p, edgeA, +1));
          if (i + 1 < rim.length - 1 || k > 0) inB = Math.max(inB, depth(p, edgeB, -1));
        }
      }
      const n = rim.length;
      const kinkA = deg([-ta[0], -ta[1]], [rim[1][0] - rim[0][0], rim[1][1] - rim[0][1]]);
      const kinkB = deg([rim[n - 1][0] - rim[n - 2][0], rim[n - 1][1] - rim[n - 2][1]], tb);
      return { inA, inB, kinkA, kinkB };
    };
    const rows = [];
    let nulls = 0;
    for (let ji = 0; nulls < 30 && ji < 20000; ji++) {
      const c = fp.center(ji);
      if (!c) { nulls++; continue; }
      nulls = 0;
      const arms = fp.arms(ji);
      if (arms.length < 2) continue;
      const [jx, jy] = c;
      const base = fp.record(ji);
      let jn = -1;
      for (const [k, v] of r.recBaseByJn) if (v === base) jn = k;
      for (let k = 0; k < arms.length; k++) {
        const A = arms[k], B = arms[(k + 1) % arms.length];
        let gap = B.ang - A.ang;
        if (k === arms.length - 1) gap += Math.PI * 2;
        if (gap > 2.6 && A.chain === B.chain) continue;
        if (!A.flankPts || !B.flankPts) continue;
        const o1x = jx - A.dy * w, o1y = jy + A.dx * w, o2x = jx + B.dy * w, o2y = jy - B.dx * w;
        const denom = A.dx * B.dy - A.dy * B.dx, lim = w * 2.2;
        let cx = (o1x + o2x) / 2, cy = (o1y + o2y) / 2;
        if (Math.abs(denom) >= 0.08) {
          const rx = o2x - o1x, ry = o2y - o1y;
          const t = (rx * B.dy - ry * B.dx) / denom, s = (rx * A.dy - ry * A.dx) / denom;
          if (t >= -w * 0.5 && t <= lim && s >= -w * 0.5 && s <= lim) { cx = o1x + A.dx * t; cy = o1y + A.dy * t; }
        }
        const edge = (arm, left) => {
          const f = arm.flankPts, sgn = left ? w : -w, n = f.length / 4, pts = [];
          for (let e = 0; e < n; e++) pts.push([f[e * 4] - f[e * 4 + 3] * sgn, f[e * 4 + 1] + f[e * 4 + 2] * sgn]);
          return { pts, tan: [f[(n - 1) * 4 + 2], f[(n - 1) * 4 + 3]] };
        };
        const ea = edge(A, true), eb = edge(B, false);
        const pa = ea.pts[ea.pts.length - 1], pb = eb.pts[eb.pts.length - 1];
        const rounded = r.cornerWedgeRounded(jn, A, B);
        if (!rounded) continue;
        const now = measure(rimOf(pa, ea.tan, pb, eb.tan, cx, cy), ea.pts, eb.pts, ea.tan, eb.tan);
        // Candidate control: tipA - u tanA = tipB - v tanB.
        const ta = ea.tan, tb = eb.tan, tden = cross(ta[0], ta[1], tb[0], tb[1]);
        const rx = pb[0] - pa[0], ry = pb[1] - pa[1];
        let kx = cx, ky = cy, used = false;
        if (Math.abs(tden) > 1e-3) {
          const u = -cross(rx, ry, tb[0], tb[1]) / tden, v = -cross(rx, ry, ta[0], ta[1]) / tden;
          const lenA = Math.hypot(pa[0] - ea.pts[0][0], pa[1] - ea.pts[0][1]);
          const lenB = Math.hypot(pb[0] - eb.pts[0][0], pb[1] - eb.pts[0][1]);
          if (u > 1e-4 && v > 1e-4 && u <= lenA && v <= lenB) { kx = pa[0] - ta[0] * u; ky = pa[1] - ta[1] * u; used = true; }
        }
        const cand = measure(rimOf(pa, ta, pb, tb, kx, ky), ea.pts, eb.pts, ta, tb);
        rows.push({ ji, k, gapDeg: gap * 180 / Math.PI, used, now, cand, ctrlShift: Math.hypot(kx - cx, ky - cy) });
      }
    }
    return { rows, threadHalf: r.style.threadWidth / 2 };
  });
  const rows = res.rows;
  const PX = 1 / 90; // one device px at the stands' 60 px/world, dsf 1.5
  const count = (f) => rows.filter(f).length;
  const sum = {
    stand: STAND, wedges: rows.length, candUsed: count((x) => x.used),
    nowIn: { gt05px: count((x) => Math.max(x.now.inA, x.now.inB) > 0.5 * PX), gt1px: count((x) => Math.max(x.now.inA, x.now.inB) > PX), gt2px: count((x) => Math.max(x.now.inA, x.now.inB) > 2 * PX) },
    candIn: { gt05px: count((x) => Math.max(x.cand.inA, x.cand.inB) > 0.5 * PX), gt1px: count((x) => Math.max(x.cand.inA, x.cand.inB) > PX), gt2px: count((x) => Math.max(x.cand.inA, x.cand.inB) > 2 * PX) },
    nowKinkGt5: count((x) => Math.max(Math.abs(x.now.kinkA), Math.abs(x.now.kinkB)) > 5),
    candKinkGt5: count((x) => Math.max(Math.abs(x.cand.kinkA), Math.abs(x.cand.kinkB)) > 5),
    worse: count((x) => Math.max(x.cand.inA, x.cand.inB) > Math.max(x.now.inA, x.now.inB) + 0.5 * PX),
  };
  const worstNow = [...rows].sort((a, b) => Math.max(b.now.inA, b.now.inB) - Math.max(a.now.inA, a.now.inB)).slice(0, 12);
  const worstCand = [...rows].sort((a, b) => Math.max(b.cand.inA, b.cand.inB) - Math.max(a.cand.inA, a.cand.inB)).slice(0, 12);
  const at113 = rows.filter((x) => x.ji === 113);
  writeFileSync(join(OUT, "rimcensus.json"), JSON.stringify({ sum, worstNow, worstCand, at113, log: log.slice(-10) }, null, 1));
  const px = (v) => +(v / PX).toFixed(2);
  console.log(JSON.stringify(sum));
  console.log("worstNow", JSON.stringify(worstNow.slice(0, 6).map((x) => [x.ji, x.k, +x.gapDeg.toFixed(0), px(Math.max(x.now.inA, x.now.inB)), "->", px(Math.max(x.cand.inA, x.cand.inB)), x.used])));
  console.log("worstCand", JSON.stringify(worstCand.slice(0, 6).map((x) => [x.ji, x.k, +x.gapDeg.toFixed(0), px(Math.max(x.now.inA, x.now.inB)), "->", px(Math.max(x.cand.inA, x.cand.inB)), x.used])));
  if (STAND === "loop") console.log("ji113", JSON.stringify(at113.map((x) => [x.k, px(x.now.inA), px(x.now.inB), +x.now.kinkA.toFixed(1), +x.now.kinkB.toFixed(1), "->", px(x.cand.inA), px(x.cand.inB), +x.cand.kinkA.toFixed(1), +x.cand.kinkB.toFixed(1), x.used])));
} finally {
  await browser.close();
}
