// K1191 (Muse batch 22 Run F, 22F): model gk for ji 147 arm 1's bright
// GPU colours. Beside 19D's tools (unlit147.mjs / unlit147_detail.mjs,
// task3_unlit_arm.md), which stay as they are; reads Stage 4's x4 dump
// (read only, nothing under K1139 changes) and adds the one input 19D's
// composite cover model leaves out, at the same 276 pixel-phases
// (19D's arm-1 set: 36, 36, 36, 32, 32, 32, 36, 36 in phases 0 to 7).
// No page, no server, no GPU work: ports 5920-5929 unused, no perf lock.
//   node gk147.mjs <dumpDir>
//
// The rule, from this folder's cover_lib.mjs header exactly (the copy
// of .claude/probes/K1139/cover_lib.mjs 19D read):
//   "Per pixel and sample, the LAST covering primitive of the fillet
//    meshes in draw order wins (no blending at rest: aM = 1, gk = 1 and
//    lookA = 1 in the default look), and a fan triangle whose aLook,
//    interpolated at the PIXEL CENTRE (no centroid sampling), exceeds
//    1.001 discards the whole pixel ..., so it writes no sample there.
//    A cover strip is never discarded by its look. Kinds: 1 = this
//    record's fan, 2 = this record's cover strip, 3 = any other
//    record's primitive, 0 = nothing (the webs-off frame shows).
//    Not modelled: gk (a foreign over thread's silhouette discards a
//    fan fragment) and the fill rule's tie-break on an exact edge."
// So gk's rule is: a FOREIGN OVER thread's silhouette discards a fan
// fragment. The header leaves four things underdetermined, and the
// readings below supply each in the open:
//   (a) which threads are foreign and where their centrelines run -
//       the dump holds no gap-slot table, no SAMP centreline, no
//       per-triangle aMaskId (diag_s4.mjs's r<ji>.tri.bin carries
//       mesh, t, vertices, aLook, aRec only) and no slot strength;
//       the readings take the silhouette from the dump's own frames
//       instead (webs-off footprint, foreign material, debug-5).
//   (b) whole pixel or per sample - the aLook precedent in the same
//       header discards the WHOLE pixel; the per-sample variant is
//       tried too (at the dump's resolution it collapses to the
//       whole-pixel one, said below).
//   (c) binary discard or partial keep - the header says "discards",
//       so the dump readings are binary; a partial keep has no
//       fraction in the header and none in the dump, so it is only
//       fitted from the GPU's own lumas as a diagnostic upper bound
//       (fit-keep below), never as evidence for gk.
//   (d) what shows where a fragment is discarded - the composite's
//       kind-0 colour: the webs-off frame at that pixel (cover_lib's
//       composite() already colours kinds 0 and 3 that way; kinds 1
//       and 2 keep the fan / strip twin's out colour).
// Readings tried (silhouette source x discard, all binary but fit):
//   foot    silhouette = a ribbon footprint in the webs-off frame
//           (webs-off luma over 40; the backdrop reads ~15-25):
//           every fan/strip sample becomes the webs-off colour.
//           Widest reading: the dump cannot separate arm 1's own
//           ribbon from a foreign one in that frame, so this
//           discards under any ribbon, foreign or not.
//   debug   silhouette crossed only where the GPU's own debug-5
//           frame at the same pinned state (t<k>_d against
//           t<k>_dw) sits nearer the webs-off debug colour than the
//           fan's debug colour (0, twinG, 0): there the fan fragment
//           in fact wrote no sample in the debug capture.
//   for     foreign by material: at the quiet phase 3 (webs-off
//           debug G 0-16 at these pixels, no crest) the webs-off
//           RGB differs from the fan twin's out RGB by over 12
//           (0-255 Euclidean): there a thread of another material,
//           not arm 1's quiet base, is topmost in the webs-off
//           frame. Phase-independent (read at phase 3 for all).
//   fit     DIAGNOSTIC ONLY: per pixel the constant fraction toward
//           the webs-off colour that best fits the GPU's lumas over
//           that pixel's phases (least squares, clamped to [0, 1]).
//           Its counts are the most any per-pixel keep built from
//           the twin's colour and the webs-off colour can reach.
// Verdict rule (batch 22 Run F): gk explains the brightness only if
// the bright phases' within-2 counts (t0-t2, t6, t7) rise to their
// phases' pixel counts; anything less is "not found".
import { readFileSync } from "fs";
import { join } from "path";
import { coverage, composite, loadTwin, pickOrient } from "./cover_lib.mjs";

