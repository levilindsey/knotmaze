// K1040 S1d: what inks the pixels across a b_rate breach, under S1d's base
// (form_b_s1d_base.ts, 2dacd08d), S1d F2 (form_b_s1d_f2.ts, a2978ed7) and the
// working tree: per point on a short line, ink, top, the winning term
// (kind, chain, s, corner, D, w) and the fade bits; then the junctions within
// 1 of the point, with form B's arms there (kind, through) and its corners.
// Run: npx vite-node .claude/probes/K1040/s1/bend_why.ts <scene> <x> <y> <dx> <dy> [n=9] [len=0.01]
import { readFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, TERM_NAMES } from "../../../../src/render/field/form_b";
import { FormB as FormBBase } from "./form_b_s1d_base";
import { FormB as FormBF2 } from "./form_b_s1d_f2";

const [name = "g41_ring_tw42", xs = "9.375", ys = "0.9778", dxs = "0", dys = "1", ns = "9", ls = "0.01"] = process.argv.slice(2);
const s = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
s.look.ctrlArc ??= 0.47;
const [x0, y0, dx, dy, n, len] = [xs, ys, dxs, dys, ns, ls].map(Number);
const f = (v: number, d = 4) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
for (const [tag, fb] of [
  ["base", new FormBBase(s)],
  ["f2", new FormBF2(s)],
  ["src", new FormB(s)],
] as const) {
  console.log(`${tag}:`);
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1) - 0.5) * len;
    const r = fb.evalPoint(x0 + dx * u, y0 + dy * u);
    const t = r.term;
    console.log(`  u ${f(u, 5)} ink ${f(r.ink, 3)} top ${r.top} fade ${r.fade} term ${t ? `${TERM_NAMES[t.kind]} chain ${t.chain} s ${f(t.s, 3)} corner ${t.corner} D ${f(t.D)} w ${f(t.w, 3)}` : "none"}`);
  }
  const arms = fb.arms as unknown as { j: number; ei: number; kind: string; pi: number; dir: number; sR: number; L: number }[];
  for (let ji = 0; ji < s.junctions.length; ji++) {
    const jn = s.junctions[ji];
    if (Math.hypot(jn.c[0] - x0, jn.c[1] - y0) > 1) continue;
    const as = arms.filter((a) => a.j === ji).map((a) => `ei ${a.ei} ${a.kind} pi ${a.pi} dir ${a.dir} sR ${f(a.sR, 3)} L ${f(a.L, 3)}`);
    const cs = (fb.corners as unknown as Record<string, number>[]).filter((c) => c.j === ji).map((c) => `${arms[c.a].ei}/${arms[c.b].ei} r ${f(c.r)} w ${f(c.omega, 3)}`);
    console.log(`  junction ${ji} at (${f(jn.c[0])}, ${f(jn.c[1])}) scene arms ${jn.arms.map((a) => `${a.chain}/${a.kind}/${a.dir}`).join(" ")}; arms: ${as.join("; ")}; corners: ${cs.join("; ") || "none"}`);
  }
}