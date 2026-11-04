// K1139 mock-ups of looks A (the light splits along the paths) and C (the
// junction flashes) at one junction, drawn over the S2 frames of strips.mjs
// (K1139_INJECT=fixed), so everything outside the junction is real:
//   node mock.mjs <A|C|debug> <standDir> <stand> <parentEdge> <childEdges,> <cxCss> <cyCss> <cssSize> <outPrefix> [frames=2,3,4,5,6,7]
// J is the parent's far end (its armPts' last point). The junction's web is
// where the no-pulse frame _b differs from the no-pulse, no-web frame _bw.
// Inside radius R (the web's extent around J) every thread pixel is redrawn
// from _b and whitened by the look's own field, the way kComposePaint
// whitens a band: pixel = b + g * v * (255 - b), with g fitted by least
// squares on the arms' pixels in the ring R..R+0.5 world, where the S2
// field v (kymo.mjs's pulseV, the CPU mirror) is known and the frame is real.
//   A: one band per child, a quadratic Bezier from the parent's point at
//      radius R through control J to the child's point at radius R (a
//      stand-in for K81's route band), crest at the band's own distance,
//      rescaled so both ends meet the arms' distances. The web between the
//      bands keeps the no-pulse look.
//   C: the parent's crest fades over 0.45 world before the web, the web
//      flashes with the crest's value at J, the children's crests fade in
//      over 0.45 after it.
// Writes <outPrefix>_t<k>.png (crops, cssSize at dsf 1.5) per frame.
import { readFileSync, writeFileSync } from "node:fs";
import { decodePNG, encodePNG, toRGB } from "./png.mjs";
import { uniforms, pulseV } from "./kymo.mjs";

const [, , LOOK, DIR, STAND, PE, CES, CX, CY, CSZ, OUTP, FR = "2,3,4,5,6,7"] = process.argv;
const j = JSON.parse(readFileSync(`${DIR}/${STAND}.json`, "utf8"));
const load = (f) => toRGB(decodePNG(readFileSync(`${DIR}/${STAND}_${f}.png`)));
const B = load("t0_b"), BW = load("t0_bw");
const W = B.W, H = B.H, DSF = 1.5, PXW = j.scale * DSF; // device px per world
const toPx = (p) => [(p.x - j.clip.x) * DSF, (p.y - j.clip.y) * DSF];
const item = (e) => j.decl.pulses.find((p) => p.edge === e);
const arm = (e) => {
  const it = item(e), pts = j.armPts.find((a) => a.edge === e).pts.map(toPx);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { e, it, pts, cum, len: cum[cum.length - 1] };
};
const parent = arm(Number(PE)), kids = CES.split(",").map((s) => arm(Number(s)));
const J = parent.pts[parent.pts.length - 1];
// Nearest point on a polyline: [lateral px, arc px from pts[0]].
function near(poly, cum, x, y) {
  let best = 1e9, at = 0;
  for (let i = 1; i < poly.length; i++) {
    const [ax, ay] = poly[i - 1], [bx, by] = poly[i];
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
    const px = ax + t * dx - x, py = ay + t * dy - y, d2 = px * px + py * py;
    if (d2 < best) { best = d2; at = cum[i - 1] + t * (cum[i] - cum[i - 1]); }
  }
  return [Math.sqrt(best), at];
}
// The arm's world distance at polyline arc s: d = (s / len) * span.
const dOf = (a, s) => (s / a.len) * a.it.world;
const HW = (j.params.threadWidth / 2) * PXW; // ribbon half-width, device px
const rJ = (x, y) => Math.hypot(x - J[0], y - J[1]);
const webAt = (o) => Math.abs(B.data[o] - BW.data[o]) + Math.abs(B.data[o + 1] - BW.data[o + 1]) + Math.abs(B.data[o + 2] - BW.data[o + 2]) > 24;
// R: the web's extent around J (98th percentile of web pixels within 1.5 world), plus 2 px.
const rs = [];
for (let y = Math.max(0, Math.floor(J[1] - 1.5 * PXW)); y < Math.min(H, J[1] + 1.5 * PXW); y++)
  for (let x = Math.max(0, Math.floor(J[0] - 1.5 * PXW)); x < Math.min(W, J[0] + 1.5 * PXW); x++) {
    const r = rJ(x, y);
    if (r < 1.5 * PXW && webAt((y * W + x) * 3)) rs.push(r);
  }
