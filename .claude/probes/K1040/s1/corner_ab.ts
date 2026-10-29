// K1040 S1d: one junction's corners under the committed form B (form_b_head.ts,
// a copy of HEAD's src/render/field/form_b.ts made with
// `git show HEAD:src/render/field/form_b.ts`, imports pointed at src) beside
// the working tree's: r0, r, ω, V, q and the tangent points, per corner.
// Run: npx vite-node .claude/probes/K1040/s1/corner_ab.ts <scene>|<seq>:<frame> <junction>
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
import { FormB as FormBHead } from "./form_b_head";

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
const f = (v: number | undefined, d = 4) => (v === undefined || !Number.isFinite(v) ? String(v) : v.toFixed(d));
for (const [name, fb] of [
  ["head", new FormBHead(s)],
  ["src", new FormB(s)],
] as const) {
  console.log(`${name}:`);
  const arms = fb.arms as unknown as { ei: number; L: number }[];
  for (const c of fb.corners as unknown as Record<string, number>[]) {
    if (c.j !== J) continue;
    console.log(`  ei ${arms[c.a].ei}/${arms[c.b].ei} th ${f(c.theta)} r0 ${f(c.r0)} r ${f(c.r)} w ${f(c.omega, 3)} V (${f(c.Vx)}, ${f(c.Vy)}) q (${f(c.qx)}, ${f(c.qy)}) tA (${f(c.tax)}, ${f(c.tay)}) tB (${f(c.tbx)}, ${f(c.tby)}) sA ${f(c.sA, 3)} sB ${f(c.sB, 3)}`);
  }
}
