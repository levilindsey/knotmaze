import { FormB } from "../../../src/render/field/form_b";
import * as O from "../../../src/render/outline/outline";
import { readFileSync } from "node:fs";
const nm = process.argv[2] ?? "def";
const s = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${nm}.json`, "utf8"));
s.look.ctrlArc ??= 0.47;
let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
for (const c of s.chains) for (let i = 0; i < c.pts.length; i += 2) { x0 = Math.min(x0, c.pts[i]); x1 = Math.max(x1, c.pts[i]); y0 = Math.min(y0, c.pts[i + 1]); y1 = Math.max(y1, c.pts[i + 1]); }
console.log(nm, "bbox", x0.toFixed(2), y0.toFixed(2), x1.toFixed(2), y1.toFixed(2), "h", s.look.halfWidth, "band", s.look.band, "paper", s.look.paper, "ink", s.look.ink, "chains", s.chains.length, "junctions", s.junctions.length, "crossings", s.crossings.length);
let t = Date.now(); const st = O.structure(s); const tb = O.frame(st, s); console.log("outline ms", Date.now() - t, "W", tb.W, "h", tb.h, "pieces", tb.pieces.length, "corners", tb.corners.length);
t = Date.now(); const fb = new FormB(JSON.parse(JSON.stringify(s)), { dpr: 2 }) as any; console.log("formB ctor ms", Date.now() - t);
t = Date.now(); let n = 0; for (let i = 0; i < 200000; i++) { const ev = fb.evalPoint(x0 + (x1 - x0) * Math.random(), y0 + (y1 - y0) * Math.random()); n += ev.ink; }
console.log("evalPoint us", ((Date.now() - t) / 200).toFixed(2), Object.keys(fb.evalPoint(x0 + 1, y0 + 1)).join(","));
