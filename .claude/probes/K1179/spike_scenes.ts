// K1179 S1 spike, criteria 1-2 over the 12 K868 scenes (Run I task 3).
// Run: npx.cmd vite-node .claude/probes/K1179/spike_scenes.ts
// Writes .claude/probes/K1179/out/scenes.json and out/scenes.txt, plus
// out/worst_*.svg for the worst cusp sites (no pngjs; Run I task 5).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FormB } from "../../../src/render/field/form_b";
import { cornerSequence, edgePoint, footMetric, fmt, isBuried, loadScene, menger, resampleUniform, rootBandEff, SCENES_12 } from "./outline";
import { pointAt, segOfS } from "../../../src/render/field/geom";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
const OUT = `${HERE}/out`;
mkdirSync(OUT, { recursive: true });

interface CuspRow { scene: string; junction: string; arms: string; thetaDeg: number; rH: number; r0H: number; minKH: number; atPart: string }
interface SmallRow { scene: string; junction: string; arms: string; thetaDeg: number; rH: number; r0H: number; dVminH: number; rbEffH: number; roomH: number; omega: number; inNullBand: boolean; reason: string }
interface FootRow { scene: string; junction: string; arms: string; at: string; gapDevPx: number; jumpDeg: number }

const txt: string[] = [];
const cusps: CuspRow[] = [];
const smalls: SmallRow[] = [];
const feet: FootRow[] = [];
let handMaxJump = 0;
let handWorst = "";
let handOver = 0;
let handN = 0;
const perScene: Record<string, unknown>[] = [];
// Keep worst corner sequences for SVG (rebuilt below by key).
const worstKeys: { scene: string; j: number; a: number; b: number; minKH: number }[] = [];

