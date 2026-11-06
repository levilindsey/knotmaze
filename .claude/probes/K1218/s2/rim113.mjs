// K1218 S2: one wedge's rim, recomputed in the page from the live arms the
// way rebuildFillets builds it (ribbon/joinery.ts, the wedge loop: corner,
// flank tips, cornerWedgeRounded, rimCurvePoints), to name which rim draws
// loop ji 113's short straight edge and how its ends meet the arm edges.
//   node rim113.mjs <stand=loop> <outDir> ; env RIM_JI (113), RIM_A (1), RIM_B (2),
//   K1211_HOST (the dev server; rim_curve.ts is imported from it).
// Writes <outDir>/rim113.json: the corner (edge intersection or midpoint), the
// tips and their outward tangents, rounded or sharp (K830) with the key and
// candidate, the rim branch (corner-projection cubic or quadratic fallback),
// the kink at each tip (degrees between the arm edge's direction and the
// rim's), and every rim point in world units.
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openBrowser, openPage, waitAsleep, viewStill, moveEdge, PIN, sleep } from "./lib.mjs";

const STANDS = {
  loop: { q: "1&am=instant&fw=0&snd=none&phw=0&pr=8", moves: [185, 186, 187, 122, 50, 118, 117, 165, 60, 9, 178, 57, 101] },
};
const [, , STAND = "loop", OUTARG = "out/rim113"] = process.argv;
const st = STANDS[STAND];
const OUT = resolve(OUTARG);
mkdirSync(OUT, { recursive: true });
const arg = { ji: Number(process.env.RIM_JI ?? 113), ia: Number(process.env.RIM_A ?? 1), ib: Number(process.env.RIM_B ?? 2) };
const browser = await openBrowser();
const log = [];
try {
  const page = await openPage(browser, st.q, log);
  await waitAsleep(page);
  await viewStill(page);
  for (const eid of st.moves) if (!(await moveEdge(page, eid))) throw new Error(`move e${eid} refused`);
  await page.mouse.move(2, 2);
  await sleep(400);
  await waitAsleep(page, 20000);
  await page.evaluate(PIN);
  await sleep(200);
  const res = await page.evaluate(async ({ ji, ia, ib }) => {
    const rcm = await import("/src/render/ribbon/rim_curve.ts");
    const r = window.__knotRenderer();
    r.rebuildFillets(true);
    const fp = r.fieldProbe;
    const c = fp.center(ji);
    const arms = fp.arms(ji);
    const A = arms[ia], B = arms[ib];
    const [jx, jy] = c;
    const w = (r.style.threadWidth / 2) * 0.97;
    let gap = B.ang - A.ang;
    if (ia === arms.length - 1) gap += Math.PI * 2;
    const o1x = jx - A.dy * w, o1y = jy + A.dx * w, o2x = jx + B.dy * w, o2y = jy - B.dx * w;
    const denom = A.dx * B.dy - A.dy * B.dx;
    const lim = w * 2.2;
    let cx = (o1x + o2x) / 2, cy = (o1y + o2y) / 2, cornerKind = "midpoint", t = null, s = null;
    if (Math.abs(denom) >= 0.08) {
      const rx = o2x - o1x, ry = o2y - o1y;
      t = (rx * B.dy - ry * B.dx) / denom;
      s = (rx * A.dy - ry * A.dx) / denom;
      if (t >= -w * 0.5 && t <= lim && s >= -w * 0.5 && s <= lim) {
        cx = o1x + A.dx * t; cy = o1y + A.dy * t; cornerKind = "edges";
      }
    }
    const flank = (arm, left) => {
      const f = arm.flankPts;
      if (!f) return null;
      const sgn = left ? w : -w, n = f.length / 4, pts = [];
      for (let e = 0; e < n; e++) pts.push([f[e * 4] - f[e * 4 + 3] * sgn, f[e * 4 + 1] + f[e * 4 + 2] * sgn]);
      return { pts, tan: [f[(n - 1) * 4 + 2], f[(n - 1) * 4 + 3]], tan0: [f[2], f[3]] };
    };
    const fa = flank(A, true), fb = flank(B, false);
    if (!fa || !fb) return { err: "no flankPts", arms: arms.length };
    const pa = fa.pts[fa.pts.length - 1], pb = fb.pts[fb.pts.length - 1];
    const curve = rcm.rimCurvePoints(pa[0], pa[1], fa.tan[0], fa.tan[1], pb[0], pb[1], fb.tan[0], fb.tan[1], cx, cy, 8);
    const projA = (cx - pa[0]) * fa.tan[0] + (cy - pa[1]) * fa.tan[1];
    const projB = (cx - pb[0]) * fb.tan[0] + (cy - pb[1]) * fb.tan[1];
    const base = fp.record(ji);
    let jn = -1;
    for (const [k, v] of r.recBaseByJn) if (v === base) jn = k;
    const key = `${jn}:${A.chain}:${A.slot}:${A.dir}>${B.chain}:${B.slot}:${B.dir}`;
    const cand = r.cornerCandidates.filter((cc) => cc.key === key);
    const rounded = r.cornerWedgeRounded(jn, A, B);
    const deg = (u, v) => Math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1]) * 180 / Math.PI;
    const pts = [];
    for (let i = 0; i < curve.pts.length; i += 2) pts.push([curve.pts[i], curve.pts[i + 1]]);
    const rim = rounded ? [pa, ...pts, pb] : [pa, [cx, cy], pb];
    const first = rim[1], last = rim[rim.length - 2];
    // The outline runs in along A's edge (-tanA), along the rim, then out
    // along B's edge (+tanB): 0 degrees at a tip is a tangent (G1) join.
    const kinkA = deg([-fa.tan[0], -fa.tan[1]], [first[0] - pa[0], first[1] - pa[1]]);
    const kinkB = deg([pb[0] - last[0], pb[1] - last[1]], fb.tan);
    const segDeg = [];
    for (let i = 1; i < rim.length; i++) segDeg.push(Math.atan2(rim[i][1] - rim[i - 1][1], rim[i][0] - rim[i - 1][0]) * 180 / Math.PI);
    return {
      ji, ia, ib, nArms: arms.length, jn, center: c, w, gapDeg: gap * 180 / Math.PI,
      A: { ang: A.ang, dir: A.dir, chain: A.chain, slot: A.slot, dx: A.dx, dy: A.dy, tanTip: fa.tan, tanIn: fa.tan0, flankN: fa.pts.length },
      B: { ang: B.ang, dir: B.dir, chain: B.chain, slot: B.slot, dx: B.dx, dy: B.dy, tanTip: fb.tan, tanIn: fb.tan0, flankN: fb.pts.length },
      armTurnDeg: { A: deg([A.dx, A.dy], fa.tan), B: deg([B.dx, B.dy], fb.tan) },
      denom, t, s, lim, corner: [cx, cy], cornerKind, tipA: pa, tipB: pb, projA, projB,
      rounded, key, candidates: r.cornerCandidates.length, cand, share: r.cornerRoundShare,
      fellBack: curve.fellBack, kinkA, kinkB, segDeg, rim, edgeA: fa.pts, edgeB: fb.pts,
    };
  }, arg);
  res.log = log.slice(-20);
  writeFileSync(join(OUT, "rim113.json"), JSON.stringify(res, null, 1));
  console.log(JSON.stringify({ jn: res.jn, center: res.center, rounded: res.rounded, cornerKind: res.cornerKind, fellBack: res.fellBack, kinkA: res.kinkA, kinkB: res.kinkB, armTurnDeg: res.armTurnDeg, gapDeg: res.gapDeg, cand: res.cand, candidates: res.candidates, err: res.err }));
} finally {
  await browser.close();
}
