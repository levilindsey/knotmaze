// K1211 S4: a copy of S3's checks3.mjs, plus step3 (the light's 3-px step) at the end.
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
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";

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

// ---------------- K1211 S3 additions: edge, a, b ----------------
//   node checks3.mjs edge <dir> [ji...]   the lit gold's edge: no px darker than both its sides
//   node checks3.mjs a <dirM> <dirB>       (a) steps inside each web, calibrated on pure's own seam
//   node checks3.mjs b <dirM> <dirB>       (b) no jump: frame-to-frame change, the light centroid
// edge: gold coverage a = clamp(dot(np - pure, G - pure) / |G - pure|^2) (skipped where
// |G - pure| < 40); an edge px has 0.15 <= a <= 0.85 within rWeb of a routed record; along a's
// gradient, the gold side is the first px with a >= 0.95 and the band side the first with
// a <= 0.05 (each within 4 px). It is lit when L0_t<k> differs from np by > 16 at either side.
// A dip: the edge px's luma (Rec.601) is below both sides' by > 4; a bump: above both by > 4.
// (a): the light is L0_t<k> - np (S1's shot minus colours-only); steps are 4-neighbour
// max-channel differences inside the material mask (pure vs bg > 8, eroded 2 px). The
// threshold is pure's own step in the same web (the colours' seam), max and p99.5.
// (b): S1's: the web's largest frame-to-frame change against the arms' (+4), and the light
// centroid's largest frame step (frames above 25% of the brightest) against the crest's step.
const luma = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const NB4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function coverage(dir, G) {
  const NP = load(join(dir, "np.png")), PU = load(join(dir, "pure.png"));
  const W = NP.W, H = NP.H, a = new Float32Array(W * H).fill(NaN);
  for (let p = 0; p < W * H; p++) {
    const i = p * 3;
    const d0 = G[0] - PU.data[i], d1 = G[1] - PU.data[i + 1], d2 = G[2] - PU.data[i + 2];
    const n2 = d0 * d0 + d1 * d1 + d2 * d2;
    if (n2 < 1600) continue;
    const v = ((NP.data[i] - PU.data[i]) * d0 + (NP.data[i + 1] - PU.data[i + 1]) * d1 + (NP.data[i + 2] - PU.data[i + 2]) * d2) / n2;
    a[p] = Math.max(0, Math.min(1, v));
  }
  return { a, W, H, NP };
}

function edgeRun(dir, jiF) {
  const M = meta(dir), g = geom(M), G = goldColour(dir);
  const { a, W, H, NP } = coverage(dir, G);
  const A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? NaN : a[y * W + x]);
  const recs = M.recs.filter((r) => (r.routes || []).length && (!jiF.length || jiF.includes(String(r.ji))));
  const seen = new Set(), cands = [];
  for (const r of recs) {
    const [cx, cy] = cen(M, r);
    const y0 = Math.max(1, Math.floor(cy - g.rWeb)), y1 = Math.min(H - 2, Math.ceil(cy + g.rWeb));
    const x0 = Math.max(1, Math.floor(cx - g.rWeb)), x1 = Math.min(W - 2, Math.ceil(cx + g.rWeb));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > g.rWeb ** 2 || seen.has(y * W + x)) continue;
      const v = A(x, y);
      if (!(v >= 0.15 && v <= 0.85)) continue;
      const gx = A(x + 1, y) - A(x - 1, y), gy = A(x, y + 1) - A(x, y - 1), gn = Math.hypot(gx, gy);
      if (!(gn > 0.05)) continue;
      const ux = gx / gn, uy = gy / gn;
      const walk = (s, ok) => {
        for (let t = 0.5; t <= 4; t += 0.5) {
          const xx = Math.round(x + s * ux * t), yy = Math.round(y + s * uy * t);
          if (ok(A(xx, yy))) return [xx, yy];
        }
        return null;
      };
      const gs = walk(1, (w) => w >= 0.95), bs = walk(-1, (w) => w <= 0.05);
      if (!gs || !bs) continue;
      seen.add(y * W + x);
      cands.push({ ji: r.ji, x, y, gs, bs });
    }
  }
  const res = { G, nRec: recs.length, cands: cands.length, per: [], dips: [], bumps: [] };
  for (let k = 0; k < M.nf; k++) {
    const I = load(join(dir, `L0_t${k}.png`));
    let tested = 0, nd = 0, nb = 0, wd = 0, wb = 0;
    for (const c of cands) {
      const P = px(I, c.x, c.y), Gs = px(I, ...c.gs), Bs = px(I, ...c.bs);
      const lit = dmax(Gs, px(NP, ...c.gs)) > 16 || dmax(Bs, px(NP, ...c.bs)) > 16;
      if (!lit) continue;
      tested++;
      const lp = luma(P), lg = luma(Gs), lb = luma(Bs);
      const dip = Math.min(lg, lb) - lp, bump = lp - Math.max(lg, lb);
      if (dip > 4) { nd++; wd = Math.max(wd, dip); res.dips.push({ k, ji: c.ji, x: c.x, y: c.y, v: dip, P, Gs, Bs }); }
      if (bump > 4) { nb++; wb = Math.max(wb, bump); res.bumps.push({ k, ji: c.ji, x: c.x, y: c.y, v: bump, P, Gs, Bs }); }
    }
    res.per.push({ k, tested, nd, wd, nb, wb });
  }
  return res;
}