const DIR = process.argv[2];
if (!DIR) throw new Error("usage: node gk147.mjs <dumpDir>");
const meta = JSON.parse(readFileSync(join(DIR, "meta.json"), "utf8"));
const A = meta.aff;
const NB = 4, PB = 9, PX = NB * PB + 10;
const L = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const rc = meta.recs.find((r) => r.ji === 147);
const { w: BW, h: BH } = rc.box;
const n = BW * BH;
const used = new Set();
for (const b of rc.bands) { used.add(b.ia); used.add(b.ib); }
const unlit = rc.arms.map((a, i) => i).filter((i) => !used.has(i));
if (unlit.length !== 1 || unlit[0] !== 1) throw new Error(`unlit arms ${unlit}?`);
const a1 = rc.arms[1];
// Arm-1 pixel set, exactly unlit147.mjs's (ray of arm 1, 0.3..fanR
// along, within 0.8 fh of the ray); the counted subset per phase is
// composite()'s foot mask, as in 19D.
const armOf = new Int8Array(n).fill(-1);
const along = new Float32Array(n), perp = new Float32Array(n);
for (let Y = 0; Y < BH; Y++)
  for (let X = 0; X < BW; X++) {
    const sx = (rc.box.x + X + 0.5) / meta.dsf, sy = (rc.box.y + Y + 0.5) / meta.dsf;
    const px = A.ax + A.bx * sx + A.cx * sy, py = A.ay + A.by * sx + A.cy * sy;
    const i = Y * BW + X;
    const rx = px - rc.c[0], ry = py - rc.c[1];
    const t = rx * a1.dx + ry * a1.dy, pp = Math.abs(rx * a1.dy - ry * a1.dx);
    if (t >= 0.3 && t <= meta.fanR && pp <= 0.8 * meta.fh) { armOf[i] = 1; along[i] = t; perp[i] = pp; }
  }
const kinds = coverage(DIR, rc);
const po = pickOrient(DIR, meta, rc, kinds, [0, 1, 2, 3, 4, 5, 6, 7]);
console.log(`ji 147 arm 1 (chain ${a1.chain} slot ${a1.slot} dir ${a1.dir}), dump ${DIR}`);
console.log(`orientation ${po.or} (19D's pickOrient, means ${po.mean.map((v) => v.toFixed(2)).join(" / ")})`);

// Per phase, per counted pixel: the GPU, the composite without gk
// (recomputed per sample from cover_lib's kinds; checked against
// composite()'s own RGB), and the colours each reading needs.
const phases = [];
for (let k = 0; k < 8; k++) {
  const T = loadTwin(DIR, rc.ji, k);
  if (!T) throw new Error(`no twin for phase ${k}`);
  const C = composite(DIR, meta, rc, kinds, k, po.or, T);
  const rows = [];
  for (let Y = 0; Y < BH; Y++)
    for (let X = 0; X < BW; X++) {
      const i = Y * BW + X;
      if (!C.foot[i] || armOf[i] < 0) continue;
      const o = i * PX;
      const gpu = [0, 1, 2].map((c) => C.gpuN[i * 3 + c]);
      const web = [0, 1, 2].map((c) => C.at(C.gW, X, Y, c));
      const fan = [0, 1, 2].map((c) => T.u8[o + 42 + c]);
      const strip = [0, 1, 2].map((c) => (T.s ? T.s.u8 : T.u8)[o + 42 + c]);
      const sam = [0, 1, 2, 3].map((s) => kinds[(i * 4 + s) * 2 + po.or]);
      const without = [0, 1, 2].map((c) => sam.reduce((acc, kd, s) => acc + (kd === 1 ? fan[c] : kd === 2 ? strip[c] : web[c]), 0) / 4);
      const dbg = [0, 1, 2].map((c) => C.at(C.gD, X, Y, c));
      const dbgw = [0, 1, 2].map((c) => C.at(C.gDW, X, Y, c));
      rows.push({
        X, Y, i, sam, gpu, web, fan, without, dbg, dbgw,
        gpuL: L(...gpu), webL: L(...web), fanL: L(...fan),
        withoutL: L(...without), compL: L(C.RGB[i * 3], C.RGB[i * 3 + 1], C.RGB[i * 3 + 2]),
        twinG: 0, // filled below
      });
      rows[rows.length - 1].twinG = (() => { // cover_lib's twinG at i
        let g = 0;
        for (let b = 0; b < NB; b++) {
          const cr = T.fa32[(i * NB + b) * 2];
          if (!(cr >= 0) || T.f32[(i * NB + b) * 2] > 1e8) continue;
          g = Math.max(g, Math.min(1, cr) * (T.u8[i * PX + b * PB + 1] / 255));
        }
        return 255 * g;
      })();
    }
  phases.push(rows);
}
// Replication guards: 19D's set and its composite row must come back.
const EXP_N = [36, 36, 36, 32, 32, 32, 36, 36], EXP_WO = [4, 5, 9, 26, 26, 26, 13, 7];
let maxCompDiff = 0;
phases.forEach((rows, k) => {
  if (rows.length !== EXP_N[k]) throw new Error(`phase ${k}: ${rows.length} px, expected ${EXP_N[k]}`);
  for (const r of rows) maxCompDiff = Math.max(maxCompDiff, Math.abs(r.withoutL - r.compL));
});
const within = (rows, f) => rows.filter((r) => Math.abs(r.gpuL - f(r)) <= 2).length;
const woCounts = phases.map((rows) => within(rows, (r) => r.compL));
console.log(`replication: 276 pixel-phases (${EXP_N.join(", ")}); composite recomputed per sample vs composite() max luma diff ${maxCompDiff.toFixed(4)}`);
console.log(`without gk (19D's composite row): ${woCounts.join(", ")} - ${JSON.stringify(woCounts) === JSON.stringify(EXP_WO) ? "matches" : "MISMATCH vs " + EXP_WO.join(",")}`);
if (JSON.stringify(woCounts) !== JSON.stringify(EXP_WO)) throw new Error("composite row does not replicate 19D");
let kind3 = 0;
for (const rows of phases) for (const r of rows) kind3 += r.sam.filter((kd) => kd === 3).length;
console.log(`samples of another record's primitive (kind 3) at the 276 px: ${kind3} of ${276 * 4}; fan twin G max ${Math.max(...phases.flatMap((rows) => rows.map((r) => r.twinG))).toFixed(1)} (0 = the fan's debug colour is (0,0,0) here)`);

