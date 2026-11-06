// K1218 S7: sweptArc offline, over a stand's dumped records (dump_s7.mjs),
// so a variant's arcs can be checked for continuity at every junction
// without a browser. It mirrors junctionBase's bracketing (arms A and B by
// the profile angle at the pixel's radius, the edge-aware blend t) and
// FIELD_GLSL's sweptArc (joinery.ts's CPU mirror), one variant per name:
//   s6    S6's rule: the nearest sweep wins (626a5a21)
//   soft  S7's rule (VARIANT env picks; default soft)
// Modes:
//   node tie_s7.mjs col  <records.json> <ji> <x> <y0> <y1>   one column, every arm in the window
//   node tie_s7.mjs scan <records.json> [ji|all] [x0,y0,x1,y1]
//     per junction: the largest arc jump between 4-neighbour device pixels,
//     weighted by the arm's share of the blend (min of the two pixels'),
//     beyond NAT (natural gradient allowance, default 0.03 world arc)
//   node tie_s7.mjs png  <records.json> <ji> <x0,y0,x1,y1> <out.png> [zoom]
//     the arm-weighted arc jump map (white = jump >= 0.1) beside the arcs
// Env: VARIANT (s6|soft), TAU, CEPS, CUT0, NAT, RSCAN (world radius of a scan).
import { readFileSync, writeFileSync } from "node:fs";
import { writePng } from "../s5/png.mjs";

const [, , MODE, FILE, ...ARGS] = process.argv;
const D = JSON.parse(readFileSync(FILE, "utf8"));
const J = D.J;
const fh = D.fh;
const DR = D.DR;
const profN = D.profN;
const last = profN - 1;
const stride = 2 + profN;
const FLO = D.FLO;
const FHI = D.FHI;
const BMIN = D.BMIN;
const VARIANT = process.env.VARIANT || "soft";
const TAU = Number(process.env.TAU || 0.02);
const CEPS = Number(process.env.CEPS || 0.2);
const CUT0 = Number(process.env.CUT0 || 1.5);
const NAT = Number(process.env.NAT || 0.03);
const RSCAN = Number(process.env.RSCAN || 0.75);
const TAU2 = Math.PI * 2;
const HALF_PI = Math.PI / 2;
const at = (i) => i * 4;
const A = D.aff;
const toWorld = (dx, dy) => {
  const sx = dx / D.dsf, sy = dy / D.dsf;
  return [A.w0x + A.ax * sx + A.bx * sy, A.w0y + A.ay * sx + A.by * sy];
};
const det = A.ax * A.by - A.bx * A.ay;
const toDevice = (x, y) => {
  const dx = x - A.w0x, dy = y - A.w0y;
  return [D.dsf * (A.by * dx - A.bx * dy) / det, D.dsf * (-A.ay * dx + A.ax * dy) / det];
};
const smooth = (lo, hi, x) => {
  let t = (x - lo) / (hi - lo);
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
};
const profArc = (ab, rp) => {
  const xg = rp / DR;
  if (xg >= last) return J[at(ab + 2 + last) + 1] + (rp - last * DR);
  const i = Math.floor(xg);
  const t = at(ab + 2 + i);
  return J[t + 1] + (J[t + 3] - J[t + 1]) * (xg - i);
};
const P = (ab, g) => {
  const t = at(ab + 2 + g);
  return [g * DR * Math.cos(J[t]), g * DR * Math.sin(J[t]), J[t + 1]];
};
const N = (x, y) => {
  const l = Math.sqrt(x * x + y * y);
  return [x / l, y / l];
};
const cross = (ax, ay, bx, by) => ax * by - ay * bx;

