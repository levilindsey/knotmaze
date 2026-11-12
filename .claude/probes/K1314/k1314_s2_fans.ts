// K1314 s2: does form B ink the sector a zero-radius corner's fan (sharpJoinFan) draws?
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s2_fans.ts <scene> [<scene> ...] [--all]
// For each arc piece whose points all sit at one point (a fan), samples its sector (radius 0.25..0.95 W,
// the swept angles), drops samples another piece's band triangle covers, and reports the share of the
// rest that form B inks (ink > 0.5). Prints one line per fan with share < 0.5 (every fan with --all),
// then per scene the counts by corner state.
import { FormB } from "../../../src/render/field/form_b";
import { buildModel } from "./k1314_census";

const args = process.argv.slice(2);
const all = args.includes("--all");
for (const nm of args.filter((a) => !a.startsWith("--"))) {
  const m = buildModel(nm); const W = m.table.W;
  const fb = new FormB(JSON.parse(JSON.stringify(m.scene)) as never, { dpr: 2 }) as unknown as { evalPoint(x: number, y: number): { ink: number } };
  const inTri = (t: number, x: number, y: number): boolean => {
    const T = m.tri; const ax = T[6 * t]; const ay = T[6 * t + 1]; const bx = T[6 * t + 2]; const by = T[6 * t + 3]; const cx = T[6 * t + 4]; const cy = T[6 * t + 5];
    const d1 = (x - bx) * (ay - by) - (ax - bx) * (y - by); const d2 = (x - cx) * (by - cy) - (bx - cx) * (y - cy); const d3 = (x - ax) * (cy - ay) - (cx - ax) * (y - ay);
    return !(((d1 < 0) || (d2 < 0) || (d3 < 0)) && ((d1 > 0) || (d2 > 0) || (d3 > 0)));
  };
  const tally = new Map<string, [number, number]>();
  m.table.pieces.forEach((p, pi) => {
    if (p.kind !== "arc" || p.corner < 0) return;
    const np = p.pts.length / 2; if (np < 2) return;
    let fan = true; for (let i = 1; i < np; i++) if (Math.hypot(p.pts[2 * i] - p.pts[0], p.pts[2 * i + 1] - p.pts[1]) > 1e-9) fan = false;
    if (!fan) return;
    const c = m.table.corners[p.corner]; const qx = p.pts[0]; const qy = p.pts[1];
    const a0 = Math.atan2(p.cpts[1] - qy, p.cpts[0] - qx); let da = Math.atan2(p.cpts[2 * np - 1] - qy, p.cpts[2 * np - 2] - qx) - a0;
    while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    let n = 0; let ink = 0; let grid = "";
    for (let k = 1; k < 8; k++) for (let r = 0; r < 4; r++) {
      const a = a0 + (da * k) / 8; const rad = W * (0.25 + 0.7 * (r / 3)); const x = qx + rad * Math.cos(a); const y = qy + rad * Math.sin(a);
      let cov = false;
      for (let t = 0; t < m.nTri && !cov; t++) {
        if (m.triP[t] === pi || m.tb[4 * t] > x || m.tb[4 * t + 2] < x || m.tb[4 * t + 1] > y || m.tb[4 * t + 3] < y) continue;
        if (inTri(t, x, y) && m.triA[3 * t] + m.triA[3 * t + 1] + m.triA[3 * t + 2] > 1.5) cov = true;
      }
      if (cov) { grid += r === 3 ? "c " : "c"; continue; }
      const e = fb.evalPoint(x, y).ink; n++; if (e > 0.5) ink++; grid += e > 0.5 ? "#" : ".";
    if (r === 3) grid += " "; }
    const share = n ? ink / n : 1;
    const endD = (ci: number): string => { const ch = (m.scene as unknown as { chains: { closed: boolean; pts: number[] }[] }).chains[ci]; if (!ch || ch.closed) return "closed"; const k = ch.pts.length; return Math.min(Math.hypot(ch.pts[0] - c.Vx, ch.pts[1] - c.Vy), Math.hypot(ch.pts[k - 2] - c.Vx, ch.pts[k - 1] - c.Vy)).toFixed(2); };
    const key = `${c.ok ? "ok" : "failed"}${c.ok ? "" : " " + (c.why ?? "")}`;
    const tv = tally.get(key) ?? [0, 0]; tv[0]++; if (n >= 4 && share < 0.5) tv[1]++; tally.set(key, tv);
    if (all || (n >= 4 && share < 0.5)) console.log(`${nm} piece ${pi} corner ${p.corner} ${c.junction} a${c.aChain} b${c.bChain} ${key} th ${c.theta.toFixed(2)} sweep ${((da * 180) / Math.PI).toFixed(0)} V (${qx.toFixed(3)},${qy.toFixed(3)}) uncovered ${n}/28 formB ${share.toFixed(2)} ends a ${endD(c.aChain)} b ${endD(c.bChain)} ${grid}`);
  });
  for (const [k, [a, b]] of tally) console.log(`${nm} ${k}: fans ${a}, unlinked by form B ${b}`);
}