if (CMD === "edge") {
  const [dir, ...jiF] = args;
  const r = edgeRun(dir, jiF);
  console.log(`edge ${dir}: gold ${r.G}, routed records ${r.nRec}, edge px ${r.cands}`);
  for (const p of r.per) console.log(`  k ${p.k}: lit edge px ${p.tested}, dips ${p.nd} (worst ${p.wd.toFixed(1)}), bumps ${p.nb} (worst ${p.wb.toFixed(1)})`);
  for (const [name, list] of [["dips", r.dips], ["bumps", r.bumps]]) {
    if (!list.length) continue;
    const by = new Map();
    for (const d of list) by.set(d.ji, (by.get(d.ji) || 0) + 1);
    console.log(`  ${name} by record: ${[...by.entries()].map(([j, n]) => `ji ${j}: ${n}`).join(", ")}`);
    for (const d of list.sort((p, q) => q.v - p.v).slice(0, 8)) console.log(`    k ${d.k} ji ${d.ji} (${d.x}, ${d.y}) ${d.v.toFixed(1)}: px ${d.P} gold side ${d.Gs} band side ${d.Bs}`);
  }
}

function maskOf(dir) {
  const PU = load(join(dir, "pure.png")), BG = load(join(dir, "bg.png"));
  const W = PU.W, H = PU.H;
  let m = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    const i = p * 3;
    m[p] = Math.max(Math.abs(PU.data[i] - BG.data[i]), Math.abs(PU.data[i + 1] - BG.data[i + 1]), Math.abs(PU.data[i + 2] - BG.data[i + 2])) > 8 ? 1 : 0;
  }
  for (let it = 0; it < 2; it++) {
    const o = new Uint8Array(W * H);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const p = y * W + x;
      o[p] = m[p] && m[p - 1] && m[p + 1] && m[p - W] && m[p + W] ? 1 : 0;
    }
    m = o;
  }
  return { m, W, H };
}
function regionsOf(M, W, H) {
  const g = geom(M), zone = new Uint8Array(W * H), webOf = new Int32Array(W * H).fill(-1), webs = [];
  for (const r of M.recs) {
    const [cx, cy] = cen(M, r);
    if (cx < -g.rZone || cy < -g.rZone || cx > W + g.rZone || cy > H + g.rZone) continue;
    const inside = cx - g.rWeb >= 0 && cy - g.rWeb >= 0 && cx + g.rWeb < W && cy + g.rWeb < H;
    if (inside) webs.push(r.ji);
    const x0 = Math.max(0, Math.floor(cx - g.rZone)), x1 = Math.min(W - 1, Math.ceil(cx + g.rZone));
    const y0 = Math.max(0, Math.floor(cy - g.rZone)), y1 = Math.min(H - 1, Math.ceil(cy + g.rZone));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), p = y * W + x;
      if (d <= g.rZone) zone[p] = 1;
      if (inside && d <= g.rWeb) webOf[p] = r.ji;
    }
  }
  return { g, zone, webOf, webs };
}
function stepsOf(X, W, H, mask) {
  const s = new Uint16Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (!mask[p]) continue;
    let mx = 0;
    for (const [dx, dy] of NB4) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const q = yy * W + xx;
      if (!mask[q]) continue;
      for (let c = 0; c < 3; c++) { const d = Math.abs(X[p * 3 + c] - X[q * 3 + c]); if (d > mx) mx = d; }
    }
    s[p] = mx;
  }
  return s;
}
const pctOf = (h, q) => { let n = 0; for (const v of h) n += v; let acc = 0; for (let i = 0; i < h.length; i++) { acc += h[i]; if (acc >= q * n) return i; } return 0; };
const subOf = (A, B) => { const o = new Int16Array(A.data.length); for (let i = 0; i < o.length; i++) o[i] = A.data[i] - B.data[i]; return o; };

