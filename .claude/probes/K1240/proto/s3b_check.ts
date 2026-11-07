// K1240 S3 Done 1+2: frame(structure(S), S) against S2's builder, and
// moving frames frame(structure(S), S') against a fresh split on S'.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/s3_check.ts [scene,...] [--move]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOutlineS2, structure, frame, type SceneIn, type OutlineTable } from "./outline";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out", "s3b");
mkdirSync(outDir, { recursive: true });
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const move = process.argv.includes("--move");
const names = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const scenes = names.length ? names.flatMap((n) => n.split(",")) : ALL;

function load(name: string): SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}
function endpoints(t: OutlineTable): Map<string, [number, number]> {
  const m = new Map<string, [number, number]>();
  t.pieces.forEach((p, i) => {
    const n = p.pts.length / 2;
    if (n === 0) return;
    m.set(`${i}|${p.kind}|${p.chain}|${p.side}|${p.region}|${p.corner}|a`, [p.pts[0], p.pts[1]]);
    m.set(`${i}|${p.kind}|${p.chain}|${p.side}|${p.region}|${p.corner}|b`, [p.pts[2 * n - 2], p.pts[2 * n - 1]]);
  });
  return m;
}
function compareGrouped(a: OutlineTable, b: OutlineTable, h: number): { maxEnd: number; onlyA: number; onlyB: number; worst: string } {
  type P = OutlineTable["pieces"][number];
  const key = (p: P): string => `${p.kind}|${p.chain}|${p.side}|${p.corner}`;
  const group = (t: OutlineTable): Map<string, P[]> => {
    const m = new Map<string, P[]>();
    for (const p of t.pieces) { const k = key(p); const l = m.get(k) ?? []; l.push(p); m.set(k, l); }
    return m;
  };
  const ends = (p: P): [number, number, number, number] => {
    const n = p.pts.length / 2;
    return [p.pts[0], p.pts[1], p.pts[2 * n - 2], p.pts[2 * n - 1]];
  };
  const ga = group(a); const gb = group(b);
  let maxEnd = 0; let worst = ""; let onlyA = 0; let onlyB = 0;
  const keys = new Set([...ga.keys(), ...gb.keys()]);
  for (const k of keys) {
    const la = ga.get(k) ?? []; const lb = gb.get(k) ?? [];
    const cand: { d: number; i: number; j: number }[] = [];
    for (let i = 0; i < la.length; i++) {
      const ea = ends(la[i]);
      for (let j = 0; j < lb.length; j++) {
        const eb = ends(lb[j]);
        const d = Math.max(Math.hypot(ea[0] - eb[0], ea[1] - eb[1]), Math.hypot(ea[2] - eb[2], ea[3] - eb[3]));
        if (d <= h) cand.push({ d, i, j });
      }
    }
    cand.sort((x, y) => x.d - y.d);
    const usedA = new Set<number>(); const usedB = new Set<number>();
    for (const c of cand) {
      if (usedA.has(c.i) || usedB.has(c.j)) continue;
      usedA.add(c.i); usedB.add(c.j);
      if (c.d > maxEnd) { maxEnd = c.d; worst = `${k}|s${la[c.i].s0.toFixed(2)}`; }
    }
    onlyA += la.length - usedA.size;
    onlyB += lb.length - usedB.size;
  }
  return { maxEnd, onlyA, onlyB, worst };
}
function compare(a: OutlineTable, b: OutlineTable): { maxEnd: number; samePieces: boolean; onlyA: number; onlyB: number; worst: string } {
  const ea = endpoints(a); const eb = endpoints(b);
  let maxEnd = 0; let worst = "";
  let onlyA = 0; let onlyB = 0;
  for (const [k, v] of ea) {
    const w = eb.get(k);
    if (!w) { onlyA++; continue; }
    const d = Math.hypot(v[0] - w[0], v[1] - w[1]);
    if (d > maxEnd) { maxEnd = d; worst = k; }
  }
  for (const k of eb.keys()) if (!ea.has(k)) onlyB++;
  return { maxEnd, samePieces: a.pieces.length === b.pieces.length && onlyA === 0 && onlyB === 0, onlyA, onlyB, worst };
}
// Smooth perturbation field: low-frequency sinusoids, amplitude A.
function perturb(scene: SceneIn, A: number): SceneIn {
  const s = JSON.parse(JSON.stringify(scene)) as SceneIn;
  for (const c of s.chains) {
    for (let i = 0; i + 1 < c.pts.length; i += 2) {
      const x = c.pts[i]; const y = c.pts[i + 1];
      c.pts[i] = x + A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4));
      c.pts[i + 1] = y + A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3));
    }
  }
  return s;
}

const rows: Record<string, unknown>[] = [];
for (const name of scenes) {
  const scene = load(name);
  const t0 = performance.now();
  const st = structure(scene);
  const structureMs = performance.now() - t0;
  const t1 = performance.now();
  const split = frame(st, scene);
  const frameMs = performance.now() - t1;
  const ref = buildOutlineS2(scene);
  const cmp = compare(split, ref);
  const row: Record<string, unknown> = {
    scene: name, structureMs: +structureMs.toFixed(1), frameMs1: +frameMs.toFixed(1),
    pieces: split.pieces.length, refPieces: ref.pieces.length, samePieces: cmp.samePieces,
    maxEndDiff: +cmp.maxEnd.toExponential(3), onlySplit: cmp.onlyA, onlyRef: cmp.onlyB, worst: cmp.worst,
    regions: split.regions.length, refRegions: ref.regions.length, faces: split.faces.length,
    stats: st.stats, diag: split.diagnostics[0],
  };
  if (move) {
    for (const mult of [0.1, 0.5]) {
      const A = mult * scene.look.halfWidth;
      const sp = perturb(scene, A);
      const moved = frame(st, sp);
      const fresh = frame(structure(sp), sp);
      const cm = compareGrouped(moved, fresh, scene.look.halfWidth);
      row[`move${mult}h`] = { maxEnd: +cm.maxEnd.toExponential(3), onlyMoved: cm.onlyA, onlyFresh: cm.onlyB, piecesMoved: moved.pieces.length, piecesFresh: fresh.pieces.length, worst: cm.worst };
    }
  }
  rows.push(row);
  console.log(`${name}: same=${cmp.samePieces} maxEnd=${cmp.maxEnd.toExponential(2)} pieces=${split.pieces.length}/${ref.pieces.length} regions=${split.regions.length}/${ref.regions.length} structure=${structureMs.toFixed(0)}ms frame=${frameMs.toFixed(1)}ms eyeKept=${st.stats.eyeKept}/${st.stats.eyeTotal} maxKept/eye=${st.stats.eyeMaxKept} segX=${st.stats.segXKept}/${st.stats.segXTotal} nonUni=${st.stats.nonUniform} recMiss=${st.stats.recMissing}`);
  if (move) console.log(`  move: ${JSON.stringify(row["move0.1h"])} ${JSON.stringify(row["move0.5h"])}`);
}
writeFileSync(join(outDir, move ? "s3_check_move.json" : "s3_check.json"), JSON.stringify(rows, null, 1));
console.log("wrote", move ? "s3_check_move.json" : "s3_check.json");
