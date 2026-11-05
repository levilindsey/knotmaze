// K1202 (batch 20 Run C): copied verbatim from .claude/probes/K1139/table_cyc.mjs (stand links and moves unchanged); only the folder changed.
// K1139 S4: plan 4.2's P1-P4 and P6 on the CPU mirror for the arms lit
// from both ends (PulseArm.two), from dump_cyc.mjs's JSON (the S4 build's
// declaration after a stand's moves). kPulseCrest / kPulseV2 are ported
// line for line from src/render/paint_math.ts (kymo.mjs's uniforms).
//   node table_cyc.mjs <dump.json>...
// Per two-ended arm Q (span W, ends A = cJunction at dA, B = cFar at dB):
//   P6a  every walk edge is declared once (the S4 fix: one item, not two
//        overlapping one-ended trains).
//   P1/P2 at each end: the declared arm P whose far vertex is that end;
//        step = Q's end distance - (P.dist0 + P.world), and over 64 clock
//        times in one period max |v_P(P.world) - v_Q(end)|.
//   ridge: max over 64 times of |v(dR - 1e-4) - v(dR + 1e-4)| (dR, where
//        the two sides meet), and the largest change per 0.01 world
//        anywhere on Q against a one-ended crest's own slope (0.9 / CREST
//        WIDTH per world, 0.0125 per 0.01).
//   P3   each side's crest moves 1.6 world/s in its own direction.
//   P4   crest full width at half height on each side (crests clear of
//        the ridge fade), against a one-ended arm's.
//   P6b  local maxima of the bump against the crest centres the two sides
//        place on Q (each side's centres on its own side of the ridge).
import { readFileSync } from "node:fs";
import { uniforms, pulseV } from "./kymo.mjs";

const C = {
  PULSE_END_WINDOW: 0.45, CREST_WIDTH: 0.72, CREST_RAMP: 0.5, PULSE_FLOOR: 0.38,
  PULSE_CORE_BOOST: 0.62, PULSE_CORE_RADIUS: 0.55, PULSE_FLOOR_REACH: 2.0,
  PULSE_SPEED: 1.6, PULSE_RIDGE_FADE: 0.5,
};
const smooth01 = (x) => { const c = x < 0 ? 0 : x > 1 ? 1 : x; return c * c * (3 - 2 * c); };
const reachWin = (U, d) => 1 - smooth01((d - (U.reach - Math.max(U.f, 1e-4))) / Math.max(U.f, 1e-4));
function crest(U, dG, inward, endWin, bumpScale = 1, bumpOnly = false) {
  const s = U.s;
  const raw = inward ? dG + U.travelIn : dG - U.travelOut;
  const ph = raw - s * Math.floor(raw / s);
  const dist = Math.min(ph, s - ph);
  const dC = Math.max(0, dG - (ph <= s - ph ? ph : ph - s));
  const bump = Math.max(0, 1 - dist / C.CREST_WIDTH) * Math.min(1, dC / C.CREST_RAMP) * bumpScale;
  if (bumpOnly) return bump * reachWin(U, dG);
  const floor = (C.PULSE_FLOOR + C.PULSE_CORE_BOOST * Math.max(0, 1 - dG / C.PULSE_CORE_RADIUS)) * Math.max(0, 1 - dG / C.PULSE_FLOOR_REACH);
  return Math.min(1, (floor + bump * 0.9) * endWin) * U.fade * reachWin(U, dG);
}
function v2(U, d, W, dA, dB, inwA, inwB, bumpOnly = false) {
  if (d < 0 || d > W) return 0;
  const gA = dA + d, gB = dB + W - d;
  const rK = Math.min(1, (Math.abs(gA - gB) * 0.5) / C.PULSE_RIDGE_FADE);
  return gA <= gB ? crest(U, gA, inwA, 1, rK, bumpOnly) : crest(U, gB, inwB, 1, rK, bumpOnly);
}
// Crest centres along one side: dG = travelOut + k s (outward) or
// dG = -travelIn + k s (inward), kept inside [lo, hi) of that side's dG.
function centres(U, lo, hi, inward) {
  const off = inward ? -U.travelIn : U.travelOut, out = [];
  for (let k = Math.ceil((lo - off) / U.s); off + k * U.s < hi; k++) out.push(off + k * U.s);
  return out;
}
// Full width at half height of the crest nearest x0 (bump only, along d).
function fwhm(f, x0, lo, hi) {
  const h = 1e-3;
  let xm = x0, vm = f(x0);
  for (let x = Math.max(lo, x0 - 0.4); x <= Math.min(hi, x0 + 0.4); x += h) { const v = f(x); if (v > vm) { vm = v; xm = x; } }
  if (vm <= 0.05) return NaN;
  let a = xm, b = xm;
  while (a > lo && f(a) > vm / 2) a -= h;
  while (b < hi && f(b) > vm / 2) b += h;
  if (a <= lo || b >= hi) return NaN;
  return b - a;
}

