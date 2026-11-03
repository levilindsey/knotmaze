// K1040 S3: the hairpin fixture at a few points: form B against labelAt with
// and without the merge scan (foldR 0).
//   node scripts/run_node.mjs .claude/probes/K1040/s3/fixdbg.ts [r] [dz]
import { FormB, type Piece } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";
import { buildLabelB, labelAt } from "../../../../src/render/field/label_b";
import { labelVerdict, sampleOf } from "../../../../src/render/field/label_b_verdict";

const r = Number(process.argv[2] ?? 0.6);
const dz = Number(process.argv[3] ?? 0.03);
function line(x0: number, y0: number, x1: number, y1: number, step = 0.2): number[] {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  return out;
}
const pts = line(-8, r, 0, r);
const m = Math.max(4, Math.round((Math.PI * r) / 0.2));
for (let i = 1; i < m; i++) {
  const a = Math.PI / 2 - (Math.PI * i) / m;
  pts.push(r * Math.cos(a), r * Math.sin(a));
}
pts.push(...line(0, -r, -8, -r));
const sc: FieldScene = {
  version: 1,
  name: "fixdbg",
  source: { kind: "synthetic", generator: "fixdbg", params: {} },
  camera: { worldToCss: [10, 0, 0, -10, 100, 100], pxPerUnit: 10, dpr: 1, viewport: [200, 200] },
  look: { halfWidth: 1, band: 0.38, cornerRoundShare: 1, cuspRadius: 3, depthAmp: 1, depthWindow: 3, paper: "#fff", ink: "#000" },
  chains: [{ id: 0, closed: false, pts, z: new Array(pts.length / 2).fill(0).map((_, i) => dz * i) }],
  crossings: [],
  junctions: [],
  deadEnds: [],
} as unknown as FieldScene;
const fb = new FormB(sc);
const T = buildLabelB(fb);
const T0 = { ...T, foldR: 0 };
console.log(`h ${fb.h} sigma ${fb.sigma.toFixed(3)} K ${fb.K} foldR ${T.foldR.toFixed(3)}`);
for (const [x, y] of [[-1, 0.2], [-1, -0.2], [-0.5, 0.0], [0.2, 0.1], [-2, 0.3]]) {
  const P: Piece[] = [];
  const fade = fb.pieces(x, y, P);
  const e = fb.evalPoint(x, y);
  const a = labelAt(fb, T, x, y);
  const b = labelAt(fb, T0, x, y);
  const va = labelVerdict(fb, T, x, y, sampleOf(a));
  const vb = labelVerdict(fb, T0, x, y, sampleOf(b));
  console.log(`(${x}, ${y}) pieces ${P.map((A) => `s ${A.s.toFixed(2)} d ${A.d.toFixed(2)} key ${A.key.toFixed(3)} selfW ${A.selfW.toFixed(2)}`).join(" | ")} fade ${fade}`);
  console.log(`   form B s ${e.s.toFixed(3)} key ${e.key.toFixed(3)} code ${e.top}; scan s ${a?.s?.toFixed(3)} key ${a?.key?.toFixed(3)} -> ${va.cls}:${va.why}; no scan s ${b?.s?.toFixed(3)} key ${b?.key?.toFixed(3)} -> ${vb.cls}:${vb.why}`);
}
