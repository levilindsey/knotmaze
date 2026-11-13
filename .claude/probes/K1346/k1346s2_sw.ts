// K1346 s2: where the branch's frame() cost is. Master's copy (outline_m2.ts, see k1346s2_ab.ts) against the
// branch with all K1346 switches on, all off, and each one off, over a captured drag as the worker runs it.
// Variants rotate (forward, then reversed) per round; prints each variant's per-drag sum (median over rounds
// after the first) and its per-frame p50.
//   node scripts/run_node.mjs .claude/probes/K1346/k1346s2_sw.ts <dragDir> [rounds=6]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import * as B from "../../../src/render/outline/outline";
import * as M from "../../../src/render/outline/outline_m2";
import type { SceneIn } from "../../../src/render/outline/outline";

const dir = process.argv[2];
const arg = (k: string, d: string): string => process.argv.find((a) => a.startsWith(`${k}=`))?.slice(k.length + 1) ?? d;
const rounds = +arg("rounds", "6");
const files = readdirSync(dir).filter((f) => /^f\d+\.json$/.test(f)).sort();
const cap = files.map((f) => {
  const S = JSON.parse(readFileSync(join(dir, f), "utf8")) as SceneIn;
  const look = S.look as SceneIn["look"] & Record<string, number>;
  look.ctrlArc ??= 0.47; look.fillRec = 2; look.bandRec = 1; look.bandRecGpu = 1;
  return S;
});
type Mod = typeof B;
const SW = Object.keys(B.K1346) as (keyof typeof B.K1346)[];
const setSw = (on: boolean, except?: string): void => { for (const k of SW) B.K1346[k] = k === except ? !on : on; };
const variants: [string, Mod, () => void][] = [
  ["master", M as unknown as Mod, () => setSw(true)],
  ["all on", B, () => setSw(true)],
  ["all off", B, () => setSw(false)],
  ...SW.map((k) => [`-${k}`, B, () => setSw(true, k)] as [string, Mod, () => void]),
];
const drag = (O: Mod): number[] => {
  O.OB_DI.on = true;
  const st = O.structure(cap[0]); O.frame(st, cap[0]);
  const out: number[] = [];
  for (let i = 1; i < cap.length; i++) {
    const sc = O.alignJunctionArms(st, cap[i]);
    O.OB_DI.on = true;
    const t0 = performance.now(); O.frame(st, sc); out.push(performance.now() - t0);
  }
  return out;
};
const res = new Map<string, number[][]>();
for (let r = 0; r < rounds; r++) for (const [n, O, set] of r % 2 ? [...variants].reverse() : variants) { set(); (res.get(n) ?? res.set(n, []).get(n)!).push(drag(O)); }
setSw(true);
const med = (a: number[]): number => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const base = med(res.get("master")!.slice(1).map((a) => a.reduce((s, v) => s + v, 0)));
for (const [n] of variants) {
  const R = res.get(n)!.slice(1);
  const sums = R.map((a) => a.reduce((s, v) => s + v, 0));
  console.log(`${n.padEnd(9)} drag sum ${med(sums).toFixed(0).padStart(5)} (${(med(sums) - base >= 0 ? "+" : "") + (med(sums) - base).toFixed(0)}; ${Math.min(...sums).toFixed(0)}-${Math.max(...sums).toFixed(0)})  frame p50 ${med(R.flat()).toFixed(1)}`);
}
