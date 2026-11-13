// K1362 t2 measurement: per-part timing on s18 drag frames + how many
// vertices / corners move bit-wise between consecutive drag frames.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362t2_measure.ts
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTables, type GfTables } from "../../../src/render/gpu_field/tables";
import type { FieldScene } from "../../../src/render/field/scene";

const here = dirname(fileURLToPath(import.meta.url));
const dragRoot = join(here, "..", "K1247", "out", "s18", "drag");
const load = (p: string): FieldScene => {
  const s = JSON.parse(readFileSync(p, "utf8")) as FieldScene;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
};
const q = (a: number[], f: number): number => {
  const b = [...a].sort((x, y) => x - y);
  return b[Math.min(b.length - 1, Math.floor(f * b.length))];
};

for (const nm of ["def", "muse_hash", "fat"]) {
  const dir = join(dragRoot, nm);
  const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
  const scenes = files.map((f) => load(join(dir, f)));
  const parts: Record<string, number[]> = { vtx: [], pins: [], arms: [], corners: [], bins: [], total: [] };
  let prev: GfTables | null = null;
  let prevScene: FieldScene | null = null;
  const vSameFrac: number[] = [];
  const cornerSame: number[] = [];
  let nK0 = 0;
  for (const sc of scenes) {
    const T = buildTables(sc, { aa: 0.5 / (sc.camera.pxPerUnit * 2) });
    for (const k of Object.keys(parts)) parts[k].push(T.ms[k as keyof typeof T.ms]);
    if (prev) {
      // vertex bit-identity fraction (vx, vy jointly per vertex)
      let same = 0; const n = Math.min(T.nV, prev.nV);
      for (let i = 0; i < n; i++) if (T.vx[i] === prev.vx[i] && T.vy[i] === prev.vy[i]) same++;
      vSameFrac.push(same / Math.max(1, n));
      // corner identity by (kJ, kA, kB): outputs bit-equal?
      const key = (t: GfTables, i: number) => `${t.kJ[i]}:${t.kA[i]}:${t.kB[i]}`;
      const pm = new Map<string, number>();
      for (let i = 0; i < prev.nK; i++) pm.set(key(prev, i), i);
      let cs = 0; let tot = 0;
      for (let i = 0; i < T.nK; i++) {
        const j = pm.get(key(T, i)); if (j === undefined) continue; tot++;
        if (T.kCx[i] === prev.kCx[j] && T.kCy[i] === prev.kCy[j] && T.kR[i] === prev.kR[j] && T.kSa[i] === prev.kSa[j] && T.kSb[i] === prev.kSb[j]) cs++;
      }
      cornerSame.push(tot ? cs / tot : 1);
      nK0 = T.nK;
    }
    prev = T; prevScene = sc;
  }
  console.log(`${nm}: frames=${scenes.length} nV=${prev!.nV} nA=${prev!.nA} nK=${nK0} chains=${prevScene!.chains.length} junctions=${prevScene!.junctions.length}`);
  for (const k of Object.keys(parts)) {
    const a = parts[k];
    console.log(`  ${k}: p50=${q(a, 0.5).toFixed(2)} p90=${q(a, 0.9).toFixed(2)}`);
  }
  if (vSameFrac.length) console.log(`  vertex bit-same frac: p50=${q(vSameFrac, 0.5).toFixed(3)} p10=${q(vSameFrac, 0.1).toFixed(3)} min=${Math.min(...vSameFrac).toFixed(3)}`);
  if (cornerSame.length) console.log(`  corner output bit-same frac (matched keys): p50=${q(cornerSame, 0.5).toFixed(3)} p10=${q(cornerSame, 0.1).toFixed(3)} min=${Math.min(...cornerSame).toFixed(3)}`);
}
