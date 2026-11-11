import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join } from "node:path";
import { structure, frame, wDbg, setCfDebug, cfTrace, wFacDbg, type SceneIn } from "./outline";
// K1247 s16: one corner's growth trace (wDbg rows + cfTrace) over frames F-1, F.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s16_wtrace.ts <F> <corner> [rec]
const dir = join(import.meta.dirname, "..", "out", "s15", "rec_" + (process.argv[4] ?? "def"));
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const L = (f: string): SceneIn => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as SceneIn; (s.look as any).ctrlArc ??= 0.47; return s; };
const F = +(process.argv[2] ?? 1); const CI = +(process.argv[3] ?? 369);
const facRows: number[][] = [];
const sc = files.slice(0, F + 1).map(L);
const st = structure(sc[0]);
for (let f = 0; f <= F; f++) {
  const on = f >= F - 1;
  wDbg.ci = on ? CI : -1; wDbg.rows.length = 0; setCfDebug(on ? CI : -1);
  facRows.length = 0; wFacDbg.on = on;
  const push0 = wDbg.rows.push.bind(wDbg.rows); (wDbg.rows as any).push = (...x: number[][]) => { facRows.push([...wFacDbg.last]); wFacDbg.last = []; return push0(...x); };
  frame(st, sc[f]);
  if (!on) continue;
  console.log(`--- f${f}`);
  wDbg.rows.forEach((r, i) => console.log(r.map((v) => (typeof v === "number" ? +v.toFixed(5) : v)).join(" ") + "   fac " + (facRows[i] ?? []).map((v) => +v.toFixed(4)).join(" ")));
  for (const t of cfTrace) console.log("  " + t);
}
