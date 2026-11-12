// K1314 s3: the through-pass corners (diagram corners flagged thru) per scene: how many solve (ok),
// how many die and why, and each ok one's theta, r and the fillet's reach into the paper
// (r (1/sin(theta/2) - 1), in screen px at the census camera when --cam is given).
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s3_thru.ts <scene>[,<scene>...] [--list] [--cam=<px per unit>]
import { buildModel } from "./k1314_census";

const args = process.argv.slice(2);
const names = (args.find((a) => !a.startsWith("--")) ?? "g41_ring_tw42").split(",");
const cam = Number(args.find((a) => a.startsWith("--cam="))?.slice(6) ?? 0);
for (const nm of names) {
  const m = buildModel(nm); const st = m.st; const tb = m.table;
  let ok = 0; const dead = new Map<string, number>(); const rows: string[] = [];
  st.corners.forEach((dc, ci) => {
    if (dc.thru !== 1) return;
    const c = tb.corners[ci];
    if (c.ok) {
      ok++;
      const dev = c.r * (1 / Math.sin(c.theta / 2) - 1);
      rows.push(`  ${c.junction} chain ${c.aChain} th ${((c.theta * 180) / Math.PI).toFixed(1)} r ${(c.r / tb.h).toFixed(3)} h, reach ${(dev / tb.h).toFixed(3)} h${cam ? ` (${(dev * cam).toFixed(1)} px)` : ""} V (${c.Vx.toFixed(3)},${c.Vy.toFixed(3)}) q (${c.qx.toFixed(3)},${c.qy.toFixed(3)})`);
    } else dead.set(c.why ?? "?", (dead.get(c.why ?? "?") ?? 0) + 1);
  });
  console.log(`${nm}: thru corners ${ok + [...dead.values()].reduce((a, b) => a + b, 0)}, ok ${ok}, dead ${[...dead].map(([k, v]) => `${k} ${v}`).join(", ")}`);
  if (args.includes("--list")) for (const r of rows) console.log(r);
}
