// K1211 S2: offline checks on shoot2.mjs's full-viewport shots (no browser).
//   node checks2.mjs light  <dir> <ji>                  per phase: light px in the web (L0_t<k> vs np)
//   node checks2.mjs ctl    <dirM> <dirB>               controls: np, pure, nb_t0 master vs branch (px > 8)
//   node checks2.mjs local  <dirM> <dirB>               (c) locality: L0_t<k> master vs branch, changed px
//                                                        by distance to the nearest record centre (fh)
//   node checks2.mjs gold   <dirM> <dirB> <ji>...       nub + corner on L0_t<k>, the reference nb_t0
// Gold: a pixel within GOLD_TOL (max channel) of the gold colour, the median
// of np's pixels that differ from pure by > 60 (np: the gold, no light).
// Nub: per off-route arm, its corridor (|lateral| <= fh, along in [0, rWeb]);
// master's furthest gold along it (L0 every phase, and nb_t0, the round tube),
// then branch gold px past master's furthest + 1 px. The bar is 0.
// Corner: the gold component through the route's centre, its Moore contour,
// the turn between chords of K = 0.3 fh px either side, the sharpest inside
// 0.85 rWeb of the centre (points within K of the crop's border skipped).
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, toRGB } from "./png.mjs";

const load = (f) => toRGB(decodePNG(readFileSync(f)));
const meta = (d) => JSON.parse(readFileSync(join(d, "meta.json"), "utf8"));
const GOLD_TOL = 48;
const [, , CMD, ...args] = process.argv;

function geom(M) {
  const dsf = M.dsf || 1.5, pxw = M.scale * dsf, fh = M.fh;
  const fanR = Math.max(fh * 1.25 * M.cusp, fh);
  return { dsf, pxw, fhPx: fh * pxw, rWeb: (fanR + fh) * pxw, rZone: (fanR + 2 * fh + 2.25 * fh) * pxw };
}
const cen = (M, r) => [r.sx * (M.dsf || 1.5), r.sy * (M.dsf || 1.5)];
const px = (I, x, y) => { const o = (y * I.W + x) * 3; return [I.data[o], I.data[o + 1], I.data[o + 2]]; };
const dmax = (a, b) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));

function goldColour(dir) {
  const NP = load(join(dir, "np.png")), PU = load(join(dir, "pure.png"));
  const rs = [], gs = [], bs = [];
  for (let y = 0; y < NP.H; y += 2) for (let x = 0; x < NP.W; x += 2) {
    const a = px(NP, x, y);
    if (dmax(a, px(PU, x, y)) > 60) { rs.push(a[0]); gs.push(a[1]); bs.push(a[2]); }
  }
  const med = (v) => v.sort((p, q) => p - q)[v.length >> 1];
  return [med(rs), med(gs), med(bs)];
}

function diffCount(A, B, thr = 8) {
  let n = 0;
  for (let i = 0; i < A.data.length; i += 3) {
    if (Math.abs(A.data[i] - B.data[i]) > thr || Math.abs(A.data[i + 1] - B.data[i + 1]) > thr || Math.abs(A.data[i + 2] - B.data[i + 2]) > thr) n++;
  }
  return n;
}

