// K1040 S1f F3: form B's ink against the oracle's in a window, before (S1e's
// final, form_b_s1e_c1.ts) and after (S1f's default), at b_crop.ts's samples
// (device px at dpr 2, the oracle at K883's mapping, cr 3). Per build: px
// where form B's ink and the oracle's differ by more than 0.5, px of partial
// ink (0.1 < ink < 0.9) where the oracle has fill and no ink, and the mean ink;
// then the px where the two builds' ink differs (> 0.02, > 0.5).
// The window's centre is a world point, or arm:<i>: that arm's root.
// Run: npx vite-node .claude/probes/K1040/s1/win_ink.ts <scene> <x> <y> [halfWorld=0.6]
//      npx vite-node .claude/probes/K1040/s1/win_ink.ts <scene> arm:<i> [halfWorld=0.6]
import { readFileSync } from "node:fs";
import { FieldModel, cornerRadius, type OracleParams } from "../../../../src/render/field/oracle";
import { FormB } from "../../../../src/render/field/form_b";
import { pointAt } from "../../../../src/render/field/geom";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB as FormBC1 } from "./form_b_s1e_c1";

const argv = process.argv.slice(2);
const name = argv[0];
const sc = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8")) as FieldScene;
sc.look.ctrlArc ??= 0.47;
const h0 = sc.look.halfWidth;
const mapping: OracleParams = { rRound: 0, rOf: (_j, _i, th, st) => (st === "round" ? cornerRadius(3, h0, th) : 0), spans: "k883", crMax: 3 };
const m = new FieldModel(sc, mapping);
const b1 = new FormBC1(sc, { dpr: 2 }) as unknown as FormB;
const b2 = new FormB(sc, { dpr: 2 });
let X: number;
let Y: number;
let hs: string;
let where: string;
if (argv[1].startsWith("arm:")) {
  const ai = Number(argv[1].slice(4));
  const a = b2.arms[ai];
  const P = pointAt(b2.polys[a.pi], a.sR);
  X = P.x;
  Y = P.y;
  hs = argv[2] ?? "0.6";
  where = `arm ${ai}'s root (j ${a.j}, c${a.pi}, L ${b1.arms[ai].L.toFixed(3)} -> ${a.L.toFixed(3)}, Lcut ${b1.arms[ai].Lcut.toFixed(3)} -> ${a.Lcut.toFixed(3)})`;
} else {
  X = Number(argv[1]);
  Y = Number(argv[2]);
  hs = argv[3] ?? "0.6";
  where = "";
}
const half = Number(hs);
const n = Math.max(8, Math.round(2 * half * b2.ppuDev));
const px = (2 * half) / n;
const inks: Float64Array[] = [];
for (const [bt, fb] of [["c1", b1], ["q", b2]] as const) {
  let diff = 0;
  let partial = 0;
  let sum = 0;
  const ink = new Float64Array(n * n);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const x = X - half + (i + 0.5) * px;
      const y = Y - half + (j + 0.5) * px;
      const r = fb.evalPoint(x, y);
      const o = m.evalPoint(x, y, false);
      const ob = o.ink ? 1 : 0;
      if (Math.abs(r.ink - ob) > 0.5) diff++;
      if (!o.ink && o.inside && r.ink > 0.1 && r.ink < 0.9) partial++;
      sum += r.ink;
      ink[j * n + i] = r.ink;
    }
  inks.push(ink);
  console.log(`${name} (${X.toFixed(3)}, ${Y.toFixed(3)}) ±${half}${where ? ` ${where}` : ""}: ${bt}: ${n}x${n} px; |ink − oracle| > 0.5 on ${diff}; partial ink in the oracle's fill ${partial}; mean ink ${(sum / (n * n)).toFixed(4)}`);
}
let d02 = 0;
let d5 = 0;
let mx = 0;
for (let o = 0; o < n * n; o++) {
  const dv = Math.abs(inks[0][o] - inks[1][o]);
  if (dv > 0.02) d02++;
  if (dv > 0.5) d5++;
  mx = Math.max(mx, dv);
}
console.log(`  c1 against q: ink differs by > 0.02 on ${d02} px, > 0.5 on ${d5}; max ${mx.toFixed(4)}`);
