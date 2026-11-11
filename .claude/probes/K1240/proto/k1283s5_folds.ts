// K1283 s5: where muse_hash's fold cuts land near a crossing (needs the widened __foldDiag, a local edit).
import { readFileSync } from "node:fs";
import * as O from "./outline";
const nm = process.argv[2] ?? "muse_hash";
const sc = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${nm}.json`, "utf8")) as O.SceneIn;
(sc.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
const tb = O.frame(O.structure(sc), sc) as unknown as { diagnostics: string[] };
const pts: Record<string, [number, number]> = { x58: [0.779, 15.743], x22: [31.97, 6.676] };
const folds = tb.diagnostics.filter((d) => d.startsWith("fold"));
console.log(`${nm}: ${folds.length} folds`);
for (const d of folds) {
  const m = /xy=([-\d.]+),([-\d.]+)/.exec(d); if (!m) continue;
  const x = +m[1]; const y = +m[2]; let tagd = "";
  for (const [k, [px, py]] of Object.entries(pts)) { const r = Math.hypot(x - px, y - py); if (r < 3) tagd += ` <${k} r=${r.toFixed(2)}>`; }
  console.log(d + tagd);
}
