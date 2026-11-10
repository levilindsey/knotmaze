// K1247 s7: a paired A/B of one stage-7 knob in one process (rough, for
// choosing; k1247c_time.ts under the lock is the measurement). Each round
// runs def's 40-frame cycle with the knob off, then on (order alternating),
// and reports the corners phase's per-round medians and the paired gain.
//   node scripts/run_node.mjs .claude/probes/K1240/proto/k1247s7_ab.ts --knob=steep|clear|vhint|walk [--rounds=8]
import { readFileSync } from "node:fs";
import * as O from "./outline";
import type { SceneIn } from "./outline";

const SCENE_DIR = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes";
const rounds = +(process.argv.find((a) => a.startsWith("--rounds="))?.slice(9) ?? 8);
const knob = process.argv.find((a) => a.startsWith("--knob="))?.slice(7) ?? "steep";
const setters: Record<string, (on: boolean) => void> = {};
for (const [k, fn] of [["steep", "setSteepFast"], ["clear", "setClearCert"], ["vhint", "setVHint"], ["walk", "setWalkFast"]] as [string, string][]) {
  const f = (O as unknown as Record<string, unknown>)[fn];
  if (typeof f === "function") setters[k] = f as (on: boolean) => void;
}
const set = setters[knob];
if (!set) throw new Error(`no knob ${knob} (have ${Object.keys(setters).join(", ")})`);
const scene = JSON.parse(readFileSync(`${SCENE_DIR}/def.json`, "utf8")) as SceneIn;
(scene.look as { ctrlArc?: number }).ctrlArc ??= 0.47;
function perturb(sc0: SceneIn, A: number): SceneIn {
  const sc = JSON.parse(JSON.stringify(sc0)) as SceneIn;
  const dxy = (x: number, y: number): [number, number] => [A * (0.7 * Math.sin(0.31 * y + 1.7) + 0.3 * Math.sin(0.83 * x + 0.4)), A * (0.7 * Math.cos(0.27 * x + 0.9) + 0.3 * Math.sin(0.71 * y + 2.3))];
  for (const c of sc.chains) for (let i = 0; i + 1 < c.pts.length; i += 2) { const d = dxy(c.pts[i], c.pts[i + 1]); c.pts[i] += d[0]; c.pts[i + 1] += d[1]; }
  return sc;
}
const h = scene.look.halfWidth;
const st = O.structure(scene);
const fwd = Array.from({ length: 21 }, (_, k) => (k === 0 ? scene : perturb(scene, (k / 20) * 0.5 * h)));
const cycle = [...fwd, ...fwd.slice(1, 20).reverse()];
const med = (xs: number[]): number => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
for (const on of [false, true]) { set(on); for (const sc of cycle) O.frame(st, sc); }
const off: number[] = []; const onv: number[] = []; const gain: number[] = [];
for (let r = 0; r < rounds; r++) {
  const got: Record<string, number> = {};
  for (const on of r % 2 ? [true, false] : [false, true]) {
    set(on);
    const cor: number[] = [];
    for (const sc of cycle) { const prof: Record<string, number> = {}; O.frame(st, sc, prof); cor.push(prof.corners ?? NaN); }
    got[on ? "on" : "off"] = med(cor);
  }
  off.push(got.off); onv.push(got.on); gain.push(got.off - got.on);
  console.log(`round ${r}: corners off ${got.off.toFixed(3)} on ${got.on.toFixed(3)} gain ${(got.off - got.on).toFixed(3)} ms`);
}
console.log(`${knob}: corners off min ${Math.min(...off).toFixed(3)} med ${med(off).toFixed(3)}; on min ${Math.min(...onv).toFixed(3)} med ${med(onv).toFixed(3)}; paired gain med ${med(gain).toFixed(3)} ms`);
