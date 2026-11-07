// K1240 S3e, Claude's check: does the drawn piece list stay fixed when the
// frame moves? frame(structure(S), S) against frame(structure(S), S') at
// 0.1h (all 12 scenes) and 0.5h (def, ring, fat): pieces per kind, the
// piece keys (kind|chain|side|corner) whose multiplicity differs, and the
// degenerate pieces (one point, or zero length) each frame emits.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/s3e_claude_pieces.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { structure, frame, type SceneIn, type OutlineTable } from "./outline";

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
type Sum = { n: number; run: number; arc: number; cap: number; degenerate: number };
function summarize(t: OutlineTable): { sum: Sum; keys: Map<string, number> } {
  const sum: Sum = { n: 0, run: 0, arc: 0, cap: 0, degenerate: 0 };
  const keys = new Map<string, number>();
  for (const p of t.pieces) {
    sum.n++; sum[p.kind]++;
    const k = `${p.kind}|${p.chain}|${p.side}|${p.corner}`;
    keys.set(k, (keys.get(k) ?? 0) + 1);
    const pts = p.pts as ArrayLike<number>;
    let len = 0;
    for (let i = 2; i + 1 < pts.length; i += 2) len += Math.hypot(pts[i] - pts[i - 2], pts[i + 1] - pts[i - 1]);
    if (pts.length <= 2 || len < 1e-9) sum.degenerate++;
  }
  return { sum, keys };
}
const rows: unknown[] = [];
for (const [mult, names] of [[0.1, ALL], [0.5, ["def", "ring", "fat"]]] as [number, string[]][]) {
  for (const name of names) {
    const S = load(name);
    const st = structure(S);
    const a = summarize(frame(st, S));
    const b = summarize(frame(st, perturb(S, mult * S.look.halfWidth)));
    let keyDiff = 0; let keysDiffering = 0;
    for (const k of new Set([...a.keys.keys(), ...b.keys.keys()])) {
      const d = Math.abs((a.keys.get(k) ?? 0) - (b.keys.get(k) ?? 0));
      keyDiff += d; if (d) keysDiffering++;
    }
    rows.push({ name, mult, S: a.sum, Sp: b.sum, keyDiff, keysDiffering });
    const f = (s: Sum) => `${s.n} (run ${s.run}, arc ${s.arc}, cap ${s.cap}; degenerate ${s.degenerate})`;
    console.log(`${name} @${mult}h: S ${f(a.sum)} | S' ${f(b.sum)} | keys differing ${keysDiffering}, pieces ${keyDiff}`);
  }
}
writeFileSync(join(outDir, "claude_pieces.json"), JSON.stringify(rows, null, 1));
