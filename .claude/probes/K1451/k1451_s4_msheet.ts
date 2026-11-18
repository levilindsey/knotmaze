// K1451 s4: a mirror sheet of window rules (columns from env COLS, default m,clip,s2,armL_hin), one row per spot,
// chain colour under ink as k1451_spot.ts. GF_NOCLIP=1 required.
//   $env:GF_NOCLIP='1'; node scripts/run_node.mjs .claude/probes/K1451/k1451_s4_msheet.ts <out.png> [span=4] [P=200] <scene:x:y[:FL]>...
import { buildModel } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { buildTables } from "../../../src/render/gpu_field/tables.ts";
import { GfEval } from "../../../src/render/gpu_field/eval.ts";
import { writePng } from "../K1314/k1314_crops.ts";
import { rule, keyMember, type Rule } from "./k1451_s4_rules.ts";
const args = process.argv.slice(2); const out = args[0]; const span = +args[1]; const P = +args[2]; const specs = args.slice(3);
const cols = (process.env.COLS ?? "m,clip,s2,armL_hin").split(",");
const GAP = 4; const W = cols.length * (P + GAP); const H = specs.length * (P + GAP);
const img = new Uint8Array(W * H * 3).fill(24);
const cache = new Map<string, any>();
specs.forEach((spec, si) => {
  const [nm, xs, ys, fl] = spec.split(":"); const X = +xs, Y = +ys; const key = `${nm}:${fl ?? ""}`;
  if (!cache.has(key)) {
    const sc = buildModel(nm).scene as any; const aa = 0.5 / (sc.camera.pxPerUnit * 2); const T: any = buildTables(sc, { aa, home: true });
    const Ev: any = {};
    for (const c of cols) {
      const [a, b] = c === "m" ? [new Float64Array(T.pinWL.length).fill(T.win), new Float64Array(T.pinWR.length).fill(T.win)] : rule(T, c as Rule);
      Ev[c] = new GfEval({ ...T, pinWL: a, pinWR: b }); if (c.endsWith("+k")) keyMember(Ev[c]); if (fl !== undefined) Ev[c].fadeLength = +fl;
    }
    cache.set(key, { T, Ev });
  }
  const { T, Ev } = cache.get(key);
  cols.forEach((c, ci) => {
    const E = Ev[c];
    for (let r = 0; r < P; r++) for (let k = 0; k < P; k++) {
      const x = X + ((k + 0.5) / P - 0.5) * span * T.h, y = Y + ((r + 0.5) / P - 0.5) * span * T.h;
      const v = E.eval(x, y);
      const base = v.cov <= 0 ? [235, 230, 215] : [130 + ((v.chain * 53) % 100), 110 + ((v.chain * 97) % 100), 150 + ((v.chain * 31) % 90)];
      const bg = [235, 230, 215]; const i = 3 * ((si * (P + GAP) + r) * W + ci * (P + GAP) + k);
      for (let q = 0; q < 3; q++) { const f = bg[q] * (1 - v.cov) + base[q] * v.cov; img[i + q] = Math.round(f * (1 - v.ink) + 20 * v.ink); }
    }
  });
});
writePng(out, img, W, H);
console.log(`wrote ${out} (${W}x${H}; columns ${cols.join(" | ")})`);