for (const file of process.argv.slice(2)) {
  const j = JSON.parse(readFileSync(file, "utf8"));
  const P = j.decl.pulses, raw = j.raw, reach = j.decl.reach, sp = j.decl.spacing;
  // dumpPulses' world reads 0 when the dev server has re-served
  // paint_model.ts with a ?t= stamp (the probe's import gets a second,
  // empty instance; inferred). The physics state does not depend on S4
  // (phw=0, same moves), so take each arm's world span from the same
  // stand's pre-S4 dump (out/s4cyc/d/), matched by chain and unordered ctrls.
  if (P.some((p) => !(p.world > 0))) {
    const old = JSON.parse(readFileSync(file.replace(/[\\/]db[\\/]/, "/d/"), "utf8")).decl.pulses;
    for (const p of P) {
      const o = old.find((q) => q.chain === p.chain && ((q.cJ === p.cJ && q.cF === p.cF) || (q.cJ === p.cF && q.cF === p.cJ)));
      if (!o || !(o.world > 0)) throw new Error(`${file}: no world span for e${p.edge}`);
      p.world = o.world;
    }
    console.log(`(world spans from the pre-S4 dump ${file.replace(/[\\/]db[\\/]/, "/d/")})`);
  }
  const period = sp / C.PULSE_SPEED;
  console.log(`${file}: head ${j.head}, reach ${reach}, spacing ${sp}, ${P.length} pulse item(s)`);
  const perEdge = new Map();
  for (const p of P) perEdge.set(p.edge, (perEdge.get(p.edge) || 0) + 1);
  const dup = [...perEdge].filter(([, n]) => n > 1);
  console.log(`  P6a declared once: ${dup.length ? "FAIL " + dup.map(([e, n]) => `e${e} x${n}`).join(", ") : "pass"} (${perEdge.size} edges)`);
  for (const p of P) {
    const r = raw.find((q) => q.chain === p.chain && q.cJunction === p.cJ && q.cFar === p.cF) || {};
    if (!r.two) continue;
    const W = p.world, dA = p.dist0, dB = +r.dB, inwA = p.inward, inwB = !!r.inwardB;
    const dR = Math.min(W, Math.max(0, (dB + W - dA) / 2));
    console.log(`  e${p.edge} TWO ${p.near}->${p.far}: W ${W.toFixed(3)} dA ${dA.toFixed(3)} (${inwA ? "in" : "out"}) dB ${dB.toFixed(3)} (${inwB ? "in" : "out"}) ridge at d ${dR.toFixed(3)} (dG ${(dA + dR).toFixed(3)})`);
    // S4b: the ridge's distance from each end (xR = gR - d_end) and the
    // ridge factor the arm's own crest carries at that joint, which a
    // one-ended parent does not (item 3: under 1 when xR < 0.5); and the
    // rare ends where the ridge falls outside the arm (item 4).
    const gR = (dA + dB + W) / 2;
    const kF = (xr) => Math.min(1, Math.abs(xr) / C.PULSE_RIDGE_FADE);
    console.log(`    gR ${gR.toFixed(3)}: xR at A ${(gR - dA).toFixed(3)} (joint ridge factor ${kF(gR - dA).toFixed(3)}), at B ${(gR - dB).toFixed(3)} (${kF(gR - dB).toFixed(3)})${gR < dA ? "  RARE: dB + W < dA (lit from B at d = 0)" : ""}${gR < dB ? "  RARE: dA + W < dB (lit from A at d = W)" : ""}`);
    // P1/P2 at each end.
    for (const [end, vtx, dEnd, dQ] of [["A", p.near, dA, 0], ["B", p.far, dB, W]]) {
      const par = P.filter((q) => q !== p && q.far === vtx && q.edge !== p.edge);
      if (!par.length) { console.log(`    end ${end} at ${vtx}: no declared arm ends there${dEnd < 1e-6 ? " (the head)" : ""}`); continue; }
      for (const q of par) {
        const rq = raw.find((x) => x.chain === q.chain && x.cJunction === q.cJ && x.cFar === q.cF) || {};
        const step = dEnd - ((q.dist0 || 0) + q.world);
        let dv = 0;
        for (let i = 0; i < 64; i++) {
          const U = uniforms(100 + (i / 64) * period, sp, reach);
          const a = rq.two ? v2(U, q.world - 1e-6, q.world, q.dist0, +rq.dB, q.inward, !!rq.inwardB) : pulseV(U, q.world - 1e-6, q.world, q.inward, q.dist0 || 0, q.cont);
          const b = v2(U, Math.abs(dQ - 1e-6), W, dA, dB, inwA, inwB);
          dv = Math.max(dv, Math.abs(a - b));
        }
        const dirOk = (end === "A" ? inwA : inwB) === q.inward;
        console.log(`    end ${end} at ${vtx} from e${q.edge} (${q.inward ? "in" : "out"}${q.cont ? " cont" : ""}): P2 step ${step.toFixed(4)}  P1 max |dv| ${dv.toFixed(4)}${dirOk ? "" : "  (direction flips here)"}`);
      }
    }
    // Ridge continuity and the largest change per 0.01 world on Q.
    let jr = 0, js = 0, jsAt = 0;
    for (let i = 0; i < 64; i++) {
      const U = uniforms(100 + (i / 64) * period, sp, reach);
      jr = Math.max(jr, Math.abs(v2(U, Math.max(0, dR - 1e-4), W, dA, dB, inwA, inwB) - v2(U, Math.min(W, dR + 1e-4), W, dA, dB, inwA, inwB)));
      for (let d = 0; d + 0.01 <= W; d += 0.01) {
        const x = Math.abs(v2(U, d + 0.01, W, dA, dB, inwA, inwB) - v2(U, d, W, dA, dB, inwA, inwB));
        if (x > js) { js = x; jsAt = d; }
      }
    }
    // A one-ended arm's own largest step per 0.01 (the reference slope).
    let jo = 0;
    for (let i = 0; i < 64; i++) {
      const U = uniforms(100 + (i / 64) * period, sp, reach);
      for (let d = 0; d + 0.01 <= W; d += 0.01) jo = Math.max(jo, Math.abs(pulseV(U, d + 0.01, W, inwA, dA, true) - pulseV(U, d, W, inwA, dA, true)));
    }
    console.log(`    ridge: max |dv| across it ${jr.toFixed(4)}; largest change per 0.01 world on Q ${js.toFixed(4)} at d ${jsAt.toFixed(2)} (a one-ended arm from A: ${jo.toFixed(4)})`);
    // P5: the longest stretch on Q where the field is 0 with light on both
    // sides of it, over 64 times (two-ended, and a one-ended arm from A).
    const gapOf = (f) => {
      let best = 0, lit = false, z0 = -1;
      for (let d = 0; d <= W + 1e-9; d += 0.005) {
        if (f(d) > 1e-4) { if (lit && z0 >= 0) best = Math.max(best, d - z0); z0 = -1; lit = true; } else if (z0 < 0) z0 = d;
      }
      return best;
    };
    let g2 = 0, g1 = 0;
    for (let i = 0; i < 64; i++) {
      const U = uniforms(100 + (i / 64) * period, sp, reach);
      g2 = Math.max(g2, gapOf((d) => v2(U, d, W, dA, dB, inwA, inwB)));
      g1 = Math.max(g1, gapOf((d) => pulseV(U, d, W, inwA, dA, true)));
    }
    console.log(`    P5 longest unlit stretch with light on both sides: ${g2.toFixed(3)} world (one-ended from A: ${g1.toFixed(3)}; want <= 0.1)`);
    // P3 speed and P4 width, side by side, at 8 clock times.
    const sp3 = [], w4 = [];
    let p6 = [];
    for (let i = 0; i < 8; i++) {
      const t = 100 + (i / 8) * period, dt = 0.01;
      const U0 = uniforms(t, sp, reach), U1 = uniforms(t + dt, sp, reach);
      for (const [side, inw, lo, hi, toD] of [["A", inwA, dA, dA + dR, (g) => g - dA], ["B", inwB, dB, dB + W - dR, (g) => dB + W - g]]) {
        for (const c of centres(U0, lo + 0.75, hi - 0.75, inw)) {
          // The same crest one dt later (moved by +-1.6 dt in dG).
          const c1s = centres(U1, lo, hi, inw).filter((x) => Math.abs(x - c) < 0.2);
          if (c1s.length !== 1) continue;
          sp3.push({ side, v: Math.abs(c1s[0] - c) / dt });
          const f = (d) => v2(U0, d, W, dA, dB, inwA, inwB, true);
          const w = fwhm(f, toD(c), 0, W);
          if (Number.isFinite(w)) w4.push({ side, w });
        }
      }
      // P6b: local maxima of the bump along Q against the two sides' centres.
      const f = (d) => v2(U0, d, W, dA, dB, inwA, inwB, true);
      let maxima = 0;
      for (let d = 0.005; d < W - 0.005; d += 0.005) { const a = f(d - 0.005), b = f(d), c = f(d + 0.005); if (b > 0.02 && b >= a && b > c) maxima++; }
      const exp = centres(U0, dA, dA + dR, inwA).filter((g) => g > dA + 0.01 && reachWin(U0, g) > 0.03).length +
        centres(U0, dB, dB + W - dR, inwB).filter((g) => g > dB + 0.01 && reachWin(U0, g) > 0.03).length;
      p6.push(`${maxima}/${exp}`);
    }
    const ref = (() => { // a one-ended crest's FWHM, same uniforms, far from both ends
      const U = uniforms(100, sp, reach), c = centres(U, 3, 3 + sp, false)[0];
      return fwhm((d) => crest(U, d, false, 1, 1, true), c, 0, 50);
    })();
    const fmt = (a) => (a.length ? `${Math.min(...a).toFixed(3)}-${Math.max(...a).toFixed(3)}` : "none");
    console.log(`    P3 speed: A ${fmt(sp3.filter((x) => x.side === "A").map((x) => x.v))}, B ${fmt(sp3.filter((x) => x.side === "B").map((x) => x.v))} world/s (want 1.6)`);
    console.log(`    P4 width: A ${fmt(w4.filter((x) => x.side === "A").map((x) => x.w))}, B ${fmt(w4.filter((x) => x.side === "B").map((x) => x.w))} world (one-ended ${ref.toFixed(3)}; crests at least 0.75 from the ridge and the ends)`);
    console.log(`    P6b crest maxima/expected at 8 times: ${p6.join(" ")}`);
  }
  bandExtent(j, P, raw, sp, reach, period);
}