// Every candidate the S6 search sees: [l, arc, fold (signed l), c, g, u].
// c = the map's Jacobian over |dd| |n(u)|: 1 on the curve, 0 at a caustic
// (where a root pair is born), < 0 folded (a local maximum of distance).
function candidates(ab, ex, ey) {
  const rho = Math.sqrt(ex * ex + ey * ey);
  const reach = 2 * fh;
  let g = Math.min(Math.max(Math.trunc((rho - reach) / DR), 0), last - 1);
  const g1 = Math.min(Math.max(Math.trunc((rho + reach) / DR) + 2, 1), last);
  let a = P(ab, Math.max(g - 1, 0)), b = P(ab, g), c = P(ab, g + 1);
  let tb = N(c[0] - b[0], c[1] - b[1]);
  let kb = 0;
  if (g > 0) {
    const t0 = N(b[0] - a[0], b[1] - a[1]);
    kb = (2 * cross(t0[0], t0[1], tb[0], tb[1])) / (Math.hypot(b[0] - a[0], b[1] - a[1]) + Math.hypot(c[0] - b[0], c[1] - b[1]));
    tb = N(tb[0] + t0[0], tb[1] + t0[1]);
  }
  const out = [];
  let kr = 0;
  if (g === 0 && ex * tb[0] + ey * tb[1] < 0) out.push([rho, b[2], 0, 1, -1, 0]);
  for (let k = 0; k < 40 && g < g1; k++, g++) {
    const ddx = c[0] - b[0], ddy = c[1] - b[1];
    let tc = N(ddx, ddy);
    let d = c;
    let kc = 0;
    if (g + 2 <= last) {
      d = P(ab, g + 2);
      const de = N(d[0] - c[0], d[1] - c[1]);
      kc = (2 * cross(tc[0], tc[1], de[0], de[1])) / (Math.hypot(ddx, ddy) + Math.hypot(d[0] - c[0], d[1] - c[1]));
      tc = N(tc[0] + de[0], tc[1] + de[1]);
    }
    const n0x = -tb[1], n0y = tb[0];
    const dnx = -tc[1] - n0x, dny = tc[0] - n0y;
    const qx = ex - b[0], qy = ey - b[1];
    const qa = -cross(ddx, ddy, dnx, dny);
    const qb = cross(qx, qy, dnx, dny) - cross(ddx, ddy, n0x, n0y);
    const qc = cross(qx, qy, n0x, n0y);
    const disc = qb * qb - 4 * qa * qc;
    if (disc >= 0) {
      const h = -0.5 * (qb + (qb < 0 ? -Math.sqrt(disc) : Math.sqrt(disc)));
      const us = [Math.abs(qa) > 1e-12 ? h / qa : -1, Math.abs(h) > 1e-12 ? qc / h : -1];
      for (const u of us) {
        if (!(u >= 0 && u <= 1)) continue;
        const lx = qx - u * ddx, ly = qy - u * ddy;
        const l = Math.hypot(lx, ly);
        const nx = n0x + u * dnx, ny = n0y + u * dny;
        const cj = -(qb + 2 * qa * u) / (Math.hypot(ddx, ddy) * Math.hypot(nx, ny));
        out.push([l, b[2] + (c[2] - b[2]) * u, Math.sign(cross(ddx, ddy, lx, ly)) * l, cj, g, u]);
      }
    }
    const fr = rho - g * DR;
    if (fr >= 0 && fr < DR) kr = kb + (kc - kb) * (fr / DR);
    b = c; c = d; tb = tc; kb = kc;
  }
  return { out, kr, rho };
}

function swept(ab, ex, ey, rp, V = VARIANT) {
  const proj = profArc(ab, rp);
  const { out, kr } = candidates(ab, ex, ey);
  if (V === "s6") {
    let best = 1e9, arc = proj, fold = 0, win = null;
    for (const cd of out) if (cd[0] < best) { best = cd[0]; arc = cd[1]; fold = cd[2]; win = cd; }
    const w = smooth(fh, 2 * fh, best);
    const wf = smooth(FLO, FHI, fold * kr);
    const wt = 1 - (1 - w) * (1 - wf);
    return { arc: arc + (proj - arc) * wt, proj, best, swept: arc, wt, win, n: out.length };
  }
  // soft: every unfolded candidate weighs in by exp(-(l - lmin) / TAU), times
  // smoothstep(0, CEPS, c) (0 where a root pair is born, so it enters
  // continuously) and a cut from CUT0 fh to 2 fh (the search window holds
  // every root nearer than 2 fh, so a root beyond never enters with weight).
  let lmin = 1e9;
  for (const cd of out) if (cd[0] < lmin) lmin = cd[0];
  let sw = 0, sa = 0, sf = 0;
  for (const cd of out) {
    const w = Math.exp(-(cd[0] - lmin) / TAU) * smooth(0, CEPS, cd[3]) * (1 - smooth(CUT0 * fh, 2 * fh, cd[0]));
    sw += w; sa += w * cd[1]; sf += w * cd[2];
  }
  const arc = sw > 0 ? sa / sw : proj;
  const fold = sw > 0 ? sf / sw : 0;
  const w = smooth(fh, 2 * fh, lmin);
  const wf = smooth(FLO, FHI, fold * kr);
  const wt = sw > 0 ? 1 - (1 - w) * (1 - wf) : 1;
  return { arc: arc + (proj - arc) * wt, proj, best: lmin, swept: arc, wt, n: out.length, sw };
}

