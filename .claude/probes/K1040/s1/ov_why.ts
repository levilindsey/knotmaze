// K1040 S1d: what sets a corner's overlap gate ω. Repeats form B's ov loop
// (src/render/field/form_b.ts, "The overlap gate") for junction J's corners
// and prints, per arm, the candidate that comes nearest q: its s, its arm
// distance, its arc distance from the foot and R − d (ω = ss(0,1,1 − ov/ovw)).
// Run: npx vite-node .claude/probes/K1040/s1/ov_why.ts <scene>|<seq>:<frame> <junction>
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
import { candidates, dS, type Cand, type Poly, type SegGrid } from "../../../../src/render/field/geom";

const [spec = "g41_ring_tw42", js = "1"] = process.argv.slice(2);
const loadScene = (sp: string): FieldScene => {
  if (!sp.includes(":")) return JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${sp}.json`, "utf8")) as FieldScene;
  const [sq, fi] = sp.split(":");
  const lines = gunzipSync(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/k868-s3a/.claude/probes/S3a/seq13/${sq}.jsonl.gz`)).toString("utf8").split("\n").filter(Boolean);
  for (let k = 1; k < lines.length; k++) {
    const fr = JSON.parse(lines[k]) as { i: number; scene: FieldScene };
    if (fr.i === Number(fi)) return fr.scene;
  }
  throw new Error(`frame ${sp} not found`);
};
const s = loadScene(spec);
s.look.ctrlArc ??= 0.47;
const J = Number(js);
const fb = new FormB(s);
type FbX = { grid: SegGrid; polys: Poly[]; arms: { pi: number; ei: number; L: number; sR: number; dir: number }[]; armDist: (ai: number, s: number) => number; ovw: number; h: number };
const X = fb as unknown as FbX;
const f = (v: number, d = 4) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
for (const c of fb.corners as unknown as Record<string, number>[]) {
  if (c.j !== J) continue;
  const R = X.h + c.r;
  const parts: string[] = [];
  for (const [ai, sF] of [
    [c.a, c.sA],
    [c.b, c.sB],
  ] as const) {
    const arm = X.arms[ai];
    const p = X.polys[arm.pi];
    const out: Cand[] = [];
    candidates(X.grid, c.qx, c.qy, R, out, arm.pi);
    let best: Cand | null = null;
    let bestOv = -Infinity;
    for (const cd of out) {
      const dd = X.armDist.call(fb, ai, cd.s);
      if (dd < 0 || dd > arm.L) continue;
      if (Math.abs(dS(p, cd.s, sF)) < 0.5 * X.h) continue;
      if (R - cd.d > bestOv) {
        bestOv = R - cd.d;
        best = cd;
      }
    }
    parts.push(best ? `arm ei ${arm.ei}: s ${f(best.s, 3)} armDist ${f(X.armDist.call(fb, ai, best.s), 3)} (L ${f(arm.L, 3)}) from foot ${f(dS(p, best.s, sF), 3)} R−d ${f(bestOv, 5)}` : `arm ei ${arm.ei}: none`);
  }
  console.log(`ei ${X.arms[c.a].ei}/${X.arms[c.b].ei} r ${f(c.r)} R ${f(R)} ovw ${f(X.ovw, 5)} w ${f(c.omega, 3)}; ${parts.join("; ")}`);
}