// S4b: BAND EXTENT, P1 over the fan's whole extent. Each pulse band
// against the ribbon of the arm it runs along, over the band's record as
// the fans read it (dump_cyc.mjs `ext`: the centerline's tau range and
// R2.w). B side (tau > 0): the band's arm bEdge at d = tau (a near band)
// or W - tau (a far band: B is the arm's far end). A side (tau < 0): the
// parent arm aEdge at d = q.world + tau. The band is S4b's kPulseBandV
// (the ridge fade past gR) when R2.w carries a ridge, else S4's crest
// (one-ended). Max over 64 clock times of |band - ribbon|, over the fan
// (B: tau in (0, tauHi - fillHalf]: the web's reach) and the whole record
// (out to tauHi, the cover strip's end); STEP over 1e-3.
function bandV(U, distJ, tau, inward, gR, inwR) {
  let g = distJ + tau, inw = inward, bk = 1;
  if (tau > 0 && gR > 0) {
    bk = Math.min(1, Math.abs(g - gR) / C.PULSE_RIDGE_FADE);
    if (g > gR) { g = 2 * gR - g; inw = inwR; }
  }
  return crest(U, g, inw, 1, bk);
}
function ribbonOf(P, raw, edge) {
  const p = P.find((q) => q.edge === edge);
  if (!p) return null;
  const r = raw.find((q) => q.chain === p.chain && q.cJunction === p.cJ && q.cFar === p.cF) || {};
  const W = p.world;
  const v = r.two
    ? (U, d) => v2(U, d, W, p.dist0, +r.dB, p.inward, !!r.inwardB)
    : (U, d) => pulseV(U, d, W, p.inward, p.dist0 || 0, p.cont);
  return { p, r, W, v };
}
function bandExtent(j, P, raw, sp, reach, period) {
  const ext = j.ext;
  if (!ext || !ext.bands) { console.log("  BAND EXTENT: this dump has no ext (dump it with S4b's dump_cyc.mjs)"); return; }
  if (ext.err) { console.log(`  BAND EXTENT: ${ext.err}`); return; }
  const fh = ext.fillHalf;
  console.log(`  BAND EXTENT (fillHalf ${fh.toFixed(3)}; band - ribbon over 64 times; STEP over 1e-3):`);
  j.bands.forEach((b, i) => {
    const x = ext.bands[i];
    const tag = `    band ${b.vertex} e${b.aEdge}->e${b.bEdge} distJ ${b.distJ.toFixed(3)} ${b.inward ? "in" : "out"}`;
    if (!x) { console.log(`${tag}: no record found`); return; }
    const B = ribbonOf(P, raw, b.bEdge), A = ribbonOf(P, raw, b.aEdge);
    if (!B) { console.log(`${tag}: arm e${b.bEdge} not declared`); return; }
    // Which end of B the band sits at: the vertex, then (a self-loop)
    // the band's B ctrl against the arm's two end ctrls.
    const ends = [];
    if (B.p.near === b.vertex && b.b.ctrl === B.p.cJ) ends.push("near");
    if (B.p.far === b.vertex && b.b.ctrl === B.p.cF) ends.push("far");
    if (ends.length !== 1) { console.log(`${tag}: B end ambiguous (${ends.join("/") || "none"})`); return; }
    const far = ends[0] === "far";
    const gR = Math.abs(x.r2w), inwR = x.r2w < 0;
    const dOf = (tau) => (far ? B.W - tau : tau);
    // Only the stretch on the arm itself is compared: an arm shorter than
    // the band (e57, 0.923 world) carries it past its far junction onto
    // the next run of the chain, whose ribbon is another pulse item.
    let fan = 0, fanAt = 0, all = 0, allAt = 0, aSide = 0, aAt = 0;
    for (let k = 0; k < 64; k++) {
      const U = uniforms(100 + (k / 64) * period, sp, reach);
      for (let tau = 0.005; tau <= Math.min(x.tauHi, B.W) + 1e-9; tau += 0.005) {
        const dv = Math.abs(bandV(U, b.distJ, tau, b.inward, gR, inwR) - B.v(U, dOf(tau)));
        if (dv > all) { all = dv; allAt = tau; }
        if (tau <= x.tauHi - fh + 1e-9 && dv > fan) { fan = dv; fanAt = tau; }
      }
      if (A) {
        const dA = (tau) => (A.p.far === b.vertex ? A.W + tau : -tau);
        for (let tau = -0.005; tau >= Math.max(x.tauLo, -A.W) - 1e-9; tau -= 0.005) {
          const dv = Math.abs(bandV(U, b.distJ, tau, b.inward, gR, inwR) - A.v(U, dA(tau)));
          if (dv > aSide) { aSide = dv; aAt = tau; }
        }
      }
    }
    const two = B.r.two ? ` TWO gR ${((B.p.dist0 + +B.r.dB + B.W) / 2).toFixed(3)}` : "";
    const st = (v) => (v > 1e-3 ? " STEP" : "");
    const cut = (x.tauHi > B.W ? ` [B arm W ${B.W.toFixed(3)}: compared to there]` : "") + (A && -x.tauLo > A.W ? ` [A arm W ${A.W.toFixed(3)}: compared to there]` : "");
    console.log(`${tag} (${far ? "far" : "near"} end${two}; R2.w ${x.r2w.toFixed(3)}): B fan (0, ${(x.tauHi - fh).toFixed(3)}] ${fan.toFixed(4)} at tau ${fanAt.toFixed(3)}${st(fan)}; to tauHi ${x.tauHi.toFixed(3)} ${all.toFixed(4)} at ${allAt.toFixed(3)}${st(all)}; A [${x.tauLo.toFixed(3)}, 0) ${A ? aSide.toFixed(4) + " at " + aAt.toFixed(3) + st(aSide) : "(no arm)"}${cut}`);
  });
}