// Silhouette crossings per reading (counts over the 276).
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
// for: phase 3's webs-off against fan-twin RGB at every arm pixel,
// counted or not (the test is phase-independent, read at phase 3).
const forCross = new Set();
{
  const T3 = loadTwin(DIR, rc.ji, 3);
  const C3 = composite(DIR, meta, rc, kinds, 3, po.or, T3);
  for (let Y = 0; Y < BH; Y++)
    for (let X = 0; X < BW; X++) {
      const i = Y * BW + X;
      if (armOf[i] < 0) continue;
      const web = [0, 1, 2].map((c) => C3.at(C3.gW, X, Y, c));
      const fan = [0, 1, 2].map((c) => T3.u8[i * PX + 42 + c]);
      if (dist(web, fan) > 12) forCross.add(i);
    }
}
let footCross = 0, dbgCross = 0;
for (const rows of phases) for (const r of rows) {
  r.crossFoot = r.webL > 40;
  r.crossDbg = dist(r.dbg, r.dbgw) < dist(r.dbg, [0, r.twinG, 0]);
  r.crossFor = forCross.has(r.i);
  if (r.crossFoot) footCross++;
  if (r.crossDbg) dbgCross++;
}
const forN = phases.reduce((acc, rows) => acc + rows.filter((r) => r.crossFor).length, 0);
console.log(`crossed of 276: foot ${footCross} (webs-off luma min ${Math.min(...phases.flatMap((rows) => rows.map((r) => r.webL))).toFixed(1)} at these px), debug ${dbgCross}, for ${forN} (phase-3 RGB distance over 12)`);
console.log(`crossed per phase: foot ${phases.map((rows) => rows.filter((r) => r.crossFoot).length).join(", ")}, debug ${phases.map((rows) => rows.filter((r) => r.crossDbg).length).join(", ")}, for ${phases.map((rows) => rows.filter((r) => r.crossFor).length).join(", ")}`);

// fit-keep diagnostic: per distinct pixel, fraction toward webs-off.
const byPixel = new Map();
phases.forEach((rows, k) => rows.forEach((r) => {
  if (!byPixel.has(r.i)) byPixel.set(r.i, { i: r.i, X: r.X, Y: r.Y, along: along[r.i], perp: perp[r.i], ph: new Map() });
  byPixel.get(r.i).ph.set(k, r);
}));
for (const p of byPixel.values()) {
  let num = 0, den = 0;
  for (const r of p.ph.values()) { const d = r.webL - r.withoutL; num += (r.gpuL - r.withoutL) * d; den += d * d; }
  p.aRaw = den > 1e-9 ? num / den : 0;
  p.a = Math.max(0, Math.min(1, p.aRaw));
  for (const r of p.ph.values()) r.fitL = r.withoutL + p.a * (r.webL - r.withoutL);
}