function aRun(dir, MK) {
  const M = meta(dir), { m, W, H } = MK, R = regionsOf(M, W, H);
  const PU = load(join(dir, "pure.png")), NP = load(join(dir, "np.png"));
  const sP = stepsOf(Int16Array.from(PU.data), W, H, m);
  const seam = {};
  for (let p = 0; p < W * H; p++) {
    const j = R.webOf[p];
    if (!m[p] || j < 0) continue;
    const e = (seam[j] ??= { max: 0, h: new Uint32Array(512) });
    e.max = Math.max(e.max, sP[p]); e.h[Math.min(511, sP[p])]++;
  }
  const web = {}, arms = { max: 0, p: 0 };
  for (let k = 0; k < M.nf; k++) {
    const I = load(join(dir, `L0_t${k}.png`));
    const s = stepsOf(subOf(I, NP), W, H, m);
    const wk = {}, hA = new Uint32Array(512);
    let am = 0;
    for (let p = 0; p < W * H; p++) {
      if (!m[p]) continue;
      const j = R.webOf[p];
      if (j >= 0) { const e = (wk[j] ??= { max: 0, h: new Uint32Array(512) }); e.max = Math.max(e.max, s[p]); e.h[Math.min(511, s[p])]++; }
      else if (!R.zone[p]) { am = Math.max(am, s[p]); hA[Math.min(511, s[p])]++; }
    }
    arms.max = Math.max(arms.max, am); arms.p = Math.max(arms.p, pctOf(hA, 0.995));
    for (const [j, e] of Object.entries(wk)) {
      const w = (web[j] ??= { max: 0, p: 0, over: 0 });
      const p995 = pctOf(e.h, 0.995);
      w.max = Math.max(w.max, e.max); w.p = Math.max(w.p, p995);
      if (p995 > pctOf(seam[j].h, 0.995) || e.max > seam[j].max) w.over++;
    }
  }
  const sm = {};
  for (const [j, e] of Object.entries(seam)) sm[j] = { max: e.max, p: pctOf(e.h, 0.995) };
  return { webs: R.webs, seam: sm, web, arms, nf: M.nf };
}

