// K1314 s9: every cut fold of a scene's frame (cutFoldsC), with the arm roots within 3 W of its legs and
// the junction centre's distance. Needs the temporary __k1314dbg hook in cutFoldsC's compaction loop.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s9_folds.ts <scene> [--near=x:y:r] [--roots]
// --roots keeps only folds with a root near a leg; --near keeps folds whose cut lies within r of (x, y).
import { buildModel } from "./k1314_census";

const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const nm = args.find((a) => !a.startsWith("--")) ?? "muse_hash";
const dbg: string[] = []; (globalThis as unknown as { __k1314dbg?: string[] }).__k1314dbg = dbg;
const m = buildModel(nm);
(globalThis as unknown as { __k1314dbg?: string[] }).__k1314dbg = undefined;
const near = opt("near")?.split(":").map(Number);
const seen = new Set<string>();
for (const line of dbg) {
  if (seen.has(line)) continue; seen.add(line);
  const xm = / X (\S+) (\S+) /.exec(line); const x = +xm![1]; const y = +xm![2];
  if (near && Math.hypot(x - near[0], y - near[1]) > near[2]) continue;
  if (args.includes("--roots") && !line.includes("|ai")) continue;
  const js = [...line.matchAll(/ j(\d+) /g)].map((q) => +q[1]);
  const dj = js.map((ji) => { const c = m.scene.junctions[ji].c; return `dJ${ji}=${Math.hypot(x - c[0], y - c[1]).toFixed(3)}`; }).join(" ");
  console.log(`${line} ${dj}`);
}
console.log(`${nm}: ${seen.size} fold lines, h ${m.scene.look.halfWidth} W ${m.table.W}`);
