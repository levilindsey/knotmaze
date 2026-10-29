// K1040 S1d: one junction's corners in form B (src) beside the oracle's, at a
// recording frame or a scene. Form B: arms (export index ei), θ, r0/r1/r, V,
// q, the tangent points, V's feet (dV / L) and ω. Oracle (FieldModel, K883's
// mapping at cr 3, as scenes.ts): armIdx, θ, the rule's r and the solved r,
// V, q, tA/tB, its why. Missing form B corners print as "none".
// Run: npx vite-node .claude/probes/K1040/s1/corner_cmp.ts <seq>:<frame>|<scene> <junction>
// Env: PARAMS (JSON merged into FormBParams).
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, type FormBParams } from "../../../../src/render/field/form_b";
import { FieldModel, cornerRadius, type OracleParams } from "../../../../src/render/field/oracle";

const [spec = "muse_flow:4", js = "11"] = process.argv.slice(2);
const extra = JSON.parse(process.env.PARAMS ?? "{}") as FormBParams;
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
const h = s.look.halfWidth;
const J = Number(js);
const fb = new FormB(s, extra);
const mp: OracleParams = { rRound: 0, rOf: (_j, _i, th, st) => (st === "round" ? cornerRadius(3, h, th) : 0), spans: "k883", crMax: 3 };
const om = new FieldModel(s, mp);
const f = (v: number | undefined, d = 4) => (v === undefined || !Number.isFinite(v) ? String(v) : v.toFixed(d));
const p = (v: [number, number] | undefined) => (v ? `(${f(v[0])}, ${f(v[1])})` : "-");
const jn = s.junctions[J];
console.log(`${spec} junction ${J} at ${p(jn.c as [number, number])}, h ${h}, arms ${jn.arms.map((a, i) => `${i}:c${a.chain}/${a.kind}/s${f(a.s, 3)}`).join(" ")}`);
console.log("form B arms:");
for (const ai of fb.armsOf[J] ?? []) {
  const a = fb.arms[ai];
  console.log(`  arm ${ai} ei ${a.ei} chain-poly ${a.pi} ${a.kind} dir ${a.dir} sR ${f(a.sR, 3)} L ${f(a.L)} Lcut ${f(a.Lcut)} ang ${f(a.ang, 3)}`);
}
console.log("form B corners:");
for (const c of fb.corners as unknown as Record<string, number>[]) {
  if (c.j !== J) continue;
  const A = fb.arms[c.a];
  const B = fb.arms[c.b];
  console.log(`  ${c.a}(ei ${A.ei})/${c.b}(ei ${B.ei}) th ${f(c.theta)} r0 ${f(c.r0)} r1 ${f(c.r1)} r ${f(c.r)} room ${f(c.room)} V (${f(c.Vx)}, ${f(c.Vy)}) q (${f(c.qx)}, ${f(c.qy)}) tA (${f(c.tax)}, ${f(c.tay)}) tB (${f(c.tbx)}, ${f(c.tby)}) dV ${f(c.dVa)}/${f(A.L)} ${f(c.dVb)}/${f(B.L)} w ${f(c.omega, 3)}`);
}
console.log("oracle corners:");
for (const c of om.corners) {
  if (c.junction !== J) continue;
  console.log(`  ${c.armIdxA}/${c.armIdxB} ok ${c.ok} th ${f(c.theta)} rule ${f(c.rRule)} r ${f(c.r)} V ${p(c.V)} q ${p(c.q)} tA ${p(c.tA)} tB ${p(c.tB)} sV ${f(c.sVA, 3)}/${f(c.sVB, 3)} noV ${c.noV ?? false} why ${c.why}`);
}
