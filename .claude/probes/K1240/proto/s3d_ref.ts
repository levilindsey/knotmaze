// K1240 S3d: the reference is frame()'s whole output from the restored
// decide-once code (73558807's frame) for all 12 scenes, still and moved
// 0.1h (S3's smooth field, same seeds as s3d_exact's perturb).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/s3d_ref.ts dump
//   node scripts/run_node.mjs .claude/probes/K1240/proto/s3d_ref.ts check
// dump writes out/s3d/ref_<scene>.json and ref_move0.1_<scene>.json;
// check recomputes and compares every piece, point and radius within
// 1e-6 (identity fields exactly).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, frame, type SceneIn, type OutlineTable } from "./outline";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out", "s3d");
mkdirSync(outDir, { recursive: true });
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const mode = process.argv[2] === "check" ? "check" : "dump";

function load(name: string): SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}
function perturb(scene: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(scene)) as SceneIn;
  for (const c of sc.chains) {
    for (let i = 0; i + 1 < c.pts.length; i += 2) {
      const x = c.pts[i]; const y = c.pts[i + 1];
      c.pts[i] = x + A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4));
      c.pts[i + 1] = y + A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3));
    }
  }
  return sc;
}
function snap(t: OutlineTable): unknown {
  return {
    h: t.h, W: t.W,
    pieces: t.pieces.map((p) => ({ kind: p.kind, chain: p.chain, side: p.side, s0: p.s0, s1: p.s1, region: p.region, corner: p.corner, pts: Array.from(p.pts as unknown as ArrayLike<number>), cpts: Array.from(p.cpts as unknown as ArrayLike<number>) })),
    regions: t.regions.map((r) => ({ id: r.id, ownerChain: r.ownerChain, group: r.group, hole: r.hole, pieces: r.pieces.slice(), pts: Array.from(r.pts as unknown as ArrayLike<number>) })),
    faces: t.faces.map((f) => ({ ownerChain: f.ownerChain, group: f.group, hole: f.hole, sample: [f.sample[0], f.sample[1]], pts: Array.from(f.pts as unknown as ArrayLike<number>) })),
    corners: t.corners.map((c) => ({ junction: c.junction, aChain: c.aChain, bChain: c.bChain, ok: c.ok, style: c.style, theta: c.theta, r: c.r, Vx: c.Vx, Vy: c.Vy, qx: c.qx, qy: c.qy, tax: c.tax, tay: c.tay, tbx: c.tbx, tby: c.tby, why: c.why ?? null })),
    cuts: t.cuts.map((c) => ({ crossing: c.crossing, chain: c.chain, side: c.side, s: c.s, x: c.x, y: c.y, overChain: c.overChain })),
    diagnostics: t.diagnostics.slice(),
  };
}
let fails = 0;
function diff(a: unknown, b: unknown, path: string, st: { max: number; at: string }): void {
  if (typeof a === "number" && typeof b === "number") {
    const d = Math.abs(a - b);
    if (d > st.max) { st.max = d; st.at = path; }
    if (d > 1e-6) fails++;
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) { fails++; console.log(`FAIL ${path}: length ${a.length} -> ${b.length}`); return; }
    for (let i = 0; i < a.length; i++) diff(a[i], b[i], `${path}[${i}]`, st);
    return;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    for (const k of Object.keys(a as Record<string, unknown>)) diff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`, st);
    return;
  }
  if (a !== b) { fails++; console.log(`FAIL ${path}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`); }
}
for (const name of ALL) {
  const scene = load(name);
  const st = structure(scene);
  const cases: { tag: string; sc: SceneIn }[] = [
    { tag: `ref_${name}`, sc: scene },
    { tag: `ref_move0.1_${name}`, sc: perturb(scene, 0.1 * scene.look.halfWidth) },
  ];
  for (const cs of cases) {
    const table = frame(st, cs.sc);
    const s = snap(table);
    const file = join(outDir, `${cs.tag}.json`);
    if (mode === "dump") {
      writeFileSync(file, JSON.stringify(s));
      console.log(`dumped ${cs.tag} pieces=${table.pieces.length} corners=${table.corners.length}`);
    } else {
      if (!existsSync(file)) { fails++; console.log(`FAIL ${cs.tag}: no reference file`); continue; }
      const ref = JSON.parse(readFileSync(file, "utf8")) as unknown;
      const st2 = { max: 0, at: "" };
      const before = fails;
      diff(ref, s, cs.tag, st2);
      console.log(`${cs.tag}: maxDiff=${st2.max.toExponential(3)} at ${st2.at || "-"} ${fails === before ? "OK" : "FAIL"}`);
    }
  }
}
console.log(fails ? `${fails} FAILURES` : "REFERENCE HOLDS");
if (fails) process.exitCode = 1;
