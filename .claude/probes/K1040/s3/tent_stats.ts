// K1040 S3c: the tent pass's sizes per scene at dpr 2: h in device px, the
// segment lengths, the joints' turn angles, free ends, fills (r in px and
// the inner arc's angle), to choose the facet counts.
//   node scripts/run_node.mjs .claude/probes/K1040/s3/tent_stats.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FormB } from "../../../../src/render/field/form_b";
import type { FieldScene } from "../../../../src/render/field/scene";
import { buildLabelB } from "../../../../src/render/field/label_b";

const sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const SCENES = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const q = (a: number[], f: number) => (a.length ? a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor(f * a.length))] : NaN);
for (const name of SCENES) {
  const s = JSON.parse(readFileSync(join(sceneDir, `${name}.json`), "utf8")) as FieldScene;
  s.look.ctrlArc ??= 0.47;
  const fb = new FormB(s, { dpr: 2 });
  const T = buildLabelB(fb);
  const ppd = fb.ppuDev;
  const segL: number[] = [];
  const turn: number[] = [];
  let ends = 0;
  let zero = 0;
  for (const p of fb.polys) {
    const dir: [number, number][] = [];
    for (let k = 0; k < p.nseg; k++) {
      const kb = k + 1 === p.n ? 0 : k + 1;
      const dx = p.x[kb] - p.x[k];
      const dy = p.y[kb] - p.y[k];
      const l = Math.hypot(dx, dy);
      segL.push(l * ppd);
      if (!(l > 0)) zero++;
      dir.push(l > 0 ? [dx / l, dy / l] : [1, 0]);
    }
    for (let k = 0; k < p.nseg; k++) {
      if (!p.closed && k === 0) continue;
      const a = dir[k > 0 ? k - 1 : p.nseg - 1];
      const b = dir[k];
      turn.push((Math.atan2(Math.abs(a[0] * b[1] - a[1] * b[0]), a[0] * b[0] + a[1] * b[1]) * 180) / Math.PI);
    }
    if (!p.closed) ends += 2;
  }
  const fr: number[] = [];
  const fang: number[] = [];
  for (const ci of T.fillCorner) {
    const c = fb.corners[ci];
    fr.push(c.r * ppd);
    const ax = c.tax - c.qx, ay = c.tay - c.qy, bx = c.tbx - c.qx, by = c.tby - c.qy;
    fang.push((Math.atan2(Math.abs(ax * by - ay * bx), ax * bx + ay * by) * 180) / Math.PI);
  }
  const f = (v: number) => v.toFixed(2);
  console.log(
    `${name.padEnd(22)} h ${f(fb.h * ppd)}px segs ${T.nInst} zero ${zero} L p05/p50/max ${f(q(segL, 0.05))}/${f(q(segL, 0.5))}/${f(Math.max(...segL))}px ` +
      `turn p50/p95/p99/max ${f(q(turn, 0.5))}/${f(q(turn, 0.95))}/${f(q(turn, 0.99))}/${f(Math.max(...turn))}deg >90 ${turn.filter((t) => t > 90).length} ends ${ends} ` +
      `fills ${T.nFills} r p50/max ${f(q(fr, 0.5))}/${f(Math.max(0, ...fr))}px arc p50/max ${f(q(fang, 0.5))}/${f(Math.max(0, ...fang))}deg`,
  );
}
