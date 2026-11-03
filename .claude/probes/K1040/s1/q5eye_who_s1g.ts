// K1040 S1g step 5: who owns the 50 px that q5eye_s1g.ts found changed in
// muse_hash between S1f's final on the two changes ({"dEdge":"skip",
// "rootBand":0}) and the d-edge only ({"rootBand":0}), at the right edge of the
// 161 px box around the group 108 eye. Over a wider box (so the region is not
// clipped): the changed px's (top s1f -> top near) pairs, and every corner whose
// r changed between the two, with its group, r / h and distance to the region.
// Run: npx vite-node .claude/probes/K1040/s1/q5eye_who_s1g.ts   (writes out/s1g/q5eye_who.txt)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB, OWN } from "../../../../src/render/field/form_b";

const HERE = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a8056cde26bf07a6a/.claude/probes/K1040/s1";
const sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const out: string[] = [];
const s = JSON.parse(readFileSync(`${sceneDir}/muse_hash.json`, "utf8")) as FieldScene;
s.look.ctrlArc ??= 0.47;
const [a, b, c, d, e, f] = s.camera.worldToCss;
const det = a * d - b * c;
const world = (x: number, y: number): [number, number] => {
  const u = x - e;
  const v = y - f;
  return [(d * u - c * v) / det, (-b * u + a * v) / det];
};
// The box: x 820..900, y 470..610 (q5eye's region was x 846..857, y 493..582).
const [X0, X1, Y0, Y1] = [820, 900, 470, 610];
const W = X1 - X0 + 1;
const H = Y1 - Y0 + 1;
const fbs = new FormB(s, { dpr: 1, dEdge: "skip", rootBand: 0 });
const fbn = new FormB(s, { dpr: 1, rootBand: 0 });
const pairs = new Map<string, number>();
let n = 0;
let [sx, sy] = [0, 0];
let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
const tag = (t: number): string => (t < 0 ? "paper" : t >= OWN ? "own" : `g${t}`);
for (let j = 0; j < H; j++)
  for (let i = 0; i < W; i++) {
    const [x, y] = world(X0 + i + 0.5, Y0 + j + 0.5);
    const rs = fbs.evalPoint(x, y);
    const rn = fbn.evalPoint(x, y);
    if (Math.abs(rs.ink - rn.ink) <= 0.01) continue;
    n++;
    [sx, sy] = [sx + x, sy + y];
    [x0, y0, x1, y1] = [Math.min(x0, X0 + i), Math.min(y0, Y0 + j), Math.max(x1, X0 + i), Math.max(y1, Y0 + j)];
    const k = `${tag(rs.top)} ink ${rs.ink >= 0.5 ? 1 : 0} -> ${tag(rn.top)} ink ${rn.ink >= 0.5 ? 1 : 0}`;
    pairs.set(k, (pairs.get(k) ?? 0) + 1);
  }
const [cx, cy] = n ? [sx / n, sy / n] : [NaN, NaN];
out.push(`muse_hash, px box x ${X0}..${X1}, y ${Y0}..${Y1}: ${n} px with |Δink| > 0.01, in px x ${x0}..${x1}, y ${y0}..${y1}; their world centroid (${cx.toFixed(3)}, ${cy.toFixed(3)})`);
for (const [k, v] of [...pairs].sort((p, q) => q[1] - p[1])) out.push(`  ${v} px: ${k}`);
const h = s.look.halfWidth;
const key = (q: { j: number; a: number; b: number }) => `${q.j}/${q.a}/${q.b}`;
const ns = new Map(fbn.corners.map((q) => [key(q), q]));
out.push(`corners whose r changed (|Δr| > 1e-6 h), nearest first, within 4 world of the centroid:`);
const rows: [number, string][] = [];
for (const q of fbs.corners) {
  const qn = ns.get(key(q));
  const rn = qn ? qn.r : NaN;
  if (qn && Math.abs(q.r - rn) <= 1e-6 * h) continue;
  const dist = Math.hypot(q.Vx - cx, q.Vy - cy);
  if (!(dist < 4)) continue;
  rows.push([dist, `  j${q.j} ${q.a}-${q.b} group ${q.g}: r ${(q.r / h).toFixed(3)}h -> ${(rn / h).toFixed(3)}h, V (${q.Vx.toFixed(3)}, ${q.Vy.toFixed(3)}) at ${dist.toFixed(3)}`]);
}
for (const [, l] of rows.sort((p, q) => p[0] - q[0])) out.push(l);
if (!rows.length) out.push("  none");
mkdirSync(`${HERE}/out/s1g`, { recursive: true });
writeFileSync(`${HERE}/out/s1g/q5eye_who.txt`, out.join("\n") + "\n");
console.log(out.slice(0, 30).join("\n"));
