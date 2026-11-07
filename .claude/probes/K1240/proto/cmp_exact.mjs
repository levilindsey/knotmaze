import { readFileSync } from "node:fs";
const scenes = ["muse_hash", "muse_default_tw", "def", "fat", "ring", "user_tw42.lightpaper", "g41_def_tw42", "g41_def_tw64", "g41_ring_tw42", "g41_ring_tw64", "g41_user_tw42", "g41_user_tw64"];
let fails = 0;
for (const n of scenes) {
  const a = JSON.parse(readFileSync(`.claude/probes/K1240/out/s3/exact_${n}.json`, "utf8"));
  const b = JSON.parse(readFileSync(`.claude/probes/K1240/out/s3b/exact_${n}.json`, "utf8"));
  for (const dir of ["A", "B"]) {
    const dp99 = b[dir].p99 - a[dir].p99;
    const dOver = b[dir].over2 - a[dir].over2;
    const tolOver = Math.max(1, 0.02 * a[dir].over2);
    const ok = dp99 <= 0.01 && dOver <= tolOver;
    if (!ok) fails++;
    console.log(`${n} ${dir}: p99 ${a[dir].p99.toFixed(3)} -> ${b[dir].p99.toFixed(3)} (d ${dp99.toFixed(3)}) over2 ${a[dir].over2} -> ${b[dir].over2} (d ${dOver}, tol ${tolOver.toFixed(1)}) ${ok ? "OK" : "FAIL"}`);
  }
}
console.log(fails ? `${fails} FAILURES` : "ALL WITHIN TOLERANCE");
