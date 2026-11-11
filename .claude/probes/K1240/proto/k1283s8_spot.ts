// K1283 s8: k1283_spot.ts on src's outline ("./outline" via k1283_vite.config.mjs), or on a before copy
// (--b0=s4 stage 4's, --b0=s8 master 39b7c8a9's), with --pts=<piece kind>:<chain> to print those pieces'
// points (x, y, alpha when the piece has one) within R.
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1283_vite.config.mjs \
//     .claude/probes/K1240/proto/k1283s8_spot.ts <scene> <x> <y> [R=1.2] [--b0=s4|s8] [--pts=run:43]
import * as S from "./outline";
import * as B4 from "./k1283s4_before_outline";
import * as B8 from "./k1283s8_before_outline";
import { loadScene } from "./k1279_census";

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith("--"));
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const O = (opt("b0") === "s4" ? B4 : opt("b0") === "s8" ? B8 : S) as typeof S;
const [name, xs, ys, rs] = pos;
const X = Number(xs); const Y = Number(ys); const R = Number(rs ?? 1.2);
const scene = loadScene(name);
const t = O.frame(O.structure(scene), scene);
const f = (v: number): string => v.toFixed(3);
console.log(`${name} (${f(X)}, ${f(Y)}) R ${R}: h ${f(t.h)} W ${f(t.W)}`);
t.corners.forEach((k, ci) => {
  const d = Math.hypot(k.Vx - X, k.Vy - Y);
  if (d > R) return;
  const kk = k as unknown as Record<string, unknown>;
  const extra = ["junction", "aChain", "bChain", "ok", "Vx", "Vy", "tax", "tay", "tbx", "tby", "why"].map((q) => `${q}=${typeof kk[q] === "number" ? f(kk[q] as number) : String(kk[q])}`).join(" ");
  console.log(`corner ${ci} d ${f(d)}: ${extra}`);
});
const want = opt("pts")?.split(":");
t.pieces.forEach((p, pi) => {
  let n = 0;
  for (let i = 0; i < p.pts.length; i += 2) if (Math.hypot(p.pts[i] - X, p.pts[i + 1] - Y) < R) n++;
  if (n === 0) return;
  const np = p.pts.length / 2;
  const ends = `(${f(p.pts[0])}, ${f(p.pts[1])}) -> (${f(p.pts[p.pts.length - 2])}, ${f(p.pts[p.pts.length - 1])})`;
  const al = (p as unknown as { alpha?: number[] }).alpha;
  console.log(`piece ${pi} ${p.kind} chain ${p.chain} side ${p.side} corner ${p.corner} s ${f(p.s0)}..${f(p.s1)} pts ${np} in ${n}${al ? " alpha" : ""} ${ends}`);
  if (want && p.kind === want[0] && p.chain === Number(want[1])) {
    const row: string[] = [];
    for (let i = 0; i < np; i++) if (Math.hypot(p.pts[2 * i] - X, p.pts[2 * i + 1] - Y) < R) row.push(`(${f(p.pts[2 * i])}, ${f(p.pts[2 * i + 1])}${al ? ` a${al[i].toFixed(2)}` : ""})`);
    console.log("   " + row.join(" "));
  }
});
