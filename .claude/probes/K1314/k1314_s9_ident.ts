// K1314 s9: is outline.ts's frame() output identical to master's (out/s9/v_mst.ts) over a motion cycle?
// Compares every frame's whole result (pieces, regions, diagnostics...) as JSON, per scene; prints the first
// differing frame and key. Run with EXP9J=off to compare with the root ramp switched off.
//   node scripts/run_node.mjs .claude/probes/K1314/k1314_s9_ident.ts [scenes=def,muse_hash,g41_user_tw64] [n=12]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as CUR from "../../../src/render/outline/outline";
import * as MST from "./out/s9/v_mst";

type Mod = typeof CUR;
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const n = +arg("n", "12");
for (const name of arg("scenes", "def,muse_hash,g41_user_tw64").split(",")) {
  const S = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as CUR.SceneIn;
  (S.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  const h = S.look.halfWidth;
  const perturb = (A: number): CUR.SceneIn => {
    const sc = JSON.parse(JSON.stringify(S)) as CUR.SceneIn;
    for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) {
      const x = c.pts[i]; const y = c.pts[i + 1];
      c.pts[i] = x + A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4));
      c.pts[i + 1] = y + A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3));
    }
    return sc;
  };
  const a = CUR.structure(S); const b = (MST as unknown as Mod).structure(S);
  let bad = "";
  for (let k = 0; k < n && !bad; k++) {
    const sc = perturb((k / Math.max(1, n - 1)) * 0.5 * h);
    const ra = CUR.frame(a, sc) as unknown as Record<string, unknown>; const rb = (MST as unknown as Mod).frame(b, sc) as unknown as Record<string, unknown>;
    for (const key of new Set([...Object.keys(ra), ...Object.keys(rb)])) {
      if (JSON.stringify(ra[key]) !== JSON.stringify(rb[key])) { bad = `frame ${k} key ${key}`; break; }
    }
  }
  console.log(`${name}: ${bad ? "DIFFERS at " + bad : `identical over ${n} frames`}`);
}