rs.sort((a, b) => a - b);
const pct = (q) => rs[Math.floor(rs.length * q)];
console.log(`web px within 1.5 world: ${rs.length}; r at 25/50/75/90/98%: ${[0.25, 0.5, 0.75, 0.9, 0.98].map((q) => (pct(q) / PXW).toFixed(2)).join(" ")} world`);
const R = Number(process.env.K1139_R || 0) * PXW || rs.filter((r) => r < 0.9 * PXW).at(Math.floor(rs.filter((r) => r < 0.9 * PXW).length * 0.98)) + 2;
// The arms' points at radius R from J (walking out from J's end).
function atRadius(a) {
  const fromJ = a === parent; // the parent's J end is its last point
  const idx = [...a.pts.keys()];
  if (fromJ) idx.reverse();
  for (let k = 1; k < idx.length; k++) {
    const p0 = a.pts[idx[k - 1]], p1 = a.pts[idx[k]];
    const r0 = rJ(...p0), r1 = rJ(...p1);
    if (r0 <= R && r1 >= R) {
      const t = (R - r0) / (r1 - r0 || 1e-9);
      const s = a.cum[idx[k - 1]] + t * (a.cum[idx[k]] - a.cum[idx[k - 1]]);
      return { p: [p0[0] + t * (p1[0] - p0[0]), p0[1] + t * (p1[1] - p0[1])], s };
    }
  }
  throw new Error(`e${a.e}: never reaches radius ${R.toFixed(1)}`);
}
const E = atRadius(parent);
const dGE = (parent.it.dist0 || 0) + dOf(parent, E.s);
const bands = kids.map((c) => {
  const X = atRadius(c);
  const dGX = (c.it.dist0 || 0) + dOf(c, X.s);
  const poly = [], cum = [0];
  for (let i = 0; i <= 64; i++) {
    const t = i / 64, u = 1 - t;
    poly.push([u * u * E.p[0] + 2 * t * u * J[0] + t * t * X.p[0], u * u * E.p[1] + 2 * t * u * J[1] + t * t * X.p[1]]);
    if (i) cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  }
  return { c, X, dGX, poly, cum, len: cum[64] };
});
console.log(`J (${J[0].toFixed(1)},${J[1].toFixed(1)}) R ${R.toFixed(1)} px = ${(R / PXW).toFixed(3)} world, HW ${HW.toFixed(1)} px, dG at entry ${dGE.toFixed(3)}; bands: ${bands.map((b) => `e${b.c.e} dG ${dGE.toFixed(3)}->${b.dGX.toFixed(3)} over ${(b.len / PXW).toFixed(3)} world`).join("; ")}`);

