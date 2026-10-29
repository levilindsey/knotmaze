// K1040 S1c, step 4: can two consecutive frames of a pops sequence be
// interpolated? Same chains (ids, closed, sample counts), crossings (passes'
// chains, over, emergent), junctions (ids, arms' chain, dir, kind) and dead
// ends. Prints, per sequence, the pairs that match and why the others don't.
// Run: npx vite-node .claude/probes/K1040/s1/seq_struct.ts [seq,...]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import type { FieldScene } from "../../../../src/render/field/scene";

const seqDir = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/k868-s3a/.claude/probes/S3a/seq13";
const seqs = (process.argv[2] ?? "def_drag,def_flow,muse_drag,muse_flow").split(",");
export function readSeq(name: string): FieldScene[] {
  const lines = gunzipSync(readFileSync(join(seqDir, `${name}.jsonl.gz`))).toString("utf8").split("\n").filter(Boolean);
  const out: FieldScene[] = [];
  let prev = "";
  for (let k = 1; k < lines.length; k++) {
    const fr = JSON.parse(lines[k]) as { scene: FieldScene };
    const key = JSON.stringify(fr.scene.chains);
    if (key === prev) continue;
    prev = key;
    fr.scene.look.ctrlArc ??= 0.47;
    out.push(fr.scene);
  }
  return out;
}
/** Why A and B cannot be interpolated, or "" when they can. */
export function mismatch(A: FieldScene, B: FieldScene): string {
  if (A.chains.length !== B.chains.length) return "chain count";
  for (let i = 0; i < A.chains.length; i++) {
    const a = A.chains[i];
    const b = B.chains[i];
    if (a.id !== b.id || a.closed !== b.closed) return "chain id";
    if (a.pts.length !== b.pts.length) return "chain samples";
  }
  if (A.crossings.length !== B.crossings.length) return "crossing count";
  for (let i = 0; i < A.crossings.length; i++) {
    const a = A.crossings[i];
    const b = B.crossings[i];
    if (a.a.chain !== b.a.chain || a.b.chain !== b.b.chain || a.over !== b.over || !!a.emergent !== !!b.emergent) return "crossing";
  }
  if (A.junctions.length !== B.junctions.length) return "junction count";
  for (let i = 0; i < A.junctions.length; i++) {
    const a = A.junctions[i];
    const b = B.junctions[i];
    if (a.id !== b.id || a.arms.length !== b.arms.length) return "junction";
    for (let k = 0; k < a.arms.length; k++) if (a.arms[k].chain !== b.arms[k].chain || a.arms[k].dir !== b.arms[k].dir || a.arms[k].kind !== b.arms[k].kind) return "junction arms";
    if (JSON.stringify(a.corners ?? null) !== JSON.stringify(b.corners ?? null)) return "corner styles";
  }
  if (A.deadEnds.length !== B.deadEnds.length) return "dead ends";
  return "";
}
if (!process.env.SEQ_STRUCT_LIB) {
  for (const s of seqs) {
    const F = readSeq(s);
    const why: Record<string, number> = {};
    for (let k = 0; k + 1 < F.length; k++) {
      const m = mismatch(F[k], F[k + 1]) || "ok";
      why[m] = (why[m] ?? 0) + 1;
    }
    console.log(`${s}: ${F.length} frames, pairs ${JSON.stringify(why)}`);
  }
}