// K1139 S2 offline checks on strips.mjs stand JSONs: P6 (every walk edge
// declared once; per arm and frame the crest count in the CPU profile
// equals the analytic count for its span - centers whose own mirror
// value clears 0.45, so the end window and the reach fade, which crush
// a crest flat, are not counted as missing crests).
//   node s2check.mjs <stand.json>...
import { readFileSync } from "node:fs";
import { pulseV } from "./kymo.mjs";

for (const f of process.argv.slice(2)) {
  const j = JSON.parse(readFileSync(f, "utf8"));
  const P = j.decl.pulses;
  const seen = new Map();
  for (const p of P) seen.set(p.edge, (seen.get(p.edge) || 0) + 1);
  const dup = [...seen].filter(([, n]) => n > 1).map(([e, n]) => `e${e}x${n}`);
  let bad = 0, arms = 0;
  const row = j.rows[0];
  row.prof.forEach((pr, i) => {
    const p = P[i];
    if (!p || pr.span < 0.1) return;
    arms++;
    let peaks = 0;
    for (let k = 1; k < pr.v.length - 1; k++) if (pr.v[k] > 0.4 && pr.v[k] >= pr.v[k - 1] && pr.v[k] > pr.v[k + 1]) peaks++;
    const U = { travelIn: pr.uPulse[0], travelOut: pr.uPulse[1], s: pr.uPulse[2], fade: pr.uPulse[3], reach: j.decl.reach, f: Math.min(1, j.decl.reach / 2) };
    const d0 = p.dist0 || 0;
    let expect = 0;
    for (let m = -1; m * U.s - d0 < pr.span + U.s; m++) {
      const d = p.inward ? m * U.s - U.travelIn - d0 : U.travelOut + m * U.s - d0;
      if (d > 0.02 && d < pr.span - 0.02 && pulseV(U, d, pr.span, p.inward, d0, p.cont) > 0.4) expect++;
    }
    if (peaks !== expect) { bad++; console.log(`  e${p.edge} frame0: crests ${peaks}, expected ${expect} (span ${pr.span.toFixed(2)}, dist0 ${d0.toFixed(3)}, inward ${p.inward})`); }
  });
  console.log(`${f}: declared ${P.length} items, ${seen.size} edges, dup [${dup.join(",")}], crest arms checked ${arms}, mismatches ${bad} -> ${dup.length === 0 && bad === 0 ? "P6 PASS" : "P6 FAIL"}`);
}
