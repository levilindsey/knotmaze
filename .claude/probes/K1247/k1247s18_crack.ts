// K1247 s18: which strip makes a records-on crack, and how: for one captured frame and a world point,
// the strips with a vertex within R of it, each column's off/on vertex distance (L, C, R rows), the
// border pieces' kinds, s ranges and point counts, and where the worst column sits along the strip.
//   node scripts/run_node.mjs .claude/probes/K1247/k1247s18_crack.ts <dragDir> <frame> <x> <y> [R=0.3]
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { alignJunctionArms, frame, structure, type SceneIn } from "../../../src/render/outline/outline";
import { fillFrame, fillResolution, fillStructure } from "../../../src/render/outline/fill_tri";
import { zChains } from "../../../src/render/outline/draw";

const [dir, fS, xS, yS, rS] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const load = (k: number): SceneIn => { const s = JSON.parse(readFileSync(join(dir, files[k]), "utf8")); s.look.ctrlArc ??= 0.47; delete s.look.fillRec; return s; };
const s0 = load(0); const st = structure(s0); const fs = fillStructure(st, fillResolution(st, frame(st, s0)));
const sc = alignJunctionArms(st, load(Number(fS))); const tb = frame(st, sc); const zz = zChains(sc);
const off = fillFrame(fs, st, tb, sc, zz); const offPos = Float64Array.from(off.pos);
const on = fillFrame(fs, st, tb, { ...sc, look: { ...sc.look, fillRec: 1 } } as SceneIn, zz);
const X = Number(xS); const Y = Number(yS); const R = Number(rS ?? 0.3);
const near = (p: Float64Array | number[], v: number): boolean => Math.hypot(p[2 * v] - X, p[2 * v + 1] - Y) < R;
for (const it of fs.items) {
  if (it.kind !== "strip") continue;
  const W = it.N + 1; let hit = false;
  for (let v = it.base; v < it.base + 3 * W; v++) if (near(offPos, v) || near(on.pos, v)) hit = true;
  if (!hit) continue;
  const pl = tb.pieces[it.pL]; const pr = tb.pieces[it.pR];
  const d = (v: number): number => Math.hypot(on.pos[2 * v] - offPos[2 * v], on.pos[2 * v + 1] - offPos[2 * v + 1]);
  const cols: string[] = [];
  for (let i = 0; i <= it.N; i++) { const m = Math.max(d(it.base + i), d(it.base + W + i), d(it.base + 2 * W + i)); if (m > 0.01) cols.push(`${i}:${m.toFixed(3)}`); }
  console.log(`strip iv ${it.iv} chain ${it.pi} N ${it.N} ghost ${it.ghost} | L ${pl?.kind} s ${pl?.s0.toFixed(3)}..${pl?.s1.toFixed(3)} n ${pl ? pl.pts.length / 2 : 0} | R ${pr?.kind} s ${pr?.s0.toFixed(3)}..${pr?.s1.toFixed(3)} n ${pr ? pr.pts.length / 2 : 0}`);
  console.log(`  columns off->on > 0.01 world: ${cols.slice(0, 14).join(" ")}${cols.length > 14 ? ` ... (${cols.length})` : ""}`);
  for (const i of [0, 1, 2, it.N - 2, it.N - 1, it.N]) {
    const f = (p: Float64Array | number[], v: number): string => `(${p[2 * v].toFixed(3)},${p[2 * v + 1].toFixed(3)})`;
    console.log(`  i ${i}: L off ${f(offPos, it.base + i)} on ${f(on.pos, it.base + i)} | R off ${f(offPos, it.base + 2 * W + i)} on ${f(on.pos, it.base + 2 * W + i)}`);
  }
  if (pl) console.log(`  pl.pts[0..2] ${pl.pts.slice(0, 6).map((q) => q.toFixed(3)).join(",")} | last ${pl.pts.slice(-4).map((q) => q.toFixed(3)).join(",")}`);
  if (pr) console.log(`  pr.pts[0..2] ${pr.pts.slice(0, 6).map((q) => q.toFixed(3)).join(",")} | last ${pr.pts.slice(-4).map((q) => q.toFixed(3)).join(",")}`);
}
