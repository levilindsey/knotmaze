// K1362 s1: the GPU field's CPU table build per scene, by part (median of N builds after warm-up), in Node.
//   node scripts/run_node.mjs .claude/probes/K1362/k1362s1_time.ts [scene,...] [--n=20]
import { buildModel } from "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1314/k1314_census.ts";
import { buildTables } from "../../../src/render/gpu_field/tables";

const ALL = "muse_hash,g41_def_tw42,g41_ring_tw64,user_tw42.lightpaper,def,fat,g41_def_tw64,g41_user_tw42,muse_default_tw,ring,g41_ring_tw42,g41_user_tw64";
const arg = process.argv.slice(2).find((a) => !a.startsWith("--")); const N = +(process.argv.find((a) => a.startsWith("--n="))?.slice(4) ?? 20);
const med = (a: number[]): number => { const s = [...a].sort((u, v) => u - v); return s[Math.floor(s.length / 2)]; };
const p95 = (a: number[]): number => { const s = [...a].sort((u, v) => u - v); return s[Math.min(s.length - 1, Math.floor(0.95 * s.length))]; };
console.log("scene                    junc  arms corners  segs | vtx  pins  arms corners  bins | total p50  p95 (ms)");
for (const nm of (arg ?? ALL).split(",")) {
  const m = buildModel(nm); const sc = m.scene as never as { camera: { pxPerUnit: number }; junctions: unknown[] };
  const opts = { aa: 0.5 / (sc.camera.pxPerUnit * 2) };
  for (let i = 0; i < 5; i++) buildTables(m.scene as never, opts);
  const parts: Record<string, number[]> = { vtx: [], pins: [], arms: [], corners: [], bins: [], total: [] };
  let T = buildTables(m.scene as never, opts);
  for (let i = 0; i < N; i++) { T = buildTables(m.scene as never, opts); for (const k of Object.keys(parts)) parts[k].push((T.ms as Record<string, number>)[k]); }
  const t = T as unknown as { nK: number; arms: unknown[]; vx: ArrayLike<number> };
  console.log(`${nm.padEnd(24)} ${String(sc.junctions.length).padStart(4)} ${String(t.arms?.length ?? "?").padStart(5)} ${String(t.nK).padStart(7)} ${String(t.vx?.length ?? "?").padStart(5)} | ${["vtx", "pins", "arms", "corners", "bins"].map((k) => med(parts[k]).toFixed(2).padStart(5)).join(" ")} | ${med(parts.total).toFixed(2).padStart(6)} ${p95(parts.total).toFixed(2).padStart(6)}`);
}
