// K1290: frame() time on a recorded motion (out/s15/rec_<name>), master
// (forward placement off) against the forward table, interleaved pass by pass
// in one process so drift and load hit both alike. Run under the perf lock,
// through the K1290 config:
//   node scripts/run_node.mjs --config .claude/probes/K1240/proto/k1290_vite.config.mjs .claude/probes/K1240/proto/k1290_time.ts [name=def] [--passes=5]
import { readFileSync, readdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as O from "./outline";

const setOn = (O as unknown as { fwdSetOn?: (on: boolean) => void }).fwdSetOn;
if (!setOn) throw new Error("run through k1290_vite.config.mjs");
const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k: string): string | undefined => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const name = args.find((a) => !a.startsWith("--")) ?? "def";
const passes = Number(opt("passes") ?? "5");
const dir = join(here, "..", "out", "s15", `rec_${name}`);
const files = readdirSync(dir).filter((f) => f.endsWith(".json.gz")).sort();
const scenes = files.map((f) => { const s = JSON.parse(gunzipSync(readFileSync(join(dir, f))).toString("utf8")) as O.SceneIn; (s.look as { ctrlArc?: number }).ctrlArc ??= 0.47; return s; });
const st = { m: O.structure(scenes[0]), f: O.structure(scenes[0]) };
const times: Record<"m" | "f", number[]> = { m: [], f: [] };
const run = (k: "m" | "f", keep: boolean): void => {
  setOn(k === "f");
  for (const sc of scenes) {
    const t0 = performance.now(); O.frame(st[k], sc); const t1 = performance.now();
    if (keep) times[k].push(t1 - t0);
  }
};
run("m", false); run("f", false);
for (let p = 0; p < passes; p++) { if (p % 2 === 0) { run("m", true); run("f", true); } else { run("f", true); run("m", true); } }
const q = (a: number[], x: number): number => { const s = a.slice().sort((u, v) => u - v); return s[Math.min(s.length - 1, Math.max(0, Math.ceil(x * s.length) - 1))]; };
for (const k of ["m", "f"] as const) console.log(`${k === "m" ? "master " : "forward"} ${name}: ${times[k].length} frames, median ${q(times[k], 0.5).toFixed(2)} ms, p95 ${q(times[k], 0.95).toFixed(2)} ms, mean ${(times[k].reduce((a, b) => a + b, 0) / times[k].length).toFixed(2)} ms`);
const st2 = (O as unknown as { fwdStats?: Record<string, number> }).fwdStats;
if (st2) console.log(`fwdStats (all forward frames incl. warm-up): ${JSON.stringify(st2)}`);
