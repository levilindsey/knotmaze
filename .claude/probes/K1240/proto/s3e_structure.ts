// K1240 S3e Done 1: structure(S) deep-equals structure(S') (0.1h on all
// 12 scenes, 0.5h on def/ring/fat), and every junction's listed arm
// order is its cyclic (atan2-ascending) order, so corners[k] joins
// arms k and k+1. Run: node scripts/run_node.mjs .claude/probes/K1240/proto/s3e_structure.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, buildOutlineFull, type SceneIn } from "./outline";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out", "s3e");
mkdirSync(outDir, { recursive: true });
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
function load(name: string): SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}
function perturb(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) {
    const x = c.pts[i]; const y = c.pts[i + 1];
    c.pts[i] = x + A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4));
    c.pts[i + 1] = y + A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3));
  }
  return sc;
}
function firstDiff(a: unknown, b: unknown, path: string): string {
  if (JSON.stringify(a) === JSON.stringify(b)) return "";
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return `${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`;
  const ka = Object.keys(a as object); const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return `${path}: keys ${ka.length} vs ${kb.length}`;
  for (const k of ka) { const d = firstDiff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`); if (d) return d; }
  return `${path}: differs`;
}

let fails = 0;
const rows: Record<string, unknown>[] = [];
for (const name of ALL) {
  const scene = load(name);
  const st = structure(scene);
  // Arm order: builder's angular sort (debug arms carry ang in ei order)
  // must be a cyclic rotation of the listed order, ascending.
  const dbg = buildOutlineFull(scene).debug as { arms: { ji: number; ang: number }[] };
  let notCyclic = 0; let reversed = 0; let junctions = 0;
  scene.junctions.forEach((j, ji) => {
    const eis: number[] = [];
    dbg.arms.forEach((a, ai) => { if (a.ji === ji) eis.push(ai); });
    if (eis.length < 2) return;
    junctions++;
    const sorted = eis.slice().sort((x, y) => dbg.arms[x].ang - dbg.arms[y].ang);
    // position of each arm in listed order = its index in eis (arms pushed in ei order)
    const listedPos = new Map(eis.map((ai, pos) => [ai, pos]));
    const seq = sorted.map((ai) => listedPos.get(ai)!);
    const n = seq.length;
    const isRot = (dir: number): boolean => { for (let r = 0; r < n; r++) { let okAll = true; for (let k = 0; k < n; k++) if (seq[k] !== (((r + dir * k) % n) + n) % n) { okAll = false; break; } if (okAll) return true; } return false; };
    if (isRot(1)) return;
    if (isRot(-1)) { reversed++; return; }
    notCyclic++;
  });
  const row: Record<string, unknown> = { scene: name, junctions, notCyclic, reversed };
  for (const mult of [0.1, 0.5]) {
    if (mult === 0.5 && !["def", "ring", "fat"].includes(name)) continue;
    const st2 = structure(perturb(scene, mult * scene.look.halfWidth));
    const eq = JSON.stringify(st) === JSON.stringify(st2);
    if (!eq) { fails++; row[`diff${mult}`] = firstDiff(st, st2, "$"); }
    row[`eq${mult}`] = eq;
  }
  if (notCyclic > 0) fails++;
  rows.push(row);
  console.log(`${name}: eq0.1=${row["eq0.1"]} eq0.5=${row["eq0.5"] ?? "-"} junctions=${junctions} notCyclic=${notCyclic} reversed=${reversed}${row["diff0.1"] ? " diff: " + row["diff0.1"] : ""}${row["diff0.5"] ? " diff05: " + row["diff0.5"] : ""}`);
}
writeFileSync(join(outDir, "structure_check.json"), JSON.stringify(rows, null, 1));
console.log(fails ? `${fails} FAILURES` : "STRUCTURE IS THE DIAGRAM (all deep-equal, all junctions cyclic)");
process.exit(fails ? 1 : 0);
