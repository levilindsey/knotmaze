// K1240 S3f run 3: our moved frame on the consistent S' against S3d's fresh build there.
// Run from the worktree root: node <this> <mult> [aPrefix] [bPrefix]
import { readFileSync, existsSync } from "node:fs";
const all = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
const mult = process.argv[2] ?? "0.5";
const aPre = process.argv[3] ?? `out/s3f/s3dfresh${mult}c_`;
const bPre = process.argv[4] ?? `out/s3f/move${mult}c_`;
const list = mult === "0.5" ? ["def", "ring", "fat"] : all;
let fails = 0;
function checkRow(name, dir, a, b) {
  const dp99 = b.p99 - a.p99;
  const dOver = b.over2 - a.over2;
  const tolOver = Math.max(1, 0.02 * a.over2);
  const ok = dp99 <= 0.01 && dOver <= tolOver;
  if (!ok) fails++;
  console.log(`${name} ${dir}: p99 ${a.p99.toFixed(3)} -> ${b.p99.toFixed(3)} (d ${dp99.toFixed(3)}) over2 ${a.over2} -> ${b.over2} (d ${dOver}, tol ${tolOver.toFixed(1)}) ${ok ? "OK" : "FAIL"}`);
}
for (const n of list) {
  const pa = `.claude/probes/K1240/${aPre}exact_${n}.json`;
  const pb = `.claude/probes/K1240/${bPre}exact_${n}.json`;
  if (!existsSync(pa) || !existsSync(pb)) { console.log(`${n}: missing ${existsSync(pa) ? pb : pa}`); fails++; continue; }
  const a = JSON.parse(readFileSync(pa, "utf8"));
  const b = JSON.parse(readFileSync(pb, "utf8"));
  checkRow(n, "A", a.A, b.A);
  checkRow(n, "B", a.B, b.B);
}
console.log(`${aPre} -> ${bPre}: ${fails ? `${fails} FAILURES` : "ALL WITHIN TOLERANCE"}`);