const sp = j.decl.spacing, reach = j.decl.reach, per = j.period;
const tOf = (k) => 100 + (k * per) / 8;
const RC = LOOK === "C" ? R + 0.6 * PXW : R; // C's fades reach outside the web
const S = Number(CSZ) * DSF, x0 = Math.round((Number(CX) - Number(CSZ) / 2) * DSF), y0 = Math.round((Number(CY) - Number(CSZ) / 2) * DSF);
// Per pixel of the crop: material (web or on one of J's arms), nearest arm.
// A thread pixel of J's arms is one the S2 frames whiten at some clock time
// (all 8 frames of the period): that drops pixels another ribbon covers (the
// gold path crosses over e150 near J in `cross`).
const NF = {};
for (let k = 0; k < 8; k++) NF[k] = load(`t${k}_n`);
const px = [];
for (let y = y0; y < y0 + S; y++) for (let x = x0; x < x0 + S; x++) {
  const r = rJ(x, y), o = (y * W + x) * 3;
  if (r > Math.max(RC, R + 0.5 * PXW) + 4) { px.push(null); continue; }
  let bestA = null, lat = 1e9, s = 0;
  for (const a of [parent, ...kids]) { const [l, at] = near(a.pts, a.cum, x, y); if (l < lat) { lat = l; bestA = a; s = at; } }
  let mx = 0;
  for (let k = 0; k < 8; k++) { const n = NF[k].data, d = n[o] - B.data[o] + n[o + 1] - B.data[o + 1] + n[o + 2] - B.data[o + 2]; if (d > mx) mx = d; }
  const web = webAt(o) && r < R + 4;
  const onArm = lat < HW * 0.97 && mx > 24;
  if (!web && !onArm) { px.push(null); continue; }
  const bl = bands.map((b) => near(b.poly, b.cum, x, y));
  px.push({ x, y, o, r, web, arm: onArm ? bestA : null, s, lat, bl });
}

// g: least squares on arm pixels in the ring R..R+0.5 world, every frame.
const frames = FR.split(",").map(Number);
let num = 0, den = 0; const ratios = [];
for (let k = 0; k < 8; k++) {
  const n = NF[k], U = uniforms(tOf(k), sp, reach);
  for (const p of px) {
    if (!p || p.web || !p.arm || p.r < R + 3 || p.r > R + 0.5 * PXW || p.lat > HW * 0.7) continue;
    const a = p.arm, v = pulseV(U, dOf(a, p.s), a.it.world, a.it.inward, a.it.dist0 || 0, a.it.cont);
    if (v < 0.1) continue;
    for (let c = 0; c < 3; c++) { const q = v * (255 - B.data[p.o + c]); num += q * (n.data[p.o + c] - B.data[p.o + c]); den += q * q; if (v > 0.6 && q > 20) ratios.push((n.data[p.o + c] - B.data[p.o + c]) / q); }
  }
}
// Phase-free gain: per arm pixel in the ring, the period's largest whitening
// over the period's largest mirror value (8 frames: a crest's peak is never
// more than 0.16 world from a sample).
const pk = [];
for (const a of [parent, ...kids]) for (let i = 0; i < a.pts.length; i++) {
  const [X, Y] = a.pts[i].map(Math.round), d = dOf(a, a.cum[i]), dG = (a.it.dist0 || 0) + d;
  if (rJ(X, Y) < R + 5 || dG < 0.6 || X < 0 || Y < 0 || X >= W || Y >= H) continue;
  const o = (Y * W + X) * 3;
  let mw = 0, mv = 0;
  for (let k = 0; k < 8; k++) {
    const U = uniforms(tOf(k), sp, reach);
    mv = Math.max(mv, pulseV(U, d, a.it.world, a.it.inward, a.it.dist0 || 0, a.it.cont));
    for (let c = 0; c < 3; c++) if (255 - B.data[o + c] > 40) mw = Math.max(mw, (NF[k].data[o + c] - B.data[o + c]) / (255 - B.data[o + c]));
  }
  if (mv > 0.5 && mw > 0.03) pk.push(mw / mv);
}
pk.sort((a, b) => a - b);
console.log(`phase-free gain: median ${pk[Math.floor(pk.length / 2)]?.toFixed(3)} over ${pk.length} px (25/75%: ${pk[Math.floor(pk.length / 4)]?.toFixed(3)} ${pk[Math.floor(pk.length * 0.75)]?.toFixed(3)})`);
// The gain is kComposePaint's K_BAND (the paint whitens by K_BAND * v);
// the fits above are printed as checks (the ring is mostly covered or past the reach in `cross`).
if (!process.env.K1139_G) process.env.K1139_G = String((0.94 * 110) / 111);
ratios.sort((a, b) => a - b);
const gMed = ratios[Math.floor(ratios.length / 2)], g = Number(process.env.K1139_G || 0) || gMed;
console.log(`fit: least squares ${(num / den).toFixed(3)}, median ratio at v > 0.6 ${gMed?.toFixed(3)} (n ${ratios.length}), 90th ${ratios[Math.floor(ratios.length * 0.9)]?.toFixed(3)}; using ${g.toFixed(3)}`);
console.log(`g ${g.toFixed(3)} (K_BAND 0.932)`);