// Modelled colours per reading: foot and debug/for discard to the
// webs-off colour (whole pixel; per-sample foot is the same colour
// at this resolution - every kind's discard colour is the webs-off
// pixel, and kinds 0/3 already read it), without keeps the
// composite, fit blends toward it by the fitted fraction.
const model = {
  without: (r) => r.withoutL,
  foot: (r) => (r.crossFoot ? r.webL : r.withoutL),
  debug: (r) => (r.crossDbg ? r.webL : r.withoutL),
  for: (r) => (r.crossFor ? r.webL : r.withoutL),
  fit: (r) => r.fitL,
};
console.log("");
console.log("within 2 luma of the GPU, per phase (pixel count in brackets):");
console.log(`phase        ${phases.map((rows, k) => `t${k} [${rows.length}]`.padStart(9)).join("")}`);
for (const [name, f] of Object.entries(model))
  console.log(`${name.padEnd(12)} ${phases.map((rows) => String(within(rows, f)).padStart(9)).join("")}`);
console.log("");
console.log("mean |GPU - model| luma per phase:");
for (const [name, f] of Object.entries(model))
  console.log(`${name.padEnd(12)} ${phases.map((rows) => (rows.reduce((a, r) => a + Math.abs(r.gpuL - f(r)), 0) / rows.length).toFixed(1).padStart(9)).join("")}`);
console.log("");
console.log(`mean luma per phase: GPU ${phases.map((rows) => (rows.reduce((a, r) => a + r.gpuL, 0) / rows.length).toFixed(1)).join(" ")}, webs-off ${phases.map((rows) => (rows.reduce((a, r) => a + r.webL, 0) / rows.length).toFixed(1)).join(" ")}, without ${phases.map((rows) => (rows.reduce((a, r) => a + r.withoutL, 0) / rows.length).toFixed(1)).join(" ")}`);
// Bright-phase verdict rows and the fitted keep's reach.
const bright = [0, 1, 2, 6, 7];
console.log(`bright phases t0,t1,t2,t6,t7 totals: ${bright.map((k) => phases[k].length).join(", ")}`);
for (const [name, f] of Object.entries(model))
  console.log(`  ${name}: ${bright.map((k) => within(phases[k], f)).join(", ")}`);
const fitPix = [...byPixel.values()];
const fitResid = fitPix.flatMap((p) => [...p.ph.values()].map((r) => Math.abs(r.gpuL - r.fitL)));
console.log(`fit-keep: keep (= 1 - fraction) per pixel min ${(1 - Math.max(...fitPix.map((p) => p.a))).toFixed(2)} median ${(1 - fitPix.map((p) => p.a).sort((x, y) => x - y)[Math.floor(fitPix.length / 2)]).toFixed(2)} max ${(1 - Math.min(...fitPix.map((p) => p.a))).toFixed(2)}; raw fraction outside [0,1] at ${fitPix.filter((p) => p.aRaw < 0 || p.aRaw > 1).length} of ${fitPix.length} pixels; pixel-phases still over 2 luma with the fit: ${fitResid.filter((v) => v > 2).length} of 276`);
const below = phases.map((rows) => rows.filter((r) => r.gpuL < Math.min(r.withoutL, r.webL) - 2).length);
console.log(`pixel-phases where the GPU is darker than both source colours by over 2 (no keep in [0,1] reaches them): ${below.join(", ")} per phase, ${below.reduce((a, b) => a + b, 0)} of 276`);
console.log("");
console.log("worst bright pixel-phases under foot (GPU, without, webs-off, foot-modelled):");
const worst = phases.flatMap((rows, k) => rows.map((r) => ({ k, r }))).filter(({ r }) => r.crossFoot)
  .sort((a, b) => Math.abs(b.r.gpuL - b.r.withoutL) - Math.abs(a.r.gpuL - a.r.withoutL)).slice(0, 12);
for (const { k, r } of worst)
  console.log(`  t${k} (${r.X},${r.Y}) along ${along[r.i].toFixed(2)} perp ${perp[r.i].toFixed(3)} samples ${r.sam.join("/")} GPU ${r.gpuL.toFixed(1)} without ${r.withoutL.toFixed(1)} webs ${r.webL.toFixed(1)} dbg ${r.dbg.map((v) => Math.round(v)).join(",")} dbgw ${r.dbgw.map((v) => Math.round(v)).join(",")}`);
