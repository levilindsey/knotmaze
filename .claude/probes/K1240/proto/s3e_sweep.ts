// K1240 S3e Done 5 (sweep): 20 steps from S to the 0.5h S' on def, ring
// and fat. Per step, the largest piece motion (Hausdorff distance
// between that piece's polylines on consecutive steps; pieces matched
// by identity kind/chain/side/corner and nearest s0) and the largest
// particle motion, and where each is.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/s3e_sweep.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, frame, type SceneIn, type OutlineTable } from "./outline";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "out", "s3e");
mkdirSync(outDir, { recursive: true });
const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
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
function ptSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const ex = bx - ax; const ey = by - ay;
  const l2 = ex * ex + ey * ey;
  let t = l2 > 0 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0;
  t = Math.min(1, Math.max(0, t));
  return Math.hypot(ax + ex * t - px, ay + ey * t - py);
}
function ptPoly(px: number, py: number, pts: ArrayLike<number>): number {
  const n = pts.length / 2;
  if (n === 0) return Infinity;
  if (n === 1) return Math.hypot(pts[0] - px, pts[1] - py);
  let best = Infinity;
  for (let i = 0; i + 1 < n; i++) best = Math.min(best, ptSeg(px, py, pts[2 * i], pts[2 * i + 1], pts[2 * i + 2], pts[2 * i + 3]));
  return best;
}
function hausdorff(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let m = 0;
  for (let i = 0; i + 1 < a.length; i += 2) m = Math.max(m, ptPoly(a[i], a[i + 1], b));
  for (let i = 0; i + 1 < b.length; i += 2) m = Math.max(m, ptPoly(b[i], b[i + 1], a));
  return m;
}
type P = OutlineTable["pieces"][number];
function copyTable(t: OutlineTable): { pieces: (P & { pts: number[] })[] } {
  return { pieces: t.pieces.map((p) => ({ ...p, pts: Array.from(p.pts as unknown as ArrayLike<number>) })) };
}

const STEPS = 20;
const report: Record<string, unknown>[] = [];
for (const name of ["def", "ring", "fat"]) {
  const scene = load(name);
  const h = scene.look.halfWidth;
  const st = structure(scene);
  let prev: ReturnType<typeof copyTable> | null = null;
  let prevScene: SceneIn = scene;
  const rows: Record<string, unknown>[] = [];
  for (let step = 0; step <= STEPS; step++) {
    const sc = step === 0 ? scene : perturb(scene, (step / STEPS) * 0.5 * h);
    const copy = copyTable(frame(st, sc));
    if (prev) {
      // match by identity group + nearest first point
      const groups = new Map<string, number[]>();
      prev.pieces.forEach((p, i) => {
        const k = `${p.kind}|${p.chain}|${p.side}|${p.corner}`;
        const l = groups.get(k) ?? []; l.push(i); groups.set(k, l);
      });
      const used = new Set<number>();
      let bestH = 0; let where = ""; let matched = 0;
      for (const p of copy.pieces) {
        const k = `${p.kind}|${p.chain}|${p.side}|${p.corner}`;
        const cand = groups.get(k) ?? [];
        let bi = -1; let bd = Infinity;
        for (const i of cand) {
          if (used.has(i)) continue;
          const q = prev.pieces[i];
          const d = Math.hypot((p.pts[0] ?? 0) - (q.pts[0] ?? 0), (p.pts[1] ?? 0) - (q.pts[1] ?? 0)) + Math.abs(p.s0 - q.s0);
          if (d < bd) { bd = d; bi = i; }
        }
        if (bi < 0) continue;
        used.add(bi); matched++;
        const d = hausdorff(p.pts, prev.pieces[bi].pts);
        if (d > bestH) { bestH = d; where = `${p.kind} ch${p.chain} side${p.side} corner${p.corner} s=${p.s0.toFixed(2)} (prev piece ${bi})`; }
      }
      let bestP = 0; let whereP = "";
      sc.chains.forEach((c, ci) => {
        const pc = prevScene.chains[ci];
        for (let i = 0; i + 1 < c.pts.length; i += 2) {
          const d = Math.hypot(c.pts[i] - pc.pts[i], c.pts[i + 1] - pc.pts[i + 1]);
          if (d > bestP) { bestP = d; whereP = `chain ${ci} point ${i / 2}`; }
        }
      });
      rows.push({ step, maxPiece: +bestH.toFixed(5), where, maxParticle: +bestP.toFixed(5), whereP, pieces: copy.pieces.length, matched, unmatchedPrev: prev.pieces.length - used.size });
      console.log(`${name} step ${step}/${STEPS}: piece ${bestH.toFixed(4)} at ${where}; particle ${bestP.toFixed(4)} at ${whereP}; pieces=${copy.pieces.length} matched=${matched}`);
    }
    prev = copy;
    prevScene = sc;
  }
  report.push({ scene: name, rows });
}
writeFileSync(join(outDir, "sweep.json"), JSON.stringify(report, null, 1));
console.log("wrote sweep.json");