function bRun(dir, MK) {
  const M = meta(dir), { m, W, H } = MK, R = regionsOf(M, W, H), g = R.g, nf = M.nf;
  const NP = load(join(dir, "np.png"));
  const imgs = [];
  for (let k = 0; k < nf; k++) imgs.push(load(join(dir, `L0_t${k}.png`)));
  const fr = [];
  for (let k = 0; k < nf; k++) {
    const A = imgs[k], B = imgs[(k + 1) % nf];
    let am = 0;
    const web = {};
    for (let p = 0; p < W * H; p++) {
      if (!m[p]) continue;
      const i = p * 3;
      const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]));
      const j = R.webOf[p];
      if (j >= 0) { if (!(d <= (web[j] ?? -1))) web[j] = d; }
      else if (!R.zone[p] && d > am) am = d;
    }
    fr.push({ arms: am, web });
  }
  const out = {};
  for (const j of R.webs) {
    const rec = M.recs.find((r) => r.ji === j), [cx, cy] = cen(M, rec);
    const per = imgs.map((I) => {
      let e = 0, sx = 0, sy = 0;
      for (let y = Math.max(0, Math.floor(cy - g.rWeb)); y < Math.min(H, cy + g.rWeb); y++)
        for (let x = Math.max(0, Math.floor(cx - g.rWeb)); x < Math.min(W, cx + g.rWeb); x++) {
          const p = y * W + x;
          if (!m[p] || R.webOf[p] !== j) continue;
          const v = dmax(px(I, x, y), px(NP, x, y));
          e += v; sx += v * x; sy += v * y;
        }
      return { e, x: e ? sx / e : cx, y: e ? sy / e : cy };
    });
    const eMax = Math.max(...per.map((q) => q.e));
    let jump = 0, kj = -1;
    for (let k = 0; k < nf; k++) {
      const a = per[k], b = per[(k + 1) % nf];
      if (a.e < 0.25 * eMax || b.e < 0.25 * eMax) continue;
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d > jump) { jump = d; kj = k; }
    }
    let fail = 0, wmax = 0, amax = 0;
    for (const f of fr) { const w = f.web[j] ?? 0; if (w > f.arms + 4) fail++; wmax = Math.max(wmax, w); amax = Math.max(amax, f.arms); }
    out[j] = { fail, wmax, amax, jump, kj, eMax };
  }
  return { webs: R.webs, out, crest: (M.spacing / nf) * g.pxw, nf };
}

if (CMD === "a") {
  const [dirMa, dirBr] = args, MK = maskOf(dirBr);
  const resMa = aRun(dirMa, MK), resBr = aRun(dirBr, MK);
  console.log(`(a) light = L0 - np, threshold = pure's own step per web (max / p99.5); ${resBr.webs.length} webs in view; arms (outside every zone) worst max/p99.5: master ${resMa.arms.max}/${resMa.arms.p}, branch ${resBr.arms.max}/${resBr.arms.p}`);
  let worse = 0, better = 0;
  const rows = [];
  for (const j of resBr.webs) {
    const s = resBr.seam[j] || { max: 0, p: 0 }, a = resMa.web[j] || { max: 0, p: 0, over: 0 }, b = resBr.web[j] || { max: 0, p: 0, over: 0 };
    const d = Math.max(b.max - a.max, b.p - a.p);
    if (d > 2) worse++;
    if (Math.min(b.max - a.max, b.p - a.p) < -2) better++;
    if (a.max !== b.max || a.p !== b.p || a.over !== b.over) rows.push(`  ji ${j}: seam ${s.max}/${s.p}; master ${a.max}/${a.p} (frames over the seam ${a.over}/${resMa.nf}); branch ${b.max}/${b.p} (${b.over}/${resBr.nf})${d > 2 ? "  <- branch higher" : ""}`);
  }
  const overMa = resBr.webs.filter((j) => (resMa.web[j]?.over || 0) > 0).length, overBr = resBr.webs.filter((j) => (resBr.web[j]?.over || 0) > 0).length;
  console.log(`  webs whose light steps exceed the seam in some frame: master ${overMa}, branch ${overBr}; webs where master and branch differ: ${rows.length}; branch higher by > 2: ${worse}; lower by > 2: ${better}`);
  for (const l of rows) console.log(l);
}

