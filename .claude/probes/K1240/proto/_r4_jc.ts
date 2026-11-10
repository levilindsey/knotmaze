// K1240 r4 scratch: our frame()'s corners and pieces near a point.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/_r4_jc.ts <scene> <x> <y> [R=0.6]
import { readFileSync } from "node:fs";
import { structure, frame } from "./outline";
const [name, xS, yS, rS] = process.argv.slice(2);
const scene = JSON.parse(readFileSync(`C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes/${name}.json`, "utf8"));
scene.look.ctrlArc ??= 0.47;
const X = Number(xS); const Y = Number(yS); const R = Number(rS ?? 0.6);
const st = structure(scene) as any;
const t = frame(st, scene) as any;
const f = (v: number): string => (Number.isFinite(v) ? v.toFixed(3) : String(v));
console.log("corner keys", Object.keys(t.corners?.[0] ?? {}).join(","));
(t.corners ?? []).forEach((c: any, ci: number) => {
  if (!(Math.hypot(c.Vx - X, c.Vy - Y) < R)) return;
  console.log(`c${ci} ${Object.entries(c).filter(([, v]) => typeof v !== "object").map(([k, v]) => `${k}=${typeof v === "number" ? f(v) : v}`).join(" ")}`);
});
t.pieces.forEach((p: any, i: number) => {
  let near = false;
  for (let k = 0; k < p.pts.length; k += 2) if (Math.hypot(p.pts[k] - X, p.pts[k + 1] - Y) < R) { near = true; break; }
  if (!near) return;
  console.log(`p${i} ${p.kind} ch${scene.chains[p.chain]?.id} side${p.side} corner${p.corner} n=${p.pts.length / 2} first(${f(p.pts[0])},${f(p.pts[1])}) last(${f(p.pts[p.pts.length - 2])},${f(p.pts[p.pts.length - 1])}) s${f(p.s0)}..${f(p.s1)}`);
});
console.log("st.arms of j:", JSON.stringify((st.arms ?? []).map((a: any, ai: number) => ({ ai, ...a })).filter((a: any) => Math.hypot((scene.junctions[a.ji]?.c[0] ?? 1e9) - X, (scene.junctions[a.ji]?.c[1] ?? 1e9) - Y) < 0.05)));