for (const name of SCENES_12) {
  const t0 = performance.now();
  const sc = loadScene(name);
  const fb = new FormB(sc);
  const buildMs = performance.now() - t0;
  const h = fb.h;
  const dev = fb.ppuDev; // device px per world unit
  let minKH = Infinity;
  let nCusp = 0;
  let nSmall = 0;
  let nSmallIn = 0;
  let footGapMax = 0;
  let footJumpMax = 0;
  let footOver = 0;
  // Possible corner pairs per junction (FormB's corner-loop rules).
  let possible = 0;
  const byJ = new Map<number, number>();
  for (const c of fb.corners) byJ.set(c.j, (byJ.get(c.j) ?? 0) + 1);
  sc.junctions.forEach((j, ji) => {
    const ais = fb.arms.map((a, i) => (a.j === ji ? i : -1)).filter((i) => i >= 0).sort((u, v) => fb.arms[u].ang - fb.arms[v].ang);
    const n = ais.length;
    if (n < 2) return;
    for (let i = 0; i < n; i++) {
      const a = ais[i];
      const b = ais[(i + 1) % n];
      let th = fb.arms[b].ang - fb.arms[a].ang;
      th = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (th <= 1e-6 || th >= Math.PI - 1e-6) continue;
      const xa = j.arms[fb.arms[a].ei];
      const xb = j.arms[fb.arms[b].ei];
      if (xa.chain === xb.chain && xa.kind === "through" && xb.kind === "through" && Math.abs(xa.s - xb.s) < 1e-6) continue;
      possible++;
    }
  });
  let nNotExposed = 0;
  let nFoldSites = 0;
  let nSharpJoins = 0;
  const cuspBins = { b1: 0, b2: 0, b3: 0, b4: 0 };
  let gapOver = 0;
  let jumpOver = 0;
  for (const c of fb.corners) {
    const jid = sc.junctions[c.j]?.id ?? `j${c.j}`;
    const arms = `${fb.arms[c.a].ei}-${fb.arms[c.b].ei}`;
    // The round is on the exposed outline only if both ball feet lie inside
    // their arms' spans; past a span the arm is cut (a crossing or the next
    // root) and the boundary joins elsewhere, not at this corner's V.
    const exposed = c.r > 1e-12 && c.omega > 0 && c.dA <= fb.arms[c.a].L + 1e-9 && c.dB <= fb.arms[c.b].L + 1e-9;
    if (!exposed) nNotExposed++;
    const seq = cornerSequence(fb, c);
    let cMin = Infinity;
    let cPart = "";
    let nBuried = 0;
    if (exposed) {
      // Exposed outline only: drop sampled points buried inside a tube
      // (a tight bend's offset fold is inside the union, not its boundary).
      const exp = seq.pts.filter((p) => {
        const b = isBuried(fb, p.x, p.y);
        if (b) nBuried++;
        return !b;
      });
      if (nBuried > 0) nFoldSites++;
      // Uniform 0.01h resample, then windowed Menger (i-5, i, i+5: a 0.05h
      // baseline). Adjacent triples at the raw step read centreline vertex
      // noise and the 100-point arc's micro-spacing, not the outline's bend.
      const uni = resampleUniform(exp, 0.01 * h);
      const partAt = seq.pts.map((p) => p.part);
      void partAt;
      for (let i = 0; i < uni.length; i++) {
        const p0 = uni[Math.max(0, i - 5)];
        const p1 = uni[i];
        const p2 = uni[Math.min(uni.length - 1, i + 5)];
        if (p0 === p1 || p1 === p2) continue;
        const k = (menger(p0.x, p0.y, p1.x, p1.y, p2.x, p2.y) / seq.expectedSign) * h;
        if (k < cMin) {
          cMin = k;
          cPart = "seq";
        }
      }
    }
    if (cMin < minKH) minKH = cMin;
    if (exposed && cMin < -0.01) {
      nCusp++;
      if (cMin >= -0.05) cuspBins.b1++;
      else if (cMin >= -0.35) cuspBins.b2++;
      else if (cMin >= -1) cuspBins.b3++;
      else cuspBins.b4++;
      cusps.push({ scene: name, junction: jid, arms, thetaDeg: (c.theta * 180) / Math.PI, rH: c.r / h, r0H: c.r0 / h, minKH: cMin, atPart: cPart });
      worstKeys.push({ scene: name, j: c.j, a: c.a, b: c.b, minKH: cMin });
    }
    if (c.r0 >= 1 * h && c.r < 0.25 * h) {
      const rb = rootBandEff(fb, c.theta);
      const dVmin = Math.min(c.dVa, c.dVb);
      // A null's band: the corner is at (or within its gate's band of) a
      // window/cap/root null - foot past its span or slack <= 0 (cap gate,
      // band 0.5h), V's foot inside the root band, or omega killed it.
      const reasons: string[] = [];
      if (c.dA > fb.arms[c.a].L + 1e-9 || c.dB > fb.arms[c.b].L + 1e-9) reasons.push("foot past span");
      if (c.room <= 0.5 * h) reasons.push("cap band (room<=0.5h)");
      if (dVmin < rb) reasons.push("root band");
      if (c.omega <= 0) reasons.push("omega=0");
      const inNull = reasons.length > 0;
      nSmall++;
      if (inNull) nSmallIn++;
      smalls.push({ scene: name, junction: jid, arms, thetaDeg: (c.theta * 180) / Math.PI, rH: c.r / h, r0H: c.r0 / h, dVminH: dVmin / h, rbEffH: rb / h, roomH: c.room / h, omega: c.omega, inNullBand: inNull, reason: reasons.join("+") || "none" });
    }
    // Criterion 2's feet exist only on a live round; a sharp join (r below
    // the sampling scale) meets at V by design and has no foot to gate.
    if (exposed && c.r < 0.05 * h) nSharpJoins++;
    if (!exposed || c.r < 0.05 * h) continue;
    for (const which of ["A", "B"] as const) {
      const m = footMetric(fb, c, which);
      const gapDev = m.gapWorld * dev;
      footGapMax = Math.max(footGapMax, gapDev);
      footJumpMax = Math.max(footJumpMax, m.jumpDeg);
      if (gapDev > 0.05 || m.jumpDeg > 1) footOver++;
      if (gapDev > 0.05) gapOver++;
      if (m.jumpDeg > 1) jumpOver++;
      feet.push({ scene: name, junction: jid, arms, at: which, gapDevPx: gapDev, jumpDeg: m.jumpDeg });
    }
  }
  // Hand-off at every arm's L, both sides: inside vs outside offset tangent.
  // A centreline vertex inside the +-0.02h window makes the two segments
  // differ by the arm's own bend, not by a hand-off break; those are counted
  // separately and do not gate.
  for (let ai = 0; ai < fb.arms.length; ai++) {
    const a = fb.arms[ai];
    if (!(a.L > 0.02 * h)) continue;
    const poly = fb.polys[a.pi];
    const sAt = (d: number) => a.sR + a.dir * d;
    const kIn = segOfS(poly, sAt(Math.max(0, a.L - 0.02 * h))).k;
    const kOut = segOfS(poly, sAt(a.L + 0.02 * h)).k;
    const atVertex = kIn !== kOut;
    for (const side of [1, -1]) {
      const pIn0 = edgePoint(fb, ai, Math.max(0, a.L - 0.02 * h), side);
      const pIn1 = edgePoint(fb, ai, a.L, side);
      const pOut = edgePoint(fb, ai, a.L + 0.02 * h, side);
      const v1x = pIn1.x - pIn0.x;
      const v1y = pIn1.y - pIn0.y;
      const v2x = pOut.x - pIn1.x;
      const v2y = pOut.y - pIn1.y;
      const l1 = Math.hypot(v1x, v1y);
      const l2 = Math.hypot(v2x, v2y);
      if (!(l1 > 0 && l2 > 0)) continue;
      handN++;
      const dot = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / (l1 * l2)));
      const cross = (v1x * v2y - v1y * v2x) / (l1 * l2);
      const jump = (Math.atan2(Math.abs(cross), dot) * 180) / Math.PI;
      if (!atVertex && jump > handMaxJump) {
        handMaxJump = jump;
        handWorst = `${name} arm ${ai} (j${a.j} ei${a.ei}) side ${side} L ${fmt(a.L / h, 2)}h`;
      }
      if (!atVertex && jump > 1) handOver++;
      void pointAt;
    }
  }
  const row = {
    scene: name, h, buildMs: +buildMs.toFixed(1), junctions: sc.junctions.length, arms: fb.arms.length,
    corners: fb.corners.length, notExposed: nNotExposed, foldSites: nFoldSites, sharpJoins: nSharpJoins, possibleCorners: possible, nullCorners: possible - fb.corners.length,
    diagNoV: fb.diagnostics.length, minKH: +fmt(minKH), cuspCorners: nCusp, cuspBins, gapOver, jumpOver,
    smallRounds: nSmall, smallInNullBand: nSmallIn, footGapMaxDevPx: +fmt(footGapMax), footJumpMaxDeg: +fmt(footJumpMax), feetOverGate: footOver,
  };
  perScene.push(row);
  txt.push(`${name}: build ${fmt(buildMs, 1)} ms, corners ${fb.corners.length}/${possible} (null ${possible - fb.corners.length}, not exposed ${nNotExposed}, fold sites ${nFoldSites}, sharp joins ${nSharpJoins}, no-V diag ${fb.diagnostics.length}), min k*h ${fmt(minKH)} (cusps ${nCusp}), small rounds ${nSmall} (in null band ${nSmallIn}), foot gap max ${fmt(footGapMax)} devpx, foot jump max ${fmt(footJumpMax)} deg (over gate ${footOver})`);
  console.log(txt[txt.length - 1]);
}
cusps.sort((u, v) => u.minKH - v.minKH);
feet.sort((u, v) => Math.max(v.gapDevPx / 0.05, v.jumpDeg) - Math.max(u.gapDevPx / 0.05, u.jumpDeg));
txt.push(`\nWorst cusps (min k*h, gate -0.01):`);
for (const r of cusps.slice(0, 20)) txt.push(`  ${r.scene} ${r.junction} arms ${r.arms} theta ${fmt(r.thetaDeg, 1)} r ${fmt(r.rH, 3)}h r0 ${fmt(r.r0H, 3)}h minK*h ${fmt(r.minKH)} at ${r.atPart}`);
txt.push(`\nSmall rounds (r0>=1h, r<0.25h): ${smalls.length}, in null band ${smalls.filter((s) => s.inNullBand).length}, outside ${smalls.filter((s) => !s.inNullBand).length}`);
for (const r of smalls.slice(0, 40)) txt.push(`  ${r.scene} ${r.junction} arms ${r.arms} theta ${fmt(r.thetaDeg, 1)} r ${fmt(r.rH, 4)}h r0 ${fmt(r.r0H, 3)}h dVmin ${fmt(r.dVminH, 4)}h rbEff ${fmt(r.rbEffH, 4)}h room ${fmt(r.roomH, 3)}h omega ${fmt(r.omega, 3)} ${r.inNullBand ? "IN" : "OUTSIDE"} null band (${r.reason})`);
txt.push(`\nWorst feet (gate: gap 0.05 devpx, jump 1 deg):`);
for (const r of feet.slice(0, 20)) txt.push(`  ${r.scene} ${r.junction} arms ${r.arms} foot ${r.at} gap ${fmt(r.gapDevPx)} devpx jump ${fmt(r.jumpDeg)} deg`);
txt.push(`\nHand-off at L: ${handN} arm-sides, max tangent jump ${fmt(handMaxJump)} deg at ${handWorst}, over 1 deg: ${handOver}; position gap 0 by construction (same offset point at L on both sides).`);
writeFileSync(`${OUT}/scenes.json`, JSON.stringify({ perScene, cusps: cusps.slice(0, 100), smalls, feet: feet.slice(0, 100), hand: { n: handN, maxJumpDeg: handMaxJump, worst: handWorst, over: handOver } }, null, 1));
writeFileSync(`${OUT}/scenes.txt`, txt.join("\n") + "\n");
console.log(txt.slice(-8).join("\n"));