if (CMD === "b") {
  const [dirMa, dirBr] = args, MK = maskOf(dirBr);
  const resMa = bRun(dirMa, MK), resBr = bRun(dirBr, MK);
  console.log(`(b) ${resBr.webs.length} webs in view; the crest moves ${resBr.crest.toFixed(1)} px a frame`);
  let jm = 0, jb = 0, newJ = 0;
  const rows = [];
  for (const j of resBr.webs) {
    const a = resMa.out[j], b = resBr.out[j];
    if (a.jump > resBr.crest) jm++;
    if (b.jump > resBr.crest) jb++;
    if (b.jump > resBr.crest && b.jump > a.jump + 1) newJ++;
    if (a.fail !== b.fail || Math.abs(a.jump - b.jump) > 0.5 || a.wmax !== b.wmax) rows.push(`  ji ${j}: frames failing master ${a.fail}/${resMa.nf} branch ${b.fail}/${resBr.nf}; web max ${a.wmax} -> ${b.wmax} (arms max ${b.amax}); centroid's largest step ${a.jump.toFixed(1)} (k ${a.kj}) -> ${b.jump.toFixed(1)} (k ${b.kj})${b.jump > resBr.crest && b.jump > a.jump + 1 ? "  <- new jump" : ""}`);
  }
  console.log(`  webs with a centroid step over the crest's: master ${jm}, branch ${jb}; branch-only (over the crest and > master + 1 px): ${newJ}; webs that differ: ${rows.length}`);
  for (const l of rows) console.log(l);
}

