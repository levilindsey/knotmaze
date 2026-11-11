// K1283 s3: the table's pieces with a point within R of (x, y).
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1283s3_near.ts [scene=muse_hash] [x=20.68] [y=1.91] [R=0.9]
import * as O from "../../../../src/render/outline/outline";
import { loadScene } from "./k1279_census";
const [nm = "muse_hash", xs = "20.68", ys = "1.91", rs = "0.9"] = process.argv.slice(2); const PX = Number(xs); const PY = Number(ys); const PR = Number(rs);
const scene = loadScene(nm);
const t = O.frame(O.structure(scene), scene);
t.pieces.forEach((p, i) => { const np = p.pts.length / 2; let near = false; for (let k = 0; k < np; k++) if (Math.hypot(p.pts[2 * k] - PX, p.pts[2 * k + 1] - PY) < PR) near = true; if (near) console.log(`${i} ${p.kind} chain ${p.chain} side ${p.side} s ${p.s0.toFixed(3)}..${p.s1.toFixed(3)} np ${np} corner ${p.corner ?? ""} first (${p.pts[0].toFixed(3)}, ${p.pts[1].toFixed(3)})`); });
