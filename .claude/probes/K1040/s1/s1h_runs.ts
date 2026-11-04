// K1114 S1h: ink runs along rows or columns through a site, before (S1f's final, form_b_s1f_q.ts) and after (today's
// defaults), at the 0.5 ink level, in device px from V at dpr 2. The `seen` figures of sites 05, 16, 17 and 18 were
// measured with it.
// Usage (from the worktree): ARGS="<scene> <X world> <Y world> <axis> <from>:<to>:<step> <halfH> <lo>:<hi>" \
//   npx.cmd vite-node .claude/probes/K1040/s1/s1h_runs.ts
// axis x = rows (the run varies in x; from:to:step are row offsets in device px from V), axis y = columns. Only runs that
// touch [lo, hi] (device px from V along the run's axis) are printed, and only for rows/columns where before and after
// differ. Example (site 17: the thread's run left of V moves right by up to 7 px):
//   ARGS="muse_hash 14.105 14.474 x -60:60:2 3 -30:30"
import { readFileSync } from "node:fs";
import type { FieldScene } from "../../../../src/render/field/scene";
import { FormB } from "../../../../src/render/field/form_b";
import { FormB as FormBOld } from "./form_b_s1f_q";

const [scene, X, Y, axis, range, halfH, win] = (process.env.ARGS ?? "").split(" ");
const sc = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${scene}.json`, "utf8")) as FieldScene;
sc.look.ctrlArc ??= 0.47;
const O = new FormBOld(sc, { dpr: 2 });
const N = new FormB(sc, { dpr: 2 });
const ppu = N.ppuDev;
const hdev = O.h * ppu;
const half = Math.round(Number(halfH) * hdev);
const x = Number(X);
const y = Number(Y);
const [r0, r1, rs] = range.split(":").map(Number);
const [lo, hi] = win.split(":").map(Number);
function runs(form: { evalPoint(x: number, y: number): { ink: number } }, o: number) {
  const out: [number, number][] = [];
  let a: number | null = null;
  for (let k = -half; k <= half; k++) {
    const px = axis === "x" ? x + k / ppu : x + o / ppu;
    const py = axis === "x" ? y + o / ppu : y + k / ppu;
    const ink = form.evalPoint(px, py).ink;
    if (ink > 0.5 && a === null) a = k;
    if (ink <= 0.5 && a !== null) {
      out.push([a, k - 1]);
      a = null;
    }
  }
  if (a !== null) out.push([a, half]);
  return out.filter(([s, e]) => e >= lo && s <= hi);
}
const fmt = (r: [number, number][]) => r.map(([s, e]) => `${s}..${e}`).join(" ");
console.log(`${scene} V (${X}, ${Y}) ${axis === "x" ? "rows" : "columns"} ${range}, h = ${hdev.toFixed(2)} px; ink > 0.5 runs touching [${lo}, ${hi}] (device px from V):`);
for (let o = r0; o <= r1; o += rs) {
  const a = fmt(runs(O, o));
  const b = fmt(runs(N, o));
  if (a !== b) console.log(`  ${String(o).padStart(4)}: before ${a.padEnd(18)} after ${b}`);
}