// K1211 S4 (task 2 and task 4's step check): the light's largest step over
// 3 device px. light = L0_t<k> - np (signed, per channel). At p, for each
// direction (3,0) (0,3) (2,2) (2,-2), with p, the pixels between and the
// end all in the eroded material mask, step = the max channel |light(end) -
// light(p)|. A pair where np itself steps by more than TB (a base edge: the
// gold's edge, a crossing gap's fade, a section edge) is left out. The bar:
// the largest step on plain arms (outside every junction zone), all moments.
// Inside each web disc (rWeb) the largest step per moment, where it sits
// (r in fh, the angle in degrees, y down) and the light's energy there.
//   node checks4.mjs step3 <dir> [look=0] [ji,ji,...] [cropDir]
// cropDir: per listed ji and moment, <cropDir>/s3_<ji>_t<k>.png = shot |
// light (x2, + 128) | step map (x4), 3x, the largest step ringed.
const TB = 12;
const DIRS3 = [[3, 0], [0, 3], [2, 2], [2, -2]];
function step3Of(I, NP, m, W, H) {
  const s = new Uint16Array(W * H), at = new Int8Array(W * H).fill(-1);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (!m[p]) continue;
    let mx = 0, di = -1;
    DIRS3.forEach(([dx, dy], d) => {
      const n = Math.max(Math.abs(dx), Math.abs(dy));
      const ex = x + dx, ey = y + dy;
      if (ex < 0 || ey < 0 || ex >= W || ey >= H) return;
      for (let t = 1; t <= n; t++) if (!m[(y + (dy / n) * t) * W + x + (dx / n) * t]) return;
      const q = ey * W + ex;
      let base = 0, st = 0;
      for (let c = 0; c < 3; c++) {
        base = Math.max(base, Math.abs(NP.data[q * 3 + c] - NP.data[p * 3 + c]));
        const lp = I.data[p * 3 + c] - NP.data[p * 3 + c], lq = I.data[q * 3 + c] - NP.data[q * 3 + c];
        st = Math.max(st, Math.abs(lq - lp));
      }
      if (base > TB) return;
      if (st > mx) { mx = st; di = d; }
    });
    s[p] = mx; at[p] = di;
  }
  return { s, at };
}
function step3Run(dir, look, jis, cropDir) {
  const M = meta(dir), MK = maskOf(dir), { m, W, H } = MK, R = regionsOf(M, W, H), g = R.g;
  const NP = load(join(dir, "np.png"));
  const out = { bar: { max: 0, k: -1, x: 0, y: 0, p999: 0 }, web: {} };
  const want = jis ? new Set(jis) : null;
  for (let k = 0; k < M.nf; k++) {
    const I = load(join(dir, `L${look}_t${k}.png`));
    const { s } = step3Of(I, NP, m, W, H);
    const hA = new Uint32Array(512);
    const wk = {};
    for (let p = 0; p < W * H; p++) {
      if (!m[p]) continue;
      const j = R.webOf[p];
      if (j >= 0) {
        const e = (wk[j] ??= { max: 0, x: 0, y: 0, en: 0 });
        if (s[p] > e.max) { e.max = s[p]; e.x = p % W; e.y = (p / W) | 0; }
        const i = p * 3;
        e.en += Math.max(0, Math.max(I.data[i] - NP.data[i], I.data[i + 1] - NP.data[i + 1], I.data[i + 2] - NP.data[i + 2]));
      } else if (!R.zone[p]) {
        hA[Math.min(511, s[p])]++;
        if (s[p] > out.bar.max) Object.assign(out.bar, { max: s[p], k, x: p % W, y: (p / W) | 0 });
      }
    }
    out.bar.p999 = Math.max(out.bar.p999, pctOf(hA, 0.999));
    for (const [j, e] of Object.entries(wk)) {
      const rec = M.recs.find((r) => r.ji === Number(j)), [cx, cy] = cen(M, rec);
      const w = (out.web[j] ??= []);
      w[k] = { max: e.max, r: +(Math.hypot(e.x + 0.5 - cx, e.y + 0.5 - cy) / g.fhPx).toFixed(2), ang: Math.round((Math.atan2(e.y + 0.5 - cy, e.x + 0.5 - cx) * 180) / Math.PI), x: e.x, y: e.y, en: Math.round(e.en / 1000) };
    }
    if (cropDir && want) {
      mkdirSync(cropDir, { recursive: true });
      for (const j of want) {
        const rec = M.recs.find((r) => r.ji === j);
        if (!rec || !out.web[j]?.[k]) continue;
        const [cx, cy] = cen(M, rec), S = Math.ceil(2 * g.rWeb + 16), Z = 3, CW = S * Z, G = 6;
        const SW = 3 * CW + 4 * G, SH = CW + 2 * G, data = Buffer.alloc(SW * SH * 3, 40);
        const x0 = Math.round(cx - S / 2), y0 = Math.round(cy - S / 2), e = out.web[j][k];
        for (let yy = 0; yy < CW; yy++) for (let xx = 0; xx < CW; xx++) {
          const sx = x0 + Math.floor(xx / Z), sy = y0 + Math.floor(yy / Z);
          if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
          const p = sy * W + sx, i = p * 3;
          const ring = Math.abs(Math.hypot(sx - e.x, sy - e.y) - 4) < 0.6;
          for (let pan = 0; pan < 3; pan++) {
            const o = ((G + yy) * SW + G + pan * (CW + G) + xx) * 3;
            for (let c = 0; c < 3; c++) {
              let v;
              if (pan === 0) v = I.data[i + c];
              else if (pan === 1) v = 128 + 2 * (I.data[i + c] - NP.data[i + c]);
              else v = m[p] ? 4 * s[p] : 20;
              data[o + c] = Math.max(0, Math.min(255, v));
            }
            if (ring) { data[o] = 255; data[o + 1] = 0; data[o + 2] = 255; }
          }
        }
        writeFileSync(join(cropDir, `s3_${j}_t${k}.png`), encodePNG({ W: SW, H: SH, data }));
      }
    }
  }
  return out;
}
if (CMD === "step3") {
  const [dir, lookArg = "0", jiArg = "", cropDir = ""] = args;
  const jis = jiArg ? jiArg.split(",").map(Number) : null;
  const res = step3Run(dir, Number(lookArg), jis, cropDir || null);
  const M = meta(dir), g = geom(M);
  console.log(`step3 ${dir} look ${lookArg}: fh ${g.fhPx.toFixed(1)} px; the bar (plain arms, all moments): max ${res.bar.max} (k ${res.bar.k} at ${res.bar.x},${res.bar.y}), p99.9 ${res.bar.p999}`);
  const list = jis || Object.keys(res.web).map(Number);
  for (const j of list) {
    const w = res.web[j];
    if (!w) { console.log(`  ji ${j}: not in view`); continue; }
    const worst = w.reduce((a, b) => (b && b.max > a.max ? b : a), { max: -1 });
    console.log(`  ji ${j}: largest ${worst.max} (${(worst.max / Math.max(1, res.bar.max)).toFixed(2)}x the bar) | per k: ${w.map((e, k) => (e ? `k${k} ${e.max}@r${e.r},${e.ang}deg en${e.en}` : `k${k} -`)).join("; ")}`);
  }
  if (cropDir) writeFileSync(join(cropDir, `step3_L${lookArg}.json`), JSON.stringify(res));
}