if (CMD === "light") {
  const [dir, ji] = args, M = meta(dir), g = geom(M), r = M.recs.find((q) => q.ji === Number(ji));
  const [cx, cy] = cen(M, r), NP = load(join(dir, "np.png"));
  for (let k = 0; k < M.nf; k++) {
    const I = load(join(dir, `L0_t${k}.png`));
    let n = 0;
    for (let y = Math.floor(cy - g.rWeb); y <= cy + g.rWeb; y++) for (let x = Math.floor(cx - g.rWeb); x <= cx + g.rWeb; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > g.rWeb ** 2) continue;
      if (dmax(px(I, x, y), px(NP, x, y)) > 24) n++;
    }
    console.log(`k ${k}: light px ${n}`);
  }
} else if (CMD === "ctl") {
  const [dM, dB] = args;
  for (const f of ["np.png", "pure.png", "nb_t0.png", "nb_t3.png", "nomask.png", "w0_t0.png"]) {
    if (!existsSync(join(dM, f)) || !existsSync(join(dB, f))) continue;
    console.log(`${f}: ${diffCount(load(join(dM, f)), load(join(dB, f)))} px differ`);
  }
} else if (CMD === "local") {
  const [dM, dB] = args, M = meta(dB), g = geom(M);
  const cs = M.recs.map((r) => cen(M, r));
  let tot = 0, out = 0, far = 0, near = new Map();
  for (let k = 0; k < M.nf; k++) {
    const A = load(join(dM, `L0_t${k}.png`)), B = load(join(dB, `L0_t${k}.png`));
    for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) {
      if (dmax(px(A, x, y), px(B, x, y)) <= 8) continue;
      let best = Infinity, bi = -1;
      cs.forEach(([cx, cy], i) => { const d = Math.hypot(x - cx, y - cy); if (d < best) { best = d; bi = i; } });
      tot++;
      const fhs = best / g.fhPx;
      far = Math.max(far, fhs);
      if (best > g.rZone) out++;
      const ji = M.recs[bi].ji;
      near.set(ji, (near.get(ji) || 0) + 1);
    }
  }
  const top = [...near.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([j, n]) => `ji ${j}: ${n}`).join(", ");
  console.log(`(c) L0 master vs branch, ${M.nf} phases: ${tot} px differ, outside every zone (${(g.rZone / g.fhPx).toFixed(2)} fh) ${out}, furthest ${far.toFixed(2)} fh; by nearest record: ${top}`);
} else if (CMD === "gold") {
  const [dM, dB, ...jis] = args, M = meta(dB), g = geom(M);
  const G = goldColour(dB), GM = goldColour(dM);
  console.log(`gold colour branch ${G} master ${GM}; fh ${g.fhPx.toFixed(1)} px, rWeb ${g.rWeb.toFixed(1)} px`);
  const isGold = (I, x, y) => x >= 0 && y >= 0 && x < I.W && y < I.H && dmax(px(I, x, y), G) <= GOLD_TOL;
  const K = Math.max(3, Math.round(0.3 * g.fhPx));
  for (const jiS of jis) {
    const r = M.recs.find((q) => q.ji === Number(jiS));
    if (!r) { console.log(`ji ${jiS}: no record`); continue; }
    const [cx, cy] = cen(M, r);
    const onRoute = new Set();
    for (const rt of r.routes || []) { onRoute.add(rt.ia); onRoute.add(rt.ib); }
    const offArms = r.arms.map((a, i) => ({ a, i })).filter(({ i }) => !onRoute.has(i));
    // furthest gold along an arm's corridor
    const along = (I, a) => {
      const ux = Math.cos(a.ang), uy = Math.sin(a.ang);
      let mx = -1;
      const pts = [];
      for (let y = Math.floor(cy - g.rWeb); y <= cy + g.rWeb; y++) for (let x = Math.floor(cx - g.rWeb); x <= cx + g.rWeb; x++) {
        const dx = x - cx, dy = y - cy, s = dx * ux + dy * uy, l = Math.abs(dx * uy - dy * ux);
        if (s < 0 || s > g.rWeb || l > g.fhPx) continue;
        if (isGold(I, x, y)) { mx = Math.max(mx, s); pts.push(s); }
      }
      return { mx, pts };
    };
    // the corner check: contour of the gold component through the route
    const corner = (I) => {
      const R = Math.ceil(g.rWeb * 1.2), x0 = Math.round(cx - R), y0 = Math.round(cy - R), S = 2 * R + 1;
      const m = new Uint8Array(S * S);
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) m[y * S + x] = isGold(I, x0 + x, y0 + y) ? 1 : 0;
      // seed: the gold pixel nearest the centre
      let seed = -1, bd = Infinity;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (m[y * S + x]) { const d = (x - R) ** 2 + (y - R) ** 2; if (d < bd) { bd = d; seed = y * S + x; } }
      if (seed < 0 || bd > (g.fhPx * 1.2) ** 2) return { turn: NaN, at: null, n: 0 };
      const comp = new Uint8Array(S * S), st = [seed];
      comp[seed] = 1;
      while (st.length) {
        const q = st.pop(), qx = q % S, qy = (q - qx) / S;
        for (const [ex, ey] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = qx + ex, ny = qy + ey;
          if (nx < 0 || ny < 0 || nx >= S || ny >= S) continue;
          const o = ny * S + nx;
          if (m[o] && !comp[o]) { comp[o] = 1; st.push(o); }
        }
      }
      // Moore tracing from the top-left boundary pixel of the component
      let start = -1;
      for (let o = 0; o < S * S && start < 0; o++) if (comp[o]) start = o;
      const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
      const at = (x, y) => x >= 0 && y >= 0 && x < S && y < S && comp[y * S + x] === 1;
      const cont = [];
      let cxp = start % S, cyp = (start - cxp) / S, bdir = 6; // came from above-ish
      const sx = cxp, sy = cyp;
      for (let it = 0; it < S * S * 4; it++) {
        cont.push([cxp, cyp]);
        let found = false;
        for (let t = 0; t < 8; t++) {
          const d = (bdir + 1 + t) % 8;
          const nx = cxp + dirs[d][0], ny = cyp + dirs[d][1];
          if (at(nx, ny)) { cxp = nx; cyp = ny; bdir = (d + 4) % 8; found = true; break; }
        }
        if (!found || (cxp === sx && cyp === sy && cont.length > 2)) break;
      }
      let best = 0, bat = null;
      const n = cont.length;
      for (let i = 0; i < n; i++) {
        const [px0, py0] = cont[i];
        if ((px0 - R) ** 2 + (py0 - R) ** 2 > (0.85 * g.rWeb) ** 2) continue;
        if (px0 < K || py0 < K || px0 >= S - K || py0 >= S - K) continue;
        const a = cont[(i - K + n) % n], b = cont[(i + K) % n];
        const v1 = [px0 - a[0], py0 - a[1]], v2 = [b[0] - px0, b[1] - py0];
        const l1 = Math.hypot(...v1), l2 = Math.hypot(...v2);
        if (l1 < K * 0.5 || l2 < K * 0.5) continue;
        const c = (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2);
        const ang = (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
        if (ang > best) { best = ang; bat = [x0 + px0, y0 + py0]; }
      }
      return { turn: best, at: bat, n };
    };
    const nbM = load(join(dM, "nb_t0.png"));
    const lines = [];
    let worstNub = 0;
    const turnsM = [], turnsB = [];
    // Master's gold edge per off-route arm: the furthest gold along its
    // corridor in master's live shots (every phase) and in its no-band shots
    // (the tube's own round end, which the bands cut on master).
    const mxM = offArms.map(() => -1), mxNb = offArms.map(() => -1);
    const frames = [];
    for (let k = 0; k < M.nf; k++) frames.push([load(join(dM, `L0_t${k}.png`)), load(join(dB, `L0_t${k}.png`))]);
    frames.forEach(([A]) => offArms.forEach(({ a }, j) => { mxM[j] = Math.max(mxM[j], along(A, a).mx); }));
    for (let k = 0; k < M.nf; k++) {
      const f0 = join(dM, `nb_t${k}.png`);
      if (!existsSync(f0)) continue;
      const N = load(f0);
      offArms.forEach(({ a }, j) => { mxNb[j] = Math.max(mxNb[j], along(N, a).mx); });
    }
    const ref = mxM.map((v, j) => Math.max(v, mxNb[j]));
    frames.forEach(([A, B], k) => {
      offArms.forEach(({ a, i }, j) => {
        const { pts } = along(B, a);
        const nub = pts.filter((s) => s > ref[j] + 1).length;
        worstNub = Math.max(worstNub, nub);
        if (nub > 0) lines.push(`    k ${k} arm ${i}: ${nub} gold px past master (furthest ${(Math.max(...pts) / g.fhPx).toFixed(2)} fh vs ${(ref[j] / g.fhPx).toFixed(2)})`);
      });
      const cm = corner(A), cb = corner(B);
      const lab = (c) => (c.at ? `${c.turn.toFixed(0)}@${(Math.hypot(c.at[0] - cx, c.at[1] - cy) / g.fhPx).toFixed(1)}` : "-");
      turnsM.push(lab(cm)); turnsB.push(lab(cb));
    });
    const f = (v) => v.join(" ");
    console.log(`ji ${jiS}: off-route arms ${offArms.map(({ i }) => i).join(",") || "none"}; master's furthest gold (fh) L0 ${mxM.map((v) => (v / g.fhPx).toFixed(2)).join("/")} nb ${mxNb.map((v) => (v / g.fhPx).toFixed(2)).join("/")}; nub worst ${worstNub} px (past max(L0, nb) + 1 px)`);
    for (const l of lines.slice(0, 6)) console.log(l);
    const cn = corner(nbM);
    console.log(`  corner (deg@fh from centre, K ${K} px) per phase: master ${f(turnsM)} | branch ${f(turnsB)}; nb_t0 master ${cn.at ? `${cn.turn.toFixed(0)}@${(Math.hypot(cn.at[0] - cx, cn.at[1] - cy) / g.fhPx).toFixed(1)}` : "-"}`);
  }
}