// Task 5 (optional): SVG plots of the six worst cusp sites.
worstKeys.sort((u, v) => u.minKH - v.minKH);
for (const w of worstKeys.slice(0, 6)) {
  const sc = loadScene(w.scene);
  const fb = new FormB(sc);
  const c = fb.corners.find((k) => k.j === w.j && k.a === w.a && k.b === w.b);
  if (!c) continue;
  const seq = cornerSequence(fb, c);
  const all = [...seq.pts, { x: c.Vx, y: c.Vy }, { x: c.qx, y: c.qy }, { x: sc.junctions[c.j].c[0], y: sc.junctions[c.j].c[1] }];
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const S = 600 / Math.max(x1 - x0, y1 - y0, 1e-9);
  const X = (x: number) => ((x - x0) * S + 20).toFixed(1);
  const Y = (y: number) => ((y - y0) * S + 20).toFixed(1);
  const poly = seq.pts.map((p) => `${X(p.x)},${Y(p.y)}`).join(" ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
<title>${w.scene} ${sc.junctions[c.j]?.id} arms ${fb.arms[c.a].ei}-${fb.arms[c.b].ei}: min k*h ${fmt(w.minKH)}, r ${fmt(c.r / fb.h, 3)}h, theta ${fmt((c.theta * 180) / Math.PI, 1)} deg</title>
<rect width="640" height="640" fill="white"/>
<polyline points="${poly}" fill="none" stroke="black" stroke-width="2"/>
<circle cx="${X(c.Vx)}" cy="${Y(c.Vy)}" r="4" fill="red"><title>V</title></circle>
<circle cx="${X(c.qx)}" cy="${Y(c.qy)}" r="4" fill="blue"><title>q</title></circle>
<circle cx="${X(c.tax)}" cy="${Y(c.tay)}" r="3" fill="green"><title>tA</title></circle>
<circle cx="${X(c.tbx)}" cy="${Y(c.tby)}" r="3" fill="green"><title>tB</title></circle>
<text x="20" y="630" font-family="monospace" font-size="13">${w.scene} ${sc.junctions[c.j]?.id} arms ${fb.arms[c.a].ei}-${fb.arms[c.b].ei} minK*h=${fmt(w.minKH)} r=${fmt(c.r / fb.h, 3)}h theta=${fmt((c.theta * 180) / Math.PI, 1)}</text>
</svg>
`;
  const fn = `${OUT}/worst_${w.scene}_${sc.junctions[c.j]?.id ?? w.j}_${fb.arms[c.a].ei}-${fb.arms[c.b].ei}.svg`;
  writeFileSync(fn, svg);
  console.log(`svg ${fn}`);
}
