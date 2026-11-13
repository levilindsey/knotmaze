// K1362 s6 (from s5): summarize a bench JSON (desktop or phone): cmp (diffPx / unwritten / mirror), the route's tile shares and
// CPU ms, and timings (sync4 minus the empty variant's, frame1 as measured).
//   node .claude/probes/K1362/k1362s7_sum.mjs <out/s7/desk_<label>.json | out/s7/phone_<label>.json>
import { readFileSync } from "node:fs";
const J = JSON.parse(readFileSync(process.argv[2], "utf8"));
const benches = J.benches ?? [J];
for (const b of benches) {
  const name = b.cfg?.name ?? "";
  for (const [sc, rec] of Object.entries(b.scenes ?? {})) {
    const lines = [];
    const em = rec.pass?.empty?.sync4?.p50 ?? 0;
    for (const [vn, r] of Object.entries(rec.pass ?? {})) {
      const parts = [vn];
      for (const m of ["sync4", "frame1"]) if (r[m]) parts.push(`${m} ${(r[m].p50 - (m === "sync4" ? em : 0)).toFixed(2)}${r[m + "_clk"] ? " @" + r[m + "_clk"] : ""}`);
      if (r.route) parts.push(`route ${r.route.share.join("/")} empty ${(r.route.empty / r.route.total).toFixed(3)} cpu ${r.route.ms.p50}ms`);
      const c = rec.cmp?.[vn]; if (c) parts.push(`diff ${c.diffPx} unwr ${c.unwritten}`);
      const mi = rec.mirror?.[vn]; if (mi) parts.push(`mirror ${JSON.stringify(mi)}`);
      if (r.glError) parts.push(`glErr ${r.glError}`);
      if (parts.length > 1) lines.push("  " + parts.join(" | "));
    }
    console.log(`${name} ${sc} px ${rec.px}`);
    for (const l of lines) console.log(l);
  }
}
