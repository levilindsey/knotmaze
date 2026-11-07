// K1240 S3c Done 2: moving frames (moved vs fresh endpoints) and the
// rigid-motion invariance check on def.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/s3b_move.ts [scene,...]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, frame, type SceneIn, type OutlineTable } from "./outline";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out", "s3d");
mkdirSync(outDir, { recursive: true });
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const ALL = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const names = process.argv[2] ? process.argv[2].split(",") : ALL;

function load(name: string): SceneIn {
  const s = JSON.parse(readFileSync(join(SCENE_DIR, `${name}.json`), "utf8")) as SceneIn;
  (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
  return s;
}
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
type P = OutlineTable["pieces"][number];
function compareGrouped(a: OutlineTable, b: OutlineTable, h: number): { maxEnd: number; onlyA: number; onlyB: number } {
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
  let maxEnd = 0; let onlyA = 0; let onlyB = 0;
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
      if (c.d > maxEnd) maxEnd = c.d;
    }
    onlyA += la.length - usedA.size;
    onlyB += lb.length - usedB.size;
  }
  return { maxEnd, onlyA, onlyB };
}

const rows: Record<string, unknown>[] = [];
for (const name of names) {
  const scene = load(name);
  const st = structure(scene);
  const row: Record<string, unknown> = { scene: name };
  for (const mult of [0.1, 0.5]) {
    const sp = perturb(scene, mult * scene.look.halfWidth);
    const moved = frame(st, sp);
    // Snapshot moved geometry before the fresh structure exists (the
    // fresh frame uses its own buffers, but copy to be safe).
    const movedCopy: OutlineTable = JSON.parse(JSON.stringify({ pieces: moved.pieces.map((p) => ({ kind: p.kind, chain: p.chain, side: p.side, corner: p.corner, pts: Array.from(p.pts as unknown as ArrayLike<number>) })) })) as OutlineTable;
    const fresh = frame(structure(sp), sp);
    const cm = compareGrouped(movedCopy, fresh, scene.look.halfWidth);
    row[`move${mult}h`] = { maxEnd: +cm.maxEnd.toFixed(4), onlyMoved: cm.onlyA, onlyFresh: cm.onlyB, piecesMoved: moved.pieces.length, piecesFresh: fresh.pieces.length };
  }
  rows.push(row);
  console.log(`${name}: ${JSON.stringify(row["move0.1h"])} ${JSON.stringify(row["move0.5h"])}`);
}

// Rigid motion on def: translate (0.37h, -0.21h), rotate 7 degrees.
{
  const scene = load("def");
  const h = scene.look.halfWidth;
  const st = structure(scene);
  const t1 = frame(st, scene);
  const snap = t1.pieces.map((p) => ({ kind: p.kind, chain: p.chain, side: p.side, corner: p.corner, region: p.region, pts: Float64Array.from(p.pts as unknown as ArrayLike<number>), cpts: Float64Array.from(p.cpts as unknown as ArrayLike<number>) }));
  const th = (7 * Math.PI) / 180;
  const co = Math.cos(th); const si = Math.sin(th);
  const dx = 0.37 * h; const dy = -0.21 * h;
  const sp = JSON.parse(JSON.stringify(scene)) as SceneIn;
  const rot = (x: number, y: number): [number, number] => [co * x - si * y + dx, si * x + co * y + dy];
  for (const c of sp.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const [x, y] = rot(c.pts[i], c.pts[i + 1]); c.pts[i] = x; c.pts[i + 1] = y; }
  for (const j of sp.junctions) { const [x, y] = rot(j.c[0], j.c[1]); j.c = [x, y]; }
  const t2 = frame(st, sp);
  let maxD = 0; let worst = "";
  if (t2.pieces.length !== snap.length) console.log(`rigid: piece count differs ${snap.length} -> ${t2.pieces.length}`);
  for (let i = 0; i < Math.min(snap.length, t2.pieces.length); i++) {
    const a = snap[i]; const b = t2.pieces[i];
    if (a.kind !== b.kind || a.chain !== b.chain || a.side !== b.side || a.corner !== b.corner) { console.log(`rigid: piece ${i} identity differs`); continue; }
    const n = Math.min(a.pts.length, b.pts.length);
    if (a.pts.length !== b.pts.length) { console.log(`rigid: piece ${i} point count differs ${a.pts.length / 2} -> ${b.pts.length / 2}`); continue; }
    for (let k = 0; k < n; k += 2) {
      const [ex, ey] = rot(a.pts[k], a.pts[k + 1]);
      const d = Math.hypot(ex - b.pts[k], ey - b.pts[k + 1]);
      if (d > maxD) { maxD = d; worst = `piece ${i} pt ${k / 2}`; }
    }
  }
  console.log(`rigid def: maxDiff=${maxD.toExponential(3)} at ${worst} (tolerance 1e-6)`);
  rows.push({ scene: "def_rigid", maxDiff: +maxD.toExponential(3), worst });
}
writeFileSync(join(outDir, "s3c_move.json"), JSON.stringify(rows, null, 1));
console.log("wrote s3c_move.json");