// junctionBase's bracketing: the arms around the pixel and the blend t.
function bracket(rb, x, y) {
  const hd = at(rb);
  const n = Math.round(J[hd + 2]);
  const ex = x - J[hd], ey = y - J[hd + 1];
  const rho = Math.sqrt(ex * ex + ey * ey);
  const phi = Math.atan2(ey, ex);
  const gx = rho / DR;
  let gi, gf;
  if (gx >= last) { gi = last - 1; gf = 1; } else { gi = Math.floor(gx); gf = gx - gi; }
  let relA = 1e9, relB = 1e9, ia = 0, ib = 0;
  for (let i = 0; i < n; i++) {
    const t = at(rb + 2 + i * stride + 2 + gi);
    let ra = phi - (J[t] + (J[t + 2] - J[t]) * gf);
    ra -= TAU2 * Math.floor(ra / TAU2);
    const rbb = ra > 0 ? TAU2 - ra : 0;
    if (ra < relA) { relA = ra; ia = i; }
    if (rbb < relB) { relB = rbb; ib = i; }
  }
  let t = 0;
  if (ia !== ib) {
    const span = relA + relB;
    const hw = rho > fh ? Math.asin(fh / rho) : HALF_PI;
    let lo = hw, hi = span - hw;
    const minW = span * BMIN;
    if (hi - lo < minW) { lo = (span - minW) * 0.5; hi = lo + minW; }
    t = hi > lo ? (relA - lo) / (hi - lo) : relA < span * 0.5 ? 0 : 1;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    t = t * t * (3 - 2 * t);
  }
  return { n, ex, ey, rho, ia, ib, relA, relB, t };
}

// Per pixel: [{i, w, arc}] for the bracketing arms with a share > 0.
function pixelArms(rb, dx, dy, V) {
  const [x, y] = toWorld(dx + 0.5, dy + 0.5);
  const B = bracket(rb, x, y);
  const res = [];
  const one = (i, rel, w) => {
    if (w <= 0) return;
    const ab = rb + 2 + i * stride;
    const s = swept(ab, B.ex, B.ey, rel < HALF_PI ? B.rho * Math.cos(rel) : 0, V);
    res.push({ i, w, arc: s.arc, s });
  };
  if (B.ia === B.ib) one(B.ia, B.relA, 1);
  else { one(B.ia, B.relA, 1 - B.t); one(B.ib, B.relB, B.t); }
  return { B, res };
}

const recOf = (ji) => {
  const r = D.recs.find((q) => q.ji === ji);
  if (!r) throw new Error(`ji ${ji}?`);
  return r;
};

if (MODE === "col") {
  const ji = Number(ARGS[0]);
  const x = Number(ARGS[1]);
  const y0 = Number(ARGS[2]), y1 = Number(ARGS[3]);
  const r = recOf(ji);
  const n = Math.round(J[at(r.rb) + 2]);
  console.log(`ji ${ji} rb ${r.rb} n ${n} variant ${VARIANT} centre dev ${toDevice(r.c[0], r.c[1]).map((v) => v.toFixed(1))}`);
  for (let y = y0; y <= y1; y++) {
    const { B, res } = pixelArms(r.rb, x, y, VARIANT);
    const [wx, wy] = toWorld(x + 0.5, y + 0.5);
    const ex = wx - J[at(r.rb)], ey = wy - J[at(r.rb) + 1];
    const parts = [];
    for (let i = 0; i < n; i++) {
      const ab = r.rb + 2 + i * stride;
      const rel = i === B.ia ? B.relA : i === B.ib ? B.relB : null;
      const s = swept(ab, ex, ey, rel !== null && rel < HALF_PI ? B.rho * Math.cos(rel) : 0, VARIANT);
      const c = candidates(ab, ex, ey).out.map((q) => `${q[4] < 0 ? "j" : q[4]}:${q[0].toFixed(3)}/${q[1].toFixed(3)}/c${q[3].toFixed(2)}`).join(" ");
      const w = res.find((q) => q.i === i);
      parts.push(`  a${i}${w ? `(w${w.w.toFixed(2)})` : ""} arc ${s.arc.toFixed(4)} sw ${s.swept.toFixed(4)} pj ${s.proj.toFixed(4)} wt ${s.wt.toFixed(2)} | ${c}`);
    }
    console.log(`${x},${y} rho ${B.rho.toFixed(3)} A ${B.ia} B ${B.ib} t ${B.t.toFixed(3)}`);
    for (const p of parts) console.log(p);
  }
}

