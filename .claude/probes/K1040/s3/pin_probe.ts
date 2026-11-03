// S3b: find the pin's fixture. A tee whose end arm sits above the through:
// where the end arm reaches (h <= d < h + aa) but does not cover, the reach
// rule named it; the cover rule names the through. Usage:
// node scripts/run_node.mjs .claude/probes/K1040/s3/pin_probe.ts [z1] [corner]
import { FormB } from "../../../../src/render/field/form_b";
import type { FieldScene, SceneArm, SceneJunction } from "../../../../src/render/field/scene";
import { buildLabelB, labelAt } from "../../../../src/render/field/label_b";
import { labelVerdict, sampleOf } from "../../../../src/render/field/label_b_verdict";

function line(x0: number, y0: number, x1: number, y1: number, step = 0.2): number[] {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n);
  return out;
}
function ray(cx: number, cy: number, deg: number, r0: number, r1: number, step = 0.2): number[] {
  const a = (deg * Math.PI) / 180;
  return line(cx + r0 * Math.cos(a), cy + r0 * Math.sin(a), cx + r1 * Math.cos(a), cy + r1 * Math.sin(a), step);
}
const dc = Number(process.argv[2] ?? 2.5);
const corner = (process.argv[3] ?? "round") as "round" | "sharp";
const dw = Number(process.argv[4] ?? 3);
const chains = [line(-10, 0, 10, 0), ray(0, 0, 90, 0, 10), line(-10, dc, 10, dc)];

const arms: SceneArm[] = [
  { chain: 0, s: 10, dir: 1, kind: "through" },
  { chain: 1, s: 0, dir: 1, kind: "end" },
  { chain: 0, s: 10, dir: -1, kind: "through" },
];
const junctions: SceneJunction[] = [{ id: "j0", c: [0, 0], arms, corners: arms.map(() => ({ style: corner, pinned: false })) }];
const sc: FieldScene = {
  version: 1,
  name: "pin_probe",
  source: { kind: "synthetic", generator: "pin_probe", params: {} },
  camera: { worldToCss: [10, 0, 0, -10, 100, 100], pxPerUnit: 10, dpr: 1, viewport: [200, 200] },
  look: { halfWidth: 1, band: 0.38, cornerRoundShare: 1, cuspRadius: 3, depthAmp: 1, depthWindow: dw, paper: "#fff", ink: "#000" },
  chains: chains.map((pts, id) => ({ id, closed: false, pts, z: new Array(pts.length / 2).fill(0) })),
  crossings: [{ a: { chain: 1, s: dc }, b: { chain: 2, s: 10 }, over: "a" }],
  junctions,
  deadEnds: [],
};
for (const labelBy of ["reach", "cover"] as const) {
  const fb = new FormB(sc, { labelBy });
  const T = buildLabelB(fb);
  const counts: Record<string, number> = {};
  const ex: string[] = [];
  for (let y = -3; y <= 3; y += 0.05)
    for (let x = -3; x <= 3; x += 0.05) {
      const v = labelVerdict(fb, T, x, y, sampleOf(labelAt(fb, T, x, y)));
      const k = v.why ? `${v.cls}:${v.why}` : v.cls;
      counts[k] = (counts[k] ?? 0) + 1;
      if (v.cls === "DEFECT" && ex.length < 4) ex.push(`(${x.toFixed(2)},${y.toFixed(2)}) ${v.why} ref top ${v.ref.top} chain ${v.ref.chain} key ${v.ref.key.toFixed(4)}`);
    }
  console.log(`${labelBy} groups ${fb.groups?.length ?? "?"} ${JSON.stringify(counts)}`);
  for (const e of ex) console.log("  " + e);
  for (const [x, y] of [
    [1.02, 0.5],
    [1.03, 0.3],
    [-1.02, 0.5],
    [1.02, -0.5],
  ]) {
    const r = fb.evalPoint(x, y);
    const g = labelAt(fb, T, x, y);
    const PB: any[] = []; fb.pieces(x, y, PB as never); for (const A of PB) console.log(`    piece c${A.chain} s ${A.s.toFixed(3)} d ${A.d.toFixed(4)} z ${A.z.toFixed(4)} key ${A.key.toFixed(4)} surf ${A.surf} g ${A.g} ramp ${A.ramp?.toFixed?.(3)} selfW ${A.selfW?.toFixed?.(3)}`);
    console.log(`  P(${x},${y}) ref top ${r.top} chain ${r.chain} s ${r.s.toFixed(3)} key ${r.key.toFixed(4)} nSurf ${r.nSurf} | gpu code ${g.code} chain ${g.chain} s ${g.s.toFixed(3)} key ${g.key.toFixed(4)} fill ${g.fill}`);
  }
}
