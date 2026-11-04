// K1139 probe table: at every junction a lit arm hands its light to another,
// the CPU mirror's (kPulseV, kymo.mjs) values on both sides of the boundary.
//   node table.mjs <stand.json>...
// Per boundary (parent arm P ends at vertex F, child arm Q starts there, both
// declared): the phase step (Q.dist0 - (P.dist0 + P.world)), P's cont, and
// over 64 clock times in one period the largest jump in brightness across F
// (|v_P(span) - v_Q(0)|) and in crest position. A pulse that carries through
// reads step 0, cont 1 and jumps near 0.
import { readFileSync } from "node:fs";
import { uniforms, pulseV } from "./kymo.mjs";

for (const f of process.argv.slice(2)) {
  const j = JSON.parse(readFileSync(f, "utf8"));
  const P = j.decl.pulses, reach = j.decl.reach, sp = j.decl.spacing;
  const rows = [];
  for (const p of P) {
    if (p.inward) continue; // the arrival and the back region: their boundaries are read from the child side
    for (const q of P) {
      if (q === p || q.near !== p.far || q.inward) continue;
      if ((p.dist0 || 0) + p.world >= reach) continue;
      const step = (q.dist0 || 0) - ((p.dist0 || 0) + p.world);
      let dv = 0;
      for (let i = 0; i < 64; i++) {
        const U = uniforms(100 + (i / 64) * (sp / 1.6), sp, reach);
        const a = pulseV(U, p.world - 1e-6, p.world, false, p.dist0 || 0, p.cont);
        const b = pulseV(U, 1e-6, q.world, false, q.dist0 || 0, q.cont);
        dv = Math.max(dv, Math.abs(a - b));
      }
      rows.push(`  e${p.edge} -> e${q.edge} at ${p.far}: step ${step.toFixed(3)}  cont ${p.cont ? 1 : 0}  max |dv| ${dv.toFixed(3)}`);
    }
  }
  // Back region: an inward arm whose junction end is the far end of the arrival.
  const arr = P.find((p) => p.inward && p.near === j.decl.head);
  if (arr) for (const q of P) {
    if (q === arr || q.near !== arr.far) continue;
    rows.push(`  back e${q.edge} at ${arr.far}: ${q.inward ? "inward (flows on toward you)" : "OUTWARD (a source: light leaves the junction both ways)"}  dist0 ${(q.dist0 || 0).toFixed(3)} vs arrival span ${arr.world.toFixed(3)}`);
  }
  console.log(`${f} (head ${j.decl.head}, reach ${reach}):`);
  console.log(rows.length ? rows.join("\n") : "  (no lit boundary inside the reach)");
}
