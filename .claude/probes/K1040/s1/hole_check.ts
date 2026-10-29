// K1040 S1c, F5: one hole's pixels under S1b's, F2's and the current form B.
// Prints top (−1 = paper), ink, the winning term and the fade bits in a window
// of pixels around (i, j) at the given dpr, as q5holes.ts maps them.
// Run: npx vite-node .claude/probes/K1040/s1/hole_check.ts <scene> <dpr> <i> <j> [radius=2]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
import { FormB as FormBS1b } from "./form_b_s1b";
import { FormB as FormBF2 } from "./form_b_f2";

const sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const [name = "muse_hash", ds = "2", is = "0", js = "0", rs = "2"] = process.argv.slice(2);
const dpr = Number(ds);
const ci = Number(is);
const cj = Number(js);
const rad = Number(rs);
const KN = ["none", "foot", "tA", "tB", "V", "arc"];
const s = JSON.parse(readFileSync(join(sceneDir, `${name}.json`), "utf8")) as FieldScene;
s.look.ctrlArc ??= 0.47;
const [a, b, c, d, e, f] = s.camera.worldToCss;
const det = a * d - b * c;
const world = (x: number, y: number): [number, number] => {
  const u = x / dpr - e;
  const v = y / dpr - f;
  return [(d * u - c * v) / det, (-b * u + a * v) / det];
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const forms: [string, any][] = [
  ["S1b", new FormBS1b(s, { dpr })],
  ["F2", new FormBF2(s, { dpr })],
  ["now", new FormB(s, { dpr })],
];
for (const [tag, fb] of forms) {
  const rows: string[] = [];
  for (let j = cj - rad; j <= cj + rad; j++) {
    const cells: string[] = [];
    for (let i = ci - rad; i <= ci + rad; i++) {
      const [x, y] = world(i + 0.5, j + 0.5);
      const r = fb.evalPoint(x, y);
      cells.push(r.top < 0 ? "  paper  " : `${String(r.top).padStart(3)} ${KN[r.term?.kind ?? 0].padEnd(4)}${r.fade ? "f" + r.fade : ""}`.padEnd(9));
    }
    rows.push(`  j ${j}: ${cells.join("|")}`);
  }
  const [x0, y0] = world(ci + 0.5, cj + 0.5);
  const r0 = fb.evalPoint(x0, y0);
  const t0 = r0.term;
  console.log(`${tag}: at (${ci}, ${cj}) = (${x0.toFixed(4)}, ${y0.toFixed(4)}): top ${r0.top} ink ${r0.ink.toFixed(4)} fade ${r0.fade} term ${t0 ? `${KN[t0.kind]} chain ${t0.chain} corner ${t0.corner}` : "-"}`);
  for (const l of rows) console.log(l);
}