function jumpMap(r, x0, y0, x1, y1, V) {
  const W = x1 - x0 + 1, H = y1 - y0 + 1;
  const px = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px.push(pixelArms(r.rb, x, y, V).res);
  const jump = new Float64Array(W * H);
  const cmp = (a, b) => {
    let m = 0;
    for (const p of a) for (const q of b) if (p.i === q.i) m = Math.max(m, Math.min(p.w, q.w) * Math.max(0, Math.abs(p.arc - q.arc) - NAT));
    return m;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x;
    if (x + 1 < W) { const m = cmp(px[k], px[k + 1]); jump[k] = Math.max(jump[k], m); jump[k + 1] = Math.max(jump[k + 1], m); }
    if (y + 1 < H) { const m = cmp(px[k], px[k + W]); jump[k] = Math.max(jump[k], m); jump[k + W] = Math.max(jump[k + W], m); }
  }
  return { W, H, px, jump };
}

if (MODE === "scan") {
  const sel = ARGS[0] && ARGS[0] !== "all" ? Number(ARGS[0]) : null;
  const box = ARGS[1] ? ARGS[1].split(",").map(Number) : null;
  const rows = [];
  for (const r of D.recs) {
    if (sel !== null && r.ji !== sel) continue;
    const n = Math.round(J[at(r.rb) + 2]);
    if (n < 2) continue;
    const [cx, cy] = toDevice(r.c[0], r.c[1]);
    const R = RSCAN * D.dsf * Math.hypot(1 / Math.hypot(A.ax, A.ay), 0) ;
    let [x0, y0, x1, y1] = box || [Math.floor(cx - R), Math.floor(cy - R), Math.ceil(cx + R), Math.ceil(cy + R)];
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(2549, x1); y1 = Math.min(1424, y1);
    if (x1 <= x0 || y1 <= y0) continue;
    const { W, jump } = jumpMap(r, x0, y0, x1, y1, VARIANT);
    let m = 0, mk = -1, cnt = 0;
    for (let k = 0; k < jump.length; k++) {
      if (box === null) {
        const x = x0 + (k % W), y = y0 + Math.floor(k / W);
        if (Math.hypot(x - cx, y - cy) > R) continue;
      }
      if (jump[k] > 0.01) cnt++;
      if (jump[k] > m) { m = jump[k]; mk = k; }
    }
    rows.push({ ji: r.ji, n, cx: Math.round(cx), cy: Math.round(cy), max: m, at: mk < 0 ? null : [x0 + (mk % W), y0 + Math.floor(mk / W)], cnt });
  }
  rows.sort((p, q) => q.max - p.max);
  console.log(`variant ${VARIANT} TAU ${TAU} CEPS ${CEPS} CUT0 ${CUT0} NAT ${NAT}: ${rows.length} junctions, ${rows.filter((q) => q.max > 0.01).length} with a weighted jump > 0.01 beyond NAT`);
  for (const q of rows.slice(0, Number(process.env.TOP || 30))) console.log(`ji ${String(q.ji).padStart(3)} n ${q.n} c ${q.cx},${q.cy} max ${q.max.toFixed(4)} at ${q.at} px>0.01 ${q.cnt}`);
  if (process.env.OUTJSON) writeFileSync(process.env.OUTJSON, JSON.stringify(rows, null, 1));
}

if (MODE === "png") {
  const ji = Number(ARGS[0]);
  const [x0, y0, x1, y1] = ARGS[1].split(",").map(Number);
  const out = ARGS[2];
  const Z = Number(ARGS[3] || 4);
  const r = recOf(ji);
  const { W, H, px, jump } = jumpMap(r, x0, y0, x1, y1, VARIANT);
  // Left: each pixel's blended arc as a stripe pattern (arc mod 0.1 -> gray), right: the jump map.
  const OW = W * Z * 2 + 4, OH = H * Z;
  const img = new Uint8Array(OW * OH * 4).fill(255);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x;
    let s = 0, wsum = 0;
    for (const p of px[k]) { s += p.w * p.arc; wsum += p.w; }
    const a = wsum > 0 ? s / wsum : 0;
    const f = (((a / 0.1) % 1) + 1) % 1;
    const g = Math.round(255 * (0.5 + 0.5 * Math.cos(f * TAU2)));
    const j = Math.min(1, jump[k] / 0.1);
    for (let yy = 0; yy < Z; yy++) for (let xx = 0; xx < Z; xx++) {
      const o1 = ((y * Z + yy) * OW + x * Z + xx) * 4;
      img[o1] = g; img[o1 + 1] = g; img[o1 + 2] = g; img[o1 + 3] = 255;
      const o2 = ((y * Z + yy) * OW + W * Z + 4 + x * Z + xx) * 4;
      img[o2] = Math.round(255 * j); img[o2 + 1] = Math.round(255 * j * 0.6); img[o2 + 2] = 40; img[o2 + 3] = 255;
    }
  }
  writePng(out, OW, OH, img);
  console.log(`wrote ${out} ${OW}x${OH}`);
}