const foot = (lat) => Math.max(0, Math.min(1, (HW - lat) / 2 + 0.5));
for (const k of frames) {
  const n = NF[k], U = uniforms(tOf(k), sp, reach);
  const out = Buffer.alloc(S * S * 3);
  for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) {
    const i = yy * S + xx, p = px[i], so = ((y0 + yy) * W + (x0 + xx)) * 3;
    let col = [n.data[so], n.data[so + 1], n.data[so + 2]];
    if (p && LOOK !== "debug") {
      let v = 0, w = 1; // w: weight of the mock against the real frame
      if (LOOK === "A") {
        for (const [bi, b] of bands.entries()) {
          const [lat, s] = p.bl[bi];
          v = Math.max(v, foot(lat) * pulseV(U, (s / b.len) * (b.dGX - dGE), 1e9, false, dGE, true));
        }
        w = Math.max(0, Math.min(1, (R + 3 - p.r) / 6)); // feather into the real arms
      } else {
        // The node's flash: the crest's value at J, soft at the rim (full to
        // 0.45 R, gone by 1.2 R), and the arms' own S2 light ramping in past R.
        const sm = (x) => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); };
        const flash = pulseV(U, 0, 1e9, false, bands[0].c.it.dist0 || 0, true) * (1 - sm((p.r - 0.45 * R) / (0.75 * R)));
        let vArm = 0;
        if (p.arm && p.r >= R) {
          const a = p.arm, d = dOf(a, p.s);
          const vS2 = pulseV(U, d, a.it.world, a.it.inward, a.it.dist0 || 0, a.it.cont);
          const gap = a === parent ? dOf(a, E.s) - d : d - dOf(a, bands.find((b) => b.c === a).X.s);
          vArm = vS2 * Math.max(0, Math.min(1, gap / 0.45));
        }
        v = Math.max(flash, vArm);
        w = Math.max(0, Math.min(1, (RC + 3 - p.r) / 6));
      }
      for (let c = 0; c < 3; c++) {
        const b = B.data[p.o + c], m = b + g * v * (255 - b);
        col[c] = Math.round(m * w + n.data[so + c] * (1 - w));
      }
    } else if (p && LOOK === "debug") {
      if (p.web) col = [col[0] * 0.5 + 120, col[1] * 0.5, col[2] * 0.5];
      for (const [bi, b] of bands.entries()) if (p.bl[bi][0] < 1.2) col = bi ? [255, 0, 255] : [255, 255, 0];
    }
    if (LOOK === "debug") {
      const X = x0 + xx, Y = y0 + yy;
      if (Math.abs(rJ(X, Y) - R) < 0.7) col = [255, 255, 255];
      for (const a of [parent, ...kids]) if (near(a.pts, a.cum, X, Y)[0] < 1) col = a === parent ? [255, 60, 60] : [60, 160, 255];
    }
    out[i * 3] = col[0]; out[i * 3 + 1] = col[1]; out[i * 3 + 2] = col[2];
  }
  writeFileSync(`${OUTP}_t${k}.png`, encodePNG({ W: S, H: S, data: out }));
  if (LOOK === "debug") break;
}
console.log(`${OUTP}_t*.png ${S}x${S}`);
